export type Character = {
  id: string;
  user_id: string;
  name: string;
  data: CharacterData;
  created_at: string;
  updated_at: string;
};

export type CharacterData = {
  identity: { origin: string; className: string; path: string; quote: string; inspirations: string[]; originChoices: Record<string, string> };
  progression: { tier: number; level: number; xp: number };
  attributes: { grt: number; ref: number; int: number; psy: number };
  skills: Record<string, number>;
  specialSkills: { name: string; rank: number; attribute: string }[];
  convictions: { season: string; name: string; statement: string; rank: number }[];
  failings: { name: string; rank: number; convictionIndex: number; statement: string }[];
  abilities: { name: string; equipped: boolean }[];
  disciplines: string[];
  items: { name: string; burden: number; qty: number; equipped: boolean }[];
  bonus: { vm: number; sl: number; dp: number; eva: number };
  trackers: {
    vigor: number; strain: number; dp: number; ap: number;
    injuries: { severity: number; part: string; weeksLeft: number }[];
  };
  notes: string;
};

export type CompendiumEntry = {
  id: string;
  type: string;
  name: string;
  data: {
    description?: string;
    // Ability specific fields
    type?: 'attack' | 'defensive' | 'utility';
    speed?: '>' | '>>' | '>>>' | '|' | '<';
    sn_cost?: number;
    class_rank?: number;
    requirement?: string;
    range?: 'Melee' | 'Ranged' | 'Melee/Ranged';
    acc?: string;
    dmg?: string;
    eva?: string;
    // Discipline/Class fields
    discipline?: string;
    archetype?: string;
    paths?: string[];
    // Other
    [key: string]: any;
  };
};