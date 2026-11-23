import { useState } from 'react';
import type { CompendiumEntry } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { KeywordText } from '../../common/KeywordText';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { getCoreSkillAttribute, splitLines } from '../../../constants/reverie';
import { 
  ATTRIBUTE_NAMES, ATTRIBUTE_DESCRIPTIONS, CORE_SKILL_DESCRIPTIONS, 
  SPECIAL_SKILL_DESCRIPTIONS, SKILL_GROUPS, SKILL_XP_COSTS, ORIGIN_CHOICES, 
  getSpeedData, getTypeStyle, getMaxAttribute, getMinSkillRank, Tooltip,
  getMaxAttributePoints, getSpentAttributePoints
} from '../utils';
import {
  getAttributeInjuryPenalty,
  getBurdenPenalty,
  isAttributeAffectedByBurden,
} from '../../../calc';
import {
  calculateTierFromLevel,
  isSkillInspired,
  getSkillMaxRank,
  getSpendableXp,
  type AbilityPickTask,
} from '../progression/progressionData';

const MODAL_BG = "sheet-modal animate-in zoom-in-95 duration-200";

export function LevelUpModal({ char, levelUpTarget, setLevelUpTarget, handleAdvance, handleRegress }: any) {
  const { getEntryByName } = useCompendium();
  useBodyScrollLock(Boolean(levelUpTarget));
  
  if (!levelUpTarget) return null;

  let title = ''; 
  let description = ''; 
  let currentRank = 0; 
  let maxRank = 0; 
  let minRank = 0; 
  let xpCost = 0; 
  let baseCost = 0; 
  let isMaxed = false; 
  let isMinned = false; 
  let isInspired = false;
  let availableAttrPts = 0; 
  let isOutOfAttrPts = false;
  let injuryPenalty = 0;
  let burdenPenalty = 0;

  if (levelUpTarget.type === 'attribute') {
    title = `${ATTRIBUTE_NAMES[levelUpTarget.key as keyof typeof ATTRIBUTE_NAMES]}`;
    description = ATTRIBUTE_DESCRIPTIONS[levelUpTarget.key as keyof typeof ATTRIBUTE_DESCRIPTIONS];
    currentRank = char.data.attributes[levelUpTarget.key as keyof typeof char.data.attributes];
    maxRank = getMaxAttribute(char.data.progression.tier);
    minRank = 1;
    isMaxed = currentRank >= maxRank;
    isMinned = currentRank <= minRank;
    
    availableAttrPts = getMaxAttributePoints(char.data.progression.tier) - getSpentAttributePoints(char.data.attributes);
    isOutOfAttrPts = availableAttrPts <= 0;
  } else if (levelUpTarget.type === 'skill') {
    title = levelUpTarget.key;
    description = CORE_SKILL_DESCRIPTIONS[levelUpTarget.key];
    currentRank = char.data.skills[levelUpTarget.key] ?? 0;
    const attr = getCoreSkillAttribute(levelUpTarget.key);
    minRank = getMinSkillRank(levelUpTarget.key, char);
    maxRank = getSkillMaxRank(levelUpTarget.key, char.data.attributes[attr], minRank, char.data);
    baseCost = currentRank < 8 ? SKILL_XP_COSTS[currentRank] : 0;
    isInspired = isSkillInspired(levelUpTarget.key, char.data);
    xpCost = isInspired ? Math.max(0, baseCost - 1) : baseCost;
    isMaxed = currentRank >= maxRank;
    isMinned = currentRank <= minRank;

    injuryPenalty = getAttributeInjuryPenalty(char.data.trackers.injuries, String(attr).toUpperCase());
    if (isAttributeAffectedByBurden(String(attr))) {
      burdenPenalty = getBurdenPenalty(char.data, getEntryByName);
    }
  } else if (levelUpTarget.type === 'specialSkill') {
    const skill = char.data.specialSkills[levelUpTarget.index];
    title = skill.name || 'Special Skill';
    description = SPECIAL_SKILL_DESCRIPTIONS[skill.name] || '';
    currentRank = skill.rank;
    
    // Look up the actual attribute from the compendium to ensure correct penalty calculation
    const compendiumAttr = getEntryByName(skill.name)?.data?.attribute;
    const attr = (compendiumAttr || skill.attribute || 'grt') as keyof typeof char.data.attributes;
    
    minRank = getMinSkillRank(skill.name, char);
    maxRank = getSkillMaxRank(skill.name, char.data.attributes[attr], minRank, char.data);
    baseCost = currentRank < 8 ? SKILL_XP_COSTS[currentRank] : 0;
    isInspired = isSkillInspired(skill.name, char.data);
    xpCost = isInspired ? Math.max(0, baseCost - 1) : baseCost;
    isMaxed = currentRank >= maxRank;
    isMinned = currentRank <= minRank;

    injuryPenalty = getAttributeInjuryPenalty(char.data.trackers.injuries, String(attr).toUpperCase());
    if (isAttributeAffectedByBurden(String(attr))) {
      burdenPenalty = getBurdenPenalty(char.data, getEntryByName);
    }
  }

  const totalPenalty = injuryPenalty + burdenPenalty;
  const availableSpendableXp = getSpendableXp(char.data);
  const isAdvanceDisabled = 
    (levelUpTarget.type === 'attribute' && (isMaxed || isOutOfAttrPts)) ||
    (levelUpTarget.type !== 'attribute' && (isMaxed || availableSpendableXp < xpCost));

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${MODAL_BG} max-w-sm`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-bold text-xl text-gray-200">Advance {title}</h2>
          <button onClick={() => setLevelUpTarget(null)} className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {description && (
            <div className="text-sm italic text-gray-200 border-l-2 border-gray-600 pl-3">
              {splitLines(description).map((line: string, idx: number) => <span key={idx} className="block mb-1 last:mb-0">{line}</span>)}
            </div>
          )}
          
          <div className="bg-black/20 rounded-lg p-3 border border-gray-700 flex flex-col items-center justify-center shadow-inner">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Current Rank</div>
            <div className="text-3xl font-bold text-white mb-2">{currentRank} <span className="text-lg text-gray-500 font-normal">/ {maxRank}</span></div>
            
            {totalPenalty > 0 && (
              <div className="rev-keep-color text-xs text-red-400 font-bold bg-red-950/40 px-2 py-1 rounded border border-red-900/50 mb-2 text-center">
                Effective Rank: {currentRank - totalPenalty} <br/>
                <span className="text-[10px] font-normal text-red-300">
                  {[
                    injuryPenalty > 0 ? `-${injuryPenalty} from Injuries` : '',
                    burdenPenalty > 0 ? `-${burdenPenalty} from Burden` : '',
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {levelUpTarget.type !== 'attribute' && (
              isMaxed ? (
                <div className="text-xs text-blue-400 font-bold bg-blue-900/30 px-2 py-1 rounded">Maximum Rank Reached</div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs text-blue-400 font-bold bg-blue-900/30 px-2 py-1 rounded">
                    Next Rank Cost: {xpCost} XP
                  </div>
                  {isInspired && (
                    <div className="text-[10px] text-yellow-500 font-bold bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-700/50">
                      Inspiration Discount: -1 XP
                    </div>
                  )}
                </div>
              )
            )}
            
            {levelUpTarget.type === 'attribute' && (
              isMaxed ? (
                <div className="rev-keep-color text-xs text-red-400 font-bold bg-red-900/30 px-2 py-1 rounded">Tier Limit Reached</div>
              ) : isOutOfAttrPts ? (
                <div className="rev-keep-color text-xs text-red-400 font-bold bg-red-900/30 px-2 py-1 rounded">No Attribute Points Available</div>
              ) : (
                <div className="text-xs text-green-400 font-bold bg-green-900/30 px-2 py-1 rounded">
                  {availableAttrPts} Point(s) Available
                </div>
              )
            )}
          </div>

          <div className="flex gap-2 w-full mt-2">
            <button onClick={handleRegress} disabled={isMinned} className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-colors flex items-center justify-center gap-2 ${isMinned ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-red-950/40 text-red-300 border-red-900 hover:bg-red-900/60'}`}><span>←</span> Regress</button>
            <button onClick={handleAdvance} disabled={isAdvanceDisabled} className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-colors flex items-center justify-center gap-2 ${isAdvanceDisabled ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-green-950/40 text-green-300 border-green-900 hover:bg-green-900/60'}`}>Advance <span>→</span></button>
          </div>
          
          <div className="flex justify-between items-center text-sm font-bold text-gray-400 mt-2 bg-black/20 p-2 rounded">
            {levelUpTarget.type === 'attribute' ? (
              <>
                <span>Attribute Points:</span>
                <span className={availableAttrPts < 0 ? "rev-keep-color text-red-400" : availableAttrPts > 0 && !isMaxed ? "text-green-400" : "text-gray-400"}>
                  {availableAttrPts} / {getMaxAttributePoints(char.data.progression.tier)}
                </span>
              </>
            ) : (
              <>
                <span>Spendable XP:</span>
                <span className={availableSpendableXp < 0 ? "rev-keep-color text-red-400" : availableSpendableXp >= xpCost && !isMaxed ? "text-yellow-400" : "text-gray-400"}>
                  {availableSpendableXp}
                </span>
              </>
            )}
          </div>
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
  const [choiceError, setChoiceError] = useState<string | null>(null);
  useBodyScrollLock(Boolean(isOpen));
  
  if (!isOpen) return null;
  const allOrigins = entries.filter(e => e.type === 'origin');
  const PLANES = ['Generic', 'Eterion', 'Agmar', 'Vesperik', 'Duiber', 'Lior'];

  const handleOpen = (originId: string, originName: string) => {
    setExpandedOrigin(expandedOrigin === originId ? null : originId);
    setChoiceError(null);
    if (char.data.identity.origin !== originName) setTempChoices({});
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${MODAL_BG} max-w-2xl max-h-[85vh]`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-bold text-xl text-gray-200">Select Origin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors">×</button>
        </div>
        <div className="p-4 border-b border-gray-700 bg-black/10 shrink-0">
          <div className="flex flex-wrap gap-2">
            {PLANES.map(plane => (
              <button key={plane} onClick={() => { setModalOriginPlane(plane); setExpandedOrigin(null); }} className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors border ${modalOriginPlane === plane ? 'bg-red-900/50 text-red-200 border-red-700' : 'bg-black/30 text-gray-400 border-gray-700 hover:bg-white/5'}`}>{plane}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {allOrigins.filter(o => o.data.plane === modalOriginPlane).map(origin => {
            const isExpanded = expandedOrigin === origin.id;
            const choices = ORIGIN_CHOICES[origin.name];
            return (
              <div key={origin.id} className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                <button onClick={() => handleOpen(origin.id, origin.name)} className="w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center group">
                  <span className="font-bold text-gray-200 group-hover:text-white">{origin.name}</span>
                  <span className="text-[10px] text-gray-400 bg-black/40 px-2 py-0.5 rounded border border-gray-700">{origin.data.plane}</span>
                </button>
                {isExpanded && (
                  <div className="p-4 border-t border-gray-700 bg-black/20 text-sm">
                    {origin.data.lore && (
                      <div className="mb-4 text-sm italic text-gray-200 border-l-2 border-gray-600 pl-3">
                        {splitLines(origin.data.lore).map((line: string, idx: number) => <span key={idx} className="block mb-1 last:mb-0">"{line}"</span>)}
                      </div>
                    )}
                    <div className="grid grid-cols-[100px_1fr] gap-2 mb-4 text-gray-300">
                      <div className="font-bold text-gray-500 text-[10px] tracking-wider text-right mt-0.5">Inspiration</div><div>{origin.data.inspiration || 'None'}</div>
                      <div className="font-bold text-gray-500 text-[10px] tracking-wider text-right mt-0.5">Starting Skills</div><div>{origin.data.starting || 'None'}</div>
                    </div>
                    {choices && (
                      <div className="mb-4 space-y-3 p-3 bg-black/30 rounded border border-gray-700">
                        {choices.map((choice: any) => {
                          const selectedValue = tempChoices[choice.id];
                          const skillDesc = CORE_SKILL_DESCRIPTIONS[selectedValue] || SPECIAL_SKILL_DESCRIPTIONS[selectedValue] || '';
                          return (
                            <div key={choice.id}>
                              <label className="block text-xs font-bold text-red-400 mb-1">{choice.label}</label>
                              <select className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-red-500 shadow-inner" value={selectedValue || ''} onChange={(e) => { setTempChoices({ ...tempChoices, [choice.id]: e.target.value }); setChoiceError(null); }}>
                                <option value="">— Select —</option>
                                {choice.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              {selectedValue && skillDesc && <div className="text-xs text-gray-300 mt-1 italic border-l-2 border-gray-700 pl-2">{skillDesc}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {choiceError && (
                      <div className="rev-keep-color mb-3 bg-red-950/40 border border-red-900 text-red-300 text-xs font-bold px-3 py-2 rounded">
                        {choiceError}
                      </div>
                    )}
                    <button onClick={() => {
                      if (choices) { const missing = choices.find((c: any) => !tempChoices[c.id]); if (missing) { setChoiceError('Please make a selection for all choices.'); return; } }
                      setChoiceError(null);
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
  useBodyScrollLock(Boolean(isOpen));
  if (!isOpen) return null;

  const archetypes = ['Champion', 'Scoundrel', 'Guide', 'Scholar', 'Mystic', 'Aberration'];

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${MODAL_BG} max-w-2xl max-h-[85vh]`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-bold text-xl text-gray-200">Select Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {archetypes.map(archetype => {
            let classes = getClasses().filter((c: any) => c.data.archetype === archetype);
            if (classes.length === 0) return null;

            classes = classes.sort((a: any, b: any) => a.name.localeCompare(b.name));

            return (
              <div key={archetype}>
                <div className="bg-black/20 text-xs font-bold text-red-400 uppercase tracking-widest py-2 border-b border-gray-700 mb-2 px-2 rounded-t">{archetype}</div>
                <div className="space-y-2">
                  {classes.map((c: any) => (
                    <button key={c.id} onClick={() => { patch({ identity: { ...char.data.identity, className: c.name, path: '' } }); onClose(); }} className={`w-full text-left p-3 border rounded-lg transition-colors flex justify-between items-center ${char.data.identity.className === c.name ? 'bg-red-900/30 border-red-700 text-red-100' : 'bg-black/20 border-gray-700 text-gray-200 hover:bg-white/5 hover:border-gray-500'}`}>
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
  useBodyScrollLock(Boolean(isOpen));
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${MODAL_BG} max-w-2xl max-h-[85vh]`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-bold text-xl text-gray-200">Select Special Skill</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {(Object.keys(ATTRIBUTE_NAMES) as Array<keyof typeof ATTRIBUTE_NAMES>).map(attr => {
            const skills = getSpecialSkills().filter((s: any) => s.data.attribute === attr);
            if (skills.length === 0) return null;
            return (
              <div key={attr}>
                <div className={`bg-black/20 text-xs font-bold uppercase tracking-widest py-2 border-b border-gray-700 mb-2 px-2 rounded-t ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color}`}>{ATTRIBUTE_NAMES[attr]}</div>
                <div className="space-y-2">
                  {skills.map((s: any) => {
                    const isExpanded = expandedSpecialSkill === s.id;
                    return (
                      <div key={s.id} className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                        <button onClick={() => setExpandedSpecialSkill(isExpanded ? null : s.id)} className="w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center group">
                          <span className="font-bold text-gray-200 group-hover:text-white">{s.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color} border-current`}>{attr.toUpperCase()}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-4 border-t border-gray-700 bg-black/40">
                            <div className="text-sm italic text-gray-200 mb-4 border-l-2 border-gray-700 pl-2">
                              {splitLines(s.data.description).map((line: string, idx: number) => <span key={idx} className="block mb-1 last:mb-0">{line}</span>)}
                            </div>
                            <button onClick={() => { 
                              if (modalIndex !== null) { 
                                const next = [...char.data.specialSkills]; 
                                if (modalIndex >= next.length) {
                                  next.push({ 
                                    name: s.name, 
                                    rank: 0, 
                                    attribute: s.data.attribute || 'grt' 
                                  });
                                } else {
                                  next[modalIndex] = { 
                                    ...next[modalIndex], 
                                    name: s.name,
                                    rank: next[modalIndex].rank ?? 0,
                                    attribute: s.data.attribute || 'grt'
                                  }; 
                                }
                                patch({ specialSkills: next }); 
                              } 
                              onClose(); 
                              setExpandedSpecialSkill(null); 
                            }} className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors">Confirm Selection</button>
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

export function AbilityModal({
  char,
  isOpen,
  onClose,
  patch,
  modalIndex,
  guidedQueue = [],
  guidedTotal = 0,
  onGuidedSelect,
  onGuidedSkip,
  onGuidedSkipAll,
}: {
  char: any;
  isOpen: boolean;
  onClose: () => void;
  patch: any;
  modalIndex: number | null;
  guidedQueue?: AbilityPickTask[];
  guidedTotal?: number;
  onGuidedSelect?: (abilityName: string) => void;
  onGuidedSkip?: () => void;
  onGuidedSkipAll?: () => void;
}) {
  const { getDisciplines, getAbilities } = useCompendium();
  const [modalDiscipline, setModalDiscipline] = useState<string>('');
  const [expandedModalAbility, setExpandedModalAbility] = useState<string | null>(null);
  
  const classRank = Math.max(0, Math.min(4, char.data.progression.tier - 1));
  const isGuided = guidedQueue.length > 0;
  const activeTask = isGuided ? guidedQueue[0] : null;
  const effectiveOpen = isOpen || isGuided;
  useBodyScrollLock(effectiveOpen);

  if (!effectiveOpen) return null;

  const activeDiscipline = activeTask ? activeTask.discipline : modalDiscipline;
  const ownedAbilityNames = new Set((char.data.abilities || []).map((a: any) => a.name));
  const guidedStepNum = isGuided ? Math.max(1, guidedTotal - guidedQueue.length + 1) : 0;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${MODAL_BG} max-w-2xl max-h-[85vh]`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-bold text-xl text-gray-200 truncate">
              {isGuided ? 'Select Discipline Abilities' : 'Select Ability'}
            </h2>
            {isGuided && guidedTotal > 1 && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-950/60 border border-purple-700/70 text-purple-200 shrink-0">
                {guidedStepNum} / {guidedTotal}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setExpandedModalAbility(null);
              if (isGuided && onGuidedSkipAll) onGuidedSkipAll();
              else onClose();
            }}
            className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors shrink-0"
          >
            ×
          </button>
        </div>

        {isGuided && activeTask ? (
          <div className="p-4 border-b border-gray-700 bg-purple-950/20 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-900/40 text-red-200 border border-red-800/70">
                  {activeTask.discipline}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Rank {activeTask.rank}
                </span>
              </div>
              <p className="text-sm text-gray-200 font-semibold mt-1.5">
                {activeTask.promptDetail}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onGuidedSkip && (
                <button
                  type="button"
                  onClick={() => {
                    setExpandedModalAbility(null);
                    onGuidedSkip();
                  }}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 transition-colors"
                >
                  Skip Pick
                </button>
              )}
              {guidedQueue.length > 1 && onGuidedSkipAll && (
                <button
                  type="button"
                  onClick={() => {
                    setExpandedModalAbility(null);
                    onGuidedSkipAll();
                  }}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-black/40 hover:bg-gray-800 text-gray-400 border border-gray-700 transition-colors"
                >
                  Skip All
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-gray-700 bg-black/10 shrink-0">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Filter by Discipline</label>
            <div className="flex flex-wrap gap-2">
              {getDisciplines().map((disc: any) => (
                <button key={disc.id} onClick={() => { setModalDiscipline(disc.name); setExpandedModalAbility(null); }} className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors border ${modalDiscipline === disc.name ? 'bg-red-900/50 text-red-200 border-red-700' : 'bg-black/30 text-gray-400 border-gray-700 hover:bg-white/5'}`}>{disc.name}</button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!activeDiscipline && <p className="text-center text-gray-500 italic py-8">Select a discipline above to view available abilities.</p>}
          {activeDiscipline && (() => {
            const abilities = getAbilities().filter((a: any) =>
              a.data.source === activeDiscipline &&
              (!activeTask || (a.data.class_rank ?? 0) === activeTask.rank)
            );
            const groupedByRank = abilities.reduce((acc: any, ab: any) => { const rank = ab.data.class_rank ?? 0; if (!acc[rank]) acc[rank] = []; acc[rank].push(ab); return acc; }, {} as Record<number, CompendiumEntry[]>);
            const ranks = Object.keys(groupedByRank).map(Number).sort((a, b) => a - b);
            if (ranks.length === 0) return <p className="text-center text-gray-500 italic">No abilities found for this discipline{activeTask ? ` at Rank ${activeTask.rank}` : ''}.</p>;
            
            return ranks.map(rank => (
              <div key={rank}>
                <div className="bg-black/20 text-xs font-bold text-red-400 uppercase tracking-widest py-2 border-b border-gray-700 mb-2 px-2 rounded-t">Rank {rank}</div>
                <div className="space-y-2">
                  {groupedByRank[rank].map((ab: any) => {
                    const speedData = getSpeedData(ab.data.speed, ab.data.upkeep);
                    const isExpanded = expandedModalAbility === ab.id;
                    const hasDiscipline = Boolean(activeTask) || (ab.data.source ? char.data.disciplines.includes(ab.data.source) : false);
                    const isRankLocked = !activeTask && (ab.data.class_rank || 0) > classRank;
                    const isAlreadyLearned = isGuided && ownedAbilityNames.has(ab.name);
                    
                    const statsToShow = [{ label: 'Strain', value: `${ab.data.sn_cost ?? 0} SN`, color: 'rev-keep-color text-blue-400' }];
                    if (ab.data.type === 'attack') statsToShow.push({ label: 'Accuracy', value: ab.data.acc ?? '+0', color: 'rev-keep-color text-green-400' }, { label: 'Damage', value: ab.data.dmg ?? '+0', color: 'rev-keep-color text-red-400' });
                    if (ab.data.type === 'defensive') statsToShow.push({ label: 'Evasion', value: ab.data.eva ?? '+0', color: 'rev-keep-color text-purple-400' });
                    statsToShow.push({ label: 'Requires', value: ab.data.requirement || 'None', color: 'text-gray-300' });

                    return (
                      <div key={ab.id} className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''} ${isRankLocked || isAlreadyLearned ? 'opacity-50 grayscale' : ''}`}>
                        <button onClick={() => setExpandedModalAbility(isExpanded ? null : ab.id)} className="w-full text-left p-3 hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                          <span className={`font-bold group-hover:text-white ${isRankLocked || isAlreadyLearned ? 'text-gray-400' : 'text-gray-200'}`}>{ab.name}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {isAlreadyLearned && <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-400 border border-gray-600">Learned</span>}
                            {ab.data.type && <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(ab.data.type)}`}>{ab.data.type}</span>}
                            {speedData && <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">{speedData.speedLabel}</span>}
                            {speedData?.upkeepLabel && <span className="rev-keep-color rev-dark-card bg-teal-900/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-700/50">{speedData.upkeepLabel}</span>}
                            {ab.data.range && <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">{ab.data.range}</span>}
                            {ab.data.class_rank !== undefined && (
                              <span className={`bg-black/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-600 ${isRankLocked ? 'rev-keep-color text-red-400' : 'text-gray-300'}`}>
                                {isRankLocked ? `Rank ${ab.data.class_rank} (Locked)` : `Rank ${ab.data.class_rank}`}
                              </span>
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="p-4 border-t border-gray-700 bg-black/40">
                            <div className="flex flex-wrap justify-between gap-2 mb-3 bg-black/20 p-2 rounded border border-gray-800 shadow-inner text-center">
                              {statsToShow.map((stat, idx) => <div key={idx} className={`flex-1 flex flex-col items-center justify-center min-w-[80px] ${idx !== statsToShow.length - 1 ? 'border-r border-gray-700' : ''}`}><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</span><span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span></div>)}
                            </div>
                            <div className="text-sm italic text-gray-200 mb-4 border-l-2 border-gray-700 pl-2">
                              {splitLines(ab.data.description).map((line: string, idx: number) => (
                                <span key={idx} className="block mb-1 last:mb-0">
                                  <KeywordText text={line} mode="effect" />
                                </span>
                              ))}
                            </div>
                            {isAlreadyLearned ? (
                              <button disabled className="w-full py-2 bg-gray-700 text-gray-400 font-bold text-sm rounded cursor-not-allowed">Already Learned</button>
                            ) : hasDiscipline ? (
                              <button onClick={() => {
                                if (isGuided && onGuidedSelect) {
                                  onGuidedSelect(ab.name);
                                  setExpandedModalAbility(null);
                                  return;
                                }
                                if (modalIndex !== null) {
                                  const next = [...char.data.abilities];
                                  if (modalIndex >= next.length) {
                                    next.push({ name: ab.name, equipped: false });
                                  } else {
                                    next[modalIndex] = { ...next[modalIndex], name: ab.name };
                                  }
                                  patch({ abilities: next });
                                }
                                onClose();
                                setExpandedModalAbility(null);
                              }} className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors">Confirm Selection</button>
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

export function PathModal({ char, isOpen, onClose, patch, classData }: any) {
  useBodyScrollLock(Boolean(isOpen && classData));
  if (!isOpen || !classData) return null;

  const currentTier = calculateTierFromLevel(Math.max(0, char.data.progression?.level ?? 0));
  const isPathUnlocked = currentTier >= 3;
  const paths = classData.data.paths || [];

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${MODAL_BG} max-w-3xl`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-bold text-xl text-gray-200">Select Path</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors">×</button>
        </div>
        {!isPathUnlocked ? (
          <div className="p-8 text-center text-sm text-gray-400 italic">
            Class rank 2 required (unlocks at <strong className="text-gray-200 not-italic">Tier 3</strong>).
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/10">
            {paths.map((path: string) => {
              return (
                <div key={path} className="bg-gray-900 border border-gray-700 rounded-lg p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-xl text-red-400 font-bold mb-3">{path}</h3>
                  </div>
                  <button 
                    onClick={() => { patch({ identity: { ...char.data.identity, path } }); onClose(); }} 
                    className="w-full py-2.5 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded shadow-sm transition-colors mt-auto"
                  >
                    Select {path}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function DisciplineModal({ char, isOpen, onClose, patch, modalIndex, onDisciplineSelected }: any) {
  const { getDisciplines } = useCompendium();
  const [expanded, setExpanded] = useState<string | null>(null);
  useBodyScrollLock(Boolean(isOpen));
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${MODAL_BG} max-w-2xl max-h-[85vh]`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-bold text-xl text-gray-200">Select Discipline</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {getDisciplines().map((d: any) => {
            const isExpanded = expanded === d.id;
            return (
              <div key={d.id} className={`bg-black/20 border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                <button onClick={() => setExpanded(isExpanded ? null : d.id)} className="w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center group">
                  <span className="font-bold text-gray-200 group-hover:text-white">{d.name}</span>
                  <span className="text-gray-500 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="p-4 border-t border-gray-700 bg-black/40">
                    <div className="text-sm italic text-gray-200 mb-4 border-l-2 border-gray-700 pl-2">
                      {splitLines(d.data.description).map((line: string, idx: number) => <span key={idx} className="block mb-1 last:mb-0">{line}</span>)}
                    </div>
                    <button onClick={() => {
                      if (modalIndex !== null) {
                        const next = [...char.data.disciplines];
                        const isAlreadyOwned = next.includes(d.name);
                        const isReplacingSame = next[modalIndex] === d.name;
                        if (modalIndex >= next.length) next.push(d.name);
                        else next[modalIndex] = d.name;
                        patch({ disciplines: next });
                        if (!isAlreadyOwned && !isReplacingSame && onDisciplineSelected) {
                          onDisciplineSelected(d.name);
                        }
                      }
                      onClose(); setExpanded(null);
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