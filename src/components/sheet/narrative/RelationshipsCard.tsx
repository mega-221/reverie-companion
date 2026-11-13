import { useState } from 'react';
import type { Character } from '../../../types';

export default function RelationshipsCard({ char, patch }: { char: Character, patch: any }) {
  const [newRelName, setNewRelName] = useState('');
  const [newRelRole, setNewRelRole] = useState('');
  const [newRelStatus, setNewRelStatus] = useState('Ally');
  const [isAddingRel, setIsAddingRel] = useState(false);

  const handleAddRelationship = () => {
    if (!newRelName.trim()) return;
    const newRel = {
      id: crypto.randomUUID(),
      name: newRelName.trim(),
      role: newRelRole.trim(),
      status: newRelStatus
    };
    patch({ relationships: [...(char.data.relationships || []), newRel] });
    setNewRelName('');
    setNewRelRole('');
    setNewRelStatus('Ally');
    setIsAddingRel(false);
  };

  return (
    <section className="sheet-panel p-5 w-full h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4 shrink-0">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Relationships</h2>
        <button onClick={() => setIsAddingRel(!isAddingRel)} className="text-xs font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded transition-colors">
          {isAddingRel ? 'Cancel' : '+ Add Bond'}
        </button>
      </div>

      {isAddingRel && (
        <div className="bg-black/30 border border-gray-700 rounded-lg p-3 mb-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Name" value={newRelName} onChange={e => setNewRelName(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500" />
            <input type="text" placeholder="Role / Relation" value={newRelRole} onChange={e => setNewRelRole(e.target.value)} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500" />
          </div>
          <div className="flex gap-2">
            <select value={newRelStatus} onChange={e => setNewRelStatus(e.target.value)} className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500">
              <option>Ally</option>
              <option>Rival</option>
              <option>Deceased</option>
              <option>Missing</option>
              <option>Unknown</option>
            </select>
            <button onClick={handleAddRelationship} className="bg-red-900 hover:bg-red-800 text-white font-bold text-sm px-4 rounded transition-colors">Add</button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-1">
        {(char.data.relationships || []).length === 0 && !isAddingRel ? (
          <p className="text-gray-500 italic text-sm text-center py-4">No bonds forged yet.</p>
        ) : (
          (char.data.relationships || []).map(rel => (
            <div key={rel.id} className="bg-black/20 border border-gray-700 rounded-lg p-3 flex justify-between items-center group">
              <div>
                <div className="font-bold text-gray-200 text-sm">{rel.name}</div>
                <div className="text-xs text-gray-400">{rel.role}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                  rel.status === 'Ally' ? 'text-green-400 border-green-900 bg-green-950/30' :
                  rel.status === 'Rival' ? 'text-red-400 border-red-900 bg-red-950/30' :
                  'text-gray-400 border-gray-700 bg-gray-800'
                }`}>{rel.status}</span>
                <button onClick={() => patch({ relationships: (char.data.relationships || []).filter(r => r.id !== rel.id) })} className="text-red-500 hover:text-red-400 font-bold px-1 opacity-50 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}