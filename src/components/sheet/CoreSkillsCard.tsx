import type { Character } from '../../types';
import { 
  ATTRIBUTE_NAMES, ATTRIBUTE_DESCRIPTIONS, SKILL_GROUPS, 
  CORE_SKILL_DESCRIPTIONS, Tooltip, getMinSkillRank, 
  type LevelUpTarget 
} from './utils';
import { getAttributeInjuryPenalty } from '../../calc';

export default function CoreSkillsCard({ char, setLevelUpTarget }: { char: Character, setLevelUpTarget: (t: LevelUpTarget) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {(Object.keys(SKILL_GROUPS) as Array<keyof typeof SKILL_GROUPS>).map(attr => {
        const group = SKILL_GROUPS[attr];
        const attrVal = char.data.attributes[attr];
        const injuryPenalty = getAttributeInjuryPenalty(char.data.trackers.injuries, attr.toUpperCase());

        // Gather injuries affecting this attribute for the tooltip
        const affectingInjuries = char.data.trackers.injuries.filter(inj => 
          inj.affectedAttributes.includes(attr.toUpperCase())
        );
        const penaltyTooltip = affectingInjuries
          .map(inj => `${inj.name} (-${inj.severity})`)
          .join(' • ');

        return (
          <div key={attr} className="sheet-panel p-4 flex flex-col h-full min-w-0">
            
            <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-3 shrink-0">
              <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr]} className="w-fit" noBorder>
                <span className={`text-3xl font-cinzel first-letter:font-cinzelDeco uppercase tracking-widest ${group.color}`}>
                  {ATTRIBUTE_NAMES[attr]}
                </span>
              </Tooltip>
              
              <button onClick={() => setLevelUpTarget({ type: 'attribute', key: attr })} className={`border-b-2 ${group.color} border-gray-600 p-1 w-12 text-center font-bold text-3xl focus:outline-none bg-transparent text-white hover:bg-gray-700 transition-colors rounded`}>
                {attrVal}
              </button>
            </div>
            
            <div className="flex-1 flex flex-col justify-between py-1">
              {group.skills.map(skill => {
                const originMin = getMinSkillRank(skill, char);
                const attributeMax = Math.min(8, attrVal * 2);
                const maxSkill = Math.max(originMin, attributeMax);
                const currentSkill = char.data.skills[skill] ?? 0;
                const isInspired = char.data.identity.inspirations?.includes(skill);
                
                // Apply penalty to the displayed rank
                const baseRank = Math.max(originMin, currentSkill);
                // Remove the Math.max(0, ...) so it can go negative
                const effectiveRank = baseRank - injuryPenalty; 
                
                return (
                  <div key={skill} className="flex justify-between items-center text-base w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tooltip text={CORE_SKILL_DESCRIPTIONS[skill]} className="w-fit" noBorder>
                        <span className="font-medium text-gray-200 truncate">{skill}</span>
                      </Tooltip>
                      
                      {isInspired && <Tooltip text={`Inspiration: ${char.data.identity.origin}`} noBorder className="w-fit shrink-0"><span className="text-yellow-500 text-sm cursor-help">★</span></Tooltip>}
                      {originMin > 0 && <Tooltip text={`Minimum bound: ${originMin} (from Origin)`} noBorder className="w-fit shrink-0"><span className="text-gray-500 text-xs cursor-help">🔒</span></Tooltip>}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-gray-500 font-bold text-sm">+</span>
                      
                      {/* Wrap the button in a tooltip if there's a penalty */}
                      {injuryPenalty > 0 ? (
                        <Tooltip 
                          text={`Base: ${baseRank} • Penalty: -${injuryPenalty}\nFrom: ${penaltyTooltip}`} 
                          noBorder 
                          className="w-fit"
                        >
                          <button 
                            onClick={() => setLevelUpTarget({ type: 'skill', key: skill })} 
                            className="border bg-black/40 p-1 w-10 h-8 flex items-center justify-center rounded shadow-inner focus:outline-none font-bold text-base hover:border-red-500 transition-colors text-red-500 border-red-900"
                          >
                            {effectiveRank}
                          </button>
                        </Tooltip>
                      ) : (
                        <button 
                          onClick={() => setLevelUpTarget({ type: 'skill', key: skill })} 
                          className="border bg-black/40 p-1 w-10 h-8 flex items-center justify-center rounded shadow-inner focus:outline-none font-bold text-base hover:border-red-500 transition-colors text-white border-gray-700"
                        >
                          {effectiveRank}
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
  );
}