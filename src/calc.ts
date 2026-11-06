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

export const currentBurden = (d: CharacterData) =>
  d.items.reduce((sum, i) => sum + (i.equipped ? i.burden * (i.qty || 1) : 0), 0);