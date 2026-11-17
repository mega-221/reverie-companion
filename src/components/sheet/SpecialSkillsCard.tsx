import type { Character } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import { 
  ATTRIBUTE_DESCRIPTIONS, SKILL_GROUPS, 
  SPECIAL_SKILL_DESCRIPTIONS, Tooltip, getMinSkillRank, SKILL_XP_COSTS,
  type LevelUpTarget 
} from './utils';
import { getAttributeInjuryPenalty } from '../../calc';
import { useConfirm } from './ConfirmDialog';

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
  const { askConfirm, confirmDialog } = useConfirm();
  const hasOrigin = !!char.data.identity.origin;

  const handleDelete = async (index: number, skillName: string, rank: number) => {
    const ok = await askConfirm({
      title: 'Remove Special Skill',
      message: `Are you sure you want to delete ${skillName || 'this special skill'}? Any invested XP will be refunded.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;

    let refund = 0;
    const isInsp = char.data.identity.inspirations?.includes(skillName);
    for (let r = 0; r < rank; r++) {
        let cost = SKILL_XP_COSTS[r];
        if (isInsp) cost = Math.max(0, cost - 1);
        refund += cost;
    }

    patch({
        specialSkills: char.data.specialSkills.filter((_, j) => j !== index),
        progression: { ...char.data.progression, xp: char.data.progression.xp + refund }
    });
  };

  return (
    <div className="relative h-full">
      {confirmDialog}
      
      {/* Origin Missing Overlay */}
      {!hasOrigin && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-red-950/90 border border-red-900 text-red-200 font-bold text-sm px-4 py-2 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
            Select an Origin to unlock skills.
          </div>
        </div>
      )}

      <div className={`sheet-panel p-4 h-full flex flex-col transition-all duration-200 ${!hasOrigin ? 'opacity-50 grayscale' : ''}`}>
        
        <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-3 shrink-0">
          <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Special Skills</h2>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const s = char.data.specialSkills[i];
            
            if (!s) {
              return (
                <button 
                  key={i} 
                  onClick={() => {
                    setModalSpecialSkillIndex(char.data.specialSkills.length);
                    setExpandedSpecialSkill(null);
                    setIsSpecialSkillModalOpen(true);
                  }} 
                  disabled={!hasOrigin}
                  className={`flex-1 w-full min-h-[38px] border border-dashed border-gray-600 rounded-lg text-gray-500 font-medium text-sm flex items-center justify-center transition-colors ${hasOrigin ? 'hover:bg-white/5' : 'cursor-not-allowed'}`}
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

            const currentRank = s.rank ?? 0;
            const injuryPenalty = getAttributeInjuryPenalty(char.data.trackers.injuries, attr.toUpperCase());
            const baseRank = Math.max(originMin, currentRank);
            const effectiveRank = baseRank - injuryPenalty;
            const affectingInjuries = char.data.trackers.injuries.filter(inj => inj.affectedAttributes.includes(attr.toUpperCase()));
            const penaltyTooltip = affectingInjuries.map(inj => `${inj.name} (-${inj.severity})`).join(' • ');

            return (
              <div key={i} className="flex-1 flex items-center w-full bg-black/20 border border-gray-700 rounded-lg px-2 min-h-[38px]">
                
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <Tooltip text={SPECIAL_SKILL_DESCRIPTIONS[s.name] || ''} className="w-full" noBorder disabled={!hasOrigin}>
                    <span className="truncate">{s.name || "— Select Skill —"}</span>
                  </Tooltip>
                  {isInspired && <Tooltip text={`Inspiration: ${char.data.identity.origin}`} noBorder className="w-fit shrink-0" disabled={!hasOrigin}><span className="text-yellow-500 text-xs cursor-help">★</span></Tooltip>}
                  {originMin > 0 && <Tooltip text={`Minimum bound: ${originMin} (from Origin)`} noBorder className="w-fit shrink-0" disabled={!hasOrigin}><span className="text-gray-500 text-[10px] cursor-help">🔒</span></Tooltip>}
                </div>

                <div className="flex items-center shrink-0 ml-2 gap-2">
                  <Tooltip text={ATTRIBUTE_DESCRIPTIONS[attr as keyof typeof ATTRIBUTE_DESCRIPTIONS]} noBorder className="w-fit shrink-0" disabled={!hasOrigin}>
                    <span className={`text-[9px] font-bold uppercase ${SKILL_GROUPS[attr as keyof typeof SKILL_GROUPS].color} border border-current px-1 py-0.5 rounded`}>{attr.toUpperCase()}</span>
                  </Tooltip>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold text-sm">+</span>
                    {injuryPenalty > 0 ? (
                      <Tooltip text={`Base: ${baseRank} • Penalty: -${injuryPenalty}\nFrom: ${penaltyTooltip}`} noBorder className="w-fit" disabled={!hasOrigin}>
                        <button 
                          onClick={() => setLevelUpTarget({ type: 'specialSkill', index: i })} 
                          disabled={!hasOrigin}
                          className={`border bg-black/40 p-1 w-10 h-8 flex items-center justify-center rounded shadow-inner focus:outline-none font-bold text-base text-red-500 border-red-900 transition-colors ${hasOrigin ? 'hover:border-red-500' : 'cursor-not-allowed'}`}
                        >
                          {effectiveRank}
                        </button>
                      </Tooltip>
                    ) : (
                      <button 
                        onClick={() => setLevelUpTarget({ type: 'specialSkill', index: i })} 
                        disabled={!hasOrigin}
                        className={`border bg-black/40 p-1 w-10 h-8 flex items-center justify-center rounded shadow-inner focus:outline-none font-bold text-base text-white border-gray-700 transition-colors ${hasOrigin ? 'hover:border-red-500' : 'cursor-not-allowed'}`}
                      >
                        {effectiveRank}
                      </button>
                    )}
                    <span className="text-gray-500 text-xs font-bold w-5 text-right">/ {maxSkill}</span>
                  </div>

                  <div className="flex items-center gap-1 border-l border-gray-700 pl-2 ml-1">
                    <button
                      onClick={() => {
                        if (originMin > 0 || !hasOrigin) return;
                        setModalSpecialSkillIndex(i);
                        setExpandedSpecialSkill(null);
                        setIsSpecialSkillModalOpen(true);
                      }}
                      disabled={originMin > 0 || !hasOrigin}
                      className={`text-gray-400 text-xs px-1 transition-colors ${originMin === 0 && hasOrigin ? 'hover:text-white' : 'cursor-not-allowed opacity-50'}`}
                      title="Replace Skill"
                    >
                      ✎
                    </button>
                    <button
                      className={`text-red-500 font-bold px-1 text-sm shrink-0 ${originMin === 0 && hasOrigin ? 'hover:text-red-400' : 'cursor-not-allowed opacity-50'}`}
                      disabled={originMin > 0 || !hasOrigin}
                      onClick={() => handleDelete(i, s.name, currentRank)}
                      title="Remove Skill"
                    >
                      ×
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}