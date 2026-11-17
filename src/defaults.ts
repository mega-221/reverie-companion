import type { CharacterData } from './types';

export function defaultCharacterData(): CharacterData {
  return {
    identity: { origin: '', className: '', path: '', quote: '', inspirations: [], originChoices: {} },
    progression: { tier: 2, level: 5, xp: 0 },
    attributes: { grt: 1, ref: 1, int: 1, psy: 1 },
    skills: {
      Athletics: 0, Brawling: 0, Endurance: 0,
      Dexterity: 0, Perception: 0, Stealth: 0,
      Knowledge: 0, Reasoning: 0, Survival: 0,
      Intuition: 0, Persuasion: 0, Willpower: 0,
    },
    specialSkills: [], convictions: [], failings: [], aspects: [], abilities: [], disciplines: [],
    items: [],
    possessions: [],
    equipment: {
      mainHand: '',
      mainHandMode: '',
      offHand: '',
      armour: '',
      extra: [],
    },
    bonus: { vm: 0, sl: 0, dp: 0, eva: 0 },
    trackers: { vigor: 6, strain: 0, dp: 3, ap: 0, acc: 0, injuries: [] },
    // ... existing defaults
    journal: [],
    relationships: [],
    notes: ''
  };
}