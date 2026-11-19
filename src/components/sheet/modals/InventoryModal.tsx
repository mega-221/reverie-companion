import { useState } from 'react';
import { useCompendium } from '../../../CompendiumContext';
import {
  burdenMax,
  calculateBurden,
  getBurdenPenalty,
  getEquippedArmourInfo,
  getArmourRequiredCarry,
  getCharacterCarryRank,
  normalizeArmourCategory,
} from '../../../calc';
import { ARMOUR_SUBTYPES, ARMOUR_CATEGORY_RULES, type ArmourCategory } from '../../../armourCatalog';
import { equipItem as sharedEquipItem, unequipSlot as sharedUnequipSlot, equipExtraItem, unequipExtraSlot } from '../../../inventory';

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
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  
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
  const burdenPenalty = getBurdenPenalty(char.data, getEntryByName);
  const isOverburdened = burdenPenalty > 0;
  const isImmobilized = burdenPenalty >= 10;
  const equippedArmourInfo = getEquippedArmourInfo(char.data, getEntryByName);

  const itemsDb = entries.filter(e => e.type === 'item');
  const isMainHand2H = char.data.equipment?.mainHandMode === '2H';

  const ARMOUR_SUBTYPE_ORDER: Record<string, number> = { light: 0, medium: 1, heavy: 2 };

  const getSubtypes = (category: string, items: any[]) => {
    if (category === 'all') return [];
    const subs = Array.from(new Set(
      items
        .filter((i: any) => {
          const db = getEntryByName(i.name);
          const cat = String(db?.data?.category || i.category || 'equipment').toLowerCase();
          return cat === category;
        })
        .map((i: any) => {
          const db = getEntryByName(i.name);
          return db?.data?.subtype || i.subtype;
        })
        .filter((sub): sub is string => typeof sub === 'string' && sub.length > 0)
    ));
    if (category === 'armour') {
      return subs.sort(
        (a, b) =>
          (ARMOUR_SUBTYPE_ORDER[a.toLowerCase()] ?? 99) - (ARMOUR_SUBTYPE_ORDER[b.toLowerCase()] ?? 99) ||
          a.localeCompare(b)
      );
    }
    return subs.sort();
  };

  const availableBpSubtypes = getSubtypes(bpCategory, char.data.items);
  const availablePosSubtypes = getSubtypes(posCategory, char.data.possessions || []);
  const availableDbSubtypes = getSubtypes(dbCategory, itemsDb);

  const addToBackpack = (name: string, extraData?: any, forceUnique = false) => {
    const existing =
      !forceUnique &&
      char.data.items.find((i: any) => !i.customName && i.name === name);
    let newItems;
    if (existing) {
      newItems = char.data.items.map((i: any) => i.id === existing.id ? { ...i, qty: i.qty + 1 } : i);
    } else {
      newItems = [...char.data.items, { id: crypto.randomUUID(), name, qty: 1, ...extraData }];
    }
    patch({ items: newItems });
  };

  const commitRename = (list: 'items' | 'possessions', item: any) => {
    const trimmed = renameValue.trim();
    const arr = list === 'items' ? char.data.items : (char.data.possessions || []);
    const currentLabel = item.customName || '';

    if (trimmed === currentLabel || (!trimmed && !item.customName)) {
      setEditingItem(null);
      return;
    }

    const nextCustomName = !trimmed || trimmed === item.name ? undefined : trimmed;

    let nextArr;
    if (item.qty > 1) {
      nextArr = arr.flatMap((i: any) =>
        i.id === item.id
          ? [
              { ...i, qty: i.qty - 1 },
              { ...i, id: crypto.randomUUID(), qty: 1, customName: nextCustomName },
            ]
          : [i]
      );
    } else {
      nextArr = arr.map((i: any) =>
        i.id === item.id ? { ...i, customName: nextCustomName } : i
      );
    }

    patch(list === 'items' ? { items: nextArr } : { possessions: nextArr });
    setEditingItem(null);
  };

  const revertRename = (list: 'items' | 'possessions', item: any) => {
    const arr = list === 'items' ? char.data.items : (char.data.possessions || []);
    const nextArr =
      item.qty > 1
        ? arr.flatMap((i: any) =>
            i.id === item.id
              ? [
                  { ...i, qty: i.qty - 1 },
                  { ...i, id: crypto.randomUUID(), qty: 1, customName: undefined },
                ]
              : [i]
          )
        : arr.map((i: any) =>
            i.id === item.id ? { ...i, customName: undefined } : i
          );
    patch(list === 'items' ? { items: nextArr } : { possessions: nextArr });
  };

  const updateQuantity = (list: 'items' | 'possessions', id: string, delta: number) => {
    const arr = list === 'items' ? char.data.items : char.data.possessions;
    const item = arr.find((i: any) => i.id === id);
    if (!item) return;
    
    if (item.qty + delta <= 0) {
      const isEquipped = Object.values(char.data.equipment).includes(id) || (char.data.equipment.extra || []).includes(id);
      if (list === 'items') {
        if (isEquipped) {
          patch({ items: char.data.items.map((i: any) => i.id === id ? { ...i, qty: 0 } : i) });
        } else {
          patch({ items: char.data.items.filter((i: any) => i.id !== id) });
        }
      } else {
        patch({ possessions: char.data.possessions.filter((i: any) => i.id !== id) });
      }
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

    const isEquipped = Object.values(char.data.equipment).includes(id) || (char.data.equipment.extra || []).includes(id);
    
    let newSource = sourceArr.map((i: any) => i.id === id ? { ...i, qty: i.qty - 1 } : i);
    if (!(from === 'items' && isEquipped)) {
      newSource = newSource.filter((i: any) => i.qty > 0);
    }

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

  const unequipSlot = (slot: 'mainHand' | 'offHand' | 'armour', targetList: 'items' | 'possessions' = 'items') => {
    const result = sharedUnequipSlot(char.data, slot, targetList);
    if (result) patch(result);
  };

  const handleEquipExtra = (itemId: string) => {
    let extraArr = char.data.equipment.extra || [];
    let emptyIdx = extraArr.findIndex((id: string) => !id);
    if (emptyIdx === -1) emptyIdx = extraArr.length;
    const result = equipExtraItem(char.data, emptyIdx, itemId, getEntryByName);
    if (result) patch(result);
  };

  const handleDropInModal = (e: React.DragEvent, targetSlot: string, targetExtraIdx?: number) => {
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
          const res = sharedUnequipSlot(newData, sourceSlot);
          if (res) newData = { ...newData, ...res };
        }
      }

      if (targetSlot === 'extra' && targetExtraIdx !== undefined) {
        const res = equipExtraItem(newData, targetExtraIdx, id, getEntryByName);
        if (res) newData = { ...newData, ...res };
      } else if (targetSlot === 'mainHand' || targetSlot === 'offHand' || targetSlot === 'armour') {
        const itemObj = newData.items.find((i:any) => i.id === id);
        const dbItem = getEntryByName(itemObj?.name || '');
        const cat = String(dbItem?.data?.category || itemObj?.category || 'equipment').toLowerCase();
        const req = String(dbItem?.data?.req || '');
        const isHybrid = req.includes('1H/2H');
        const mode = isHybrid ? '1H' : undefined;
        
        if ((targetSlot === 'mainHand' || targetSlot === 'offHand') && cat === 'armour') return;
        if (targetSlot === 'armour' && cat !== 'armour') return;
        if (targetSlot === 'offHand' && req.includes('2H') && !isHybrid) return;

        const res = sharedEquipItem(newData, targetSlot as any, id, getEntryByName, mode);
        if (res) newData = { ...newData, ...res };
      }
      
      patch(newData);
    } catch (err) {}
  };

  const handleDropOnTab = (e: React.DragEvent, targetTab: 'items' | 'possessions') => {
    e.preventDefault();
    setDragOverSlot(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      
      if (data.source === 'equipment') {
        if (data.slot === 'mainHand') unequipSlot('mainHand', targetTab);
        else if (data.slot === 'offHand') unequipSlot('offHand', targetTab);
        else if (data.slot === 'armour') unequipSlot('armour', targetTab);
        else if (data.slot === 'extra') {
          const res = unequipExtraSlot(char.data, data.extraIndex, targetTab);
          if (res) patch(res);
        }
      } else if (data.source === 'items' && targetTab === 'possessions') {
         moveItem('items', 'possessions', data.id);
      } else if (data.source === 'possessions' && targetTab === 'items') {
         moveItem('possessions', 'items', data.id);
      }
    } catch (err) {}
  };

  const removeExtraSlot = (index: number) => {
    const itemId = char.data.equipment.extra?.[index];
    let newEquipment = { ...char.data.equipment };
    let newItems = [...char.data.items];

    if (itemId) {
        const idx = newItems.findIndex(i => i.id === itemId);
        if (idx >= 0) newItems[idx] = { ...newItems[idx], qty: newItems[idx].qty + 1 };
    }
    newEquipment.extra = (newEquipment.extra || []).filter((_: any, i: number) => i !== index);
    patch({ items: newItems, equipment: newEquipment });
    setExpandedEquippedSlot(null);
  };

  const getItemName = (id: string) => {
    if (!id) return '';
    const item = char.data.items.find((i: any) => i.id === id) || char.data.possessions?.find((i: any) => i.id === id);
    return item ? (item.customName || item.name) : 'Unknown Item';
  };

  const getRawItemName = (id: string) => {
    if (!id) return '';
    const item = char.data.items.find((i: any) => i.id === id) || char.data.possessions?.find((i: any) => i.id === id);
    return item ? item.name : '';
  };

  const renderItemStats = (name: string, fallbackItem?: any) => {
    const dbItem = getEntryByName(name);
    const data = dbItem?.data || fallbackItem;
    if (!data) return null;

    const isArmour = String(data.category || fallbackItem?.category || '').toLowerCase() === 'armour';
    const armourCat = isArmour ? normalizeArmourCategory(data.subtype || fallbackItem?.subtype) : '';
    const reqCarry = isArmour ? getArmourRequiredCarry(data.subtype || fallbackItem?.subtype, data.req) : 0;
    const carryRank = getCharacterCarryRank(char.data);
    const meetsCarry = carryRank >= reqCarry;
    const combatPenalty = Math.max(0, reqCarry - carryRank);
    const reqDisplay = data.req && data.req !== '-' ? data.req : isArmour && reqCarry > 0 ? `Carry ${reqCarry}` : '';
    const resistsVal = data.resists && data.resists !== '-' ? data.resists : null;
    
    const stats = [];
    if (isArmour && (armourCat || data.subtype)) stats.push({ label: 'Category', value: armourCat || data.subtype, color: 'text-gray-200' });
    if (data.ap !== undefined) stats.push({ label: 'AP', value: data.ap, color: 'text-cyan-400' });
    if (resistsVal) stats.push({ label: 'Resists', value: resistsVal, color: 'text-amber-300' });
    if (reqDisplay) stats.push({ label: 'Requires', value: reqDisplay, color: isArmour && !meetsCarry ? 'text-red-400' : 'text-gray-300' });
    if (data.dmg) stats.push({ label: 'Damage', value: data.dmg, color: 'text-red-400' });
    if (data.range) stats.push({ label: 'Range', value: data.range, color: 'text-green-400' });
    if (data.burden !== undefined) stats.push({ label: 'Burden', value: data.burden, color: 'text-blue-400' });
    if (data.value !== undefined) stats.push({ label: 'Value', value: data.value, color: 'text-yellow-400' });
    
    return (
      <>
        {fallbackItem?.customName && (
          <div className="text-[11px] text-gray-400 italic mb-2">
            Original item: <span className="text-gray-300">{fallbackItem.name}</span>
          </div>
        )}
        {stats.length > 0 && (
          <div className="flex flex-wrap justify-between gap-2 mb-3 bg-gray-900/50 p-2 rounded border border-gray-800 shadow-inner text-center mt-1">
            {stats.map((stat, idx) => (
              <div key={idx} className={`flex-1 flex flex-col items-center justify-center min-w-[60px] ${idx !== stats.length - 1 ? 'border-r border-gray-700' : ''}`}>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</span>
                <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}
        {isArmour && armourCat && (
          <div className={`text-xs px-3 py-2 rounded border mb-2 ${
            !meetsCarry
              ? 'bg-red-950/40 border-red-800/80 text-red-300'
              : 'bg-black/30 border-gray-700 text-gray-300'
          }`}>
            <div>{ARMOUR_CATEGORY_RULES[armourCat].summary}</div>
            {!meetsCarry && (
              <div className="font-bold text-red-400 mt-1">
                Carry {reqCarry} unmet ({carryRank}/{reqCarry}): -{combatPenalty} combat rolls, -1 tile movement.
              </div>
            )}
          </div>
        )}
        {data.effect && data.effect !== '-' && !data.effect.startsWith('Resists ') && (
          <div className="text-sm italic text-gray-200 border-l-2 border-gray-700 pl-3 mt-2 mb-2">
            {data.effect}
          </div>
        )}
      </>
    );
  };

  const sortArmourItems = <T extends { name: string; subtype?: string; data?: any }>(list: T[]) =>
    [...list].sort((a, b) => {
      const dbA = a.data ? a : getEntryByName(a.name);
      const dbB = b.data ? b : getEntryByName(b.name);
      const subA = String(dbA?.data?.subtype || a.subtype || '').toLowerCase();
      const subB = String(dbB?.data?.subtype || b.subtype || '').toLowerCase();
      return (ARMOUR_SUBTYPE_ORDER[subA] ?? 99) - (ARMOUR_SUBTYPE_ORDER[subB] ?? 99);
    });

  const rawFilteredBpItems = char.data.items.filter((item: any) => {
    if (item.qty <= 0) return false;
    const db = getEntryByName(item.name);
    const cat = String(db?.data?.category || item.category || 'equipment').toLowerCase();
    const sub = db?.data?.subtype || item.subtype || '';
    if (bpCategory !== 'all' && cat !== bpCategory) return false;
    if (bpSubtype !== 'all' && sub !== bpSubtype) return false;
    return true;
  });
  const filteredBpItems = bpCategory === 'armour' ? sortArmourItems(rawFilteredBpItems) : rawFilteredBpItems;

  const rawFilteredPosItems = (char.data.possessions || []).filter((item: any) => {
    const db = getEntryByName(item.name);
    const cat = String(db?.data?.category || item.category || 'equipment').toLowerCase();
    const sub = db?.data?.subtype || item.subtype || '';
    if (posCategory !== 'all' && cat !== posCategory) return false;
    if (posSubtype !== 'all' && sub !== posSubtype) return false;
    return true;
  });
  const filteredPosItems = posCategory === 'armour' ? sortArmourItems(rawFilteredPosItems) : rawFilteredPosItems;

  const rawFilteredDbItems = itemsDb.filter(item => {
    const cat = String(item.data.category || '').toLowerCase();
    if (dbCategory !== 'all' && cat !== dbCategory) return false;
    if (dbSubtype !== 'all' && item.data.subtype !== dbSubtype) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const filteredDbItems = dbCategory === 'armour' ? sortArmourItems(rawFilteredDbItems) : rawFilteredDbItems;

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
              <span className={`text-sm font-bold ${isOverburdened || currentBurden < 0 ? 'text-red-500' : 'text-gray-300'}`}>
                {currentBurden} / {maxBurden}
              </span>
              {isOverburdened && (
                <span className="text-[10px] font-bold text-red-400">
                  -{burdenPenalty} GRT/REF/Combat{isImmobilized ? ' • Immobilized' : ''}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2 transition-all duration-75 active:opacity-60">×</button>
          </div>
        </div>

        <div className="border-b border-gray-700 shrink-0 bg-black/10 overflow-x-auto">
          <div className="flex items-center gap-3 px-6 pt-2 h-[46px] min-w-max">
            <button 
              onClick={() => setMainTab('backpack')} 
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDragOverSlot('tab-backpack')}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverSlot(null); }}
              onDrop={(e) => handleDropOnTab(e, 'items')}
              className="relative inline-flex outline-none h-full items-center"
            >
              <span className={`px-4 py-1.5 rounded-md font-bold transition-all duration-75 pointer-events-none ${mainTab === 'backpack' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'} ${dragOverSlot === 'tab-backpack' ? 'bg-red-900/60 ring-2 ring-red-500 text-red-200' : ''}`}>
                Backpack
              </span>
              {mainTab === 'backpack' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>

            <button 
              onClick={() => setMainTab('possessions')} 
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDragOverSlot('tab-possessions')}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverSlot(null); }}
              onDrop={(e) => handleDropOnTab(e, 'possessions')}
              className="relative inline-flex outline-none h-full items-center"
            >
              <span className={`px-4 py-1.5 rounded-md font-bold transition-all duration-75 pointer-events-none ${mainTab === 'possessions' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'} ${dragOverSlot === 'tab-possessions' ? 'bg-red-900/60 ring-2 ring-red-500 text-red-200' : ''}`}>
                Possessions
              </span>
              {mainTab === 'possessions' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>

            <div className="w-px h-6 bg-gray-600 mx-2 self-center" />

            <button 
              onClick={() => setMainTab('database')} 
              className="relative inline-flex outline-none h-full items-center"
            >
              <span className={`px-4 py-1.5 rounded-md font-bold transition-all duration-75 pointer-events-none ${mainTab === 'database' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}>
                Add Items
              </span>
              {mainTab === 'database' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>

            <button 
              onClick={() => setMainTab('custom')} 
              className="relative inline-flex outline-none h-full items-center"
            >
              <span className={`px-4 py-1.5 rounded-md font-bold transition-all duration-75 pointer-events-none ${mainTab === 'custom' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}>
                Create Custom
              </span>
              {mainTab === 'custom' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
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
                    const equippedId = char.data.equipment?.[key as keyof typeof char.data.equipment] as string;
                    const equippedName = getItemName(equippedId);
                    const rawEquippedName = getRawItemName(equippedId);
                    const isExpanded = expandedEquippedSlot === key;
                    const isBlocked = key === 'offHand' && isMainHand2H;
                    const isArmourWarning = key === 'armour' && Boolean(equippedArmourInfo && !equippedArmourInfo.meetsCarryReq);

                    return (
                      <div 
                        key={key} 
                        onDragEnter={() => !isBlocked && setDragOverSlot(key)}
                        onDragLeave={() => setDragOverSlot(null)}
                        onDragOver={(e) => { e.preventDefault(); if (!isBlocked) setDragOverSlot(key); }}
                        onDrop={(e) => !isBlocked && handleDropInModal(e, key)}
                        className={`bg-black/20 border rounded-lg overflow-hidden transition-all duration-200 ${
                          isArmourWarning ? 'border-red-800/80' : 'border-gray-700'
                        } ${isExpanded ? 'ring-1 ring-red-900' : ''} ${isBlocked ? 'opacity-50 grayscale cursor-not-allowed' : ''} ${dragOverSlot === key ? 'ring-2 ring-red-500 bg-white/10' : ''}`}
                        draggable={!!equippedId && !isBlocked}
                        onDragStart={(e) => {
                          if (equippedId && !isBlocked) {
                            e.dataTransfer.setData('application/json', JSON.stringify({ id: equippedId, source: 'equipment', slot: key }));
                          }
                        }}
                      >
                        <div 
                          className={`flex justify-between items-center p-2.5 select-none transition-all duration-75 ${equippedId && !isBlocked ? 'cursor-pointer hover:bg-white/5 active:opacity-60' : ''}`}
                          onClick={() => equippedId && !isBlocked && setExpandedEquippedSlot(isExpanded ? null : key)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-bold text-gray-500 uppercase w-20 shrink-0">{label}</span>
                            <span className={`text-sm truncate ${equippedId && !isBlocked ? 'text-gray-200 font-bold' : 'text-gray-500 italic'}`}>
                              {isBlocked ? 'Blocked (2H Equipped)' : equippedId ? equippedName : '— Empty —'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {key === 'armour' && equippedArmourInfo && (
                              <>
                                {!equippedArmourInfo.meetsCarryReq && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-950/70 border border-red-800 text-red-300">
                                    Carry {equippedArmourInfo.requiredCarry} Req
                                  </span>
                                )}
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/80 text-cyan-300">
                                  AP {equippedArmourInfo.ap}
                                </span>
                              </>
                            )}
                            {equippedId && !isBlocked && <span className="text-gray-500 text-[10px]">{isExpanded ? '▲' : '▼'}</span>}
                          </div>
                        </div>
                        
                        {isExpanded && equippedId && !isBlocked && (
                          <div className="p-3 border-t border-gray-700 bg-black/40 text-sm">
                            {renderItemStats(rawEquippedName, char.data.items.find((i:any) => i.id === equippedId))}
                            <button onClick={() => { unequipSlot(key as any); setExpandedEquippedSlot(null); }} className="w-full mt-3 bg-red-950/40 hover:bg-red-900/60 border border-red-900 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-red-300">
                              Unequip to Backpack
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(char.data.equipment.extra || []).map((extraId: string, idx: number) => {
                    const key = `extra-${idx}`;
                    const equippedName = getItemName(extraId);
                    const rawEquippedName = getRawItemName(extraId);
                    const isExpanded = expandedEquippedSlot === key;
                    return (
                      <div 
                        key={key} 
                        onDragEnter={() => setDragOverSlot(key)}
                        onDragLeave={() => setDragOverSlot(null)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverSlot(key); }}
                        onDrop={(e) => handleDropInModal(e, 'extra', idx)}
                        className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900' : ''} ${dragOverSlot === key ? 'ring-2 ring-red-500 bg-white/10' : ''}`}
                        draggable={!!extraId}
                        onDragStart={(e) => {
                          if (extraId) {
                            e.dataTransfer.setData('application/json', JSON.stringify({ id: extraId, source: 'equipment', slot: 'extra', extraIndex: idx }));
                          }
                        }}
                      >
                        <div 
                          className={`flex justify-between items-center p-2.5 select-none transition-all duration-75 ${extraId ? 'cursor-pointer hover:bg-white/5 active:opacity-60' : ''}`}
                          onClick={() => extraId && setExpandedEquippedSlot(isExpanded ? null : key)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase w-20 shrink-0">Equipment {idx + 1}</span>
                            <span className={`text-sm ${extraId ? 'text-gray-200 font-bold' : 'text-gray-500 italic'}`}>
                              {extraId ? equippedName : '— Empty —'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {extraId && <span className="text-gray-500 text-[10px]">{isExpanded ? '▲' : '▼'}</span>}
                            <button onClick={(e) => { e.stopPropagation(); removeExtraSlot(idx); }} className="text-red-500 font-bold px-1 hover:text-red-400">×</button>
                          </div>
                        </div>
                        
                        {isExpanded && extraId && (
                          <div className="p-3 border-t border-gray-700 bg-black/40 text-sm">
                            {renderItemStats(rawEquippedName, char.data.items.find((i:any) => i.id === extraId))}
                            <button onClick={() => { 
                                const result = unequipExtraSlot(char.data, idx); 
                                if (result) patch(result); 
                                setExpandedEquippedSlot(null); 
                            }} className="w-full mt-3 bg-red-950/40 hover:bg-red-900/60 border border-red-900 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-red-300">
                              Unequip to Backpack
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button 
                    onClick={() => patch({ equipment: { ...char.data.equipment, extra: [...(char.data.equipment.extra || []), ''] } })} 
                    className="border border-dashed border-gray-600 px-3 py-2 text-xs rounded-lg hover:bg-white/5 text-gray-400 font-medium transition-colors mt-1"
                  >
                    + Add Equipment Slot
                  </button>
                </div>
              </div>

              <FilterButtons category={bpCategory} setCategory={setBpCategory} subtype={bpSubtype} setSubtype={setBpSubtype} subTypes={availableBpSubtypes} />
              {filteredBpItems.length === 0 && <p className="text-center text-gray-500 italic py-8">Backpack is empty.</p>}
              
              <div 
                className={`space-y-2 flex-1 min-h-[100px] p-2 rounded-lg transition-all ${dragOverSlot === 'items-container' ? 'bg-white/5 ring-2 ring-red-500 ring-inset' : ''}`}
                onDragEnter={() => setDragOverSlot('items-container')}
                onDragLeave={() => setDragOverSlot(null)}
                onDragOver={(e) => { e.preventDefault(); setDragOverSlot('items-container'); }}
                onDrop={(e) => handleDropOnTab(e, 'items')}
              >
                {filteredBpItems.map((item: any, i: number) => {
                  const itemKey = item.id || `bp-${i}`;
                  const isExpanded = expandedItem === itemKey;
                  const isEditing = editingItem === itemKey;
                  
                  const dbItem = getEntryByName(item.name);
                  const category = String(dbItem?.data?.category || item.category || 'equipment').toLowerCase();
                  const subtype = dbItem?.data?.subtype || item.subtype || '';
                  const req = String(dbItem?.data?.req || '');
                  const isHybrid = req.includes('1H/2H');
                  const is2HOnly = req.includes('2H') && !isHybrid;
                  const isWeaponOrArmour = category === 'weapon' || category === 'armour';
                  const isEidoloscope = category === 'weapon' && subtype === 'Eidoloscope';

                  return (
                    <div 
                      key={itemKey} 
                      draggable={!isEditing}
                      onDragStart={(e) => {
                        if (!isEditing) e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, source: 'items' }));
                      }}
                      className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}
                    >
                      <div className="flex justify-between items-center px-3 h-12 hover:bg-white/5 transition-all duration-75 select-none">
                        <div className="flex items-center flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                              <input 
                                type="text" 
                                value={renameValue} 
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitRename('items', item);
                                  if (e.key === 'Escape') setEditingItem(null);
                                }}
                                className="flex-1 bg-black/40 border border-gray-700 rounded px-2 h-7 text-sm text-gray-200 focus:outline-none focus:border-red-500"
                                placeholder={item.name}
                                autoFocus
                              />
                              <button type="button" onClick={() => commitRename('items', item)} className="text-xs bg-gray-800 px-2.5 h-7 rounded border border-gray-600 hover:bg-gray-700">Done</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 cursor-pointer w-full min-w-0" onClick={() => setExpandedItem(isExpanded ? null : itemKey)}>
                              <span className="font-bold text-gray-200 truncate">{item.customName || item.name}</span>
                              {item.customName && (
                                <span className="text-[11px] text-gray-500 italic truncate shrink">({item.name})</span>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); setEditingItem(itemKey); setRenameValue(item.customName || ''); }} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0" title="Rename single item">
                                ✎
                              </button>
                              {item.customName && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    revertRename('items', item);
                                  }}
                                  className="text-[10px] text-red-400 hover:text-red-300 underline shrink-0"
                                  title="Revert to original name"
                                >
                                  Revert
                                </button>
                              )}
                              <div className="flex items-center bg-black/40 border border-gray-700 rounded-md overflow-hidden ml-1 shrink-0" onClick={e => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); updateQuantity('items', item.id, -1); }} className="px-2 py-0.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">−</button>
                                <span className="px-2 py-0.5 text-xs font-bold text-gray-200 min-w-[20px] text-center">{item.qty}</span>
                                <button onClick={(e) => { e.stopPropagation(); updateQuantity('items', item.id, 1); }} className="px-2 py-0.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">+</button>
                              </div>
                            </div>
                          )}
                        </div>
                        {!isEditing && <span className="text-gray-500 text-[10px] ml-2 cursor-pointer shrink-0" onClick={() => setExpandedItem(isExpanded ? null : itemKey)}>{isExpanded ? '▲' : '▼'}</span>}
                      </div>
                      
                      {isExpanded && !isEditing && (
                        <div className="p-3 border-t border-gray-700 bg-black/40 text-sm">
                          {renderItemStats(item.name, item)}

                          <div className="flex flex-wrap gap-2 mt-4">
                            {!isWeaponOrArmour || isEidoloscope ? (
                              <button onClick={() => handleEquipExtra(item.id)} className="flex-1 min-w-[100px] bg-green-900/40 hover:bg-green-800/60 border border-green-700 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-green-300">Equip</button>
                            ) : category === 'armour' ? (
                              <button
                                onClick={() => equipItem('armour', item.id)}
                                className="flex-1 min-w-[100px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xs font-bold py-2 rounded transition-all duration-75 active:opacity-60 text-gray-200"
                              >
                                Equip Armour
                              </button>
                            ) : (
                              <>
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
                              </>
                            )}
                            
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
              
              <div 
                className={`space-y-2 flex-1 min-h-[100px] p-2 rounded-lg transition-all ${dragOverSlot === 'pos-container' ? 'bg-white/5 ring-2 ring-red-500 ring-inset' : ''}`}
                onDragEnter={() => setDragOverSlot('pos-container')}
                onDragLeave={() => setDragOverSlot(null)}
                onDragOver={(e) => { e.preventDefault(); setDragOverSlot('pos-container'); }}
                onDrop={(e) => handleDropOnTab(e, 'possessions')}
              >
                {filteredPosItems.map((item: any, i: number) => {
                  const itemKey = item.id || `pos-${i}`;
                  const isExpanded = expandedItem === itemKey;
                  const isEditing = editingItem === itemKey;
                  
                  return (
                    <div 
                      key={itemKey} 
                      draggable={!isEditing}
                      onDragStart={(e) => {
                        if (!isEditing) e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, source: 'possessions' }));
                      }}
                      className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}
                    >
                      <div className="flex justify-between items-center px-3 h-12 hover:bg-white/5 transition-all duration-75 select-none">
                        <div className="flex items-center flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                              <input 
                                type="text" 
                                value={renameValue} 
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitRename('possessions', item);
                                  if (e.key === 'Escape') setEditingItem(null);
                                }}
                                className="flex-1 bg-black/40 border border-gray-700 rounded px-2 h-7 text-sm text-gray-200 focus:outline-none focus:border-red-500"
                                placeholder={item.name}
                                autoFocus
                              />
                              <button type="button" onClick={() => commitRename('possessions', item)} className="text-xs bg-gray-800 px-2.5 h-7 rounded border border-gray-600 hover:bg-gray-700">Done</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 cursor-pointer w-full min-w-0" onClick={() => setExpandedItem(isExpanded ? null : itemKey)}>
                              <span className="font-bold text-gray-200 truncate">{item.customName || item.name}</span>
                              {item.customName && (
                                <span className="text-[11px] text-gray-500 italic truncate shrink">({item.name})</span>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); setEditingItem(itemKey); setRenameValue(item.customName || ''); }} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0" title="Rename single item">
                                ✎
                              </button>
                              {item.customName && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    revertRename('possessions', item);
                                  }}
                                  className="text-[10px] text-red-400 hover:text-red-300 underline shrink-0"
                                  title="Revert to original name"
                                >
                                  Revert
                                </button>
                              )}
                              <div className="flex items-center bg-black/40 border border-gray-700 rounded-md overflow-hidden ml-1 shrink-0" onClick={e => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); updateQuantity('possessions', item.id, -1); }} className="px-2 py-0.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">−</button>
                                <span className="px-2 py-0.5 text-xs font-bold text-gray-200 min-w-[20px] text-center">{item.qty}</span>
                                <button onClick={(e) => { e.stopPropagation(); updateQuantity('possessions', item.id, 1); }} className="px-2 py-0.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">+</button>
                              </div>
                            </div>
                          )}
                        </div>
                        {!isEditing && <span className="text-gray-500 text-[10px] ml-2 cursor-pointer shrink-0" onClick={() => setExpandedItem(isExpanded ? null : itemKey)}>{isExpanded ? '▲' : '▼'}</span>}
                      </div>
                      
                      {isExpanded && !isEditing && (
                        <div className="p-3 border-t border-gray-700 bg-black/40 text-sm">
                          {renderItemStats(item.name, item)}
                          
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
                      <div className="flex justify-between items-center px-3 h-12 cursor-pointer hover:bg-white/5 transition-all duration-75 active:opacity-60 select-none" onClick={() => setExpandedItem(isExpanded ? null : itemKey)}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-bold text-gray-200 truncate">{item.name}</span>
                          {item.data.subtype && (
                            <span className="text-[9px] text-gray-400 bg-black/40 px-1.5 py-0.5 rounded border border-gray-700 uppercase shrink-0">{item.data.subtype}</span>
                          )}
                          {String(item.data.category || '').toLowerCase() === 'armour' && item.data.ap !== undefined && (
                            <span className="text-[9px] text-cyan-300 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/70 uppercase font-bold shrink-0">AP {item.data.ap}</span>
                          )}
                        </div>
                        <span className="text-gray-500 text-[10px] shrink-0">{isExpanded ? '▲' : '▼'}</span>
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
                      onClick={() => {
                        setCustomCategory(cat);
                        setCustomSubtype(cat === 'armour' ? 'Light' : '');
                        setCustomExtra({});
                      }}
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
                ) : customCategory === 'armour' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {ARMOUR_SUBTYPES.map(sub => (
                        <button
                          key={sub}
                          onClick={() => setCustomSubtype(sub)}
                          className={`px-3 py-1.5 text-sm font-bold rounded-md border transition-all duration-75 ${
                            (customSubtype || 'Light') === sub
                              ? 'bg-red-900/50 text-red-200 border-red-700'
                              : 'bg-black/30 text-gray-400 border-gray-700 hover:bg-white/5 active:opacity-60'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 italic">
                      {ARMOUR_CATEGORY_RULES[(customSubtype as ArmourCategory) || 'Light'].summary}
                    </p>
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
                  placeholder={customCategory === 'armour' ? 'e.g. Brigandine Coat' : 'e.g. Enchanted Amulet'}
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

              {customCategory === 'armour' && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col text-sm font-bold text-gray-400">AP <input type="number" min={0} value={customExtra.ap ?? 1} onChange={e => setCustomExtra({ ...customExtra, ap: +e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" /></label>
                  <label className="flex flex-col text-sm font-bold text-gray-400">Resists <input type="text" value={customExtra.resists || ''} onChange={e => setCustomExtra({ ...customExtra, resists: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="e.g. Pierce 1" /></label>
                  <label className="flex flex-col text-sm font-bold text-gray-400">Burden <input type="number" min={0} value={customExtra.burden ?? 1} onChange={e => setCustomExtra({ ...customExtra, burden: +e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" /></label>
                  <label className="flex flex-col text-sm font-bold text-gray-400">Value <input type="number" min={0} value={customExtra.value ?? ''} onChange={e => setCustomExtra({ ...customExtra, value: +e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" /></label>
                  <label className="col-span-2 flex flex-col text-sm font-bold text-gray-400">Effect <input type="text" value={customExtra.effect || ''} onChange={e => setCustomExtra({ ...customExtra, effect: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="Optional" /></label>
                </div>
              )}

              {customCategory !== 'weapon' && customCategory !== 'armour' && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col text-sm font-bold text-gray-400">Burden <input type="number" min={0} value={customExtra.burden ?? 0} onChange={e => setCustomExtra({ ...customExtra, burden: +e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" /></label>
                  <label className="flex flex-col text-sm font-bold text-gray-400">Value <input type="number" min={0} value={customExtra.value ?? ''} onChange={e => setCustomExtra({ ...customExtra, value: +e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" /></label>
                  <label className="col-span-2 flex flex-col text-sm font-bold text-gray-400">Effect <input type="text" value={customExtra.effect || ''} onChange={e => setCustomExtra({ ...customExtra, effect: e.target.value })} className="bg-black/40 border border-gray-700 focus:border-red-500 focus:outline-none rounded-lg p-2 mt-1 text-gray-200 shadow-inner" placeholder="Optional" /></label>
                </div>
              )}

              <button
                onClick={() => {
                  if (!customName.trim()) return;
                  const resolvedSubtype = customCategory === 'armour' ? (customSubtype || 'Light') : customSubtype;
                  const resolvedReq =
                    customCategory === 'armour'
                      ? resolvedSubtype === 'Heavy'
                        ? 'Carry 6'
                        : resolvedSubtype === 'Medium'
                        ? 'Carry 3'
                        : '-'
                      : customExtra.req;
                  addToBackpack(customName.trim(), {
                    category: customCategory,
                    subtype: resolvedSubtype,
                    ...customExtra,
                    ...(customCategory === 'armour'
                      ? {
                          ap: customExtra.ap ?? 1,
                          resists: customExtra.resists?.trim() || '-',
                          req: resolvedReq,
                          burden: customExtra.burden ?? 1,
                        }
                      : {
                          burden: customExtra.burden ?? 0,
                        }),
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