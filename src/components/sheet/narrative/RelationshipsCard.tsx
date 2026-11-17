import { useState } from 'react';
import type { Character } from '../../../types';

const ITEMS_PER_PAGE = 5;

export default function RelationshipsCard({ char, patch }: { char: Character, patch: any }) {
  const [newRelName, setNewRelName] = useState('');
  const [newRelFaction, setNewRelFaction] = useState('');
  const [newRelRole, setNewRelRole] = useState('');
  const [newRelDesc, setNewRelDesc] = useState('');

  const [isAddingRel, setIsAddingRel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const relationships = char.data.relationships || [];
  const totalPages = Math.max(1, Math.ceil(relationships.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const displayedRelationships = relationships.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

  const handleSave = () => {
    if (!newRelName.trim()) return;

    if (editingId) {
      const updated = relationships.map(r =>
        r.id === editingId ? { ...r, name: newRelName.trim(), faction: newRelFaction.trim(), role: newRelRole.trim(), description: newRelDesc.trim() } : r
      );
      patch({ relationships: updated });
    } else {
      const newRel = {
        id: crypto.randomUUID(),
        name: newRelName.trim(),
        faction: newRelFaction.trim(),
        role: newRelRole.trim(),
        description: newRelDesc.trim()
      };
      patch({ relationships: [...relationships, newRel] });
      setPage(Math.floor(relationships.length / ITEMS_PER_PAGE));
    }

    handleCancel();
  };

  const handleEdit = (rel: any) => {
    setEditingId(rel.id);
    setNewRelName(rel.name);
    setNewRelFaction(rel.faction || '');
    setNewRelRole(rel.role || '');
    setNewRelDesc(rel.description || '');
    setIsAddingRel(true);
  };

  const handleCancel = () => {
    setIsAddingRel(false);
    setEditingId(null);
    setNewRelName('');
    setNewRelFaction('');
    setNewRelRole('');
    setNewRelDesc('');
  };

  const handleDelete = (id: string) => {
    patch({ relationships: relationships.filter(r => r.id !== id) });
  };

  const inputClass = "bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500 min-w-0";

  return (
    // Height must match OriginCard (h-[420px])
    <section className="sheet-panel p-5 w-full h-[420px] flex flex-col">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4 shrink-0">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Relationships</h2>
        <button onClick={isAddingRel ? handleCancel : () => setIsAddingRel(true)} className="text-xs font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded transition-colors">
          {isAddingRel ? 'Cancel' : '+ Add Bond'}
        </button>
      </div>

      {/* Content area: list layer + form overlay share one grid cell */}
      <div className="grid grid-cols-1 grid-rows-[minmax(0,1fr)] w-full flex-1 min-h-0">

        {/* Background layer: list + pager */}
        <div className="col-start-1 row-start-1 flex flex-col min-h-0">
          {/* 5 rows * 48px + 4 gaps * 8px = 272px, fixed */}
          <div className="h-[272px] shrink-0 space-y-2">
            {relationships.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 italic text-sm">No bonds forged yet.</p>
              </div>
            ) : (
              displayedRelationships.map(rel => (
                <div key={rel.id} className="bg-black/20 border border-gray-700 rounded-lg px-3 h-12 flex justify-between items-center group">

                  <div className="flex flex-row items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <span className="font-bold text-gray-200 text-sm truncate shrink-0 max-w-[40%]">{rel.name}</span>

                    {rel.faction && (
                      <>
                        <div className="w-px h-4 bg-gray-600 shrink-0"></div>
                        <span className="text-xs text-gray-400 font-bold bg-gray-800 px-2 py-0.5 rounded border border-gray-700 shrink-0 truncate max-w-[120px]">{rel.faction}</span>
                      </>
                    )}

                    {rel.role && (
                      <>
                        <div className="w-px h-4 bg-gray-600 shrink-0"></div>
                        <span className="text-xs text-gray-400 shrink-0 truncate max-w-[150px]">{rel.role}</span>
                      </>
                    )}

                    {rel.description && (
                      <>
                        <div className="w-px h-4 bg-gray-600 shrink-0"></div>
                        <span className="text-xs text-gray-500 italic truncate">{rel.description}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => handleEdit(rel)} className="text-gray-400 hover:text-white font-bold px-1 opacity-50 group-hover:opacity-100 transition-opacity" title="Edit Entry">✎</button>
                    <button onClick={() => handleDelete(rel.id)} className="text-red-500 hover:text-red-400 font-bold px-1 opacity-50 group-hover:opacity-100 transition-opacity" title="Delete Entry">×</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pager: always rendered so layout never shifts; 3-col grid keeps the label truly centered */}
          <div className="grid grid-cols-3 items-center pt-2 mt-auto border-t border-gray-700/50 shrink-0">
            <button
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="justify-self-start text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 px-2 py-1 text-xs font-bold transition-colors"
            >
              ← Prev
            </button>
            <span className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Page {safePage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage === totalPages - 1}
              className="justify-self-end text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 px-2 py-1 text-xs font-bold transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Foreground overlay: add/edit form */}
        {isAddingRel && (
          <div className="col-start-1 row-start-1 bg-gray-800 border border-gray-600 rounded-lg p-3 flex flex-col justify-between shadow-2xl z-10 animate-in fade-in duration-200">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Name" value={newRelName} onChange={e => setNewRelName(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Faction" value={newRelFaction} onChange={e => setNewRelFaction(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Relationship" value={newRelRole} onChange={e => setNewRelRole(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Description or opinion" value={newRelDesc} onChange={e => setNewRelDesc(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end pt-3 mt-3 border-t border-gray-700/50">
              <button onClick={handleSave} className="bg-red-900 hover:bg-red-800 text-white font-bold text-sm px-6 py-2 rounded transition-colors">
                {editingId ? 'Save Changes' : 'Add Bond'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}