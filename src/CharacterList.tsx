import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { defaultCharacterData } from './defaults';
import type { Character } from './types';

export default function CharacterList({
  userId, onSelect,
}: { userId: string; onSelect: (id: string) => void }) {
  const [chars, setChars] = useState<Character[]>([]);

  async function load() {
    const { data } = await supabase.from('characters').select('*').order('created_at');
    setChars((data as Character[]) ?? []);
  }
  
  useEffect(() => { load(); }, []);

  async function create() {
    const name = prompt('Character name?');
    if (!name) return;
    await supabase.from('characters')
      .insert({ name, user_id: userId, data: defaultCharacterData() });
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
        <h2 className="text-3xl font-cinzel font-bold text-gray-200">
          Your Characters
        </h2>
        <button 
          onClick={create} 
          className="bg-red-900 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-red-800 transition-colors shadow-sm"
        >
          + New Character
        </button>
      </div>

      <ul className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-sm">
        {chars.length === 0 && (
          <li className="p-8 text-center text-gray-500 italic">No characters yet. Create one to begin.</li>
        )}
        {chars.map(c => (
          <li key={c.id} className="flex justify-between items-center p-4 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors">
            <button 
              onClick={() => onSelect(c.id)} 
              className="font-cinzel font-bold text-lg text-gray-200 hover:text-red-400 text-left truncate transition-colors"
            >
              {c.name}
            </button>
            <button 
              onClick={() => remove(c.id)} 
              className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider shrink-0 ml-4"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}