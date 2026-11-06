export type Character = {
  id: string;
  user_id: string;
  name: string;
  data: CharacterData;
  created_at: string;
  updated_at: string;
};

export type CharacterData = {
  identity: { origin: string; className: string; path: string; concept: string };
  progression: { tier: number; level: number; xp: number };
  attributes: { grt: number; ref: number; int: number; psy: number };
  skills: Record<string, number>;
  specialSkills: { name: string; rank: number; attribute: string }[];
  convictions: { season: string; name: string; statement: string; rank: number }[];
  failings: { name: string; rank: number; convictionIndex: number; statement: string }[];
  abilities: { name: string; equipped: boolean }[]; // Updated type
  items: { name: string; burden: number; qty: number; equipped: boolean }[];
  bonus: { vm: number; sl: number; dp: number; eva: number };
  trackers: {
    vigor: number; strain: number; dp: number; ap: number;
    injuries: { severity: number; part: string; weeksLeft: number }[];
  };
  notes: string;
};