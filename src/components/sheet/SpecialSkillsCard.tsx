import type { Character } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import { 
  ATTRIBUTE_DESCRIPTIONS, SKILL_GROUPS, 
  SPECIAL_SKILL_DESCRIPTIONS, SectionHeader, Tooltip, getMinSkillRank, 
  type LevelUpTarget 
} from './utils';

export default function SpecialSkillsCard({ 
  char, setLevelUpTarget, setIsSpecialSkillModalOpen, setModalSpecialSkillIndex, setExpandedSpecialSkill, patch 
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
    <div className="sheet-panel p-4 h-full flex flex-col">
      <SectionHeader title="Special Skills" />
      <div className="flex flex-col gap-2 flex-1">
        {/* Force exactly 5 slots to render */}
        {Array.from({ length: 5 }).map((_, i) => {
          const s = char.data.specialSkills[i];
          
          if (!s) {
            return (
              <button 
                key={i} 
                onClick={() => patch({ specialSkills: [...char.data.specialSkills, { name: '', rank: 0, attribute: 'grt' }] })} 
                className="flex-1 w-full border border-dashed border-gray-600 rounded-lg hover:bg-white/5 text-gray-500 font-medium text-sm flex items-center justify-center transition-colors"
              >
                + add special skill
              </button>
            );
          }

          const compendiumEntry = getEntryByName(s.name);
          const attr = compendiumEntry?.data?.attribute || 'grt'; 
          const originMin = getMinSkillRank(s.name, char);
          const attributeMax = Math.min(8, char.data.attributes[attr as keyof typeof char.data.attributes] * 2);
          const maxSkill = Math.max(originMin, attributeMax);
          const isInspired = char.data.identity.inspirations?.includes(s.name);

          return (
            <div key={i} className="flex-1 flex items-center gap-1 w-full bg-black/20 border border-gray-700 rounded-lg px-2 min-h-[38px]">
              <div className="flex-1 min-w-0 flex items-center">
                <div className={`bg-transparent border-none text-sm text-gray-200 flex justify-between items-center flex-1 min-w-0 ${originMin > 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => { if (originMin > 0) return; setModalSpecialSkillIndex(i); setExpandedSpecialSkill(null); setIsSpecialSkillModalOpen(true); }}>
                  <Tooltip text={SPECIAL_SKILL_DESCRIPTIONS[s.name] || ''} className="w-full" noBorder>
                    <span className="truncate">{s.name || "— Select Skill —"}</span>
                  </Tooltip>
                  {originMin === 0 && <span className="text-gray-500 text-[10px] mr-1 shrink-0">▼</span>}
                </div>
                {isInspired && <Tooltip text={`Inspiration: ${char.data.identity.origin}`} noBorder className="w-fit shrink-0 mr-1"><span className="text-yellow-500 text-xs cursor-help">★</span></Tooltip>}
                {originMin > 0 && <Tooltip text={`Minimum bound: ${originMin} (from Origin)`} noBorder className="w-fit shrink-0 mr-1"><span className="text-gray-500 text-[10px] cursor-help">🔒</span></Tooltip>}
              </div>
              
              <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr as keyof typeof ATTRIBUTE_DESCRIPTIONS]} noBorder className="w-fit shrink-0">
                <span className={`text-[9px] font-bold uppercase ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color} border border-current px-1 py-0.5 rounded`}>{attr.toUpperCase()}</span>
              </Tooltip>
              
              <div className="flex items-center shrink-0">
                {s.name ? (
                  <button onClick={() => setLevelUpTarget({ type: 'specialSkill', index: i })} className="bg-transparent text-right w-7 font-bold text-sm text-white hover:text-red-400 focus:outline-none">
                    {Math.max(originMin, s.rank)}
                  </button>
                ) : <span className="text-right w-7 font-bold text-sm text-gray-600">0</span>}
                <span className="text-gray-500 text-[10px] font-bold mr-1">/ {maxSkill}</span>
              </div>
              
              {originMin === 0 ? (
                <button className="text-red-500 hover:text-red-400 font-bold px-1 text-sm shrink-0 border-l border-gray-700 pl-2" onClick={() => patch({ specialSkills: char.data.specialSkills.filter((_: any, j: number) => j !== i) })}>×</button>
              ) : <div className="px-2 shrink-0 border-l border-gray-700 text-gray-500 text-xs flex items-center justify-center" title="Locked by Origin">🔒</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}