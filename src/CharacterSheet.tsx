import { useEffect, useState, Fragment } from 'react';
import { supabase } from './supabase';
import type { Character } from './types';
import { vigorMax, strainMax, dpMax, evasion, movementTiles, burdenMax, currentBurden } from './calc';

const CLASS_DATA: Record<string, { archetype: string, paths: string[] }> = {
  Berserker: { archetype: 'Champion', paths: ['Revenant', 'Ravager'] },
  Legionary: { archetype: 'Champion', paths: ['Exemplar', 'Banneret'] },
  Warden: { archetype: 'Champion', paths: ['Juggernaut', 'Sentinel'] },
  Marksman: { archetype: 'Champion', paths: ['Sharpshot', 'Venator'] },
  Duelist: { archetype: 'Scoundrel', paths: ['Nemesis', 'Gallant'] },
  Rogue: { archetype: 'Scoundrel', paths: ['Brigand', 'Phantom'] },
  Stalker: { archetype: 'Scoundrel', paths: ['Trapper', 'Poacher'] },
  Gunslinger: { archetype: 'Scoundrel', paths: ['Marauder', 'Drifter'] },
  Bard: { archetype: 'Guide', paths: ['Laureate', 'Discordant'] },
  Envoy: { archetype: 'Guide', paths: ['Paragon', 'Martinet'] },
  Wayfarer: { archetype: 'Guide', paths: ['Vanguard', 'Courier'] },
  Apothecary: { archetype: 'Scholar', paths: ['Venomdrop', 'Surgeon'] },
  Clairvoyant: { archetype: 'Scholar', paths: ['Thoughtripper', 'Augur'] },
  Mechanist: { archetype: 'Scholar', paths: ['Operator', 'Pilot'] },
  Arbiter: { archetype: 'Mystic', paths: ['Inquisitor', 'Augur'] },
  Empath: { archetype: 'Mystic', paths: ['Prophet', 'Specter'] },
  Sorcerer: { archetype: 'Mystic', paths: ['Arsonist', 'Pyreon'] },
  Witch: { archetype: 'Mystic', paths: ['Occultist', 'Necromancer'] },
  Protean: { archetype: 'Aberration', paths: ['Changeling', 'Mimic'] },
  Vessel: { archetype: 'Aberration', paths: ['Veincaller', 'Symbiote'] },
};

const ATTRIBUTE_DESCRIPTIONS = {
  grt: "Grit: Your physical body. The resilience and power of flesh and bone.",
  ref: "Reflex: Your uncontrolled impulses. The precise senses and natural instincts.",
  int: "Intellect: Your pointed mind. The library of knowledge and its application.",
  psy: "Psyche: Your own soul. The internal will and the poetry to communicate it."
};

const SKILL_GROUPS = {
  grt: { color: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50', skills: ['Athletics', 'Brawling', 'Endurance'] },
  ref: { color: 'text-green-600', border: 'border-green-200', bg: 'bg-green-50', skills: ['Dexterity', 'Perception', 'Stealth'] },
  int: { color: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50', skills: ['Knowledge', 'Reasoning', 'Survival'] },
  psy: { color: 'text-purple-600', border: 'border-purple-200', bg: 'bg-purple-50', skills: ['Intuition', 'Persuasion', 'Willpower'] },
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

const SPECIAL_SKILL_ATTRIBUTES: Record<string, 'grt' | 'ref' | 'int' | 'psy'> = {
  Carry: 'grt', Discipline: 'grt', Stance: 'grt',
  Interface: 'ref', Pilot: 'ref', Scout: 'ref',
  Engineering: 'int', Lore: 'int', Medicine: 'int',
  Authority: 'psy', Deception: 'psy', Whisper: 'psy'
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

const SEASONS = ['Vamor', 'Bruma', 'Trumst', 'Halice'] as const;
const CONVICTION_NAMES = {
  Vamor: ['Design', 'Ambition', 'Passion', 'Cunning'],
  Bruma: ['Empathy', 'Altruism', 'Safety', 'Diligence'],
  Trumst: ['Unity', 'Truth', 'Order', 'Curiosity'],
  Halice: ['Beauty', 'Freedom', 'Survival', 'Progress'],
} as const;

const CONVICTION_STATEMENTS: Record<string, string> = {
  Design: "I will put the greater design above the needs of any one person.",
  Ambition: "I will become more than I am, whatever the cost.",
  Passion: "I will make any sacrifice necessary for that which I love.",
  Cunning: "I will use any opportunity that benefits me, without hesitation or guilt.",
  Empathy: "I will treat each person with dignity, no matter their station.",
  Altruism: "I will sacrifice for those who need help without expecting anything in return.",
  Safety: "I will ensure the well-being of myself and those close to me above all else.",
  Diligence: "I will never compromise my goals by taking shortcuts.",
  Unity: "I will do everything in my power to prevent needless conflict.",
  Truth: "I will speak with integrity, holding others accountable to the same honesty.",
  Order: "I will purge degeneracy and fragility.",
  Curiosity: "I will always pursue new knowledge.",
  Beauty: "I will safeguard the wonders of the world, both crafted and born of nature.",
  Freedom: "I will always pursue liberty for both myself and those around me.",
  Survival: "I will prioritize my own success, discarding anything that jeopardizes it.",
  Progress: "I will always strive for innovation and improvement of the world."
};

const FAILINGS = ['Greed', 'Paranoia', 'Despair', 'Masochism', 'Wrath', 'Arrogance', 'Apathy', 'Cowardice'];
const FAILING_STATEMENTS: Record<string, string> = {
  Greed: "I will put my own needs and desires above those of others.",
  Paranoia: "I cannot entrust others with matters that affect me.",
  Despair: "I cannot further my own wellbeing.",
  Masochism: "I will put myself in harm's way.",
  Wrath: "I will punish all who oppose me.",
  Arrogance: "I will do everything in my power to avoid humiliation.",
  Apathy: "I cannot consider the wellbeing and interests of others.",
  Cowardice: "I will do everything in my power to avoid harm."
};

const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="text-2xl mb-4 border-b pb-2 font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-blue-900">
    {title}
  </h2>
);

const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => (
  <div className="group relative inline-block cursor-help border-b border-dotted border-gray-400">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center leading-tight normal-case font-normal italic">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

export default function CharacterSheet({ id }: { id: string }) {
  const [char, setChar] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('characters').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (!data) return;
        const fetchedChar = data as Character;
        
        if (fetchedChar.data.abilities && fetchedChar.data.abilities.length > 0 && typeof fetchedChar.data.abilities[0] === 'string') {
          fetchedChar.data.abilities = (fetchedChar.data.abilities as unknown as string[]).map(name => ({ name, equipped: true }));
        }
        
        setChar(fetchedChar);
      });
  }, [id]);

  if (!char) return <p className="text-gray-500 p-8 text-center font-cinzel text-xl">Loading character...</p>;

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

  async function save() {
    if (!char) return;
    setSaving(true);
    await supabase.from('characters').update({ data: char.data }).eq('id', char.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const currentBurdenVal = currentBurden(char.data);
  const maxBurdenVal = burdenMax(char.data);
  const isOverburdened = currentBurdenVal > maxBurdenVal;

  const selectedClassData = CLASS_DATA[char.data.identity.className];
  const equippedAbilities = char.data.abilities.filter(a => a.equipped).length;

  return (
    <div className="mt-4 pb-20 max-w-6xl mx-auto px-4 font-sans text-gray-800">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-4xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.3em] first-letter:text-blue-900 font-bold">
          {char.name || 'Unnamed Character'}
        </h1>
        <button onClick={save} disabled={saving} 
          className={`px-5 py-2.5 rounded text-white font-medium shadow-sm transition-colors ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* IDENTITY */}
      <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="flex flex-col text-sm font-bold">Origin
          <input className="border p-2 rounded mt-1 font-normal shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" value={char.data.identity.origin} onChange={e => patch({ identity: { ...char.data.identity, origin: e.target.value } })} />
        </label>
        <label className="flex flex-col text-sm font-bold">Concept
          <input className="border p-2 rounded mt-1 font-normal shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" value={char.data.identity.concept} onChange={e => patch({ identity: { ...char.data.identity, concept: e.target.value } })} />
        </label>
      </section>

      {/* STATS: VITALS & CALCULATED */}
      <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Block: Vitals (Vigor, Strain, Destiny) */}
        <div className="border-2 border-red-200 bg-red-50 rounded-xl p-5 flex flex-col justify-center gap-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-red-800 uppercase tracking-widest text-sm w-20">Vigor</span>
            <div className="flex items-center bg-white border rounded-lg shadow-sm flex-1 max-w-xs">
              <button onClick={() => updateTracker('vigor', -1)} className="w-12 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg font-bold text-xl shrink-0 transition-colors">−</button>
              <div className="flex-1 text-center font-bold text-2xl">{char.data.trackers.vigor} <span className="text-sm text-gray-400 font-normal">/ {vigorMax(char.data)}</span></div>
              <button onClick={() => updateTracker('vigor', 1)} className="w-12 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg font-bold text-xl shrink-0 transition-colors">+</button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-red-800 uppercase tracking-widest text-sm w-20">Strain</span>
            <div className="flex items-center bg-white border rounded-lg shadow-sm flex-1 max-w-xs">
              <button onClick={() => updateTracker('strain', -1)} className="w-12 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg font-bold text-xl shrink-0 transition-colors">−</button>
              <div className="flex-1 text-center font-bold text-2xl">{char.data.trackers.strain} <span className="text-sm text-gray-400 font-normal">/ {strainMax(char.data)}</span></div>
              <button onClick={() => updateTracker('strain', 1)} className="w-12 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg font-bold text-xl shrink-0 transition-colors">+</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-red-800 uppercase tracking-widest text-sm w-20">Destiny</span>
            <div className="flex items-center bg-white border rounded-lg shadow-sm flex-1 max-w-xs">
              <button onClick={() => updateTracker('dp', -1)} className="w-12 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg font-bold text-xl shrink-0 transition-colors">−</button>
              <div className="flex-1 text-center font-bold text-2xl">{char.data.trackers.dp} <span className="text-sm text-gray-400 font-normal">/ {dpMax(char.data)}</span></div>
              <button onClick={() => updateTracker('dp', 1)} className="w-12 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg font-bold text-xl shrink-0 transition-colors">+</button>
            </div>
          </div>
        </div>

        {/* Right Block: Calculated Stats */}
        <div className="border rounded-xl bg-white p-5 shadow-sm grid grid-cols-2 gap-6 text-center items-center">
          <div><div className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">Evasion</div><div className="font-bold text-3xl">{evasion(char.data)}</div></div>
          <div><div className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">Movement</div><div className="font-bold text-3xl">{movementTiles(char.data)}</div></div>
          
          <div className="flex flex-col items-center justify-center">
            <div className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">Armour</div>
            <div className="flex items-center gap-3">
              <button onClick={() => updateTracker('ap', -1)} className="text-gray-400 hover:text-black font-bold text-xl">−</button>
              <input type="number" className="border-b-2 border-gray-300 p-1 w-14 text-center font-bold text-3xl focus:outline-none focus:border-blue-500 bg-transparent" 
                value={char.data.trackers.ap} onChange={e => patch({ trackers: { ...char.data.trackers, ap: +e.target.value } })} />
              <button onClick={() => updateTracker('ap', 1)} className="text-gray-400 hover:text-black font-bold text-xl">+</button>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="text-gray-500 text-xs uppercase font-bold mb-1 tracking-wider">Burden</div>
            <div className={`font-bold text-3xl ${isOverburdened ? 'text-red-600' : ''}`}>
              {currentBurdenVal} <span className="text-lg text-gray-400 font-normal">/ {maxBurdenVal}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ATTRIBUTES & CORE SKILLS */}
      <section className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.keys(SKILL_GROUPS) as Array<keyof typeof SKILL_GROUPS>).map(attr => {
            const group = SKILL_GROUPS[attr];
            const attrVal = char.data.attributes[attr];
            
            return (
              <div key={attr} className="bg-white border rounded-xl p-5 shadow-sm flex flex-col min-w-0">
                <div className="flex flex-col items-center mb-5 pb-4 border-b border-gray-100">
                  <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr]}>
                    <span className={`text-3xl font-cinzel first-letter:font-cinzelDeco uppercase tracking-widest ${group.color}`}>{attr}</span>
                  </Tooltip>
                  <input type="number" min={1} max={4} className={`mt-2 border-b-2 ${group.color} border-gray-200 p-1 w-16 text-center font-bold text-3xl focus:outline-none bg-transparent`} 
                    value={attrVal} onChange={e => patch({ attributes: { ...char.data.attributes, [attr]: Math.min(4, Math.max(1, +e.target.value)) } })} />
                </div>
                <div className="space-y-3 flex-1">
                  {group.skills.map(skill => {
                    const maxSkill = Math.min(8, attrVal * 2);
                    const currentSkill = char.data.skills[skill] ?? 0;
                    return (
                      <div key={skill} className="flex justify-between items-center text-sm">
                        <Tooltip text={CORE_SKILL_DESCRIPTIONS[skill]}>
                          <span className="font-medium text-gray-700">{skill}</span>
                        </Tooltip>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-bold">+</span>
                          <input type="number" min={0} max={maxSkill} className="border p-1 w-12 text-center rounded shadow-sm focus:outline-none focus:border-blue-500 font-bold" 
                            value={currentSkill} 
                            onChange={e => patch({ skills: { ...char.data.skills, [skill]: Math.min(maxSkill, Math.max(0, +e.target.value)) } })} />
                          <span className="text-gray-400 text-xs font-bold">/ {maxSkill}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SPECIAL SKILLS */}
      <section className="mb-10">
        <SectionHeader title="Special Skills" />
        <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col min-w-0 max-w-3xl">
          <div className="space-y-3 flex-1">
            {char.data.specialSkills.map((s, i) => {
              const attr = s.attribute || 'grt'; 
              const maxSkill = Math.min(8, char.data.attributes[attr as keyof typeof char.data.attributes] * 2);
              
              return (
                <div key={i} className="flex justify-between items-center text-sm gap-4">
                  
                  {/* Skill Name & Attr */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative group flex-1 min-w-0">
                      <select 
                        className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 p-1 rounded-none focus:outline-none font-medium text-gray-700 cursor-pointer truncate"
                        value={s.name}
                        onChange={e => {
                          const newName = e.target.value;
                          const newAttr = SPECIAL_SKILL_ATTRIBUTES[newName] || 'grt';
                          const next = [...char.data.specialSkills];
                          next[i] = { ...next[i], name: newName, attribute: newAttr };
                          patch({ specialSkills: next });
                        }}
                      >
                        <option value="">— Select Skill —</option>
                        {Object.keys(SPECIAL_SKILL_ATTRIBUTES).map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      
                      {s.name && SPECIAL_SKILL_DESCRIPTIONS[s.name] && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center leading-tight normal-case font-normal italic">
                          {SPECIAL_SKILL_DESCRIPTIONS[s.name]}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                    
                    <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr as keyof typeof ATTRIBUTE_DESCRIPTIONS]}>
                      <span className={`text-[10px] font-bold uppercase ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color} border border-current px-1 py-0.5 rounded`}>
                        {attr}
                      </span>
                    </Tooltip>
                  </div>

                  {/* Rank & Delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 font-bold">+</span>
                      <input type="number" min={0} max={maxSkill} className="border p-1 w-12 text-center rounded shadow-sm focus:outline-none focus:border-blue-500 font-bold" 
                        value={s.rank} 
                        onChange={e => { 
                          const next = [...char.data.specialSkills]; 
                          next[i] = { ...next[i], rank: Math.min(maxSkill, Math.max(0, +e.target.value)) }; 
                          patch({ specialSkills: next }); 
                        }} />
                      <span className="text-gray-400 text-xs font-bold w-6 text-right">/ {maxSkill}</span>
                    </div>
                    <button className="text-red-500 font-bold text-lg hover:text-red-700 w-6 text-center" onClick={() => patch({ specialSkills: char.data.specialSkills.filter((_, j) => j !== i) })}>×</button>
                  </div>
                </div>
              );
            })}
            
            {char.data.specialSkills.length < 5 && (
              <div className="pt-2">
                <button className="border border-dashed px-4 py-2 text-sm rounded hover:bg-gray-50 w-full text-gray-600 font-medium transition-colors" 
                  onClick={() => patch({ specialSkills: [...char.data.specialSkills, { name: '', rank: 0, attribute: 'grt' }] })}>
                  + add special skill
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CLASS, PATH, ABILITIES */}
      <section className="mb-10">
        <SectionHeader title="Class & Path" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          
          {/* Class & Path Selection */}
          <div className="min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col">
                {selectedClassData ? (
                  <span className="text-xs text-gray-400 italic tracking-widest h-4 mb-1">
                    {selectedClassData.archetype}
                  </span>
                ) : <div className="h-4 mb-1"></div>}
                
                <select className="border p-2 rounded font-normal shadow-sm focus:outline-none focus:border-blue-500 w-full font-bold text-gray-800" value={char.data.identity.className} 
                  onChange={e => patch({ identity: { ...char.data.identity, className: e.target.value, path: '' } })}>
                  <option value="">— Select Class —</option>
                  {Object.keys(CLASS_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex flex-col">
                <span className="block h-4 mb-1"></span>
                <select className="border p-2 rounded font-normal shadow-sm disabled:opacity-50 focus:outline-none focus:border-blue-500 w-full font-bold text-gray-800" value={char.data.identity.path} disabled={!char.data.identity.className}
                  onChange={e => patch({ identity: { ...char.data.identity, path: e.target.value } })}>
                  <option value="">— Select Path —</option>
                  {(selectedClassData?.paths || []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          {/* Abilities */}
          <div className="min-w-0">
            <div className="flex justify-between items-end mb-2">
              <h3 className="font-bold text-sm font-cinzel first-letter:font-cinzelDeco">Abilities</h3>
              <span className="text-xs text-gray-500 font-bold">Active: {equippedAbilities}/6</span>
            </div>
            <div className="space-y-2">
              {char.data.abilities.map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 cursor-pointer accent-blue-600 shrink-0" 
                    checked={a.equipped} 
                    disabled={!a.equipped && equippedAbilities >= 6}
                    onChange={e => { 
                      const next = [...char.data.abilities]; 
                      next[i] = { ...next[i], equipped: e.target.checked }; 
                      patch({ abilities: next }); 
                    }} 
                  />
                  <input className="border p-2 flex-1 rounded shadow-sm focus:outline-none focus:border-blue-500 w-full" placeholder="Ability name..." value={a.name} onChange={e => { 
                    const next = [...char.data.abilities]; 
                    next[i] = { ...next[i], name: e.target.value }; 
                    patch({ abilities: next }); 
                  }} />
                  <button className="px-2 text-red-500 font-bold text-lg hover:text-red-700 shrink-0" onClick={() => patch({ abilities: char.data.abilities.filter((_, j) => j !== i) })}>×</button>
                </div>
              ))}
              <button className="border border-dashed px-4 py-2 text-sm rounded hover:bg-gray-50 w-fit mt-2 text-gray-600 font-medium" onClick={() => patch({ abilities: [...char.data.abilities, { name: '', equipped: false }] })}>+ add ability</button>
            </div>
          </div>
        </div>
      </section>

      {/* INJURIES */}
      <section className="mb-10">
        <SectionHeader title="Injuries" />
        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                <th className="p-3 font-bold">Injury Name</th>
                <th className="p-3 font-bold w-24 text-center">Severity</th>
                <th className="p-3 font-bold w-32 text-center">Recovery (Weeks)</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {char.data.trackers.injuries.map((inj, i) => (
                <tr key={i} className="hover:bg-gray-50 border-b last:border-b-0">
                  <td className="p-2">
                    <input className="w-full bg-transparent focus:outline-none p-1" placeholder="e.g. Broken Arm" value={inj.part} onChange={e => {
                      const n = [...char.data.trackers.injuries];
                      n[i] = { ...n[i], part: e.target.value };
                      patch({ trackers: { ...char.data.trackers, injuries: n } });
                    }} />
                  </td>
                  <td className="p-2 text-center">
                    <input type="number" min={1} max={5} className="w-16 border rounded p-1.5 text-center bg-white shadow-sm focus:outline-none focus:border-blue-500" value={inj.severity} onChange={e => {
                      const n = [...char.data.trackers.injuries];
                      n[i] = { ...n[i], severity: +e.target.value };
                      patch({ trackers: { ...char.data.trackers, injuries: n } });
                    }} />
                  </td>
                  <td className="p-2 text-center">
                    <input type="number" min={0} className="w-20 border rounded p-1.5 text-center bg-white shadow-sm focus:outline-none focus:border-blue-500" value={inj.weeksLeft} onChange={e => {
                      const n = [...char.data.trackers.injuries];
                      n[i] = { ...n[i], weeksLeft: +e.target.value };
                      patch({ trackers: { ...char.data.trackers, injuries: n } });
                    }} />
                  </td>
                  <td className="p-2 text-center">
                    <button className="text-red-500 font-bold text-lg hover:text-red-700" onClick={() => {
                      const n = char.data.trackers.injuries.filter((_, j) => j !== i);
                      patch({ trackers: { ...char.data.trackers, injuries: n } });
                    }}>×</button>
                  </td>
                </tr>
              ))}
              {char.data.trackers.injuries.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-gray-400 italic text-sm">No active injuries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button className="mt-4 border border-dashed px-4 py-2 text-sm rounded-lg hover:bg-gray-50 font-bold text-gray-700 shadow-sm transition-colors" onClick={() => {
          const n = [...char.data.trackers.injuries, { part: '', severity: 1, weeksLeft: 0 }];
          patch({ trackers: { ...char.data.trackers, injuries: n } });
        }}>+ Add Injury</button>
      </section>

      {/* CONVICTIONS & FAILINGS */}
      <section className="mb-10">
        <SectionHeader title="Convictions & Failings" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
          <div className="font-cinzel first-letter:font-cinzelDeco text-sm text-gray-500 uppercase tracking-widest hidden lg:block border-b pb-1">Conviction</div>
          <div className="font-cinzel first-letter:font-cinzelDeco text-sm text-gray-500 uppercase tracking-widest hidden lg:block border-b pb-1">Failing</div>

          {[...Array(3)].map((_, i) => {
            const conviction = char.data.convictions[i];
            const failing = char.data.failings.find(f => f.convictionIndex === i);
            if (!conviction && !failing) return null;

            return (
              <Fragment key={i}>
                <div className="flex flex-col min-w-0">
                  {conviction ? (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex-1 shadow-sm min-w-0">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex gap-2">
                            <select className="border p-1.5 rounded text-sm bg-white shadow-sm focus:outline-none shrink-0" value={conviction.season} onChange={e => { 
                              const next = [...char.data.convictions]; 
                              next[i] = { ...next[i], season: e.target.value, name: '', statement: '' }; 
                              patch({ convictions: next }); 
                            }}>
                              {SEASONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <select className="border p-1.5 rounded text-sm bg-white shadow-sm focus:outline-none min-w-[100px] flex-1" value={conviction.name} onChange={e => { 
                              const newName = e.target.value;
                              const next = [...char.data.convictions]; 
                              next[i] = { ...next[i], name: newName, statement: CONVICTION_STATEMENTS[newName] || '' }; 
                              patch({ convictions: next }); 
                            }}>
                              <option value="">— Select —</option>
                              {(CONVICTION_NAMES[conviction.season as keyof typeof CONVICTION_NAMES] ?? []).map(n => <option key={n}>{n}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Rank</span>
                            <input type="number" min={1} max={5} className="border p-1.5 w-12 text-center rounded text-sm bg-white shadow-sm focus:outline-none" value={conviction.rank} onChange={e => { 
                              const next = [...char.data.convictions]; 
                              next[i] = { ...next[i], rank: Math.min(5, Math.max(1, +e.target.value)) }; 
                              patch({ convictions: next }); 
                            }} />
                          </div>
                        </div>
                        <button className="px-1 text-red-500 font-bold text-lg hover:text-red-700 shrink-0 mt-1" onClick={() => {
                          const nextConvs = char.data.convictions.filter((_, j) => j !== i);
                          const nextFails = char.data.failings.filter(f => f.convictionIndex !== i).map(f => f.convictionIndex > i ? { ...f, convictionIndex: f.convictionIndex - 1 } : f);
                          patch({ convictions: nextConvs, failings: nextFails });
                        }}>×</button>
                      </div>
                      <div className="text-sm italic text-gray-600 border-l-2 border-blue-300 pl-3 py-1">
                        "{conviction.statement || 'Select a conviction to see its oath...'}"
                      </div>
                    </div>
                  ) : <div className="flex-1"></div>}
                </div>

                <div className="flex flex-col min-w-0">
                  {failing ? (
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex-1 shadow-sm min-w-0">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex gap-2">
                            <select className="border p-1.5 rounded text-sm bg-white shadow-sm flex-1 focus:outline-none min-w-[100px]" value={failing.name} onChange={e => { 
                              const newName = e.target.value;
                              const next = [...char.data.failings]; 
                              const realIndex = char.data.failings.findIndex(f => f.convictionIndex === i);
                              next[realIndex] = { ...next[realIndex], name: newName, statement: FAILING_STATEMENTS[newName] || '' }; 
                              patch({ failings: next }); 
                            }}>
                              <option value="">— Select Failing —</option>
                              {FAILINGS.map(n => <option key={n}>{n}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Rank</span>
                            <input type="number" min={1} max={4} className="border p-1.5 w-12 text-center rounded text-sm bg-white shadow-sm focus:outline-none" value={failing.rank} onChange={e => { 
                              const next = [...char.data.failings]; 
                              const realIndex = char.data.failings.findIndex(f => f.convictionIndex === i);
                              next[realIndex] = { ...next[realIndex], rank: Math.min(4, Math.max(1, +e.target.value)) }; 
                              patch({ failings: next }); 
                            }} />
                          </div>
                        </div>
                        <button className="px-1 text-red-500 font-bold text-lg hover:text-red-700 shrink-0 mt-1" onClick={() => patch({ failings: char.data.failings.filter(f => f.convictionIndex !== i) })}>×</button>
                      </div>
                      <div className="text-sm italic text-gray-600 border-l-2 border-red-300 pl-3 py-1">
                        "{failing.statement || 'Select a failing to see its compulsion...'}"
                      </div>
                    </div>
                  ) : (
                    conviction && (
                      <button onClick={() => patch({ failings: [...char.data.failings, { name: '', rank: 1, convictionIndex: i, statement: '' }] })} 
                        className="w-full h-full min-h-[100px] border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center p-2 text-sm transition-colors font-medium">
                        + Add Failing
                      </button>
                    )
                  )}
                </div>
              </Fragment>
            );
          })}
          {char.data.convictions.length < 3 && (
            <div className="col-span-1 lg:col-span-2 mt-2">
              <button className="border px-4 py-2 text-sm rounded-lg hover:bg-gray-50 shadow-sm font-bold text-gray-700" onClick={() => patch({ convictions: [...char.data.convictions, { season: 'Vamor', name: '', statement: '', rank: 1 }] })}>+ Add Conviction</button>
            </div>
          )}
        </div>
      </section>

      {/* INVENTORY TABLE */}
      <section className="mb-10">
        <SectionHeader title="Inventory" />
        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                <th className="p-3 font-bold">Item Name</th>
                <th className="p-3 font-bold w-24 text-center">Burden</th>
                <th className="p-3 font-bold w-24 text-center">Qty</th>
                <th className="p-3 font-bold w-24 text-center">Equipped</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {char.data.items.map((it, i) => (
                <tr key={i} className="hover:bg-gray-50 border-b last:border-b-0">
                  <td className="p-2"><input className="w-full bg-transparent focus:outline-none p-1" placeholder="Item name..." value={it.name} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], name: e.target.value }; patch({ items: n }); }} /></td>
                  <td className="p-2 text-center"><input type="number" className="w-16 border rounded p-1.5 text-center bg-white shadow-sm focus:outline-none focus:border-blue-500" value={it.burden} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], burden: +e.target.value }; patch({ items: n }); }} /></td>
                  <td className="p-2 text-center"><input type="number" className="w-16 border rounded p-1.5 text-center bg-white shadow-sm focus:outline-none focus:border-blue-500" value={it.qty} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], qty: +e.target.value }; patch({ items: n }); }} /></td>
                  <td className="p-2 text-center">
                    <input type="checkbox" className="w-5 h-5 cursor-pointer accent-blue-600" checked={it.equipped} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], equipped: e.target.checked }; patch({ items: n }); }} />
                  </td>
                  <td className="p-2 text-center"><button className="text-red-500 font-bold text-lg hover:text-red-700" onClick={() => patch({ items: char.data.items.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              ))}
              {char.data.items.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400 italic text-sm">No items in inventory.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button className="mt-4 border border-dashed px-4 py-2 text-sm rounded-lg hover:bg-gray-50 font-bold text-gray-700 shadow-sm transition-colors" onClick={() => patch({ items: [...char.data.items, { name: '', burden: 0, qty: 1, equipped: false }] })}>+ Add Item</button>
      </section>

      {/* PROGRESSION */}
      <section className="mb-10">
        <SectionHeader title="Progression" />
        <div className="grid grid-cols-3 gap-6 max-w-xl">
          <label className="flex flex-col text-sm font-bold text-gray-700">Tier
            <input type="number" min={1} max={6} className="border p-2 rounded mt-1 font-normal shadow-sm focus:outline-none focus:border-blue-500" value={char.data.progression.tier} onChange={e => patch({ progression: { ...char.data.progression, tier: +e.target.value } })} />
          </label>
          <label className="flex flex-col text-sm font-bold text-gray-700">Level
            <input type="number" min={1} className="border p-2 rounded mt-1 font-normal shadow-sm focus:outline-none focus:border-blue-500" value={char.data.progression.level} onChange={e => patch({ progression: { ...char.data.progression, level: +e.target.value } })} />
          </label>
          <label className="flex flex-col text-sm font-bold text-gray-700">XP
            <input type="number" min={0} className="border p-2 rounded mt-1 font-normal shadow-sm focus:outline-none focus:border-blue-500" value={char.data.progression.xp} onChange={e => patch({ progression: { ...char.data.progression, xp: +e.target.value } })} />
          </label>
        </div>
      </section>

      {/* NOTES */}
      <section>
        <SectionHeader title="Notes" />
        <textarea className="border p-3 w-full h-40 rounded-xl shadow-sm focus:outline-none focus:border-blue-500 resize-y" value={char.data.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Character notes..." />
      </section>
    </div>
  );
}