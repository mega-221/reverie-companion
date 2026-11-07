import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Character, CompendiumEntry } from './types';
import { vigorMax, strainMax, dpMax, evasion, movementTiles, burdenMax, currentBurden } from './calc';
import { useCompendium } from './CompendiumContext';

const ATTRIBUTE_NAMES = {
  grt: 'Grit',
  ref: 'Reflex',
  int: 'Intellect',
  psy: 'Psyche'
};

const ATTRIBUTE_DESCRIPTIONS = {
  grt: "Grit: Your physical body. The resilience and power of flesh and bone.",
  ref: "Reflex: Your uncontrolled impulses. The precise senses and natural instincts.",
  int: "Intellect: Your pointed mind. The library of knowledge and its application.",
  psy: "Psyche: Your own soul. The internal will and the poetry to communicate it."
};

const SKILL_GROUPS = {
  grt: { color: 'text-red-500', border: 'border-red-900', bg: 'bg-red-950', skills: ['Athletics', 'Brawling', 'Endurance'] },
  ref: { color: 'text-green-500', border: 'border-green-900', bg: 'bg-green-950', skills: ['Dexterity', 'Perception', 'Stealth'] },
  int: { color: 'text-blue-500', border: 'border-blue-900', bg: 'bg-blue-950', skills: ['Knowledge', 'Reasoning', 'Survival'] },
  psy: { color: 'text-purple-500', border: 'border-purple-900', bg: 'bg-purple-950', skills: ['Intuition', 'Persuasion', 'Willpower'] },
} as const;

const CORE_SKILL_DESCRIPTIONS: Record<string, string> = {
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

const SPECIAL_SKILL_DESCRIPTIONS: Record<string, string> = {
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

const SPECIAL_SKILL_ATTRIBUTES: Record<string, 'grt' | 'ref' | 'int' | 'psy'> = {
  Carry: 'grt', Discipline: 'grt', Stance: 'grt', Armour: 'grt',
  Interface: 'ref', Pilot: 'ref', Scout: 'ref',
  Engineering: 'int', Lore: 'int', Medicine: 'int',
  Authority: 'psy', Deception: 'psy', Whisper: 'psy'
};

const SEASONS = ['Vamor', 'Bruma', 'Trumst', 'Halice'];

const CORE_SKILLS = ['Athletics', 'Brawling', 'Endurance', 'Dexterity', 'Perception', 'Stealth', 'Knowledge', 'Reasoning', 'Survival', 'Intuition', 'Persuasion', 'Willpower'];
const SPECIAL_SKILLS = ['Carry', 'Discipline', 'Stance', 'Interface', 'Pilot', 'Scout', 'Engineering', 'Lore', 'Medicine', 'Authority', 'Deception', 'Whisper'];

const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="text-xl mb-4 border-b border-gray-700 pb-2 font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200 shrink-0">
    {title}
  </h2>
);

const Tooltip = ({ text, children, className = "w-full", noBorder = false }: { text: string, children: React.ReactNode, className?: string, noBorder?: boolean }) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(false);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(140, Math.min(window.innerWidth - 140, rect.left + rect.width / 2));
    setCoords({ x, y: rect.top });
    setShow(true);
  };

  return (
    <div className={`relative inline-flex items-center cursor-help ${className}`} onMouseEnter={handleMouseEnter} onMouseLeave={() => setShow(false)}>
      <div className={`truncate w-full ${!noBorder ? 'border-b border-dotted border-gray-500' : ''}`}>
        {children}
      </div>
      {show && (
        <div 
          className="fixed z-[9999] w-64 -translate-x-1/2 -translate-y-full mb-2 p-2 bg-black text-gray-200 border border-gray-700 text-xs rounded shadow-xl pointer-events-none text-center leading-tight normal-case font-normal italic"
          style={{ left: coords.x, top: coords.y }}
        >
          {text || 'No description available.'}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
        </div>
      )}
    </div>
  );
};

const getSpeedData = (speed?: string, upkeep?: string) => {
  let rawSpeed = speed || '';
  let rawUpkeep = upkeep || '';
  
  // Fallback for unparsed database strings
  if (rawSpeed.includes('/')) {
    const parts = rawSpeed.split('/');
    rawSpeed = parts[0].trim();
    rawUpkeep = parts[1] ? parts[1].trim() : rawUpkeep;
  }

  let speedLabel = '';
  let speedTooltip = '';
  switch(rawSpeed) {
    case '>>>': speedLabel = '>>> Slow'; speedTooltip = 'Takes 3 action points to perform.'; break;
    case '>>': speedLabel = '>> Average'; speedTooltip = 'Takes 2 action points to perform.'; break;
    case '>': speedLabel = '> Swift'; speedTooltip = 'Takes 1 action point to perform.'; break;
    case '|': speedLabel = '| Instant'; speedTooltip = 'Takes 0 action points to perform.'; break;
    case '<': speedLabel = '< Reaction'; speedTooltip = 'Takes 1 reaction to perform.'; break;
    default: return null;
  }

  let upkeepLabel = '';
  let upkeepTooltip = '';
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

const getTypeStyle = (type?: string) => {
  switch(type) {
    case 'attack': return 'bg-red-900/50 text-red-300 border-red-700';
    case 'defensive': return 'bg-blue-900/50 text-blue-300 border-blue-700';
    case 'utility': return 'bg-purple-900/50 text-purple-300 border-purple-700';
    default: return 'bg-gray-800 text-gray-300 border-gray-600';
  }
};

// Segmented Resource Bar Component
const ResourceBar = ({ current, max, color, overLimitColor }: { current: number, max: number, color: string, overLimitColor?: string }) => {
  const overLimit = Math.max(0, current - max);
  
  return (
    <div className="flex gap-1 w-full mt-1 mb-2">
      {Array.from({ length: max }).map((_, i) => {
        let barColor = 'bg-gray-700';
        
        if (i < current) {
          // Turn the leftmost segments purple first
          if (overLimitColor && i < overLimit) {
            barColor = overLimitColor;
          } else {
            barColor = color;
          }
        }
        
        return (
          <div key={i} className={`h-3 flex-1 rounded-sm ${barColor}`} />
        );
      })}
    </div>
  );
};

type OriginChoice = { id: string; label: string; options: string[]; type: 'inspiration' | 'starting'; rank?: number };
const ORIGIN_CHOICES: Record<string, OriginChoice[]> = {
  'Commoner': [
    { id: 'insp', label: 'Inspiration (Any basic skill)', options: CORE_SKILLS, type: 'inspiration' },
    { id: 'start', label: 'Starting Skill (Any special skill at rank 2)', options: SPECIAL_SKILLS, type: 'starting', rank: 2 }
  ],
  'Seeker': [
    { id: 'insp', label: 'Inspiration (Any basic skill)', options: CORE_SKILLS, type: 'inspiration' },
    { id: 'start', label: 'Starting Skill (Any special skill at rank 2)', options: SPECIAL_SKILLS, type: 'starting', rank: 2 }
  ],
  'Artisan': [
    { id: 'insp', label: 'Inspiration (Reasoning or Knowledge)', options: ['Reasoning', 'Knowledge'], type: 'inspiration' }
  ],
  'Academa': [
    { id: 'start', label: 'Starting Skill (Engineering, Lore, or Medicine at rank 3)', options: ['Engineering', 'Lore', 'Medicine'], type: 'starting', rank: 3 }
  ]
};

type OriginEffect = { inspiration?: string[]; starting?: Record<string, number>; specialAbilities?: string[] };
const ORIGIN_EFFECTS: Record<string, OriginEffect> = {
  'Commoner': {},
  'Merchant': { inspiration: ['Persuasion', 'Knowledge'], starting: { 'Lore': 2 } },
  'Warrior': { inspiration: ['Athletics'], starting: { 'Armour': 2, 'Stance': 2 } },
  'Brigand': { inspiration: ['Dexterity', 'Stealth'], starting: { 'Interface': 2 } },
  'Scholar': { inspiration: ['Knowledge'], starting: { 'Lore': 3 } },
  'Seeker': { inspiration: ['Willpower'] },
  'Artisan': { inspiration: ['Reasoning', 'Knowledge'], starting: { 'Carry': 2, 'Engineering': 2 } },
  'City Bureaucrat': { inspiration: ['Intuition', 'Persuasion'], starting: { 'Deception': 2 } },
  'Memorialist': { inspiration: ['Intuition', 'Perception'], starting: { 'Lore': 2 } },
  'Fogborn': { inspiration: ['Survival'], starting: { 'Whisper': 2, 'Lore': 2 } },
  'Stormrider': { inspiration: ['Survival', 'Dexterity'], starting: { 'Pilot': 2 } },
  'Ravineborn': { inspiration: ['Endurance', 'Willpower'], starting: { 'Carry': 2 } },
  'Sky Raider': { inspiration: ['Brawling'], starting: { 'Stance': 2, 'Pilot': 2 } },
  'Wastelander': { inspiration: ['Survival', 'Endurance'], starting: { 'Carry': 2 } },
  'Steam Artificer': { inspiration: ['Reasoning'], starting: { 'Engineering': 2, 'Lore': 2 } },
  'Woodlands Survivor': { inspiration: ['Perception', 'Survival'], starting: { 'Whisper': 2 } },
  'Borderlands Settler': { inspiration: ['Athletics', 'Willpower'], starting: { 'Carry': 2 } },
  'Garrison Guard': { inspiration: ['Brawling', 'Intuition'], starting: { 'Authority': 2 } },
  'Scorchblade': { inspiration: ['Endurance'], starting: { 'Discipline': 2 }, specialAbilities: ['Duel'] },
  'Academa': { inspiration: ['Knowledge', 'Reasoning'] },
  'Coaster': { inspiration: ['Survival'], starting: { 'Pilot': 2, 'Carry': 2 } },
  'Vallentian': { inspiration: ['Intuition', 'Knowledge'], starting: { 'Lore': 2 } },
  'Sectarian': { inspiration: ['Stealth'], starting: { 'Scout': 2, 'Whisper': 2 } },
  'Circle Apostle': { inspiration: ['Perception'], starting: { 'Lore': 2, 'Medicine': 2 } },
  'Eye of The Lords': { inspiration: ['Reasoning', 'Stealth'], starting: { 'Authority': 2 } },
  'Tunnel Rat': { inspiration: ['Dexterity', 'Survival'], starting: { 'Interface': 2 } },
  'Clansman': { inspiration: ['Intuition', 'Knowledge'], starting: { 'Authority': 2 } },
  'Desert Skirmisher': { inspiration: ['Perception'], starting: { 'Scout': 2 }, specialAbilities: ['Precision'] },
  'Reformationist': { inspiration: ['Reasoning', 'Willpower'], starting: { 'Lore': 2 } },
  'Herd Nomad': { inspiration: ['Knowledge', 'Survival'], starting: { 'Whisper': 2 } },
};

type Tab = 'gameplay' | 'narrative' | 'progression';

export default function CharacterSheet({ id, onBack }: { id: string, onBack: () => void }) {
  const { 
    entries, getDisciplines, getAbilities, getClasses, getSpecialSkills, 
    getConvictions, getFailings, getEntryByName 
  } = useCompendium();
  
  const [char, setChar] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('gameplay');
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  const [expandedAbility, setExpandedAbility] = useState<number | null>(null);
  
  // Modals
  const [isAbilityModalOpen, setIsAbilityModalOpen] = useState(false);
  const [modalAbilityIndex, setModalAbilityIndex] = useState<number | null>(null);
  const [modalDiscipline, setModalDiscipline] = useState<string>('');
  const [expandedModalAbility, setExpandedModalAbility] = useState<string | null>(null);

  const [isSpecialSkillModalOpen, setIsSpecialSkillModalOpen] = useState(false);
  const [modalSpecialSkillIndex, setModalSpecialSkillIndex] = useState<number | null>(null);
  const [expandedSpecialSkill, setExpandedSpecialSkill] = useState<string | null>(null);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);

  const [isOriginModalOpen, setIsOriginModalOpen] = useState(false);
  const [modalOriginPlane, setModalOriginPlane] = useState<string>('Generic');
  const [expandedOrigin, setExpandedOrigin] = useState<string | null>(null);
  const [tempChoices, setTempChoices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAbilityModalOpen || isSpecialSkillModalOpen || isClassModalOpen || isOriginModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isAbilityModalOpen, isSpecialSkillModalOpen, isClassModalOpen, isOriginModalOpen]);

  useEffect(() => {
    supabase.from('characters').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (!data) return;
        const fetchedChar = data as Character;
        
        if (fetchedChar.data.abilities && fetchedChar.data.abilities.length > 0 && typeof fetchedChar.data.abilities[0] === 'string') {
          fetchedChar.data.abilities = (fetchedChar.data.abilities as unknown as string[]).map(name => ({ name, equipped: true }));
        }
        if (!fetchedChar.data.disciplines) {
          fetchedChar.data.disciplines = [];
        }
        if (!fetchedChar.data.identity.inspirations) {
          fetchedChar.data.identity.inspirations = [];
        }
        if (!fetchedChar.data.identity.originChoices) {
          fetchedChar.data.identity.originChoices = {};
        }
        setChar(fetchedChar);
      });
  }, [id]);

  if (!char) return <p className="text-gray-400 p-8 text-center font-cinzel text-xl h-screen flex items-center justify-center bg-gray-900">Loading character...</p>;

  function patch(p: Partial<Character['data']>) {
    setChar(c => c && { ...c, data: { ...c.data, ...p } });
    setSaved(false);
  }

  function updateTracker(key: 'vigor' | 'strain' | 'dp' | 'ap', amount: number) {
    if (!char) return;
    const current = char.data.trackers[key];
    
    let max = Infinity;
    if (key === 'vigor') max = vigorMax(char.data);
    if (key === 'strain') max = strainMax(char.data) * 2; 
    if (key === 'dp') max = dpMax(char.data);
    
    const nextVal = Math.max(0, Math.min(max, current + amount));
    patch({ trackers: { ...char.data.trackers, [key]: nextVal } });
  }

  // Helper to get the minimum skill rank based on Origin
  function getMinSkillRank(skillName: string) {
    const origin = char?.data.identity.origin;
    if (!origin) return 0;
    
    let minRank = 0;
    const effects = ORIGIN_EFFECTS[origin];
    if (effects?.starting && effects.starting[skillName]) {
      minRank = Math.max(minRank, effects.starting[skillName]);
    }
    
    const choices = char?.data.identity.originChoices || {};
    Object.entries(choices).forEach(([choiceId, chosenSkill]) => {
      if (chosenSkill === skillName) {
        const choice = ORIGIN_CHOICES[origin]?.find(c => c.id === choiceId);
        if (choice?.type === 'starting' && choice.rank) {
          minRank = Math.max(minRank, choice.rank);
        }
      }
    });
    
    return minRank;
  }

  async function save() {
    if (!char) return;
    setSaving(true);
    await supabase.from('characters').update({ data: char.data }).eq('id', char.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleNameSave() {
    if (!char || !tempName.trim() || tempName === char.name) {
      setIsEditingName(false);
      return;
    }
    setChar({ ...char, name: tempName });
    setIsEditingName(false);
    await supabase.from('characters').update({ name: tempName }).eq('id', char.id);
  }

  function openOriginModal() {
    setTempChoices(char?.data.identity.originChoices || {});
    const currentOrigin = allOrigins.find(o => o.name === char?.data.identity.origin);
    if (currentOrigin) {
      setModalOriginPlane(currentOrigin.data.plane || 'Generic');
      setExpandedOrigin(currentOrigin.id);
    } else {
      setExpandedOrigin(null);
    }
    setIsOriginModalOpen(true);
  }

  function applyOrigin(originName: string, choices: Record<string, string>) {
    const oldOriginName = char?.data.identity.origin;
    let newSkills = { ...char?.data.skills };
    let newSpecialSkills = [...(char?.data.specialSkills || [])];
    let newInspirations = [...(char?.data.identity.inspirations || [])];
    let newAbilities = [...(char?.data.abilities || [])];

    // 1. Revert Old Origin
    if (oldOriginName && oldOriginName !== originName) {
      const oldEffects = ORIGIN_EFFECTS[oldOriginName];

      if (oldEffects) {
        if (oldEffects.starting) {
          Object.entries(oldEffects.starting).forEach(([skill, rank]) => {
            newSkills[skill] = Math.max(0, (newSkills[skill] || 0) - rank);
            newSpecialSkills = newSpecialSkills.filter(s => s.name !== skill);
          });
        }
        if (oldEffects.inspiration) {
          oldEffects.inspiration.forEach(insp => {
            newInspirations = newInspirations.filter(i => i !== insp);
          });
        }
        if (oldEffects.specialAbilities) {
          oldEffects.specialAbilities.forEach(disc => {
            const abilitiesToRemove = getAbilities().filter(a => a.data.source === disc && (a.data.class_rank || 0) <= 1);
            newAbilities = newAbilities.filter(ab => !abilitiesToRemove.find(x => x.name === ab.name));
          });
        }
      }

      // Revert Choices
      const oldChoices = char?.data.identity.originChoices || {};
      Object.entries(oldChoices).forEach(([choiceId, skillName]) => {
        const choice = ORIGIN_CHOICES[oldOriginName]?.find(c => c.id === choiceId);
        if (choice) {
          if (choice.type === 'inspiration') {
            newInspirations = newInspirations.filter(i => i !== skillName);
          } else if (choice.type === 'starting') {
            newSkills[skillName] = Math.max(0, (newSkills[skillName] || 0) - (choice.rank || 0));
            newSpecialSkills = newSpecialSkills.filter(s => s.name !== skillName);
          }
        }
      });
    }

    // 2. Apply New Origin
    const effects = ORIGIN_EFFECTS[originName];
    if (effects) {
      if (effects.starting) {
        Object.entries(effects.starting).forEach(([skill, rank]) => {
          if (CORE_SKILLS.includes(skill)) {
            newSkills[skill] = Math.max(newSkills[skill] || 0, rank);
          } else {
            const existing = newSpecialSkills.find(s => s.name === skill);
            if (existing) {
              existing.rank = Math.max(existing.rank, rank);
            } else {
              const attr = SPECIAL_SKILL_ATTRIBUTES[skill] || 'grt';
              newSpecialSkills.push({ name: skill, rank, attribute: attr });
            }
          }
        });
      }
      if (effects.inspiration) {
        effects.inspiration.forEach(insp => {
          if (!newInspirations.includes(insp)) newInspirations.push(insp);
        });
      }
      if (effects.specialAbilities) {
        effects.specialAbilities.forEach(disc => {
          const abilitiesToAdd = getAbilities().filter(a => a.data.source === disc && (a.data.class_rank || 0) <= 1);
          abilitiesToAdd.forEach(ab => {
            if (newAbilities.length < 6 && !newAbilities.find(x => x.name === ab.name)) {
              newAbilities.push({ name: ab.name, equipped: true });
            }
          });
        });
      }
    }

    // 3. Apply Choices
    if (choices) {
      Object.entries(choices).forEach(([choiceId, skillName]) => {
        const choice = ORIGIN_CHOICES[originName]?.find(c => c.id === choiceId);
        if (choice) {
          if (choice.type === 'inspiration') {
            if (!newInspirations.includes(skillName)) newInspirations.push(skillName);
          } else if (choice.type === 'starting') {
            if (CORE_SKILLS.includes(skillName)) {
              newSkills[skillName] = Math.max(newSkills[skillName] || 0, choice.rank || 0);
            } else {
              const existing = newSpecialSkills.find(s => s.name === skillName);
              if (existing) {
                existing.rank = Math.max(existing.rank, choice.rank || 0);
              } else {
                const attr = SPECIAL_SKILL_ATTRIBUTES[skillName] || 'grt';
                newSpecialSkills.push({ name: skillName, rank: choice.rank || 0, attribute: attr });
              }
            }
          }
        }
      });
    }

    patch({ 
      identity: { ...char!.data.identity, origin: originName, inspirations: newInspirations, originChoices: choices }, 
      skills: newSkills,
      specialSkills: newSpecialSkills,
      abilities: newAbilities
    });
  }

  const currentBurdenVal = currentBurden(char.data);
  const maxBurdenVal = burdenMax(char.data);
  const isOverburdened = currentBurdenVal > maxBurdenVal;

  const selectedClassData = getEntryByName(char.data.identity.className);
  const equippedAbilities = char.data.abilities.filter(a => a.equipped).length;
  const charDisciplines = char.data.disciplines || [];

  const convictionNames = char.data.convictions.map(c => c.name).filter(Boolean).join(' • ');
  
  const allOrigins = entries.filter(e => e.type === 'origin');
  const PLANES = ['Generic', 'Eterion', 'Agmar', 'Vesperik', 'Duiber', 'Lior'];

  return (
    <div className="min-h-screen bg-gray-900 pb-20 font-sans text-gray-200">
      
      <header className="sticky top-0 z-40 bg-red-950 text-white shadow-md border-b border-red-900 w-full">
        <div className="w-full px-4 py-3 flex justify-between items-center overflow-x-hidden">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={onBack} className="text-red-300 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider flex items-center gap-2 shrink-0">
              ← Back
            </button>
            
            {isEditingName ? (
              <input
                type="text"
                className="text-2xl font-cinzel font-bold bg-red-900 text-white border-b-2 border-red-400 focus:outline-none px-2 py-1 rounded w-48 sm:w-64"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                autoFocus
              />
            ) : (
              <h1 
                onClick={() => { setTempName(char.name); setIsEditingName(true); }}
                className="text-2xl font-cinzel first-letter:font-cinzelDeco font-bold truncate cursor-pointer hover:text-red-200 transition-colors shrink-0 max-w-[200px] sm:max-w-xs"
                title="Click to rename"
              >
                {char.name || 'Unnamed Character'}
              </h1>
            )}

            <div className="hidden lg:block w-px h-5 bg-red-800 shrink-0"></div>

            <div className="hidden lg:flex items-center gap-3 text-sm italic text-red-200 truncate">
              {char.data.identity.className && (
                <span className="truncate">
                  {char.data.identity.className} {char.data.identity.path && `(${char.data.identity.path})`}
                </span>
              )}

              {char.data.identity.className && convictionNames && (
                <div className="w-px h-5 bg-red-800 shrink-0"></div>
              )}

              {convictionNames && (
                <span className="truncate">{convictionNames}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6 shrink-0 ml-4">
            <div className="hidden md:flex gap-4 lg:gap-6 text-sm font-bold">
              <span title="Vigor">VG: {char.data.trackers.vigor}/{vigorMax(char.data)}</span>
              <span title="Strain">SN: {char.data.trackers.strain}/{strainMax(char.data)}</span>
              <span title="Destiny">DP: {char.data.trackers.dp}/{dpMax(char.data)}</span>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold bg-red-900/50 px-3 py-1.5 rounded border border-red-800 shrink-0">
              <span>Tier {char.data.progression.tier}</span>
              <div className="w-px h-5 bg-red-800 shrink-0 mx-1"></div>
              <span>Lvl {char.data.progression.level}</span>
            </div>

            <button onClick={save} disabled={saving} 
              className={`px-4 py-1.5 rounded text-sm font-medium shadow-sm transition-colors ${saved ? 'bg-green-600' : 'bg-red-700 hover:bg-red-600'}`}>
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 pt-6">
        
        {activeTab === 'gameplay' && (
          <div className="w-full flex flex-col gap-6 animate-in fade-in duration-200">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full lg:h-[260px]">
              <section className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm flex flex-col min-h-0">
                <SectionHeader title="Identity" />
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                  <label className="flex flex-col text-sm font-bold text-gray-400 shrink-0">Origin
                    <div 
                      className="border border-gray-600 bg-gray-900 p-2 rounded mt-1 font-normal text-sm w-full text-gray-200 cursor-pointer flex justify-between items-center hover:border-gray-500 transition-colors"
                      onClick={openOriginModal}
                    >
                      <span className="truncate">{char.data.identity.origin || "— Select Origin —"}</span>
                      <span className="text-gray-500 text-[10px]">▼</span>
                    </div>
                  </label>
                  
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="text-sm font-normal text-gray-400 italic border-l-2 border-gray-600 pl-3 py-1 leading-relaxed">
                      {getEntryByName(char.data.identity.origin)?.data?.lore || 'Select an origin to view its lore.'}
                    </div>
                  </div>
                </div>
              </section>

              <div className="border border-red-900 bg-red-950/40 rounded-xl p-5 flex flex-col justify-center gap-4 shadow-sm h-full">
                
                {/* Vigor */}
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between gap-4 w-full">
                    <span className="font-bold text-red-400 uppercase tracking-widest text-sm w-20 shrink-0">Vigor</span>
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm flex-1 h-10">
                      <button onClick={() => updateTracker('vigor', -1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-l-lg font-bold shrink-0">−</button>
                      <div className="flex-1 text-center font-bold text-xl text-white">{char.data.trackers.vigor} <span className="text-sm text-gray-500 font-normal">/ {vigorMax(char.data)}</span></div>
                      <button onClick={() => updateTracker('vigor', 1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-r-lg font-bold shrink-0">+</button>
                    </div>
                  </div>
                  <ResourceBar current={char.data.trackers.vigor} max={vigorMax(char.data)} color="bg-red-500" />
                </div>

                {/* Strain */}
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between gap-4 w-full">
                    <span className="font-bold text-red-400 uppercase tracking-widest text-sm w-20 shrink-0">Strain</span>
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm flex-1 h-10">
                      <button onClick={() => updateTracker('strain', -1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-l-lg font-bold shrink-0">−</button>
                      <div className="flex-1 text-center font-bold text-xl text-white">{char.data.trackers.strain} <span className="text-sm text-gray-500 font-normal">/ {strainMax(char.data)}</span></div>
                      <button onClick={() => updateTracker('strain', 1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-r-lg font-bold shrink-0">+</button>
                    </div>
                  </div>
                  <ResourceBar current={char.data.trackers.strain} max={strainMax(char.data)} color="bg-blue-500" overLimitColor="bg-purple-600" />
                </div>

                {/* Destiny */}
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between gap-4 w-full">
                    <span className="font-bold text-red-400 uppercase tracking-widest text-sm w-20 shrink-0">Destiny</span>
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm flex-1 h-10">
                      <button onClick={() => updateTracker('dp', -1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-l-lg font-bold shrink-0">−</button>
                      <div className="flex-1 text-center font-bold text-xl text-white">{char.data.trackers.dp} <span className="text-sm text-gray-500 font-normal">/ {dpMax(char.data)}</span></div>
                      <button onClick={() => updateTracker('dp', 1)} className="w-10 h-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-r-lg font-bold shrink-0">+</button>
                    </div>
                  </div>
                  <ResourceBar current={char.data.trackers.dp} max={dpMax(char.data)} color="bg-yellow-500" />
                </div>

              </div>

              <div className="border border-gray-700 rounded-xl bg-gray-800 p-5 shadow-sm grid grid-cols-2 gap-4 text-center items-center h-full">
                <div><div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Evasion</div><div className="font-bold text-3xl text-white">{evasion(char.data)}</div></div>
                <div><div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Movement</div><div className="font-bold text-3xl text-white">{movementTiles(char.data)}</div></div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Armour</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateTracker('ap', -1)} className="text-gray-500 hover:text-white font-bold">−</button>
                    <input type="number" className="border-b-2 border-gray-600 p-0 w-10 text-center font-bold text-3xl focus:outline-none focus:border-red-500 bg-transparent text-white" 
                      value={char.data.trackers.ap} onChange={e => patch({ trackers: { ...char.data.trackers, ap: +e.target.value } })} />
                    <button onClick={() => updateTracker('ap', 1)} className="text-gray-500 hover:text-white font-bold">+</button>
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Burden</div>
                  <div className={`font-bold text-3xl ${isOverburdened ? 'text-red-500' : 'text-white'}`}>
                    {currentBurdenVal} <span className="text-sm text-gray-500 font-normal">/ {maxBurdenVal}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start">
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {(Object.keys(SKILL_GROUPS) as Array<keyof typeof SKILL_GROUPS>).map(attr => {
                  const group = SKILL_GROUPS[attr];
                  const attrVal = char.data.attributes[attr];
                  return (
                    <div key={attr} className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm flex flex-col min-w-0">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-3">
                        <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr]} className="w-auto">
                          <span className={`text-2xl font-cinzel first-letter:font-cinzelDeco uppercase tracking-widest ${group.color}`}>
                            {ATTRIBUTE_NAMES[attr]}
                          </span>
                        </Tooltip>
                        <input type="number" min={1} max={4} className={`border-b-2 ${group.color} border-gray-600 p-1 w-12 text-center font-bold text-xl focus:outline-none bg-transparent text-white`} 
                          value={attrVal} onChange={e => patch({ attributes: { ...char.data.attributes, [attr]: Math.min(4, Math.max(1, +e.target.value)) } })} />
                      </div>
                      <div className="space-y-2 flex-1">
                        {group.skills.map(skill => {
                          const originMin = getMinSkillRank(skill);
                          const attributeMax = Math.min(8, attrVal * 2);
                          const maxSkill = Math.max(originMin, attributeMax);
                          const minSkill = originMin;
                          const currentSkill = char.data.skills[skill] ?? 0;
                          const isInspired = char.data.identity.inspirations?.includes(skill);
                          
                          return (
                            <div key={skill} className="flex justify-between items-center text-sm w-full">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Tooltip text={CORE_SKILL_DESCRIPTIONS[skill]} className="w-auto">
                                  <span className="font-medium text-gray-300">{skill}</span>
                                </Tooltip>
                                {isInspired && (
                                  <Tooltip text={`Inspiration: ${char.data.identity.origin}`} noBorder className="w-auto shrink-0">
                                    <span className="text-yellow-500 text-xs cursor-help">★</span>
                                  </Tooltip>
                                )}
                                {minSkill > 0 && (
                                  <Tooltip text={`Minimum bound: ${minSkill} (from Origin)`} noBorder className="w-auto shrink-0">
                                    <span className="text-gray-500 text-[10px] cursor-help">🔒</span>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <span className="text-gray-500 font-bold text-xs">+</span>
                                <input type="number" min={minSkill} max={maxSkill} className="border border-gray-600 bg-gray-900 p-1 w-10 text-center rounded shadow-sm focus:outline-none focus:border-red-500 font-bold text-white" 
                                  value={Math.max(minSkill, currentSkill)} onChange={e => patch({ skills: { ...char.data.skills, [skill]: Math.min(maxSkill, Math.max(minSkill, +e.target.value)) } })} />
                                <span className="text-gray-500 text-xs font-bold w-5 text-right">/ {maxSkill}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="lg:col-span-1 bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm h-fit">
                <SectionHeader title="Special Skills" />
                <div className="space-y-2">
                  {char.data.specialSkills.map((s, i) => {
                    const compendiumEntry = getEntryByName(s.name);
                    const attr = compendiumEntry?.data?.attribute || 'grt'; 
                    const originMin = getMinSkillRank(s.name);
                    const attributeMax = Math.min(8, char.data.attributes[attr as keyof typeof char.data.attributes] * 2);
                    const maxSkill = Math.max(originMin, attributeMax);
                    const minSkill = originMin;
                    const isInspired = char.data.identity.inspirations?.includes(s.name);

                    return (
                      <div key={i} className="flex items-center gap-1 w-full bg-gray-900 border border-gray-700 rounded-lg p-1">
                        <div className="flex-1 min-w-0 flex items-center pl-1">
                          <div 
                            className={`bg-transparent border-none text-sm text-gray-200 flex justify-between items-center flex-1 min-w-0 ${minSkill > 0 ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}
                            onClick={() => {
                              if (minSkill > 0) return;
                              setModalSpecialSkillIndex(i);
                              setExpandedSpecialSkill(null);
                              setIsSpecialSkillModalOpen(true);
                            }}
                          >
                            <span className="truncate">{s.name || "— Select Skill —"}</span>
                            {minSkill === 0 && <span className="text-gray-500 text-[10px] mr-1">▼</span>}
                          </div>
                          {isInspired && (
                            <Tooltip text={`Inspiration: ${char.data.identity.origin}`} noBorder className="w-auto shrink-0 mr-1">
                              <span className="text-yellow-500 text-xs cursor-help">★</span>
                            </Tooltip>
                          )}
                          {minSkill > 0 && (
                            <Tooltip text={`Minimum bound: ${minSkill} (from Origin)`} noBorder className="w-auto shrink-0 mr-1">
                              <span className="text-gray-500 text-[10px] cursor-help">🔒</span>
                            </Tooltip>
                          )}
                        </div>
                        <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr as keyof typeof ATTRIBUTE_DESCRIPTIONS]} className="w-auto shrink-0">
                          <span className={`text-[9px] font-bold uppercase ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color} border border-current px-1 py-0.5 rounded`}>{attr.toUpperCase()}</span>
                        </Tooltip>
                        <div className="flex items-center shrink-0">
                          <input type="number" min={minSkill} max={maxSkill} className="bg-transparent text-right w-8 font-bold text-sm text-white focus:outline-none" 
                            value={Math.max(minSkill, s.rank)} onChange={e => { 
                              const next = [...char.data.specialSkills]; 
                              next[i] = { ...next[i], rank: Math.min(maxSkill, Math.max(minSkill, +e.target.value)) }; 
                              patch({ specialSkills: next }); 
                            }} />
                          <span className="text-gray-500 text-xs font-bold mr-1">/ {maxSkill}</span>
                        </div>
                        {minSkill === 0 ? (
                          <button className="text-red-500 hover:text-red-400 font-bold px-1 text-sm shrink-0 border-l border-gray-700 pl-2" onClick={() => patch({ specialSkills: char.data.specialSkills.filter((_, j) => j !== i) })}>×</button>
                        ) : (
                          <div className="px-2 shrink-0 border-l border-gray-700 text-gray-500 text-xs flex items-center justify-center" title="Locked by Origin">
                            🔒
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {char.data.specialSkills.length < 5 && (
                    <button className="border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 w-full text-gray-400 font-medium mt-2 transition-colors" 
                      onClick={() => patch({ specialSkills: [...char.data.specialSkills, { name: '', rank: 0, attribute: 'grt' }] })}>+ add special skill</button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
              
              <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
                <SectionHeader title="Class & Path" />
                <div className="space-y-4 mb-6">
                  <div className="flex flex-col">
                    {selectedClassData ? (
                      <span className="text-xs text-gray-400 italic tracking-widest mb-1">{selectedClassData.data.archetype}</span>
                    ) : <div className="h-4 mb-1"></div>}
                    <div 
                      className="border border-gray-600 bg-gray-900 p-2.5 rounded-lg font-normal shadow-sm w-full font-bold text-gray-200 text-lg cursor-pointer flex justify-between items-center hover:border-gray-500 transition-colors"
                      onClick={() => setIsClassModalOpen(true)}
                    >
                      <span>{char.data.identity.className || "— Select Class —"}</span>
                      <span className="text-gray-500 text-sm">▼</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 italic tracking-widest h-4 mb-1">
                       {char.data.identity.className ? 'Path' : '\u00A0'}
                    </span>
                    <select className="border border-gray-600 bg-gray-900 p-2.5 rounded-lg font-normal shadow-sm disabled:opacity-50 focus:outline-none focus:border-red-500 w-full font-bold text-gray-200 text-lg" value={char.data.identity.path} disabled={!char.data.identity.className}
                      onChange={e => patch({ identity: { ...char.data.identity, path: e.target.value } })}>
                      <option value="">— Select Path —</option>
                      {(selectedClassData?.data?.paths || []).map((p: string) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <SectionHeader title="Disciplines" />
                <div className="space-y-2">
                  {charDisciplines.map((d, i) => (
                    <div key={i} className="flex gap-2 items-center w-full">
                      <select className="border border-gray-600 bg-gray-900 p-2 rounded-lg font-normal shadow-sm focus:outline-none focus:border-red-500 flex-1 text-sm w-full text-gray-200" value={d}
                        onChange={e => {
                          const next = [...charDisciplines];
                          next[i] = e.target.value;
                          patch({ disciplines: next });
                        }}>
                        <option value="">— Select Discipline —</option>
                        {getDisciplines().map(disc => <option key={disc.id} value={disc.name}>{disc.name}</option>)}
                      </select>
                      <button className="px-2 text-red-500 font-bold text-lg hover:text-red-400 shrink-0" onClick={() => patch({ disciplines: charDisciplines.filter((_, j) => j !== i) })}>×</button>
                    </div>
                  ))}
                  {charDisciplines.length < 5 && (
                    <button className="border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 w-full mt-2 text-gray-400 font-medium transition-colors" 
                      onClick={() => patch({ disciplines: [...charDisciplines, ''] })}>+ add discipline</button>
                  )}
                </div>
              </section>

              <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full lg:col-span-2">
                <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-2">
                  <h3 className="font-bold text-xl font-cinzel first-letter:font-cinzelDeco text-gray-200">Active Abilities</h3>
                  <span className="text-xs text-gray-300 font-bold bg-gray-900 px-2 py-0.5 rounded border border-gray-700">Active: {equippedAbilities}/6</span>
                </div>
                
                <div className="space-y-2">
                  {char.data.abilities.map((a, i) => {
                    const compendiumEntry = getEntryByName(a.name);
                    const isExpanded = expandedAbility === i;
                    const speedData = compendiumEntry?.data?.speed ? getSpeedData(compendiumEntry.data.speed, compendiumEntry.data.upkeep) : null;

                    const statsToShow = [];
                    if (compendiumEntry) {
                      statsToShow.push({ label: 'Strain', value: `${compendiumEntry.data.sn_cost ?? 0} SN`, color: 'text-blue-400' });
                      if (compendiumEntry.data.type === 'attack') {
                        statsToShow.push({ label: 'Accuracy', value: compendiumEntry.data.acc ?? '+0', color: 'text-green-400' });
                        statsToShow.push({ label: 'Damage', value: compendiumEntry.data.dmg ?? '+0', color: 'text-red-400' });
                      }
                      if (compendiumEntry.data.type === 'defensive') {
                        statsToShow.push({ label: 'Evasion', value: compendiumEntry.data.eva ?? '+0', color: 'text-purple-400' });
                      }
                      statsToShow.push({ label: 'Requires', value: compendiumEntry.data.requirement || 'None', color: 'text-gray-300' });
                    }

                    return (
                      <div key={i} className={`bg-gray-900 border border-gray-700 rounded-lg transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                        
                        <div 
                          className={`flex flex-wrap gap-3 items-center p-2 cursor-pointer select-none hover:bg-gray-800/50 transition-colors ${isExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}
                          onClick={() => setExpandedAbility(isExpanded ? null : i)}
                        >
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 cursor-pointer accent-red-600 shrink-0 ml-1" 
                            checked={a.equipped} 
                            disabled={!a.equipped && equippedAbilities >= 6}
                            onClick={(e) => e.stopPropagation()}
                            onChange={e => { const next = [...char.data.abilities]; next[i] = { ...next[i], equipped: e.target.checked }; patch({ abilities: next }); }} 
                          />
                          
                          <div 
                            className="w-full sm:w-[260px] shrink-0 bg-gray-800 border border-gray-600 rounded-md py-1.5 px-2 text-sm font-bold text-gray-200 cursor-pointer flex justify-between items-center hover:border-gray-500 transition-colors"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setModalAbilityIndex(i); 
                              setModalDiscipline(''); 
                              setExpandedModalAbility(null);
                              setIsAbilityModalOpen(true); 
                            }}
                          >
                            <span className="truncate">{a.name || "— Select Ability —"}</span>
                            <span className="text-gray-500 text-[10px]">▼</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 items-center mr-2 flex-1">
                            {compendiumEntry?.data?.type && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(compendiumEntry.data.type)}`}>
                                {compendiumEntry.data.type}
                              </span>
                            )}
                            
                            {speedData && (
                              <>
                                <div className="relative group inline-flex items-center">
                                  <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600 cursor-help">
                                    {speedData.speedLabel}
                                  </span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-gray-200 border border-gray-700 text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none text-center leading-tight normal-case font-normal italic">
                                    {speedData.speedTooltip}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                                  </div>
                                </div>
                                
                                {speedData.upkeepLabel && (
                                  <div className="relative group inline-flex items-center">
                                    <span className="bg-teal-900/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-700/50 cursor-help">
                                      {speedData.upkeepLabel}
                                    </span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-gray-200 border border-gray-700 text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none text-center leading-tight normal-case font-normal italic">
                                      {speedData.upkeepTooltip}
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {compendiumEntry?.data?.range && (
                              <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">
                                {compendiumEntry.data.range}
                              </span>
                            )}

                            {compendiumEntry?.data?.class_rank !== undefined && (
                              <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">
                                Rank {compendiumEntry.data.class_rank}
                              </span>
                            )}

                            {compendiumEntry?.data?.source && (
                              <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">
                                {compendiumEntry.data.source}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center shrink-0 ml-auto">
                            <span className="px-2 text-gray-500 hover:text-white font-bold">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                            <button 
                              className="px-2 text-red-500 font-bold text-lg hover:text-red-400 border-l border-gray-700 pl-3" 
                              onClick={(e) => { e.stopPropagation(); patch({ abilities: char.data.abilities.filter((_, j) => j !== i) }); }}
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        {isExpanded && compendiumEntry && (
                          <div className="p-4 border-t border-gray-800 bg-black/40 text-sm text-gray-300 rounded-b-lg">
                            
                            <div className="flex flex-wrap justify-between gap-2 mb-3 bg-gray-900/50 p-2 rounded border border-gray-800 shadow-inner text-center">
                              {statsToShow.map((stat, idx) => (
                                <div key={idx} className={`flex-1 flex flex-col items-center justify-center min-w-[80px] ${idx !== statsToShow.length - 1 ? 'border-r border-gray-700' : ''}`}>
                                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</span>
                                  <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                                </div>
                              ))}
                            </div>

                            <p className="italic text-gray-400 border-l-2 border-gray-700 pl-3 mt-4">
                              {compendiumEntry.data.description || 'No description provided.'}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button className="border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 w-full mt-2 text-gray-400 font-medium transition-colors" onClick={() => patch({ abilities: [...char.data.abilities, { name: '', equipped: false }] })}>+ add ability</button>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
                <SectionHeader title="Inventory" />
                <div className="overflow-x-auto rounded-xl border border-gray-700 shadow-sm w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                        <th className="p-3 font-bold">Item Name</th>
                        <th className="p-3 font-bold w-20 text-center">Burden</th>
                        <th className="p-3 font-bold w-20 text-center">Qty</th>
                        <th className="p-3 font-bold w-20 text-center">Equipped</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {char.data.items.map((it, i) => (
                        <tr key={i} className="hover:bg-gray-700/30 border-b border-gray-700/50 last:border-0">
                          <td className="p-2"><input className="w-full bg-transparent focus:outline-none p-1 text-gray-200" placeholder="Item name..." value={it.name} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], name: e.target.value }; patch({ items: n }); }} /></td>
                          <td className="p-2 text-center"><input type="number" className="w-14 border border-gray-600 rounded p-1.5 text-center bg-gray-900 shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={it.burden} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], burden: +e.target.value }; patch({ items: n }); }} /></td>
                          <td className="p-2 text-center"><input type="number" className="w-14 border border-gray-600 rounded p-1.5 text-center bg-gray-900 shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={it.qty} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], qty: +e.target.value }; patch({ items: n }); }} /></td>
                          <td className="p-2 text-center">
                            <input type="checkbox" className="w-5 h-5 cursor-pointer accent-red-600" checked={it.equipped} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], equipped: e.target.checked }; patch({ items: n }); }} />
                          </td>
                          <td className="p-2 text-center"><button className="text-red-500 font-bold text-lg hover:text-red-400" onClick={() => patch({ items: char.data.items.filter((_, j) => j !== i) })}>×</button></td>
                        </tr>
                      ))}
                      {char.data.items.length === 0 && (
                        <tr><td colSpan={5} className="p-6 text-center text-gray-500 italic text-sm">No items in inventory.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <button className="mt-4 border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 font-bold text-gray-300 shadow-sm transition-colors" onClick={() => patch({ items: [...char.data.items, { name: '', burden: 0, qty: 1, equipped: false }] })}>+ Add Item</button>
              </section>

              <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
                <SectionHeader title="Injuries" />
                <div className="overflow-x-auto rounded-xl border border-gray-700 shadow-sm w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                        <th className="p-3 font-bold">Injury Name</th>
                        <th className="p-3 font-bold w-20 text-center whitespace-nowrap">Severity</th>
                        <th className="p-3 font-bold w-20 text-center whitespace-nowrap">Weeks</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {char.data.trackers.injuries.map((inj, i) => (
                        <tr key={i} className="hover:bg-gray-700/30 border-b border-gray-700/50 last:border-0">
                          <td className="p-2">
                            <input className="w-full bg-transparent focus:outline-none p-1 text-gray-200" placeholder="Injury name..." value={inj.part} 
                              onChange={e => { const n = [...char.data.trackers.injuries]; n[i] = { ...n[i], part: e.target.value }; patch({ trackers: { ...char.data.trackers, injuries: n } }); }} />
                          </td>
                          <td className="p-2 text-center">
                            <input type="number" className="w-14 border border-gray-600 rounded p-1.5 text-center bg-gray-900 shadow-sm focus:outline-none focus:border-red-500 text-gray-200" title="Severity" value={inj.severity} 
                              onChange={e => { const n = [...char.data.trackers.injuries]; n[i] = { ...n[i], severity: +e.target.value }; patch({ trackers: { ...char.data.trackers, injuries: n } }); }} />
                          </td>
                          <td className="p-2 text-center">
                            <input type="number" className="w-14 border border-gray-600 rounded p-1.5 text-center bg-gray-900 shadow-sm focus:outline-none focus:border-red-500 text-gray-200" title="Weeks" value={inj.weeksLeft} 
                              onChange={e => { const n = [...char.data.trackers.injuries]; n[i] = { ...n[i], weeksLeft: +e.target.value }; patch({ trackers: { ...char.data.trackers, injuries: n } }); }} />
                          </td>
                          <td className="p-2 text-center">
                            <button className="text-red-500 font-bold text-lg hover:text-red-400" onClick={() => {
                              const n = char.data.trackers.injuries.filter((_, j) => j !== i);
                              patch({ trackers: { ...char.data.trackers, injuries: n } });
                            }}>×</button>
                          </td>
                        </tr>
                      ))}
                      {char.data.trackers.injuries.length === 0 && (
                        <tr><td colSpan={4} className="p-6 text-center text-gray-500 italic text-sm">No active injuries.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <button className="mt-4 border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 font-bold text-gray-300 shadow-sm transition-colors" 
                  onClick={() => { const n = [...char.data.trackers.injuries, { part: '', severity: 1, weeksLeft: 0 }]; patch({ trackers: { ...char.data.trackers, injuries: n } }); }}>
                  + Add Injury
                </button>
              </section>
            </div>

          </div>
        )}

        {activeTab === 'narrative' && (
          <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
            <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
              <SectionHeader title="Convictions & Failings" />
              <div className="space-y-4 w-full">
                {[...Array(3)].map((_, i) => {
                  const conviction = char.data.convictions[i];
                  const failing = char.data.failings.find(f => f.convictionIndex === i);
                  if (!conviction && !failing) return null;

                  const compendiumConviction = getEntryByName(conviction?.name || '');
                  const compendiumFailing = getEntryByName(failing?.name || '');

                  return (
                    <div key={i} className="flex flex-col lg:flex-row gap-4 w-full">
                      {conviction && (
                        <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-900 shadow-sm flex-1 relative">
                          <div className="flex flex-col gap-2 mb-2 w-full">
                            <div className="flex gap-2 w-full">
                              <select className="border border-gray-600 bg-gray-900 p-1.5 rounded text-sm shadow-sm focus:outline-none text-gray-200 shrink-0" value={conviction.season} onChange={e => { 
                                const next = [...char.data.convictions]; next[i] = { ...next[i], season: e.target.value, name: '', statement: '' }; patch({ convictions: next }); 
                              }}>
                                {SEASONS.map(s => <option key={s}>{s}</option>)}
                              </select>
                              <select className="border border-gray-600 bg-gray-900 p-1.5 rounded text-sm shadow-sm focus:outline-none text-gray-200 flex-1 min-w-0" value={conviction.name} onChange={e => { 
                                const newName = e.target.value; 
                                const compendiumItem = getEntryByName(newName);
                                const next = [...char.data.convictions]; 
                                next[i] = { ...next[i], name: newName, statement: compendiumItem?.data?.statement || '' }; 
                                patch({ convictions: next }); 
                              }}>
                                <option value="">— Select —</option>
                                {getConvictions().filter(c => c.data.season === conviction.season).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0">Rank</span>
                              <input type="number" min={1} max={5} className="border border-gray-600 bg-gray-900 p-1.5 w-12 text-center rounded text-sm shadow-sm focus:outline-none text-gray-200" value={conviction.rank} 
                                onChange={e => { const next = [...char.data.convictions]; next[i] = { ...next[i], rank: Math.min(5, Math.max(1, +e.target.value)) }; patch({ convictions: next }); }} />
                              <button className="ml-auto text-red-500 font-bold hover:text-red-400 text-lg" onClick={() => {
                                const nextConvs = char.data.convictions.filter((_, j) => j !== i);
                                const nextFails = char.data.failings.filter(f => f.convictionIndex !== i).map(f => f.convictionIndex > i ? { ...f, convictionIndex: f.convictionIndex - 1 } : f);
                                patch({ convictions: nextConvs, failings: nextFails });
                              }}>×</button>
                            </div>
                          </div>
                          <div className="text-sm italic text-gray-400 border-l-2 border-blue-700 pl-3 py-1 w-full">
                            "{compendiumConviction?.data?.statement || 'Select a conviction to see its oath...'}"
                          </div>
                        </div>
                      )}

                      {failing ? (
                        <div className="bg-red-950/30 p-4 rounded-lg border border-red-900 shadow-sm flex-1 relative">
                          <div className="flex flex-col gap-2 mb-2 w-full">
                            <select className="border border-gray-600 bg-gray-900 p-1.5 rounded text-sm shadow-sm w-full focus:outline-none text-gray-200" value={failing.name} onChange={e => { 
                              const newName = e.target.value; 
                              const compendiumItem = getEntryByName(newName);
                              const next = [...char.data.failings]; 
                              const realIndex = char.data.failings.findIndex(f => f.convictionIndex === i);
                              next[realIndex] = { ...next[realIndex], name: newName, statement: compendiumItem?.data?.statement || '' }; 
                              patch({ failings: next }); 
                            }}>
                              <option value="">— Select Failing —</option>
                              {getFailings().map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                            </select>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0">Rank</span>
                              <input type="number" min={1} max={4} className="border border-gray-600 bg-gray-900 p-1.5 w-12 text-center rounded text-sm shadow-sm focus:outline-none text-gray-200" value={failing.rank} 
                                onChange={e => { const next = [...char.data.failings]; const realIndex = char.data.failings.findIndex(f => f.convictionIndex === i); next[realIndex] = { ...next[realIndex], rank: Math.min(4, Math.max(1, +e.target.value)) }; patch({ failings: next }); }} />
                              <button className="ml-auto text-red-500 font-bold hover:text-red-400 text-lg" onClick={() => patch({ failings: char.data.failings.filter(f => f.convictionIndex !== i) })}>×</button>
                            </div>
                          </div>
                          <div className="text-sm italic text-gray-400 border-l-2 border-red-700 pl-3 py-1 w-full">
                            "{compendiumFailing?.data?.statement || 'Select a failing to see its compulsion...'}"
                          </div>
                        </div>
                      ) : (
                        conviction && (
                          <button onClick={() => patch({ failings: [...char.data.failings, { name: '', rank: 1, convictionIndex: i, statement: '' }] })} 
                            className="flex-1 border-2 border-dashed border-gray-600 rounded-lg text-gray-500 hover:bg-gray-700/50 text-sm transition-colors font-medium flex items-center justify-center p-4">
                            + Add Failing
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
                {char.data.convictions.length < 3 && (
                  <button className="border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 shadow-sm font-bold text-gray-300 w-full transition-colors" onClick={() => patch({ convictions: [...char.data.convictions, { season: 'Vamor', name: '', statement: '', rank: 1 }] })}>+ Add Conviction</button>
                )}
              </div>
            </section>

            <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
              <SectionHeader title="Notes" />
              <textarea className="border border-gray-600 bg-gray-900 p-3 w-full h-64 rounded-xl shadow-sm focus:outline-none focus:border-red-500 resize-y text-gray-200" value={char.data.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Character notes..." />
            </section>
          </div>
        )}

        {activeTab === 'progression' && (
          <div className="w-full max-w-4xl mx-auto space-y-10 animate-in fade-in duration-200">
            <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
              <SectionHeader title="Progression" />
              <div className="grid grid-cols-3 gap-6 max-w-xl">
                <label className="flex flex-col text-sm font-bold text-gray-300">Tier
                  <input type="number" min={1} max={6} className="border border-gray-600 bg-gray-900 p-2 rounded mt-1 font-normal shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={char.data.progression.tier} onChange={e => patch({ progression: { ...char.data.progression, tier: +e.target.value } })} />
                </label>
                <label className="flex flex-col text-sm font-bold text-gray-300">Level
                  <input type="number" min={1} className="border border-gray-600 bg-gray-900 p-2 rounded mt-1 font-normal shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={char.data.progression.level} onChange={e => patch({ progression: { ...char.data.progression, level: +e.target.value } })} />
                </label>
                <label className="flex flex-col text-sm font-bold text-gray-300">XP
                  <input type="number" min={0} className="border border-gray-600 bg-gray-900 p-2 rounded mt-1 font-normal shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={char.data.progression.xp} onChange={e => patch({ progression: { ...char.data.progression, xp: +e.target.value } })} />
                </label>
              </div>
            </section>
          </div>
        )}

      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 text-gray-500 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] w-full">
        <div className="w-full flex text-xs sm:text-sm font-bold uppercase tracking-wider">
          <button onClick={() => setActiveTab('gameplay')} 
            className={`flex-1 py-4 hover:text-white transition-colors border-t-4 ${activeTab === 'gameplay' ? 'border-red-600 text-white bg-gray-800' : 'border-transparent hover:bg-gray-800/50'}`}>
            Gameplay Profile
          </button>
          <button onClick={() => setActiveTab('narrative')} 
            className={`flex-1 py-4 hover:text-white transition-colors border-t-4 ${activeTab === 'narrative' ? 'border-red-600 text-white bg-gray-800' : 'border-transparent hover:bg-gray-800/50'}`}>
            Narrative Profile
          </button>
          <button onClick={() => setActiveTab('progression')} 
            className={`flex-1 py-4 hover:text-white transition-colors border-t-4 ${activeTab === 'progression' ? 'border-red-600 text-white bg-gray-800' : 'border-transparent hover:bg-gray-800/50'}`}>
            Progression Profile
          </button>
        </div>
      </footer>

      {/* ORIGIN MODAL */}
      {isOriginModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
              <h2 className="font-cinzel font-bold text-xl text-gray-200">Select Origin</h2>
              <button onClick={() => setIsOriginModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
            </div>

            <div className="p-4 border-b border-gray-700 bg-gray-800/50 shrink-0">
              <div className="flex flex-wrap gap-2">
                {PLANES.map(plane => (
                  <button
                    key={plane}
                    onClick={() => {
                      setModalOriginPlane(plane);
                      setExpandedOrigin(null);
                    }}
                    className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors border ${
                      modalOriginPlane === plane 
                        ? 'bg-red-900/50 text-red-200 border-red-700' 
                        : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {plane}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {allOrigins.filter(o => o.data.plane === modalOriginPlane).map(origin => {
                const isExpanded = expandedOrigin === origin.id;
                const choices = ORIGIN_CHOICES[origin.name];
                return (
                  <div key={origin.id} className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                    <button
                      onClick={() => {
                        setExpandedOrigin(isExpanded ? null : origin.id);
                        if (char.data.identity.origin !== origin.name) {
                          setTempChoices({});
                        }
                      }}
                      className="w-full text-left p-3 hover:bg-gray-800/50 transition-colors flex justify-between items-center group"
                    >
                      <span className="font-bold text-gray-200 group-hover:text-white">{origin.name}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">{origin.data.plane}</span>
                    </button>
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-700 bg-black/20 text-sm">
                        
                        {origin.data.lore && (
                          <div className="mb-4 text-sm italic text-gray-400 border-l-2 border-gray-600 pl-3">
                            "{origin.data.lore}"
                          </div>
                        )}

                        <div className="grid grid-cols-[100px_1fr] gap-2 mb-4 text-gray-300">
                          <div className="font-bold text-gray-500 text-[10px] tracking-wider text-right mt-0.5">Inspiration</div>
                          <div>{origin.data.inspiration || 'None'}</div>
                          <div className="font-bold text-gray-500 text-[10px] tracking-wider text-right mt-0.5">Starting Skills</div>
                          <div>{origin.data.starting || 'None'}</div>
                        </div>

                        {choices && (
                          <div className="mb-4 space-y-3 p-3 bg-gray-800/50 rounded border border-gray-700">
                            {choices.map(choice => {
                              const selectedValue = tempChoices[choice.id];
                              const skillDesc = CORE_SKILL_DESCRIPTIONS[selectedValue] || SPECIAL_SKILL_DESCRIPTIONS[selectedValue] || '';
                              return (
                                <div key={choice.id}>
                                  <label className="block text-xs font-bold text-red-400 mb-1">{choice.label}</label>
                                  <select 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500"
                                    value={selectedValue || ''}
                                    onChange={(e) => setTempChoices({ ...tempChoices, [choice.id]: e.target.value })}
                                  >
                                    <option value="">— Select —</option>
                                    {choice.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                  {selectedValue && skillDesc && (
                                    <div className="text-xs text-gray-400 mt-1 italic border-l-2 border-gray-700 pl-2">
                                      {skillDesc}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <button 
                          onClick={() => {
                            if (choices) {
                              const missing = choices.find(c => !tempChoices[c.id]);
                              if (missing) {
                                alert('Please make a selection for all choices.');
                                return;
                              }
                            }
                            applyOrigin(origin.name, tempChoices);
                            setIsOriginModalOpen(false);
                            setExpandedOrigin(null);
                            setTempChoices({});
                          }} 
                          className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors"
                        >
                          Confirm Selection
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CLASS MODAL */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
              <h2 className="font-cinzel font-bold text-xl text-gray-200">Select Class</h2>
              <button onClick={() => setIsClassModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {['Champion', 'Scoundrel', 'Guide', 'Scholar', 'Mystic', 'Aberration'].map(archetype => {
                const classes = getClasses().filter(c => c.data.archetype === archetype);
                if (classes.length === 0) return null;
                return (
                  <div key={archetype}>
                    <div className="bg-gray-800 text-xs font-bold text-red-400 uppercase tracking-widest py-2 border-b border-gray-700 mb-2">
                      {archetype}
                    </div>
                    <div className="space-y-2">
                      {classes.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            patch({ identity: { ...char.data.identity, className: c.name, path: '' } });
                            setIsClassModalOpen(false);
                          }}
                          className={`w-full text-left p-3 border rounded-lg transition-colors flex justify-between items-center ${
                            char.data.identity.className === c.name 
                              ? 'bg-red-900/30 border-red-700 text-red-100' 
                              : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-700/50 hover:border-gray-500'
                          }`}
                        >
                          <span className="font-bold">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SPECIAL SKILL MODAL */}
      {isSpecialSkillModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
              <h2 className="font-cinzel font-bold text-xl text-gray-200">Select Special Skill</h2>
              <button onClick={() => setIsSpecialSkillModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {(Object.keys(ATTRIBUTE_NAMES) as Array<keyof typeof ATTRIBUTE_NAMES>).map(attr => {
                const skills = getSpecialSkills().filter(s => s.data.attribute === attr);
                if (skills.length === 0) return null;
                return (
                  <div key={attr}>
                    <div className={`bg-gray-800 text-xs font-bold uppercase tracking-widest py-2 border-b border-gray-700 mb-2 ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color}`}>
                      {ATTRIBUTE_NAMES[attr]}
                    </div>
                    <div className="space-y-2">
                      {skills.map(s => {
                        const isExpanded = expandedSpecialSkill === s.id;
                        return (
                          <div key={s.id} className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                            <button
                              onClick={() => setExpandedSpecialSkill(isExpanded ? null : s.id)}
                              className="w-full text-left p-3 hover:bg-gray-800/50 transition-colors flex justify-between items-center group"
                            >
                              <span className="font-bold text-gray-200 group-hover:text-white">{s.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color} border-current`}>{attr.toUpperCase()}</span>
                            </button>
                            {isExpanded && (
                              <div className="p-4 border-t border-gray-700 bg-black/20">
                                <p className="text-sm italic text-gray-400 mb-4 border-l-2 border-gray-700 pl-2">{s.data.description}</p>
                                <button 
                                  onClick={() => {
                                    if (modalSpecialSkillIndex !== null) {
                                      const next = [...char.data.specialSkills];
                                      next[modalSpecialSkillIndex] = { ...next[modalSpecialSkillIndex], name: s.name };
                                      patch({ specialSkills: next });
                                    }
                                    setIsSpecialSkillModalOpen(false);
                                    setExpandedSpecialSkill(null);
                                  }} 
                                  className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors"
                                >
                                  Confirm Selection
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ABILITY SELECTION MODAL */}
      {isAbilityModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
              <h2 className="font-cinzel font-bold text-xl text-gray-200">Select Ability</h2>
              <button onClick={() => setIsAbilityModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
            </div>

            <div className="p-4 border-b border-gray-700 bg-gray-800/50 shrink-0">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Filter by Discipline</label>
              <div className="flex flex-wrap gap-2">
                {getDisciplines().map(disc => (
                  <button
                    key={disc.id}
                    onClick={() => {
                      setModalDiscipline(disc.name);
                      setExpandedModalAbility(null);
                    }}
                    className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors border ${
                      modalDiscipline === disc.name 
                        ? 'bg-red-900/50 text-red-200 border-red-700' 
                        : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {disc.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {!modalDiscipline && (
                <p className="text-center text-gray-500 italic py-8">Select a discipline above to view available abilities.</p>
              )}

              {modalDiscipline && (() => {
                const abilities = getAbilities().filter(a => a.data.source === modalDiscipline);
                const groupedByRank = abilities.reduce((acc, ab) => {
                  const rank = ab.data.class_rank ?? 0;
                  if (!acc[rank]) acc[rank] = [];
                  acc[rank].push(ab);
                  return acc;
                }, {} as Record<number, CompendiumEntry[]>);

                const ranks = Object.keys(groupedByRank).map(Number).sort((a, b) => a - b);

                if (ranks.length === 0) return <p className="text-center text-gray-500 italic">No abilities found for this discipline.</p>;

                return ranks.map(rank => (
                  <div key={rank}>
                    <div className="bg-gray-800 text-xs font-bold text-red-400 uppercase tracking-widest py-2 border-b border-gray-700 mb-2">
                      Rank {rank}
                    </div>
                    <div className="space-y-2">
                      {groupedByRank[rank].map(ab => {
                        const speedData = getSpeedData(ab.data.speed, ab.data.upkeep);
                        const isExpanded = expandedModalAbility === ab.id;
                        const hasDiscipline = ab.data.source ? charDisciplines.includes(ab.data.source) : false;

                        const statsToShow = [];
                        statsToShow.push({ label: 'Strain', value: `${ab.data.sn_cost ?? 0} SN`, color: 'text-blue-400' });
                        if (ab.data.type === 'attack') {
                          statsToShow.push({ label: 'Accuracy', value: ab.data.acc ?? '+0', color: 'text-green-400' });
                          statsToShow.push({ label: 'Damage', value: ab.data.dmg ?? '+0', color: 'text-red-400' });
                        }
                        if (ab.data.type === 'defensive') {
                          statsToShow.push({ label: 'Evasion', value: ab.data.eva ?? '+0', color: 'text-purple-400' });
                        }
                        statsToShow.push({ label: 'Requires', value: ab.data.requirement || 'None', color: 'text-gray-300' });

                        return (
                          <div key={ab.id} className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                            <button
                              onClick={() => setExpandedModalAbility(isExpanded ? null : ab.id)}
                              className="w-full text-left p-3 hover:bg-gray-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                            >
                              <span className="font-bold text-gray-200 group-hover:text-white">{ab.name}</span>
                              <div className="flex flex-wrap gap-1.5">
                                {ab.data.type && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(ab.data.type)}`}>
                                    {ab.data.type}
                                  </span>
                                )}
                                {speedData && (
                                  <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">
                                    {speedData.speedLabel}
                                  </span>
                                )}
                                {speedData?.upkeepLabel && (
                                  <span className="bg-teal-900/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-700/50">
                                    {speedData.upkeepLabel}
                                  </span>
                                )}
                                {ab.data.range && (
                                  <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">
                                    {ab.data.range}
                                  </span>
                                )}
                                {ab.data.class_rank !== undefined && (
                                  <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">
                                    Rank {ab.data.class_rank}
                                  </span>
                                )}
                                {/* Removed source/discipline tag here */}
                              </div>
                            </button>
                            
                            {isExpanded && (
                              <div className="p-4 border-t border-gray-700 bg-black/20">
                                <div className="flex flex-wrap justify-between gap-2 mb-3 bg-gray-900/50 p-2 rounded border border-gray-800 shadow-inner text-center">
                                  {statsToShow.map((stat, idx) => (
                                    <div key={idx} className={`flex-1 flex flex-col items-center justify-center min-w-[80px] ${idx !== statsToShow.length - 1 ? 'border-r border-gray-700' : ''}`}>
                                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</span>
                                      <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-sm italic text-gray-400 mb-4 border-l-2 border-gray-700 pl-2">{ab.data.description}</p>
                                
                                {hasDiscipline ? (
                                  <button 
                                    onClick={() => {
                                      if (modalAbilityIndex !== null) {
                                        const next = [...char.data.abilities];
                                        next[modalAbilityIndex] = { ...next[modalAbilityIndex], name: ab.name };
                                        patch({ abilities: next });
                                      }
                                      setIsAbilityModalOpen(false);
                                      setExpandedModalAbility(null);
                                    }} 
                                    className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors"
                                  >
                                    Confirm Selection
                                  </button>
                                ) : (
                                  <Tooltip text="You must have this discipline to select this ability." noBorder>
                                    <button disabled className="w-full py-2 bg-gray-700 text-gray-500 font-bold text-sm rounded cursor-not-allowed">
                                      Requires Discipline
                                    </button>
                                  </Tooltip>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 