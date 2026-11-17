import { useRef, useState } from 'react';
import type { Character } from '../../../types';

type Entry = NonNullable<Character['data']['journal']>[number];
type Fields = Pick<Entry, 'title' | 'content' | 'inUniverseDate'>;

function renderInline(text: string) {
  // Matches **bold**, *italic*, and ~~strikethrough~~
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
  const [inUniverseDate, setInUniverseDate] = useState(initial?.inUniverseDate ?? '');
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
        <input type="text" placeholder="In-universe date (optional)" value={inUniverseDate} onChange={e => setInUniverseDate(e.target.value)} className={`${input} sm:w-56 shrink-0`} />
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

  const journal = char.data.journal || [];

  const addEntry = (f: Fields) => {
    const entry: Entry = { id: crypto.randomUUID(), date: new Date().toISOString(), ...f };
    patch({ journal: [entry, ...journal] });
    setIsAdding(false);
  };

  const updateEntry = (id: string, f: Fields) => {
    patch({ journal: journal.map(j => (j.id === id ? { ...j, ...f } : j)) });
    setEditingId(null);
  };

  const removeEntry = (id: string) => patch({ journal: journal.filter(j => j.id !== id) });

  const iconBtn = 'font-bold px-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity';

  return (
    <section className="sheet-panel p-5 w-full h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4 shrink-0">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Journal</h2>
        <button
          onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
          className="text-xs font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded transition-colors"
        >
          {isAdding ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {isAdding && (
        <div className="mb-4">
          <EntryEditor submitLabel="Commit to Memory" onSave={addEntry} onCancel={() => setIsAdding(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2">
        {journal.length === 0 && !isAdding ? (
          <p className="text-gray-500 italic text-sm text-center py-8">The pages are blank. Write your first entry.</p>
        ) : (
          journal.map(entry => (
            <div key={entry.id} className="relative pl-6 group">
              {/* Timeline Line & Dot */}
              <div className="absolute left-0 top-2 bottom-0 w-px bg-gray-700 group-last:bottom-auto group-last:h-full"></div>
              <div className="absolute left-[-4px] top-2 w-2.5 h-2.5 rounded-full bg-gray-600 border border-gray-900"></div>

              {editingId === entry.id ? (
                <EntryEditor
                  initial={entry}
                  submitLabel="Save"
                  onSave={f => updateEntry(entry.id, f)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="bg-black/20 border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0">
                      {entry.title && <h3 className="font-bold text-gray-200 text-base font-cinzel">{entry.title}</h3>}
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        {entry.inUniverseDate && (
                          <span className="text-xs text-red-400 font-cinzel">{entry.inUniverseDate}</span>
                        )}
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <button onClick={() => { setEditingId(entry.id); setIsAdding(false); }} className={`${iconBtn} text-gray-400 hover:text-gray-200 text-xs`}>Edit</button>
                      <button onClick={() => removeEntry(entry.id)} className={`${iconBtn} text-red-500 hover:text-red-400`}>×</button>
                    </div>
                  </div>
                  <FormattedContent content={entry.content} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}