import { useState } from 'react';
import type { Character, CharacterData, AdvancementSelection } from '../../types';
import {
  getTotalAdvancementBudget,
  calculateTierFromLevel,
  getMaxAccessibleAbilityRank,
  refundTierAdvancements,
  type AdvancementNodeDef,
  type AbilityPickTask,
} from './progression/progressionData';
import { useCompendium } from '../../CompendiumContext';
import { useConfirm } from './ConfirmDialog';
import ProgressionSummaryCard from './progression/ProgressionSummaryCard';
import SkillTreeCard from './progression/SkillTreeCard';
import AdvancementTargetModal from './progression/AdvancementTargetModal';
import TierUnlockedModal from './progression/TierUnlockedModal';

export default function ProgressionSection({
  char,
  patch,
  onQueueAbilityPicks,
}: {
  char: Character;
  patch: (p: Partial<CharacterData>) => void;
  onQueueAbilityPicks: (tasks: AbilityPickTask[]) => void;
}) {
  const { getAbilities, getEntryByName } = useCompendium();
  const { askConfirm, confirmDialog } = useConfirm();
  const [pendingNode, setPendingNode] = useState<{ tier: number; node: AdvancementNodeDef } | null>(null);
  const [unlockedTierTransition, setUnlockedTierTransition] = useState<{ fromTier: number; toTier: number } | null>(null);

  const currentLevel = Math.max(0, char.data.progression.level ?? 0);
  const currentTier = calculateTierFromLevel(currentLevel);
  const advancements = char.data.progression.advancements || [];
  const totalBudget = getTotalAdvancementBudget(currentLevel);
  const unspentPoints = totalBudget - advancements.length;

  const commitAdvancement = (
    tier: number,
    node: AdvancementNodeDef,
    targetName?: string,
    slot?: number
  ) => {
    const newEntry: AdvancementSelection = {
      id: crypto.randomUUID(),
      tier,
      type: node.type,
      ...(targetName ? { targetName } : {}),
      ...(slot !== undefined ? { slot } : {}),
    };

    const nextAdvancements = [...advancements, newEntry];
    const updates: Partial<CharacterData> = {
      progression: {
        ...char.data.progression,
        level: currentLevel,
        tier: currentTier,
        advancements: nextAdvancements,
      },
    };

    if (node.type === 'conviction_5' && targetName) {
      updates.convictions = char.data.convictions.map(c =>
        c.name === targetName ? { ...c, rank: 5 } : c
      );
    }

    patch(updates);
  };

  const handleInvest = async (tier: number, node: AdvancementNodeDef, slot?: number) => {
    if (unspentPoints <= 0) return;

    const matching = advancements.filter(
      a => a.tier === tier && a.type === node.type
    );
    if (matching.length >= node.maxPerTier) return;

    if (slot !== undefined) {
      const explicitTaken = matching.some(a => a.slot === slot);
      if (explicitTaken) return;
    }

    if (node.requiresTarget) {
      setPendingNode({ tier, node });
      return;
    }

    const ok = await askConfirm({
      title: `Invest Tier ${tier} Advancement`,
      message: `Spend 1 Advancement Point on "${node.label}"?\n\n${node.description}`,
      confirmLabel: 'Confirm Investment',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;

    commitAdvancement(tier, node, undefined, slot);
  };

  const handleRefundTier = async (tier: number) => {
    const tierCount = advancements.filter(a => a.tier === tier).length;
    if (tierCount === 0) return;

    const ok = await askConfirm({
      title: `Refund Tier ${tier}`,
      message: `Refund all ${tierCount} advancement${tierCount === 1 ? '' : 's'} invested in Tier ${tier}?`,
      confirmLabel: 'Refund Tier',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;

    const updates = refundTierAdvancements(char.data, tier);
    patch({
      ...updates,
      progression: {
        ...(updates.progression || char.data.progression),
        level: currentLevel,
        tier: currentTier,
      },
    });
  };

  const handleCloseTierUnlocked = () => {
    const transition = unlockedTierTransition;
    setUnlockedTierTransition(null);
    if (!transition) return;

    const oldMaxRank = getMaxAccessibleAbilityRank(transition.fromTier);
    const newMaxRank = getMaxAccessibleAbilityRank(transition.toTier);
    if (newMaxRank <= oldMaxRank) return;

    const ownedDisciplines = Array.from(new Set((char.data.disciplines || []).filter(Boolean)));
    if (ownedDisciplines.length === 0) return;

    const ownedAbilityNames = new Set((char.data.abilities || []).map(a => a.name));
    const allAbilities = getAbilities();
    const tasks: AbilityPickTask[] = [];

    for (const disc of ownedDisciplines) {
      for (let rank = oldMaxRank + 1; rank <= newMaxRank; rank++) {
        const alreadyOwnedAtRank = (char.data.abilities || []).filter(ab => {
          const entry = getEntryByName(ab.name);
          return entry?.data?.source === disc && Number(entry?.data?.class_rank ?? 0) === rank;
        }).length;

        const eligibleInCompendium = allAbilities.filter(
          ab =>
            ab.data?.source === disc &&
            Number(ab.data?.class_rank ?? 0) === rank &&
            !ownedAbilityNames.has(ab.name)
        );

        if (alreadyOwnedAtRank < 1 && eligibleInCompendium.length > 0) {
          tasks.push({
            discipline: disc,
            rank,
            promptDetail: `Select 1 newly unlocked Rank ${rank} ability from ${disc} (Tier ${transition.toTier}).`,
          });
        }
      }
    }

    if (tasks.length > 0) {
      onQueueAbilityPicks(tasks);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-200">
      {confirmDialog}

      <ProgressionSummaryCard
        char={char}
        patch={patch}
        onTierReached={(fromTier, toTier) => setUnlockedTierTransition({ fromTier, toTier })}
      />

      <SkillTreeCard
        char={char}
        totalBudget={totalBudget}
        spentCount={advancements.length}
        unspentPoints={unspentPoints}
        onInvest={handleInvest}
        onRefundTier={handleRefundTier}
      />

      <AdvancementTargetModal
        char={char}
        pending={pendingNode}
        onClose={() => setPendingNode(null)}
        onConfirm={(targetName) => {
          if (pendingNode) {
            commitAdvancement(pendingNode.tier, pendingNode.node, targetName);
            setPendingNode(null);
          }
        }}
      />

      <TierUnlockedModal
        tier={unlockedTierTransition?.toTier ?? null}
        onClose={handleCloseTierUnlocked}
      />
    </div>
  );
}