export type Character = {
  id: string;
  user_id: string;
  name: string;
  data: CharacterData;
  created_at: string;
  updated_at: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  customName?: string;
  qty: number;
  category?: string;
  subtype?: string;
  burden?: number;
  value?: number;
  req?: string;
  dmg?: string;
  range?: string;
  ammo?: string;
  effect?: string;
  season?: string;
  ability_access?: string;
  location?: string;
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
  items: InventoryItem[];
  possessions: InventoryItem[];
  equipment: {
    mainHand: string;
    mainHandMode: '1H' | '2H' | '';
    offHand: string;
    armour: string;
    extra: string[];
  };
  bonus: { vm: number; sl: number; dp: number; eva: number };
  trackers: {
    vigor: number; strain: number; dp: number; ap: number; acc: number;
    injuries: { 
      name: string; 
      affectedAttributes: string[]; 
      severity: number; 
      treatment: 'none' | 'survival' | 'medicine'; 
      weeksLeft: number; 
    }[];
  };
  notes: string;
};

export type CompendiumEntry = {
  id: string;
  type: string;
  name: string;
  data: {
    description?: string;
    type?: 'attack' | 'defensive' | 'utility';
    speed?: '>' | '>>' | '>>>' | '|' | '<';
    upkeep?: '>' | '>>' | '>>>' | '|' | '<';
    sn_cost?: number | string;
    class_rank?: number;
    requirement?: string;
    range?: string;
    acc?: string;
    dmg?: string;
    eva?: string;
    category?: string;
    subtype?: string;
    req?: string;
    effect?: string;
    value?: number;
    burden?: number;
    ammo?: string;
    season?: string;
    ability_access?: string;
    location?: string;
    [key: string]: any;
  };
};