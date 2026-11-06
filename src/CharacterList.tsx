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
    <div className="mt-4">
      <button onClick={create} className="bg-gray-800 text-white px-4 py-2 rounded mb-4 hover:bg-gray-700">
        + New Character
      </button>
      <ul className="border rounded divide-y">
        {chars.length === 0 && <li className="p-4 text-gray-500 italic">No characters yet.</li>}
        {chars.map(c => (
          <li key={c.id} className="flex justify-between items-center p-4 hover:bg-gray-50">
            <button onClick={() => onSelect(c.id)} className="text-blue-600 hover:underline font-medium text-lg text-left">
              {c.name}
            </button>
            <button onClick={() => remove(c.id)} className="text-sm text-red-500 hover:text-red-700">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}