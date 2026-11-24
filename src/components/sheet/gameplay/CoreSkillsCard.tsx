import type { Character } from '../../../types';
import { 
  ATTRIBUTE_NAMES, ATTRIBUTE_DESCRIPTIONS, SKILL_GROUPS, 
  CORE_SKILL_DESCRIPTIONS, Tooltip, getMinSkillRank, 
  type LevelUpTarget 
} from '../utils';
import {
  getAttributeInjuryPenalty,
  getBurdenPenalty,
  isAttributeAffectedByBurden,
  getEquippedArmourInfo,
} from '../../../calc';
import { useCompendium } from '../../../CompendiumContext';
import { AutoAbbreviate } from '../../common/AutoAbbreviate';
import { getSignatureSkills, isSkillInspired, getSkillMaxRank } from '../progression/progressionData';
import type { DragSkillTarget } from '../Header';

export default function CoreSkillsCard({ char, setLevelUpTarget, dragHoverSkill }: { char: Character, setLevelUpTarget: (t: LevelUpTarget) => void, dragHoverSkill?: DragSkillTarget | null }) {
  const { getEntryByName } = useCompendium();
  const hasOrigin = !!char.data.identity.origin;
  const globalBurdenPenalty = getBurdenPenalty(char.data, getEntryByName);
  const armourInfo = getEquippedArmourInfo(char.data, getEntryByName);
  const hasStealthDisadvantage = armourInfo?.stealthDisadvantage ?? false;

  return (
    <div className="relative h-full">
      
      {/* Origin Missing Overlay */}
      {!hasOrigin && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="rev-keep-color bg-red-950/90 border border-red-900 text-red-200 font-bold text-sm px-4 py-2 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
            Select an Origin to unlock skills.
          </div>
        </div>
      )}

      {/* Changed grid-cols-2 to grid-cols-1 sm:grid-cols-2 for mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
        {(Object.keys(SKILL_GROUPS) as Array<keyof typeof SKILL_GROUPS>).map(attr => {
          const group = SKILL_GROUPS[attr];
          const baseAttrVal = char.data.attributes[attr];
          const injuryPenalty = getAttributeInjuryPenalty(char.data.trackers.injuries, attr.toUpperCase());
          const burdenPenalty = isAttributeAffectedByBurden(attr) ? globalBurdenPenalty : 0;
          const totalPenalty = injuryPenalty + burdenPenalty;
          const attrVal = baseAttrVal;

          const affectingInjuries = char.data.trackers.injuries.filter(inj => 
            inj.affectedAttributes.includes(attr.toUpperCase())
          );
          const penaltySources: string[] = [];
          if (injuryPenalty > 0) {
            penaltySources.push(`Injuries (-${injuryPenalty}): ${affectingInjuries.map(inj => `${inj.name} (-${inj.severity})`).join(', ')}`);
          }
          if (burdenPenalty > 0) {
            penaltySources.push(`Overburdened (-${burdenPenalty})`);
          }

          return (
            <div key={attr} className={`sheet-panel p-3 sm:p-3.5 flex flex-col h-full min-w-0 transition-all duration-200 ${!hasOrigin ? 'opacity-50 grayscale' : ''}`}>
              
              <div className="flex justify-between items-center gap-1 border-b border-gray-700 pb-2.5 mb-3 shrink-0 min-w-0">
                <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr]} className="min-w-0 flex-1" noBorder noTruncate disabled={!hasOrigin}>
                  <AutoAbbreviate
                    full={ATTRIBUTE_NAMES[attr]}
                    short={attr.toUpperCase()}
                    group="sheet-attributes"
                    className={`text-lg sm:text-2xl lg:text-2xl xl:text-[26px] 2xl:text-[30px] font-cinzel uppercase tracking-normal leading-tight ${group.color}`}
                  />
                </Tooltip>
                
                <button 
                  onClick={() => setLevelUpTarget({ type: 'attribute', key: attr })} 
                  disabled={!hasOrigin}
                  className={`border-b-2 ${group.color} border-gray-600 p-0.5 w-8 sm:w-9 text-center font-bold text-lg sm:text-xl 2xl:text-[22px] shrink-0 focus:outline-none bg-transparent text-white rounded transition-colors ${hasOrigin ? 'hover:bg-gray-700' : 'cursor-not-allowed'}`}
                >
                  {attrVal}
                </button>
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-1 gap-2 sm:gap-0">
                {group.skills.map(skill => {
                  const originMin = getMinSkillRank(skill, char);
                  const maxSkill = getSkillMaxRank(skill, baseAttrVal, originMin, char.data);
                  const currentSkill = char.data.skills[skill] ?? 0;
                  const isSignature = getSignatureSkills(char.data).has(skill);
                  const isFromOrigin = char.data.identity.inspirations?.includes(skill);
                  const isInspired = isSkillInspired(skill, char.data);
                  
                  const baseRank = Math.max(originMin, currentSkill);
                  const isPenalizedOrNegative = totalPenalty > 0 || baseRank < 0;
                  
                  const isDragHover =
                    dragHoverSkill?.kind === 'core' && dragHoverSkill?.name === skill;

                  return (
                    <div
                      key={skill}
                      data-roll-skill="true"
                      data-roll-skill-kind="core"
                      data-roll-skill-name={skill}
                      className={`flex justify-between items-center text-base w-full rounded px-1.5 -mx-1.5 py-0.5 transition-all ${
                        isDragHover
                          ? 'ring-2 ring-emerald-400 bg-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Tooltip text={CORE_SKILL_DESCRIPTIONS[skill]} className="w-fit" noBorder disabled={!hasOrigin}>
                          <span className="font-medium text-gray-200 truncate">{skill}</span>
                        </Tooltip>
                        
                        {isInspired && (
                          <Tooltip
                            text={
                              isSignature && isFromOrigin
                                ? `Signature Skill & Inspiration (${char.data.identity.origin})`
                                : isSignature
                                ? 'Signature Skill: Inspired (-1 XP cost) & Max Rank 8 regardless of attribute'
                                : `Inspiration: ${char.data.identity.origin}`
                            }
                            noBorder
                            className="w-fit shrink-0"
                            disabled={!hasOrigin}
                          >
                            <span className={`rev-keep-color rev-skill-star ${isSignature ? 'text-cyan-400' : 'text-yellow-500'} text-sm cursor-help`}>★</span>
                          </Tooltip>
                        )}
                        {originMin > 0 && <Tooltip text={`Minimum bound: ${originMin} (from Origin)`} noBorder className="w-fit shrink-0" disabled={!hasOrigin}><span className="text-gray-500 text-xs cursor-help">🔒</span></Tooltip>}
                        {skill === 'Stealth' && hasStealthDisadvantage && (
                          <Tooltip
                            text={`Disadvantage on Stealth checks while wearing ${armourInfo?.category} Armour (${armourInfo?.name}).`}
                            noBorder
                            className="w-fit shrink-0"
                            disabled={!hasOrigin}
                          >
                            <span className="rev-keep-color rev-dark-card text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-700/80 text-amber-300 cursor-help">
                              DIS
                            </span>
                          </Tooltip>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-gray-500 font-bold text-sm">+</span>
                        
                        {totalPenalty > 0 ? (
                          <Tooltip 
                            text={`Rank: ${baseRank} • Roll penalty: -${totalPenalty}\n${penaltySources.join('\n')}`} 
                            noBorder 
                            className="w-fit"
                            disabled={!hasOrigin}
                          >
                            <button 
                              onClick={() => setLevelUpTarget({ type: 'skill', key: skill })} 
                              disabled={!hasOrigin}
                              className={`rev-keep-color border bg-black/40 p-1 w-10 h-8 flex items-center justify-center rounded shadow-inner focus:outline-none font-bold text-base text-red-500 border-red-900 transition-colors ${hasOrigin ? 'hover:border-red-500' : 'cursor-not-allowed'}`}
                            >
                              {baseRank}
                            </button>
                          </Tooltip>
                        ) : (
                          <button 
                            onClick={() => setLevelUpTarget({ type: 'skill', key: skill })} 
                            disabled={!hasOrigin}
                            className={`border bg-black/40 p-1 w-10 h-8 flex items-center justify-center rounded shadow-inner focus:outline-none font-bold text-base transition-colors ${
                              isPenalizedOrNegative
                                ? 'rev-keep-color text-red-500 border-red-900'
                                : 'text-white border-gray-700'
                            } ${hasOrigin ? 'hover:border-red-500' : 'cursor-not-allowed'}`}
                          >
                            {baseRank}
                          </button>
                        )}
                        
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
    </div>
  );
}