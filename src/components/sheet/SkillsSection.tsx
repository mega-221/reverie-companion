import type { Character } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import { 
  ATTRIBUTE_NAMES, ATTRIBUTE_DESCRIPTIONS, SKILL_GROUPS, 
  CORE_SKILL_DESCRIPTIONS, SPECIAL_SKILL_DESCRIPTIONS, SectionHeader, Tooltip, getMinSkillRank, 
  type LevelUpTarget 
} from './utils';

export default function SkillsSection({ 
  char, setLevelUpTarget, setIsSpecialSkillModalOpen, setModalSpecialSkillIndex, 
  setExpandedSpecialSkill, patch 
}: { 
  char: Character, 
  setLevelUpTarget: (t: LevelUpTarget) => void, 
  setIsSpecialSkillModalOpen: (b: boolean) => void, 
  setModalSpecialSkillIndex: (i: number) => void, 
  setExpandedSpecialSkill: (s: string | null) => void, 
  patch: (p: any) => void 
}) {
  const { getEntryByName } = useCompendium();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start">
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Object.keys(SKILL_GROUPS) as Array<keyof typeof SKILL_GROUPS>).map(attr => {
          const group = SKILL_GROUPS[attr];
          const attrVal = char.data.attributes[attr];
          return (
            <div key={attr} className="sheet-panel p-5 flex flex-col min-w-0">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-3">
                <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr]} className="w-fit">
                  <span className={`text-2xl font-cinzel first-letter:font-cinzelDeco uppercase tracking-widest ${group.color}`}>{ATTRIBUTE_NAMES[attr]}</span>
                </Tooltip>
                <button onClick={() => setLevelUpTarget({ type: 'attribute', key: attr })} className={`border-b-2 ${group.color} border-gray-600 p-1 w-12 text-center font-bold text-xl focus:outline-none bg-transparent text-white hover:bg-gray-700 transition-colors rounded`}>
                  {attrVal}
                </button>
              </div>
              <div className="space-y-2 flex-1">
                {group.skills.map(skill => {
                  const originMin = getMinSkillRank(skill, char);
                  const attributeMax = Math.min(8, attrVal * 2);
                  const maxSkill = Math.max(originMin, attributeMax);
                  const currentSkill = char.data.skills[skill] ?? 0;
                  const isInspired = char.data.identity.inspirations?.includes(skill);
                  
                  return (
                    <div key={skill} className="flex justify-between items-center text-sm w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Tooltip text={CORE_SKILL_DESCRIPTIONS[skill]} className="w-fit"><span className="font-medium text-gray-300">{skill}</span></Tooltip>
                        {isInspired && <Tooltip text={`Inspiration: ${char.data.identity.origin}`} noBorder className="w-fit shrink-0"><span className="text-yellow-500 text-xs cursor-help">★</span></Tooltip>}
                        {originMin > 0 && <Tooltip text={`Minimum bound: ${originMin} (from Origin)`} noBorder className="w-fit shrink-0"><span className="text-gray-500 text-[10px] cursor-help">🔒</span></Tooltip>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-gray-500 font-bold text-xs">+</span>
                        <button onClick={() => setLevelUpTarget({ type: 'skill', key: skill })} className="border border-gray-700 bg-black/40 p-1 w-10 text-center rounded shadow-inner focus:outline-none font-bold text-white hover:border-red-500 transition-colors">
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

      <div className="lg:col-span-1 sheet-panel p-5 h-fit">
        <SectionHeader title="Special Skills" />
        <div className="space-y-2">
          {char.data.specialSkills.map((s: any, i: number) => {
            const compendiumEntry = getEntryByName(s.name);
            const attr = compendiumEntry?.data?.attribute || 'grt'; 
            const originMin = getMinSkillRank(s.name, char);
            const attributeMax = Math.min(8, char.data.attributes[attr as keyof typeof char.data.attributes] * 2);
            const maxSkill = Math.max(originMin, attributeMax);
            const isInspired = char.data.identity.inspirations?.includes(s.name);

            return (
              <div key={i} className="flex items-center gap-1 w-full bg-black/20 border border-gray-700 rounded-lg p-1">
                <div className="flex-1 min-w-0 flex items-center pl-1">
                  <div className={`bg-transparent border-none text-sm text-gray-200 flex justify-between items-center flex-1 min-w-0 ${originMin > 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => { if (originMin > 0) return; setModalSpecialSkillIndex(i); setExpandedSpecialSkill(null); setIsSpecialSkillModalOpen(true); }}>
                    <Tooltip text={SPECIAL_SKILL_DESCRIPTIONS[s.name] || ''} className="w-full">
                      <span className="truncate">{s.name || "— Select Skill —"}</span>
                    </Tooltip>
                    {originMin === 0 && <span className="text-gray-500 text-[10px] mr-1 shrink-0">▼</span>}
                  </div>
                  {isInspired && <Tooltip text={`Inspiration: ${char.data.identity.origin}`} noBorder className="w-fit shrink-0 mr-1"><span className="text-yellow-500 text-xs cursor-help">★</span></Tooltip>}
                  {originMin > 0 && <Tooltip text={`Minimum bound: ${originMin} (from Origin)`} noBorder className="w-fit shrink-0 mr-1"><span className="text-gray-500 text-[10px] cursor-help">🔒</span></Tooltip>}
                </div>
                <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr as keyof typeof ATTRIBUTE_DESCRIPTIONS]} className="w-fit shrink-0">
                  <span className={`text-[9px] font-bold uppercase ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color} border border-current px-1 py-0.5 rounded`}>{attr.toUpperCase()}</span>
                </Tooltip>
                <div className="flex items-center shrink-0">
                  {s.name ? (
                    <button onClick={() => setLevelUpTarget({ type: 'specialSkill', index: i })} className="bg-transparent text-right w-8 font-bold text-sm text-white hover:text-red-400 focus:outline-none">
                      {Math.max(originMin, s.rank)}
                    </button>
                  ) : <span className="text-right w-8 font-bold text-sm text-gray-600">0</span>}
                  <span className="text-gray-500 text-xs font-bold mr-1">/ {maxSkill}</span>
                </div>
                {originMin === 0 ? (
                  <button className="text-red-500 hover:text-red-400 font-bold px-1 text-sm shrink-0 border-l border-gray-700 pl-2" onClick={() => patch({ specialSkills: char.data.specialSkills.filter((_: any, j: number) => j !== i) })}>×</button>
                ) : <div className="px-2 shrink-0 border-l border-gray-700 text-gray-500 text-xs flex items-center justify-center" title="Locked by Origin">🔒</div>}
              </div>
            );
          })}
          {char.data.specialSkills.length < 5 && (
            <button className="border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-white/5 w-full text-gray-400 font-medium mt-2 transition-colors" onClick={() => patch({ specialSkills: [...char.data.specialSkills, { name: '', rank: 0, attribute: 'grt' }] })}>+ add special skill</button>
          )}
        </div>
      </div>
    </div>
  );
}