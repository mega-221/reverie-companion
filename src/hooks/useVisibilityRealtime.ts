import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type PostgresChangeConfig = {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
  handler: (payload: any) => void;
};

export type UseVisibilityRealtimeOptions = {
  channelName: string | null;
  enabled?: boolean;
  broadcastHandlers?: Record<string, (payload: any) => void>;
  postgresChanges?: PostgresChangeConfig[];
  onBeforeHide?: () => void;
  onResumeFromHidden?: () => void;
};

type QueuedBroadcast = {
  event: string;
  payload: Record<string, any>;
};

async function sendViaTransientSubscribe(
  channel: RealtimeChannel,
  event: string,
  payload: Record<string, any>
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(ok);
    };

    const timeoutId = window.setTimeout(() => finish(false), 2500);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          const res = await channel.send({
            type: 'broadcast',
            event,
            payload,
          });
          finish(res === 'ok');
        } catch {
          finish(false);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        finish(false);
      }
    });
  });
}

/**
 * Sends a Broadcast event to another channel without keeping a persistent WebSocket subscription open.
 * Prefers an already-joined channel in this tab, otherwise uses Supabase REST batch broadcast
 * with httpSend and a brief WebSocket subscribe-and-cleanup fallback.
 */
export async function sendEphemeralBroadcast(
  channelName: string,
  event: string,
  payload: Record<string, any>
): Promise<void> {
  if (!channelName) return;
  const topic = `realtime:${channelName}`;
  const existing = supabase.getChannels().find(c => c.topic === topic);

  if (existing) {
    try {
      const res = await existing.send({ type: 'broadcast', event, payload });
      if (res === 'ok') return;
    } catch {
      // fall through to httpSend
    }
    try {
      await existing.httpSend(event, payload);
    } catch {
      // ignore transient network errors
    }
    return;
  }

  const tempChannel = supabase.channel(channelName, {
    config: { broadcast: { self: false } },
  });

  try {
    // 1. Standard batch REST endpoint (/api/broadcast) — zero WebSocket connections used
    const restStatus = await tempChannel.send({
      type: 'broadcast',
      event,
      payload,
    });
    if (restStatus === 'ok') return;

    // 2. Modern per-topic httpSend endpoint fallback
    try {
      await tempChannel.httpSend(event, payload);
      return;
    } catch {
      // 3. Final fallback: transient WS subscribe -> send -> immediate teardown
      await sendViaTransientSubscribe(tempChannel, event, payload);
    }
  } catch {
    // ignore transient network errors on ephemeral broadcast
  } finally {
    await supabase.removeChannel(tempChannel);
    if (supabase.getChannels().length === 0) {
      supabase.realtime.disconnect();
    }
  }
}

export function useVisibilityRealtime({
  channelName,
  enabled = true,
  broadcastHandlers,
  postgresChanges,
  onBeforeHide,
  onResumeFromHidden,
}: UseVisibilityRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const wasHiddenRef = useRef(false);
  const pendingOutboundRef = useRef<QueuedBroadcast[]>([]);
  const retryTimerRef = useRef<number | null>(null);

  const optionsRef = useRef({
    broadcastHandlers,
    postgresChanges,
    onBeforeHide,
    onResumeFromHidden,
  });

  optionsRef.current = {
    broadcastHandlers,
    postgresChanges,
    onBeforeHide,
    onResumeFromHidden,
  };

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const teardownChannel = useCallback(() => {
    clearRetryTimer();
    const ch = channelRef.current;
    channelRef.current = null;
    subscribedRef.current = false;
    pendingOutboundRef.current = [];
    if (ch) {
      supabase.removeChannel(ch);
    }
    if (supabase.getChannels().length === 0) {
      supabase.realtime.disconnect();
    }
  }, [clearRetryTimer]);

  const setupChannel = useCallback(() => {
    if (!enabled || !channelName) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (channelRef.current) return;

    clearRetryTimer();

    const ch = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    const bHandlers = optionsRef.current.broadcastHandlers;
    if (bHandlers) {
      for (const eventName of Object.keys(bHandlers)) {
        ch.on('broadcast', { event: eventName }, (msg) => {
          optionsRef.current.broadcastHandlers?.[eventName]?.(msg.payload);
        });
      }
    }

    const pgSpecs = optionsRef.current.postgresChanges;
    if (pgSpecs && pgSpecs.length > 0) {
      pgSpecs.forEach((spec, idx) => {
        const filterObj: Record<string, string> = {
          event: spec.event,
          schema: spec.schema || 'public',
          table: spec.table,
        };
        if (spec.filter) {
          filterObj.filter = spec.filter;
        }
        ch.on('postgres_changes', filterObj as any, (payload) => {
          optionsRef.current.postgresChanges?.[idx]?.handler(payload);
        });
      });
    }

    channelRef.current = ch;
    ch.subscribe((status) => {
      if (channelRef.current !== ch) return;
      if (status === 'SUBSCRIBED') {
        subscribedRef.current = true;
        const queued = pendingOutboundRef.current.splice(0);
        for (const item of queued) {
          ch.send({
            type: 'broadcast',
            event: item.event,
            payload: item.payload,
          });
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        subscribedRef.current = false;
        if (
          status !== 'CLOSED' &&
          enabled &&
          typeof document !== 'undefined' &&
          !document.hidden &&
          retryTimerRef.current === null
        ) {
          const errored = channelRef.current;
          channelRef.current = null;
          if (errored) supabase.removeChannel(errored);
          retryTimerRef.current = window.setTimeout(() => {
            retryTimerRef.current = null;
            setupChannel();
          }, 1500);
        }
      } else {
        subscribedRef.current = false;
      }
    });
  }, [channelName, enabled, clearRetryTimer]);

  useEffect(() => {
    if (!enabled || !channelName) {
      teardownChannel();
      return;
    }

    wasHiddenRef.current = typeof document !== 'undefined' ? document.hidden : false;
    if (!wasHiddenRef.current) {
      setupChannel();
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasHiddenRef.current = true;
        optionsRef.current.onBeforeHide?.();
        teardownChannel();
      } else {
        const resumed = wasHiddenRef.current;
        wasHiddenRef.current = false;
        setupChannel();
        if (resumed) {
          optionsRef.current.onResumeFromHidden?.();
        }
      }
    };

    const handlePageHide = () => {
      optionsRef.current.onBeforeHide?.();
      teardownChannel();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      optionsRef.current.onBeforeHide?.();
      teardownChannel();
    };
  }, [channelName, enabled, setupChannel, teardownChannel]);

  const broadcast = useCallback(
    (event: string, payload: Record<string, any>) => {
      const ch = channelRef.current;
      if (ch && subscribedRef.current) {
        ch.send({
          type: 'broadcast',
          event,
          payload,
        });
        return;
      }

      if (ch) {
        // Queue for immediate WebSocket flush once SUBSCRIBED fires
        pendingOutboundRef.current.push({ event, payload });
        // Also dispatch via REST batch broadcast so other connected clients don't wait
        ch.send({
          type: 'broadcast',
          event,
          payload,
        }).catch(() => {});
        return;
      }

      if (channelName) {
        sendEphemeralBroadcast(channelName, event, payload);
      }
    },
    [channelName]
  );

  return { broadcast };
}
