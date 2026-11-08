import type { Character } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import { SectionHeader, SEASONS } from './utils';

export default function NarrativeSection({ char, patch, openOriginModal }: { char: Character, patch: any, openOriginModal: () => void }) {
  const { getConvictions, getFailings, getEntryByName } = useCompendium();

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* ORIGIN SECTION */}
      <section className="sheet-panel p-6 w-full">
        <SectionHeader title="Identity & Origin" />
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-4">
            <label className="flex flex-col text-sm font-bold text-gray-400 shrink-0">Origin
              <div 
                className="border border-gray-700 bg-black/40 p-2.5 rounded-lg mt-1 shadow-inner font-normal text-lg w-full text-gray-200 cursor-pointer flex justify-between items-center hover:border-gray-500 transition-colors"
                onClick={openOriginModal}
              >
                <span className="truncate">{char.data.identity.origin || "— Select Origin —"}</span>
                <span className="text-gray-500 text-sm">▼</span>
              </div>
            </label>
            <div className="flex-1">
              <div className="text-sm font-normal text-gray-300 italic border-l-2 border-gray-600 pl-3 py-1 leading-relaxed h-full">
                {getEntryByName(char.data.identity.origin)?.data?.lore || 'Select an origin to view its lore. Your Origin dictates your starting skills, inspirations, and minimum skill caps.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONVICTIONS SECTION */}
      <section className="sheet-panel p-6 w-full">
        <SectionHeader title="Convictions & Failings" />
        <div className="space-y-4 w-full">
          {[...Array(3)].map((_, i) => {
            const conviction = char.data.convictions[i];
            const failing = char.data.failings.find(f => f.convictionIndex === i);
            if (!conviction && !failing) return null;

            const compendiumConviction = getEntryByName(conviction?.name || '');
            const compendiumFailing = getEntryByName(failing?.name || '');

            return (
              <div key={i} className="flex flex-col lg:flex-row gap-4 w-full">
                {conviction && (
                  <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-900/50 shadow-sm flex-1 relative">
                    <div className="flex flex-col gap-2 mb-2 w-full">
                      <div className="flex gap-2 w-full">
                        <select className="border border-gray-700 bg-black/40 p-1.5 rounded text-sm shadow-inner focus:outline-none text-gray-200 shrink-0" value={conviction.season} onChange={e => { 
                          const next = [...char.data.convictions]; next[i] = { ...next[i], season: e.target.value, name: '', statement: '' }; patch({ convictions: next }); 
                        }}>
                          {SEASONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <select className="border border-gray-700 bg-black/40 p-1.5 rounded text-sm shadow-inner focus:outline-none text-gray-200 flex-1 min-w-0" value={conviction.name} onChange={e => { 
                          const newName = e.target.value; 
                          const compendiumItem = getEntryByName(newName);
                          const next = [...char.data.convictions]; 
                          next[i] = { ...next[i], name: newName, statement: compendiumItem?.data?.statement || '' }; 
                          patch({ convictions: next }); 
                        }}>
                          <option value="">— Select —</option>
                          {getConvictions().filter(c => c.data.season === conviction.season).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0">Rank</span>
                        <input type="number" min={1} max={5} className="border border-gray-700 bg-black/40 p-1.5 w-12 text-center rounded text-sm shadow-inner focus:outline-none text-gray-200" value={conviction.rank} 
                          onChange={e => { const next = [...char.data.convictions]; next[i] = { ...next[i], rank: Math.min(5, Math.max(1, +e.target.value)) }; patch({ convictions: next }); }} />
                        <button className="ml-auto text-red-500 font-bold hover:text-red-400 text-lg" onClick={() => {
                          const nextConvs = char.data.convictions.filter((_, j) => j !== i);
                          const nextFails = char.data.failings.filter(f => f.convictionIndex !== i).map(f => f.convictionIndex > i ? { ...f, convictionIndex: f.convictionIndex - 1 } : f);
                          patch({ convictions: nextConvs, failings: nextFails });
                        }}>×</button>
                      </div>
                    </div>
                    <div className="text-sm italic text-gray-200 border-l-2 border-blue-700 pl-3 py-1 w-full">
                      "{compendiumConviction?.data?.statement || 'Select a conviction to see its oath...'}"
                    </div>
                  </div>
                )}

                {failing ? (
                  <div className="bg-red-950/30 p-4 rounded-lg border border-red-900/50 shadow-sm flex-1 relative">
                    <div className="flex flex-col gap-2 mb-2 w-full">
                      <select className="border border-gray-700 bg-black/40 p-1.5 rounded text-sm shadow-inner w-full focus:outline-none text-gray-200" value={failing.name} onChange={e => { 
                        const newName = e.target.value; 
                        const compendiumItem = getEntryByName(newName);
                        const next = [...char.data.failings]; 
                        const realIndex = char.data.failings.findIndex(f => f.convictionIndex === i);
                        next[realIndex] = { ...next[realIndex], name: newName, statement: compendiumItem?.data?.statement || '' }; 
                        patch({ failings: next }); 
                      }}>
                        <option value="">— Select Failing —</option>
                        {getFailings().map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                      </select>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0">Rank</span>
                        <input type="number" min={1} max={4} className="border border-gray-700 bg-black/40 p-1.5 w-12 text-center rounded text-sm shadow-inner focus:outline-none text-gray-200" value={failing.rank} 
                          onChange={e => { const next = [...char.data.failings]; const realIndex = char.data.failings.findIndex(f => f.convictionIndex === i); next[realIndex] = { ...next[realIndex], rank: Math.min(4, Math.max(1, +e.target.value)) }; patch({ failings: next }); }} />
                        <button className="ml-auto text-red-500 font-bold hover:text-red-400 text-lg" onClick={() => patch({ failings: char.data.failings.filter(f => f.convictionIndex !== i) })}>×</button>
                      </div>
                    </div>
                    <div className="text-sm italic text-gray-200 border-l-2 border-red-700 pl-3 py-1 w-full">
                      "{compendiumFailing?.data?.statement || 'Select a failing to see its compulsion...'}"
                    </div>
                  </div>
                ) : (
                  conviction && (
                    <button onClick={() => patch({ failings: [...char.data.failings, { name: '', rank: 1, convictionIndex: i, statement: '' }] })} 
                      className="flex-1 border-2 border-dashed border-gray-600 rounded-lg text-gray-500 hover:bg-white/5 text-sm transition-colors font-medium flex items-center justify-center p-4">
                      + Add Failing
                    </button>
                  )
                )}
              </div>
            );
          })}
          {char.data.convictions.length < 3 && (
            <button className="border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-white/5 shadow-sm font-bold text-gray-300 w-full transition-colors" onClick={() => patch({ convictions: [...char.data.convictions, { season: 'Vamor', name: '', statement: '', rank: 1 }] })}>+ Add Conviction</button>
          )}
        </div>
      </section>

      <section className="sheet-panel p-6 w-full">
        <SectionHeader title="Notes" />
        <textarea className="border border-gray-700 bg-black/40 p-3 w-full h-64 rounded-xl shadow-inner focus:outline-none focus:border-red-500 resize-y text-gray-200" value={char.data.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Character notes..." />
      </section>
    </div>
  );
}