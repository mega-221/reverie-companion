export type Character = {
  id: string;
  user_id: string;
  name: string;
  data: CharacterData;
  created_at: string;
  updated_at: string;
};

export type CharacterData = {
  identity: { origin: string; className: string; path: string; tier: number; level: number; xp: number; concept: string };
  attributes: { grt: number; ref: number; int: number; psy: number };
  skills: Record<string, number>;
  specialSkills: { name: string; rank: number; attribute: string }[]; // Added attribute
  convictions: { season: string; name: string; statement: string; rank: number }[];
  failings: { name: string; rank: number; convictionIndex: number; statement: string }[]; // Added statement
  abilities: string[];
  items: { name: string; burden: number; qty: number }[];
  bonus: { vm: number; sl: number; dp: number; eva: number };
  trackers: {
    vigor: number; strain: number; dp: number;
    injuries: { severity: number; part: string; weeksLeft: number }[];
  };
  notes: string;
};