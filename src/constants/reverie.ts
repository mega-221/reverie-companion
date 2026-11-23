export type AttributeKey = 'grt' | 'ref' | 'int' | 'psy';

export const ATTRIBUTE_KEYS: readonly AttributeKey[] = ['grt', 'ref', 'int', 'psy'] as const;

export const ATTRIBUTE_NAMES: Record<AttributeKey, string> = {
  grt: 'Grit',
  ref: 'Reflex',
  int: 'Intellect',
  psy: 'Psyche',
};

export const ATTRIBUTE_DESCRIPTIONS: Record<AttributeKey, string> = {
  grt: 'Your physical body. The resilience and power of flesh and bone.',
  ref: 'Your uncontrolled impulses. The precise senses and natural instincts.',
  int: 'Your pointed mind. The library of knowledge and its application.',
  psy: 'Your own soul. The internal will and the poetry to communicate it.',
};

export const ATTRIBUTE_ACCENT_HEX: Record<AttributeKey, string> = {
  grt: '#ef4444',
  ref: '#10b981',
  int: '#3b82f6',
  psy: '#a855f7',
};

export const SKILL_GROUPS = {
  grt: {
    color: 'rev-keep-color text-red-500',
    border: 'rev-keep-color border-red-900',
    bg: 'rev-keep-color bg-red-950',
    skills: ['Athletics', 'Brawling', 'Endurance'],
  },
  ref: {
    color: 'rev-keep-color text-green-500',
    border: 'rev-keep-color border-green-900',
    bg: 'rev-keep-color bg-green-950',
    skills: ['Dexterity', 'Perception', 'Stealth'],
  },
  int: {
    color: 'rev-keep-color text-blue-500',
    border: 'rev-keep-color border-blue-900',
    bg: 'rev-keep-color bg-blue-950',
    skills: ['Knowledge', 'Reasoning', 'Survival'],
  },
  psy: {
    color: 'rev-keep-color text-purple-500',
    border: 'rev-keep-color border-purple-900',
    bg: 'rev-keep-color bg-purple-950',
    skills: ['Intuition', 'Persuasion', 'Willpower'],
  },
} as const;

export const SPECIAL_SKILL_ATTRIBUTES: Record<string, AttributeKey> = {
  Carry: 'grt',
  Discipline: 'grt',
  Stance: 'grt',
  Interface: 'ref',
  Pilot: 'ref',
  Scout: 'ref',
  Engineering: 'int',
  Lore: 'int',
  Medicine: 'int',
  Authority: 'psy',
  Deception: 'psy',
  Whisper: 'psy',
};

export const CORE_SKILLS = [
  'Athletics',
  'Brawling',
  'Endurance',
  'Dexterity',
  'Perception',
  'Stealth',
  'Knowledge',
  'Reasoning',
  'Survival',
  'Intuition',
  'Persuasion',
  'Willpower',
];

export const SPECIAL_SKILLS = [
  'Carry',
  'Discipline',
  'Stance',
  'Interface',
  'Pilot',
  'Scout',
  'Engineering',
  'Lore',
  'Medicine',
  'Authority',
  'Deception',
  'Whisper',
];

export const SEASONS = ['Vamor', 'Bruma', 'Trumst', 'Halice'] as const;

export function getSeasonHex(season?: string): string {
  switch (season) {
    case 'Vamor':
      return '#d93838';
    case 'Bruma':
      return '#e28927';
    case 'Trumst':
      return '#2864d1';
    case 'Halice':
      return '#21c15b';
    default:
      return '#9ca3af';
  }
}

export function getSeasonTextClass(season?: string): string {
  switch (season) {
    case 'Vamor':
      return 'rev-keep-color text-red-500';
    case 'Bruma':
      return 'rev-keep-color text-orange-400';
    case 'Trumst':
      return 'rev-keep-color text-blue-400';
    case 'Halice':
      return 'rev-keep-color text-green-500';
    default:
      return 'text-gray-300';
  }
}

export function getCoreSkillAttribute(skillName: string): AttributeKey {
  for (const attr of ATTRIBUTE_KEYS) {
    if ((SKILL_GROUPS[attr].skills as readonly string[]).includes(skillName)) {
      return attr;
    }
  }
  return 'grt';
}

export function splitLines(text?: string): string[] {
  if (!text) return [];
  return text.split(/\r?\n|\\n/);
}
