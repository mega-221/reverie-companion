import { useState } from 'react';
import type { Character, CompendiumEntry } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import { 
  ATTRIBUTE_NAMES, ATTRIBUTE_DESCRIPTIONS, CORE_SKILL_DESCRIPTIONS, 
  SPECIAL_SKILL_DESCRIPTIONS, SKILL_GROUPS, SKILL_XP_COSTS, ORIGIN_CHOICES, 
  getSpeedData, getTypeStyle, getMaxAttribute, getMinSkillRank, Tooltip
} from './utils';

export function LevelUpModal({ char, levelUpTarget, setLevelUpTarget, handleAdvance, handleRegress }: any) {
  if (!levelUpTarget) return null;

  let title = ''; let description = ''; let currentRank = 0; let maxRank = 0; let minRank = 0; let xpCost = 0; let isMaxed = false; let isMinned = false;

  if (levelUpTarget.type === 'attribute') {
    title = `${ATTRIBUTE_NAMES[levelUpTarget.key as keyof typeof ATTRIBUTE_NAMES]}`;
    description = ATTRIBUTE_DESCRIPTIONS[levelUpTarget.key as keyof typeof ATTRIBUTE_DESCRIPTIONS];
    currentRank = char.data.attributes[levelUpTarget.key as keyof typeof char.data.attributes];
    maxRank = getMaxAttribute(char.data.progression.tier);
    minRank = 1;
    isMaxed = currentRank >= maxRank;
    isMinned = currentRank <= minRank;
  } else if (levelUpTarget.type === 'skill') {
    title = levelUpTarget.key;
    description = CORE_SKILL_DESCRIPTIONS[levelUpTarget.key];
    currentRank = char.data.skills[levelUpTarget.key] ?? 0;
    const attr = Object.keys(SKILL_GROUPS).find(a => (SKILL_GROUPS[a as keyof typeof SKILL_GROUPS].skills as readonly string[]).includes(levelUpTarget.key)) as keyof typeof char.data.attributes;
    maxRank = Math.min(8, char.data.attributes[attr] * 2);
    minRank = getMinSkillRank(levelUpTarget.key, char);
    xpCost = currentRank < 8 ? SKILL_XP_COSTS[currentRank] : 0;
    isMaxed = currentRank >= maxRank;
    isMinned = currentRank <= minRank;
  } else if (levelUpTarget.type === 'specialSkill') {
    const skill = char.data.specialSkills[levelUpTarget.index];
    title = skill.name || 'Special Skill';
    description = SPECIAL_SKILL_DESCRIPTIONS[skill.name] || '';
    currentRank = skill.rank;
    const attr = skill.attribute as keyof typeof char.data.attributes;
    maxRank = Math.min(8, char.data.attributes[attr] * 2);
    minRank = getMinSkillRank(skill.name, char);
    xpCost = currentRank < 8 ? SKILL_XP_COSTS[currentRank] : 0;
    isMaxed = currentRank >= maxRank;
    isMinned = currentRank <= minRank;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
          <h2 className="font-cinzel font-bold text-xl text-gray-200">Advance {title}</h2>
          <button onClick={() => setLevelUpTarget(null)} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {description && <p className="text-sm italic text-gray-200 border-l-2 border-gray-600 pl-3">{description}</p>}
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 flex flex-col items-center justify-center">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Current Rank</div>
            <div className="text-3xl font-bold text-white mb-2">{currentRank} <span className="text-lg text-gray-500 font-normal">/ {maxRank}</span></div>
            {levelUpTarget.type !== 'attribute' && <div className="text-xs text-blue-400 font-bold bg-blue-900/30 px-2 py-1 rounded">{isMaxed ? 'Maximum Rank Reached' : `Next Rank Cost: ${xpCost} XP`}</div>}
            {levelUpTarget.type === 'attribute' && isMaxed && <div className="text-xs text-red-400 font-bold bg-red-900/30 px-2 py-1 rounded">Tier Limit Reached</div>}
          </div>
          <div className="flex gap-2 w-full mt-2">
            <button onClick={handleRegress} disabled={isMinned} className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-colors flex items-center justify-center gap-2 ${isMinned ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-red-950/40 text-red-300 border-red-900 hover:bg-red-900/60'}`}><span>←</span> Regress</button>
            <button onClick={handleAdvance} disabled={isMaxed || (levelUpTarget.type !== 'attribute' && char.data.progression.xp < xpCost)} className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-colors flex items-center justify-center gap-2 ${isMaxed || (levelUpTarget.type !== 'attribute' && char.data.progression.xp < xpCost) ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-green-950/40 text-green-300 border-green-900 hover:bg-green-900/60'}`}>Advance <span>→</span></button>
          </div>
          <div className="flex justify-between items-center text-sm font-bold text-gray-400 mt-2 bg-gray-900/50 p-2 rounded"><span>Available XP:</span><span className="text-yellow-400">{char.data.progression.xp}</span></div>
        </div>
      </div>
    </div>
  );
}

export function OriginModal({ char, isOpen, onClose, applyOrigin }: any) {
  const { entries } = useCompendium();
  const [modalOriginPlane, setModalOriginPlane] = useState<string>('Generic');
  const [expandedOrigin, setExpandedOrigin] = useState<string | null>(null);
  const [tempChoices, setTempChoices] = useState<Record<string, string>>({});
  
  if (!isOpen) return null;
  const allOrigins = entries.filter(e => e.type === 'origin');
  const PLANES = ['Generic', 'Eterion', 'Agmar', 'Vesperik', 'Duiber', 'Lior'];

  const handleOpen = (originId: string, originName: string) => {
    setExpandedOrigin(expandedOrigin === originId ? null : originId);
    if (char.data.identity.origin !== originName) setTempChoices({});
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
          <h2 className="font-cinzel font-bold text-xl text-gray-200">Select Origin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
        </div>
        <div className="p-4 border-b border-gray-700 bg-gray-800/50 shrink-0">
          <div className="flex flex-wrap gap-2">
            {PLANES.map(plane => (
              <button key={plane} onClick={() => { setModalOriginPlane(plane); setExpandedOrigin(null); }} className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors border ${modalOriginPlane === plane ? 'bg-red-900/50 text-red-200 border-red-700' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'}`}>{plane}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {allOrigins.filter(o => o.data.plane === modalOriginPlane).map(origin => {
            const isExpanded = expandedOrigin === origin.id;
            const choices = ORIGIN_CHOICES[origin.name];
            return (
              <div key={origin.id} className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                <button onClick={() => handleOpen(origin.id, origin.name)} className="w-full text-left p-3 hover:bg-gray-800/50 transition-colors flex justify-between items-center group">
                  <span className="font-bold text-gray-200 group-hover:text-white">{origin.name}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">{origin.data.plane}</span>
                </button>
                {isExpanded && (
                  <div className="p-4 border-t border-gray-700 bg-black/20 text-sm">
                    {origin.data.lore && <div className="mb-4 text-sm italic text-gray-200 border-l-2 border-gray-600 pl-3">"{origin.data.lore}"</div>}
                    <div className="grid grid-cols-[100px_1fr] gap-2 mb-4 text-gray-300">
                      <div className="font-bold text-gray-500 text-[10px] tracking-wider text-right mt-0.5">Inspiration</div><div>{origin.data.inspiration || 'None'}</div>
                      <div className="font-bold text-gray-500 text-[10px] tracking-wider text-right mt-0.5">Starting Skills</div><div>{origin.data.starting || 'None'}</div>
                    </div>
                    {choices && (
                      <div className="mb-4 space-y-3 p-3 bg-gray-800/50 rounded border border-gray-700">
                        {choices.map((choice: any) => {
                          const selectedValue = tempChoices[choice.id];
                          const skillDesc = CORE_SKILL_DESCRIPTIONS[selectedValue] || SPECIAL_SKILL_DESCRIPTIONS[selectedValue] || '';
                          return (
                            <div key={choice.id}>
                              <label className="block text-xs font-bold text-red-400 mb-1">{choice.label}</label>
                              <select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500" value={selectedValue || ''} onChange={(e) => setTempChoices({ ...tempChoices, [choice.id]: e.target.value })}>
                                <option value="">— Select —</option>
                                {choice.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              {selectedValue && skillDesc && <div className="text-xs text-gray-300 mt-1 italic border-l-2 border-gray-700 pl-2">{skillDesc}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button onClick={() => {
                      if (choices) { const missing = choices.find((c: any) => !tempChoices[c.id]); if (missing) { alert('Please make a selection for all choices.'); return; } }
                      applyOrigin(origin.name, tempChoices); onClose(); setExpandedOrigin(null); setTempChoices({});
                    }} className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors">Confirm Selection</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ClassModal({ char, isOpen, onClose, patch }: any) {
  const { getClasses } = useCompendium();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
          <h2 className="font-cinzel font-bold text-xl text-gray-200">Select Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {['Champion', 'Scoundrel', 'Guide', 'Scholar', 'Mystic', 'Aberration'].map(archetype => {
            const classes = getClasses().filter((c: any) => c.data.archetype === archetype);
            if (classes.length === 0) return null;
            return (
              <div key={archetype}>
                <div className="bg-gray-800 text-xs font-bold text-red-400 uppercase tracking-widest py-2 border-b border-gray-700 mb-2">{archetype}</div>
                <div className="space-y-2">
                  {classes.map((c: any) => (
                    <button key={c.id} onClick={() => { patch({ identity: { ...char.data.identity, className: c.name, path: '' } }); onClose(); }} className={`w-full text-left p-3 border rounded-lg transition-colors flex justify-between items-center ${char.data.identity.className === c.name ? 'bg-red-900/30 border-red-700 text-red-100' : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-700/50 hover:border-gray-500'}`}>
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
  );
}

export function SpecialSkillModal({ char, isOpen, onClose, patch, modalIndex }: any) {
  const { getSpecialSkills } = useCompendium();
  const [expandedSpecialSkill, setExpandedSpecialSkill] = useState<string | null>(null);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
          <h2 className="font-cinzel font-bold text-xl text-gray-200">Select Special Skill</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {(Object.keys(ATTRIBUTE_NAMES) as Array<keyof typeof ATTRIBUTE_NAMES>).map(attr => {
            const skills = getSpecialSkills().filter((s: any) => s.data.attribute === attr);
            if (skills.length === 0) return null;
            return (
              <div key={attr}>
                <div className={`bg-gray-800 text-xs font-bold uppercase tracking-widest py-2 border-b border-gray-700 mb-2 ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color}`}>{ATTRIBUTE_NAMES[attr]}</div>
                <div className="space-y-2">
                  {skills.map((s: any) => {
                    const isExpanded = expandedSpecialSkill === s.id;
                    return (
                      <div key={s.id} className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                        <button onClick={() => setExpandedSpecialSkill(isExpanded ? null : s.id)} className="w-full text-left p-3 hover:bg-gray-800/50 transition-colors flex justify-between items-center group">
                          <span className="font-bold text-gray-200 group-hover:text-white">{s.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color} border-current`}>{attr.toUpperCase()}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-4 border-t border-gray-700 bg-black/20">
                            <p className="text-sm italic text-gray-200 mb-4 border-l-2 border-gray-700 pl-2">{s.data.description}</p>
                            <button onClick={() => { if (modalIndex !== null) { const next = [...char.data.specialSkills]; next[modalIndex] = { ...next[modalIndex], name: s.name }; patch({ specialSkills: next }); } onClose(); setExpandedSpecialSkill(null); }} className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors">Confirm Selection</button>
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
  );
}

export function AbilityModal({ char, isOpen, onClose, patch, modalIndex }: any) {
  const { getDisciplines, getAbilities } = useCompendium();
  const [modalDiscipline, setModalDiscipline] = useState<string>('');
  const [expandedModalAbility, setExpandedModalAbility] = useState<string | null>(null);
  
  const classRank = Math.max(0, Math.min(4, char.data.progression.tier - 1));
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
          <h2 className="font-cinzel font-bold text-xl text-gray-200">Select Ability</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
        </div>
        <div className="p-4 border-b border-gray-700 bg-gray-800/50 shrink-0">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Filter by Discipline</label>
          <div className="flex flex-wrap gap-2">
            {getDisciplines().map((disc: any) => (
              <button key={disc.id} onClick={() => { setModalDiscipline(disc.name); setExpandedModalAbility(null); }} className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors border ${modalDiscipline === disc.name ? 'bg-red-900/50 text-red-200 border-red-700' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'}`}>{disc.name}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!modalDiscipline && <p className="text-center text-gray-500 italic py-8">Select a discipline above to view available abilities.</p>}
          {modalDiscipline && (() => {
            const abilities = getAbilities().filter((a: any) => a.data.source === modalDiscipline);
            const groupedByRank = abilities.reduce((acc: any, ab: any) => { const rank = ab.data.class_rank ?? 0; if (!acc[rank]) acc[rank] = []; acc[rank].push(ab); return acc; }, {} as Record<number, CompendiumEntry[]>);
            const ranks = Object.keys(groupedByRank).map(Number).sort((a, b) => a - b);
            if (ranks.length === 0) return <p className="text-center text-gray-500 italic">No abilities found for this discipline.</p>;
            
            return ranks.map(rank => (
              <div key={rank}>
                <div className="bg-gray-800 text-xs font-bold text-red-400 uppercase tracking-widest py-2 border-b border-gray-700 mb-2">Rank {rank}</div>
                <div className="space-y-2">
                  {groupedByRank[rank].map((ab: any) => {
                    const speedData = getSpeedData(ab.data.speed, ab.data.upkeep);
                    const isExpanded = expandedModalAbility === ab.id;
                    const hasDiscipline = ab.data.source ? char.data.disciplines.includes(ab.data.source) : false;
                    const isRankLocked = (ab.data.class_rank || 0) > classRank;
                    
                    const statsToShow = [{ label: 'Strain', value: `${ab.data.sn_cost ?? 0} SN`, color: 'text-blue-400' }];
                    if (ab.data.type === 'attack') statsToShow.push({ label: 'Accuracy', value: ab.data.acc ?? '+0', color: 'text-green-400' }, { label: 'Damage', value: ab.data.dmg ?? '+0', color: 'text-red-400' });
                    if (ab.data.type === 'defensive') statsToShow.push({ label: 'Evasion', value: ab.data.eva ?? '+0', color: 'text-purple-400' });
                    statsToShow.push({ label: 'Requires', value: ab.data.requirement || 'None', color: 'text-gray-300' });

                    return (
                      <div key={ab.id} className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''} ${isRankLocked ? 'opacity-50 grayscale' : ''}`}>
                        <button onClick={() => setExpandedModalAbility(isExpanded ? null : ab.id)} className="w-full text-left p-3 hover:bg-gray-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                          <span className={`font-bold group-hover:text-white ${isRankLocked ? 'text-gray-400' : 'text-gray-200'}`}>{ab.name}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {ab.data.type && <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(ab.data.type)}`}>{ab.data.type}</span>}
                            {speedData && <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">{speedData.speedLabel}</span>}
                            {speedData?.upkeepLabel && <span className="bg-teal-900/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-700/50">{speedData.upkeepLabel}</span>}
                            {ab.data.range && <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">{ab.data.range}</span>}
                            {ab.data.class_rank !== undefined && (
                              <span className={`bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-600 ${isRankLocked ? 'text-red-400' : 'text-gray-300'}`}>
                                {isRankLocked ? `Rank ${ab.data.class_rank} (Locked)` : `Rank ${ab.data.class_rank}`}
                              </span>
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="p-4 border-t border-gray-700 bg-black/20">
                            <div className="flex flex-wrap justify-between gap-2 mb-3 bg-gray-900/50 p-2 rounded border border-gray-800 shadow-inner text-center">
                              {statsToShow.map((stat, idx) => <div key={idx} className={`flex-1 flex flex-col items-center justify-center min-w-[80px] ${idx !== statsToShow.length - 1 ? 'border-r border-gray-700' : ''}`}><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</span><span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span></div>)}
                            </div>
                            <p className="text-sm italic text-gray-200 mb-4 border-l-2 border-gray-700 pl-2">{ab.data.description}</p>
                            {hasDiscipline ? (
                              <button onClick={() => { if (modalIndex !== null) { const next = [...char.data.abilities]; next[modalIndex] = { ...next[modalIndex], name: ab.name }; patch({ abilities: next }); } onClose(); setExpandedModalAbility(null); }} className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors">Confirm Selection</button>
                            ) : (
                              <Tooltip text="You must have this discipline to select this ability." noBorder><button disabled className="w-full py-2 bg-gray-700 text-gray-500 font-bold text-sm rounded cursor-not-allowed">Requires Discipline</button></Tooltip>
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
  );
}