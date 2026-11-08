import type { CharacterData, CompendiumEntry } from './types';

export type EquipmentSlot = 'mainHand' | 'offHand' | 'armour';
export type WeaponMode = '1H' | '2H';

export function equipItem(
  data: CharacterData,
  slot: EquipmentSlot,
  itemId: string,
  getEntryByName: (name: string) => CompendiumEntry | undefined,
  mode?: WeaponMode
): Partial<CharacterData> | null {
  const itemToEquip = data.items.find(i => i.id === itemId);
  if (!itemToEquip || itemToEquip.qty <= 0) return null;

  const dbItem = getEntryByName(itemToEquip.name);
  const category = dbItem?.data?.category || itemToEquip.category || 'equipment';

  if (slot === 'armour' && category !== 'armour') return null;
  if (slot === 'offHand' && data.equipment.mainHandMode === '2H') return null;

  const nextEquipment: CharacterData['equipment'] = { ...data.equipment };
  let nextItems = [...data.items];

  const returnToBackpack = (id: string) => {
    const idx = nextItems.findIndex(i => i.id === id);
    if (idx >= 0) nextItems[idx] = { ...nextItems[idx], qty: nextItems[idx].qty + 1 };
  };

  if (nextEquipment[slot]) returnToBackpack(nextEquipment[slot]);

  const equipIdx = nextItems.findIndex(i => i.id === itemId);
  if (equipIdx >= 0) nextItems[equipIdx] = { ...nextItems[equipIdx], qty: nextItems[equipIdx].qty - 1 };

  nextEquipment[slot] = itemId;

  if (slot === 'mainHand') {
    const req = dbItem?.data?.req;
    const reqStr = typeof req === 'string' ? req : '';
    const isHybrid = reqStr.includes('1H/2H');
    const is2HOnly = reqStr.includes('2H') && !isHybrid;
    nextEquipment.mainHandMode = mode ?? (isHybrid ? '1H' : is2HOnly ? '2H' : '1H');

    if (nextEquipment.mainHandMode === '2H' && nextEquipment.offHand) {
      returnToBackpack(nextEquipment.offHand);
      nextEquipment.offHand = '';
    }
  }

  return { items: nextItems, equipment: nextEquipment };
}

export function unequipSlot(
  data: CharacterData,
  slot: EquipmentSlot,
  targetList: 'items' | 'possessions' = 'items'
): Partial<CharacterData> | null {
  const itemId = data.equipment[slot];
  if (!itemId) return null;

  const nextEquipment: CharacterData['equipment'] = { ...data.equipment };
  nextEquipment[slot] = '';
  if (slot === 'mainHand') nextEquipment.mainHandMode = '';

  let nextItems = [...data.items];
  let nextPossessions = [...data.possessions];

  if (targetList === 'items') {
    const idx = nextItems.findIndex(i => i.id === itemId);
    if (idx >= 0) nextItems[idx] = { ...nextItems[idx], qty: nextItems[idx].qty + 1 };
  } else {
    const itemIndex = nextItems.findIndex(i => i.id === itemId);
    if (itemIndex >= 0) {
      const item = nextItems[itemIndex];
      if (item.qty <= 0) nextItems.splice(itemIndex, 1);
      const posIdx = nextPossessions.findIndex(i => i.id === itemId);
      if (posIdx >= 0) nextPossessions[posIdx] = { ...nextPossessions[posIdx], qty: nextPossessions[posIdx].qty + 1 };
      else nextPossessions.push({ ...item, qty: 1 });
    }
  }

  return { items: nextItems, possessions: nextPossessions, equipment: nextEquipment };
}

export function equipExtraItem(
  data: CharacterData,
  slotIndex: number,
  itemId: string,
  getEntryByName: (name: string) => CompendiumEntry | undefined
): Partial<CharacterData> | null {
  const itemToEquip = data.items.find(i => i.id === itemId);
  if (!itemToEquip || itemToEquip.qty <= 0) return null;

  const dbItem = getEntryByName(itemToEquip.name);
  const req = dbItem?.data?.req || '';
  const category = dbItem?.data?.category || itemToEquip.category || 'equipment';
  const subtype = dbItem?.data?.subtype || itemToEquip.subtype || '';
  
  // Block melee weapons (but allow Eidoloscopes which are 0H)
  if (category === 'weapon' && subtype !== 'Eidoloscope' && (req.includes('1H') || req.includes('2H'))) return null;

  const nextEquipment: CharacterData['equipment'] = { ...data.equipment };
  let nextItems = [...data.items];

  if (!nextEquipment.extra) nextEquipment.extra = [];
  while (nextEquipment.extra.length <= slotIndex) nextEquipment.extra.push('');

  if (nextEquipment.extra[slotIndex]) {
    const prevId = nextEquipment.extra[slotIndex];
    const idx = nextItems.findIndex(i => i.id === prevId);
    if (idx >= 0) nextItems[idx] = { ...nextItems[idx], qty: nextItems[idx].qty + 1 };
  }

  const equipIdx = nextItems.findIndex(i => i.id === itemId);
  if (equipIdx >= 0) nextItems[equipIdx] = { ...nextItems[equipIdx], qty: nextItems[equipIdx].qty - 1 };

  nextEquipment.extra[slotIndex] = itemId;

  return { items: nextItems, equipment: nextEquipment };
}

export function unequipExtraSlot(
  data: CharacterData,
  slotIndex: number,
  targetList: 'items' | 'possessions' = 'items'
): Partial<CharacterData> | null {
  const itemId = data.equipment.extra?.[slotIndex];
  if (!itemId) return null;

  const nextEquipment: CharacterData['equipment'] = { ...data.equipment };
  if (!nextEquipment.extra) nextEquipment.extra = [];
  nextEquipment.extra[slotIndex] = '';

  let nextItems = [...data.items];
  let nextPossessions = [...data.possessions];

  if (targetList === 'items') {
    const idx = nextItems.findIndex(i => i.id === itemId);
    if (idx >= 0) nextItems[idx] = { ...nextItems[idx], qty: nextItems[idx].qty + 1 };
  } else {
    const itemIndex = nextItems.findIndex(i => i.id === itemId);
    if (itemIndex >= 0) {
      const item = nextItems[itemIndex];
      if (item.qty <= 0) nextItems.splice(itemIndex, 1);
      const posIdx = nextPossessions.findIndex(i => i.id === itemId);
      if (posIdx >= 0) nextPossessions[posIdx] = { ...nextPossessions[posIdx], qty: nextPossessions[posIdx].qty + 1 };
      else nextPossessions.push({ ...item, qty: 1 });
    }
  }

  return { items: nextItems, possessions: nextPossessions, equipment: nextEquipment };
}