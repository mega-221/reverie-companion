import type { Character, CharacterData, CompendiumEntry } from '../types';
import {
  accuracyBonus,
  getAttributeInjuryPenalty,
  getBurdenPenalty,
  getEquippedArmourInfo,
  isAttributeAffectedByBurden,
  strainMax,
} from '../calc';
import {
  ATTRIBUTE_ACCENT_HEX,
  ATTRIBUTE_NAMES,
  CORE_SKILLS,
  SPECIAL_SKILL_ATTRIBUTES,
  getCoreSkillAttribute,
  getSeasonHex,
  type AttributeKey,
} from '../constants/reverie';

export type DieSize = 'coinflip' | 'd6' | 'd20';
export type AdvantageMode = 'normal' | 'advantage' | 'disadvantage';
export type RollCategory =
  | 'skill'
  | 'special_skill'
  | 'attribute'
  | 'combat'
  | 'destiny'
  | 'conviction'
  | 'contested'
  | 'death_save'
  | 'custom'
  | 'strain_crisis_check';

export interface RolledDie {
  id: string;
  size: DieSize;
  value: number;
  initialValue: number;
  advDisPrevious?: number;
  exertCount: number;
}

export interface ModifierTerm {
  label: string;
  value: number;
}

export interface ActiveRollSession {
  id: string;
  rollSerial: number;
  rollingDieIds: string[];
  category: RollCategory;
  title: string;
  subtitle: string;
  accentColor: string;
  accentTag: string;
  advantageMode: AdvantageMode;
  dice: RolledDie[];
  baseModifiers: ModifierTerm[];
  targetLabel?: string;
  targetValue?: number;
  isContested?: boolean;
  contestedSide?: 'active' | 'passive';
  exertCount: number;
  totalStrainIncurred: number;
  destinyApplied?: {
    convictionName: string;
    season: string;
    bonus: number;
  };
  notes?: string[];
  createdAt: string;
}

export interface RollLogEntry {
  v: 1;
  id: string;
  charId: string;
  charName: string;
  category: RollCategory;
  title: string;
  subtitle: string;
  accentColor: string;
  accentTag: string;
  advantageMode: AdvantageMode;
  dice: {
    size: DieSize;
    value: number;
    exertCount: number;
    advDisPrevious?: number;
  }[];
  modifiers: ModifierTerm[];
  destinyApplied?: {
    convictionName: string;
    season: string;
    bonus: number;
  };
  exertCount: number;
  strainIncurred: number;
  diceSum: number;
  total: number;
  targetLabel?: string;
  targetValue?: number;
  outcomeLabel: string;
  outcomeTone: 'radiant' | 'success' | 'failure' | 'neutral';
  isContested?: boolean;
  contestedSide?: 'active' | 'passive';
  overflowDamage?: number;
  createdAt: string;
}

export { ATTRIBUTE_ACCENT_HEX };

export const ROLL_LOG_PREFIX = '::REVERIE_ROLL::';

export function serializeRollLog(entry: RollLogEntry): string {
  return `${ROLL_LOG_PREFIX}${JSON.stringify(entry)}`;
}

export function isRollLogContent(content: string): boolean {
  return typeof content === 'string' && content.startsWith(ROLL_LOG_PREFIX);
}

export function parseRollLog(content: string): RollLogEntry | null {
  if (!isRollLogContent(content)) return null;
  try {
    const raw = JSON.parse(content.slice(ROLL_LOG_PREFIX.length));
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
    return raw as RollLogEntry;
  } catch {
    return null;
  }
}

export function rollSingleDie(size: DieSize): number {
  if (size === 'coinflip') {
    return Math.random() < 0.5 ? 1 : 2; // 2 = Heads, 1 = Tails
  }
  if (size === 'd6') {
    return Math.floor(Math.random() * 6) + 1;
  }
  return Math.floor(Math.random() * 20) + 1;
}

export function formatDieValue(size: DieSize, value: number): string {
  if (size === 'coinflip') {
    return value >= 2 ? 'HEADS' : 'TAILS';
  }
  return String(value);
}

export function getExertStrainCost(data: CharacterData): number {
  const sl = strainMax(data);
  return Math.max(1, Math.ceil(sl * 0.25));
}

export function createRollSession(params: {
  category: RollCategory;
  title: string;
  subtitle: string;
  accentColor: string;
  accentTag: string;
  diceSizes: DieSize[];
  advantageMode?: AdvantageMode;
  baseModifiers?: ModifierTerm[];
  targetLabel?: string;
  targetValue?: number;
  isContested?: boolean;
  contestedSide?: 'active' | 'passive';
  notes?: string[];
}): ActiveRollSession {
  const advantageMode = params.advantageMode ?? 'normal';
  const dice: RolledDie[] = params.diceSizes.map((size) => {
    const val = rollSingleDie(size);
    return {
      id: crypto.randomUUID(),
      size,
      value: val,
      initialValue: val,
      exertCount: 0,
    };
  });

  // Apply Advantage/Disadvantage on numeric pools with 2+ non-coinflip dice:
  // Advantage: reroll the lowest die and keep the higher of the two.
  // Disadvantage: reroll the highest die and keep the lower of the two.
  if (advantageMode !== 'normal') {
    const numericIndices = dice
      .map((d, idx) => (d.size !== 'coinflip' ? idx : -1))
      .filter((idx) => idx >= 0);

    if (numericIndices.length >= 2) {
      let targetIdx = numericIndices[0];
      for (const idx of numericIndices) {
        if (advantageMode === 'advantage') {
          if (dice[idx].value < dice[targetIdx].value) targetIdx = idx;
        } else {
          if (dice[idx].value > dice[targetIdx].value) targetIdx = idx;
        }
      }
      const prevVal = dice[targetIdx].value;
      const rerolled = rollSingleDie(dice[targetIdx].size);
      const kept =
        advantageMode === 'advantage'
          ? Math.max(prevVal, rerolled)
          : Math.min(prevVal, rerolled);

      dice[targetIdx] = {
        ...dice[targetIdx],
        value: kept,
        initialValue: kept,
        advDisPrevious: prevVal,
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    rollSerial: 1,
    rollingDieIds: dice.map((d) => d.id),
    category: params.category,
    title: params.title,
    subtitle: params.subtitle,
    accentColor: params.accentColor,
    accentTag: params.accentTag,
    advantageMode,
    dice,
    baseModifiers: (params.baseModifiers || []).filter((m) => m.value !== 0),
    targetLabel: params.targetLabel,
    targetValue: params.targetValue,
    isContested: params.isContested,
    contestedSide: params.contestedSide,
    exertCount: 0,
    totalStrainIncurred: 0,
    notes: params.notes,
    createdAt: new Date().toISOString(),
  };
}

export function exertDieInSession(
  session: ActiveRollSession,
  dieId: string,
  strainCost: number
): ActiveRollSession {
  const nextDice = session.dice.map((d) => {
    if (d.id !== dieId) return d;
    const nextVal = rollSingleDie(d.size);
    return {
      ...d,
      value: nextVal,
      exertCount: d.exertCount + 1,
    };
  });

  return {
    ...session,
    rollSerial: session.rollSerial + 1,
    rollingDieIds: [dieId],
    dice: nextDice,
    exertCount: session.exertCount + 1,
    totalStrainIncurred: session.totalStrainIncurred + strainCost,
  };
}

export function applyDestinyToSession(
  session: ActiveRollSession,
  conviction: { name: string; season: string; rank: number }
): ActiveRollSession {
  if (session.destinyApplied) return session;
  return {
    ...session,
    destinyApplied: {
      convictionName: conviction.name,
      season: conviction.season,
      bonus: conviction.rank,
    },
  };
}

export interface ComputedRollOutcome {
  isPureCoinflip: boolean;
  diceSum: number;
  modSum: number;
  total: number;
  outcomeLabel: string;
  outcomeTone: 'radiant' | 'success' | 'failure' | 'neutral';
  overflowDamage?: number;
}

export function computeRollOutcome(session: ActiveRollSession): ComputedRollOutcome {
  const isPureCoinflip =
    session.dice.length > 0 &&
    session.dice.every((d) => d.size === 'coinflip') &&
    session.baseModifiers.length === 0 &&
    !session.destinyApplied &&
    session.targetValue === undefined;

  if (isPureCoinflip) {
    const heads = session.dice.filter((d) => d.value >= 2).length;
    const tails = session.dice.length - heads;
    if (session.dice.length === 1) {
      return {
        isPureCoinflip: true,
        diceSum: heads,
        modSum: 0,
        total: heads,
        outcomeLabel: heads === 1 ? 'HEADS' : 'TAILS',
        outcomeTone: 'neutral',
      };
    }
    return {
      isPureCoinflip: true,
      diceSum: heads,
      modSum: 0,
      total: heads,
      outcomeLabel: `${heads} HEADS · ${tails} TAILS`,
      outcomeTone: 'neutral',
    };
  }

  const diceSum = session.dice.reduce((sum, d) => {
    if (d.size === 'coinflip') return sum + (d.value >= 2 ? 1 : 0);
    return sum + d.value;
  }, 0);

  const modSum =
    session.baseModifiers.reduce((sum, m) => sum + m.value, 0) +
    (session.destinyApplied?.bonus ?? 0);

  const total = diceSum + modSum;

  if (session.category === 'death_save') {
    const survived = total >= 4;
    return {
      isPureCoinflip: false,
      diceSum,
      modSum,
      total,
      outcomeLabel: survived ? 'DEFYING DEATH — SURVIVED' : 'STRUCK DOWN',
      outcomeTone: survived ? 'success' : 'failure',
    };
  }

  if (session.targetValue === undefined) {
    return {
      isPureCoinflip: false,
      diceSum,
      modSum,
      total,
      outcomeLabel: session.category === 'destiny' ? 'DESTINY ROLLED' : `RESULT: ${total}`,
      outcomeTone: 'neutral',
    };
  }

  const target = session.targetValue;

  if (session.category === 'combat') {
    const hit = total >= target;
    const overflow = hit ? Math.floor((total - target) / 2) : 0;
    return {
      isPureCoinflip: false,
      diceSum,
      modSum,
      total,
      overflowDamage: overflow,
      outcomeLabel: hit
        ? overflow > 0
          ? `HIT · +${overflow} OVERFLOW DMG`
          : 'HIT'
        : 'MISS',
      outcomeTone: hit ? (overflow >= 2 ? 'radiant' : 'success') : 'failure',
    };
  }

  if (session.isContested) {
    const side = session.contestedSide || 'active';
    const won = side === 'active' ? total > target : total >= target;
    const tied = total === target;
    return {
      isPureCoinflip: false,
      diceSum,
      modSum,
      total,
      outcomeLabel: won
        ? 'CONTEST WON'
        : tied && side === 'active'
        ? 'FAILED (TIE GOES TO PASSIVE)'
        : 'CONTEST LOST',
      outcomeTone: won ? 'success' : 'failure',
    };
  }

  if (session.category === 'strain_crisis_check') {
    const passed = total >= target;
    return {
      isPureCoinflip: false,
      diceSum,
      modSum,
      total,
      outcomeLabel: passed ? 'CRISIS AVERTED' : 'CRISIS TRIGGERED',
      outcomeTone: passed ? 'success' : 'failure',
    };
  }

  const isSkillCheck =
    session.category === 'skill' ||
    session.category === 'special_skill' ||
    session.category === 'attribute';

  if (isSkillCheck && total >= target + 4) {
    return {
      isPureCoinflip: false,
      diceSum,
      modSum,
      total,
      outcomeLabel: 'RADIANT SUCCESS',
      outcomeTone: 'radiant',
    };
  }

  const passed = total >= target;
  return {
    isPureCoinflip: false,
    diceSum,
    modSum,
    total,
    outcomeLabel: passed ? 'SUCCESS' : 'FAILURE',
    outcomeTone: passed ? 'success' : 'failure',
  };
}

export function buildRollLogEntry(char: Character, session: ActiveRollSession): RollLogEntry {
  const outcome = computeRollOutcome(session);
  const allMods: ModifierTerm[] = [...session.baseModifiers];
  if (session.destinyApplied) {
    allMods.push({
      label: `Destiny (${session.destinyApplied.convictionName})`,
      value: session.destinyApplied.bonus,
    });
  }

  return {
    v: 1,
    id: session.id,
    charId: char.id,
    charName: char.name || 'Unnamed Character',
    category: session.category,
    title: session.title,
    subtitle: session.subtitle,
    accentColor: session.accentColor,
    accentTag: session.accentTag,
    advantageMode: session.advantageMode,
    dice: session.dice.map((d) => ({
      size: d.size,
      value: d.value,
      exertCount: d.exertCount,
      advDisPrevious: d.advDisPrevious,
    })),
    modifiers: allMods,
    destinyApplied: session.destinyApplied,
    exertCount: session.exertCount,
    strainIncurred: session.totalStrainIncurred,
    diceSum: outcome.diceSum,
    total: outcome.total,
    targetLabel: session.targetLabel,
    targetValue: session.targetValue,
    outcomeLabel: outcome.outcomeLabel,
    outcomeTone: outcome.outcomeTone,
    isContested: session.isContested,
    contestedSide: session.contestedSide,
    overflowDamage: outcome.overflowDamage,
    createdAt: session.createdAt,
  };
}

export function getSkillAttributeKey(
  skillName: string,
  kind: 'core' | 'special',
  char: Character,
  getEntryByName?: (name: string) => CompendiumEntry | undefined
): AttributeKey {
  if (kind === 'core') {
    return getCoreSkillAttribute(skillName);
  }
  const dbAttr = getEntryByName?.(skillName)?.data?.attribute;
  const localSpec = char.data.specialSkills?.find((s) => s.name === skillName)?.attribute;
  const fallback = SPECIAL_SKILL_ATTRIBUTES[skillName];
  const resolved = (dbAttr || localSpec || fallback || 'grt').toLowerCase();
  if (resolved === 'ref' || resolved === 'int' || resolved === 'psy') return resolved;
  return 'grt';
}

export function buildSkillRollSession(params: {
  char: Character;
  skillName: string;
  kind: 'core' | 'special';
  getEntryByName?: (name: string) => CompendiumEntry | undefined;
  advantageMode?: AdvantageMode;
  targetValue?: number;
  isContested?: boolean;
  contestedSide?: 'active' | 'passive';
}): ActiveRollSession {
  const { char, skillName, kind, getEntryByName } = params;
  const attr = getSkillAttributeKey(skillName, kind, char, getEntryByName);
  const attrLabel = attr.toUpperCase();

  const skillRank =
    kind === 'core'
      ? char.data.skills[skillName] ?? 0
      : char.data.specialSkills.find((s) => s.name === skillName)?.rank ?? 0;

  const injuryPenalty = getAttributeInjuryPenalty(char.data.trackers.injuries, attrLabel);
  const globalBurden = getBurdenPenalty(char.data, getEntryByName as any);
  const burdenPenalty = isAttributeAffectedByBurden(attr) ? globalBurden : 0;

  const armourInfo = getEquippedArmourInfo(char.data, getEntryByName);
  const autoStealthDis =
    kind === 'core' && skillName === 'Stealth' && Boolean(armourInfo?.stealthDisadvantage);

  const advantageMode: AdvantageMode = params.advantageMode ?? (autoStealthDis ? 'disadvantage' : 'normal');

  const modifiers: ModifierTerm[] = [
    { label: skillName, value: skillRank },
  ];
  if (injuryPenalty > 0) modifiers.push({ label: 'Injury', value: -injuryPenalty });
  if (burdenPenalty > 0) modifiers.push({ label: 'Overburdened', value: -burdenPenalty });

  const notes: string[] = [];
  if (autoStealthDis && advantageMode === 'disadvantage') {
    notes.push(`Disadvantage from ${armourInfo?.category} Armour (${armourInfo?.name}).`);
  }

  const attrFullName = ATTRIBUTE_NAMES[attr];

  return createRollSession({
    category: params.isContested ? 'contested' : kind === 'core' ? 'skill' : 'special_skill',
    title: skillName,
    subtitle: params.isContested
      ? `${attrFullName} · Contested Roll (${params.contestedSide === 'passive' ? 'Passive' : 'Active'})`
      : `${attrFullName} · ${kind === 'core' ? 'Core Skill' : 'Special Skill'} Check`,
    accentColor: ATTRIBUTE_ACCENT_HEX[attr],
    accentTag: attrLabel,
    diceSizes: ['d6', 'd6', 'd6'],
    advantageMode,
    baseModifiers: modifiers,
    targetLabel: params.targetValue !== undefined ? (params.isContested ? 'Opponent' : 'CL') : undefined,
    targetValue: params.targetValue,
    isContested: params.isContested,
    contestedSide: params.contestedSide,
    notes,
  });
}

export function buildCombatRollSession(params: {
  char: Character;
  getEntryByName?: (name: string) => CompendiumEntry | undefined;
  abilityMod?: number;
  targetEva?: number;
  advantageMode?: AdvantageMode;
}): ActiveRollSession {
  const { char, getEntryByName } = params;
  const tier = Math.max(0, char.data.progression?.tier ?? 0);
  const classRank = Math.max(0, Math.min(4, tier - 1));
  const baseAcc = (char.data.trackers.acc || 0) + accuracyBonus(char.data);
  const burdenPenalty = getBurdenPenalty(char.data, getEntryByName as any);
  const armourInfo = getEquippedArmourInfo(char.data, getEntryByName);
  const armourPenalty = armourInfo?.combatRollPenalty ?? 0;

  const modifiers: ModifierTerm[] = [
    { label: 'Class Rank', value: classRank },
    { label: 'Accuracy', value: baseAcc },
  ];
  if (params.abilityMod && params.abilityMod !== 0) {
    modifiers.push({ label: 'Ability / Mod', value: params.abilityMod });
  }
  if (burdenPenalty > 0) modifiers.push({ label: 'Overburdened', value: -burdenPenalty });
  if (armourPenalty > 0) modifiers.push({ label: 'Armour Carry Penalty', value: -armourPenalty });

  return createRollSession({
    category: 'combat',
    title: 'Combat Roll',
    subtitle: char.data.identity.className
      ? `${char.data.identity.className} · Attack vs Evasion`
      : 'Weapon Attack vs Evasion',
    accentColor: '#f59e0b',
    accentTag: 'COMBAT',
    diceSizes: ['d6', 'd6', 'd6'],
    advantageMode: params.advantageMode ?? 'normal',
    baseModifiers: modifiers,
    targetLabel: params.targetEva !== undefined ? 'EVA' : undefined,
    targetValue: params.targetEva,
  });
}

export function buildDestinyRollSession(params?: { mod?: number }): ActiveRollSession {
  const modifiers: ModifierTerm[] = [];
  if (params?.mod && params.mod !== 0) {
    modifiers.push({ label: 'Modifier', value: params.mod });
  }
  return createRollSession({
    category: 'destiny',
    title: 'Destiny Roll',
    subtitle: '1d20 · Fate & Fortune',
    accentColor: '#22d3ee',
    accentTag: 'DESTINY',
    diceSizes: ['d20'],
    advantageMode: 'normal',
    baseModifiers: modifiers,
  });
}

export function buildConvictionCheckSession(params: {
  conviction: { name: string; season: string; rank: number };
  targetCl: number;
  isStrainCrisis?: boolean;
}): ActiveRollSession {
  const { conviction, targetCl, isStrainCrisis } = params;
  const seasonColor = getSeasonHex(conviction.season);
  return createRollSession({
    category: isStrainCrisis ? 'strain_crisis_check' : 'conviction',
    title: conviction.name ? `${conviction.name} Check` : 'Unconvicted Check',
    subtitle: isStrainCrisis
      ? 'Standing On The Edge · Strain Limit Reached'
      : `${conviction.season || 'Season'} Conviction Check`,
    accentColor: seasonColor,
    accentTag: (conviction.season || 'CONVICTION').toUpperCase(),
    diceSizes: ['d6', 'd6', 'd6'],
    advantageMode: 'normal',
    baseModifiers: [
      { label: conviction.name || 'Conviction', value: conviction.rank },
    ],
    targetLabel: 'CL',
    targetValue: targetCl,
    notes: isStrainCrisis
      ? ['Failing this CL 18 Conviction Check immediately triggers a Crisis.']
      : undefined,
  });
}

export function buildDeathSaveRollSession(): ActiveRollSession {
  return createRollSession({
    category: 'death_save',
    title: 'Defying Death',
    subtitle: '1d6 · Unmodified Survival Roll (4+)',
    accentColor: '#dc2626',
    accentTag: 'DEATH SAVE',
    diceSizes: ['d6'],
    advantageMode: 'normal',
    baseModifiers: [],
    targetLabel: 'Survive',
    targetValue: 4,
    notes: ['No skills or attributes affect this roll. On 4 or higher, you survive the blow.'],
  });
}

export function getEffectiveSkillModifier(
  char: Character,
  skillName: string,
  kind: 'core' | 'special',
  getEntryByName?: (name: string) => CompendiumEntry | undefined
): number {
  const attr = getSkillAttributeKey(skillName, kind, char, getEntryByName);
  const skillRank =
    kind === 'core'
      ? char.data.skills[skillName] ?? 0
      : char.data.specialSkills.find((s) => s.name === skillName)?.rank ?? 0;
  const injuryPenalty = getAttributeInjuryPenalty(char.data.trackers.injuries, attr.toUpperCase());
  const globalBurden = getBurdenPenalty(char.data, getEntryByName as any);
  const burdenPenalty = isAttributeAffectedByBurden(attr) ? globalBurden : 0;
  return skillRank - injuryPenalty - burdenPenalty;
}

export { CORE_SKILLS };
