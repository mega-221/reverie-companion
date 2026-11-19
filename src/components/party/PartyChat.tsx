import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabase';
import type { PartyMessage } from '../../types';

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
}) {
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rlsDeleteBlocked, setRlsDeleteBlocked] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [draft, setDraft] = useState('');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const listEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setError(null);
    setRlsDeleteBlocked(false);
    const { data, error: fetchErr } = await supabase
      .from('party_messages')
      .select('*')
      .eq('party_id', partyId)
      .order('created_at', { ascending: true })
      .limit(100);

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
      setMessages(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        for (const msg of relevant) {
          map.set(msg.id, msg);
        }
        const next = Array.from(map.values());
        next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return next.slice(-100);
      });
    }
    onConsumeIncomingMessages();
  }, [incomingMessages, partyId, onConsumeIncomingMessages]);

  useEffect(() => {
    if (deletedMessageIds.length === 0) return;
    const idSet = new Set(deletedMessageIds);
    setMessages(prev => prev.filter(m => !idSet.has(m.id)));
    onConsumeDeletedMessages?.();
  }, [deletedMessageIds, onConsumeDeletedMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

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

  return (
    <div className="sheet-panel p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b rev-divider pb-2">
        <h3 className="font-cinzel font-bold text-lg" style={{ color: 'var(--rev-text)' }}>
          Party Chat
        </h3>
        <button
          type="button"
          onClick={loadMessages}
          className="text-xs font-bold transition-colors"
          style={{ color: 'var(--rev-text-muted)' }}
          title="Refresh messages"
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
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-xs italic my-auto text-center" style={{ color: 'var(--rev-text-faint)' }}>
            No messages yet.
          </p>
        ) : (
          messages.map(msg => {
            const isOwn = msg.user_id === userId;
            const canDelete = isOwn || isLeader;
            const isDeleting = deletingIds.has(msg.id);
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
                      className="text-xs leading-none px-1 rounded opacity-70 sm:opacity-40 group-hover:opacity-100 hover:text-red-400 transition-opacity disabled:opacity-30"
                      style={{ color: 'var(--rev-text-muted)' }}
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
        )}
        <div ref={listEndRef} />
      </div>

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
    </div>
  );
}
