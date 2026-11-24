import type {
  Character,
  CombatAbility,
  Combatant,
  CombatantSide,
  CombatEquipmentItem,
  CombatStatusKey,
  CompendiumEntry,
  CustomNpc,
} from '../types';
import {
  accuracyBonus,
  apMax,
  dpMax,
  evasion,
  getArmourCombatPenalty,
  getBurdenPenalty,
  getEquippedArmourInfo,
  movementTiles,
  strainMax,
  vigorMax,
} from '../calc';
import { safeCharacterData } from './characterSync';

export type StatusMeta = {
  key: CombatStatusKey;
  label: string;
  hasStacks: boolean;
  defaultStacks?: number;
  summary: string;
};

export const COMBAT_STATUS_CATALOG: StatusMeta[] = [
  { key: 'bleeding', label: 'Bleeding', hasStacks: true, defaultStacks: 1, summary: 'Lose X Vigor at the start of turn or per minute. Unbroken medium/heavy armour or shield grants immunity.' },
  { key: 'burn', label: 'Burn', hasStacks: true, defaultStacks: 1, summary: 'Lose X Vigor at the start of turn (reduced by 1 when it deals damage, +2 DMG if unarmoured).' },
  { key: 'soulburn', label: 'Soulburn', hasStacks: true, defaultStacks: 1, summary: 'Lose X Vigor at start of turn; does not fade naturally. At 0 VG, becomes Burn 1.' },
  { key: 'stun', label: 'Stun', hasStacks: true, defaultStacks: 1, summary: '-X on combat rolls. Reduced by 1 at end of turn or 2 on defensive action.' },
  { key: 'fractured', label: 'Fractured', hasStacks: true, defaultStacks: 1, summary: 'Abilities cost +1 ACP to perform.' },
  { key: 'feeble', label: 'Feeble', hasStacks: true, defaultStacks: 1, summary: 'Deals -X DMG during next turn.' },
  { key: 'blind', label: 'Blind', hasStacks: true, defaultStacks: 1, summary: '-8 ACC on all ranged attacks and abilities for X turns.' },
  { key: 'immobilized', label: 'Immobilized', hasStacks: true, defaultStacks: 1, summary: 'Unable to move for X turns.' },
  { key: 'prone', label: 'Prone', hasStacks: false, summary: 'Loses reaction this turn; loses 2 ACP and movement action at start of next turn.' },
  { key: 'unaware', label: 'Unaware', hasStacks: false, summary: 'Target has 0 EVA.' },
  { key: 'stealth', label: 'Stealth', hasStacks: false, summary: 'Other creatures are Unaware of you until you enter line of sight or attack.' },
  { key: 'taunt', label: 'Taunted', hasStacks: false, summary: '-2 ACC on attacks not targeting the taunter.' },
  { key: 'intimidate', label: 'Intimidated', hasStacks: false, summary: '-2 ACC on attacks targeting the intimidator.' },
  { key: 'pierce', label: 'Pierce', hasStacks: true, defaultStacks: 1, summary: 'Attack trait: bypasses up to X AP on hit.' },
  { key: 'break', label: 'Break', hasStacks: true, defaultStacks: 1, summary: 'Attack trait: depletes up to X AP on hit.' },
];

export function parseSignedMod(raw?: string | number | null): number {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.trunc(raw) : 0;
  const s = String(raw).trim();
  if (!s || s === '-' || s.toLowerCase() === 'none') return 0;
  const match = s.match(/[+-]?\d+/);
  if (!match) return 0;
  const val = Number.parseInt(match[0], 10);
  return Number.isFinite(val) ? val : 0;
}

export function parseWeaponDamage(dmgStr?: string | number | null, mode: '1H' | '2H' = '1H'): number {
  if (dmgStr === undefined || dmgStr === null) return 0;
  if (typeof dmgStr === 'number') return Number.isFinite(dmgStr) ? Math.max(0, Math.trunc(dmgStr)) : 0;
  const raw = String(dmgStr).trim();
  if (!raw || raw === '-' || raw === '—') return 0;

  // Patterns like "1H 3 / 2H 4" or "1H: 3, 2H: 5"
  const tagged1H = raw.match(/1H\s*[:\-]?\s*(\d+)/i);
  const tagged2H = raw.match(/2H\s*[:\-]?\s*(\d+)/i);
  if (tagged1H || tagged2H) {
    if (mode === '2H' && tagged2H) return Number.parseInt(tagged2H[1], 10);
    if (mode === '1H' && tagged1H) return Number.parseInt(tagged1H[1], 10);
    return Number.parseInt((tagged1H || tagged2H)![1], 10);
  }

  // Patterns like "3/4" or "3 | 4"
  const splitMatch = raw.match(/^(\d+)\s*[\/|]\s*(\d+)$/);
  if (splitMatch) {
    return Number.parseInt(mode === '2H' ? splitMatch[2] : splitMatch[1], 10);
  }

  const numMatch = raw.match(/\d+/);
  return numMatch ? Number.parseInt(numMatch[0], 10) : 0;
}

export function extractKeywordTraitValue(text: string | undefined, keyword: 'pierce' | 'break'): number {
  if (!text) return 0;
  const regex = new RegExp(`\\b${keyword}\\s+(\\d+)`, 'gi');
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const val = Number.parseInt(match[1], 10);
    if (Number.isFinite(val)) total += val;
  }
  return total;
}

export function parseAbilityAcpCost(speed?: string, hasFractured?: boolean): { acp: number; isReaction: boolean } {
  const baseSpeed = String(speed || '').split('/')[0].trim();
  if (baseSpeed === '<') return { acp: 0, isReaction: true };
  let baseAcp = 0;
  if (baseSpeed === '>>>') baseAcp = 3;
  else if (baseSpeed === '>>') baseAcp = 2;
  else if (baseSpeed === '>') baseAcp = 1;
  else if (baseSpeed === '|') baseAcp = 0;
  else return { acp: 0, isReaction: false };

  return {
    acp: baseAcp > 0 && hasFractured ? baseAcp + 1 : baseAcp,
    isReaction: false,
  };
}

export function getStatusStacks(combatant: Combatant, key: CombatStatusKey): number {
  const found = combatant.statuses.find((s) => s.key === key);
  if (!found) return 0;
  return found.stacks ?? 1;
}

export function getEffectiveEva(combatant: Combatant): number {
  if (combatant.statuses.some((s) => s.key === 'unaware')) return 0;
  return Math.max(0, combatant.eva);
}

function resolvePcEquipment(
  char: Character,
  getEntryByName: (name: string) => CompendiumEntry | undefined
): CombatEquipmentItem[] {
  const data = safeCharacterData(char.data);
  const eq = data.equipment;
  const results: CombatEquipmentItem[] = [];

  const lookupItem = (itemId: string) => {
    if (!itemId) return null;
    const inv = data.items.find((i) => i.id === itemId) || data.possessions?.find((i) => i.id === itemId);
    const legacyName = !inv && !itemId.includes('-') ? itemId : undefined;
    const name = inv?.customName || inv?.name || legacyName || '';
    if (!name) return null;
    const db = getEntryByName(inv?.name || name);
    return {
      id: inv?.id || itemId,
      name,
      category: db?.data?.category || inv?.category || '',
      subtype: db?.data?.subtype || inv?.subtype || '',
      dmg: db?.data?.dmg ?? inv?.dmg ?? '',
      range: db?.data?.range ?? inv?.range ?? '',
      ap: db?.data?.ap ?? inv?.ap ?? 0,
      effect: db?.data?.effect || db?.data?.description || inv?.effect || inv?.description || '',
    };
  };

  const main = lookupItem(eq.mainHand);
  if (main) results.push({ ...main, slot: 'mainHand' });
  const off = lookupItem(eq.offHand);
  if (off) results.push({ ...off, slot: 'offHand' });
  const armour = lookupItem(eq.armour);
  if (armour) results.push({ ...armour, slot: 'armour' });
  for (const extraId of eq.extra || []) {
    const ext = lookupItem(extraId);
    if (ext) results.push({ ...ext, slot: 'extra' });
  }

  return results;
}

export function buildCombatantFromCharacter(
  char: Character,
  side: CombatantSide,
  getEntryByName: (name: string) => CompendiumEntry | undefined,
  getAbilities: () => CompendiumEntry[]
): Combatant {
  const data = safeCharacterData(char.data);
  const tier = Math.max(0, data.progression.tier ?? 0);
  const classRank = Math.max(0, Math.min(4, tier - 1));
  const armourInfo = getEquippedArmourInfo(data, getEntryByName);
  const burdenPenalty = getBurdenPenalty(data, getEntryByName);
  const armourCombatPenalty = getArmourCombatPenalty(data, getEntryByName);
  const rawVigor = data.trackers.vigor ?? vigorMax(data);
  const vMax = vigorMax(data);
  const overflowTmv = Math.max(0, rawVigor - vMax);

  const equipmentList = resolvePcEquipment(char, getEntryByName);
  const offhandWeapon = equipmentList.find((e) => e.slot === 'offHand' && e.category?.toLowerCase() === 'weapon');
  const offhandEvaBonus = offhandWeapon ? 1 : 0;

  const basicOrder = ['Cautious Attack', 'Reckless Attack', 'Dodge', 'Brace', 'Reload/Switch', 'Dash', 'Interact/Consumable'];
  const allAbs = getAbilities();

  const basicAbs: CombatAbility[] = allAbs
    .filter((a) => a.data.source === 'Basic')
    .sort((a, b) => (basicOrder.indexOf(a.name) === -1 ? 99 : basicOrder.indexOf(a.name)) - (basicOrder.indexOf(b.name) === -1 ? 99 : basicOrder.indexOf(b.name)))
    .map((a) => ({
      id: `basic-${a.id}`,
      name: a.name,
      sourceKind: 'basic',
      type: (a.data.type as any) || 'utility',
      speed: a.data.speed || '',
      upkeep: a.data.upkeep || '',
      range: a.data.range || '',
      requirement: a.data.requirement || '',
      snCost: Number(a.data.sn_cost ?? 0) || 0,
      acc: a.data.acc ? String(a.data.acc) : '',
      dmg: a.data.dmg ? String(a.data.dmg) : '',
      eva: a.data.eva ? String(a.data.eva) : '',
      effect: String(a.data.description || ''),
    }));

  const classAbs: CombatAbility[] = allAbs
    .filter(
      (a) =>
        (a.data.source === data.identity.className || a.data.source === data.identity.path) &&
        a.data.feature_type === 'active'
    )
    .sort((a, b) => (Number(a.data.class_rank || 0)) - (Number(b.data.class_rank || 0)))
    .map((a) => {
      const rankReq = Number(a.data.class_rank ?? 0);
      return {
        id: `class-${a.id}`,
        name: a.name,
        sourceKind: 'class',
        type: (a.data.type as any) || 'utility',
        speed: a.data.speed || '',
        upkeep: a.data.upkeep || '',
        range: a.data.range || '',
        requirement: a.data.requirement || '',
        snCost: Number(a.data.sn_cost ?? 0) || 0,
        acc: a.data.acc ? String(a.data.acc) : '',
        dmg: a.data.dmg ? String(a.data.dmg) : '',
        eva: a.data.eva ? String(a.data.eva) : '',
        effect: String(a.data.description || ''),
        rankReq,
        locked: rankReq > classRank,
      };
    });

  const equippedDiscAbs: CombatAbility[] = (data.abilities || [])
    .filter((ab) => ab.equipped && ab.name)
    .map((ab, idx) => {
      const entry = getEntryByName(ab.name);
      return {
        id: `disc-${idx}-${ab.name}`,
        name: ab.name,
        sourceKind: 'discipline',
        type: (entry?.data?.type as any) || 'utility',
        speed: entry?.data?.speed || '',
        upkeep: entry?.data?.upkeep || '',
        range: entry?.data?.range || '',
        requirement: entry?.data?.requirement || '',
        snCost: Number(entry?.data?.sn_cost ?? 0) || 0,
        acc: entry?.data?.acc ? String(entry.data.acc) : '',
        dmg: entry?.data?.dmg ? String(entry.data.dmg) : '',
        eva: entry?.data?.eva ? String(entry.data.eva) : '',
        effect: String(entry?.data?.description || ''),
        rankReq: Number(entry?.data?.class_rank ?? 0),
      };
    });

  return {
    id: `pc-${char.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    side,
    kind: 'pc',
    sourceCharacterId: char.id,
    name: char.name || 'Unnamed Character',
    subtitle: [data.identity.className, data.identity.path].filter(Boolean).join(' · ') || data.identity.origin || 'Player Character',
    tier,
    classRank,
    attributes: { ...data.attributes },
    vigor: Math.min(vMax, rawVigor),
    vigorMax: vMax,
    strain: data.trackers.strain ?? 0,
    strainMax: strainMax(data),
    dp: data.trackers.dp ?? 0,
    dpMax: dpMax(data),
    ap: data.trackers.ap ?? 0,
    apMax: apMax(data, getEntryByName),
    tmv: overflowTmv,
    eva: evasion(data) + offhandEvaBonus,
    acc: (data.trackers.acc || 0) + accuracyBonus(data),
    mov: movementTiles(data, getEntryByName),
    armourPenalty: burdenPenalty + armourCombatPenalty,
    resists: armourInfo?.resists && armourInfo.resists !== '-' ? armourInfo.resists : undefined,
    hasActed: false,
    moveUsed: false,
    acpRemaining: 3,
    reactionUsed: false,
    statuses: [],
    mainHandMode: data.equipment.mainHandMode === '2H' ? '2H' : '1H',
    equipmentList,
    abilities: [...classAbs, ...equippedDiscAbs, ...basicAbs],
  };
}

export function buildCombatantFromNpc(
  npc: CustomNpc,
  side: CombatantSide,
  displayName?: string
): Combatant {
  const equipmentList: CombatEquipmentItem[] = (npc.items || []).map((item) => ({
    id: item.id,
    slot: item.equippedSlot || 'extra',
    name: item.customName || item.name,
    category: item.category,
    subtype: item.subtype,
    dmg: item.dmg,
    range: item.range,
    ap: item.ap,
    effect: item.effect || item.description,
  }));

  const abilities: CombatAbility[] = (npc.abilities || []).map((ab) => ({
    id: ab.id,
    name: ab.name,
    sourceKind: 'npc',
    type: ab.type || 'utility',
    speed: ab.speed || '',
    upkeep: ab.upkeep || '',
    range: ab.range || '',
    snCost: Number(ab.snCost || 0),
    acc: ab.acc || '',
    dmg: ab.dmg || '',
    eva: ab.eva || '',
    effect: ab.effect || '',
  }));

  return {
    id: `npc-${npc.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    side,
    kind: 'npc',
    sourceNpcId: npc.id,
    name: displayName || npc.name,
    subtitle: [npc.role, npc.className].filter(Boolean).join(' · ') || 'Custom Creature',
    tier: npc.tier,
    classRank: npc.classRank,
    attributes: { ...npc.attributes },
    vigor: npc.stats.vigorMax,
    vigorMax: npc.stats.vigorMax,
    strain: 0,
    strainMax: npc.stats.strainMax,
    dp: npc.stats.dpMax,
    dpMax: npc.stats.dpMax,
    ap: npc.stats.apMax,
    apMax: npc.stats.apMax,
    tmv: 0,
    eva: npc.stats.eva,
    acc: npc.stats.acc,
    mov: npc.stats.mov,
    armourPenalty: 0,
    resists: npc.stats.resists || undefined,
    hasActed: false,
    moveUsed: false,
    acpRemaining: 3,
    reactionUsed: false,
    statuses: [],
    mainHandMode: '1H',
    equipmentList,
    abilities,
  };
}

export type TargetAttackOutcome = {
  targetId: string;
  targetName: string;
  effectiveEva: number;
  hit: boolean;
  overflow: number;
  weaponDmg: number;
  abilityDmgMod: number;
  feeblePenalty: number;
  bonusDmg: number;
  rawDmg: number;
  totalPierce: number;
  effectiveAp: number;
  totalBreak: number;
  apBroken: number;
  tmvAbsorbed: number;
  vigorLost: number;
};

export type AttackResolution = {
  dice: [number, number, number];
  diceSum: number;
  classRank: number;
  baseAcc: number;
  abilityAccMod: number;
  flankAcc: number;
  rangedAcc: number;
  statusPenalty: number;
  armourPenalty: number;
  extraAcc: number;
  totalRoll: number;
  outcomes: TargetAttackOutcome[];
};

export function resolveCombatAttack(params: {
  attacker: Combatant;
  ability: CombatAbility | null;
  weapon: CombatEquipmentItem | null;
  targets: Combatant[];
  isRanged?: boolean;
  flankingExtraEnemies?: number;
  rangedModifier?: number;
  extraAcc?: number;
  extraDmg?: number;
  manualDice?: [number, number, number];
}): AttackResolution {
  const {
    attacker,
    ability,
    weapon,
    targets,
    isRanged = false,
    flankingExtraEnemies = 0,
    rangedModifier = 0,
    extraAcc = 0,
    extraDmg = 0,
    manualDice,
  } = params;

  const dice: [number, number, number] = manualDice || [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
  const diceSum = dice[0] + dice[1] + dice[2];
  const classRank = Math.max(0, attacker.classRank);
  const baseAcc = attacker.acc;
  const abilityAccMod = parseSignedMod(ability?.acc);
  const flankAcc = Math.max(0, Math.min(4, Math.trunc(flankingExtraEnemies)));
  const rangedAcc = Math.trunc(rangedModifier);

  const stunStacks = getStatusStacks(attacker, 'stun');
  const blindPenalty = isRanged && getStatusStacks(attacker, 'blind') > 0 ? 8 : 0;
  const statusPenalty = stunStacks + blindPenalty;
  const armourPenalty = attacker.armourPenalty || 0;

  const totalRoll =
    diceSum +
    classRank +
    baseAcc +
    abilityAccMod +
    flankAcc +
    rangedAcc +
    Math.trunc(extraAcc) -
    statusPenalty -
    armourPenalty;

  const weaponDmg = parseWeaponDamage(weapon?.dmg, attacker.mainHandMode);
  const abilityDmgMod = parseSignedMod(ability?.dmg);
  const feeblePenalty = getStatusStacks(attacker, 'feeble');

  const combinedText = `${ability?.effect || ''} ${weapon?.effect || ''}`;
  const totalPierce = extractKeywordTraitValue(combinedText, 'pierce');
  const totalBreak = extractKeywordTraitValue(combinedText, 'break');

  const outcomes: TargetAttackOutcome[] = targets.map((target) => {
    const effectiveEva = getEffectiveEva(target);
    const hit = totalRoll >= effectiveEva;
    const overflow = hit ? Math.max(0, Math.floor((totalRoll - effectiveEva) / 2)) : 0;
    const rawDmg = hit
      ? Math.max(0, weaponDmg + abilityDmgMod + overflow + Math.trunc(extraDmg) - feeblePenalty)
      : 0;

    const apBroken = hit ? Math.min(Math.max(0, target.ap), totalBreak) : 0;
    // TMV absorbs incoming DMG (unaffected by armour) before main health pool + AP
    const tmvAbsorbed = hit ? Math.min(Math.max(0, target.tmv), rawDmg) : 0;
    const dmgPastTmv = Math.max(0, rawDmg - tmvAbsorbed);
    const effectiveAp = Math.max(0, target.ap - totalPierce);
    const vigorLost = dmgPastTmv > 0 ? Math.max(0, dmgPastTmv - effectiveAp) : 0;

    return {
      targetId: target.id,
      targetName: target.name,
      effectiveEva,
      hit,
      overflow,
      weaponDmg,
      abilityDmgMod,
      feeblePenalty,
      bonusDmg: Math.trunc(extraDmg),
      rawDmg,
      totalPierce,
      effectiveAp,
      totalBreak,
      apBroken,
      tmvAbsorbed,
      vigorLost,
    };
  });

  return {
    dice,
    diceSum,
    classRank,
    baseAcc,
    abilityAccMod,
    flankAcc,
    rangedAcc,
    statusPenalty,
    armourPenalty,
    extraAcc: Math.trunc(extraAcc),
    totalRoll,
    outcomes,
  };
}
