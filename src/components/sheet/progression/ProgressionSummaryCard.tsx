import type { Character, CharacterData } from '../../../types';
import { getMaxAttributePoints, getSpentAttributePoints, Tooltip } from '../utils';
import {
  getTierDefinition,
  calculateTierFromLevel,
  pruneDisabledTierAdvancements,
  getSpendableXp,
} from './progressionData';
import {
  vigorMax,
  strainMax,
  dpMax,
  evasion,
  accuracyBonus,
  aspectSlotMax,
  getBurdenPenalty,
  getArmourCombatPenalty,
  getEquippedArmourInfo,
} from '../../../calc';
import { useCompendium } from '../../../CompendiumContext';

export default function ProgressionSummaryCard({
  char,
  patch,
  onTierReached,
}: {
  char: Character;
  patch: (p: Partial<CharacterData>) => void;
  onTierReached: (fromTier: number, toTier: number) => void;
}) {
  const { getEntryByName } = useCompendium();
  const currentLevel = Math.max(0, char.data.progression.level ?? 0);
  const currentTier = calculateTierFromLevel(currentLevel);
  const totalXp = Math.max(0, char.data.progression.xp ?? 0);
  const spendableXp = getSpendableXp(char.data);

  const burdenPenalty = getBurdenPenalty(char.data, getEntryByName);
  const armourInfo = getEquippedArmourInfo(char.data, getEntryByName);
  const armourCombatPenalty = getArmourCombatPenalty(char.data, getEntryByName);
  const totalCombatPenalty = burdenPenalty + armourCombatPenalty;
  const baseAcc = (char.data.trackers.acc || 0) + accuracyBonus(char.data);
  const effectiveAcc = baseAcc - totalCombatPenalty;
  const effectiveEva = evasion(char.data);
  const maxVigorVal = vigorMax(char.data);
  const maxStrainVal = strainMax(char.data);
  const maxDpVal = dpMax(char.data);

  const maxXpBar = 5;
  const xpProgress = Math.max(0, totalXp - currentLevel * maxXpBar);
  const xpDisplay = Math.min(maxXpBar, xpProgress);
  const isMaxXp = xpProgress >= maxXpBar;
  const isHalfway = xpDisplay >= 3 && !isMaxXp;

  const maxAttrPts = getMaxAttributePoints(currentTier);
  const availableAttrPts = maxAttrPts - getSpentAttributePoints(char.data.attributes);
  const maxAspects = aspectSlotMax(char.data);
  const usedAspects = (char.data.aspects || []).length;

  const activeTierDef = getTierDefinition(currentTier);

  const applyProgressionUpdate = (
    nextLevel: number,
    nextTotalXp: number
  ) => {
    const safeNextLevel = Math.max(0, nextLevel);
    const nextTier = calculateTierFromLevel(safeNextLevel);

    const pruned =
      nextTier < currentTier
        ? pruneDisabledTierAdvancements(char.data, nextTier)
        : {};

    const baseProgression = pruned.progression || char.data.progression;

    patch({
      ...pruned,
      progression: {
        ...baseProgression,
        level: safeNextLevel,
        tier: nextTier,
        xp: Math.max(0, nextTotalXp),
      },
    });

    if (nextTier > currentTier) {
      onTierReached(currentTier, nextTier);
    }
  };

  const handleXpDelta = (delta: number) => {
    if (delta > 0) {
      const nextTotalXp = totalXp + 1;
      const nextLevel =
        xpProgress >= maxXpBar ? currentLevel + 1 : currentLevel;
      applyProgressionUpdate(nextLevel, nextTotalXp);
    } else if (delta < 0 && totalXp > 0) {
      const nextTotalXp = totalXp - 1;
      const nextLevel =
        nextTotalXp < currentLevel * maxXpBar
          ? Math.floor(nextTotalXp / maxXpBar)
          : currentLevel;
      applyProgressionUpdate(nextLevel, nextTotalXp);
    }
  };

  const handleLevelUpFromXp = () => {
    if (!isMaxXp) return;
    applyProgressionUpdate(currentLevel + 1, totalXp);
  };

  const handleLevelDownFromXp = () => {
    if (currentLevel <= 0 || xpProgress > 0) return;
    applyProgressionUpdate(currentLevel - 1, totalXp);
  };

  let trackingClass = 'tracking-[0.16em] sm:tracking-[0.25em]';
  if (isHalfway) trackingClass = 'tracking-[0.22em] sm:tracking-[0.35em]';
  if (isMaxXp) trackingClass = 'tracking-[0.28em] sm:tracking-[0.45em]';

  const titleColor = isMaxXp
    ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
    : isHalfway
    ? 'text-yellow-400'
    : 'text-white';
  const segmentColor = isMaxXp ? 'bg-cyan-400 xp-max-segment' : 'bg-yellow-500';

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 shadow-sm w-full flex flex-col gap-4 sm:gap-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-700 pb-3">
        <div>
          <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 text-gray-200">
            Progression & Advancements
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            Tier {currentTier} — <span className={currentTier > 0 ? 'text-purple-300 font-semibold' : 'text-slate-300 font-semibold'}>{activeTierDef.title}</span> · {activeTierDef.description}
          </p>
        </div>
      </div>

      {/* Top Row: Tier / Level / Experience + 5-Slot XP Progress Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch rev-prog-summary-top">
        <div className="lg:col-span-6 rev-prog-summary-half flex justify-between items-center gap-1 sm:gap-2 bg-black/25 p-2.5 sm:p-3.5 rounded-lg border border-gray-700/60">
          <div className="flex flex-col items-center flex-1 min-w-0 px-1 text-center">
            <span className="text-gray-500 font-bold uppercase tracking-wider sm:tracking-widest text-[10px] mb-1">
              Tier
            </span>
            <span className="text-gray-100 font-bold text-xl sm:text-2xl leading-none">{currentTier}</span>
            <span className="text-[10px] text-gray-400 italic mt-1 leading-tight break-words w-full">{activeTierDef.title}</span>
          </div>

          <div className="w-px h-10 bg-gray-700 shrink-0" />

          <div className="flex flex-col items-center flex-1 min-w-0 px-1 text-center">
            <span className="text-gray-500 font-bold uppercase tracking-wider sm:tracking-widest text-[10px] mb-1">
              Level
            </span>
            <span className="text-gray-100 font-bold text-xl sm:text-2xl leading-none">
              {currentLevel}
            </span>
            <span className="text-[10px] text-gray-500 mt-1 leading-tight">
              {currentLevel === 0 ? 'Starting Level' : activeTierDef.levelRange}
            </span>
          </div>

          <div className="w-px h-10 bg-gray-700 shrink-0" />

          <Tooltip
            text="Total Experience earned vs. Spendable XP remaining for advancing Core & Special Skills."
            className="flex-1 min-w-0 justify-center"
            noBorder
            noTruncate
          >
            <div className="flex flex-col items-center w-full text-center px-1">
              <span className="text-gray-500 font-bold uppercase tracking-wider sm:tracking-widest text-[10px] mb-1">
                Experience
              </span>
              <span className="font-bold text-xl sm:text-2xl leading-none text-gray-100 tabular-nums whitespace-nowrap">
                {totalXp}
                <span className="text-[11px] sm:text-xs text-gray-500 font-normal ml-1">Total</span>
              </span>
              <span className="text-[10px] text-gray-400 mt-1 tabular-nums leading-tight whitespace-nowrap">
                <strong className={spendableXp < 0 ? 'rev-keep-color text-red-400' : 'text-yellow-400'}>
                  {spendableXp}
                </strong>{' '}
                Spendable
              </span>
            </div>
          </Tooltip>
        </div>

        {/* 5-Slot Experience Progress Bar with Fixed-Position Controls */}
        <div
          className={`lg:col-span-6 rev-prog-summary-half relative overflow-hidden flex flex-col items-center justify-center px-3 sm:px-4 py-3 rounded-lg border gap-2 transition-all duration-500 ${
            isMaxXp
              ? 'bg-cyan-950/25 border-cyan-500/70 xp-max-container'
              : 'bg-black/25 border-gray-700/60'
          }`}
        >
          {isMaxXp && (
            <div className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent xp-max-shimmer" />
          )}

          <div className="flex items-center justify-center w-full min-h-[22px] relative z-10">
            <span
              className={`font-bold uppercase text-xs sm:text-sm transition-all duration-500 ease-out ${trackingClass} ${titleColor}`}
            >
              Experience
            </span>
          </div>

          <div className="flex w-full gap-1.5 relative z-10">
            {Array.from({ length: maxXpBar }).map((_, i) => {
              const isFilled = i < xpDisplay;
              return (
                <div
                  key={i}
                  style={isMaxXp ? { animationDelay: `${i * 110}ms` } : undefined}
                  className={`flex-1 h-3 rounded-sm transition-all duration-300 ${
                    isFilled ? segmentColor : 'bg-gray-700/50'
                  }`}
                />
              );
            })}
          </div>

          {/* 3-Column Fixed Grid so XP +/- Buttons Never Shift Horizontally */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 w-full mt-0.5 relative z-10 min-h-[32px]">
            <div className="flex justify-end">
              {xpProgress === 0 && currentLevel > 0 && (
                <button
                  type="button"
                  onClick={handleLevelDownFromXp}
                  className="h-8 px-1.5 sm:px-3 rounded-lg bg-gray-900/90 hover:bg-red-950/50 border border-gray-700 hover:border-red-800 text-gray-300 hover:text-red-200 font-cinzel font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-colors whitespace-nowrap"
                  title="Level down (disables higher tiers if leaving a tier)"
                >
                  <span className="sm:hidden">← Lvl-</span>
                  <span className="hidden sm:inline">← Level Down</span>
                </button>
              )}
            </div>

            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm w-24 sm:w-36 h-8 overflow-hidden justify-self-center">
              <button
                type="button"
                onClick={() => handleXpDelta(-1)}
                disabled={totalXp <= 0}
                className="w-7 sm:w-10 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent font-bold text-lg shrink-0 transition-colors duration-75"
                title="Remove 1 Experience Point"
              >
                −
              </button>

              <div className="flex-1 text-center font-bold text-white flex items-baseline justify-center gap-0.5 sm:gap-1 select-none">
                <span className={`text-sm sm:text-lg ${isMaxXp ? 'text-cyan-300' : ''}`}>{xpDisplay}</span>
                <span className="text-[10px] sm:text-xs text-gray-500 font-normal">/ {maxXpBar}</span>
              </div>

              <button
                type="button"
                onClick={() => handleXpDelta(1)}
                className="w-7 sm:w-10 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white font-bold text-lg shrink-0 transition-colors duration-75"
                title="Gain 1 Experience Point"
              >
                +
              </button>
            </div>

            <div className="flex justify-start">
              {isMaxXp && (
                <button
                  type="button"
                  onClick={handleLevelUpFromXp}
                  className="h-8 px-1.5 sm:px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400 text-cyan-200 font-cinzel font-bold text-[10px] sm:text-[11px] uppercase tracking-wider shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-colors animate-pulse whitespace-nowrap"
                >
                  <span className="sm:hidden">Lvl+ →</span>
                  <span className="hidden sm:inline">Level Up →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Combat & Progression Resource Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center rev-prog-stats">
        <Tooltip
          text={
            totalCombatPenalty > 0
              ? [
                  `Base Accuracy: ${baseAcc}`,
                  burdenPenalty > 0 ? `Overburden Penalty: -${burdenPenalty}` : '',
                  armourCombatPenalty > 0 && armourInfo
                    ? `Unmet Armour Carry (${armourInfo.characterCarry}/${armourInfo.requiredCarry}): -${armourCombatPenalty}`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n')
              : 'Base Accuracy + Accuracy bonuses (2 advancements per +1).'
          }
          noBorder
          noTruncate
        >
          <div className="w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 px-1.5 border border-gray-700/50">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1.5 leading-tight">
              Accuracy
            </span>
            <span
              className={`font-bold text-xl leading-none tabular-nums ${
                totalCombatPenalty > 0 || effectiveAcc < 0 ? 'rev-keep-color text-red-500' : 'text-white'
              }`}
            >
              {effectiveAcc}
            </span>
          </div>
        </Tooltip>

        <Tooltip text="Base 10 + bonuses + Evasion bonuses (2 advancements per +1)." noBorder noTruncate>
          <div className="w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 px-1.5 border border-gray-700/50">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1.5 leading-tight">
              Evasion
            </span>
            <span className={`font-bold text-xl leading-none tabular-nums ${effectiveEva < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
              {effectiveEva}
            </span>
          </div>
        </Tooltip>

        <Tooltip text="5 at Level 0, +1 per Tier reached, +1 per Vigor Limit advancement." noBorder noTruncate>
          <div className="w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 px-1.5 border border-gray-700/50">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1.5 leading-tight">
              Vigor Limit
            </span>
            <span className={`font-bold text-xl leading-none tabular-nums ${maxVigorVal < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
              {maxVigorVal}
            </span>
          </div>
        </Tooltip>

        <Tooltip text="5 at Level 0, +1 per Tier reached, +1 per Strain Limit advancement." noBorder noTruncate>
          <div className="w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 px-1.5 border border-gray-700/50">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1.5 leading-tight">
              Strain Limit
            </span>
            <span className={`font-bold text-xl leading-none tabular-nums ${maxStrainVal < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
              {maxStrainVal}
            </span>
          </div>
        </Tooltip>

        <Tooltip text="Starts at 2; Tiers 2–5 each grant +1 Destiny Maximum." noBorder noTruncate>
          <div className="w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 px-1.5 border border-gray-700/50">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1.5 leading-tight">
              Destiny Max
            </span>
            <span className={`font-bold text-xl leading-none tabular-nums ${maxDpVal < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
              {maxDpVal}
            </span>
          </div>
        </Tooltip>

        <Tooltip text="Each of Tiers 1–5 grants +1 Attribute Point (max 5 total). Spend them by clicking attributes on the Gameplay Profile." noBorder noTruncate>
          <div className="w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 px-1.5 border border-gray-700/50">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1.5 leading-tight">
              Attribute Points
            </span>
            <span
              className={`font-bold text-xl leading-none tabular-nums ${
                availableAttrPts < 0
                  ? 'rev-keep-color text-red-400'
                  : availableAttrPts > 0
                  ? 'text-emerald-400'
                  : 'text-white'
              }`}
            >
              {availableAttrPts}
              <span className="text-xs text-gray-500 font-normal">/{maxAttrPts}</span>
            </span>
          </div>
        </Tooltip>

        <div className="col-span-2 lg:col-span-1 rev-prog-stat-last">
          <Tooltip text="Aspect slots adopted / total unlocked via Tier 1–5 Advancements." noBorder noTruncate>
            <div className="w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 px-1.5 border border-gray-700/50">
              <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1.5 leading-tight">
                Aspect Slots
              </span>
              <span
                className={`font-bold text-xl leading-none tabular-nums ${
                  usedAspects > maxAspects
                    ? 'rev-keep-color text-red-400'
                    : usedAspects < maxAspects
                    ? 'text-purple-300'
                    : 'text-white'
                }`}
              >
                {usedAspects}
                <span className="text-xs text-gray-500 font-normal">/{maxAspects}</span>
              </span>
            </div>
          </Tooltip>
        </div>
      </div>
    </section>
  );
}