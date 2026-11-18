import { useState } from 'react';
import type { Character } from '../../../types';
import {
  TIER_DEFINITIONS,
  ADVANCEMENT_NODES,
  calculateLevelFromXp,
  calculateTierFromLevel,
  type AdvancementNodeDef,
} from './progressionData';

const CATEGORY_STYLES: Record<AdvancementNodeDef['category'], { ring: string; glow: string; badge: string }> = {
  combat: {
    ring: 'border-amber-500/80 bg-amber-950/30 text-amber-200',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.25)] border-amber-400 bg-amber-900/40',
    badge: 'text-amber-400',
  },
  vitals: {
    ring: 'border-red-500/80 bg-red-950/30 text-red-200',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.25)] border-red-400 bg-red-900/40',
    badge: 'text-red-400',
  },
  mastery: {
    ring: 'border-cyan-500/80 bg-cyan-950/30 text-cyan-200',
    glow: 'shadow-[0_0_15px_rgba(34,211,238,0.25)] border-cyan-400 bg-cyan-900/40',
    badge: 'text-cyan-400',
  },
  narrative: {
    ring: 'border-purple-500/80 bg-purple-950/30 text-purple-200',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.25)] border-purple-400 bg-purple-900/40',
    badge: 'text-purple-400',
  },
};

function TierLevelDiamonds({
  unlockedLevelsInTier,
  isCurrentTier,
}: {
  unlockedLevelsInTier: number;
  isCurrentTier: boolean;
}) {
  const maxLevels = 4;
  const activeColor = isCurrentTier ? '#22d3ee' : '#d93838';

  return (
    <div className="flex items-center justify-center my-2">
      {Array.from({ length: maxLevels }).map((_, i) => {
        const isFilled = i < unlockedLevelsInTier;
        return (
          <div key={i} className="flex items-center">
            <div
              className={`w-2 h-2 rotate-45 border transition-all duration-300 ${
                isFilled ? 'border-transparent' : 'bg-transparent border-gray-600'
              }`}
              style={
                isFilled
                  ? {
                      backgroundColor: activeColor,
                      boxShadow: `0 0 6px ${activeColor}`,
                    }
                  : {}
              }
            />
            {i < maxLevels - 1 && (
              <div
                className="h-px w-2.5 mx-1 transition-colors duration-300"
                style={{
                  backgroundColor: i < unlockedLevelsInTier - 1 ? activeColor : '#4b5563',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SkillTree({
  char,
  unspentPoints,
  onInvest,
  onRefund,
}: {
  char: Character;
  unspentPoints: number;
  onInvest: (tier: number, node: AdvancementNodeDef) => void;
  onRefund: (tier: number, node: AdvancementNodeDef) => void;
}) {
  const [hoveredInfo, setHoveredInfo] = useState<{ tier: number; node: AdvancementNodeDef } | null>(null);
  const currentLevel = calculateLevelFromXp(char.data.progression.xp ?? 0);
  const currentTier = calculateTierFromLevel(currentLevel);
  const advancements = char.data.progression.advancements || [];

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-700 pb-3 mb-5">
        <div>
          <h3 className="text-lg font-cinzel text-gray-200">
            Advancement Constellation
          </h3>
          <p className="text-xs text-gray-400">
            Click an unlocked node to invest 1 Advancement Point · Right-click (or use −) to refund
          </p>
        </div>

        <div className="min-h-[36px] flex items-center px-3 py-1.5 rounded-lg bg-black/40 border border-gray-700/80 text-xs text-gray-300 max-w-xl">
          {hoveredInfo ? (
            <span>
              <strong className="text-red-400 font-cinzel">Tier {hoveredInfo.tier} · {hoveredInfo.node.label}:</strong>{' '}
              {hoveredInfo.node.description}
            </span>
          ) : (
            <span className="text-gray-500 italic">Hover over any advancement node to inspect its effect and tier limits...</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="min-w-[1140px] grid grid-cols-6 gap-4 relative">
          {TIER_DEFINITIONS.map((tierDef, colIdx) => {
            const isTierUnlocked = currentTier >= tierDef.tier;
            const isCurrentTier = currentTier === tierDef.tier;
            const unlockedLevelsInTier = Math.max(
              0,
              Math.min(4, currentLevel - tierDef.minLevel + 1)
            );
            const tierNodes = ADVANCEMENT_NODES.filter(n => n.tiers.includes(tierDef.tier));

            return (
              <div
                key={tierDef.tier}
                className={`relative flex flex-col rounded-xl border transition-all duration-300 ${
                  isTierUnlocked
                    ? 'bg-gray-900/70 border-gray-700 shadow-inner'
                    : 'bg-gray-950/50 border-gray-800/70 opacity-50'
                }`}
              >
                {colIdx < TIER_DEFINITIONS.length - 1 && (
                  <div
                    className={`hidden lg:block absolute top-11 -right-4 w-4 h-0.5 z-10 ${
                      currentTier > tierDef.tier ? 'bg-red-500/80' : 'bg-gray-700'
                    }`}
                  />
                )}

                <div
                  className={`p-3.5 border-b text-center relative ${
                    isTierUnlocked
                      ? 'border-gray-700 bg-gradient-to-b from-red-950/25 to-transparent'
                      : 'border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                    <span className={isTierUnlocked ? 'text-red-400' : 'text-gray-500'}>
                      Tier {tierDef.tier}
                    </span>
                    <span className="text-gray-400">{tierDef.levelRange}</span>
                  </div>

                  <div className="font-cinzel font-bold text-sm text-gray-100 truncate">
                    {tierDef.title}
                  </div>

                  <TierLevelDiamonds
                    unlockedLevelsInTier={unlockedLevelsInTier}
                    isCurrentTier={isCurrentTier}
                  />

                  <div className="mt-1 flex flex-wrap justify-center gap-1">
                    {tierDef.milestoneBonuses.map(bonus => (
                      <span
                        key={bonus}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          isTierUnlocked
                            ? 'bg-amber-950/30 border-amber-700/50 text-amber-300'
                            : 'bg-gray-900 border-gray-800 text-gray-500'
                        }`}
                      >
                        {bonus}
                      </span>
                    ))}
                  </div>

                  {!isTierUnlocked && (
                    <div className="mt-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">
                      Locked · Requires Lv {tierDef.minLevel}
                    </div>
                  )}
                </div>

                <div className="relative p-3.5 flex-1 flex flex-col gap-3">
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 top-3 bottom-3 w-0.5 pointer-events-none ${
                      isTierUnlocked ? 'bg-gray-700/70' : 'bg-gray-800/40'
                    }`}
                  />

                  {tierNodes.map(node => {
                    const matchingEntries = advancements.filter(
                      a => a.tier === tierDef.tier && a.type === node.type
                    );
                    const rank = matchingEntries.length;
                    const isMaxed = rank >= node.maxPerTier;
                    const canInvest = isTierUnlocked && unspentPoints > 0 && !isMaxed;
                    const style = CATEGORY_STYLES[node.category];

                    return (
                      <div
                        key={`${tierDef.tier}_${node.type}`}
                        onMouseEnter={() => setHoveredInfo({ tier: tierDef.tier, node })}
                        onMouseLeave={() => setHoveredInfo(null)}
                        onContextMenu={e => {
                          e.preventDefault();
                          if (rank > 0) onRefund(tierDef.tier, node);
                        }}
                        className={`relative z-10 rounded-lg border p-2.5 transition-all select-none ${
                          rank > 0
                            ? style.glow
                            : canInvest
                            ? 'bg-gray-800/95 border-gray-600 hover:border-gray-400 cursor-pointer'
                            : 'bg-gray-900/90 border-gray-800'
                        }`}
                        onClick={() => {
                          if (canInvest) onInvest(tierDef.tier, node);
                        }}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className={`text-xs font-bold leading-snug ${rank > 0 ? 'text-white' : 'text-gray-300'}`}>
                            {node.label}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            {rank > 0 && (
                              <button
                                type="button"
                                title="Refund 1 rank"
                                onClick={e => {
                                  e.stopPropagation();
                                  onRefund(tierDef.tier, node);
                                }}
                                className="w-4 h-4 rounded bg-black/50 hover:bg-red-900/80 text-gray-300 hover:text-white text-[10px] font-bold flex items-center justify-center border border-gray-700"
                              >
                                −
                              </button>
                            )}
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/50 border border-gray-700/80 ${
                                isMaxed ? style.badge : 'text-gray-400'
                              }`}
                            >
                              {rank}/{node.maxPerTier}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1 mt-2">
                          {Array.from({ length: node.maxPerTier }).map((_, pipIdx) => {
                            const filled = pipIdx < rank;
                            return (
                              <div
                                key={pipIdx}
                                className={`h-1.5 flex-1 rounded-full transition-all ${
                                  filled
                                    ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]'
                                    : 'bg-gray-800 border border-gray-700/60'
                                }`}
                              />
                            );
                          })}
                        </div>

                        {matchingEntries.some(e => e.targetName) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {matchingEntries.map(
                              entry =>
                                entry.targetName && (
                                  <span
                                    key={entry.id}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 border border-gray-700 text-gray-200 truncate max-w-full"
                                  >
                                    {entry.targetName}
                                  </span>
                                )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}