import { useState } from 'react';
import type { Character } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import { equipItem, unequipSlot, equipExtraItem, unequipExtraSlot } from '../../inventory';

export default function LoadoutCard({ char, patch, onOpenInventory }: { char: Character, patch: any, onOpenInventory: () => void }) {
  const { getEntryByName } = useCompendium();
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [activeLoadoutTab, setActiveLoadoutTab] = useState<'combat' | 'equipment'>('combat');
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  const isMainHand2H = char.data.equipment?.mainHandMode === '2H';

  const getItemName = (id: string) => {
    if (!id) return '';
    const item = char.data.items.find(i => i.id === id) || char.data.possessions?.find(i => i.id === id);
    return item ? (item.customName || item.name) : '';
  };

  const handleDrop = (e: React.DragEvent, targetSlot: string, targetExtraIdx?: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      const { id, source, slot: sourceSlot, extraIndex: sourceExtraIdx } = data;
      
      let newData = { ...char.data };
      
      if (source === 'equipment') {
        if (sourceSlot === 'extra') {
          const res = unequipExtraSlot(newData, sourceExtraIdx);
          if (res) newData = { ...newData, ...res };
        } else {
          const res = unequipSlot(newData, sourceSlot);
          if (res) newData = { ...newData, ...res };
        }
      }

      if (targetSlot === 'extra' && targetExtraIdx !== undefined) {
        const res = equipExtraItem(newData, targetExtraIdx, id, getEntryByName);
        if (res) newData = { ...newData, ...res };
      } else if (targetSlot === 'mainHand' || targetSlot === 'offHand' || targetSlot === 'armour') {
        const itemObj = newData.items.find((i:any) => i.id === id);
        const dbItem = getEntryByName(itemObj?.name || '');
        const req = String(dbItem?.data?.req || '');
        const isHybrid = req.includes('1H/2H');
        const mode = isHybrid ? '1H' : undefined;
        
        if (targetSlot === 'offHand' && req.includes('2H') && !isHybrid) return;

        const res = equipItem(newData, targetSlot as any, id, getEntryByName, mode);
        if (res) newData = { ...newData, ...res };
      }
      
      patch(newData);
    } catch {}
  };

  const renderItemStats = (name: string, fallbackItem?: any) => {
    const dbItem = getEntryByName(name);
    const data = dbItem?.data || fallbackItem;
    if (!data) return null;
    
    const stats = [];
    if (data.req) stats.push({ label: 'Requires', value: data.req, color: 'text-gray-300' });
    if (data.dmg) stats.push({ label: 'Damage', value: data.dmg, color: 'text-red-400' });
    if (data.range) stats.push({ label: 'Range', value: data.range, color: 'text-green-400' });
    if (data.burden !== undefined) stats.push({ label: 'Burden', value: data.burden, color: 'text-blue-400' });
    
    return (
      <div className="pt-1">
        {stats.length > 0 && (
          <div className="flex flex-wrap justify-between gap-2 mb-3 bg-gray-900/50 p-2 rounded border border-gray-800 shadow-inner text-center">
            {stats.map((stat, idx) => (
              <div key={idx} className={`flex-1 flex flex-col items-center justify-center min-w-[60px] ${idx !== stats.length - 1 ? 'border-r border-gray-700' : ''}`}>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</span>
                <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}
        {data.effect && data.effect !== '-' && (
          <div className="text-xs italic text-gray-200 border-l-2 border-gray-700 pl-3 mb-1">
            {data.effect}
          </div>
        )}
      </div>
    );
  };

  const renderSlot = (label: string, key: string, isExtra: boolean, extraIndex?: number) => {
    const equippedId = isExtra 
      ? char.data.equipment.extra?.[extraIndex!] 
      : char.data.equipment[key as keyof typeof char.data.equipment] as string;
      
    const equippedName = getItemName(equippedId || '');
    const isBlocked = key === 'offHand' && isMainHand2H;

    return (
      <div key={key} className="flex flex-col gap-1 w-full shrink-0">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
        <div 
          onDragEnter={() => !isBlocked && setDragOverSlot(key)}
          onDragLeave={() => setDragOverSlot(null)}
          onDragOver={(e) => { e.preventDefault(); if (!isBlocked) setDragOverSlot(key); }}
          onDrop={(e) => !isBlocked && handleDrop(e, isExtra ? 'extra' : key, extraIndex)}
          className={`border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${
            isBlocked 
              ? 'bg-gray-900 border-gray-800 cursor-not-allowed opacity-50' 
              : 'bg-black/40 hover:border-gray-500 active:opacity-60'
          } ${dragOverSlot === key ? 'ring-2 ring-red-500 bg-white/10 border-red-500' : ''}`}
          draggable={!!equippedId && !isBlocked}
          onDragStart={(e) => {
            if (equippedId && !isBlocked) {
              e.dataTransfer.setData('application/json', JSON.stringify({ 
                id: equippedId, 
                source: 'equipment', 
                slot: isExtra ? 'extra' : key,
                extraIndex
              }));
            }
          }}
        >
          <div 
            className={`flex justify-between items-center p-2 select-none transition-all duration-75 ${equippedId && !isBlocked ? 'cursor-pointer hover:bg-white/5' : ''}`}
            onClick={() => {
              if (equippedId && !isBlocked) setExpandedSlot(key);
              else if (!equippedId && !isBlocked) onOpenInventory();
            }}
          >
            <span className={`text-sm truncate pr-2 ${equippedId && !isBlocked ? 'text-gray-200 font-bold' : 'text-gray-500 italic'}`}>
              {isBlocked ? 'Blocked (2H)' : equippedId ? equippedName : '— Empty —'}
            </span>
            {!isBlocked && <span className="text-gray-500 text-[10px] shrink-0">▼</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderExpandedView = () => {
    if (!expandedSlot) return null;
    
    let equippedId = '';
    let label = '';
    
    if (expandedSlot === 'mainHand') { equippedId = char.data.equipment.mainHand; label = 'Main Hand'; }
    else if (expandedSlot === 'offHand') { equippedId = char.data.equipment.offHand; label = 'Off Hand'; }
    else if (expandedSlot === 'armour') { equippedId = char.data.equipment.armour; label = 'Armour'; }
    else if (expandedSlot.startsWith('extra-')) {
      const idx = parseInt(expandedSlot.split('-')[1], 10);
      equippedId = char.data.equipment.extra?.[idx] || '';
      label = `Equipment ${idx + 1}`;
    }

    if (!equippedId) return null;
    const item = char.data.items.find(i => i.id === equippedId) || char.data.possessions?.find(i => i.id === equippedId);
    if (!item) return null;

    return (
      <div className="absolute inset-0 z-10 bg-gray-800 border border-gray-700 rounded-lg p-3 animate-in fade-in zoom-in-95 duration-200 flex flex-col shadow-lg">
        <div className="flex justify-between items-center mb-2 shrink-0">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
          <button onClick={() => setExpandedSlot(null)} className="text-gray-400 hover:text-white text-xs px-2 py-1 bg-black/40 rounded border border-gray-600 transition-colors">Close</button>
        </div>
        <h3 className="text-sm font-bold text-gray-200 mb-1 truncate shrink-0">{item.customName || item.name}</h3>
        <div className="flex-1 overflow-hidden">
          {renderItemStats(item.name, item)}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-sm p-5 flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-700 pb-3 mb-3 shrink-0 flex justify-between items-center">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Loadout</h2>
        <button onClick={onOpenInventory} className="text-xs font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded transition-colors active:opacity-60">
          Open Inventory
        </button>
      </div>

      <div className="flex gap-2 mb-3 shrink-0">
        <button 
          onClick={() => { setActiveLoadoutTab('combat'); setExpandedSlot(null); }}
          className={`flex-1 text-center py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border transition-all duration-75 ${
            activeLoadoutTab === 'combat' 
              ? 'bg-red-900/30 text-red-200 border-red-700' 
              : 'bg-black/20 text-gray-500 border-transparent hover:bg-white/5'
          }`}
        >
          Combat
        </button>
        <button 
          onClick={() => { setActiveLoadoutTab('equipment'); setExpandedSlot(null); }}
          className={`flex-1 text-center py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border transition-all duration-75 ${
            activeLoadoutTab === 'equipment' 
              ? 'bg-red-900/30 text-red-200 border-red-700' 
              : 'bg-black/20 text-gray-500 border-transparent hover:bg-white/5'
          }`}
        >
          Equipment
        </button>
      </div>
      
      <div className="relative w-full h-[220px]">
        <div className={`w-full h-full overflow-y-auto custom-scrollbar pr-1 transition-all duration-200 ${expandedSlot ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {activeLoadoutTab === 'combat' && (
            <div className="flex flex-col gap-2 animate-in fade-in duration-200">
              {renderSlot('Main Hand', 'mainHand', false)}
              {renderSlot('Off Hand', 'offHand', false)}
              {renderSlot('Armour', 'armour', false)}
            </div>
          )}

          {activeLoadoutTab === 'equipment' && (
            <div className="flex flex-col gap-2 animate-in fade-in duration-200">
              {(char.data.equipment.extra || []).map((_, idx) => 
                renderSlot(`Equipment ${idx + 1}`, `extra-${idx}`, true, idx)
              )}
              <button 
                onClick={() => patch({ equipment: { ...char.data.equipment, extra: [...(char.data.equipment.extra || []), ''] } })} 
                className="border border-dashed border-gray-600 px-3 py-2 text-xs rounded-lg hover:bg-white/5 text-gray-400 font-medium transition-colors mt-1"
              >
                + Add Equipment Slot
              </button>
            </div>
          )}
        </div>
        {renderExpandedView()}
      </div>
    </div>
  );
}