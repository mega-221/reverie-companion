import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabase';
import type { PartyMessage } from '../../types';
import {
  formatDieValue,
  isRollLogContent,
  parseRollLog,
  type RollLogEntry,
} from '../../utils/diceRoller';
import {
  getItemDisplayLabel,
  isItemTransferAckContent,
  parseItemTransferAck,
  parseItemTransferOffer,
  type PartyTransferAck,
  type PartyTransferOffer,
} from '../../utils/itemTransfer';

function renderMessageWithLinks(content: string) {
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  const parts = content.split(urlRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (/^(https?:\/\/|www\.)/i.test(part)) {
      let cleanUrl = part;
      let trailing = '';
      const punctMatch = cleanUrl.match(/[.,!?;:]+$/);
      if (punctMatch) {
        trailing = punctMatch[0];
        cleanUrl = cleanUrl.slice(0, -trailing.length);
      }
      const href = cleanUrl.toLowerCase().startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
      return (
        <span key={idx}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 break-all"
            style={{ color: 'var(--rev-accent-text)' }}
          >
            {cleanUrl}
          </a>
          {trailing}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

const PARTY_MESSAGES_DELETE_SQL = `DROP POLICY IF EXISTS "Allow delete own or leader party_messages" ON public.party_messages;
CREATE POLICY "Allow delete own or leader party_messages"
ON public.party_messages
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.parties p
    WHERE p.id = party_messages.party_id
      AND p.owner_id = auth.uid()
  )
);`;

export default function PartyChat({
  partyId,
  userId,
  username,
  isLeader = false,
  incomingMessages,
  onConsumeIncomingMessages,
  deletedMessageIds = [],
  onConsumeDeletedMessages,
  refreshSignal,
  onBroadcastMessage,
  onBroadcastDeleteMessage,
  onRespondTransferOffer,
}: {
  partyId: string;
  userId: string;
  username: string;
  isLeader?: boolean;
  incomingMessages: PartyMessage[];
  onConsumeIncomingMessages: () => void;
  deletedMessageIds?: string[];
  onConsumeDeletedMessages?: () => void;
  refreshSignal: number;
  onBroadcastMessage: (msg: PartyMessage) => void;
  onBroadcastDeleteMessage?: (messageId: string) => void;
  onRespondTransferOffer?: (
    offer: PartyTransferOffer,
    action: 'claim' | 'return' | 'reclaim'
  ) => Promise<void> | void;
}) {
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rlsDeleteBlocked, setRlsDeleteBlocked] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [draft, setDraft] = useState('');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [processingOfferIds, setProcessingOfferIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'chat' | 'log'>('chat');
  const [unreadLogs, setUnreadLogs] = useState(0);
  const listEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setError(null);
    setRlsDeleteBlocked(false);
    const { data, error: fetchErr } = await supabase
      .from('party_messages')
      .select('*')
      .eq('party_id', partyId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setMessages((data as PartyMessage[]) || []);
    }
    setLoading(false);
  }, [partyId]);

  useEffect(() => {
    setLoading(true);
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (refreshSignal > 0) {
      loadMessages();
    }
  }, [refreshSignal, loadMessages]);

  useEffect(() => {
    if (incomingMessages.length === 0) return;
    const relevant = incomingMessages.filter(m => m.party_id === partyId);
    if (relevant.length > 0) {
      if (activeTab === 'chat') {
        const incomingLogsCount = relevant.filter(m => isRollLogContent(m.content)).length;
        if (incomingLogsCount > 0) {
          setUnreadLogs(prev => prev + incomingLogsCount);
        }
      }
      setMessages(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        for (const msg of relevant) {
          map.set(msg.id, msg);
        }
        const next = Array.from(map.values());
        next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return next.slice(-200);
      });
    }
    onConsumeIncomingMessages();
  }, [incomingMessages, partyId, activeTab, onConsumeIncomingMessages]);

  useEffect(() => {
    if (deletedMessageIds.length === 0) return;
    const idSet = new Set(deletedMessageIds);
    setMessages(prev => prev.filter(m => !idSet.has(m.id)));
    onConsumeDeletedMessages?.();
  }, [deletedMessageIds, onConsumeDeletedMessages]);

  const transferAckMap = useMemo(() => {
    const map = new Map<string, PartyTransferAck>();
    for (const msg of messages) {
      const ack = parseItemTransferAck(msg.content);
      if (ack) {
        map.set(ack.offerId, ack);
      }
    }
    return map;
  }, [messages]);

  const chatMessages = useMemo(
    () => messages.filter(m => !isRollLogContent(m.content) && !isItemTransferAckContent(m.content)),
    [messages]
  );

  const logItems = useMemo(() => {
    const items: { msg: PartyMessage; entry: RollLogEntry }[] = [];
    for (const msg of messages) {
      const parsed = parseRollLog(msg.content);
      if (parsed) items.push({ msg, entry: parsed });
    }
    return items;
  }, [messages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatMessages.length, logItems.length, activeTab]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    const newMsg: PartyMessage = {
      id: crypto.randomUUID(),
      party_id: partyId,
      user_id: userId,
      username: username || 'Adventurer',
      content,
      created_at: new Date().toISOString(),
    };

    setError(null);
    setRlsDeleteBlocked(false);
    setDraft('');
    setMessages(prev => [...prev, newMsg].slice(-100));

    // Broadcast immediately over active pure-broadcast channel
    onBroadcastMessage(newMsg);

    // Persist to DB; revert only on error
    const { error: insertErr } = await supabase
      .from('party_messages')
      .insert(newMsg);

    if (insertErr) {
      setMessages(prev => prev.filter(m => m.id !== newMsg.id));
      setDraft(content);
      setError(insertErr.message);
    }
  }

  async function handleDeleteMessage(msg: PartyMessage) {
    const canDelete = msg.user_id === userId || isLeader;
    if (!canDelete || deletingIds.has(msg.id)) return;

    setError(null);
    setRlsDeleteBlocked(false);
    setDeletingIds(prev => {
      const next = new Set(prev);
      next.add(msg.id);
      return next;
    });

    setMessages(prev => prev.filter(m => m.id !== msg.id));

    const { data: deletedRows, error: delErr } = await supabase
      .from('party_messages')
      .delete()
      .eq('id', msg.id)
      .eq('party_id', partyId)
      .select('id');

    setDeletingIds(prev => {
      const next = new Set(prev);
      next.delete(msg.id);
      return next;
    });

    if (delErr || !deletedRows || deletedRows.length === 0) {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return next.slice(-100);
      });
      if (!delErr && (!deletedRows || deletedRows.length === 0)) {
        setRlsDeleteBlocked(true);
        setError('Supabase RLS blocked DELETE on party_messages. Run the DELETE policy SQL in Supabase SQL Editor.');
      } else {
        setError(delErr?.message || 'Could not delete message.');
      }
      return;
    }

    onBroadcastDeleteMessage?.(msg.id);
  }

  const handleCopySqlFix = async () => {
    try {
      await navigator.clipboard.writeText(PARTY_MESSAGES_DELETE_SQL);
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Clipboard blocked
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getOutcomeColors = (tone: RollLogEntry['outcomeTone']) => {
    switch (tone) {
      case 'radiant':
        return {
          bg: 'rgba(245, 158, 11, 0.16)',
          border: 'rgba(245, 158, 11, 0.6)',
          text: '#fcd34d',
        };
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.16)',
          border: 'rgba(16, 185, 129, 0.6)',
          text: '#6ee7b7',
        };
      case 'failure':
        return {
          bg: 'rgba(220, 38, 38, 0.18)',
          border: 'rgba(239, 68, 68, 0.6)',
          text: '#fca5a5',
        };
      default:
        return {
          bg: 'rgba(34, 211, 238, 0.14)',
          border: 'rgba(34, 211, 238, 0.5)',
          text: '#67e8f9',
        };
    }
  };

  return (
    <div className="sheet-panel p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b rev-divider pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="font-spectral font-bold text-lg" style={{ color: 'var(--rev-text)' }}>
            Party
          </h3>
          <div className="rev-segmented flex p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'chat' ? 'rev-segmented-active' : 'hover:opacity-80'
              }`}
              style={activeTab !== 'chat' ? { color: 'var(--rev-text-muted)' } : undefined}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('log');
                setUnreadLogs(0);
              }}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'log' ? 'rev-segmented-active' : 'hover:opacity-80'
              }`}
              style={activeTab !== 'log' ? { color: 'var(--rev-text-muted)' } : undefined}
            >
              <span>Log</span>
              {unreadLogs > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-extrabold leading-tight">
                  {unreadLogs}
                </span>
              )}
              {unreadLogs === 0 && logItems.length > 0 && (
                <span className="text-[10px] opacity-65 tabular-nums">({logItems.length})</span>
              )}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={loadMessages}
          className="text-xs font-bold transition-colors"
          style={{ color: 'var(--rev-text-muted)' }}
          title="Refresh messages and roll logs"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="sheet-panel-red text-xs p-2.5 flex flex-wrap items-center justify-between gap-2" style={{ color: 'var(--rev-accent-text)' }}>
          <span className="flex-1 min-w-[160px] leading-snug">{error}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {rlsDeleteBlocked && (
              <button
                type="button"
                onClick={handleCopySqlFix}
                className="px-2 py-0.5 rev-btn-secondary font-bold shrink-0"
              >
                {copiedSql ? 'SQL Copied!' : 'Copy SQL Fix'}
              </button>
            )}
            <button
              type="button"
              onClick={loadMessages}
              className="px-2 py-0.5 rev-btn-primary font-bold shrink-0"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="rev-inset p-3 h-64 sm:h-72 xl:h-[26rem] overflow-y-auto no-scrollbar flex flex-col gap-2.5">
        {loading ? (
          <p className="text-xs animate-pulse my-auto text-center" style={{ color: 'var(--rev-text-faint)' }}>
            {activeTab === 'log' ? 'Loading roll log...' : 'Loading messages...'}
          </p>
        ) : activeTab === 'chat' ? (
          chatMessages.length === 0 ? (
            <p className="text-xs italic my-auto text-center" style={{ color: 'var(--rev-text-faint)' }}>
              No messages yet.
            </p>
          ) : (
            chatMessages.map(msg => {
              const isOwn = msg.user_id === userId;
              const canDelete = isOwn || isLeader;
              const isDeleting = deletingIds.has(msg.id);
              const transferOffer = parseItemTransferOffer(msg.content);
              if (transferOffer) {
                const ack = transferAckMap.get(transferOffer.offerId);
                const isRecipient = transferOffer.toUserId === userId;
                const isSender = transferOffer.fromUserId === userId;
                const isBusy = processingOfferIds.has(transferOffer.offerId);
                const label = getItemDisplayLabel(transferOffer.item);
                const runTransferAction = async (action: 'claim' | 'return' | 'reclaim') => {
                  if (!onRespondTransferOffer || isBusy) return;
                  setError(null);
                  setProcessingOfferIds(prev => new Set(prev).add(transferOffer.offerId));
                  try {
                    await onRespondTransferOffer(transferOffer, action);
                  } catch (err: any) {
                    setError(err?.message || 'Could not process item transfer.');
                  } finally {
                    setProcessingOfferIds(prev => {
                      const next = new Set(prev);
                      next.delete(transferOffer.offerId);
                      return next;
                    });
                  }
                };

                return (
                  <div
                    key={msg.id}
                    className="group w-full border rounded-lg p-3 bg-black/35 space-y-2"
                    style={{
                      borderColor: 'var(--rev-border)',
                      borderLeftWidth: '4px',
                      borderLeftColor:
                        ack?.action === 'claimed'
                          ? '#34d399'
                          : ack?.action === 'returned'
                          ? '#fbbf24'
                          : ack?.action === 'reclaimed'
                          ? '#94a3b8'
                          : '#f59e0b',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          Item Transfer
                        </div>
                        <div className="text-sm font-bold truncate" style={{ color: 'var(--rev-text-bright)' }}>
                          {transferOffer.item.qty}× {label}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                          {transferOffer.fromCharName} → <strong style={{ color: 'var(--rev-text-secondary)' }}>{transferOffer.toCharName}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] tabular-nums" style={{ color: 'var(--rev-text-faint)' }}>
                          {formatTime(msg.created_at)}
                        </span>
                        {canDelete && ack && (
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDeleteMessage(msg)}
                            aria-label="Delete transfer message"
                            title="Delete transfer message"
                            className="rev-icon-btn rev-icon-btn-danger text-base opacity-70 sm:opacity-40 group-hover:opacity-100 disabled:opacity-30"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {!ack ? (
                        isRecipient && onRespondTransferOffer ? (
                          <div className="flex items-center gap-2 w-full">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => runTransferAction('claim')}
                              className="flex-1 px-3 py-1.5 rounded text-xs font-bold rev-btn-primary disabled:opacity-40"
                            >
                              {isBusy ? 'Accepting...' : 'Accept Item'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => runTransferAction('return')}
                              className="px-3 py-1.5 rounded text-xs font-bold rev-btn-secondary disabled:opacity-40"
                            >
                              Return
                            </button>
                          </div>
                        ) : isSender && onRespondTransferOffer ? (
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-[11px] text-amber-300 font-semibold">Pending acceptance</span>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => runTransferAction('reclaim')}
                              className="px-2.5 py-1 rounded text-xs font-bold rev-btn-secondary disabled:opacity-40"
                            >
                              {isBusy ? 'Reclaiming...' : 'Cancel & Reclaim'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-300 font-semibold">Pending acceptance</span>
                        )
                      ) : ack.action === 'claimed' ? (
                        <span className="text-[11px] font-bold text-emerald-300">Accepted by {transferOffer.toCharName}</span>
                      ) : ack.action === 'returned' ? (
                        isSender && onRespondTransferOffer ? (
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-[11px] font-bold text-amber-300">Returned by {transferOffer.toCharName}</span>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => runTransferAction('reclaim')}
                              className="px-2.5 py-1 rounded text-xs font-bold rev-btn-primary disabled:opacity-40"
                            >
                              {isBusy ? 'Reclaiming...' : 'Reclaim to Backpack'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-300">Returned by {transferOffer.toCharName}</span>
                        )
                      ) : (
                        <span className="text-[11px] font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                          Reclaimed by {transferOffer.fromCharName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={msg.id}
                  className={`group flex flex-col gap-0.5 max-w-[85%] ${isOwn ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--rev-text-muted)' }}>
                    <span
                      className="font-bold"
                      style={{ color: isOwn ? 'var(--rev-accent-text)' : 'var(--rev-text-secondary)' }}
                    >
                      {msg.username}
                    </span>
                    <span className="tabular-nums" style={{ color: 'var(--rev-text-faint)' }}>
                      {formatTime(msg.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteMessage(msg)}
                        aria-label="Delete message"
                        title="Delete message"
                        className="rev-icon-btn rev-icon-btn-danger text-base opacity-70 sm:opacity-40 group-hover:opacity-100 disabled:opacity-30"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div
                    className="px-3 py-1.5 text-sm whitespace-pre-wrap break-words border"
                    style={{
                      borderRadius: 'var(--rev-radius-control)',
                      backgroundColor: isOwn ? 'var(--rev-accent-soft)' : 'var(--rev-surface)',
                      borderColor: isOwn ? 'var(--rev-accent-border)' : 'var(--rev-border)',
                      color: 'var(--rev-text)',
                    }}
                  >
                    {renderMessageWithLinks(msg.content)}
                  </div>
                </div>
              );
            })
          )
        ) : logItems.length === 0 ? (
          <p className="text-xs italic my-auto text-center" style={{ color: 'var(--rev-text-faint)' }}>
            No skill checks or dice rolls logged yet. Accept a roll from any party character sheet to record it here.
          </p>
        ) : (
          logItems.map(({ msg, entry }) => {
            const isOwn = msg.user_id === userId;
            const canDelete = isOwn || isLeader;
            const isDeleting = deletingIds.has(msg.id);
            const outcomeColors = getOutcomeColors(entry.outcomeTone);
            return (
              <div
                key={msg.id}
                className="group relative border rounded-lg p-3 bg-black/35 space-y-2 transition-colors"
                style={{
                  borderColor: 'var(--rev-border)',
                  borderLeftWidth: '4px',
                  borderLeftColor: entry.accentColor || 'var(--rev-accent-text)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                      <span style={{ color: entry.accentColor || 'var(--rev-accent-text)' }}>
                        {entry.accentTag}
                      </span>
                      <span style={{ color: 'var(--rev-text-faint)' }}>·</span>
                      <span className="truncate max-w-[160px]" style={{ color: 'var(--rev-text-bright)' }}>
                        {entry.charName}
                      </span>
                      {entry.advantageMode !== 'normal' && (
                        <span
                          className={`px-1.5 py-0.2 rounded border text-[9px] ${
                            entry.advantageMode === 'advantage'
                              ? 'text-emerald-300 border-emerald-700/70 bg-emerald-950/50'
                              : 'text-amber-300 border-amber-700/70 bg-amber-950/50'
                          }`}
                        >
                          {entry.advantageMode}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm sm:text-base leading-snug" style={{ color: 'var(--rev-text-bright)' }}>
                      {entry.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] tabular-nums" style={{ color: 'var(--rev-text-faint)' }}>
                      {formatTime(msg.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteMessage(msg)}
                        aria-label="Delete roll log"
                        title="Delete roll log"
                        className="text-xs leading-none p-1 rounded opacity-70 sm:opacity-40 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/15 transition-all disabled:opacity-30"
                        style={{ color: 'var(--rev-text-muted)' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Dice Breakdown & Final Total */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.dice.map((d, dIdx) => (
                      <span
                        key={dIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold tabular-nums bg-black/50"
                        style={{
                          borderColor: d.exertCount > 0 ? 'rgba(245, 158, 11, 0.7)' : 'var(--rev-border)',
                          color: 'var(--rev-text-bright)',
                        }}
                        title={d.size === 'coinflip' ? 'Coinflip' : d.size.toUpperCase()}
                      >
                        <span className="text-[9px] uppercase opacity-60">
                          {d.size === 'coinflip' ? 'Coin' : d.size}
                        </span>
                        <span>{formatDieValue(d.size, d.value)}</span>
                      </span>
                    ))}
                    {entry.modifiers.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-black/30 tabular-nums"
                        style={{ color: 'var(--rev-text-secondary)' }}
                      >
                        {m.value >= 0 ? `+${m.value}` : m.value} {m.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {entry.targetValue !== undefined && (
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
                        vs {entry.targetLabel || 'CL'} {entry.category === 'death_save' ? `${entry.targetValue}+` : entry.targetValue}
                      </span>
                    )}
                    <span
                      className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded border tabular-nums"
                      style={{
                        backgroundColor: outcomeColors.bg,
                        borderColor: outcomeColors.border,
                        color: outcomeColors.text,
                      }}
                    >
                      {!(entry.dice.every(d => d.size === 'coinflip') && entry.modifiers.length === 0 && entry.targetValue === undefined)
                        ? `${entry.total} · ${entry.outcomeLabel}`
                        : entry.outcomeLabel}
                    </span>
                  </div>
                </div>

                {(entry.exertCount > 0 || entry.destinyApplied) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {entry.exertCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-700/60 text-amber-200">
                        Exerted ×{entry.exertCount} (+{entry.strainIncurred} Strain)
                      </span>
                    )}
                    {entry.destinyApplied && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/60 text-cyan-200">
                        Destiny: {entry.destinyApplied.convictionName} (+{entry.destinyApplied.bonus})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {activeTab === 'chat' && (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Write a message..."
            maxLength={1000}
            className="flex-1 min-w-0 rev-input px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="px-4 py-2 text-sm font-bold rev-btn-primary disabled:opacity-40 shrink-0"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
