import type { Character } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import { SectionHeader } from './utils';

export default function ClassSection({ char, patch, setIsClassModalOpen }: { char: Character, patch: any, setIsClassModalOpen: (b: boolean) => void }) {
  const { getDisciplines, getEntryByName, getAbilities } = useCompendium();
  const selectedClassData = getEntryByName(char.data.identity.className);
  const charDisciplines = char.data.disciplines || [];
  
  const classRank = Math.max(0, Math.min(4, char.data.progression.tier - 1));
  const allClassFeatures = getAbilities().filter(a => a.data.source === char.data.identity.className || a.data.source === char.data.identity.path);
  const classPassives = allClassFeatures.filter(a => a.data.feature_type === 'passive').sort((a,b) => (a.data.class_rank || 0) - (b.data.class_rank || 0));

  return (
    <section className="sheet-panel p-6 w-full flex flex-col gap-6">
      <div>
        <SectionHeader title="Class & Path" />
        <div className="space-y-4 mb-4">
          <div className="flex flex-col">
            {selectedClassData ? (
              <span className="text-xs text-gray-400 italic tracking-widest mb-1">{selectedClassData.data.archetype}</span>
            ) : <div className="h-4 mb-1"></div>}
            
            {/* Updated Class Box */}
            <div className="border border-gray-700 bg-gray-900 p-2.5 rounded-lg shadow-inner w-full font-bold text-gray-200 text-lg cursor-pointer flex justify-between items-center hover:border-gray-500 transition-colors" onClick={() => setIsClassModalOpen(true)}>
              <span>{char.data.identity.className || "— Select Class —"}</span>
              <span className="text-gray-500 text-sm">▼</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 italic tracking-widest h-4 mb-1">{char.data.identity.className ? 'Path' : '\u00A0'}</span>
            
            {/* Updated Path Select */}
            <select className="border border-gray-700 bg-gray-900 p-2.5 rounded-lg shadow-inner disabled:opacity-50 focus:outline-none focus:border-red-500 w-full font-bold text-gray-200 text-lg" value={char.data.identity.path} disabled={!char.data.identity.className} onChange={e => patch({ identity: { ...char.data.identity, path: e.target.value } })}>
              <option value="">— Select Path —</option>
              {(selectedClassData?.data?.paths || []).map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {char.data.identity.className && (
        <div>
          <SectionHeader title="Passive Features" />
          <div className="space-y-2">
            {classPassives.map(passive => {
              const isLocked = (passive.data.class_rank || 0) > classRank;
              return (
                <div key={passive.id} className={`bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm transition-opacity ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold ${isLocked ? 'text-gray-500' : 'text-gray-200'}`}>{passive.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${isLocked ? 'bg-gray-800 text-gray-600 border-gray-700' : 'bg-gray-800 text-gray-400 border-gray-600'}`}>{isLocked ? `Rank ${passive.data.class_rank} Req` : 'Passive'}</span>
                  </div>
                  <p className={`text-xs italic leading-snug ${isLocked ? 'text-gray-500' : 'text-gray-300'}`}>{passive.data.description}</p>
                </div>
              );
            })}
            {classPassives.length === 0 && <p className="text-xs text-gray-500 italic">No passives for this class/path.</p>}
          </div>
        </div>
      )}

      <div>
        <SectionHeader title="Disciplines" />
        <div className="space-y-2">
          {charDisciplines.map((d: string, i: number) => (
            <div key={i} className="flex gap-2 items-center w-full">
              {/* Updated Discipline Select */}
              <select className="border border-gray-700 bg-gray-900 p-2 rounded-lg shadow-inner focus:outline-none focus:border-red-500 flex-1 text-sm w-full text-gray-200" value={d} onChange={e => { const next = [...charDisciplines]; next[i] = e.target.value; patch({ disciplines: next }); }}>
                <option value="">— Select Discipline —</option>
                {getDisciplines().map(disc => <option key={disc.id} value={disc.name}>{disc.name}</option>)}
              </select>
              <button className="px-2 text-red-500 font-bold text-lg hover:text-red-400 shrink-0" onClick={() => patch({ disciplines: charDisciplines.filter((_: any, j: number) => j !== i) })}>×</button>
            </div>
          ))}
          {charDisciplines.length < 5 && <button className="border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 w-full mt-2 text-gray-400 font-medium transition-colors" onClick={() => patch({ disciplines: [...charDisciplines, ''] })}>+ add discipline</button>}
        </div>
      </div>
    </section>
  );
}