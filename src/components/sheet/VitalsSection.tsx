import type { Character } from '../../types';
import { vigorMax, strainMax, dpMax, evasion, movementTiles, burdenMax, calculateBurden } from '../../calc';
import { useCompendium } from '../../CompendiumContext';
import { ResourceBar } from './utils';
import { equipItem } from '../../inventory';

export default function VitalsSection({ 
  char, updateTracker, patch, onOpenInventory
}: { 
  char: Character, 
  updateTracker: (k: any, a: number) => void, 
  patch: (p: any) => void,
  onOpenInventory: () => void
}) {
  const { getEntryByName } = useCompendium();
  
  const maxBurdenVal = burdenMax(char.data);
  const currentBurdenVal = calculateBurden(char.data, getEntryByName);
  const isOverburdened = currentBurdenVal > maxBurdenVal;

  const isMainHand2H = char.data.equipment?.mainHandMode === '2H';

  const getItemName = (id: string) => {
    if (!id) return '';
    return char.data.items.find(i => i.id === id)?.name || char.data.possessions?.find(i => i.id === id)?.name || '';
  };

  const handleDrop = (e: React.DragEvent, slot: 'mainHand' | 'offHand' | 'armour') => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const { id } = JSON.parse(dataStr);
      const result = equipItem(char.data, slot, id, getEntryByName);
      if (result) patch(result);
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full">
      
      {/* COLUMN 1: VITALS (RED THEME) */}
      <div className="border border-red-900 bg-gradient-to-b from-[#2a1618] to-[#1a0f10] rounded-xl p-5 flex flex-col justify-center gap-4 shadow-sm h-full">
        {[
          { label: 'Vigor', key: 'vigor', max: vigorMax(char.data), color: 'bg-red-500', overLimit: undefined },
          { label: 'Strain', key: 'strain', max: strainMax(char.data), color: 'bg-blue-500', overLimit: 'bg-purple-600' },
          { label: 'Destiny', key: 'dp', max: dpMax(char.data), color: 'bg-yellow-500', overLimit: undefined }
        ].map(({ label, key, max, color, overLimit }) => (
          <div key={key} className="flex flex-col w-full">
            <div className="flex items-center justify-between gap-4 w-full">
              <span className="font-bold text-red-400 uppercase tracking-widest text-sm w-20 shrink-0">{label}</span>
              <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm flex-1 h-10">
                <button onClick={() => updateTracker(key, -1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-l-lg font-bold shrink-0 transition-all duration-75 active:opacity-60">−</button>
                <div className="flex-1 text-center font-bold text-xl text-white">{char.data.trackers[key as keyof typeof char.data.trackers] as number} <span className="text-sm text-gray-500 font-normal">/ {max}</span></div>
                <button onClick={() => updateTracker(key, 1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-r-lg font-bold shrink-0 transition-all duration-75 active:opacity-60">+</button>
              </div>
            </div>
            <ResourceBar current={char.data.trackers[key as keyof typeof char.data.trackers] as number} max={max} color={color} overLimitColor={overLimit} />
          </div>
        ))}
      </div>

      {/* COLUMN 2: STATS */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-sm p-5 grid grid-cols-2 gap-4 text-center items-center h-full">
        <div><div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Evasion</div><div className="font-bold text-3xl text-white">{evasion(char.data)}</div></div>
        <div><div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Movement</div><div className="font-bold text-3xl text-white">{movementTiles(char.data)}</div></div>
        <div className="flex flex-col items-center justify-center">
          <div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Armour</div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateTracker('ap', -1)} className="text-gray-500 hover:text-white font-bold transition-all duration-75 active:opacity-60">−</button>
            <input type="number" className="border-b-2 border-gray-600 p-0 w-10 text-center font-bold text-3xl focus:outline-none focus:border-red-500 bg-transparent text-white" value={char.data.trackers.ap} onChange={e => patch({ trackers: { ...char.data.trackers, ap: +e.target.value } })} />
            <button onClick={() => updateTracker('ap', 1)} className="text-gray-500 hover:text-white font-bold transition-all duration-75 active:opacity-60">+</button>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Burden</div>
          <div className={`font-bold text-3xl ${isOverburdened ? 'text-red-500' : 'text-white'}`}>{currentBurdenVal} <span className="text-sm text-gray-500 font-normal">/ {maxBurdenVal}</span></div>
        </div>
      </div>

      {/* COLUMN 3: EQUIPMENT LOADOUT */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-sm p-5 flex flex-col h-full">
        <div className="border-b border-gray-700 pb-2 mb-3 shrink-0 flex justify-between items-center">
          <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Loadout</h2>
          <button onClick={onOpenInventory} className="text-[10px] font-bold text-gray-400 hover:text-white bg-black/40 px-2 py-1 rounded border border-gray-600 transition-all duration-75 active:opacity-60">
            Open Inventory
          </button>
        </div>
        
        <div className="flex flex-col gap-2 flex-1 justify-center">
          {[
            { label: 'Main Hand', key: 'mainHand' },
            { label: 'Off Hand', key: 'offHand' },
            { label: 'Armour', key: 'armour' }
          ].map(({ label, key }) => {
            const equippedId = char.data.equipment?.[key as keyof typeof char.data.equipment] as string;
            const equippedName = getItemName(equippedId);
            const isBlocked = key === 'offHand' && isMainHand2H;
            const modeStr = key === 'mainHand' && char.data.equipment?.mainHandMode ? ` (${char.data.equipment.mainHandMode})` : '';

            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
                <div 
                  onDragOver={(e) => !isBlocked && e.preventDefault()}
                  onDrop={(e) => !isBlocked && handleDrop(e, key as any)}
                  onClick={isBlocked ? undefined : onOpenInventory}
                  className={`border p-2.5 rounded-lg transition-all duration-75 flex justify-between items-center shadow-inner h-[38px] ${
                    isBlocked 
                      ? 'bg-gray-900 border-gray-800 cursor-not-allowed text-gray-600' 
                      : 'bg-black/40 border-gray-700 cursor-pointer hover:border-gray-500 active:opacity-60'
                  }`}
                >
                  <span className={`text-sm ${equippedId && !isBlocked ? 'text-gray-200 font-bold' : 'text-gray-500 italic'}`}>
                    {isBlocked ? 'Blocked (2H Equipped)' : equippedName ? `${equippedName}${modeStr}` : '— Empty —'}
                  </span>
                  {!isBlocked && <span className="text-gray-500 text-[10px]">▼</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}