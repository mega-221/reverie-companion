import type { Character } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { SectionHeader, ORIGIN_EFFECTS, ORIGIN_CHOICES } from '../utils';

export default function OriginCard({ char, openOriginModal }: { char: Character, openOriginModal: () => void }) {
  const { getEntryByName } = useCompendium();
  
  const originName = char.data.identity.origin;
  const effects = ORIGIN_EFFECTS[originName] || {};
  const choices = char.data.identity.originChoices || {};
  
  const startingSkills: string[] = [];
  
  // 1. Pull hardcoded starting skills from ORIGIN_EFFECTS
  if (effects.starting) {
    Object.entries(effects.starting).forEach(([skill, rank]) => {
      startingSkills.push(`${skill} ${rank}`);
    });
  }
  
  // 2. Pull starting skills from player choices
  Object.entries(choices).forEach(([choiceId, skillName]) => {
    const choice = ORIGIN_CHOICES[originName]?.find(c => c.id === choiceId);
    if (choice?.type === 'starting' && choice.rank) {
      startingSkills.push(`${skillName} ${choice.rank}`);
    }
  });

  return (
    <section className="sheet-panel p-5 w-full h-full flex flex-col">
      <SectionHeader title="Origin" />
      <div className="flex flex-col gap-4 flex-1">
        <div 
          className="border border-gray-700 bg-black/40 p-2.5 rounded-lg shadow-inner font-normal text-lg w-full text-gray-200 cursor-pointer flex justify-between items-center hover:border-gray-500 transition-colors"
          onClick={openOriginModal}
        >
          <span className="truncate">{originName || "— Select Origin —"}</span>
          <span className="text-gray-500 text-sm">▼</span>
        </div>
        
        <div className="flex-1 text-sm font-normal text-gray-300 italic border-l-2 border-gray-600 pl-3 py-1 leading-relaxed">
          {getEntryByName(originName)?.data?.lore || 'Select an origin to view its lore. Your Origin dictates your starting skills, inspirations, and minimum skill caps.'}
        </div>
        
        {originName && (
            <div className="mt-2 bg-black/20 rounded border border-gray-700/50 p-3 text-sm flex flex-col gap-2">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Mechanical Benefits</div>
              <div className="text-gray-300">
                <strong className="text-gray-400">Inspiration:</strong> {char.data.identity.inspirations?.join(', ') || 'None'}
              </div>
              <div className="text-gray-300">
                <strong className="text-gray-400">Starting Skills:</strong> {startingSkills.length > 0 ? startingSkills.join(', ') : 'None'}
              </div>
            </div>
        )}
      </div>
    </section>
  );
}