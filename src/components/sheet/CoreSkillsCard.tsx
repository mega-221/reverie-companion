import type { Character } from '../../types';
import { 
  ATTRIBUTE_NAMES, ATTRIBUTE_DESCRIPTIONS, SKILL_GROUPS, 
  CORE_SKILL_DESCRIPTIONS, Tooltip, getMinSkillRank, 
  type LevelUpTarget 
} from './utils';

export default function CoreSkillsCard({ char, setLevelUpTarget }: { char: Character, setLevelUpTarget: (t: LevelUpTarget) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {(Object.keys(SKILL_GROUPS) as Array<keyof typeof SKILL_GROUPS>).map(attr => {
        const group = SKILL_GROUPS[attr];
        const attrVal = char.data.attributes[attr];
        return (
          <div key={attr} className="sheet-panel p-5 flex flex-col h-full min-w-0">
            
            <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4 shrink-0">
              {/* Removed underline from Attribute Title via noBorder */}
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
                
                return (
                  <div key={skill} className="flex justify-between items-center text-base w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Removed underline from Skill Name via noBorder */}
                      <Tooltip text={CORE_SKILL_DESCRIPTIONS[skill]} className="w-fit" noBorder>
                        <span className="font-medium text-gray-200 truncate">{skill}</span>
                      </Tooltip>
                      
                      {isInspired && <Tooltip text={`Inspiration: ${char.data.identity.origin}`} noBorder className="w-fit shrink-0"><span className="text-yellow-500 text-sm cursor-help">★</span></Tooltip>}
                      {originMin > 0 && <Tooltip text={`Minimum bound: ${originMin} (from Origin)`} noBorder className="w-fit shrink-0"><span className="text-gray-500 text-xs cursor-help">🔒</span></Tooltip>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-gray-500 font-bold text-sm">+</span>
                      <button onClick={() => setLevelUpTarget({ type: 'skill', key: skill })} className="border border-gray-700 bg-black/40 p-1 w-10 h-8 flex items-center justify-center rounded shadow-inner focus:outline-none font-bold text-base text-white hover:border-red-500 transition-colors">
                        {Math.max(originMin, currentSkill)}
                      </button>
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