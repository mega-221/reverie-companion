import { useState } from 'react';
import { useCompendium } from '../../CompendiumContext';
import { burdenMax, calculateBurden } from '../../calc';
import { equipItem as sharedEquipItem, unequipSlot as sharedUnequipSlot } from '../../inventory';

const WEAPON_SUBTYPES = ['Sword', 'Axe', 'Blunt', 'Polearm', 'Bow', 'Stealth', 'Pistol', 'Rifle', 'Eidoloscope', 'Leech', 'Instrument', 'Focus', 'Unconventional'] as const;

type WeaponFieldFlags = {
  req?: boolean; dmg?: boolean; range?: boolean; ammo?: boolean;
  effect?: boolean; value?: boolean; burden?: boolean;
  season?: boolean; abilityAccess?: boolean; location?: boolean;
};
const WEAPON_FIELD_MAP: Record<string, WeaponFieldFlags> = {
  Sword:          { req: true, dmg: true, range: true, effect: true, value: true, burden: true },
  Axe:            { req: true, dmg: true, range: true, effect: true, value: true, burden: true },
  Blunt:          { req: true, dmg: true, range: true, effect: true, value: true, burden: true },
  Polearm:        { req: true, dmg: true, range: true, effect: true, value: true, burden: true },
  Bow:            { req: true, dmg: true, range: true, ammo: true, effect: true, value: true, burden: true },
  Stealth:        { req: true, dmg: true, range: true, ammo: true, effect: true, value: true, burden: true },
  Pistol:         { req: true, dmg: true, range: true, ammo: true, effect: true, value: true, burden: true },
  Rifle:          { req: true, dmg: true, range: true, ammo: true, effect: true, value: true, burden: true },
  Eidoloscope:    { req: true, dmg: true, range: true, effect: true, value: true, location: true, abilityAccess: true },
  Leech:          { req: true, dmg: true, range: true, effect: true, value: true, burden: true },
  Instrument:     { req: true, effect: true, value: true, burden: true },
  Focus:          { req: true, dmg: true, effect: true, value: true, burden: true, season: true, abilityAccess: true },
  Unconventional: { req: true, dmg: true, range: true, effect: true, value: true, burden: true },
};

export default function InventoryModal({ char, patch, isOpen, onClose }: any) {
  const { entries, getEntryByName } = useCompendium();
  
  const [mainTab, setMainTab] = useState<'backpack' | 'possessions' | 'database' | 'custom'>('backpack');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedEquippedSlot, setExpandedEquippedSlot] = useState<string | null>(null);
  
  const [bpCategory, setBpCategory] = useState('all');
  const [bpSubtype, setBpSubtype] = useState('all');
  const [posCategory, setPosCategory] = useState('all');
  const [posSubtype, setPosSubtype] = useState('all');
  const [dbCategory, setDbCategory] = useState('all');
  const [dbSubtype, setDbSubtype] = useState('all');

  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('equipment');
  const [customSubtype, setCustomSubtype] = useState('');
  const [customExtra, setCustomExtra] = useState<Record<string, any>>({});

  if (!isOpen) return null;

  const currentBurden = calculateBurden(char.data, getEntryByName);
  const maxBurden = burdenMax(char.data);
  const isOverburdened = currentBurden > maxBurden;

  const itemsDb = entries.filter(e => e.type === 'item');
  const isMainHand2H = char.data.equipment?.mainHandMode === '2H';

  const getSubtypes = (category: string, items: any[]) => {
    if (category === 'all') return [];
    return Array.from(new Set(
      items
        .filter(i => {
          const db = getEntryByName(i.name);
          const cat = db?.data?.category || i.category || 'equipment';
          return cat === category;
        })
        .map(i => {
          const db = getEntryByName(i.name);
          return db?.data?.subtype || i.subtype;
        })
        .filter((sub): sub is string => typeof sub === 'string' && sub.length > 0)
    )).sort();
  };

  const availableBpSubtypes = getSubtypes(bpCategory, char.data.items);
  const availablePosSubtypes = getSubtypes(posCategory, char.data.possessions || []);
  const availableDbSubtypes = getSubtypes(dbCategory, itemsDb);

  const addToBackpack = (name: string, extraData?: any, forceUnique = false) => {
    const existing = !forceUnique && char.data.items.find((i: any) => i.name === name);
    let newItems;
    if (existing) {
      newItems = char.data.items.map((i: any) => i.id === existing.id ? { ...i, qty: i.qty + 1 } : i);
    } else {
      newItems = [...char.data.items, { id: crypto.randomUUID(), name, qty: 1, ...extraData }];
    }
    patch({ items: newItems });
  };

  const removeFromBackpack = (id: string) => {
    const newEquipment = { ...char.data.equipment };
    let changedEq = false;
    (['mainHand', 'offHand', 'armour'] as const).forEach(slot => {
      if (newEquipment[slot] === id) { newEquipment[slot] = ''; changedEq = true; }
    });
    patch({ items: char.data.items.filter((i: any) => i.id !== id), ...(changedEq ? { equipment: newEquipment } : {}) });
  };

  const updateQuantity = (list: 'items' | 'possessions', id: string, delta: number) => {
    const arr = list === 'items' ? char.data.items : char.data.possessions;
    const item = arr.find((i: any) => i.id === id);
    if (!item) return;
    
    if (item.qty + delta <= 0) {
      if (list === 'items') removeFromBackpack(id);
      else patch({ possessions: char.data.possessions.filter((i: any) => i.id !== id) });
      return;
    }

    const newArr = arr.map((i: any) => i.id === id ? { ...i, qty: i.qty + delta } : i);
    if (list === 'items') patch({ items: newArr });
    else patch({ possessions: newArr });
  };

  const moveItem = (from: 'items' | 'possessions', to: 'items' | 'possessions', id: string) => {
    const sourceArr = from === 'items' ? char.data.items : char.data.possessions;
    const targetArr = to === 'items' ? char.data.items : char.data.possessions;
    const item = sourceArr.find((i: any) => i.id === id);
    if (!item) return;

    let newSource = sourceArr.map((i: any) => i.id === id ? { ...i, qty: i.qty - 1 } : i).filter((i: any) => i.qty > 0);
    
    const existingTarget = targetArr.find((i: any) => i.id === id);
    let newTarget;
    if (existingTarget) {
      newTarget = targetArr.map((i: any) => i.id === id ? { ...i, qty: i.qty + 1 } : i);
    } else {
      newTarget = [...targetArr, { ...item, qty: 1 }];
    }

    if (from === 'items') patch({ items: newSource, possessions: newTarget });
    else patch({ possessions: newSource, items: newTarget });
  };

  const equipItem = (slot: 'mainHand' | 'offHand' | 'armour', itemId: string, mode?: '1H' | '2H') => {
    const result = sharedEquipItem(char.data, slot, itemId, getEntryByName, mode);
    if (result) patch(result);
  };

  const unequipSlot = (slot: 'mainHand' | 'offHand' | 'armour') => {
    const result = sharedUnequipSlot(char.data, slot);
    if (result) patch(result);
  };

  const handleDropInModal = (e: React.DragEvent, slot: 'mainHand' | 'offHand' | 'armour') => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const { id } = JSON.parse(dataStr);
      
      const item = char.data.items.find((i:any) => i.id === id);
      if (!item) return;
      
      const dbItem = getEntryByName(item.name);
      const category = dbItem?.data?.category || item.category || 'equipment';
      
      if (slot === 'armour' && category !== 'armour') return;
      if (slot === 'offHand' && isMainHand2H) return;

      const isHybrid = dbItem?.data?.req?.includes('1H/2H');
      const is2HOnly = dbItem?.data?.req?.includes('2H') && !isHybrid;
      const mode = isHybrid ? '1H' : is2HOnly ? '2H' : '1H';

      equipItem(slot, id, mode);
    } catch (err) {}
  };

  const getItemName = (id: string) => {
    if (!id) return '';
    return char.data.items.find((i: any) => i.id === id)?.name || 'Unknown Item';
  };

  const renderItemStats = (name: string, fallbackItem?: any) => {
    const dbItem = getEntryByName(name);
    const data = dbItem?.data || fallbackItem;
    if (!data) return null;
    
    return (
      <div className="grid grid-cols-2 gap-2 text-xs mt-2 bg-black/20 p-2 rounded border border-gray-700">
        <div><span className="text-gray-500">Type:</span> <span className="capitalize">{data.category || 'Equipment'}</span> {data.subtype && `(${data.subtype})`}</div>
        <div><span className="text-gray-500">Burden:</span> {data.burden || 0}</div>
        {data.value !== undefined && <div><span className="text-gray-500">Value:</span> {data.value}</div>}
        
        {data.req && <div><span className="text-gray-500">Req:</span> {data.req}</div>}
        {data.dmg && <div><span className="text-gray-500">DMG:</span> {data.dmg}</div>}
        {data.range && <div><span className="text-gray-500">Range:</span> {data.range}</div>}
        
        {data.ammo && <div><span className="text-gray-500">Ammo:</span> {data.ammo}</div>}
        {data.season && <div><span className="text-gray-500">Season:</span> {data.season}</div>}
        {data.ability_access && <div><span className="text-gray-500">Ability Access:</span> {data.ability_access}</div>}
        {data.location && <div><span className="text-gray-500">Location:</span> {data.location}</div>}

        {data.effect && <div className="col-span-2 mt-1 border-t border-gray-700/50 pt-1 text-gray-300"><span className="text-gray-500">Effect:</span> {data.effect}</div>}
      </div>
    );
  };

  const filteredBpItems = char.data.items.filter((item: any) => {
    const db = getEntryByName(item.name);
    const cat = db?.data?.category || item.category || 'equipment';
    const sub = db?.data?.subtype || item.subtype || '';
    if (bpCategory !== 'all' && cat !== bpCategory) return false;
    if (bpSubtype !== 'all' && sub !== bpSubtype) return false;
    return true;
  });

  const filteredPosItems = (char.data.possessions || []).filter((item: any) => {
    const db = getEntryByName(item.name);
    const cat = db?.data?.category || item.category || 'equipment';
    const sub = db?.data?.subtype || item.subtype || '';
    if (posCategory !== 'all' && cat !== posCategory) return false;
    if (posSubtype !== 'all' && sub !== posSubtype) return false;
    return true;
  });

  const filteredDbItems = itemsDb.filter(item => {
    if (dbCategory !== 'all' && item.data.category !== dbCategory) return false;
    if (dbSubtype !== 'all' && item.data.subtype !== dbSubtype) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatCategoryName = (cat: string) => {
    if (cat === 'all') return 'All';
    return cat.charAt(0).toUpperCase() + cat.slice(1) + 's';
  };

  const FilterButtons = ({ category, setCategory, subtype, setSubtype, subTypes }: any) => (
    <div className="flex flex-col gap-3 mb-4 border-b border-gray-700 pb-4">
      <div className="flex flex-wrap gap-2">
        {['all', 'weapon', 'armour', 'equipment', 'concoction', 'trinket'].map(cat => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setSubtype('all'); }}
            className={`px-3 py-1.5 text-sm font-bold rounded-md border transition-all duration-75 ${
              category === cat 
                ? 'bg-red-900/50 text-red-200 border-red-700' 
                : 'bg-black/30 text-gray-400 border-gray-700 hover:bg-white/5 active:opacity-60'
            }`}
          >
            {cat === 'all' ? 'All Categories' : formatCategoryName(cat)}
          </button>
        ))}
      </div>
      {category !== 'all' && subTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubtype('all')}
            className={`px-3 py-1.5 text-sm font-bold rounded-md border transition-all duration-75 ${
              subtype === 'all' 
                ? 'bg-red-900/50 text-red-200 border-red-700' 
                : 'bg-black/30 text-gray-400 border-gray-700 hover:bg-white/5 active:opacity-60'
            }`}
          >
            All {formatCategoryName(category)}
          </button>
          {subTypes.map((sub: string) => (
            <button
              key={sub}
              onClick={() => setSubtype(sub)}
              className={`px-3 py-1.5 text-sm font-bold rounded-md border transition-all duration-75 ${
                subtype === sub 
                  ? 'bg-red-900/50 text-red-200 border-red-700' 
                  : 'bg-black/30 text-gray-400 border-gray-700 hover:bg-white/5 active:opacity-60'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="sheet-modal max-w-4xl max-h-[85vh] h-full animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-cinzel font-bold text-2xl text-gray-200">Inventory</h2>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Burden</span>
              <span className={`text-sm font-bold ${isOverburdened ? 'text-red-500' : 'text-gray-300'}`}>
                {currentBurden} / {maxBurden}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2 transition-all duration-75 active:opacity-60">×</button>
          </div>
        </div>

        <div className="flex gap-4 px-6 pt-2 border-b border-gray-700 shrink-0 bg-black/10">
          <button onClick={() => setMainTab('backpack')} className={`font-bold pb-2 transition-all duration-75 ${mainTab === 'backpack' ? 'text-red-400 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300 active:opacity-60'}`}>Backpack</button>
          <button onClick={() => setMainTab('possessions')} className={`font-bold pb-2 transition-all duration-75 ${mainTab === 'possessions' ? 'text-red-400 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300 active:opacity-60'}`}>Possessions</button>
          <button onClick={() => setMainTab('database')} className={`font-bold pb-2 transition-all duration-75 ${mainTab === 'database' ? 'text-red-400 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300 active:opacity-60'}`}>Add Items</button>
          <button onClick={() => setMainTab('custom')} className={`font-bold pb-2 transition-all duration-75 ${mainTab === 'custom' ? 'text-red-400 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300 active:opacity-60'}`}>Create Custom</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          
          {mainTab === 'backpack' && (
            <>
              <div className="bg-black/30 border border-gray-700 rounded-lg p-4 mb-2 shrink-0">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Currently Equipped</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Main Hand', key: 'mainHand' },
                    { label: 'Off Hand', key: 'offHand' },
                    { label: 'Armour', key: 'armour' }
                  ].map(({ label, key }) => {
                    const equippedId = char.data.equipment?.[key as keyof typeof char.data.equipment];
                    const equippedName = getItemName(equippedId || '');
                    const isExpanded = expandedEquippedSlot === key;
                    const isBlocked = key === 'offHand' && isMainHand2H;
                    const modeStr = key === 'mainHand' && char.data.equipment?.mainHandMode ? ` (${char.data.equipment.mainHandMode})` : '';

                    return (
                      <div 
                        key={key} 
                        onDragOver={(e) => !isBlocked && e.preventDefault()}
                        onDrop={(e) => !isBlocked && handleDropInModal(e, key as any)}
                        className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900' : ''} ${isBlocked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                      >
                        <div 
                          className={`flex justify-between items-center p-2.5 select-none transition-all duration-75 ${equippedId && !isBlocked ? 'cursor-pointer hover:bg-white/5 active:opacity-60' : ''}`}
                          onClick={() => equippedId && !isBlocked && setExpandedEquippedSlot(isExpanded ? null : key)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase w-20 shrink-0">{label}</span>
                            <span className={`text-sm ${equippedId && !isBlocked ? 'text-gray-200 font-bold' : 'text-gray-500 italic'}`}>
                              {isBlocked ? 'Blocked (2H Equipped)' : equippedId ? `${equippedName}${modeStr}` : '— Empty —'}
                            </span>
                          </div>
                          {equippedId && !isBlocked && <span className="text-gray-500 text-[10px]">{isExpanded ? '▲' : '▼'}</span>}
                        </div>
                        
                        {isExpanded && equippedId && !isBlocked && (
                          <div className="p-3 border-t border-gray-700 bg-black/40 text-sm">
                            {renderItemStats(equippedName, char.data.items.find((i:any) => i.id === equippedId))}
                            <button onClick={() => { unequipSlot(key as any); setExpandedEquippedSlot(null); }} className="w-full mt-3 bg-red-950/40 hover:bg-red-900/60 border border-red-900 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-red-300">
                              Unequip to Backpack
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <FilterButtons category={bpCategory} setCategory={setBpCategory} subtype={bpSubtype} setSubtype={setBpSubtype} subTypes={availableBpSubtypes} />
              {filteredBpItems.length === 0 && <p className="text-center text-gray-500 italic py-8">Backpack is empty.</p>}
              
              <div className="space-y-2">
                {filteredBpItems.map((item: any, i: number) => {
                  const itemKey = item.id || `bp-${i}`;
                  const isExpanded = expandedItem === itemKey;
                  
                  const dbItem = getEntryByName(item.name);
                  const category = dbItem?.data?.category || item.category || 'equipment';
                  const isHybrid = dbItem?.data?.req?.includes('1H/2H');
                  const is2HOnly = dbItem?.data?.req?.includes('2H') && !isHybrid;

                  return (
                    <div 
                      key={itemKey} 
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id }));
                      }}
                      className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}
                    >
                      <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-white/5 transition-all duration-75 active:opacity-60 select-none" onClick={() => setExpandedItem(isExpanded ? null : itemKey)}>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-200">{item.name} <span className="text-gray-500 font-normal ml-1">x{item.qty}</span></span>
                        </div>
                        <span className="text-gray-500 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-3 border-t border-gray-700 bg-black/40 text-sm">
                          {renderItemStats(item.name, item)}
                          
                          <div className="flex items-center justify-between bg-black/20 border border-gray-700 rounded-lg p-2 mt-3">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Quantity</span>
                            <div className="flex items-center gap-3">
                              <button onClick={(e) => { e.stopPropagation(); updateQuantity('items', item.id, -1); }} className="w-8 h-8 rounded bg-gray-800 hover:bg-red-900 text-white font-bold flex items-center justify-center border border-gray-600 transition-all duration-75 active:opacity-60">−</button>
                              <span className="font-bold text-white text-lg min-w-[20px] text-center">{item.qty}</span>
                              <button onClick={(e) => { e.stopPropagation(); updateQuantity('items', item.id, 1); }} className="w-8 h-8 rounded bg-gray-800 hover:bg-green-900 text-white font-bold flex items-center justify-center border border-gray-600 transition-all duration-75 active:opacity-60">+</button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {isHybrid ? (
                              <div className="flex gap-2 w-full">
                                <button onClick={() => equipItem('mainHand', item.id, '1H')} className="flex-1 min-w-[100px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-gray-200">Equip 1H</button>
                                <button onClick={() => equipItem('mainHand', item.id, '2H')} className="flex-1 min-w-[100px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-gray-200">Equip 2H</button>
                              </div>
                            ) : (
                              <button onClick={() => equipItem('mainHand', item.id, is2HOnly ? '2H' : '1H')} className="flex-1 min-w-[100px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-gray-200">Equip Main Hand</button>
                            )}
                            
                            <button 
                              onClick={() => equipItem('offHand', item.id, '1H')} 
                              disabled={isMainHand2H || is2HOnly}
                              title={isMainHand2H ? "Cannot equip off-hand while wielding a 2H weapon" : is2HOnly ? "2H weapons cannot go in the off-hand" : ""}
                              className={`flex-1 min-w-[100px] border text-xs font-bold py-2 rounded transition-all duration-75 ${
                                (isMainHand2H || is2HOnly) 
                                  ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed' 
                                  : 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200 active:opacity-60'
                              }`}
                            >
                              Equip Off Hand
                            </button>
                            <button 
                              onClick={() => equipItem('armour', item.id)} 
                              disabled={category !== 'armour'}
                              title={category !== 'armour' ? "Only armour can be equipped here" : ""}
                              className={`flex-1 min-w-[100px] border text-xs font-bold py-2 rounded transition-all duration-75 ${
                                category !== 'armour' 
                                  ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed' 
                                  : 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200 active:opacity-60'
                              }`}
                            >
                              Equip Armour
                            </button>
                            
                            <button onClick={() => moveItem('items', 'possessions', item.id)} className="w-full bg-blue-950/40 hover:bg-blue-900/60 border border-blue-900 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-blue-300 mt-2">Move to Possessions</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {mainTab === 'possessions' && (
            <>
              <FilterButtons category={posCategory} setCategory={setPosCategory} subtype={posSubtype} setSubtype={setPosSubtype} subTypes={availablePosSubtypes} />
              {filteredPosItems.length === 0 && <p className="text-center text-gray-500 italic py-8">No possessions stored.</p>}
              
              <div className="space-y-2">
                {filteredPosItems.map((item: any, i: number) => {
                  const itemKey = item.id || `pos-${i}`;
                  const isExpanded = expandedItem === itemKey;
                  return (
                    <div key={itemKey} className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                      <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-white/5 transition-all duration-75 active:opacity-60 select-none" onClick={() => setExpandedItem(isExpanded ? null : itemKey)}>
                        <span className="font-bold text-gray-200">{item.name}</span>
                        <span className="text-gray-500 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-3 border-t border-gray-700 bg-black/40 text-sm">
                          {renderItemStats(item.name, item)}
                          
                          <div className="flex items-center justify-between bg-black/20 border border-gray-700 rounded-lg p-2 mt-3">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Quantity</span>
                            <div className="flex items-center gap-3">
                              <button onClick={(e) => { e.stopPropagation(); updateQuantity('possessions', item.id, -1); }} className="w-8 h-8 rounded bg-gray-800 hover:bg-red-900 text-white font-bold flex items-center justify-center border border-gray-600 transition-all duration-75 active:opacity-60">−</button>
                              <span className="font-bold text-white text-lg min-w-[20px] text-center">{item.qty}</span>
                              <button onClick={(e) => { e.stopPropagation(); updateQuantity('possessions', item.id, 1); }} className="w-8 h-8 rounded bg-gray-800 hover:bg-green-900 text-white font-bold flex items-center justify-center border border-gray-600 transition-all duration-75 active:opacity-60">+</button>
                            </div>
                          </div>

                          <button onClick={() => moveItem('possessions', 'items', item.id)} className="w-full bg-green-950/40 hover:bg-green-900/60 border border-green-900 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-green-300 mt-4">Move to Backpack</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {mainTab === 'database' && (
            <>
              <input type="text" placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-3 text-gray-200 shadow-inner mb-2" />
              <FilterButtons category={dbCategory} setCategory={setDbCategory} subtype={dbSubtype} setSubtype={setDbSubtype} subTypes={availableDbSubtypes} />
              <div className="space-y-2">
                {filteredDbItems.length === 0 && <p className="text-center text-gray-500 italic py-8">No items match these filters.</p>}
                {filteredDbItems.map((item, i) => {
                  const itemKey = item.id || `db-${i}`;
                  const isExpanded = expandedItem === itemKey;
                  return (
                    <div key={itemKey} className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                      <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-white/5 transition-all duration-75 active:opacity-60 select-none" onClick={() => setExpandedItem(isExpanded ? null : itemKey)}>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-200">{item.name}</span>
                          <span className="text-[9px] text-gray-400 bg-black/40 px-1.5 py-0.5 rounded border border-gray-700 uppercase">{item.data.subtype}</span>
                        </div>
                        <span className="text-gray-500 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-3 border-t border-gray-700 bg-black/40 text-sm">
                          {renderItemStats(item.name)}
                          <button onClick={() => addToBackpack(item.name)} className="w-full mt-4 bg-red-900 hover:bg-red-800 text-white text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60">+ Add to Backpack</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {mainTab === 'custom' && (
            <div className="max-w-2xl mx-auto w-full flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {['weapon', 'armour', 'equipment', 'concoction', 'trinket'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCustomCategory(cat); setCustomSubtype(''); setCustomExtra({}); }}
                      className={`px-3 py-1.5 text-sm font-bold rounded-md border transition-all duration-75 ${
                        customCategory === cat
                          ? 'bg-red-900/50 text-red-200 border-red-700'
                          : 'bg-black/30 text-gray-400 border-gray-700 hover:bg-white/5 active:opacity-60'
                      }`}
                    >
                      {formatCategoryName(cat)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Subtype</label>
                {customCategory === 'weapon' ? (
                  <div className="flex flex-wrap gap-2">
                    {WEAPON_SUBTYPES.map(sub => (
                      <button
                        key={sub}
                        onClick={() => { setCustomSubtype(sub); setCustomExtra({}); }}
                        className={`px-3 py-1.5 text-sm font-bold rounded-md border transition-all duration-75 ${
                          customSubtype === sub
                            ? 'bg-red-900/50 text-red-200 border-red-700'
                            : 'bg-black/30 text-gray-400 border-gray-700 hover:bg-white/5 active:opacity-60'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customSubtype}
                    onChange={e => setCustomSubtype(e.target.value)}
                    className="w-full bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 text-gray-200 shadow-inner"
                    placeholder="e.g. Amulet"
                  />
                )}
              </div>

              <label className="flex flex-col text-sm font-bold text-gray-400">
                Item Name
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner"
                  placeholder="e.g. Enchanted Amulet"
                />
              </label>

              {customCategory === 'weapon' && customSubtype && WEAPON_FIELD_MAP[customSubtype] && (() => {
                const f = WEAPON_FIELD_MAP[customSubtype];
                return (
                  <div className="grid grid-cols-2 gap-3">
                    {f.req && <label className="flex flex-col text-sm font-bold text-gray-400">REQ <input type="text" value={customExtra.req || ''} onChange={e => setCustomExtra({ ...customExtra, req: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="1H REF" /></label>}
                    {f.dmg && <label className="flex flex-col text-sm font-bold text-gray-400">DMG <input type="text" value={customExtra.dmg || ''} onChange={e => setCustomExtra({ ...customExtra, dmg: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="2|2" /></label>}
                    {f.range && <label className="flex flex-col text-sm font-bold text-gray-400">Range <input type="text" value={customExtra.range || ''} onChange={e => setCustomExtra({ ...customExtra, range: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="A, C, M" /></label>}
                    {f.ammo && <label className="flex flex-col text-sm font-bold text-gray-400">Ammo <input type="text" value={customExtra.ammo || ''} onChange={e => setCustomExtra({ ...customExtra, ammo: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="Full / 1 / 2" /></label>}
                    {f.effect && <label className="flex flex-col text-sm font-bold text-gray-400">Effect <input type="text" value={customExtra.effect || ''} onChange={e => setCustomExtra({ ...customExtra, effect: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="+1 Break" /></label>}
                    {f.value && <label className="flex flex-col text-sm font-bold text-gray-400">Value <input type="number" min={0} value={customExtra.value ?? ''} onChange={e => setCustomExtra({ ...customExtra, value: +e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" /></label>}
                    {f.burden && <label className="flex flex-col text-sm font-bold text-gray-400">Burden <input type="number" min={0} value={customExtra.burden ?? 0} onChange={e => setCustomExtra({ ...customExtra, burden: +e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" /></label>}
                    {f.season && <label className="flex flex-col text-sm font-bold text-gray-400">Season <input type="text" value={customExtra.season || ''} onChange={e => setCustomExtra({ ...customExtra, season: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="Any / Vamor / Bruma / Trumst / Halice" /></label>}
                    {f.abilityAccess && <label className="flex flex-col text-sm font-bold text-gray-400">Ability Access <input type="text" value={customExtra.ability_access || ''} onChange={e => setCustomExtra({ ...customExtra, ability_access: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="Rank 1" /></label>}
                    {f.location && <label className="flex flex-col text-sm font-bold text-gray-400">Location <input type="text" value={customExtra.location || ''} onChange={e => setCustomExtra({ ...customExtra, location: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="External / Arm / 2 Limbs / 4 Limbs" /></label>}
                  </div>
                );
              })()}

              {customCategory !== 'weapon' && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col text-sm font-bold text-gray-400">Burden <input type="number" min={0} value={customExtra.burden ?? 0} onChange={e => setCustomExtra({ ...customExtra, burden: +e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" /></label>
                  <label className="flex flex-col text-sm font-bold text-gray-400">Value <input type="number" min={0} value={customExtra.value ?? ''} onChange={e => setCustomExtra({ ...customExtra, value: +e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" /></label>
                  <label className="col-span-2 flex flex-col text-sm font-bold text-gray-400">Effect <input type="text" value={customExtra.effect || ''} onChange={e => setCustomExtra({ ...customExtra, effect: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="Optional" /></label>
                </div>
              )}

              <button
                onClick={() => {
                  if (!customName.trim()) return;
                  addToBackpack(customName.trim(), {
                    category: customCategory,
                    subtype: customSubtype,
                    ...customExtra,
                    burden: customExtra.burden ?? 0,
                  }, true);
                  setCustomName(''); setCustomSubtype(''); setCustomExtra({});
                  setMainTab('backpack');
                }}
                className="mt-2 bg-red-900 hover:bg-red-800 text-white font-bold py-3 rounded-lg transition-all duration-75 active:opacity-60 shadow-sm"
              >
                Create & Add to Backpack
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}