import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../../types';
import { useConfirm } from '../ConfirmDialog';
import {
  REVERIE_MONTHS,
  parseReverieDate,
  formatReverieDate,
  calendarSortKey,
  type ReverieCalendarDate,
} from '../../../reverieCalendar';

export { REVERIE_MONTHS };

type Entry = NonNullable<Character['data']['journal']>[number];
type Fields = Pick<Entry, 'title' | 'content' | 'inUniverseDate'>;
type CalendarDate = ReverieCalendarDate;

function formatEntryDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const parsed = parseReverieDate(raw);
  return parsed ? formatReverieDate(parsed) : raw;
}

function CalendarSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (formatted: string) => void;
}) {
  const parsed = parseReverieDate(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CalendarDate>(() => parsed ?? { day: 1, monthIndex: 0, year: 421 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parsed) setDraft(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  const shiftMonth = (delta: number) => {
    setDraft(prev => {
      let nextMonth = prev.monthIndex + delta;
      let nextYear = prev.year;
      while (nextMonth < 0) {
        nextMonth += 12;
        nextYear -= 1;
      }
      while (nextMonth >= 12) {
        nextMonth -= 12;
        nextYear += 1;
      }
      const next = { ...prev, monthIndex: nextMonth, year: nextYear };
      if (value) onChange(formatReverieDate(next));
      return next;
    });
  };

  const selectDay = (day: number) => {
    const next = { ...draft, day };
    setDraft(next);
    onChange(formatReverieDate(next));
    setOpen(false);
  };

  const handleYearChange = (rawYear: string) => {
    const num = rawYear === '' || rawYear === '-' ? 0 : parseInt(rawYear, 10);
    const safeYear = Number.isNaN(num) ? 421 : num;
    const next = { ...draft, year: safeYear };
    setDraft(next);
    if (value) onChange(formatReverieDate(next));
  };

  const handleMonthChange = (monthIndex: number) => {
    const next = { ...draft, monthIndex };
    setDraft(next);
    if (value) onChange(formatReverieDate(next));
  };

  const displayValue = parsed ? formatReverieDate(parsed) : value;

  return (
    <div ref={containerRef} className="relative sm:w-72 shrink-0">
      <div className="flex items-center bg-gray-900 border border-gray-700 rounded focus-within:border-red-500 transition-colors">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 min-w-0 px-2.5 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors rounded-l"
          title="Open calendar selector"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-400 shrink-0"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={`truncate tabular-nums ${displayValue ? 'text-gray-200' : 'text-gray-500'}`}>
            {displayValue || 'Select calendar date...'}
          </span>
        </button>

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="px-2 py-2 text-gray-500 hover:text-red-400 font-bold text-sm border-l border-gray-700 transition-colors shrink-0"
            title="Clear date"
          >
            ×
          </button>
        )}
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
                <span className="text-xs font-cinzel font-bold uppercase tracking-widest text-gray-300">
                  Select Date
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-white font-bold text-lg leading-none px-1"
                  aria-label="Close calendar"
                >
                  ×
                </button>
              </div>

              {/* Month & Year Controls */}
              <div className="flex items-center gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-bold transition-colors shrink-0"
                  title="Previous month"
                >
                  ‹
                </button>

                <select
                  value={draft.monthIndex}
                  onChange={e => handleMonthChange(Number(e.target.value))}
                  className="flex-1 min-w-0 bg-black/40 border border-gray-700 rounded px-2 py-1.5 text-xs font-bold text-gray-200 focus:outline-none focus:border-red-500"
                  aria-label="Month"
                >
                  {REVERIE_MONTHS.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>

                <div className="flex items-center bg-black/40 border border-gray-700 rounded focus-within:border-red-500 shrink-0">
                  <input
                    type="number"
                    value={draft.year}
                    onChange={e => handleYearChange(e.target.value)}
                    className="w-14 bg-transparent px-1.5 py-1.5 text-xs font-bold text-gray-200 text-right focus:outline-none tabular-nums"
                    aria-label="Year"
                  />
                  <span className="pr-2 pl-0.5 text-[11px] font-bold text-red-400 select-none">. AS</span>
                </div>

                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-bold transition-colors shrink-0"
                  title="Next month"
                >
                  ›
                </button>
              </div>

              {/* 30-Day Grid (5 rows x 6 days) */}
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 30 }, (_, idx) => {
                  const day = idx + 1;
                  const isSelected = Boolean(parsed) && parsed?.day === day && parsed?.monthIndex === draft.monthIndex && parsed?.year === draft.year;
                  const isDraftDay = draft.day === day;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`py-1.5 rounded text-xs font-bold tabular-nums transition-colors border ${
                        isSelected
                          ? 'bg-red-900 border-red-500 text-white shadow-sm'
                          : isDraftDay
                          ? 'bg-gray-800 border-gray-500 text-gray-100 hover:bg-red-950/60 hover:border-red-700'
                          : 'bg-black/30 border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800 text-[11px]">
                <span className="text-gray-400 truncate pr-2 tabular-nums">
                  {formatReverieDate(draft)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onChange(formatReverieDate(draft));
                    setOpen(false);
                  }}
                  className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-white font-bold transition-colors shrink-0"
                >
                  Set Date
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-gray-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-gray-200">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <del key={i} className="line-through text-gray-500">{part.slice(2, -2)}</del>;
    }
    return part;
  });
}

function FormattedContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="text-sm text-gray-300 font-serif leading-relaxed space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed === '---') {
          return <hr key={idx} className="border-gray-700/80 my-2" />;
        }
        if (line.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-2 border-red-800/80 pl-3 italic text-gray-400">
              {renderInline(line.slice(2))}
            </blockquote>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <div key={idx} className="flex gap-2 pl-2">
              <span className="text-red-500/80 select-none">•</span>
              <span className="flex-1">{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }
        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function EntryEditor({ initial, submitLabel, onSave, onCancel }: {
  initial?: Fields;
  submitLabel: string;
  onSave: (f: Fields) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [inUniverseDate, setInUniverseDate] = useState(() => formatEntryDate(initial?.inUniverseDate) ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const save = () => {
    if (!content.trim()) return;
    onSave({
      title: title.trim(),
      inUniverseDate: inUniverseDate.trim() || undefined,
      content: content.trim(),
    });
  };

  const wrapSelection = (before: string, after = before, placeholder = 'text') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const prefixLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const hasPrefix = content.slice(lineStart).startsWith(prefix);
    const next = hasPrefix
      ? content.slice(0, lineStart) + content.slice(lineStart + prefix.length)
      : content.slice(0, lineStart) + prefix + content.slice(lineStart);
    const offset = hasPrefix ? -prefix.length : prefix.length;
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(Math.max(lineStart, start + offset), Math.max(lineStart, start + offset));
    });
  };

  const insertDivider = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const before = content.slice(0, start);
    const after = content.slice(start);
    const padBefore = before.length && !before.endsWith('\n') ? '\n' : '';
    const padAfter = after.length && !after.startsWith('\n') ? '\n' : '';
    const insertion = `${padBefore}---\n${padAfter}`;
    setContent(before + insertion + after);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + insertion.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
    if ((e.ctrlKey || e.metaKey) && !preview) {
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        wrapSelection('**', '**', 'bold text');
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        wrapSelection('*', '*', 'italic text');
      }
    }
  };

  const input = 'bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500';
  const toolBtn = 'px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors disabled:opacity-30';

  return (
    <div onKeyDown={onKeyDown} className="bg-black/30 border border-gray-700 rounded-lg p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <input type="text" placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} className={`${input} flex-1 min-w-0`} />
        <CalendarSelector value={inUniverseDate} onChange={setInUniverseDate} />
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center justify-between gap-2 bg-gray-900/90 border border-gray-700/80 rounded px-2 py-1">
        <div className="flex items-center gap-1 flex-wrap">
          <button type="button" disabled={preview} onClick={() => wrapSelection('**', '**', 'bold')} title="Bold (Ctrl+B)" className={`${toolBtn} font-bold`}>B</button>
          <button type="button" disabled={preview} onClick={() => wrapSelection('*', '*', 'italic')} title="Italic (Ctrl+I)" className={`${toolBtn} italic font-serif`}>I</button>
          <button type="button" disabled={preview} onClick={() => wrapSelection('~~', '~~', 'crossed out')} title="Strikethrough" className={`${toolBtn} line-through`}>S</button>
          <span className="w-px h-3.5 bg-gray-700 mx-1" />
          <button type="button" disabled={preview} onClick={() => prefixLine('> ')} title="Blockquote" className={toolBtn}>“ Quote</button>
          <button type="button" disabled={preview} onClick={() => prefixLine('- ')} title="Bullet List" className={toolBtn}>• List</button>
          <button type="button" disabled={preview} onClick={insertDivider} title="Section Divider" className={toolBtn}>— Divider</button>
        </div>

        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div className="bg-gray-900/60 border border-gray-700 rounded p-3 min-h-[154px]">
          {content.trim() ? (
            <FormattedContent content={content} />
          ) : (
            <p className="text-sm text-gray-500 italic">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          autoFocus
          placeholder="Write your thoughts... (**bold**, *italic*, > quote, - list)"
          rows={6}
          value={content}
          onChange={e => setContent(e.target.value)}
          className={`${input} resize-y font-serif leading-relaxed`}
        />
      )}

      <div className="flex justify-between items-center gap-2">
        <span className="text-[11px] text-gray-500 hidden sm:inline">Ctrl+Enter to save · Esc to cancel</span>
        <div className="flex justify-end gap-2 ml-auto">
          <button type="button" onClick={onCancel} className="text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-4 py-2 rounded transition-colors">Cancel</button>
          <button type="button" onClick={save} disabled={!content.trim()} className="bg-red-900 hover:bg-red-800 disabled:opacity-40 disabled:hover:bg-red-900 text-white font-bold text-sm px-6 py-2 rounded transition-colors">{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function JournalCard({ char, patch }: { char: Character, patch: any }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const { askConfirm, confirmDialog } = useConfirm();

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const journal = char.data.journal || [];
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const displayedJournal = [...journal]
    .filter(entry => {
      if (!normalizedQuery) return true;
      const formattedDate = formatEntryDate(entry.inUniverseDate) || '';
      const realDate = new Date(entry.date).toLocaleDateString();
      return (
        (entry.title || '').toLowerCase().includes(normalizedQuery) ||
        (entry.content || '').toLowerCase().includes(normalizedQuery) ||
        (entry.inUniverseDate || '').toLowerCase().includes(normalizedQuery) ||
        formattedDate.toLowerCase().includes(normalizedQuery) ||
        realDate.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => {
      const da = parseReverieDate(a.inUniverseDate);
      const db = parseReverieDate(b.inUniverseDate);

      if (da && db) {
        const diff = calendarSortKey(da) - calendarSortKey(db);
        if (diff !== 0) return order === 'oldest' ? diff : -diff;
      }

      const ta = new Date(a.date).getTime() || 0;
      const tb = new Date(b.date).getTime() || 0;
      return order === 'oldest' ? ta - tb : tb - ta;
    });

  const addEntry = (f: Fields) => {
    const entry: Entry = { id: crypto.randomUUID(), date: new Date().toISOString(), ...f };
    patch({ journal: [entry, ...journal] });
    setIsAdding(false);
  };

  const updateEntry = (id: string, f: Fields) => {
    patch({ journal: journal.map(j => (j.id === id ? { ...j, ...f } : j)) });
    setEditingId(null);
  };

  const removeEntry = async (id: string) => {
    const ok = await askConfirm({
      title: 'Delete Journal Entry',
      message: 'Are you sure you want to delete this journal entry? This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    patch({ journal: journal.filter(j => j.id !== id) });
  };

  const iconBtn = 'font-bold px-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity';

  return (
    <section className="sheet-panel p-3.5 sm:p-5 w-full h-full flex flex-col">
      {confirmDialog}
      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4 shrink-0 gap-3">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Journal</h2>
        <div className="flex items-center gap-2 shrink-0">
          {journal.length > 1 && (
            <button
              type="button"
              onClick={() => setOrder(o => (o === 'newest' ? 'oldest' : 'newest'))}
              className="text-xs font-bold text-gray-400 hover:text-gray-200 bg-black/20 border border-gray-700 px-2.5 py-1.5 rounded transition-colors whitespace-nowrap shrink-0"
              title="Toggle timeline order"
            >
              {order === 'newest' ? 'Newest First' : 'Chronological'}
            </button>
          )}
          <button
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
            className="text-xs font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0"
          >
            {isAdding ? 'Cancel' : '+ New Entry'}
          </button>
        </div>
      </div>

      {journal.length > 0 && (
        <div className="mb-3 shrink-0">
          <div className="relative flex items-center">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 text-gray-500 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search entries by title, text, or date..."
              className="w-full bg-black/25 border border-gray-700 rounded-lg pl-9 pr-8 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              aria-label="Search journal entries"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-gray-500 hover:text-gray-200 font-bold text-sm px-1"
                title="Clear search"
                aria-label="Clear journal search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="mb-4">
          <EntryEditor submitLabel="Commit to Memory" onSave={addEntry} onCancel={() => setIsAdding(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-y-auto max-h-[500px] pr-2">
        {displayedJournal.length === 0 && !isAdding ? (
          journal.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center">
              <p className="text-gray-500 italic text-sm">No journal entries yet.</p>
            </div>
          ) : (
            <div className="text-center py-8 flex flex-col items-center gap-2">
              <p className="text-gray-500 italic text-sm">No journal entries match “{searchQuery}”.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-red-400 hover:text-red-300 underline"
              >
                Clear search
              </button>
            </div>
          )
        ) : (
          displayedJournal.map((entry, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === displayedJournal.length - 1;
            const formattedInUniverseDate = formatEntryDate(entry.inUniverseDate);

            return (
              <div key={entry.id} className={`relative pl-5 sm:pl-7 group ${isLast ? '' : 'pb-4'}`}>
                {/* Continuous Timeline Spine & Diamond Node */}
                {!isFirst && (
                  <div className="absolute left-[5px] top-0 h-[22px] w-px bg-gray-700" aria-hidden="true" />
                )}
                {!isLast && (
                  <div className="absolute left-[5px] top-[22px] bottom-0 w-px bg-gray-700" aria-hidden="true" />
                )}
                <div
                  className="absolute left-[1px] top-[17px] w-2.5 h-2.5 rotate-45 bg-gray-900 border border-red-500/70 group-hover:border-red-400 transition-colors"
                  aria-hidden="true"
                />

                {editingId === entry.id ? (
                  <EntryEditor
                    initial={entry}
                    submitLabel="Save"
                    onSave={f => updateEntry(entry.id, f)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="bg-black/20 border border-gray-700 rounded-lg overflow-hidden">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={Boolean(expandedIds[entry.id])}
                      onClick={() => toggleExpand(entry.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleExpand(entry.id);
                        }
                      }}
                      className="p-3 sm:p-4 flex justify-between items-start gap-2 cursor-pointer select-none hover:bg-white/5 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        {entry.title ? (
                          <h3 className="font-bold text-gray-200 text-base font-cinzel truncate">{entry.title}</h3>
                        ) : (
                          <h3 className="italic text-gray-500 text-sm font-cinzel">Untitled Entry</h3>
                        )}
                        <div className="flex flex-wrap items-baseline gap-x-2 mt-0.5">
                          {formattedInUniverseDate && (
                            <span className="text-xs text-red-400 font-cinzel tabular-nums">{formattedInUniverseDate}</span>
                          )}
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider tabular-nums">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditingId(entry.id); setIsAdding(false); }} className={`${iconBtn} text-gray-400 hover:text-gray-200 text-xs`}>Edit</button>
                        <button onClick={() => removeEntry(entry.id)} className={`${iconBtn} text-red-500 hover:text-red-400`} title="Delete Entry">×</button>
                        <button
                          type="button"
                          onClick={() => toggleExpand(entry.id)}
                          className="px-2 text-gray-500 hover:text-white font-bold text-xs transition-colors"
                          aria-label={expandedIds[entry.id] ? 'Collapse entry' : 'Expand entry'}
                        >
                          {expandedIds[entry.id] ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>
                    {expandedIds[entry.id] && (
                      <div className="px-4 pb-4 pt-3 border-t border-gray-800/80 bg-black/20">
                        <FormattedContent content={entry.content} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}