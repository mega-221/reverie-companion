import { useState } from 'react';
import type { Character } from '../../../types';
import { SKILL_GROUPS } from '../utils';
import { useConfirm } from '../ConfirmDialog';

const CORE_ATTRIBUTES = ['grt', 'ref', 'int', 'psy'] as const;
const ITEMS_PER_PAGE = 3;

export default function InjuriesCard({ char, patch }: { char: Character, patch: any }) {
  const [expandedInjury, setExpandedInjury] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const { askConfirm, confirmDialog } = useConfirm();

  const getWeeksPerSeverity = (treatment: string) => {
    if (treatment === 'survival') return 2;
    if (treatment === 'medicine') return 1;
    return 4;
  };

  const updateInjury = (index: number, updates: Partial<Character['data']['trackers']['injuries'][0]>) => {
    const newInjuries = [...char.data.trackers.injuries];
    const inj = { ...newInjuries[index], ...updates };
    
    if (updates.severity !== undefined || updates.treatment !== undefined) {
      const weeksPerSev = getWeeksPerSeverity(inj.treatment);
      inj.weeksLeft = inj.severity * weeksPerSev;
    }
    
    newInjuries[index] = inj;
    patch({ trackers: { ...char.data.trackers, injuries: newInjuries } });
  };

  const changeSeverity = (index: number, delta: number) => {
    const inj = char.data.trackers.injuries[index];
    const newSev = Math.max(1, inj.severity + delta);
    updateInjury(index, { severity: newSev });
  };

  const tickDownAll = async () => {
    const ok = await askConfirm({
      title: 'Heal Week',
      message: 'Tick down a week of healing for ALL injuries?',
      confirmLabel: 'Heal Week',
      tone: 'neutral',
    });
    if (!ok) return;
    
    const newInjuries: typeof char.data.trackers.injuries = [];
    
    char.data.trackers.injuries.forEach(inj => {
      const weeksPerSev = getWeeksPerSeverity(inj.treatment);
      const newWeeks = inj.weeksLeft - 1;
      
      if (newWeeks > 0) {
        newInjuries.push({
          ...inj,
          weeksLeft: newWeeks,
          severity: Math.ceil(newWeeks / weeksPerSev)
        });
      }
    });
    
    patch({ trackers: { ...char.data.trackers, injuries: newInjuries } });
    setExpandedInjury(null);
    setPage(0); 
  };

  const addInjury = () => {
    const newInjuries = [...char.data.trackers.injuries, { 
      name: 'New Injury', 
      affectedAttributes: [], 
      severity: 1, 
      treatment: 'none' as const, 
      weeksLeft: 4 
    }];
    patch({ trackers: { ...char.data.trackers, injuries: newInjuries } });
    setExpandedInjury(newInjuries.length - 1); 
    setPage(Math.floor((newInjuries.length - 1) / ITEMS_PER_PAGE)); 
  };

  const deleteInjury = async (index: number) => {
    const ok = await askConfirm({
      title: 'Delete Injury',
      message: 'Are you sure you want to delete this injury?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    
    patch({ trackers: { ...char.data.trackers, injuries: char.data.trackers.injuries.filter((_, j) => j !== index) } });
    setExpandedInjury(null);
    const remainingPages = Math.ceil((char.data.trackers.injuries.length - 1) / ITEMS_PER_PAGE);
    if (page >= remainingPages && page > 0) setPage(page - 1);
  };

  const totalPages = Math.max(1, Math.ceil(char.data.trackers.injuries.length / ITEMS_PER_PAGE));
  const displayedInjuries = char.data.trackers.injuries.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <div className="sheet-panel p-4 flex flex-col h-full">
      {confirmDialog}
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-3 shrink-0">
        <h2 className="text-xl font-spectral first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Injuries</h2>
        <div className="flex gap-2">
          <button 
            onClick={tickDownAll} 
            disabled={char.data.trackers.injuries.length === 0}
            className="rev-heal-btn text-xs font-bold text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-900 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Heal Week
          </button>
          <button 
            onClick={addInjury} 
            className="text-xs font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded transition-colors"
          >
            Add Injury
          </button>
        </div>
      </div>
      
      {/* Content Area with Out-of-Flow Overlay */}
      <div className="relative w-full flex-1 min-h-[276px] flex flex-col">
        
        {/* Background Layer: List of Injuries */}
        <div className="flex-1 flex flex-col w-full">
          {char.data.trackers.injuries.length === 0 ? (
            <div className="flex items-center justify-center flex-1 min-h-[84px]">
              <p className="text-gray-500 italic text-base">Your body is intact.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-3">
              {displayedInjuries.map((inj, i) => {
                const actualIndex = page * ITEMS_PER_PAGE + i;
                return (
                  <div 
                    key={actualIndex} 
                    onClick={() => setExpandedInjury(actualIndex)}
                    className="bg-black/20 border border-gray-700 hover:border-gray-500 rounded-lg p-3 flex justify-between items-center cursor-pointer transition-colors group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-base font-bold text-gray-200 truncate group-hover:text-white transition-colors">{inj.name || 'Unnamed Injury'}</span>
                      <div className="flex gap-1.5 mt-1.5">
                        {inj.affectedAttributes.map(attr => {
                          const key = attr.toLowerCase() as keyof typeof SKILL_GROUPS;
                          const group = SKILL_GROUPS[key];
                          if (!group) return null;
                          return (
                            <span key={attr} className={`text-[10px] font-bold uppercase ${group.color} border border-current px-1.5 py-0.5 rounded opacity-80`}>
                              {attr}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-3">
                      <div className="text-right">
                        <span className="rev-keep-color block text-sm font-bold text-red-400 leading-none mb-1">{inj.weeksLeft}w left</span>
                        <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold">Sev {inj.severity}</span>
                      </div>
                      <span className="text-gray-500 text-xs">▼</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2 mt-auto border-t border-gray-700/50 shrink-0">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))} 
                disabled={page === 0}
                className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 px-2 py-1 text-xs font-bold transition-colors"
              >
                ← Prev
              </button>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                Page {page + 1} of {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} 
                disabled={page === totalPages - 1}
                className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 px-2 py-1 text-xs font-bold transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Foreground Overlay: Expanded Form (absolute so card height never shifts) */}
        {expandedInjury !== null && char.data.trackers.injuries[expandedInjury] && (
          <div className="absolute inset-0 w-full h-full overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg p-4 flex flex-col justify-between shadow-2xl z-10 animate-in fade-in duration-200">
             
             <div className="flex flex-col gap-4">
               <div className="flex justify-between items-center gap-2 shrink-0">
                 <input 
                   value={char.data.trackers.injuries[expandedInjury].name} 
                   placeholder="Injury name..." 
                   className="bg-transparent text-lg font-bold text-gray-100 focus:outline-none flex-1 border-b border-gray-700 focus:border-red-500 transition-colors pb-1" 
                   onChange={e => updateInjury(expandedInjury, { name: e.target.value })} 
                 />
                 <button 
                   onClick={() => setExpandedInjury(null)} 
                   className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-xl leading-none px-2 py-0.5 shrink-0 transition-colors"
                   title="Close"
                   aria-label="Close injury editor"
                 >
                   ×
                 </button>
               </div>
               
               {/* Attributes Checkboxes */}
               <div className="flex flex-col gap-2 shrink-0">
                 <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Affected Attributes</span>
                 <div className="flex gap-2 w-full">
                   {CORE_ATTRIBUTES.map(attr => {
                     const isChecked = char.data.trackers.injuries[expandedInjury].affectedAttributes.includes(attr.toUpperCase());
                     const group = SKILL_GROUPS[attr];
                     return (
                       <button
                         key={attr}
                         onClick={() => {
                           const next = isChecked 
                             ? char.data.trackers.injuries[expandedInjury].affectedAttributes.filter(a => a !== attr.toUpperCase()) 
                             : [...char.data.trackers.injuries[expandedInjury].affectedAttributes, attr.toUpperCase()];
                           updateInjury(expandedInjury, { affectedAttributes: next });
                         }}
                         className={`flex-1 py-1.5 text-xs font-bold uppercase rounded border transition-colors ${
                           isChecked 
                             ? `${group.color} border-current bg-black/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]` 
                             : 'bg-gray-900 border-gray-700 text-gray-600 hover:bg-gray-800 hover:text-gray-400'
                         }`}
                       >
                         {attr}
                       </button>
                     );
                   })}
                 </div>
               </div>
               
               {/* Severity & Treatment */}
               <div className="flex gap-4 items-end shrink-0 w-full">
                  <div className="flex flex-col gap-2 w-24 shrink-0">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Severity</span>
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm h-9">
                      <button onClick={() => changeSeverity(expandedInjury, -1)} className="w-8 h-full flex items-center justify-center hover:bg-gray-800 text-gray-400 hover:text-white font-bold transition-colors">−</button>
                      <div className="flex-1 text-center font-bold text-base text-white">{char.data.trackers.injuries[expandedInjury].severity}</div>
                      <button onClick={() => changeSeverity(expandedInjury, 1)} className="w-8 h-full flex items-center justify-center hover:bg-gray-800 text-gray-400 hover:text-white font-bold transition-colors">+</button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Treatment</span>
                    <div className="flex gap-1.5 h-9">
                      {['none', 'survival', 'medicine'].map(t => (
                        <button 
                          key={t}
                          onClick={() => updateInjury(expandedInjury, { treatment: t as any })} 
                          className={`flex-1 text-[10px] font-bold uppercase rounded-lg border transition-colors ${
                            char.data.trackers.injuries[expandedInjury].treatment === t
                              ? 'bg-gray-700 border-gray-500 text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]'
                              : 'bg-gray-900 border-gray-700 text-gray-500 hover:bg-gray-800'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
               </div>
             </div>
             
             {/* Footer & Done */}
             <div className="flex justify-between items-center pt-3 border-t border-gray-700/50 mt-4 shrink-0 gap-2">
               <span className="rev-keep-color text-sm font-bold text-red-400">
                 {char.data.trackers.injuries[expandedInjury].weeksLeft} week{char.data.trackers.injuries[expandedInjury].weeksLeft !== 1 ? 's' : ''} left
               </span>
               <div className="flex items-center gap-2 shrink-0">
                 <button 
                   onClick={() => deleteInjury(expandedInjury)} 
                   className="rev-keep-color bg-red-950/40 hover:bg-red-900/60 border border-red-900 text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                 >
                   Delete
                 </button>
                 <button 
                   onClick={() => setExpandedInjury(null)} 
                   className="bg-gray-700 hover:bg-gray-600 border border-gray-500 text-white text-xs font-bold px-5 py-1.5 rounded-lg transition-colors shadow-sm"
                 >
                   Done
                 </button>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}