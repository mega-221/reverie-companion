import type { CharacterData } from './types';
export const vigorMax  = (d: CharacterData) => 5 + (d.progression.tier - 1) + d.bonus.vm;
export const strainMax = (d: CharacterData) => 5 + (d.progression.tier - 1) + d.bonus.sl;
export const dpMax     = (d: CharacterData) => 2 + (d.progression.tier - 1) + d.bonus.dp;
export const evasion   = (d: CharacterData) => 10 + d.bonus.eva;

export function movementTiles(d: CharacterData) {
  const s = (d.skills.Athletics ?? 0) + d.attributes.grt + d.attributes.ref;
  if (s <= 1) return 2;
  if (s <= 4) return 3;
  if (s <= 9) return 4;
  return 5;
}

export function burdenMax(d: CharacterData) {
  const carry = d.specialSkills.find(s => s.name.toLowerCase() === 'carry')?.rank ?? 0;
  const endurance = d.skills.Endurance ?? 0;
  return 6 + d.attributes.grt + endurance + (2 * carry);
}

export const calculateBurden = (d: CharacterData, getEntryByName: (name: string) => any): number => {
  const backpackBurden = d.items.reduce((sum, item) => {
    const db = getEntryByName(item.name);
    const burden = db?.data?.burden ?? item.burden ?? 0;
    return sum + (burden * (item.qty ?? 1));
  }, 0);

  const getEqBurden = (itemId: string) => {
    if (!itemId) return 0;
    const inBackpack = d.items.find(i => i.id === itemId);
    const legacyName = !inBackpack && !itemId.includes('-') ? itemId : undefined;
    const db = inBackpack ? getEntryByName(inBackpack.name) : legacyName ? getEntryByName(legacyName) : undefined;
    const custom = inBackpack || d.possessions?.find(i => i.id === itemId);
    return db?.data?.burden ?? custom?.burden ?? 0;
  };

  const baseEquipped = (['mainHand', 'offHand', 'armour'] as const).reduce((sum, slot) => {
    return sum + getEqBurden(d.equipment?.[slot] || '');
  }, 0);

  const extraEquipped = (d.equipment?.extra || []).reduce((sum, id) => {
    return sum + getEqBurden(id);
  }, 0);

  return backpackBurden + baseEquipped + extraEquipped;
};

export function getAttributeInjuryPenalty(injuries: CharacterData['trackers']['injuries'], attribute: string): number {
  return injuries
    .filter(inj => inj.affectedAttributes.includes(attribute.toUpperCase()))
    .reduce((sum, inj) => sum + inj.severity, 0);
}