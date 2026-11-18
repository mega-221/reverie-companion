import type { AdvancementType } from '../../../types';

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
  tiers: number[]; // Which tiers include this advancement
  category: 'combat' | 'vitals' | 'mastery' | 'narrative';
  description: string;
  requiresTarget?: 'discipline' | 'ability' | 'conviction' | 'skill';
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    tier: 1,
    title: 'Nobody',
    levelRange: 'Lv 1–4',
    minLevel: 1,
    attrLimit: 2,
    skillLimit: 2,
    milestoneBonuses: ['Base Stats', '1 Starting Discipline'],
    description: 'The faceless masses. Frail and untested against Dunyor.',
  },
  {
    tier: 2,
    title: 'Promising Soul',
    levelRange: 'Lv 5–8',
    minLevel: 5,
    attrLimit: 2,
    skillLimit: 3,
    milestoneBonuses: ['+1 VM', '+1 SL', '+1 Attr Pt', '+1 DP Max'],
    description: 'Recommended starting point for longer campaigns.',
  },
  {
    tier: 3,
    title: 'Competent Individual',
    levelRange: 'Lv 9–12',
    minLevel: 9,
    attrLimit: 3,
    skillLimit: 3,
    milestoneBonuses: ['+1 VM', '+1 SL', '+1 Attr Pt', '+1 DP Max', 'Class Path'],
    description: 'Access to tools and paths that turn the tide.',
  },
  {
    tier: 4,
    title: 'Skilled Professional',
    levelRange: 'Lv 13–16',
    minLevel: 13,
    attrLimit: 3,
    skillLimit: 4,
    milestoneBonuses: ['+1 VM', '+1 SL', '+1 Attr Pt', '+1 DP Max'],
    description: 'Competent across fields; tested by moral sacrifice.',
  },
  {
    tier: 5,
    title: 'Renowned Veteran',
    levelRange: 'Lv 17–20',
    minLevel: 17,
    attrLimit: 4,
    skillLimit: 4,
    milestoneBonuses: ['+1 VM', '+1 SL', '+1 Attr Pt', '+1 DP Max'],
    description: 'Exceptional individuals in their chosen developments.',
  },
  {
    tier: 6,
    title: 'Legendary Hero',
    levelRange: 'Lv 21+',
    minLevel: 21,
    attrLimit: 4,
    skillLimit: 4,
    milestoneBonuses: ['+1 VM / Tier', '+1 SL / Tier'],
    description: 'Endgame tier. Tiers beyond 5 grant only +1 VM and +1 SL.',
  },
];

export const ADVANCEMENT_NODES: AdvancementNodeDef[] = [
  {
    type: 'acc',
    label: '+1 Accuracy',
    shortLabel: '+1 Accuracy',
    maxPerTier: 1,
    tiers: [1, 2, 3, 4, 5, 6],
    category: 'combat',
    description: 'Permanently gain +1 Accuracy on combat rolls.',
  },
  {
    type: 'eva',
    label: '+1 Evasion',
    shortLabel: '+1 Evasion',
    maxPerTier: 1,
    tiers: [1, 2, 3, 4, 5, 6],
    category: 'combat',
    description: 'Permanently increase base Evasion by +1.',
  },
  {
    type: 'vl',
    label: '+1 Vigor Maximum',
    shortLabel: '+1 Vigor Maximum',
    maxPerTier: 2,
    tiers: [1, 2, 3, 4, 5, 6],
    category: 'vitals',
    description: 'Increase your Vigor Maximum (VM) by +1. Can be taken twice per tier.',
  },
  {
    type: 'sl',
    label: '+2 Strain Limit',
    shortLabel: '+2 Strain Limit',
    maxPerTier: 2,
    tiers: [1, 2, 3, 4, 5, 6],
    category: 'vitals',
    description: 'Increase your Strain Limit (SL) by +2. Can be taken twice per tier.',
  },
  {
    type: 'discipline_ability',
    label: 'Learn New Discipline Ability',
    shortLabel: 'Learn New Discipline Ability',
    maxPerTier: 4,
    tiers: [1, 2, 3, 4, 5, 6],
    category: 'mastery',
    requiresTarget: 'ability',
    description: 'Learn a new ability from one of your adopted disciplines. Up to 4 per tier.',
  },
  {
    type: 'aspect_slot',
    label: 'Unlock a New Aspect Slot',
    shortLabel: 'Unlock a New Aspect Slot',
    maxPerTier: 1,
    tiers: [1, 2, 3, 4, 5],
    category: 'narrative',
    description: 'Unlock an additional Aspect slot (available in Tiers 1–5).',
  },
  {
    type: 'new_discipline',
    label: 'Learn a New Discipline',
    shortLabel: 'Learn a New Discipline',
    maxPerTier: 1,
    tiers: [1, 2, 3, 4],
    category: 'mastery',
    requiresTarget: 'discipline',
    description: 'Adopt a new combat or mystical discipline (available in Tiers 1–4).',
  },
  {
    type: 'conviction_5',
    label: 'Increase a Conviction to Rank 5',
    shortLabel: 'Increase a Conviction to Rank 5',
    maxPerTier: 1,
    tiers: [4],
    category: 'narrative',
    requiresTarget: 'conviction',
    description: 'Elevate one of your Convictions to exceptional Rank 5 (Tier 4 only).',
  },
  {
    type: 'skill_5',
    label: 'Increase a Skill to Rank 5',
    shortLabel: 'Increase a Skill to Rank 5',
    maxPerTier: 1,
    tiers: [5],
    category: 'mastery',
    requiresTarget: 'skill',
    description: 'Elevate a Core or Special Skill to Rank 5 (Tier 5 only).',
  },
];

// Each level beyond Level 1 grants 2 advancements
export const getTotalAdvancementBudget = (level: number): number =>
  Math.max(0, (level - 1) * 2);

// Every 5 XP corresponds to 1 Level; every 4 Levels corresponds to 1 Tier
export const calculateLevelFromXp = (xp: number): number =>
  Math.max(1, Math.floor(Math.max(0, xp) / 5) + 1);

export const calculateTierFromLevel = (level: number): number =>
  Math.max(1, Math.floor((Math.max(1, level) - 1) / 4) + 1);

export const deriveLevelAndTierFromXp = (xp: number): { level: number; tier: number } => {
  const level = calculateLevelFromXp(xp);
  const tier = calculateTierFromLevel(level);
  return { level, tier };
};