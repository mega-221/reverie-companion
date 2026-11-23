import type { Character } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { SectionHeader, ORIGIN_EFFECTS, ORIGIN_CHOICES } from '../utils';
import { useConfirm } from '../ConfirmDialog';

export default function OriginCard({ 
  char, openOriginModal, onRemoveOrigin 
}: { 
  char: Character, 
  openOriginModal: () => void, 
  onRemoveOrigin: () => void 
}) {
  const { getEntryByName } = useCompendium();
  const { askConfirm, confirmDialog } = useConfirm();
  
  const originName = char.data.identity.origin;
  const effects = ORIGIN_EFFECTS[originName] || {};
  const choices = char.data.identity.originChoices || {};
  
  const startingSkills: string[] = [];
  
  if (effects.starting) {
    Object.entries(effects.starting).forEach(([skill, rank]) => {
      startingSkills.push(`${skill} ${rank}`);
    });
  }
  
  Object.entries(choices).forEach(([choiceId, skillName]) => {
    const choice = ORIGIN_CHOICES[originName]?.find(c => c.id === choiceId);
    if (choice?.type === 'starting' && choice.rank) {
      startingSkills.push(`${skillName} ${choice.rank}`);
    }
  });

  return (
    <section className="sheet-panel rev-nar-card p-3.5 sm:p-5 w-full min-h-[220px] lg:h-[420px] flex flex-col">
      {confirmDialog}
      <SectionHeader title="Origin" />
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        
        {/* Locked selection display with edit/remove actions */}
        <div className="flex items-center justify-between w-full bg-black/20 border border-gray-700 rounded-lg px-4 py-3 shrink-0">
          <div className="flex items-center min-w-0 flex-1">
            <span className={`truncate ${originName ? 'text-lg text-gray-200 font-bold' : 'text-sm text-gray-500 italic'}`}>
              {originName || 'No origin selected'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-gray-700 pl-2.5 ml-3 shrink-0">
            <button 
              onClick={openOriginModal} 
              className="text-gray-400 text-sm p-1 rounded hover:text-white hover:bg-white/10 transition-colors" 
              title="Select/Change Origin"
            >
              ✎
            </button>
            {originName && (
              <button 
                onClick={async () => {
                  const ok = await askConfirm({
                    title: 'Remove Origin',
                    message: 'Are you sure you want to remove your Origin? Any starting skills, inspirations, and abilities from this origin will be removed.',
                    confirmLabel: 'Remove',
                    tone: 'danger',
                  });
                  if (ok) {
                    onRemoveOrigin();
                  }
                }} 
                className="text-red-500 font-bold p-1 rounded text-lg leading-none hover:text-red-400 hover:bg-red-500/15 transition-colors" 
                title="Remove Origin"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* Lore - scroll removed, centered vertically */}
        {originName ? (
          <div className="flex-1 flex items-center text-sm font-normal text-gray-300 italic border-l-2 border-gray-600 pl-3 py-1 leading-relaxed overflow-hidden">
            <p className="w-full">
              {getEntryByName(originName)?.data?.lore || 'No origin lore recorded.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 text-center">
            <p className="text-gray-500 italic text-sm">No origin selected yet.</p>
          </div>
        )}
        
        {originName && (
            <div className="mt-auto bg-black/20 rounded border border-gray-700/50 p-3 text-sm flex flex-col gap-2 shrink-0">
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