import type { Character } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { useConfirm } from '../ConfirmDialog';
import { disciplineSlotMax } from '../../../calc';
import { Tooltip } from '../utils';
import { calculateTierFromLevel } from '../progression/progressionData';

export default function ClassCard({ 
  char, patch, setIsClassModalOpen, setIsPathModalOpen, setIsDisciplineModalOpen, setModalDisciplineIndex 
}: { 
  char: Character, 
  patch: any, 
  setIsClassModalOpen: (b: boolean) => void, 
  setIsPathModalOpen: (b: boolean) => void, 
  setIsDisciplineModalOpen: (b: boolean) => void, 
  setModalDisciplineIndex: (i: number) => void 
}) {
  const { getAbilities } = useCompendium();
  const { askConfirm, confirmDialog } = useConfirm();
  const charDisciplines = char.data.disciplines || [];
  const maxDisciplineSlots = disciplineSlotMax(char.data);
  const canAddDiscipline = charDisciplines.length < maxDisciplineSlots;
  
  const currentTier = calculateTierFromLevel(Math.max(0, char.data.progression?.level ?? 0));
  const hasClass = Boolean(char.data.identity.className);
  const isPathUnlocked = currentTier >= 3;
  const canEditPath = hasClass && isPathUnlocked;
  const classRank = Math.max(0, Math.min(4, currentTier - 1));
  const allClassFeatures = getAbilities().filter(a => a.data.source === char.data.identity.className || a.data.source === char.data.identity.path);
  const classPassives = allClassFeatures.filter(a => a.data.feature_type === 'passive').sort((a,b) => (a.data.class_rank || 0) - (b.data.class_rank || 0));

  return (
    <section className="sheet-panel p-4 w-full flex flex-col h-full gap-4">
      {confirmDialog}
      <div className="flex justify-between items-center border-b border-gray-700 pb-3 shrink-0 gap-2">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Class & Path</h2>
        <Tooltip
          text="Class Rank equals Tier - 1 (0 to 4). Unlocks Class Passives, Class Abilities, and Path (Rank 2)."
          className="w-fit shrink-0"
          noBorder
          noTruncate
        >
          <span className="inline-flex items-center text-[10px] leading-tight uppercase tracking-wider text-gray-300 font-bold bg-gray-900 px-2 py-0.5 rounded border border-gray-700 whitespace-nowrap">
            Class Rank: {classRank}
          </span>
        </Tooltip>
      </div>

      <div className="space-y-2 mb-2">
        {/* CLASS ROW */}
        <div className="flex items-center justify-between w-full bg-black/20 border border-gray-700 rounded-lg px-2 py-1.5 min-h-[46px]">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Class</span>
            <span className={`text-sm truncate ${char.data.identity.className ? 'text-gray-200 font-bold' : 'text-gray-500 italic'}`}>
              {char.data.identity.className || '— No Class —'}
            </span>
          </div>
          <div className="flex items-center gap-1 border-l border-gray-700 pl-2 ml-2 shrink-0">
            <button 
              onClick={() => setIsClassModalOpen(true)} 
              className="text-gray-400 text-xs px-1 hover:text-white transition-colors" 
              title="Select/Change Class"
            >
              ✎
            </button>
            {char.data.identity.className && (
              <button 
                onClick={async () => {
                  const ok = await askConfirm({
                    title: 'Remove Class',
                    message: 'Are you sure you want to remove your Class? This will also remove your Path.',
                    confirmLabel: 'Remove',
                    tone: 'danger',
                  });
                  if (ok) {
                    patch({ identity: { ...char.data.identity, className: '', path: '' } });
                  }
                }} 
                className="text-red-500 font-bold px-1 text-sm hover:text-red-400 transition-colors" 
                title="Remove Class"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* PATH ROW */}
        <div
          className={`flex items-center justify-between w-full border border-gray-700 rounded-lg px-2 py-1.5 min-h-[46px] transition-all duration-200 ${
            !isPathUnlocked || !hasClass
              ? 'bg-gray-900 opacity-50 grayscale'
              : 'bg-black/20'
          }`}
        >
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Path</span>
            <span
              className={`text-sm truncate ${
                char.data.identity.path || !isPathUnlocked
                  ? 'text-gray-200 font-bold'
                  : 'text-gray-500 italic'
              }`}
            >
              {char.data.identity.path || (!isPathUnlocked ? 'Class rank 2 required' : '— No Path —')}
            </span>
          </div>
          <div className="flex items-center gap-1 border-l border-gray-700 pl-2 ml-2 shrink-0">
            <button 
              onClick={() => canEditPath && setIsPathModalOpen(true)} 
              disabled={!canEditPath}
              className={`text-gray-400 text-xs px-1 transition-colors ${canEditPath ? 'hover:text-white' : 'cursor-not-allowed'}`} 
              title={!isPathUnlocked ? 'Class rank 2 required' : !hasClass ? 'Select a Class first' : 'Select/Change Path'}
            >
              ✎
            </button>
            {char.data.identity.path && hasClass && (
              <button 
                onClick={async () => {
                  const ok = await askConfirm({
                    title: 'Remove Path',
                    message: 'Are you sure you want to remove your Path?',
                    confirmLabel: 'Remove',
                    tone: 'danger',
                  });
                  if (ok) {
                    patch({ identity: { ...char.data.identity, path: '' } });
                  }
                }} 
                className="text-red-500 font-bold px-1 text-sm hover:text-red-400 transition-colors" 
                title="Remove Path"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {char.data.identity.className && (
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2">Passive Features</div>
          <div className="space-y-2">
            {classPassives.map(passive => {
              const isLocked = (passive.data.class_rank || 0) > classRank;
              return (
                <div key={passive.id} className={`bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm transition-all duration-200 ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-200">{passive.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-gray-800 ${isLocked ? 'text-gray-500 border-gray-600' : 'text-gray-400 border-gray-600'}`}>{isLocked ? `Rank ${passive.data.class_rank} Req` : 'Passive'}</span>
                  </div>
                  <div className="text-xs italic leading-snug text-gray-300">
                    {passive.data.description?.split(/\r?\n|\\n/).map((line: string, idx: number) => (
                      <span key={idx} className="block mb-1 last:mb-0">{line}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            {classPassives.length === 0 && <p className="text-xs text-gray-500 italic">No passives for this class/path.</p>}
          </div>
        </div>
      )}

      <div className="mt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Disciplines</div>
          <Tooltip text="Starts with 1 Discipline slot. Unlock more with the New Discipline advancement in Progression." className="w-fit" noBorder>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-700">
              Slots: {charDisciplines.length}/{maxDisciplineSlots}
            </span>
          </Tooltip>
        </div>
        <div className="space-y-2">
          {charDisciplines.map((d: string, i: number) => (
            <div key={i} className="flex items-center justify-between w-full bg-black/20 border border-gray-700 rounded-lg px-2 py-1.5 min-h-[38px]">
              <div className="flex-1 min-w-0 text-sm text-gray-200 pr-2">
                <span className={`truncate block ${d ? 'font-bold' : 'text-gray-500 italic'}`}>{d || "— Select Discipline —"}</span>
              </div>
              <div className="flex items-center gap-1 border-l border-gray-700 pl-2 ml-1 shrink-0">
                <button 
                  onClick={() => { setModalDisciplineIndex(i); setIsDisciplineModalOpen(true); }} 
                  className="text-gray-400 text-xs px-1 hover:text-white transition-colors" 
                  title="Replace Discipline"
                >
                  ✎
                </button>
                <button 
                  className="text-red-500 font-bold px-1 text-sm hover:text-red-400 transition-colors" 
                  onClick={async () => {
                    const ok = await askConfirm({
                      title: 'Remove Discipline',
                      message: `Are you sure you want to delete ${d || 'this discipline'}?`,
                      confirmLabel: 'Remove',
                      tone: 'danger',
                    });
                    if (ok) {
                      patch({ disciplines: charDisciplines.filter((_: any, j: number) => j !== i) });
                    }
                  }}
                  title="Remove Discipline"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {canAddDiscipline && (
            <button 
              className="border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-white/5 w-full mt-2 text-gray-400 font-medium transition-colors" 
              onClick={() => { setModalDisciplineIndex(charDisciplines.length); setIsDisciplineModalOpen(true); }}
            >
              + add discipline
            </button>
          )}
        </div>
      </div>
    </section>
  );
}