import type { Character, CharacterData } from '../../types';
import type { LevelUpTarget } from './utils';
import StatsCard from './gameplay/StatsCard';
import VitalsCard from './gameplay/VitalsCard';
import CoreSkillsCard from './gameplay/CoreSkillsCard';
import LoadoutCard from './gameplay/LoadoutCard';
import InjuriesCard from './gameplay/InjuriesCard';
import SpecialSkillsCard from './gameplay/SpecialSkillsCard';
import ClassCard from './gameplay/ClassCard';
import AbilitiesCard from './gameplay/AbilitiesCard';

export default function GameplaySection({
  char,
  patch,
  updateTracker,
  setLevelUpTarget,
  setIsClassModalOpen,
  setIsPathModalOpen,
  setIsDisciplineModalOpen,
  setModalDisciplineIndex,
  setIsSpecialSkillModalOpen,
  setModalSpecialSkillIndex,
  setIsAbilityModalOpen,
  setModalAbilityIndex,
  onOpenInventory,
}: {
  char: Character;
  patch: (p: Partial<CharacterData>) => void;
  updateTracker: (key: 'vigor' | 'strain' | 'dp' | 'ap' | 'acc', amount: number) => void;
  setLevelUpTarget: (target: LevelUpTarget) => void;
  setIsClassModalOpen: (open: boolean) => void;
  setIsPathModalOpen: (open: boolean) => void;
  setIsDisciplineModalOpen: (open: boolean) => void;
  setModalDisciplineIndex: (index: number) => void;
  setIsSpecialSkillModalOpen: (open: boolean) => void;
  setModalSpecialSkillIndex: (index: number) => void;
  setIsAbilityModalOpen: (open: boolean) => void;
  setModalAbilityIndex: (index: number) => void;
  onOpenInventory: () => void;
}) {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200 items-start">
      <div className="lg:col-span-4 h-full order-1 lg:order-none">
        <StatsCard char={char} patch={patch} />
      </div>
      <div className="lg:col-span-4 h-full order-2 lg:order-none">
        <VitalsCard char={char} updateTracker={updateTracker} />
      </div>
      <div className="lg:col-span-4 h-full order-3 lg:order-none">
        <CoreSkillsCard char={char} setLevelUpTarget={setLevelUpTarget} />
      </div>

      <div className="lg:col-span-4 h-full order-6 lg:order-none">
        <LoadoutCard char={char} patch={patch} onOpenInventory={onOpenInventory} />
      </div>
      <div className="lg:col-span-4 h-full order-5 lg:order-none">
        <InjuriesCard char={char} patch={patch} />
      </div>
      <div className="lg:col-span-4 h-full order-4 lg:order-none">
        <SpecialSkillsCard
          char={char}
          patch={patch}
          setLevelUpTarget={setLevelUpTarget}
          setIsSpecialSkillModalOpen={setIsSpecialSkillModalOpen}
          setModalSpecialSkillIndex={setModalSpecialSkillIndex}
        />
      </div>

      <div className="lg:col-span-4 h-full order-7 lg:order-none">
        <ClassCard
          char={char}
          patch={patch}
          setIsClassModalOpen={setIsClassModalOpen}
          setIsPathModalOpen={setIsPathModalOpen}
          setIsDisciplineModalOpen={setIsDisciplineModalOpen}
          setModalDisciplineIndex={setModalDisciplineIndex}
        />
      </div>
      <div className="lg:col-span-8 order-8 lg:order-none">
        <AbilitiesCard
          char={char}
          patch={patch}
          setModalAbilityIndex={setModalAbilityIndex}
          setIsAbilityModalOpen={setIsAbilityModalOpen}
        />
      </div>
    </div>
  );
}
