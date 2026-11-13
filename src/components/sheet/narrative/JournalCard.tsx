import { useState } from 'react';
import type { Character } from '../../../types';

export default function JournalCard({ char, patch }: { char: Character, patch: any }) {
  const [newJournalTitle, setNewJournalTitle] = useState('');
  const [newJournalContent, setNewJournalContent] = useState('');
  const [isAddingJournal, setIsAddingJournal] = useState(false);

  const handleAddJournal = () => {
    if (!newJournalTitle.trim() || !newJournalContent.trim()) return;
    const newEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      title: newJournalTitle.trim(),
      content: newJournalContent.trim()
    };
    patch({ journal: [newEntry, ...(char.data.journal || [])] });
    setNewJournalTitle('');
    setNewJournalContent('');
    setIsAddingJournal(false);
  };

  return (
    <section className="sheet-panel p-5 w-full h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4 shrink-0">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Journal</h2>
        <button onClick={() => setIsAddingJournal(!isAddingJournal)} className="text-xs font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded transition-colors">
          {isAddingJournal ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {isAddingJournal && (
        <div className="bg-black/30 border border-gray-700 rounded-lg p-3 mb-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
          <input type="text" placeholder="Entry Title" value={newJournalTitle} onChange={e => setNewJournalTitle(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500" />
          <textarea placeholder="Write your thoughts..." rows={3} value={newJournalContent} onChange={e => setNewJournalContent(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500 resize-none font-serif" />
          <button onClick={handleAddJournal} className="self-end bg-red-900 hover:bg-red-800 text-white font-bold text-sm px-6 py-2 rounded transition-colors">Commit to Memory</button>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[400px] pr-2">
        {(char.data.journal || []).length === 0 && !isAddingJournal ? (
          <p className="text-gray-500 italic text-sm text-center py-8">The pages are blank. Write your first entry.</p>
        ) : (
          (char.data.journal || []).map(entry => (
            <div key={entry.id} className="relative pl-6 group">
              {/* Timeline Line & Dot */}
              <div className="absolute left-0 top-2 bottom-0 w-px bg-gray-700 group-last:bottom-auto group-last:h-full"></div>
              <div className="absolute left-[-4px] top-2 w-2.5 h-2.5 rounded-full bg-gray-600 border border-gray-900"></div>
              
              <div className="bg-black/20 border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-200 text-base font-cinzel">{entry.title}</h3>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{new Date(entry.date).toLocaleDateString()}</span>
                  </div>
                  <button onClick={() => patch({ journal: (char.data.journal || []).filter(j => j.id !== entry.id) })} className="text-red-500 hover:text-red-400 font-bold px-1 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
                <div className="text-sm text-gray-300 font-serif leading-relaxed whitespace-pre-wrap">{entry.content}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}