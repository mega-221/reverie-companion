import type { CharacterData, AdvancementType, CompendiumEntry, InventoryItem } from './types';
import { ARMOUR_CATEGORY_RULES, type ArmourCategory } from './armourCatalog';

const countAdv = (d: CharacterData, type: AdvancementType) =>
  (d.progression.advancements || []).filter(a => a.type === type).length;

const countCompletedAdvPairs = (d: CharacterData, type: AdvancementType) => {
  const countsByTier = new Map<number, number>();
  for (const adv of d.progression.advancements || []) {
    if (adv.type === type) {
      countsByTier.set(adv.tier, (countsByTier.get(adv.tier) || 0) + 1);
    }
  }
  let completed = 0;
  countsByTier.forEach(cnt => {
    completed += Math.floor(cnt / 2);
  });
  return completed;
};

// Base 5 VL & 5 SL at Level 0; each tier (including Tier 1) grants +1 VL and +1 SL; each VL/SL advancement grants +1
export const vigorMax      = (d: CharacterData) => 5 + Math.max(0, d.progression.tier) + d.bonus.vm + countAdv(d, 'vl');
export const strainMax     = (d: CharacterData) => 5 + Math.max(0, d.progression.tier) + d.bonus.sl + countAdv(d, 'sl');
// Tiers 2-5 give +1 DP maximum (starting at 2); tiers beyond 5 do not grant DP maximum
export const dpMax         = (d: CharacterData) => 2 + Math.min(Math.max(0, d.progression.tier - 1), 4) + d.bonus.dp;
export const evasion       = (d: CharacterData) => 10 + d.bonus.eva + countCompletedAdvPairs(d, 'eva');
export const accuracyBonus = (d: CharacterData) => countCompletedAdvPairs(d, 'acc');
export const aspectSlotMax = (d: CharacterData) => countAdv(d, 'aspect_slot');
export const disciplineSlotMax = (d: CharacterData) => 1 + countAdv(d, 'new_discipline');
export const abilitySlotMax    = (d: CharacterData) => countAdv(d, 'discipline_ability');

export function normalizeArmourCategory(subtype?: string): ArmourCategory | '' {
  const s = (subtype || '').trim().toLowerCase();
  if (s === 'light' || s === 'light armour') return 'Light';
  if (s === 'medium' || s === 'medium armour') return 'Medium';
  if (s === 'heavy' || s === 'heavy armour') return 'Heavy';
  return '';
}

export function getArmourRequiredCarry(subtype?: string, reqStr?: string): number {
  const reqMatch = String(reqStr || '').match(/carry\s*(\d+)/i);
  if (reqMatch) return Math.max(0, parseInt(reqMatch[1], 10));
  const normalized = normalizeArmourCategory(subtype);
  if (normalized) return ARMOUR_CATEGORY_RULES[normalized].requiredCarry;
  return 0;
}

export function getCharacterCarryRank(d: CharacterData): number {
  return d.specialSkills.find(s => s.name.toLowerCase() === 'carry')?.rank ?? 0;
}

export type EquippedArmourInfo = {
  item: InventoryItem | null;
  name: string;
  category: ArmourCategory | string;
  ap: number;
  resists: string;
  requiredCarry: number;
  characterCarry: number;
  meetsCarryReq: boolean;
  stealthDisadvantage: boolean;
  armourMovementPenalty: number;
  unmetReqMovementPenalty: number;
  totalMovementPenalty: number;
  combatRollPenalty: number;
};

export function getEquippedArmourInfo(
  d: CharacterData,
  getEntryByName?: (name: string) => CompendiumEntry | undefined
): EquippedArmourInfo | null {
  const armourId = d.equipment?.armour;
  if (!armourId) return null;

  const item =
    d.items.find(i => i.id === armourId) ||
    d.possessions?.find(i => i.id === armourId) ||
    null;
  const legacyName = !item && !armourId.includes('-') ? armourId : undefined;
  const lookupName = item?.name || legacyName || '';
  const db = lookupName && getEntryByName ? getEntryByName(lookupName) : undefined;

  const rawSubtype = db?.data?.subtype || item?.subtype || '';
  const normalizedCategory = normalizeArmourCategory(rawSubtype);
  const category = normalizedCategory || rawSubtype || 'Light';
  const ap = Math.max(0, Number(db?.data?.ap ?? item?.ap ?? 0) || 0);
  const resists = String(db?.data?.resists ?? item?.resists ?? '-').trim() || '-';
  const reqStr = String(db?.data?.req ?? item?.req ?? '');
  const requiredCarry = getArmourRequiredCarry(category, reqStr);
  const characterCarry = getCharacterCarryRank(d);
  const meetsCarryReq = characterCarry >= requiredCarry;

  const rule = normalizedCategory ? ARMOUR_CATEGORY_RULES[normalizedCategory] : null;
  const stealthDisadvantage = rule?.stealthDisadvantage ?? false;
  const armourMovementPenalty = rule?.movementPenalty ?? 0;
  const unmetReqMovementPenalty = meetsCarryReq ? 0 : 1;
  const totalMovementPenalty = armourMovementPenalty + unmetReqMovementPenalty;
  const combatRollPenalty = Math.max(0, requiredCarry - characterCarry);

  return {
    item,
    name: item ? item.customName || item.name : lookupName || 'Equipped Armour',
    category,
    ap,
    resists,
    requiredCarry,
    characterCarry,
    meetsCarryReq,
    stealthDisadvantage,
    armourMovementPenalty,
    unmetReqMovementPenalty,
    totalMovementPenalty,
    combatRollPenalty,
  };
}

export function apMax(
  d: CharacterData,
  getEntryByName?: (name: string) => CompendiumEntry | undefined
): number {
  const armour = getEquippedArmourInfo(d, getEntryByName);
  return Math.max(0, (armour?.ap ?? 0) + (d.bonus?.ap ?? 0));
}

export function getArmourCombatPenalty(
  d: CharacterData,
  getEntryByName?: (name: string) => CompendiumEntry | undefined
): number {
  return getEquippedArmourInfo(d, getEntryByName)?.combatRollPenalty ?? 0;
}

export function getArmourMovementPenalty(
  d: CharacterData,
  getEntryByName?: (name: string) => CompendiumEntry | undefined
): number {
  return getEquippedArmourInfo(d, getEntryByName)?.totalMovementPenalty ?? 0;
}

export function hasStealthDisadvantageFromArmour(
  d: CharacterData,
  getEntryByName?: (name: string) => CompendiumEntry | undefined
): boolean {
  return getEquippedArmourInfo(d, getEntryByName)?.stealthDisadvantage ?? false;
}

export function getSpentAbilityPicks(
  d: CharacterData,
  getEntryByName: (name: string) => CompendiumEntry | undefined,
  originSpecialDiscs: string[] = []
): number {
  const ownedDiscs = new Set((d.disciplines || []).filter(Boolean));
  const originDiscSet = new Set(originSpecialDiscs);
  const maxAccessibleRank = Math.max(0, Math.min(4, (d.progression?.tier ?? 0) - 1));
  const usedFreeByDiscRank = new Map<string, number>();

  let spent = 0;
  for (const ab of d.abilities || []) {
    const entry = ab.name ? getEntryByName(ab.name) : undefined;
    const source = entry?.data?.source;
    const rank = Number(entry?.data?.class_rank ?? 0);

    if (source && originDiscSet.has(source)) {
      continue;
    }

    if (source && ownedDiscs.has(source)) {
      const freeQuota =
        rank === 0 ? 2 : rank >= 1 && rank <= maxAccessibleRank ? 1 : 0;
      const key = `${source}::${rank}`;
      const used = usedFreeByDiscRank.get(key) || 0;
      if (used < freeQuota) {
        usedFreeByDiscRank.set(key, used + 1);
        continue;
      }
    }

    spent += 1;
  }

  return spent;
}

export function getAvailableAbilityPicks(
  d: CharacterData,
  getEntryByName: (name: string) => CompendiumEntry | undefined,
  originSpecialDiscs: string[] = []
): number {
  return abilitySlotMax(d) - getSpentAbilityPicks(d, getEntryByName, originSpecialDiscs);
}

export function movementTiles(
  d: CharacterData,
  getEntryByName?: (name: string) => any
) {
  if (getEntryByName && isImmobilizedByBurden(d, getEntryByName)) {
    return 0;
  }
  const s = (d.skills.Athletics ?? 0) + d.attributes.grt + d.attributes.ref;
  let baseTiles = 5;
  if (s <= 1) baseTiles = 2;
  else if (s <= 4) baseTiles = 3;
  else if (s <= 9) baseTiles = 4;

  const armourPenalty = getArmourMovementPenalty(d, getEntryByName);
  return Math.max(0, baseTiles - armourPenalty);
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

export function getBurdenExcess(
  d: CharacterData,
  getEntryByName: (name: string) => any
): number {
  return Math.max(0, calculateBurden(d, getEntryByName) - burdenMax(d));
}

export function getBurdenPenalty(
  d: CharacterData,
  getEntryByName: (name: string) => any
): number {
  return getBurdenExcess(d, getEntryByName);
}

export function isImmobilizedByBurden(
  d: CharacterData,
  getEntryByName: (name: string) => any
): boolean {
  return getBurdenPenalty(d, getEntryByName) >= 10;
}

export function isAttributeAffectedByBurden(attribute: string): boolean {
  const upper = attribute.toUpperCase();
  return upper === 'GRT' || upper === 'REF';
}

export function getAttributeInjuryPenalty(injuries: CharacterData['trackers']['injuries'], attribute: string): number {
  return injuries
    .filter(inj => inj.affectedAttributes.includes(attribute.toUpperCase()))
    .reduce((sum, inj) => sum + inj.severity, 0);
}