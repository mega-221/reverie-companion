export type AttributeKey = 'grt' | 'ref' | 'int' | 'psy';
export type SeasonKey = 'vamor' | 'bruma' | 'trumst' | 'halice';

export const ATTRIBUTE_CSS_VAR: Record<AttributeKey, string> = {
  grt: 'var(--rev-attr-grt)',
  ref: 'var(--rev-attr-ref)',
  int: 'var(--rev-attr-int)',
  psy: 'var(--rev-attr-psy)',
};

export const SEASON_CSS_VAR: Record<SeasonKey, string> = {
  vamor: 'var(--rev-season-vamor)',
  bruma: 'var(--rev-season-bruma)',
  trumst: 'var(--rev-season-trumst)',
  halice: 'var(--rev-season-halice)',
};

export const SEASON_TERM_MAP: Record<string, SeasonKey> = {
  Vamor: 'vamor',
  vamor: 'vamor',
  Bruma: 'bruma',
  bruma: 'bruma',
  Trumst: 'trumst',
  trumst: 'trumst',
  Halice: 'halice',
  halice: 'halice',
};

export const CONVICTION_TERM_MAP: Record<string, SeasonKey> = {
  // Vamor
  Design: 'vamor',
  Ambition: 'vamor',
  Passion: 'vamor',
  Cunning: 'vamor',
  // Bruma
  Empathy: 'bruma',
  Altruism: 'bruma',
  Safety: 'bruma',
  Diligence: 'bruma',
  // Trumst
  Unity: 'trumst',
  Truth: 'trumst',
  Order: 'trumst',
  Curiosity: 'trumst',
  // Halice
  Beauty: 'halice',
  Freedom: 'halice',
  Survival: 'halice',
  Progress: 'halice',
};

export const ATTRIBUTE_TERM_MAP: Record<string, AttributeKey> = {
  // Attributes & abbreviations
  Grit: 'grt',
  GRT: 'grt',
  Reflex: 'ref',
  REF: 'ref',
  Intellect: 'int',
  INT: 'int',
  Psyche: 'psy',
  PSY: 'psy',

  // Grit Core & Special Skills
  Athletics: 'grt',
  Brawling: 'grt',
  Endurance: 'grt',
  Carry: 'grt',
  Discipline: 'grt',
  Stance: 'grt',

  // Reflex Core & Special Skills
  Dexterity: 'ref',
  Perception: 'ref',
  Stealth: 'ref',
  Interface: 'ref',
  Pilot: 'ref',
  Scout: 'ref',

  // Intellect Core & Special Skills
  Knowledge: 'int',
  Reasoning: 'int',
  Survival: 'int',
  Engineering: 'int',
  Lore: 'int',
  Medicine: 'int',

  // Psyche Core & Special Skills
  Intuition: 'psy',
  Persuasion: 'psy',
  Willpower: 'psy',
  Authority: 'psy',
  Deception: 'psy',
  Whisper: 'psy',
};

// Handle lowercase explicit mechanic phrases like "survival skill check" and "discipline skill check".
export const LOWERCASE_SKILL_PHRASES: Record<string, AttributeKey> = {
  'survival skill check': 'int',
  'discipline skill check': 'grt',
};

export function getAttributeForTerm(term: string): AttributeKey | null {
  if (ATTRIBUTE_TERM_MAP[term]) return ATTRIBUTE_TERM_MAP[term];
  const lower = term.toLowerCase();
  if (LOWERCASE_SKILL_PHRASES[lower]) return LOWERCASE_SKILL_PHRASES[lower];
  return null;
}

const ALL_TERM_KEYS = Array.from(
  new Set([
    ...Object.keys(LOWERCASE_SKILL_PHRASES),
    ...Object.keys(SEASON_TERM_MAP),
    ...Object.keys(CONVICTION_TERM_MAP),
    ...Object.keys(ATTRIBUTE_TERM_MAP),
  ])
).sort((a, b) => b.length - a.length);

export const UNIFIED_TERM_MATCH_REGEX = new RegExp(`\\b(${ALL_TERM_KEYS.join('|')})\\b`, 'g');
