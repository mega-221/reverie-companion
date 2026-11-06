import { useEffect, useState, Fragment } from 'react';
import { supabase } from './supabase';
import type { Character } from './types';
import { vigorMax, strainMax, dpMax, evasion, movementTiles, burdenMax, currentBurden } from './calc';

const SKILL_GROUPS = {
  grt: ['Athletics', 'Brawling', 'Endurance'],
  ref: ['Dexterity', 'Perception', 'Stealth'],
  int: ['Knowledge', 'Reasoning', 'Survival'],
  psy: ['Intuition', 'Persuasion', 'Willpower'],
} as const;

// All 12 Special Skills mapped to their attributes
const SPECIAL_SKILL_ATTRIBUTES: Record<string, 'grt' | 'ref' | 'int' | 'psy'> = {
  Carry: 'grt', Discipline: 'grt', Stance: 'grt',
  Interface: 'ref', Pilot: 'ref', Scout: 'ref',
  Engineering: 'int', Lore: 'int', Medicine: 'int',
  Authority: 'psy', Deception: 'psy', Whisper: 'psy'
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

export default function CharacterSheet({ id }: { id: string }) {
  const [char, setChar] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('characters').select('*').eq('id', id).single()
      .then(({ data }) => setChar(data as Character));
  }, [id]);

  if (!char) return <p className="text-gray-500 p-8">Loading character...</p>;

  function patch(p: Partial<Character['data']>) {
    setChar(c => c && { ...c, data: { ...c.data, ...p } });
    setSaved(false);
  }

  function updateTracker(key: 'vigor' | 'strain' | 'dp', amount: number) {
    if (!char) return;
    const current = char.data.trackers[key];
    
    let max = vigorMax(char.data);
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

  return (
    <div className="mt-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{char.name}</h1>
        <button onClick={save} disabled={saving} 
          className={`px-4 py-2 rounded text-white font-medium ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* DERIVED STATS & LIVE TRACKERS PANEL */}
      <div className="flex flex-wrap justify-center md:justify-between items-center bg-gray-50 p-4 rounded-lg mb-8 border shadow-sm gap-6">
        {/* Vigor */}
        <div className="flex flex-col items-center">
          <div className="text-gray-500 text-xs font-bold uppercase mb-2">Vigor</div>
          <div className="flex items-center gap-3 bg-white border rounded-md p-1 shadow-sm">
            <button onClick={() => updateTracker('vigor', -1)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded font-bold flex items-center justify-center text-lg">−</button>
            <div className="w-16 text-center font-bold text-xl">
              {char.data.trackers.vigor} <span className="text-sm text-gray-400 font-normal">/ {vigorMax(char.data)}</span>
            </div>
            <button onClick={() => updateTracker('vigor', 1)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded font-bold flex items-center justify-center text-lg">+</button>
          </div>
        </div>

        {/* Strain */}
        <div className="flex flex-col items-center">
          <div className="text-gray-500 text-xs font-bold uppercase mb-2">Strain</div>
          <div className="flex items-center gap-3 bg-white border rounded-md p-1 shadow-sm">
            <button onClick={() => updateTracker('strain', -1)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded font-bold flex items-center justify-center text-lg">−</button>
            <div className="w-16 text-center font-bold text-xl">
              {char.data.trackers.strain} <span className="text-sm text-gray-400 font-normal">/ {strainMax(char.data)}</span>
            </div>
            <button onClick={() => updateTracker('strain', 1)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded font-bold flex items-center justify-center text-lg">+</button>
          </div>
        </div>

        {/* Destiny */}
        <div className="flex flex-col items-center">
          <div className="text-gray-500 text-xs font-bold uppercase mb-2">Destiny</div>
          <div className="flex items-center gap-3 bg-white border rounded-md p-1 shadow-sm">
            <button onClick={() => updateTracker('dp', -1)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded font-bold flex items-center justify-center text-lg">−</button>
            <div className="w-16 text-center font-bold text-xl">
              {char.data.trackers.dp} <span className="text-sm text-gray-400 font-normal">/ {dpMax(char.data)}</span>
            </div>
            <button onClick={() => updateTracker('dp', 1)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded font-bold flex items-center justify-center text-lg">+</button>
          </div>
        </div>

        {/* Static Stats */}
        <div className="flex flex-col items-center"><div className="text-gray-500 text-xs uppercase font-bold mb-1">Evasion</div><div className="font-bold text-xl">{evasion(char.data)}</div></div>
        <div className="flex flex-col items-center"><div className="text-gray-500 text-xs uppercase font-bold mb-1">Movement</div><div className="font-bold text-xl">{movementTiles(char.data)}</div></div>
        <div className="flex flex-col items-center"><div className="text-gray-500 text-xs uppercase font-bold mb-1">Burden</div><div className="font-bold text-xl">{currentBurden(char.data)} / {burdenMax(char.data)}</div></div>
      </div>

      {/* IDENTITY */}
      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3 border-b pb-1">Identity</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="flex flex-col text-sm">Origin<input className="border p-1 rounded" value={char.data.identity.origin} onChange={e => patch({ identity: { ...char.data.identity, origin: e.target.value } })} /></label>
          <label className="flex flex-col text-sm">Class<input className="border p-1 rounded" value={char.data.identity.className} onChange={e => patch({ identity: { ...char.data.identity, className: e.target.value } })} /></label>
          <label className="flex flex-col text-sm">Path<input className="border p-1 rounded" value={char.data.identity.path} onChange={e => patch({ identity: { ...char.data.identity, path: e.target.value } })} /></label>
          <label className="flex flex-col text-sm">Tier<input type="number" min={1} max={6} className="border p-1 rounded" value={char.data.identity.tier} onChange={e => patch({ identity: { ...char.data.identity, tier: +e.target.value } })} /></label>
          <label className="flex flex-col text-sm">Level<input type="number" min={1} className="border p-1 rounded" value={char.data.identity.level} onChange={e => patch({ identity: { ...char.data.identity, level: +e.target.value } })} /></label>
          <label className="flex flex-col text-sm">XP<input type="number" min={0} className="border p-1 rounded" value={char.data.identity.xp} onChange={e => patch({ identity: { ...char.data.identity, xp: +e.target.value } })} /></label>
        </div>
      </section>

      {/* ATTRIBUTES */}
      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3 border-b pb-1">Attributes</h2>
        <div className="grid grid-cols-4 gap-4 max-w-md">
          {(['grt', 'ref', 'int', 'psy'] as const).map(k => (
            <label key={k} className="flex flex-col text-sm font-bold uppercase text-center">
              {k}
              <input type="number" min={1} max={4} className="border p-2 rounded text-center mt-1" value={char.data.attributes[k]} onChange={e => patch({ attributes: { ...char.data.attributes, [k]: Math.min(4, Math.max(1, +e.target.value)) } })} />
            </label>
          ))}
        </div>
      </section>

      {/* CORE SKILLS */}
      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3 border-b pb-1">Core Skills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(SKILL_GROUPS).map(([attr, skills]) => (
            <div key={attr}>
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase">{attr}</div>
              {skills.map(s => {
                const attrKey = attr as keyof typeof char.data.attributes;
                const maxSkill = Math.min(8, char.data.attributes[attrKey] * 2);
                
                return (
                  <label key={s} className="flex justify-between items-center mb-1">
                    <span className="text-sm">{s}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Max: {maxSkill}</span>
                      <input type="number" min={0} max={maxSkill} className="border p-1 w-16 text-center rounded" 
                        value={char.data.skills[s] ?? 0} 
                        onChange={e => {
                          const val = +e.target.value;
                          patch({ skills: { ...char.data.skills, [s]: Math.min(maxSkill, Math.max(0, val)) } });
                        }} 
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* SPECIAL SKILLS */}
      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3 border-b pb-1">Special Skills (max 5)</h2>
        <div className="flex flex-col gap-2 max-w-lg">
          {char.data.specialSkills.map((s, i) => {
            const attr = s.attribute || 'grt'; 
            const maxSkill = Math.min(8, char.data.attributes[attr as keyof typeof char.data.attributes] * 2);
            
            return (
              <div key={i} className="flex gap-2 items-center">
                <select className="border p-1 flex-1 rounded" value={s.name}
                  onChange={e => {
                    const newName = e.target.value;
                    const newAttr = SPECIAL_SKILL_ATTRIBUTES[newName] || 'grt';
                    const next = [...char.data.specialSkills];
                    next[i] = { ...next[i], name: newName, attribute: newAttr };
                    patch({ specialSkills: next });
                  }}>
                  <option value="">— Select Skill —</option>
                  {Object.keys(SPECIAL_SKILL_ATTRIBUTES).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                <span className="text-xs font-bold text-gray-500 uppercase w-8 text-center">{attr}</span>
                <span className="text-xs text-gray-400">Max: {maxSkill}</span>
                
                <input type="number" min={0} max={maxSkill} className="border p-1 w-16 text-center rounded" value={s.rank} 
                  onChange={e => { 
                    const next = [...char.data.specialSkills]; 
                    next[i] = { ...next[i], rank: Math.min(maxSkill, Math.max(0, +e.target.value)) }; 
                    patch({ specialSkills: next }); 
                  }} />
                
                <button className="px-2 text-red-500 font-bold" onClick={() => patch({ specialSkills: char.data.specialSkills.filter((_, j) => j !== i) })}>×</button>
              </div>
            );
          })}
          {char.data.specialSkills.length < 5 && (
            <button className="border px-2 py-1 text-sm rounded hover:bg-gray-50 w-fit mt-1" 
              onClick={() => patch({ specialSkills: [...char.data.specialSkills, { name: '', rank: 0, attribute: 'grt' }] })}>
              + add special skill
            </button>
          )}
        </div>
      </section>

      {/* CONVICTIONS & FAILINGS (Side by Side) */}
      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3 border-b pb-1">Convictions & Failings</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
          
          {/* Headers */}
          <div className="font-bold text-sm text-gray-500 uppercase hidden lg:block">Conviction</div>
          <div className="font-bold text-sm text-gray-500 uppercase hidden lg:block">Linked Failing</div>

          {/* Rows (Loop 3 times for max convictions) */}
          {[...Array(3)].map((_, i) => {
            const conviction = char.data.convictions[i];
            const failing = char.data.failings.find(f => f.convictionIndex === i);

            if (!conviction && !failing) return null;

            return (
              <Fragment key={i}>
                
                {/* LEFT: Conviction */}
                <div className="flex flex-col">
                  {conviction ? (
                    <div className="bg-blue-50/50 p-3 rounded border border-blue-100 flex-1">
                      <div className="flex flex-wrap gap-2 mb-2 items-center">
                        <select className="border p-1 rounded text-sm" value={conviction.season} onChange={e => { 
                          const next = [...char.data.convictions]; 
                          next[i] = { ...next[i], season: e.target.value, name: '', statement: '' }; 
                          patch({ convictions: next }); 
                        }}>
                          {SEASONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                        
                        <select className="border p-1 rounded text-sm" value={conviction.name} onChange={e => { 
                          const newName = e.target.value;
                          const next = [...char.data.convictions]; 
                          next[i] = { ...next[i], name: newName, statement: CONVICTION_STATEMENTS[newName] || '' }; 
                          patch({ convictions: next }); 
                        }}>
                          <option value="">—</option>
                          {(CONVICTION_NAMES[conviction.season as keyof typeof CONVICTION_NAMES] ?? []).map(n => <option key={n}>{n}</option>)}
                        </select>
                        
                        <span className="text-xs text-gray-500 font-bold ml-auto">Rank</span>
                        <input type="number" min={1} max={5} className="border p-1 w-12 text-center rounded text-sm" value={conviction.rank} onChange={e => { 
                          const next = [...char.data.convictions]; 
                          next[i] = { ...next[i], rank: Math.min(5, Math.max(1, +e.target.value)) }; 
                          patch({ convictions: next }); 
                        }} />
                        
                        <button className="px-1 text-red-500 font-bold hover:text-red-700" onClick={() => {
                          const nextConvs = char.data.convictions.filter((_, j) => j !== i);
                          // Shift remaining failings up if a conviction is removed
                          const nextFails = char.data.failings
                            .filter(f => f.convictionIndex !== i)
                            .map(f => f.convictionIndex > i ? { ...f, convictionIndex: f.convictionIndex - 1 } : f);
                          patch({ convictions: nextConvs, failings: nextFails });
                        }}>×</button>
                      </div>
                      
                      <div className="text-sm italic text-gray-800 border-l-2 border-blue-300 pl-2">
                        "{conviction.statement || 'Select a conviction to see its oath...'}"
                      </div>
                    </div>
                  ) : <div className="flex-1"></div>}
                </div>

                {/* RIGHT: Failing */}
                <div className="flex flex-col">
                  {failing ? (
                    <div className="bg-red-50/50 p-3 rounded border border-red-100 flex-1">
                      <div className="flex flex-wrap gap-2 mb-2 items-center">
                        <select className="border p-1 rounded text-sm flex-1" value={failing.name} onChange={e => { 
                          const newName = e.target.value;
                          const next = [...char.data.failings]; 
                          const realIndex = char.data.failings.findIndex(f => f.convictionIndex === i);
                          next[realIndex] = { ...next[realIndex], name: newName, statement: FAILING_STATEMENTS[newName] || '' }; 
                          patch({ failings: next }); 
                        }}>
                          <option value="">— Select Failing —</option>
                          {FAILINGS.map(n => <option key={n}>{n}</option>)}
                        </select>
                        
                        <span className="text-xs text-gray-500 font-bold">Rank</span>
                        <input type="number" min={1} max={4} className="border p-1 w-12 text-center rounded text-sm" value={failing.rank} onChange={e => { 
                          const next = [...char.data.failings]; 
                          const realIndex = char.data.failings.findIndex(f => f.convictionIndex === i);
                          next[realIndex] = { ...next[realIndex], rank: Math.min(4, Math.max(1, +e.target.value)) }; 
                          patch({ failings: next }); 
                        }} />
                        
                        <button className="px-1 text-red-500 font-bold hover:text-red-700" onClick={() => {
                          patch({ failings: char.data.failings.filter(f => f.convictionIndex !== i) });
                        }}>×</button>
                      </div>
                      
                      <div className="text-sm italic text-gray-800 border-l-2 border-red-300 pl-2">
                        "{failing.statement || 'Select a failing to see its compulsion...'}"
                      </div>
                    </div>
                  ) : (
                    conviction && (
                      <button onClick={() => {
                        patch({ failings: [...char.data.failings, { name: '', rank: 1, convictionIndex: i, statement: '' }] });
                      }} className="w-full h-full min-h-[80px] border-2 border-dashed border-gray-200 rounded text-gray-400 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center p-2 text-sm transition-colors">
                        + Add Failing paired to this Conviction
                      </button>
                    )
                  )}
                </div>
              </Fragment>
            );
          })}

          {/* Add Conviction Button */}
          {char.data.convictions.length < 3 && (
            <div className="col-span-1 lg:col-span-2 mt-2">
              <button className="border px-3 py-2 text-sm rounded hover:bg-gray-50 shadow-sm font-medium" 
                onClick={() => patch({ convictions: [...char.data.convictions, { season: 'Vamor', name: '', statement: '', rank: 1 }] })}>
                + Add Conviction
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ABILITIES & ITEMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <section>
          <h2 className="font-bold text-lg mb-3 border-b pb-1">Active Abilities (max 6)</h2>
          {char.data.abilities.map((a, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <input className="border p-1 flex-1 rounded" value={a} onChange={e => { const next = [...char.data.abilities]; next[i] = e.target.value; patch({ abilities: next }); }} />
              <button className="px-2 text-red-500 font-bold" onClick={() => patch({ abilities: char.data.abilities.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
          {char.data.abilities.length < 6 && (
            <button className="border px-2 py-1 text-sm rounded hover:bg-gray-50" onClick={() => patch({ abilities: [...char.data.abilities, ''] })}>+ add ability</button>
          )}
        </section>

        <section>
          <h2 className="font-bold text-lg mb-3 border-b pb-1">Items</h2>
          {char.data.items.map((it, i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input className="border p-1 flex-1 rounded" placeholder="Name" value={it.name} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], name: e.target.value }; patch({ items: n }); }} />
              <input type="number" className="border p-1 w-16 rounded" placeholder="Burden" value={it.burden} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], burden: +e.target.value }; patch({ items: n }); }} />
              <input type="number" className="border p-1 w-14 rounded" placeholder="Qty" value={it.qty} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], qty: +e.target.value }; patch({ items: n }); }} />
              <button className="px-2 text-red-500 font-bold" onClick={() => patch({ items: char.data.items.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
          <button className="border px-2 py-1 text-sm rounded hover:bg-gray-50 mt-1" onClick={() => patch({ items: [...char.data.items, { name: '', burden: 0, qty: 1 }] })}>+ add item</button>
        </section>
      </div>

      {/* NOTES */}
      <section>
        <h2 className="font-bold text-lg mb-3 border-b pb-1">Notes</h2>
        <textarea className="border p-2 w-full h-32 rounded" value={char.data.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Character notes..." />
      </section>
    </div>
  );
}