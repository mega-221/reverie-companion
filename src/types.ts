import type { ReverieCalendarDate } from './reverieCalendar';

export type AllowedEditor = {
  user_id: string;
  username: string;
  email: string;
};

export type Character = {
  id: string;
  user_id: string;
  name: string;
  data: CharacterData;
  allowed_editors?: AllowedEditor[];
  created_at: string;
  updated_at: string;
};

export type Party = {
  id: string;
  name: string;
  description?: string;
  calendar_date?: ReverieCalendarDate | null;
  owner_id: string;
  created_at: string;
};

export type PartyMember = {
  id: string;
  party_id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'accepted';
};

export type PartyMessage = {
  id: string;
  party_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
};

export type PartyNotificationPayload = {
  id: string;
  partyId: string;
  partyName: string;
  senderName: string;
  targetUserIds: string[];
  type?: 'prompt' | 'give' | 'crisis' | 'item_transfer';
  title: string;
  message: string;
  skill?: string;
  challengeLevel?: number;
  grantResource?: 'xp' | 'dp';
  grantAmount?: number;
  itemTransfer?: {
    offerId: string;
    partyId: string;
    partyName: string;
    fromCharId: string;
    fromCharName: string;
    fromUserId: string;
    toCharId: string;
    toCharName: string;
    toUserId: string;
    item: InventoryItem;
  };
  createdAt: string;
};

export type PartyVitalsSyncPayload = {
  character_id: string;
  name?: string;
  vigor: number;
  vigorMax: number;
  strain: number;
  strainMax: number;
  dp: number;
  dpMax: number;
  ap: number;
  apMax: number;
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
  ap?: number;
  resists?: string;
  req?: string;
  dmg?: string;
  range?: string;
  ammo?: string;
  effect?: string;
  description?: string;
  season?: string;
  ability_access?: string;
  location?: string;
};

export type AdvancementType =
  | 'acc'
  | 'eva'
  | 'vl'
  | 'sl'
  | 'discipline_ability'
  | 'aspect_slot'
  | 'new_discipline'
  | 'conviction_5'
  | 'skill_5';

export type AdvancementSelection = {
  id: string;
  tier: number;
  type: AdvancementType;
  targetName?: string;
  slot?: number;
};

export type CharacterData = {
  identity: { origin: string; className: string; path: string; quote: string; inspirations: string[]; originChoices: Record<string, string> };
  progression: {
    tier: number;
    level: number;
    xp: number;
    spendableXp?: number;
    advancements?: AdvancementSelection[];
  };
  attributes: { grt: number; ref: number; int: number; psy: number };
  skills: Record<string, number>;
  specialSkills: { name: string; rank: number; attribute: string }[];
  convictions: { season: string; name: string; statement: string; rank: number }[];
  failings: { name: string; rank: number; convictionIndex: number; statement: string }[];
  aspects?: { id: string; name: string; abandoned?: boolean }[];
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
  bonus: { vm: number; sl: number; dp: number; eva: number; ap?: number };
  trackers: {
    vigor: number; strain: number; dp: number; ap: number; acc: number;
    apInitialized?: boolean;
    injuries: { 
      name: string; 
      affectedAttributes: string[]; 
      severity: number; 
      treatment: 'none' | 'survival' | 'medicine'; 
      weeksLeft: number; 
    }[];
  };
  notes: string;
  journal?: {
    id: string;
    date: string;
    title: string;
    content: string;
    inUniverseDate?: string;
  }[];
  relationships: { id: string; name: string; faction: string; role: string; description: string; }[];
  allowedEditors?: AllowedEditor[];
  dynamicTheme?: boolean;
};

export type CompendiumEntry = {
  id: string;
  type: string;
  name: string;
  data: {
    description?: string;
    type?: 'attack' | 'defensive' | 'utility' | 'passive';
    speed?: '>' | '>>' | '>>>' | '|' | '<';
    upkeep?: '>' | '>>' | '>>>' | '|' | '<';
    sn_cost?: number | string;
    class_rank?: number;
    requirement?: string;
    range?: string;
    acc?: string;
    dmg?: string;
    eva?: string;
    ap?: number;
    resists?: string;
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

export type NpcAbility = {
  id: string;
  name: string;
  type: 'attack' | 'defensive' | 'utility' | 'passive';
  speed: '>' | '>>' | '>>>' | '|' | '<' | '';
  upkeep?: '>' | '>>' | '>>>' | '|' | '<' | '';
  range?: string;
  snCost: number;
  acc?: string;
  dmg?: string;
  eva?: string;
  effect: string;
  sourceCompendiumName?: string;
};

export type NpcItem = InventoryItem & {
  equippedSlot?: 'mainHand' | 'offHand' | 'armour' | 'extra' | '';
  mainHandMode?: '1H' | '2H' | '';
};

export type CustomNpc = {
  id: string;
  name: string;
  role: string;
  className: string;
  path: string;
  tier: number;
  classRank: number;
  notes: string;
  stats: {
    vigorMax: number;
    strainMax: number;
    dpMax: number;
    apMax: number;
    eva: number;
    acc: number;
    mov: number;
    resists: string;
    armourName: string;
  };
  attributes: { grt: number; ref: number; int: number; psy: number };
  skills: Record<string, number>;
  convictions: { season: string; name: string; statement: string; rank: number }[];
  failings: { name: string; statement: string; rank: number }[];
  abilities: NpcAbility[];
  items: NpcItem[];
  createdAt: string;
  updatedAt: string;
};

export type CombatStatusKey =
  | 'pierce'
  | 'break'
  | 'stun'
  | 'bleeding'
  | 'burn'
  | 'soulburn'
  | 'tmv'
  | 'fractured'
  | 'prone'
  | 'feeble'
  | 'blind'
  | 'immobilized'
  | 'unaware'
  | 'stealth'
  | 'taunt'
  | 'intimidate';

export type CombatStatusInstance = {
  key: CombatStatusKey;
  stacks?: number;
};

export type CombatantSide = 'ally' | 'enemy';

export type CombatEquipmentItem = {
  id: string;
  slot: 'mainHand' | 'offHand' | 'armour' | 'extra' | 'carried';
  name: string;
  category?: string;
  subtype?: string;
  dmg?: string;
  range?: string;
  ap?: number;
  effect?: string;
};

export type CombatAbility = {
  id: string;
  name: string;
  sourceKind: 'basic' | 'class' | 'discipline' | 'npc';
  type: 'attack' | 'defensive' | 'utility' | 'passive';
  speed?: string;
  upkeep?: string;
  range?: string;
  requirement?: string;
  snCost: number;
  acc?: string;
  dmg?: string;
  eva?: string;
  effect: string;
  rankReq?: number;
  locked?: boolean;
};

export type Combatant = {
  id: string;
  side: CombatantSide;
  kind: 'pc' | 'npc';
  sourceCharacterId?: string;
  sourceNpcId?: string;
  name: string;
  subtitle: string;
  tier: number;
  classRank: number;
  attributes: { grt: number; ref: number; int: number; psy: number };
  vigor: number;
  vigorMax: number;
  strain: number;
  strainMax: number;
  dp: number;
  dpMax: number;
  ap: number;
  apMax: number;
  tmv: number;
  eva: number;
  acc: number;
  mov: number;
  armourPenalty: number;
  resists?: string;
  hasActed: boolean;
  moveUsed: boolean;
  acpRemaining: number;
  reactionUsed: boolean;
  statuses: CombatStatusInstance[];
  mainHandMode: '1H' | '2H';
  equipmentList: CombatEquipmentItem[];
  abilities: CombatAbility[];
};

export type CombatLogEntry = {
  id: string;
  round: number;
  text: string;
  tone?: 'neutral' | 'hit' | 'miss' | 'info';
  createdAt: string;
};

export type CombatEncounterState = {
  id: string;
  active: boolean;
  round: number;
  activeSide: CombatantSide;
  activeCombatantId: string | null;
  combatants: Combatant[];
  logs: CombatLogEntry[];
  updatedAt: string;
};