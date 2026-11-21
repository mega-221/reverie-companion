import { useState } from 'react';
import type { Character } from '../../../types';
import { Tooltip } from '../utils';
import {
  TIER_DEFINITIONS,
  ADVANCEMENT_NODES,
  ADVANCEMENT_CATEGORY_HEX,
  calculateTierFromLevel,
  getTierDefinition,
  isNodeAvailableInTier,
  type AdvancementNodeDef,
  type TierDefinition,
} from './progressionData';

const CATEGORY_STYLES: Record<
  AdvancementNodeDef['category'],
  {
    diamondHex: string;
    cardLit: string;
    cardHalf: string;
    glowLit: string;
    glowHalf: string;
    pipLit: string;
    targetBadge: string;
  }
> = {
  combat: {
    diamondHex: ADVANCEMENT_CATEGORY_HEX.combat,
    cardLit: 'border-amber-500/75 bg-[#0c1017]',
    cardHalf: 'border-amber-600/45 bg-[#0c1017]',
    glowLit: '0 0 11px -2px rgba(245, 158, 11, 0.36)',
    glowHalf: '0 0 7px -2px rgba(245, 158, 11, 0.18)',
    pipLit: 'bg-amber-400',
    targetBadge: 'border-amber-700/70 text-amber-200',
  },
  vigor: {
    diamondHex: ADVANCEMENT_CATEGORY_HEX.vigor,
    cardLit: 'border-red-500/80 bg-[#0c1017]',
    cardHalf: 'border-red-600/45 bg-[#0c1017]',
    glowLit: '0 0 11px -2px rgba(239, 68, 68, 0.38)',
    glowHalf: '0 0 7px -2px rgba(239, 68, 68, 0.18)',
    pipLit: 'bg-red-500',
    targetBadge: 'border-red-700/70 text-red-200',
  },
  strain: {
    diamondHex: ADVANCEMENT_CATEGORY_HEX.strain,
    cardLit: 'border-blue-500/80 bg-[#0c1017]',
    cardHalf: 'border-blue-600/45 bg-[#0c1017]',
    glowLit: '0 0 11px -2px rgba(59, 130, 246, 0.38)',
    glowHalf: '0 0 7px -2px rgba(59, 130, 246, 0.18)',
    pipLit: 'bg-blue-500',
    targetBadge: 'border-blue-700/70 text-blue-200',
  },
  mastery: {
    diamondHex: ADVANCEMENT_CATEGORY_HEX.mastery,
    cardLit: 'border-cyan-500/75 bg-[#0c1017]',
    cardHalf: 'border-cyan-600/45 bg-[#0c1017]',
    glowLit: '0 0 11px -2px rgba(6, 182, 212, 0.35)',
    glowHalf: '0 0 7px -2px rgba(6, 182, 212, 0.18)',
    pipLit: 'bg-cyan-400',
    targetBadge: 'border-cyan-700/70 text-cyan-200',
  },
  narrative: {
    diamondHex: ADVANCEMENT_CATEGORY_HEX.narrative,
    cardLit: 'border-purple-500/75 bg-[#0c1017]',
    cardHalf: 'border-purple-600/45 bg-[#0c1017]',
    glowLit: '0 0 11px -2px rgba(168, 85, 247, 0.35)',
    glowHalf: '0 0 7px -2px rgba(168, 85, 247, 0.18)',
    pipLit: 'bg-purple-400',
    targetBadge: 'border-purple-700/70 text-purple-200',
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
  const activeColor = isCurrentTier ? 'var(--rev-tier-accent)' : '#94a3b8';

  return (
    <div className="flex items-center justify-center relative z-20">
      {Array.from({ length: maxLevels }).map((_, i) => {
        const isFilled = i < unlockedLevelsInTier;
        return (
          <div key={i} className="flex items-center">
            <div
              className={`w-2.5 h-2.5 rotate-45 border transition-all duration-300 ${
                isFilled ? 'border-transparent' : 'bg-transparent border-gray-600'
              }`}
              style={
                isFilled
                  ? {
                      backgroundColor: activeColor,
                      boxShadow: `0 0 6px ${activeColor}`,
                    }
                  : undefined
              }
            />
            {i < maxLevels - 1 && (
              <div
                className="h-px w-3 mx-1.5 transition-colors duration-300"
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

function isSlotFilled(
  advancements: NonNullable<Character['data']['progression']['advancements']>,
  tier: number,
  nodeType: AdvancementNodeDef['type'],
  slotIndex: number
): boolean {
  const entries = advancements.filter(a => a.tier === tier && a.type === nodeType);
  if (entries.some(e => e.slot === slotIndex)) return true;

  const explicitSlots = new Set(
    entries.filter(e => e.slot !== undefined).map(e => e.slot!)
  );
  const unslottedCount = entries.filter(e => e.slot === undefined).length;
  const freeSlots = [0, 1].filter(s => !explicitSlots.has(s));
  const pos = freeSlots.indexOf(slotIndex);
  return pos !== -1 && pos < unslottedCount;
}

function WindowNode({
  node,
  tier,
  isTierUnlocked,
  unspentPoints,
  advancements,
  onInvest,
  slotIndex,
}: {
  node: AdvancementNodeDef;
  tier: number;
  isTierUnlocked: boolean;
  unspentPoints: number;
  advancements: NonNullable<Character['data']['progression']['advancements']>;
  onInvest: (tier: number, node: AdvancementNodeDef, slot?: number) => void;
  slotIndex?: number;
}) {
  const isSingleInstance = slotIndex !== undefined;
  const matchingEntries = advancements.filter(
    a => a.tier === tier && a.type === node.type
  );

  const effectiveMax = isSingleInstance ? 1 : node.maxPerTier;
  const rank = isSingleInstance
    ? isSlotFilled(advancements, tier, node.type, slotIndex!)
      ? 1
      : 0
    : matchingEntries.length;

  const isMaxed = isSingleInstance
    ? rank >= 1
    : matchingEntries.length >= node.maxPerTier;
  const isPartialPair = (node.type === 'acc' || node.type === 'eva') && rank === 1;
  const canInvest =
    isTierUnlocked &&
    unspentPoints > 0 &&
    !isMaxed &&
    matchingEntries.length < node.maxPerTier;
  const style = CATEGORY_STYLES[node.category];

  const targetNames = isSingleInstance
    ? []
    : matchingEntries.map(e => e.targetName).filter((n): n is string => Boolean(n));
  const targetSummary = targetNames.join(', ');

  let tooltipText = node.description;
  if (isPartialPair) {
    tooltipText = `${node.description}\nProgress: 1/2 invested — invest 1 more to unlock +1.`;
  } else if (targetSummary) {
    tooltipText = `${node.description}\nChosen: ${targetSummary}`;
  }

  return (
    <Tooltip text={tooltipText} className="w-full" noBorder noTruncate>
      <button
        type="button"
        disabled={!canInvest}
        onClick={() => {
          if (canInvest) onInvest(tier, node, slotIndex);
        }}
        style={
          rank > 0
            ? { boxShadow: isPartialPair ? style.glowHalf : style.glowLit }
            : undefined
        }
        className={`group relative w-full text-left rounded-lg border transition-colors duration-200 select-none px-2.5 py-2 ${
          rank > 0
            ? isPartialPair
              ? style.cardHalf
              : style.cardLit
            : canInvest
            ? 'bg-[#0b0e14] border-gray-600/80 hover:border-gray-300 hover:bg-[#111622] cursor-pointer'
            : 'bg-[#080b10] border-gray-800/85 cursor-default'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rotate-45 border shrink-0 transition-all duration-300 ${
                rank > 0
                  ? 'border-transparent'
                  : canInvest
                  ? 'bg-transparent border-gray-500 group-hover:border-gray-300'
                  : 'bg-transparent border-gray-600'
              }`}
              style={
                rank > 0
                  ? {
                      backgroundColor: style.diamondHex,
                      boxShadow: `0 0 6px ${style.diamondHex}`,
                    }
                  : undefined
              }
            />
            <span
              className={`font-semibold text-xs leading-snug truncate ${
                rank > 0 ? 'text-white' : 'text-gray-200'
              }`}
            >
              {node.shortLabel}
            </span>
          </div>

          {targetNames.length > 0 && (
            <span
              className={`text-[10px] leading-none px-1.5 py-0.5 rounded bg-black/70 border truncate max-w-[88px] shrink-0 ${style.targetBadge}`}
            >
              {targetSummary}
            </span>
          )}
        </div>

        {!isSingleInstance && (
          <div className="flex items-center gap-1 mt-1.5 pl-3.5">
            {Array.from({ length: effectiveMax }).map((_, pipIdx) => {
              const filled = pipIdx < rank;
              return (
                <div
                  key={pipIdx}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    filled ? style.pipLit : 'bg-gray-800'
                  }`}
                />
              );
            })}
          </div>
        )}
      </button>
    </Tooltip>
  );
}

function TierChurchCard({
  tierDef,
  currentLevel,
  currentTier,
  advancements,
  unspentPoints,
  onInvest,
  onRefundTier,
}: {
  tierDef: TierDefinition;
  currentLevel: number;
  currentTier: number;
  advancements: Character['data']['progression']['advancements'];
  unspentPoints: number;
  onInvest: (tier: number, node: AdvancementNodeDef, slot?: number) => void;
  onRefundTier: (tier: number) => void;
}) {
  const isTierUnlocked = currentTier >= tierDef.tier;
  const isCurrentTier = currentTier === tierDef.tier;
  const unlockedLevelsInTier = Math.max(0, Math.min(4, currentLevel - tierDef.minLevel + 1));
  const safeAdvancements = advancements || [];
  const tierAdvCount = safeAdvancements.filter(a => a.tier === tierDef.tier).length;

  const availableNodes = ADVANCEMENT_NODES.filter(n => isNodeAvailableInTier(n, tierDef.tier));
  const accNode = availableNodes.find(n => n.type === 'acc');
  const evaNode = availableNodes.find(n => n.type === 'eva');
  const vlNode = availableNodes.find(n => n.type === 'vl');
  const slNode = availableNodes.find(n => n.type === 'sl');

  const lowerOrder = ['aspect_slot', 'new_discipline', 'discipline_ability', 'conviction_5', 'skill_5'] as const;
  const lowerNodes = lowerOrder
    .map(t => availableNodes.find(n => n.type === t))
    .filter((n): n is AdvancementNodeDef => Boolean(n));

  const cardAccentColor = isCurrentTier ? 'var(--rev-tier-accent)' : isTierUnlocked ? '#94a3b8' : '#164e63';

  return (
    <div
      className={`rev-dark-card ${
        !isTierUnlocked ? 'rev-locked-tier' : ''
      } relative h-[628px] max-w-[380px] mx-auto w-full md:max-w-none flex flex-col border-[3px] border-double rounded-b-xl shadow-[inset_0_0_50px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300 ${
        !isTierUnlocked ? 'border-cyan-950/60 bg-[#05080d] opacity-75' : ''
      }`}
      style={{
        containerType: 'inline-size',
        borderTopLeftRadius: '50cqw',
        borderTopRightRadius: '50cqw',
        ...(isCurrentTier
          ? {
              background:
                'linear-gradient(to bottom, var(--rev-tier-bg-top) 0%, var(--rev-tier-bg-mid) 52%, var(--rev-bg-deep) 100%)',
              borderColor: 'color-mix(in srgb, var(--rev-tier-accent) 55%, transparent)',
            }
          : isTierUnlocked
          ? {
              background:
                'linear-gradient(to bottom, var(--rev-surface) 0%, var(--rev-bg-deep) 100%)',
              borderColor: 'var(--rev-border-strong)',
            }
          : {}),
      }}
    >
      {/* Inner Double Hairline Frame following True Half-Circle Arch */}
      <div
        className="absolute inset-[6px] border rounded-b-lg pointer-events-none opacity-25 z-10"
        style={{
          borderColor: cardAccentColor,
          borderTopLeftRadius: 'calc(50cqw - 6px)',
          borderTopRightRadius: 'calc(50cqw - 6px)',
        }}
      />

      {/* Subtle Top Radial Accent */}
      {isTierUnlocked && (
        <div
          className="absolute inset-0 z-10 pointer-events-none opacity-20"
          style={{
            background: isCurrentTier
              ? 'radial-gradient(circle at top center, color-mix(in srgb, var(--rev-tier-accent) 40%, transparent) 0%, transparent 55%)'
              : 'radial-gradient(circle at top center, rgba(148, 163, 184, 0.35) 0%, transparent 55%)',
          }}
        />
      )}

      {/* Subtle Ambient Drift & Motes on Active Tier */}
      {isCurrentTier && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-b-xl z-10"
          style={{
            borderTopLeftRadius: '50cqw',
            borderTopRightRadius: '50cqw',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at center, color-mix(in srgb, var(--rev-tier-accent) 12%, transparent) 0%, transparent 55%)',
              animation: 'drift 12s ease-in-out infinite',
            }}
          />
          <div className="absolute bottom-0 w-full h-full opacity-70">
            <div
              className="absolute bottom-0 left-1/4 w-1 h-1 rounded-full"
              style={{
                backgroundColor: 'var(--rev-tier-accent)',
                boxShadow: '0 0 5px var(--rev-tier-accent)',
                animation: 'floatUp 4.5s linear infinite',
              }}
            />
            <div
              className="absolute bottom-8 right-1/4 w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: 'var(--rev-tier-text)',
                boxShadow: '0 0 8px var(--rev-tier-text)',
                animation: 'floatCyan 3.4s linear infinite 1s',
              }}
            />
            <div
              className="absolute bottom-4 left-1/2 w-1 h-1 rounded-full"
              style={{
                backgroundColor: 'var(--rev-tier-accent)',
                boxShadow: '0 0 6px var(--rev-tier-accent)',
                animation: 'floatUp 3.8s linear infinite 2s',
              }}
            />
          </div>
        </div>
      )}

      {/* Subtle Dormant Glow on Locked Tiers */}
      {!isTierUnlocked && (
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none z-10" />
      )}

      {/* Standardized Arch Header Segment */}
      <div className="relative z-20 h-[136px] pt-7 pb-2 px-5 text-center flex flex-col items-center justify-between shrink-0">
        <div className="h-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest">
          <span
            className={isCurrentTier ? '' : isTierUnlocked ? 'text-slate-300' : 'text-cyan-700'}
            style={isCurrentTier ? { color: 'var(--rev-tier-text)' } : undefined}
          >
            Tier {tierDef.tier}
          </span>
          <span className="text-gray-600">•</span>
          <span className={isTierUnlocked ? 'text-gray-400' : 'text-cyan-800'}>
            {tierDef.levelRange}
          </span>
        </div>

        <div className="w-full h-11 flex items-center justify-center px-1">
          <div className={`font-cinzel font-bold text-base uppercase tracking-[0.08em] leading-tight line-clamp-2 text-center ${isTierUnlocked ? 'text-white drop-shadow-md' : 'text-cyan-700/80'}`}>
            {tierDef.title}
          </div>
        </div>

        <div className="h-5 flex items-center justify-center">
          <TierLevelDiamonds
            unlockedLevelsInTier={unlockedLevelsInTier}
            isCurrentTier={isCurrentTier}
          />
        </div>
      </div>

      {/* Standardized Advancement Segments */}
      <div className="relative z-20 px-3.5 pb-2 pt-1 flex-1 flex flex-col">
        {/* Standardized Upper Combat & Vitals Segment */}
        <div className="h-[192px] flex flex-col justify-start pt-1 gap-1.5 shrink-0">
          {accNode && (
            <WindowNode
              node={accNode}
              tier={tierDef.tier}
              isTierUnlocked={isTierUnlocked}
              unspentPoints={unspentPoints}
              advancements={safeAdvancements}
              onInvest={onInvest}
            />
          )}
          {evaNode && (
            <WindowNode
              node={evaNode}
              tier={tierDef.tier}
              isTierUnlocked={isTierUnlocked}
              unspentPoints={unspentPoints}
              advancements={safeAdvancements}
              onInvest={onInvest}
            />
          )}
          {(vlNode || slNode) && (
            <div className="grid grid-cols-2 gap-1.5">
              {vlNode && [0, 1].map(slotIdx => (
                <WindowNode
                  key={`${tierDef.tier}_vl_${slotIdx}`}
                  node={vlNode}
                  tier={tierDef.tier}
                  isTierUnlocked={isTierUnlocked}
                  unspentPoints={unspentPoints}
                  advancements={safeAdvancements}
                  onInvest={onInvest}
                  slotIndex={slotIdx}
                />
              ))}
              {slNode && [0, 1].map(slotIdx => (
                <WindowNode
                  key={`${tierDef.tier}_sl_${slotIdx}`}
                  node={slNode}
                  tier={tierDef.tier}
                  isTierUnlocked={isTierUnlocked}
                  unspentPoints={unspentPoints}
                  advancements={safeAdvancements}
                  onInvest={onInvest}
                  slotIndex={slotIdx}
                />
              ))}
            </div>
          )}
        </div>

        {/* Lower Horizontal Divider with Diamond */}
        <div className="flex items-center gap-2 my-2.5 px-1 shrink-0">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-600/70 to-gray-600/70" />
          <div
            className={`w-1.5 h-1.5 rotate-45 ${
              isCurrentTier ? '' : isTierUnlocked ? 'bg-slate-400' : 'bg-cyan-900/70'
            }`}
            style={isCurrentTier ? { backgroundColor: 'var(--rev-tier-accent)' } : undefined}
          />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-600/70 to-gray-600/70" />
        </div>

        {/* Standardized Fixed-Height Lower Mastery & Narrative Segment (Centered Vertically) */}
        <div className="h-[208px] flex flex-col justify-center gap-1.5 shrink-0">
          {lowerNodes.map(node => (
            <WindowNode
              key={`${tierDef.tier}_${node.type}`}
              node={node}
              tier={tierDef.tier}
              isTierUnlocked={isTierUnlocked}
              unspentPoints={unspentPoints}
              advancements={safeAdvancements}
              onInvest={onInvest}
            />
          ))}
        </div>
      </div>

      {/* Standardized Footer Segment: Tier-Wide Refund */}
      <div className="relative z-20 px-3.5 pb-3 pt-1 h-11 flex items-center justify-center shrink-0">
        {tierAdvCount > 0 && (
          <button
            type="button"
            onClick={() => onRefundTier(tierDef.tier)}
            className="w-full py-1.5 rev-tier-refund-btn text-[10px] font-bold uppercase tracking-widest"
          >
            Refund Tier ({tierAdvCount})
          </button>
        )}
      </div>
    </div>
  );
}

export default function SkillTreeCard({
  char,
  totalBudget,
  spentCount,
  unspentPoints,
  onInvest,
  onRefundTier,
}: {
  char: Character;
  totalBudget: number;
  spentCount: number;
  unspentPoints: number;
  onInvest: (tier: number, node: AdvancementNodeDef, slot?: number) => void;
  onRefundTier: (tier: number) => void;
}) {
  const currentLevel = Math.max(0, char.data.progression.level ?? 0);
  const currentTier = calculateTierFromLevel(currentLevel);
  const advancements = char.data.progression.advancements || [];

  const maxAdvTier = advancements.reduce((max, a) => Math.max(max, a.tier), 0);
  const highestVisibleBeyondTier = Math.max(currentTier, maxAdvTier);
  const beyondTiers: TierDefinition[] = [];
  for (let t = 6; t <= highestVisibleBeyondTier; t++) {
    beyondTiers.push(getTierDefinition(t));
  }

  const allVisibleTiers = [...TIER_DEFINITIONS, ...beyondTiers];
  const [selectedMobileTier, setSelectedMobileTier] = useState<number>(() =>
    Math.max(1, currentTier || 1)
  );
  const activeMobileTierDef =
    allVisibleTiers.find(t => t.tier === selectedMobileTier) ||
    allVisibleTiers.find(t => t.tier === Math.max(1, currentTier || 1)) ||
    allVisibleTiers[0];

  return (
    <section className="relative bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 shadow-sm w-full overflow-hidden">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 pb-3 mb-4 sm:mb-5">
        <h3 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 text-gray-200">
          Advancement Constellation
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="px-2.5 sm:px-3 py-1 rounded bg-black/35 border border-gray-700 text-gray-300 tabular-nums">
            Advancements{' '}
            <strong
              className={
                unspentPoints > 0
                  ? 'text-red-400'
                  : unspentPoints < 0
                  ? 'rev-keep-color text-red-400'
                  : 'text-gray-100'
              }
            >
              {spentCount}/{totalBudget}
            </strong>
          </span>
          {unspentPoints > 0 && (
            <span className="text-red-300 bg-red-950/50 border border-red-800/80 px-2.5 py-1 rounded">
              {unspentPoints} Available
            </span>
          )}
          {unspentPoints < 0 && (
            <span className="rev-keep-color text-red-300 bg-red-950/50 border border-red-800/80 px-2.5 py-1 rounded">
              {unspentPoints} Deficit
            </span>
          )}
        </div>
      </div>

      {/* Mobile Tier Switcher Deck (< 640px) */}
      <div className="relative z-10 sm:hidden flex flex-col gap-4">
        <div className="grid grid-cols-5 gap-1.5">
          {allVisibleTiers.map(tierDef => {
            const isSelected = activeMobileTierDef?.tier === tierDef.tier;
            const isUnlocked = currentTier >= tierDef.tier;
            const isActiveTier = currentTier === tierDef.tier;
            const tierCount = advancements.filter(a => a.tier === tierDef.tier).length;

            return (
              <button
                key={tierDef.tier}
                type="button"
                onClick={() => setSelectedMobileTier(tierDef.tier)}
                className={`py-2 px-1 border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'rev-btn-primary shadow-sm'
                    : isUnlocked
                    ? 'bg-black/30 border-gray-700 text-gray-300'
                    : 'bg-black/20 border-gray-800 text-gray-500 opacity-70'
                }`}
                style={{
                  borderRadius: 'var(--rev-radius-control)',
                  ...(isActiveTier && !isSelected
                    ? { borderColor: 'var(--rev-tier-accent)' }
                    : {}),
                }}
              >
                <span className="font-cinzel font-bold text-xs leading-none">
                  T{tierDef.tier}
                </span>
                <span className="text-[9px] font-bold leading-none opacity-80 tabular-nums">
                  {tierCount > 0 ? `${tierCount} pt` : isActiveTier ? 'Now' : isUnlocked ? 'Open' : 'Lock'}
                </span>
              </button>
            );
          })}
        </div>

        {activeMobileTierDef && (
          <div className="flex flex-col items-center">
            <TierChurchCard
              tierDef={activeMobileTierDef}
              currentLevel={currentLevel}
              currentTier={currentTier}
              advancements={advancements}
              unspentPoints={unspentPoints}
              onInvest={onInvest}
              onRefundTier={onRefundTier}
            />
          </div>
        )}
      </div>

      {/* Tablet / Desktop Grid: Tiers 1–5 Half-Circle Arched Cards */}
      <div className="relative z-10 hidden sm:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-stretch rev-tier-grid">
        {TIER_DEFINITIONS.map(tierDef => (
          <TierChurchCard
            key={tierDef.tier}
            tierDef={tierDef}
            currentLevel={currentLevel}
            currentTier={currentTier}
            advancements={advancements}
            unspentPoints={unspentPoints}
            onInvest={onInvest}
            onRefundTier={onRefundTier}
          />
        ))}
      </div>

      {/* Beyond Tier 5: Dynamically added below regular progression on sm+ */}
      {beyondTiers.length > 0 && (
        <div className="relative z-10 hidden sm:block mt-6 pt-6 border-t border-gray-700/80">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-cinzel text-purple-300 tracking-wide">
              Endgame & Beyond
            </h4>
            <span className="text-xs text-gray-400">Tiers 6+</span>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4 items-stretch rev-tier-grid">
            {beyondTiers.map(tierDef => (
              <TierChurchCard
                key={tierDef.tier}
                tierDef={tierDef}
                currentLevel={currentLevel}
                currentTier={currentTier}
                advancements={advancements}
                unspentPoints={unspentPoints}
                onInvest={onInvest}
                onRefundTier={onRefundTier}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}