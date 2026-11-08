import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { defaultCharacterData } from './defaults';
import type { Character } from './types';

export default function CharacterList({
  userId, onSelect,
}: { userId: string; onSelect: (id: string) => void }) {
  const [chars, setChars] = useState<Character[]>([]);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharLevel, setNewCharLevel] = useState<number>(1);
  const [creating, setCreating] = useState(false);

  async function load() {
    const { data } = await supabase.from('characters').select('*').order('created_at');
    setChars((data as Character[]) ?? []);
  }
  
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newCharName.trim()) return;
    
    setCreating(true);
    
    const charData = defaultCharacterData();
    const safeLevel = Math.max(1, Math.min(24, newCharLevel));
    const tier = Math.ceil(safeLevel / 4);
    
    charData.progression.level = safeLevel;
    charData.progression.tier = tier;
    charData.progression.xp = safeLevel * 5;
    
    const tierMod = tier - 1;
    charData.trackers.vigor = 5 + tierMod;
    charData.trackers.dp = 2 + tierMod;
    
    await supabase.from('characters').insert({ 
      name: newCharName.trim(), 
      user_id: userId, 
      data: charData 
    });
    
    setCreating(false);
    setIsCreateModalOpen(false);
    setNewCharName('');
    setNewCharLevel(1);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Are you sure you want to delete this character?')) return;
    await supabase.from('characters').delete().eq('id', id);
    load();
  }

  return (
    <div className="mt-6 w-full max-w-3xl mx-auto">
      <div className="flex justify-between items-end mb-6 border-b border-gray-700 pb-4">
        <h2 className="text-3xl font-cinzel font-bold text-gray-200">Your Characters</h2>
        <button 
          onClick={() => setIsCreateModalOpen(true)} 
          className="bg-red-900 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-red-800 transition-colors shadow-sm"
        >
          + New Character
        </button>
      </div>

      <ul className="sheet-panel overflow-hidden shadow-sm">
        {chars.length === 0 && (
          <li className="p-8 text-center text-gray-500 italic">No characters yet. Create one to begin.</li>
        )}
        {chars.map(c => (
          <li key={c.id} className="flex justify-between items-center p-4 border-b border-gray-700/50 last:border-0 hover:bg-white/5 transition-colors">
            <div className="flex flex-col">
              <button 
                onClick={() => onSelect(c.id)} 
                className="font-cinzel font-bold text-lg text-gray-200 hover:text-red-400 text-left truncate transition-colors"
              >
                {c.name}
              </button>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                Level {c.data.progression.level} • Tier {c.data.progression.tier}
              </span>
            </div>
            <button 
              onClick={() => remove(c.id)} 
              className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider shrink-0 ml-4"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sheet-panel shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
              <h2 className="font-cinzel font-bold text-xl text-gray-200">Create New Character</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex gap-4">
                <label className="flex flex-col text-sm font-bold text-gray-400 flex-1">
                  Character Name
                  <input
                    type="text"
                    className="border border-gray-700 bg-black/40 p-3 rounded-lg mt-1 font-normal shadow-inner focus:outline-none focus:border-red-500 text-gray-200 text-lg"
                    placeholder="Enter name..."
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    autoFocus
                  />
                </label>
                <label className="flex flex-col text-sm font-bold text-gray-400 w-24 shrink-0">
                  Level
                  <input
                    type="number"
                    min={1}
                    max={24}
                    className="border border-gray-700 bg-black/40 p-3 rounded-lg mt-1 font-normal shadow-inner focus:outline-none focus:border-red-500 text-gray-200 text-lg text-center"
                    value={newCharLevel}
                    onChange={(e) => setNewCharLevel(+e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </label>
              </div>

              <div className="flex gap-2 w-full mt-4">
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-3 rounded-lg font-bold text-sm border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={!newCharName.trim() || creating}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-colors flex items-center justify-center
                    ${!newCharName.trim() || creating ? 'bg-black/20 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-red-950/40 text-red-300 border-red-900 hover:bg-red-900/60'}`}
                >
                  {creating ? 'Creating...' : 'Create Character'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}