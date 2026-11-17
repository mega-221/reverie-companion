import { useState } from 'react';
import type { Character } from '../../../types';

type Entry = NonNullable<Character['data']['journal']>[number];
type Fields = Pick<Entry, 'title' | 'content' | 'inUniverseDate'>;

function EntryEditor({ initial, submitLabel, onSave, onCancel }: {
  initial?: Fields;
  submitLabel: string;
  onSave: (f: Fields) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [inUniverseDate, setInUniverseDate] = useState(initial?.inUniverseDate ?? '');
  const [content, setContent] = useState(initial?.content ?? '');

  const save = () => {
    if (!content.trim()) return;
    onSave({
      title: title.trim(),
      inUniverseDate: inUniverseDate.trim() || undefined,
      content: content.trim(),
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
  };

  const input = 'bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500';

  return (
    <div onKeyDown={onKeyDown} className="bg-black/30 border border-gray-700 rounded-lg p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
      <div className="flex gap-2">
        <input type="text" placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} className={`${input} flex-1 min-w-0`} />
        <input type="text" placeholder="In-universe date (optional)" value={inUniverseDate} onChange={e => setInUniverseDate(e.target.value)} className={`${input} w-48 shrink-0`} />
      </div>
      <textarea autoFocus placeholder="Write your thoughts..." rows={6} value={content} onChange={e => setContent(e.target.value)} className={`${input} resize-y font-serif leading-relaxed`} />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-4 py-2 rounded transition-colors">Cancel</button>
        <button onClick={save} disabled={!content.trim()} className="bg-red-900 hover:bg-red-800 disabled:opacity-40 disabled:hover:bg-red-900 text-white font-bold text-sm px-6 py-2 rounded transition-colors">{submitLabel}</button>
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

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[400px] pr-2">
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
                  <div className="text-sm text-gray-300 font-serif leading-relaxed whitespace-pre-wrap">{entry.content}</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}