import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../../types';
import { useConfirm } from '../ConfirmDialog';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

const ITEMS_PER_PAGE = 5;
type Relationship = Character['data']['relationships'][number];

export default function RelationshipsCard({ char, patch }: { char: Character, patch: any }) {
  const { askConfirm, confirmDialog } = useConfirm();
  const [newRelName, setNewRelName] = useState('');
  const [newRelFaction, setNewRelFaction] = useState('');
  const [newRelRole, setNewRelRole] = useState('');
  const [newRelDesc, setNewRelDesc] = useState('');

  const [isAddingRel, setIsAddingRel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inspectingRel, setInspectingRel] = useState<Relationship | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [factionFilter, setFactionFilter] = useState('');
  const [page, setPage] = useState(0);

  useBodyScrollLock(Boolean(inspectingRel));

  const relationships = char.data.relationships || [];

  const factions = useMemo(() => {
    const set = new Set<string>();
    relationships.forEach(r => {
      const f = r.faction?.trim();
      if (f) set.add(f);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [relationships]);

  const activeFactionFilter = factionFilter && factions.includes(factionFilter) ? factionFilter : '';

  const filteredRelationships = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return relationships.filter(rel => {
      if (activeFactionFilter && (rel.faction?.trim() || '') !== activeFactionFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (rel.name || '').toLowerCase().includes(q) ||
        (rel.faction || '').toLowerCase().includes(q) ||
        (rel.role || '').toLowerCase().includes(q) ||
        (rel.description || '').toLowerCase().includes(q)
      );
    });
  }, [relationships, activeFactionFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRelationships.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const displayedRelationships = filteredRelationships.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

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
      setSearchQuery('');
      setFactionFilter('');
      setPage(Math.floor(relationships.length / ITEMS_PER_PAGE));
    }

    handleCancel();
  };

  const handleEdit = (rel: Relationship) => {
    setInspectingRel(null);
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

  const handleDelete = async (rel: { id: string; name: string }) => {
    const ok = await askConfirm({
      title: 'Remove Bond',
      message: `Are you sure you want to remove ${rel.name || 'this relationship'}?`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    if (inspectingRel?.id === rel.id) setInspectingRel(null);
    const next = relationships.filter(r => r.id !== rel.id);
    patch({ relationships: next });
    const nextTotalPages = Math.max(1, Math.ceil(next.length / ITEMS_PER_PAGE));
    if (page >= nextTotalPages) setPage(nextTotalPages - 1);
  };

  const inputClass = "bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500 min-w-0";

  return (
    // Height matches OriginCard (420px) on lg desktop
    <section className="sheet-panel rev-nar-card p-3.5 sm:p-5 w-full min-h-[320px] lg:h-[420px] flex flex-col">
      {confirmDialog}
      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-3 shrink-0 gap-2">
        <h2 className="text-xl font-spectral first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Relationships</h2>
        <button onClick={isAddingRel ? handleCancel : () => setIsAddingRel(true)} className="text-xs font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0">
          {isAddingRel ? 'Cancel' : '+ Add Bond'}
        </button>
      </div>

      {/* Content area: list layer + form overlay share one grid cell */}
      <div className="grid grid-cols-1 grid-rows-[minmax(0,1fr)] w-full flex-1 min-h-0">

        {/* Background layer: search/filter + list + pager */}
        <div className="col-start-1 row-start-1 flex flex-col min-h-0">
          {relationships.length > 0 && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-2.5 shrink-0">
              <div className="relative flex-1 min-w-[160px] flex items-center">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-2.5 text-gray-500 pointer-events-none"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                  placeholder="Search bonds..."
                  className="w-full bg-black/25 border border-gray-700 rounded pl-8 pr-7 py-1 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                  aria-label="Search relationships"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setPage(0); }}
                    className="absolute right-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/10 rounded font-bold text-xs p-0.5 leading-none transition-colors"
                    title="Clear search"
                    aria-label="Clear relationship search"
                  >
                    ×
                  </button>
                )}
              </div>

              {factions.length > 0 && (
                <select
                  value={activeFactionFilter}
                  onChange={e => { setFactionFilter(e.target.value); setPage(0); }}
                  className="bg-black/25 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-red-500 w-full sm:w-auto sm:max-w-[145px] shrink-0"
                  aria-label="Filter by faction"
                >
                  <option value="">All Factions</option>
                  {factions.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 5 rows * 44px + 4 gaps * 6px = 244px, fixed inside remaining height */}
          <div className="flex-1 min-h-0 space-y-1.5 overflow-hidden">
            {relationships.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10 px-4 text-center">
                <p className="text-gray-500 italic text-sm">No bonds forged yet.</p>
              </div>
            ) : displayedRelationships.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-gray-500 italic text-sm">No matching bonds found.</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setFactionFilter(''); setPage(0); }}
                  className="text-xs font-bold text-red-400 hover:text-red-300 underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              displayedRelationships.map(rel => (
                <div
                  key={rel.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setInspectingRel(rel)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setInspectingRel(rel);
                    }
                  }}
                  className="bg-black/20 border border-gray-700 hover:border-gray-500 hover:bg-white/[0.03] rounded-lg px-3 h-11 flex justify-between items-center group cursor-pointer transition-colors"
                  title="Click to read full bond details"
                >
                  <div className="flex flex-row items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                    <span className="font-bold text-gray-200 text-sm truncate sm:shrink-0 sm:max-w-[35%]">{rel.name}</span>

                    {rel.faction && (
                      <>
                        <div className="w-px h-4 bg-gray-600 shrink-0"></div>
                        <span className="text-xs text-gray-400 font-bold bg-gray-800 px-2 py-0.5 rounded border border-gray-700 shrink-0 truncate max-w-[110px] sm:max-w-[120px]">{rel.faction}</span>
                      </>
                    )}

                    {rel.role && (
                      <>
                        <div className="hidden sm:block w-px h-4 bg-gray-600 shrink-0"></div>
                        <span className="hidden sm:inline text-xs text-gray-400 shrink-0 truncate max-w-[140px]">{rel.role}</span>
                      </>
                    )}

                    {rel.description && (
                      <>
                        <div className="hidden sm:block w-px h-4 bg-gray-600 shrink-0"></div>
                        <span className="hidden sm:inline text-xs text-gray-500 italic truncate">{rel.description}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEdit(rel)} className="rev-icon-btn rev-icon-btn-edit text-sm opacity-80 sm:opacity-50 sm:group-hover:opacity-100" title="Edit Entry">✎</button>
                    <button onClick={() => handleDelete(rel)} className="rev-icon-btn rev-icon-btn-danger text-lg opacity-80 sm:opacity-50 sm:group-hover:opacity-100" title="Delete Entry">×</button>
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
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input type="text" placeholder="Name" value={newRelName} onChange={e => setNewRelName(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Faction" value={newRelFaction} onChange={e => setNewRelFaction(e.target.value)} className={inputClass} />
              </div>
              <input type="text" placeholder="Relationship / Role" value={newRelRole} onChange={e => setNewRelRole(e.target.value)} className={inputClass} />
              <textarea
                rows={4}
                placeholder="Description or opinion"
                value={newRelDesc}
                onChange={e => setNewRelDesc(e.target.value)}
                className={`${inputClass} resize-none leading-relaxed`}
              />
            </div>
            <div className="flex justify-end pt-2.5 mt-2 border-t border-gray-700/50">
              <button onClick={handleSave} disabled={!newRelName.trim()} className="bg-red-900 hover:bg-red-800 disabled:opacity-40 text-white font-bold text-sm px-6 py-2 rounded transition-colors">
                {editingId ? 'Save Changes' : 'Add Bond'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Bond Inspection Modal */}
      {inspectingRel && createPortal(
        <div
          className="fixed inset-0 z-[250] rev-backdrop flex items-center justify-center p-4"
          onClick={() => setInspectingRel(null)}
        >
          <div
            className="sheet-modal animate-in zoom-in-95 duration-200 max-w-lg w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0 gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-xl text-gray-100 truncate">{inspectingRel.name}</h3>
                {(inspectingRel.faction || inspectingRel.role) && (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {inspectingRel.faction && (
                      <span className="text-xs text-gray-300 font-bold bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                        {inspectingRel.faction}
                      </span>
                    )}
                    {inspectingRel.role && (
                      <span className="text-xs text-red-400 font-medium">{inspectingRel.role}</span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setInspectingRel(null)}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 shrink-0 transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Description & Opinion
              </div>
              <div className="bg-black/25 border border-gray-700/80 rounded-lg p-4 max-h-64 overflow-y-auto">
                {inspectingRel.description ? (
                  <p className="text-sm text-gray-200 font-serif leading-relaxed whitespace-pre-wrap">
                    {inspectingRel.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No description or opinion recorded yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 px-5 pb-4 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => handleDelete(inspectingRel)}
                className="px-3 py-1.5 rounded text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 transition-colors"
              >
                Remove
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(inspectingRel)}
                  className="px-4 py-1.5 rounded text-xs font-bold text-gray-200 bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingRel(null)}
                  className="px-4 py-1.5 rounded text-xs font-bold text-white bg-red-900 hover:bg-red-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}