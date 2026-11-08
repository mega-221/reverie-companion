import type { Character } from '../../types';
import { vigorMax, strainMax, dpMax, evasion, movementTiles, burdenMax, currentBurden } from '../../calc';
import { useCompendium } from '../../CompendiumContext';
import { SectionHeader, ResourceBar } from './utils';

export default function VitalsSection({ 
  char, updateTracker, patch, openOriginModal 
}: { 
  char: Character, 
  updateTracker: (k: any, a: number) => void, 
  patch: (p: any) => void, 
  openOriginModal: () => void 
}) {
  const { getEntryByName } = useCompendium();
  const currentBurdenVal = currentBurden(char.data);
  const maxBurdenVal = burdenMax(char.data);
  const isOverburdened = currentBurdenVal > maxBurdenVal;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full lg:h-[260px]">
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm flex flex-col min-h-0">
        <SectionHeader title="Identity" />
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <label className="flex flex-col text-sm font-bold text-gray-400 shrink-0">Origin
            <div className="border border-gray-600 bg-gray-900 p-2 rounded mt-1 font-normal text-sm w-full text-gray-200 cursor-pointer flex justify-between items-center hover:border-gray-500 transition-colors" onClick={openOriginModal}>
              <span className="truncate">{char.data.identity.origin || "— Select Origin —"}</span>
              <span className="text-gray-500 text-[10px]">▼</span>
            </div>
          </label>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="text-sm font-normal text-gray-400 italic border-l-2 border-gray-600 pl-3 py-1 leading-relaxed">
              {getEntryByName(char.data.identity.origin)?.data?.lore || 'Select an origin to view its lore.'}
            </div>
          </div>
        </div>
      </section>

      <div className="border border-red-900 bg-red-950/40 rounded-xl p-5 flex flex-col justify-center gap-4 shadow-sm h-full">
        {[
          { label: 'Vigor', key: 'vigor', max: vigorMax(char.data), color: 'bg-red-500', overLimit: undefined },
          { label: 'Strain', key: 'strain', max: strainMax(char.data), color: 'bg-blue-500', overLimit: 'bg-purple-600' },
          { label: 'Destiny', key: 'dp', max: dpMax(char.data), color: 'bg-yellow-500', overLimit: undefined }
        ].map(({ label, key, max, color, overLimit }) => (
          <div key={key} className="flex flex-col w-full">
            <div className="flex items-center justify-between gap-4 w-full">
              <span className="font-bold text-red-400 uppercase tracking-widest text-sm w-20 shrink-0">{label}</span>
              <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm flex-1 h-10">
                <button onClick={() => updateTracker(key, -1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-l-lg font-bold shrink-0">−</button>
                <div className="flex-1 text-center font-bold text-xl text-white">{char.data.trackers[key as keyof typeof char.data.trackers] as number} <span className="text-sm text-gray-500 font-normal">/ {max}</span></div>
                <button onClick={() => updateTracker(key, 1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-r-lg font-bold shrink-0">+</button>
              </div>
            </div>
            <ResourceBar current={char.data.trackers[key as keyof typeof char.data.trackers] as number} max={max} color={color} overLimitColor={overLimit} />
          </div>
        ))}
      </div>

      <div className="border border-gray-700 rounded-xl bg-gray-800 p-5 shadow-sm grid grid-cols-2 gap-4 text-center items-center h-full">
        <div><div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Evasion</div><div className="font-bold text-3xl text-white">{evasion(char.data)}</div></div>
        <div><div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Movement</div><div className="font-bold text-3xl text-white">{movementTiles(char.data)}</div></div>
        <div className="flex flex-col items-center justify-center">
          <div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Armour</div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateTracker('ap', -1)} className="text-gray-500 hover:text-white font-bold">−</button>
            <input type="number" className="border-b-2 border-gray-600 p-0 w-10 text-center font-bold text-3xl focus:outline-none focus:border-red-500 bg-transparent text-white" value={char.data.trackers.ap} onChange={e => patch({ trackers: { ...char.data.trackers, ap: +e.target.value } })} />
            <button onClick={() => updateTracker('ap', 1)} className="text-gray-500 hover:text-white font-bold">+</button>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Burden</div>
          <div className={`font-bold text-3xl ${isOverburdened ? 'text-red-500' : 'text-white'}`}>{currentBurdenVal} <span className="text-sm text-gray-500 font-normal">/ {maxBurdenVal}</span></div>
        </div>
      </div>
    </div>
  );
}