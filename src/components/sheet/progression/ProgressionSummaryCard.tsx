import type { Character, CharacterData } from '../../../types';
import { getMaxAttributePoints, getSpentAttributePoints } from '../utils';
import { TIER_DEFINITIONS, calculateLevelFromXp, calculateTierFromLevel } from './progressionData';
import { vigorMax, strainMax, dpMax, evasion, accuracyBonus, aspectSlotMax } from '../../../calc';

export default function ProgressionSummaryCard({
  char,
  patch,
  totalBudget,
  spentCount,
}: {
  char: Character;
  patch: (p: Partial<CharacterData>) => void;
  totalBudget: number;
  spentCount: number;
}) {
  const safeXp = Math.max(0, char.data.progression.xp ?? 0);
  const derivedLevel = calculateLevelFromXp(safeXp);
  const derivedTier = calculateTierFromLevel(derivedLevel);
  const xpInLevel = safeXp % 5;

  const availableAttrPts =
    getMaxAttributePoints(derivedTier) - getSpentAttributePoints(char.data.attributes);
  const unspentAdv = totalBudget - spentCount;

  const activeTierDef =
    TIER_DEFINITIONS.find(t => t.tier === Math.min(derivedTier, 6)) || TIER_DEFINITIONS[0];

  const handleXpDelta = (delta: number) => {
    const nextXp = Math.max(0, safeXp + delta);
    const nextLevel = calculateLevelFromXp(nextXp);
    const nextTier = calculateTierFromLevel(nextLevel);
    patch({
      progression: {
        ...char.data.progression,
        xp: nextXp,
        level: nextLevel,
        tier: nextTier,
      },
    });
  };

  // Destiny-Point-style 5-slot Experience Bar
  const maxXpBar = 5;
  const isHalfway = xpInLevel >= 3 && xpInLevel < maxXpBar;
  const isReadyToLevel = xpInLevel === maxXpBar - 1;

  let trackingClass = 'tracking-[0.25em]';
  if (isHalfway) trackingClass = 'tracking-[0.35em]';
  if (isReadyToLevel) trackingClass = 'tracking-[0.45em]';

  const titleColor = isReadyToLevel
    ? 'text-cyan-400'
    : isHalfway
    ? 'text-yellow-400'
    : 'text-white';
  const segmentColor = isReadyToLevel ? 'bg-cyan-500' : 'bg-yellow-500';

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-700 pb-3">
        <div>
          <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 text-gray-200">
            Progression & Advancements
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Tier {derivedTier} — <span className="text-red-400 font-semibold">{activeTierDef.title}</span> · {activeTierDef.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-black/40 border border-gray-700 text-gray-300">
            Attribute Points{' '}
            <strong className={availableAttrPts > 0 ? 'text-emerald-400' : 'text-gray-200'}>
              {availableAttrPts}/{getMaxAttributePoints(derivedTier)}
            </strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-black/40 border border-gray-700 text-gray-300">
            Aspect Slots <strong className="text-purple-400">{aspectSlotMax(char.data)}</strong>
          </span>
        </div>
      </div>

      {/* Top Row: Derived Tier / Level / Advancement Points + 5-Slot Destiny-Style XP Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-6 flex justify-between items-center bg-black/25 p-3.5 rounded-lg border border-gray-700/60">
          <div className="flex flex-col items-center flex-1">
            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">
              Tier
            </span>
            <span className="text-gray-100 font-bold text-2xl leading-none">{derivedTier}</span>
            <span className="text-[10px] text-gray-400 italic mt-1">{activeTierDef.title}</span>
          </div>

          <div className="w-px h-10 bg-gray-700" />

          <div className="flex flex-col items-center flex-1">
            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">
              Level
            </span>
            <span className="text-gray-100 font-bold text-2xl leading-none">{derivedLevel}</span>
            <span className="text-[10px] text-gray-500 mt-1">Total XP: {safeXp}</span>
          </div>

          <div className="w-px h-10 bg-gray-700" />

          <div className="flex flex-col items-center flex-1">
            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">
              Advancements
            </span>
            <span
              className={`font-bold text-2xl leading-none ${
                unspentAdv > 0 ? 'text-red-400' : 'text-gray-100'
              }`}
            >
              {spentCount}
              <span className="text-sm text-gray-500 font-normal">/{totalBudget}</span>
            </span>
            <span className="text-[10px] text-gray-400 mt-1">
              {unspentAdv > 0 ? `${unspentAdv} Available` : 'All Spent'}
            </span>
          </div>
        </div>

        {/* 5-Slot Experience Bar matching VitalsCard Destiny Point Bar */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-black/25 px-4 py-3 rounded-lg border border-gray-700/60 gap-2">
          <span
            className={`font-bold uppercase text-sm transition-all duration-500 ease-out ${trackingClass} ${titleColor}`}
          >
            Experience
          </span>

          <div className="flex w-full gap-1.5">
            {Array.from({ length: maxXpBar }).map((_, i) => {
              const isFilled = i < xpInLevel;
              return (
                <div
                  key={i}
                  className={`flex-1 h-3 rounded-sm transition-all duration-300 ${
                    isFilled ? segmentColor : 'bg-gray-700/50'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm w-36 h-8 mt-0.5 overflow-hidden">
            <button
              type="button"
              onClick={() => handleXpDelta(-1)}
              disabled={safeXp <= 0}
              className="w-10 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent font-bold text-lg shrink-0 transition-colors duration-75"
              title="Remove 1 Experience Point"
            >
              −
            </button>

            <div className="flex-1 text-center font-bold text-white flex items-baseline justify-center gap-1 select-none">
              <span className="text-lg">{xpInLevel}</span>
              <span className="text-xs text-gray-500 font-normal">/ {maxXpBar}</span>
            </div>

            <button
              type="button"
              onClick={() => handleXpDelta(1)}
              className="w-10 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white font-bold text-lg shrink-0 transition-colors duration-75"
              title="Add 1 Experience Point"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* StatsCard-Style Combat & Resource Strip above Advancements */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1.5">
            Accuracy
          </span>
          <span className="font-bold text-xl text-white leading-none">
            {(char.data.trackers.acc || 0) + accuracyBonus(char.data)}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1.5">
            Evasion
          </span>
          <span className="font-bold text-xl text-white leading-none">
            {evasion(char.data)}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1.5">
            Vigor Maximum
          </span>
          <span className="font-bold text-xl text-white leading-none">
            {vigorMax(char.data)}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1.5">
            Strain Limit
          </span>
          <span className="font-bold text-xl text-white leading-none">
            {strainMax(char.data)}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center bg-black/20 rounded-lg py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1.5">
            Destiny Maximum
          </span>
          <span className="font-bold text-xl text-white leading-none">
            {dpMax(char.data)}
          </span>
        </div>
      </div>
    </section>
  );
}