import type { AdvancementType, CharacterData } from '../../../types';
import { CORE_SKILLS, SKILL_XP_COSTS, getMinSkillRank } from '../utils';

export interface TierDefinition {
  tier: number;
  title: string;
  levelRange: string;
  minLevel: number;
  attrLimit: number;
  skillLimit: number;
  milestoneBonuses: string[];
  description: string;
}

export interface AdvancementNodeDef {
  type: AdvancementType;
  label: string;
  shortLabel: string;
  maxPerTier: number;
  allTiers?: boolean;
  tiers: number[];
  category: 'combat' | 'vigor' | 'strain' | 'mastery' | 'narrative';
  description: string;
  requiresTarget?: 'conviction' | 'skill';
}

export const ADVANCEMENT_CATEGORY_HEX: Record<AdvancementNodeDef['category'], string> = {
  combat: '#f59e0b',
  vigor: '#ef4444',
  strain: '#3b82f6',
  mastery: '#06b6d4',
  narrative: '#a855f7',
};

export interface AbilityPickTask {
  discipline: string;
  rank: number;
  promptDetail: string;
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    tier: 1,
    title: 'Nobody',
    levelRange: 'Lv 1–4',
    minLevel: 1,
    attrLimit: 2,
    skillLimit: 2,
    milestoneBonuses: ['+1 VL', '+1 SL', '+1 Attr Pt', '1 Starting Discipline'],
    description: 'The faceless masses. Frail and untested against Dunyor.',
  },
  {
    tier: 2,
    title: 'Promising Soul',
    levelRange: 'Lv 5–8',
    minLevel: 5,
    attrLimit: 2,
    skillLimit: 3,
    milestoneBonuses: ['+1 VL', '+1 SL', '+1 Attr Pt', '+1 DP Max'],
    description: 'Recommended starting point for longer campaigns.',
  },
  {
    tier: 3,
    title: 'Competent Individual',
    levelRange: 'Lv 9–12',
    minLevel: 9,
    attrLimit: 3,
    skillLimit: 3,
    milestoneBonuses: ['+1 VL', '+1 SL', '+1 Attr Pt', '+1 DP Max', 'Class Path'],
    description: 'Access to tools and paths that turn the tide.',
  },
  {
    tier: 4,
    title: 'Skilled Professional',
    levelRange: 'Lv 13–16',
    minLevel: 13,
    attrLimit: 3,
    skillLimit: 4,
    milestoneBonuses: ['+1 VL', '+1 SL', '+1 Attr Pt', '+1 DP Max'],
    description: 'Competent across fields; tested by moral sacrifice.',
  },
  {
    tier: 5,
    title: 'Renowned Veteran',
    levelRange: 'Lv 17–20',
    minLevel: 17,
    attrLimit: 4,
    skillLimit: 4,
    milestoneBonuses: ['+1 VL', '+1 SL', '+1 Attr Pt', '+1 DP Max'],
    description: 'Exceptional individuals in their chosen developments.',
  },
];

export const getTierDefinition = (tier: number): TierDefinition => {
  if (tier <= 0) {
    return {
      tier: 0,
      title: 'Unblooded',
      levelRange: 'Lv 0',
      minLevel: 0,
      attrLimit: 2,
      skillLimit: 2,
      milestoneBonuses: ['5 Base VL', '5 Base SL'],
      description: 'Before the first step. Gain 5 XP to reach Level 1 and enter Tier 1.',
    };
  }

  const regular = TIER_DEFINITIONS.find(t => t.tier === tier);
  if (regular) return regular;

  const minLevel = (tier - 1) * 4 + 1;
  const maxLevel = tier * 4;
  return {
    tier,
    title: tier === 6 ? 'Legendary Hero' : `Ascendant ${tier}`,
    levelRange: `Lv ${minLevel}–${maxLevel}`,
    minLevel,
    attrLimit: 4,
    skillLimit: 4,
    milestoneBonuses: ['+1 VL', '+1 SL'],
    description: 'Endgame tier. Tiers beyond 5 grant only +1 VL and +1 SL.',
  };
};

export const ADVANCEMENT_NODES: AdvancementNodeDef[] = [
  {
    type: 'acc',
    label: '+1 Accuracy',
    shortLabel: '+1 Accuracy',
    maxPerTier: 2,
    allTiers: true,
    tiers: [1, 2, 3, 4, 5],
    category: 'combat',
    description: 'Requires 2 advancements in a tier to permanently gain +1 Accuracy on combat rolls.',
  },
  {
    type: 'eva',
    label: '+1 Evasion',
    shortLabel: '+1 Evasion',
    maxPerTier: 2,
    allTiers: true,
    tiers: [1, 2, 3, 4, 5],
    category: 'combat',
    description: 'Requires 2 advancements in a tier to permanently increase base Evasion by +1.',
  },
  {
    type: 'vl',
    label: '+1 Vigor Limit',
    shortLabel: '+1 Vigor',
    maxPerTier: 2,
    allTiers: true,
    tiers: [1, 2, 3, 4, 5],
    category: 'vigor',
    description: 'Immediately increase your Vigor Limit (VL) by +1. Available twice per tier.',
  },
  {
    type: 'sl',
    label: '+1 Strain Limit',
    shortLabel: '+1 Strain',
    maxPerTier: 2,
    allTiers: true,
    tiers: [1, 2, 3, 4, 5],
    category: 'strain',
    description: 'Immediately increase your Strain Limit (SL) by +1. Available twice per tier.',
  },
  {
    type: 'aspect_slot',
    label: 'Aspect Slot',
    shortLabel: 'Aspect Slot',
    maxPerTier: 1,
    tiers: [1, 2, 3, 4, 5],
    category: 'narrative',
    description: 'Unlock an additional Aspect slot (Tiers 1–5) to adopt an Aspect in the Narrative Profile.',
  },
  {
    type: 'new_discipline',
    label: 'New Discipline',
    shortLabel: 'New Discipline',
    maxPerTier: 1,
    tiers: [1, 2, 3, 4],
    category: 'mastery',
    description: 'Unlock an additional Discipline slot (1 by default; Tiers 1–4). Add your discipline in the Gameplay Profile.',
  },
  {
    type: 'discipline_ability',
    label: 'Discipline Ability',
    shortLabel: 'Discipline Ability',
    maxPerTier: 4,
    allTiers: true,
    tiers: [1, 2, 3, 4, 5],
    category: 'mastery',
    description: 'Unlock an additional Discipline Ability slot (up to 4 per tier). Add abilities in the Gameplay Profile.',
  },
  {
    type: 'conviction_5',
    label: 'Conviction Rank 5',
    shortLabel: 'Conviction Rank 5',
    maxPerTier: 1,
    tiers: [4],
    category: 'narrative',
    requiresTarget: 'conviction',
    description: 'Elevate a single Rank 4 Conviction to Rank 5 and permanently allow that Conviction card to reach Rank 5 (Tier 4 only).',
  },
  {
    type: 'skill_5',
    label: 'Signature Skill',
    shortLabel: 'Signature Skill',
    maxPerTier: 1,
    tiers: [3, 5],
    category: 'mastery',
    requiresTarget: 'skill',
    description: 'Grant Inspiration to a Core or Special Skill (retroactively freeing 1 XP per rank already invested) and allow it to advance up to Rank 8 regardless of attributes (Tiers 3 & 5).',
  },
];

export const isNodeAvailableInTier = (node: AdvancementNodeDef, tier: number): boolean =>
  tier >= 1 && (Boolean(node.allTiers) || node.tiers.includes(tier));

// Starting level is 0; every level gained grants 2 advancements
export const getTotalAdvancementBudget = (level: number): number =>
  Math.max(0, level * 2);

// Level 0 is Tier 0; Levels 1-4 are Tier 1, 5-8 are Tier 2, ..., infinite tiers beyond 5
export const calculateTierFromLevel = (level: number): number =>
  level <= 0 ? 0 : Math.floor((level - 1) / 4) + 1;

// Accessible ability rank for a tier: tier - 1 (clamped between 0 and 4)
export const getMaxAccessibleAbilityRank = (tier: number): number =>
  Math.max(0, Math.min(4, tier - 1));

export const getSignatureSkills = (data: CharacterData): Set<string> => {
  const set = new Set<string>();
  for (const adv of data.progression.advancements || []) {
    if (adv.type === 'skill_5' && adv.targetName) {
      set.add(adv.targetName);
    }
  }
  return set;
};

export const isSkillInspired = (skillName: string, data: CharacterData): boolean =>
  Boolean(data.identity.inspirations?.includes(skillName)) ||
  getSignatureSkills(data).has(skillName);

export const getSkillMaxRank = (
  skillName: string,
  linkedAttrVal: number,
  originMin: number,
  data: CharacterData
): number => {
  if (getSignatureSkills(data).has(skillName)) return 8;
  return Math.max(originMin, Math.min(8, linkedAttrVal * 2));
};

export const getInvestedSkillXp = (data: CharacterData): number => {
  let invested = 0;
  const charWrapper = { data };

  for (const skillName of CORE_SKILLS) {
    const currentRank = Math.max(0, data.skills?.[skillName] ?? 0);
    const originMin = getMinSkillRank(skillName, charWrapper);
    const inspired = isSkillInspired(skillName, data);
    for (let r = originMin; r < currentRank; r++) {
      const baseCost = r < SKILL_XP_COSTS.length ? SKILL_XP_COSTS[r] : 0;
      invested += inspired ? Math.max(0, baseCost - 1) : baseCost;
    }
  }

  for (const spec of data.specialSkills || []) {
    if (!spec?.name) continue;
    const currentRank = Math.max(0, spec.rank ?? 0);
    const originMin = getMinSkillRank(spec.name, charWrapper);
    const inspired = isSkillInspired(spec.name, data);
    for (let r = originMin; r < currentRank; r++) {
      const baseCost = r < SKILL_XP_COSTS.length ? SKILL_XP_COSTS[r] : 0;
      invested += inspired ? Math.max(0, baseCost - 1) : baseCost;
    }
  }

  return invested;
};

export const getSpendableXp = (data: CharacterData): number => {
  const totalXp = Math.max(0, data.progression?.xp ?? 0);
  return totalXp - getInvestedSkillXp(data);
};

export const hasConvictionRank5Unlocked = (
  convictionName: string,
  data: CharacterData
): boolean => {
  if (!convictionName) return false;
  return (data.progression.advancements || []).some(
    a => a.type === 'conviction_5' && a.targetName === convictionName
  );
};

export interface TierGainItem {
  label: string;
  detail: string;
  accent: 'red' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'purple';
}

export const getTierGains = (tier: number): TierGainItem[] => {
  if (tier <= 0) return [];
  const def = getTierDefinition(tier);
  const gains: TierGainItem[] = [
    { label: '+1 Vigor Limit', detail: 'Permanent vitality increase', accent: 'red' },
    { label: '+1 Strain Limit', detail: 'Permanent endurance threshold increase', accent: 'blue' },
  ];

  if (tier <= 5) {
    gains.push({
      label: '+1 Attribute Point',
      detail: `Attribute Rank Limit: ${def.attrLimit}`,
      accent: 'emerald',
    });
  }

  if (tier >= 2 && tier <= 5) {
    gains.push({
      label: '+1 Destiny Maximum',
      detail: 'Increased maximum DP pool',
      accent: 'amber',
    });
    gains.push({
      label: `Class Rank ${tier - 1}`,
      detail: 'Unlocks higher-rank Class features',
      accent: 'purple',
    });
  }

  if (tier === 1) {
    gains.push({
      label: 'Starting Discipline',
      detail: `Skill Rank Limit: ${def.skillLimit}`,
      accent: 'purple',
    });
  } else if (tier === 2) {
    gains.push({
      label: 'Skill Rank Limit: 3',
      detail: 'Skills may now advance up to Rank 3',
      accent: 'emerald',
    });
  } else if (tier === 3) {
    gains.push({
      label: 'Class Path Unlocked',
      detail: 'Choose a specialized subclass Path for your Class',
      accent: 'amber',
    });
  } else if (tier === 4) {
    gains.push({
      label: 'Skill Rank Limit: 4',
      detail: 'Skills may now advance up to Rank 4',
      accent: 'emerald',
    });
  }

  return gains;
};

function applyAdvancementRemovals(
  data: CharacterData,
  kept: NonNullable<CharacterData['progression']['advancements']>,
  removed: NonNullable<CharacterData['progression']['advancements']>
): Partial<CharacterData> {
  if (removed.length === 0) return {};

  const convictions = data.convictions.map(c => ({ ...c }));

  for (const rem of removed) {
    if (rem.type === 'conviction_5' && rem.targetName) {
      const stillGranted = kept.some(
        k => k.type === 'conviction_5' && k.targetName === rem.targetName
      );
      if (!stillGranted) {
        for (let i = 0; i < convictions.length; i++) {
          if (convictions[i].name === rem.targetName && convictions[i].rank >= 5) {
            convictions[i].rank = 4;
          }
        }
      }
    }
  }

  return {
    convictions,
    progression: {
      ...data.progression,
      advancements: kept,
    },
  };
}

export function pruneDisabledTierAdvancements(
  data: CharacterData,
  nextTier: number
): Partial<CharacterData> {
  const advancements = data.progression.advancements || [];
  const kept = advancements.filter(a => a.tier <= nextTier);
  const removed = advancements.filter(a => a.tier > nextTier);
  return applyAdvancementRemovals(data, kept, removed);
}

export function refundTierAdvancements(
  data: CharacterData,
  tierToRefund: number
): Partial<CharacterData> {
  const advancements = data.progression.advancements || [];
  const kept = advancements.filter(a => a.tier !== tierToRefund);
  const removed = advancements.filter(a => a.tier === tierToRefund);
  return applyAdvancementRemovals(data, kept, removed);
}

export const calculateLevelFromXp = (xp: number): number => Math.max(0, Math.floor((xp || 0) / 5));

export const deriveLevelAndTierFromXp = (xp: number) => {
  const level = calculateLevelFromXp(xp);
  return { level, tier: calculateTierFromLevel(level) };
};