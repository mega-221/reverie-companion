import { useState } from 'react';
import type { Character, CharacterData, AdvancementSelection } from '../../types';
import {
  getTotalAdvancementBudget,
  calculateLevelFromXp,
  calculateTierFromLevel,
  type AdvancementNodeDef,
} from './progression/progressionData';
import ProgressionSummaryCard from './progression/ProgressionSummaryCard';
import SkillTree from './progression/SkillTree';
import AdvancementTargetModal from './progression/AdvancementTargetModal';

export default function ProgressionSection({
  char,
  patch,
}: {
  char: Character;
  patch: (p: Partial<CharacterData>) => void;
}) {
  const [pendingNode, setPendingNode] = useState<{ tier: number; node: AdvancementNodeDef } | null>(null);

  const derivedLevel = calculateLevelFromXp(char.data.progression.xp ?? 0);
  const derivedTier = calculateTierFromLevel(derivedLevel);
  const advancements = char.data.progression.advancements || [];
  const totalBudget = getTotalAdvancementBudget(derivedLevel);
  const unspentPoints = totalBudget - advancements.length;

  const commitAdvancement = (tier: number, node: AdvancementNodeDef, targetName?: string) => {
    const newEntry: AdvancementSelection = {
      id: crypto.randomUUID(),
      tier,
      type: node.type,
      ...(targetName ? { targetName } : {}),
    };

    const nextAdvancements = [...advancements, newEntry];
    const updates: Partial<CharacterData> = {
      progression: {
        ...char.data.progression,
        level: derivedLevel,
        tier: derivedTier,
        advancements: nextAdvancements,
      },
    };

    if (node.type === 'new_discipline' && targetName) {
      if (!char.data.disciplines.includes(targetName)) {
        updates.disciplines = [...char.data.disciplines, targetName];
      }
    } else if (node.type === 'discipline_ability' && targetName) {
      if (!char.data.abilities.some(a => a.name === targetName)) {
        updates.abilities = [
          ...char.data.abilities,
          { name: targetName, equipped: char.data.abilities.filter(a => a.equipped).length < 6 },
        ];
      }
    } else if (node.type === 'conviction_5' && targetName) {
      updates.convictions = char.data.convictions.map(c =>
        c.name === targetName ? { ...c, rank: 5 } : c
      );
    } else if (node.type === 'skill_5' && targetName) {
      if (targetName in char.data.skills) {
        updates.skills = { ...char.data.skills, [targetName]: 5 };
      } else {
        updates.specialSkills = char.data.specialSkills.map(s =>
          s.name === targetName ? { ...s, rank: 5 } : s
        );
      }
    }

    patch(updates);
  };

  const handleInvest = (tier: number, node: AdvancementNodeDef) => {
    if (unspentPoints <= 0) return;

    const currentCount = advancements.filter(
      a => a.tier === tier && a.type === node.type
    ).length;
    if (currentCount >= node.maxPerTier) return;

    if (node.requiresTarget) {
      setPendingNode({ tier, node });
      return;
    }

    commitAdvancement(tier, node);
  };

  const handleRefund = (tier: number, node: AdvancementNodeDef) => {
    const idx = [...advancements]
      .map((a, i) => ({ a, i }))
      .reverse()
      .find(({ a }) => a.tier === tier && a.type === node.type)?.i;

    if (idx === undefined) return;

    const removed = advancements[idx];
    const nextAdvancements = advancements.filter((_, i) => i !== idx);

    const updates: Partial<CharacterData> = {
      progression: {
        ...char.data.progression,
        level: derivedLevel,
        tier: derivedTier,
        advancements: nextAdvancements,
      },
    };

    if (removed.type === 'new_discipline' && removed.targetName) {
      updates.disciplines = char.data.disciplines.filter(d => d !== removed.targetName);
    } else if (removed.type === 'discipline_ability' && removed.targetName) {
      updates.abilities = char.data.abilities.filter(a => a.name !== removed.targetName);
    } else if (removed.type === 'conviction_5' && removed.targetName) {
      updates.convictions = char.data.convictions.map(c =>
        c.name === removed.targetName && c.rank === 5 ? { ...c, rank: 4 } : c
      );
    } else if (removed.type === 'skill_5' && removed.targetName) {
      if (removed.targetName in char.data.skills && char.data.skills[removed.targetName] === 5) {
        updates.skills = { ...char.data.skills, [removed.targetName]: 4 };
      } else {
        updates.specialSkills = char.data.specialSkills.map(s =>
          s.name === removed.targetName && s.rank === 5 ? { ...s, rank: 4 } : s
        );
      }
    }

    patch(updates);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-200">
      <ProgressionSummaryCard
        char={char}
        patch={patch}
        totalBudget={totalBudget}
        spentCount={advancements.length}
      />

      <SkillTree
        char={char}
        unspentPoints={unspentPoints}
        onInvest={handleInvest}
        onRefund={handleRefund}
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
    </div>
  );
}