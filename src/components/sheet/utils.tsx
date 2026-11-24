import {
  ATTRIBUTE_NAMES,
  ATTRIBUTE_DESCRIPTIONS,
  SKILL_GROUPS,
  SPECIAL_SKILL_ATTRIBUTES,
  SEASONS,
  CORE_SKILLS,
  SPECIAL_SKILLS,
} from '../../constants/reverie';
import { Tooltip } from '../common/Tooltip';
import type { Character } from '../../types';

export {
  ATTRIBUTE_NAMES,
  ATTRIBUTE_DESCRIPTIONS,
  SKILL_GROUPS,
  SPECIAL_SKILL_ATTRIBUTES,
  SEASONS,
  CORE_SKILLS,
  SPECIAL_SKILLS,
  Tooltip,
};

export const CORE_SKILL_DESCRIPTIONS: Record<string, string> = {
  Athletics: "Raw physicality. Your ability to influence the world with your body's power.",
  Brawling: "Hand-to-hand combat. Your unarmed combat prowess and the ability to intimidate others.",
  Endurance: "Bodily resilience. Your ability to withstand pain and various harsh conditions.",
  Dexterity: "Balance and coordination. Your ability to perform elegant and acrobatic movements.",
  Perception: "The senses. Your ability to detect things in your surroundings.",
  Stealth: "Elusiveness. Your ability to hide from others and pass unnoticed.",
  Knowledge: "The encyclopedia of facts. Your ability to recall basic information about the world.",
  Reasoning: "Critical thinking. Your ability to apply logic and notice patterns.",
  Survival: "Bodily familiarity. Your ability to perform first aid and take care of your needs.",
  Intuition: "Empathy. Your ability to sense the motivations of others.",
  Persuasion: "Charm. Your ability to negotiate and barter.",
  Willpower: "Mental resilience. Your ability to resist the will of others."
};

export const SPECIAL_SKILL_DESCRIPTIONS: Record<string, string> = {
  Carry: "Back strength. Your ability to carry heavy items and armour over a prolonged period.",
  Discipline: "Nerve and courage. Your ability to maintain a clear mind under physical pressure and duress.",
  Stance: "Posture. Your ability to grip items and avoid tripping.",
  Interface: "Sleight of hand. Your ability to perform precise hand movements like lockpicking.",
  Pilot: "Systemic coordination. Your ability to operate vehicles and siege weapons.",
  Scout: "Worldly navigation. Your ability to survey and quickly traverse areas.",
  Engineering: "Advanced problem solving. Your ability to apply scientific principles to complex tasks and craft items.",
  Lore: "Studied narratives. Your knowledge of the world's history, geography and the humanities.",
  Medicine: "Anatomy and herbalism. Your ability to mend injuries and brew concoctions.",
  Authority: "Soft force. Your ability to impose your will onto others.",
  Deception: "Dishonesty and composure. Your ability to lie and manipulate others.",
  Whisper: "Planar entanglement. Your ability to interact with non-humans and the unknowable."
};

export const SKILL_XP_COSTS = [1, 1, 2, 2, 3, 3, 4, 4];

export type OriginChoice = { id: string; label: string; options: string[]; type: 'inspiration' | 'starting'; rank?: number };
export const ORIGIN_CHOICES: Record<string, OriginChoice[]> = {
  'Commoner': [{ id: 'insp', label: 'Inspiration (Any basic skill)', options: CORE_SKILLS, type: 'inspiration' }, { id: 'start', label: 'Starting Skill (Any special skill at rank 2)', options: SPECIAL_SKILLS, type: 'starting', rank: 2 }],
  'Seeker': [{ id: 'insp', label: 'Inspiration (Any basic skill)', options: CORE_SKILLS, type: 'inspiration' }, { id: 'start', label: 'Starting Skill (Any special skill at rank 2)', options: SPECIAL_SKILLS, type: 'starting', rank: 2 }],
  'Artisan': [{ id: 'insp', label: 'Inspiration (Reasoning or Knowledge)', options: ['Reasoning', 'Knowledge'], type: 'inspiration' }],
  'Academa': [{ id: 'start', label: 'Starting Skill (Engineering, Lore, or Medicine at rank 3)', options: ['Engineering', 'Lore', 'Medicine'], type: 'starting', rank: 3 }]
};

export type OriginEffect = { inspiration?: string[]; starting?: Record<string, number>; specialAbilities?: string[] };
export const ORIGIN_EFFECTS: Record<string, OriginEffect> = {
  'Commoner': {}, 'Merchant': { inspiration: ['Persuasion', 'Knowledge'], starting: { 'Lore': 2 } }, 'Warrior': { inspiration: ['Athletics'], starting: { 'Carry': 2, 'Stance': 2 } }, 'Brigand': { inspiration: ['Dexterity', 'Stealth'], starting: { 'Interface': 2 } },
  'Scholar': { inspiration: ['Knowledge'], starting: { 'Lore': 3 } }, 'Seeker': { inspiration: ['Willpower'] }, 'Artisan': { inspiration: ['Reasoning', 'Knowledge'], starting: { 'Carry': 2, 'Engineering': 2 } }, 'City Bureaucrat': { inspiration: ['Intuition', 'Persuasion'], starting: { 'Deception': 2 } },
  'Memorialist': { inspiration: ['Intuition', 'Perception'], starting: { 'Lore': 2 } }, 'Fogborn': { inspiration: ['Survival'], starting: { 'Whisper': 2, 'Lore': 2 } }, 'Stormrider': { inspiration: ['Survival', 'Dexterity'], starting: { 'Pilot': 2 } }, 'Ravineborn': { inspiration: ['Endurance', 'Willpower'], starting: { 'Carry': 2 } },
  'Sky Raider': { inspiration: ['Brawling'], starting: { 'Stance': 2, 'Pilot': 2 } }, 'Wastelander': { inspiration: ['Survival', 'Endurance'], starting: { 'Carry': 2 } }, 'Steam Artificer': { inspiration: ['Reasoning'], starting: { 'Engineering': 2, 'Lore': 2 } }, 'Woodlands Survivor': { inspiration: ['Perception', 'Survival'], starting: { 'Whisper': 2 } },
  'Borderlands Settler': { inspiration: ['Athletics', 'Willpower'], starting: { 'Carry': 2 } }, 'Garrison Guard': { inspiration: ['Brawling', 'Intuition'], starting: { 'Authority': 2 } }, 'Scorchblade': { inspiration: ['Endurance'], starting: { 'Discipline': 2 }, specialAbilities: ['Duel'] }, 'Academa': { inspiration: ['Knowledge', 'Reasoning'] },
  'Coaster': { inspiration: ['Survival'], starting: { 'Pilot': 2, 'Carry': 2 } }, 'Vallentian': { inspiration: ['Intuition', 'Knowledge'], starting: { 'Lore': 2 } }, 'Sectarian': { inspiration: ['Stealth'], starting: { 'Scout': 2, 'Whisper': 2 } }, 'Circle Apostle': { inspiration: ['Perception'], starting: { 'Lore': 2, 'Medicine': 2 } },
  'Eye of The Lords': { inspiration: ['Reasoning', 'Stealth'], starting: { 'Authority': 2 } }, 'Tunnel Rat': { inspiration: ['Dexterity', 'Survival'], starting: { 'Interface': 2 } }, 'Clansman': { inspiration: ['Intuition', 'Knowledge'], starting: { 'Authority': 2 } }, 'Desert Skirmisher': { inspiration: ['Perception'], starting: { 'Scout': 2 }, specialAbilities: ['Precision'] },
  'Reformationist': { inspiration: ['Reasoning', 'Willpower'], starting: { 'Lore': 2 } }, 'Herd Nomad': { inspiration: ['Knowledge', 'Survival'], starting: { 'Whisper': 2 } },
};

export type Tab = 'gameplay' | 'narrative' | 'progression';
export type LevelUpTarget = { type: 'attribute'; key: keyof typeof ATTRIBUTE_NAMES } | { type: 'skill'; key: string } | { type: 'specialSkill'; index: number };

export const getMaxAttribute = (tier: number) => tier >= 5 ? 4 : tier >= 3 ? 3 : 2;
export const getMaxAttributePoints = (tier: number) => Math.min(5, Math.max(0, tier));
export const getSpentAttributePoints = (attributes: { grt: number, ref: number, int: number, psy: number }) => (attributes.grt - 1) + (attributes.ref - 1) + (attributes.int - 1) + (attributes.psy - 1);

export const getMinSkillRank = (skillName: string, char: Pick<Character, 'data'>) => {
  const origin = char?.data.identity.origin;
  if (!origin) return 0;
  let minRank = 0;
  const effects = ORIGIN_EFFECTS[origin];
  if (effects?.starting && effects.starting[skillName]) minRank = Math.max(minRank, effects.starting[skillName]);
  
  const choices = char?.data.identity.originChoices || {};
  Object.entries(choices).forEach(([choiceId, chosenSkill]) => {
    if (chosenSkill === skillName) {
      const choice = ORIGIN_CHOICES[origin]?.find((c: any) => c.id === choiceId);
      if (choice?.type === 'starting' && choice.rank) minRank = Math.max(minRank, choice.rank);
    }
  });
  return minRank;
};

export const getSpeedData = (speed?: string, upkeep?: string) => {
  let rawSpeed = speed || ''; let rawUpkeep = upkeep || '';
  if (rawSpeed.includes('/')) { const parts = rawSpeed.split('/'); rawSpeed = parts[0].trim(); rawUpkeep = parts[1] ? parts[1].trim() : rawUpkeep; }
  
  let speedLabel = ''; let speedTooltip = '';
  switch(rawSpeed) {
    case '>>>': speedLabel = '>>> Slow'; speedTooltip = 'Takes 3 action points to perform.'; break;
    case '>>': speedLabel = '>> Average'; speedTooltip = 'Takes 2 action points to perform.'; break;
    case '>': speedLabel = '> Swift'; speedTooltip = 'Takes 1 action point to perform.'; break;
    case '|': speedLabel = '| Instant'; speedTooltip = 'Takes 0 action points to perform.'; break;
    case '<': speedLabel = '< Reaction'; speedTooltip = 'Takes 1 reaction to perform.'; break;
    default: return null;
  }
  let upkeepLabel = ''; let upkeepTooltip = '';
  if (rawUpkeep) {
    switch(rawUpkeep) {
      case '>>>': upkeepLabel = '>>> Channeling'; upkeepTooltip = 'May be performed on following turns for 3 action points.'; break;
      case '>>': upkeepLabel = '>> Channeling'; upkeepTooltip = 'May be performed on following turns for 2 action points.'; break;
      case '>': upkeepLabel = '> Channeling'; upkeepTooltip = 'May be performed on following turns for 1 action point.'; break;
      case '|': upkeepLabel = '| Channeling'; upkeepTooltip = 'May be performed on following turns for 0 action points.'; break;
      default: upkeepLabel = `${rawUpkeep} Channeling`; upkeepTooltip = `Upkeep: ${rawUpkeep}`; break;
    }
  }
  return { speedLabel, speedTooltip, upkeepLabel, upkeepTooltip };
};

export const getTypeStyle = (type?: string) => {
  switch(type) {
    case 'attack': return 'rev-keep-color rev-dark-card bg-red-900/50 text-red-300 border-red-700';
    case 'defensive': return 'rev-keep-color rev-dark-card bg-blue-900/50 text-blue-300 border-blue-700';
    case 'utility': return 'rev-keep-color rev-dark-card bg-purple-900/50 text-purple-300 border-purple-700';
    default: return 'bg-gray-800 text-gray-300 border-gray-600';
  }
};

export const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="text-xl mb-4 border-b border-gray-700 pb-2 font-spectral first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200 shrink-0">
    {title}
  </h2>
);

export const ResourceBar = ({ current, max, color, overLimitColor }: { current: number, max: number, color: string, overLimitColor?: string }) => {
  const overLimit = Math.max(0, current - max);
  return (
    <div className="flex gap-1 w-full mt-1 mb-2">
      {Array.from({ length: max }).map((_, i) => {
        let barColor = 'bg-gray-700';
        if (i < current) { if (overLimitColor && i < overLimit) { barColor = overLimitColor; } else { barColor = color; } }
        return <div key={i} className={`h-3 flex-1 rounded-sm transition-colors duration-300 ease-in-out ${barColor}`} />;
      })}
    </div>
  );
};