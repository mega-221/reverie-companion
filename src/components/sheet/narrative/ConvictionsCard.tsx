import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character, CompendiumEntry } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { dpMax } from '../../../calc';
import { useConfirm } from '../ConfirmDialog';
import { hasConvictionRank5Unlocked } from '../progression/progressionData';

const SELECT_SEASON_ORDER = ['Halice', 'Vamor', 'Bruma', 'Trumst'] as const;

const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const FlipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

const RankPips = ({ rank, type, color, maxRank = 4 }: { rank: number, type: 'conviction' | 'failing', color?: string, maxRank?: number }) => {
  const activeColor = type === 'conviction' ? (color || '#9ca3af') : '#d93838';
  const connectorWidth = maxRank > 4 ? 'w-2.5 mx-1' : 'w-3 mx-1.5';
  return (
    <div className="flex items-center justify-center relative z-20">
      {Array.from({ length: maxRank }).map((_, i) => {
        const isFilled = i < rank;
        return (
          <div key={i} className="flex items-center">
            <div
              className={`w-2.5 h-2.5 rotate-45 border transition-all duration-300 ${
                isFilled ? 'border-transparent' : 'bg-transparent border-gray-600'
              }`}
              style={isFilled ? { backgroundColor: activeColor, boxShadow: `0 0 6px ${activeColor}` } : {}}
            />
            {i < maxRank - 1 && (
              <div
                className={`h-px ${connectorWidth} transition-colors duration-300`}
                style={{ backgroundColor: i < rank - 1 ? activeColor : '#4b5563' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const getSeasonHex = (season?: string) => {
  switch(season) {
    case 'Vamor': return '#d93838';
    case 'Bruma': return '#e28927';
    case 'Trumst': return '#2864d1';
    case 'Halice': return '#21c15b';
    default: return '#9ca3af';
  }
};

const getSeasonGradient = (season?: string) => {
  switch(season) {
    case 'Vamor': return 'from-red-900 via-red-950 to-black';
    case 'Bruma': return 'from-orange-900 via-orange-950 to-black';
    case 'Trumst': return 'from-blue-900 via-blue-950 to-black';
    case 'Halice': return 'from-emerald-900 via-emerald-950 to-black';
    default: return 'from-gray-800 to-black';
  }
};

function DedicateModal({ char, patch, index, onClose }: { char: Character, patch: any, index: number, onClose: () => void }) {
  const conviction = char.data.convictions[index];
  if (!conviction) return null;

  const currentRank = conviction.rank;
  const isRank5Unlocked = hasConvictionRank5Unlocked(conviction.name, char.data) || currentRank >= 5;
  const maxRank = isRank5Unlocked ? 5 : 4;
  const cost = dpMax(char.data);
  const availableDp = char.data.trackers.dp;
  const seasonColor = getSeasonHex(conviction.season);

  const isMaxed = currentRank >= maxRank;
  const isMinned = currentRank <= 0;
  const canAfford = availableDp >= cost;
  const canAdvance = !isMaxed && canAfford;
  const canRegress = !isMinned;

  const advance = () => {
    if (!canAdvance) return;
    const next = [...char.data.convictions];
    next[index] = { ...next[index], rank: currentRank + 1 };
    patch({
      convictions: next,
      trackers: { ...char.data.trackers, dp: availableDp - cost }
    });
  };

  const regress = () => {
    if (!canRegress) return;
    const next = [...char.data.convictions];
    next[index] = { ...next[index], rank: currentRank - 1 };
    const newDp = Math.min(availableDp + cost, dpMax(char.data));
    patch({
      convictions: next,
      trackers: { ...char.data.trackers, dp: newDp }
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="sheet-modal animate-in zoom-in-95 duration-200 max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-cinzel font-bold text-xl text-gray-200 truncate pr-2">Dedicate to {conviction.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2 shrink-0">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="bg-black/20 rounded-lg p-3 border border-gray-700 flex flex-col items-center justify-center shadow-inner">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Current Rank</div>
            <div className="text-3xl font-bold text-white mb-2">{currentRank} <span className="text-lg text-gray-500 font-normal">/ {maxRank}</span></div>

            <div className="mt-1 mb-2">
              <RankPips rank={currentRank} type="conviction" color={seasonColor} maxRank={maxRank} />
            </div>

            {isMaxed ? (
              <div className="text-xs text-red-400 font-bold bg-red-900/30 px-2 py-1 rounded mt-2">Maximum Rank Reached</div>
            ) : (
              <div className="text-xs text-cyan-400 font-bold bg-cyan-900/30 px-2 py-1 rounded mt-2">
                Next Rank Cost: {cost} DP
              </div>
            )}
          </div>

          <div className="flex gap-2 w-full mt-2">
            <button
              onClick={regress}
              disabled={!canRegress}
              className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-colors flex items-center justify-center gap-2 ${!canRegress ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-red-950/40 text-red-300 border-red-900 hover:bg-red-900/60'}`}
            >
              <span>←</span> Regress
            </button>
            <button
              onClick={advance}
              disabled={!canAdvance}
              className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-colors flex items-center justify-center gap-2 ${!canAdvance ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-green-950/40 text-green-300 border-green-900 hover:bg-green-900/60'}`}
            >
              Dedicate <span>→</span>
            </button>
          </div>

          <div className="flex justify-between items-center text-sm font-bold text-gray-400 mt-2 bg-black/20 p-2 rounded">
            <span>Available DP:</span>
            <span className={availableDp < 0 ? "text-red-400" : canAfford && !isMaxed ? "text-cyan-400" : "text-gray-400"}>
              {availableDp} / {dpMax(char.data)}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ReflectModal({ char, patch, index, onClose }: { char: Character, patch: any, index: number, onClose: () => void }) {
  const failingIndex = char.data.failings.findIndex(f => f.convictionIndex === index);
  const failing = failingIndex >= 0 ? char.data.failings[failingIndex] : null;
  if (!failing) return null;

  const currentRank = failing.rank;
  const maxRank = 4;
  const cost = dpMax(char.data);
  const availableDp = char.data.trackers.dp;

  const isMaxed = currentRank >= maxRank;
  const isMinned = currentRank <= 0;
  const canAfford = availableDp >= cost;
  const canLower = !isMinned && canAfford;
  const canDeepen = !isMaxed;

  const lowerRank = () => {
    if (!canLower) return;
    const next = [...char.data.failings];
    next[failingIndex] = { ...next[failingIndex], rank: currentRank - 1 };
    patch({
      failings: next,
      trackers: { ...char.data.trackers, dp: availableDp - cost }
    });
  };

  const deepenRank = () => {
    if (!canDeepen) return;
    const next = [...char.data.failings];
    next[failingIndex] = { ...next[failingIndex], rank: currentRank + 1 };
    patch({ failings: next });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="sheet-modal animate-in zoom-in-95 duration-200 max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-cinzel font-bold text-xl text-gray-200 truncate pr-2">Reflect on {failing.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2 shrink-0">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="bg-black/20 rounded-lg p-3 border border-gray-700 flex flex-col items-center justify-center shadow-inner">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Current Rank</div>
            <div className="text-3xl font-bold text-white mb-2">{currentRank} <span className="text-lg text-gray-500 font-normal">/ {maxRank}</span></div>

            <div className="mt-1 mb-2">
              <RankPips rank={currentRank} type="failing" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              {isMinned ? (
                <div className="text-xs text-gray-400 font-bold bg-gray-800 px-2 py-1 rounded">Minimum Rank Reached</div>
              ) : (
                <div className="text-xs text-cyan-400 font-bold bg-cyan-900/30 px-2 py-1 rounded">
                  Lower Rank Cost: {cost} DP
                </div>
              )}
              {!isMaxed && (
                <div className="text-xs text-red-400 font-bold bg-red-950/40 border border-red-900/40 px-2 py-1 rounded">
                  Deepen: Free (0 DP)
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 w-full mt-2">
            <button
              onClick={lowerRank}
              disabled={!canLower}
              className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-colors flex items-center justify-center gap-2 ${!canLower ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-cyan-950/40 text-cyan-300 border-cyan-900 hover:bg-cyan-900/60'}`}
            >
              <span>←</span> Reflect
            </button>
            <button
              onClick={deepenRank}
              disabled={!canDeepen}
              className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-colors flex items-center justify-center gap-2 ${!canDeepen ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-red-950/40 text-red-300 border-red-900 hover:bg-red-900/60'}`}
            >
              Deepen <span>→</span>
            </button>
          </div>

          <div className="flex justify-between items-center text-sm font-bold text-gray-400 mt-2 bg-black/20 p-2 rounded">
            <span>Available DP:</span>
            <span className={availableDp < 0 ? "text-red-400" : canAfford && !isMinned ? "text-cyan-400" : "text-gray-400"}>
              {availableDp} / {dpMax(char.data)}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CrisisModal({ char, patch, onClose }: { char: Character, patch: any, onClose: () => void }) {
  const { getFailings, getEntryByName } = useCompendium();
  const compendiumFailings = getFailings();

  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [selectedManifestName, setSelectedManifestName] = useState<string>(() => compendiumFailings[0]?.name ?? '');
  const charAspects = (char.data.aspects || []).filter(a => a.name && !a.abandoned);
  const [selectedAspectToAbandon, setSelectedAspectToAbandon] = useState<string>(() => charAspects[0]?.name ?? '');
  const [abandonedAspectNote, setAbandonedAspectNote] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const maxDp = dpMax(char.data);
  const availableDp = char.data.trackers.dp;
  const canSpendMaxDp = availableDp >= maxDp;

  const hasSlots = char.data.convictions.length > 0;
  const safeSlot = hasSlots ? Math.min(selectedSlot, char.data.convictions.length - 1) : -1;
  const selectedConv = safeSlot >= 0 ? char.data.convictions[safeSlot] : undefined;
  const selectedSeasonColor = getSeasonHex(selectedConv?.season);
  const canLowerConviction = Boolean(selectedConv?.name) && (selectedConv?.rank ?? 0) > 0;

  const existingFailingIdx = safeSlot >= 0 ? char.data.failings.findIndex(f => f.convictionIndex === safeSlot) : -1;
  const existingFailing = existingFailingIdx >= 0 ? char.data.failings[existingFailingIdx] : undefined;
  const hasExistingNamedFailing = Boolean(existingFailing?.name);
  const canIncreaseExistingFailing = hasExistingNamedFailing && (existingFailing?.rank ?? 0) < 4;
  const canManifestNewFailing = hasSlots && !hasExistingNamedFailing && Boolean(selectedManifestName);
  const canIncreaseFailingAction = hasExistingNamedFailing ? canIncreaseExistingFailing : canManifestNewFailing;

  const handleLowerConviction = () => {
    if (!canLowerConviction || safeSlot < 0) return;
    const next = [...char.data.convictions];
    next[safeSlot] = { ...next[safeSlot], rank: next[safeSlot].rank - 1 };
    patch({ convictions: next });
    onClose();
  };

  const handleIncreaseFailing = () => {
    if (safeSlot < 0) return;
    if (hasExistingNamedFailing) {
      if (!canIncreaseExistingFailing) return;
      const next = [...char.data.failings];
      next[existingFailingIdx] = { ...next[existingFailingIdx], rank: next[existingFailingIdx].rank + 1 };
      patch({ failings: next });
      onClose();
      return;
    }

    if (!selectedManifestName) return;
    const compendiumItem = getEntryByName(selectedManifestName);
    const statement = compendiumItem?.data?.statement || '';
    if (existingFailingIdx >= 0) {
      const next = [...char.data.failings];
      next[existingFailingIdx] = { ...next[existingFailingIdx], name: selectedManifestName, rank: 1, statement };
      patch({ failings: next });
    } else {
      patch({
        failings: [...char.data.failings, { name: selectedManifestName, rank: 1, convictionIndex: safeSlot, statement }]
      });
    }
    onClose();
  };

  const handleSpendMaxDp = () => {
    if (!canSpendMaxDp) return;
    patch({
      trackers: { ...char.data.trackers, dp: Math.max(0, availableDp - maxDp) }
    });
    onClose();
  };

  const handleAbandonAspect = () => {
    if (charAspects.length > 0 && selectedAspectToAbandon) {
      patch({
        aspects: (char.data.aspects || []).map(a =>
          a.name === selectedAspectToAbandon ? { ...a, abandoned: true } : a
        )
      });
    }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="sheet-modal animate-in zoom-in-95 duration-200 max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rotate-45 bg-red-500 shadow-[0_0_8px_#ef4444] shrink-0" />
            <h2 className="font-cinzel font-bold text-xl text-gray-100 truncate">Resolve Crisis</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2 shrink-0" aria-label="Close">×</button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-3.5 text-sm text-gray-300 space-y-1.5">
            <div className="text-xs font-cinzel font-bold uppercase tracking-widest text-red-400">Crisis</div>
            <p className="font-serif italic leading-relaxed text-gray-300">
              The mental breaking point that occurs as a consequence of intense psychological stress.
            </p>
          </div>

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Choose a way to cope with the crisis...
          </div>

          {/* Card Slot Selector */}
          {hasSlots ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {char.data.convictions.map((conv, idx) => {
                const fail = char.data.failings.find(f => f.convictionIndex === idx);
                const isSelected = idx === safeSlot;
                const sColor = getSeasonHex(conv?.season);
                const convName = conv?.name || 'No Conviction';
                const failName = fail?.name || 'No Failing';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSlot(idx)}
                    className={`text-left rounded-lg p-3 border transition-all flex flex-col gap-2.5 ${
                      isSelected
                        ? 'bg-red-950/25 border-red-500/80 shadow-[0_0_15px_rgba(220,38,38,0.15)]'
                        : 'bg-black/25 border-gray-700 hover:border-gray-500 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Card {idx + 1}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">
                          Selected
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className={`text-xs font-bold truncate ${conv?.name ? 'text-gray-100' : 'text-gray-500 italic'}`}>
                        {convName}
                      </div>
                      <div className="flex justify-start">
                        <RankPips rank={conv?.name ? conv.rank : 0} type="conviction" color={sColor} />
                      </div>
                    </div>

                    <div className="border-t border-gray-800 pt-2 space-y-1">
                      <div className={`text-xs font-bold truncate ${fail?.name ? 'text-red-300' : 'text-gray-500 italic'}`}>
                        {failName}
                      </div>
                      <div className="flex justify-start">
                        <RankPips rank={fail?.name ? fail.rank : 0} type="failing" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-black/20 border border-gray-800 rounded-lg p-3 text-xs text-gray-500 italic">
              No conviction cards available yet. Add a card slot first to lower a conviction or increase a failing.
            </div>
          )}

          {/* 4 Coping Options */}
          <div className="space-y-2.5">
            {/* Option 1: Lower Conviction */}
            <div className="bg-black/25 border border-gray-700 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  1. Violated Conviction
                </div>
                {selectedConv?.name ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-cinzel font-bold text-gray-100 truncate">
                      {selectedConv.name}
                    </span>
                    <RankPips rank={selectedConv.rank} type="conviction" color={selectedSeasonColor} />
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">No conviction on this card</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleLowerConviction}
                disabled={!canLowerConviction}
                className="px-3.5 py-2 rounded text-xs font-bold bg-red-950/60 hover:bg-red-900/70 disabled:opacity-40 text-red-200 border border-red-800/70 transition-colors whitespace-nowrap shrink-0"
              >
                Lower Conviction
              </button>
            </div>

            {/* Option 2: Increase Failing */}
            <div className="bg-black/25 border border-gray-700 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  2. Failing
                </div>
                {hasExistingNamedFailing && existingFailing ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-cinzel font-bold text-red-300 truncate">
                      {existingFailing.name}
                    </span>
                    <RankPips rank={existingFailing.rank} type="failing" />
                  </div>
                ) : hasSlots ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={selectedManifestName}
                      onChange={e => setSelectedManifestName(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-red-500 max-w-xs"
                      aria-label="Select failing to manifest"
                    >
                      {compendiumFailings.length === 0 ? (
                        <option value="">No failings in compendium</option>
                      ) : (
                        compendiumFailings.map(f => (
                          <option key={f.id} value={f.name}>{f.name}</option>
                        ))
                      )}
                    </select>
                    <RankPips rank={0} type="failing" />
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">No card slot selected</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleIncreaseFailing}
                disabled={!canIncreaseFailingAction}
                className="px-3.5 py-2 rounded text-xs font-bold bg-red-950/60 hover:bg-red-900/70 disabled:opacity-40 text-red-200 border border-red-800/70 transition-colors whitespace-nowrap shrink-0"
              >
                Increase Failing
              </button>
            </div>

            {/* Option 3: Spend Destiny Point Maximum */}
            <div className="bg-black/25 border border-gray-700 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-gray-200">3. Spend your destiny point maximum</div>
                <div className="text-xs text-gray-400 mt-0.5 tabular-nums">
                  Requires <span className="text-cyan-400 font-bold">{maxDp} DP</span> · Available: <span className={canSpendMaxDp ? 'text-cyan-400 font-bold' : 'text-red-400 font-bold'}>{availableDp} / {maxDp}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSpendMaxDp}
                disabled={!canSpendMaxDp}
                className="px-3.5 py-2 rounded text-xs font-bold bg-cyan-950/50 hover:bg-cyan-900/60 disabled:opacity-40 text-cyan-200 border border-cyan-800/70 transition-colors whitespace-nowrap shrink-0"
              >
                Spend {maxDp} DP
              </button>
            </div>

            {/* Option 4: Abandon an Aspect */}
            <div className="bg-black/25 border border-gray-700 rounded-lg px-4 py-3 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-gray-200">4. Abandon an aspect</div>
                  <p className="text-[11px] text-gray-500 italic mt-0.5">
                    {charAspects.length > 0
                      ? 'Select an active aspect to mark as Abandoned.'
                      : 'No active aspects on sheet; confirm here if resolving manually.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAbandonAspect}
                  className="px-3.5 py-2 rounded text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 transition-colors whitespace-nowrap shrink-0"
                >
                  Abandon Aspect
                </button>
              </div>
              {charAspects.length > 0 ? (
                <select
                  value={selectedAspectToAbandon}
                  onChange={e => setSelectedAspectToAbandon(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-red-500"
                  aria-label="Select aspect to abandon"
                >
                  {charAspects.map((a, idx) => (
                    <option key={a.id || idx} value={a.name}>{a.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={abandonedAspectNote}
                  onChange={e => setAbandonedAspectNote(e.target.value)}
                  placeholder="Optional aspect name (for your own reference)..."
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-red-500"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center px-5 py-3.5 border-t border-gray-700 bg-black/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-bold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-colors"
          >
            This was a mistake
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SeasonCompendiumPickerModal({
  title,
  entries,
  currentName,
  onSelect,
  onClose,
}: {
  title: string;
  entries: CompendiumEntry[];
  currentName?: string;
  onSelect: (entry: CompendiumEntry) => void;
  onClose: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const normalizedSeason = (s?: string) => (s || '').trim().toLowerCase();

  const groupedSeasons = SELECT_SEASON_ORDER.map(season => ({
    season,
    items: entries
      .filter(e => normalizedSeason(e.data?.season) === season.toLowerCase())
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter(group => group.items.length > 0);

  const uncategorized = entries
    .filter(e => !SELECT_SEASON_ORDER.some(s => s.toLowerCase() === normalizedSeason(e.data?.season)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return createPortal(
    <div
      className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="sheet-modal animate-in zoom-in-95 duration-200 max-w-2xl max-h-[85vh] w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-cinzel font-bold text-xl text-gray-200">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2" aria-label="Close">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {groupedSeasons.map(({ season, items }) => {
            const seasonColor = getSeasonHex(season);
            return (
              <div key={season}>
                <div
                  className="bg-black/20 text-xs font-bold uppercase tracking-widest py-2 border-b border-gray-700 mb-2 px-2 rounded-t"
                  style={{ color: seasonColor }}
                >
                  {season}
                </div>
                <div className="space-y-2">
                  {items.map(entry => {
                    const isExpanded = expandedId === entry.id;
                    const isCurrent = currentName === entry.name;
                    const bodyText = entry.data?.statement || entry.data?.description || '';

                    return (
                      <div
                        key={entry.id}
                        className={`bg-black/20 border rounded-lg overflow-hidden transition-all duration-200 ${
                          isExpanded
                            ? 'ring-1 ring-red-900 shadow-md border-gray-600'
                            : isCurrent
                            ? 'border-red-700/70'
                            : 'border-gray-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          className="w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center gap-3 group"
                        >
                          <span className="font-bold text-gray-200 group-hover:text-white truncate">{entry.name}</span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0"
                            style={{ color: seasonColor, borderColor: `${seasonColor}80` }}
                          >
                            {season}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="p-4 border-t border-gray-700 bg-black/40">
                            {bodyText && (
                              <div
                                className="text-sm italic text-gray-200 mb-4 border-l-2 pl-2"
                                style={{ borderColor: seasonColor }}
                              >
                                {bodyText.split(/\r?\n|\\n/).map((line: string, idx: number) => (
                                  <span key={idx} className="block mb-1 last:mb-0">{line}</span>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onSelect(entry);
                                onClose();
                              }}
                              className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors"
                            >
                              Confirm Selection
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {uncategorized.length > 0 && (
            <div>
              <div className="bg-black/20 text-xs font-bold uppercase tracking-widest py-2 border-b border-gray-700 mb-2 px-2 rounded-t text-gray-400">
                General
              </div>
              <div className="space-y-2">
                {uncategorized.map(entry => {
                  const isExpanded = expandedId === entry.id;
                  const isCurrent = currentName === entry.name;
                  const bodyText = entry.data?.statement || entry.data?.description || '';

                  return (
                    <div
                      key={entry.id}
                      className={`bg-black/20 border rounded-lg overflow-hidden transition-all duration-200 ${
                        isExpanded
                          ? 'ring-1 ring-red-900 shadow-md border-gray-600'
                          : isCurrent
                          ? 'border-red-700/70'
                          : 'border-gray-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center gap-3 group"
                      >
                        <span className="font-bold text-gray-200 group-hover:text-white truncate">{entry.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-600 text-gray-400 shrink-0">
                          {entry.type === 'failing' ? 'Failing' : 'Conviction'}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="p-4 border-t border-gray-700 bg-black/40">
                          {bodyText && (
                            <div className="text-sm italic text-gray-200 mb-4 border-l-2 border-gray-600 pl-2">
                              {bodyText.split(/\r?\n|\\n/).map((line: string, idx: number) => (
                                <span key={idx} className="block mb-1 last:mb-0">{line}</span>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(entry);
                              onClose();
                            }}
                            className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors"
                          >
                            Confirm Selection
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ConvictionsCard({ char, patch }: { char: Character, patch: any }) {
  const { getConvictions, getFailings, getEntryByName } = useCompendium();
  const { askConfirm, confirmDialog } = useConfirm();

  const [cardRotations, setCardRotations] = useState<Record<number, number>>({});
  const [editingCard, setEditingCard] = useState<number | null>(null);
  const [dedicatingCard, setDedicatingCard] = useState<number | null>(null);
  const [reflectingCard, setReflectingCard] = useState<number | null>(null);
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ type: 'conviction' | 'failing'; index: number } | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<'next' | 'prev' | null>(null);

  const convCount = char.data.convictions.length;
  const safeMobileIndex = convCount > 0 ? Math.min(mobileIndex, convCount - 1) : 0;

  const stepMobileCard = (delta: -1 | 1) => {
    if (convCount <= 1) return;
    const current = Math.min(mobileIndex, convCount - 1);
    const nextIndex = (current + delta + convCount) % convCount;
    setLeavingIndex(current);
    setSlideDir(delta > 0 ? 'next' : 'prev');
    setMobileIndex(nextIndex);
  };

  const toggleFlip = (index: number) => {
    setCardRotations(prev => ({ ...prev, [index]: (prev[index] || 0) + 180 }));
  };

  const canAddConviction = char.data.convictions.length < 3;

  const addConviction = () => {
    if (!canAddConviction) return;
    patch({ convictions: [...char.data.convictions, { season: 'Vamor', name: '', statement: '', rank: 1 }] });
  };

  const deleteCard = async (index: number, hasConv: boolean, hasFail: boolean) => {
    const summary = hasConv && hasFail ? 'the conviction and its failing' : hasConv ? 'the conviction' : 'the failing';
    const ok = await askConfirm({
      title: 'Erase Card',
      message: `Erase ${summary}? This cannot be undone and no DP or other resources are refunded.`,
      confirmLabel: 'Erase',
      tone: 'danger',
    });
    if (!ok) return;

    const newConvs = char.data.convictions.filter((_, idx) => idx !== index);
    const newFails = char.data.failings
      .filter(f => f.convictionIndex !== index)
      .map(f => f.convictionIndex > index ? { ...f, convictionIndex: f.convictionIndex - 1 } : f);

    patch({ convictions: newConvs, failings: newFails });
    setEditingCard(null);
  };

  return (
    <section className="sheet-panel p-3.5 sm:p-5 w-full">
      {confirmDialog}
      <div className="flex flex-wrap justify-between items-end mb-4 sm:mb-6 border-b border-gray-700 pb-2 gap-3">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Convictions & Failings</h2>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCrisisOpen(true)}
            className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border transition-colors text-red-400 border-red-900/70 bg-red-950/30 hover:bg-red-900/50 hover:text-red-300 whitespace-nowrap shrink-0"
            title="Resolve a mental breaking point or crisis"
          >
            Resolve Crisis
          </button>
          <button
            type="button"
            onClick={addConviction}
            disabled={!canAddConviction}
            className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border transition-colors whitespace-nowrap shrink-0 ${canAddConviction ? 'text-cyan-400 border-cyan-800 hover:bg-cyan-950/40 hover:text-cyan-300' : 'text-gray-600 border-gray-700 cursor-not-allowed'}`}
            title={canAddConviction ? 'Add new conviction slot' : 'All slots filled'}
          >
            + Add
          </button>
        </div>
      </div>

      {char.data.convictions.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 text-center">
          <p className="text-gray-500 italic text-sm">No convictions or failings manifested.</p>
        </div>
      ) : (
      <div className="relative flex flex-wrap justify-center sm:justify-evenly gap-6 w-full py-11 sm:py-10 overflow-visible">
        {char.data.convictions.map((conviction, i) => {
          const failing = char.data.failings.find(f => f.convictionIndex === i);

          const rotation = cardRotations[i] || 0;
          const isFlipped = (rotation / 180) % 2 !== 0;
          const isEditing = editingCard === i;
          const isMobileActive = i === safeMobileIndex;
          const isMobileLeaving = slideDir !== null && i === leavingIndex && i !== safeMobileIndex;

          const hasConv = !!conviction?.name;
          const hasFail = !!(failing && failing.name);
          const convRank = conviction?.rank || 0;
          const failRank = failing?.rank || 0;
          const seasonColor = getSeasonHex(conviction?.season);

          const compendiumConviction = getEntryByName(conviction?.name || '');
          const compendiumFailing = getEntryByName(failing?.name || '');

          let emptySubtitle = "";
          if (!hasConv && !hasFail) emptySubtitle = "The mind is dormant";
          else if (!hasConv) emptySubtitle = "The mind is restless";
          else if (!hasFail) emptySubtitle = "The mind is stable";

          return (
            <div
              key={i}
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget && isMobileActive) {
                  setSlideDir(null);
                  setLeavingIndex(null);
                }
              }}
              className={`[perspective:1000px] w-[300px] sm:w-[320px] shrink-0 aspect-[2.5/3.5] ${
                isMobileActive
                  ? `block relative ${
                      slideDir === 'next'
                        ? 'animate-deck-in-next sm:animate-none'
                        : slideDir === 'prev'
                        ? 'animate-deck-in-prev sm:animate-none'
                        : ''
                    }`
                  : isMobileLeaving
                  ? `block absolute top-11 inset-x-0 mx-auto pointer-events-none sm:static sm:pointer-events-auto ${
                      slideDir === 'next'
                        ? 'animate-deck-out-next sm:animate-none'
                        : 'animate-deck-out-prev sm:animate-none'
                    }`
                  : 'hidden sm:block relative'
              }`}
            >
              <div
                onClick={() => {
                  if (!isEditing && window.matchMedia('(max-width: 639px)').matches) {
                    toggleFlip(i);
                  }
                }}
                className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] cursor-pointer sm:cursor-default"
                style={{ transform: `rotateY(${rotation}deg)` }}
              >

                {/* FRONT: Conviction */}
                <div
                  className={`absolute inset-0 [backface-visibility:hidden] border-[3px] border-double rounded-xl flex flex-col shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] overflow-hidden ${isFlipped ? 'pointer-events-none z-0' : 'pointer-events-auto z-10'} ${
                    hasConv ? `bg-gradient-to-b ${getSeasonGradient(conviction?.season)}` : 'border-cyan-900/40 bg-[#020810] shadow-[inset_0_0_30px_rgba(8,145,178,0.15)]'
                  }`}
                  style={hasConv ? { borderColor: `${seasonColor}aa` } : {}}
                >
                  {hasConv && (
                    <div
                      className="absolute inset-0 z-0 pointer-events-none opacity-[0.06]"
                      style={{ backgroundImage: NOISE_BG }}
                    />
                  )}

                  <div
                    className="absolute inset-[6px] border rounded-lg pointer-events-none opacity-30 z-10"
                    style={{ borderColor: hasConv ? seasonColor : '#164e63' }}
                  />

                  {hasConv && (
                    <div
                      className="absolute inset-0 z-10 pointer-events-none opacity-40"
                      style={{ background: `radial-gradient(circle at top center, ${seasonColor}80 0%, transparent 60%)` }}
                    />
                  )}

                  {hasConv && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-10">
                      <div className={`absolute inset-0 transition-opacity duration-1000 ${convRank >= 1 && convRank <= 2 ? 'opacity-100' : 'opacity-0'}`}>
                        {convRank >= 1 && convRank <= 2 && (
                          <div className="absolute inset-0"
                               style={{
                                 background: `radial-gradient(circle at center, ${seasonColor}40 0%, transparent 50%)`,
                                 animation: 'drift 12s ease-in-out infinite'
                               }} />
                        )}
                      </div>

                      <div className={`absolute inset-0 transition-opacity duration-1000 ${convRank >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                        {convRank >= 3 && (
                          <div
                               className="absolute top-1/3 left-1/2 w-[320px] h-[320px] -ml-[160px] -mt-[160px] rounded-full pointer-events-none"
                               style={{
                                 background: `radial-gradient(circle, ${seasonColor}cc 0%, ${seasonColor}44 30%, transparent 70%)`,
                                 animation: 'breathe-centre 12s ease-in-out infinite'
                               }} />
                        )}
                      </div>

                      <div className={`absolute inset-0 transition-opacity duration-1000 ${convRank >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="absolute bottom-0 w-full h-full">
                          <div className="absolute bottom-0 left-1/4 w-1 h-1 rounded-full" style={{ backgroundColor: seasonColor, boxShadow: `0 0 5px ${seasonColor}`, animation: 'floatUp 4s linear infinite' }} />
                          <div className="absolute bottom-8 right-1/4 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seasonColor, boxShadow: `0 0 8px ${seasonColor}`, animation: 'floatUp 5s linear infinite 1s' }} />
                          <div className="absolute bottom-4 left-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: seasonColor, boxShadow: `0 0 6px ${seasonColor}`, animation: 'floatUp 3.5s linear infinite 2s' }} />
                        </div>
                      </div>

                      <div className={`absolute inset-0 transition-opacity duration-1000 ${convRank >= 4 ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="absolute bottom-0 w-full h-full">
                          <div className="absolute bottom-4 left-1/3 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_#22d3ee]" style={{ animation: 'floatCyan 1.5s linear infinite 0.5s' }} />
                          <div className="absolute bottom-2 right-1/3 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#67e8f9]" style={{ animation: 'floatCyan 2s linear infinite 1s' }} />
                          <div className="absolute bottom-12 right-1/4 w-1 h-1 bg-cyan-500 rounded-full shadow-[0_0_5px_#06b6d4]" style={{ animation: 'floatCyan 1.2s linear infinite 0.8s' }} />
                          <div className="absolute bottom-0 left-1/5 w-1 h-1 bg-cyan-200 rounded-full shadow-[0_0_6px_#a5f3fc]" style={{ animation: 'floatCyan 2.5s linear infinite 1.5s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  {!hasConv && <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite] pointer-events-none z-10" />}

                  <div className="w-full h-full p-5 flex flex-col relative z-20">
                    <div className="grid grid-cols-3 items-center mb-4 mt-2 px-2 z-20">
                      <button onClick={(e) => { e.stopPropagation(); setEditingCard(i); }} className={`justify-self-start ${hasConv ? 'text-gray-400 hover:text-white' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Edit">✎</button>
                      <span className={`justify-self-center text-[10px] font-bold uppercase tracking-widest ${hasConv ? 'text-gray-300 opacity-90' : 'text-cyan-600'}`}>Conviction</span>
                      <button onClick={(e) => { e.stopPropagation(); toggleFlip(i); }} className={`justify-self-end ${hasConv ? 'text-gray-400 hover:text-white' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Flip to Failing"><FlipIcon /></button>
                    </div>

                    <div className="flex-1 flex flex-col items-center relative px-4 sm:px-6 pb-6 w-full pt-4 z-20">
                      {hasConv ? (
                        <div className="flex flex-col items-center w-full relative">
                          <div className="w-full flex justify-center items-center h-16 mb-4">
                            <h3 className="text-2xl text-white uppercase tracking-[0.2em] drop-shadow-md leading-tight text-center relative z-20">{conviction?.name}</h3>
                          </div>

                          <div className="flex justify-center w-full relative z-20">
                            <div className="inline-block text-left border-l pl-3 pr-1" style={{ borderColor: seasonColor }}>
                              <p className="text-sm italic text-gray-300 leading-relaxed">
                                {compendiumConviction?.data?.statement || 'No oath chosen.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center w-full relative">
                          <div className="w-full flex justify-center items-center h-16 mb-4">
                            <h3 className="text-xl font-bold uppercase tracking-[0.2em] text-cyan-600 leading-tight text-center">No conviction chosen</h3>
                          </div>
                          <span className="text-[10px] uppercase tracking-widest opacity-80 italic text-center text-cyan-600">{emptySubtitle}</span>
                        </div>
                      )}
                    </div>

                    {hasConv && (
                      <div className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-4 mx-4 mb-4 relative z-20">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Rank</span>
                          <div className="flex items-center py-1">
                            <RankPips
                              rank={convRank}
                              type="conviction"
                              color={seasonColor}
                              maxRank={hasConvictionRank5Unlocked(conviction?.name || '', char.data) || convRank >= 5 ? 5 : 4}
                            />
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDedicatingCard(i); }}
                          className="w-full text-[10px] uppercase tracking-widest py-2 rounded transition-colors shadow-sm bg-black/40 hover:bg-black/60 border border-white/20 text-white"
                        >
                          Dedicate
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* BACK: Failing */}
                <div
                  className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] border-[3px] border-double rounded-xl flex flex-col shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] overflow-hidden ${!isFlipped ? 'pointer-events-none z-0' : 'pointer-events-auto z-10'} ${
                    hasFail ? 'border-red-900/50 bg-[#090303]' : 'border-cyan-900/40 bg-[#020810] shadow-[inset_0_0_30px_rgba(8,145,178,0.15)]'
                  }`}
                >
                  {hasFail && (
                    <div
                      className="absolute inset-0 z-0 pointer-events-none opacity-[0.06]"
                      style={{ backgroundImage: NOISE_BG }}
                    />
                  )}

                  <div
                    className="absolute inset-[6px] border rounded-lg pointer-events-none opacity-30 z-10"
                    style={{ borderColor: hasFail ? '#d93838' : '#164e63' }}
                  />

                  <div
                    className="w-full h-full p-5 flex flex-col relative"
                    style={{ animation: failRank >= 4 && isFlipped ? 'crisis-tremor 10s infinite' : 'none' }}
                  >

                    {hasFail && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-10">
                        <div className={`absolute inset-0 transition-opacity duration-1000 ${failRank >= 1 && failRank <= 2 ? 'opacity-100' : 'opacity-0'}`}>
                          {failRank >= 1 && failRank <= 2 && (
                            <div className="absolute inset-0"
                                 style={{
                                   background: `radial-gradient(circle at center, #d9383840 0%, transparent 50%)`,
                                   animation: 'drift 12s ease-in-out infinite'
                                 }} />
                          )}
                        </div>

                        <div className={`absolute inset-0 transition-opacity duration-1000 ${failRank >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                          {failRank >= 3 && (
                            <div
                                 className="absolute top-1/3 left-1/2 w-[320px] h-[320px] -ml-[160px] -mt-[160px] rounded-full pointer-events-none"
                                 style={{
                                   background: `radial-gradient(circle, #d93838cc 0%, #d9383844 30%, transparent 70%)`,
                                   animation: 'breathe-centre 12s ease-in-out infinite'
                                 }} />
                          )}
                        </div>
                      </div>
                    )}
                    {!hasFail && <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite] pointer-events-none z-10" />}

                    {hasFail && (
                      <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-10 transition-opacity duration-1000 ${failRank >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="absolute top-0 left-[10%] w-2 h-2 bg-black rounded-full" style={{ animation: 'fallAsh 5s linear infinite' }} />
                        <div className="absolute top-0 right-[30%] w-1.5 h-1.5 bg-black rounded-full" style={{ animation: 'fallAsh 7s linear infinite 1.5s' }} />
                        <div className="absolute top-0 left-[40%] w-1.5 h-1.5 bg-black rounded-full" style={{ animation: 'fallAsh 4s linear infinite 0.5s' }} />
                        <div className="absolute top-0 right-[15%] w-1.5 h-1.5 bg-black rounded-full" style={{ animation: 'fallAsh 6s linear infinite 2s' }} />
                        <div className="absolute top-0 left-[70%] w-2 h-2 bg-black rounded-full" style={{ animation: 'fallAsh 8s linear infinite 3s' }} />
                      </div>
                    )}

                    <div className="grid grid-cols-3 items-center mb-4 mt-2 px-2 z-20">
                      <button onClick={(e) => { e.stopPropagation(); setEditingCard(i); }} className={`justify-self-start ${hasFail ? 'text-red-500 hover:text-red-400' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Edit">✎</button>
                      <span className={`justify-self-center text-[10px] font-bold uppercase tracking-widest ${hasFail ? 'text-red-500/70' : 'text-cyan-600'}`}>Failing</span>
                      <button onClick={(e) => { e.stopPropagation(); toggleFlip(i); }} className={`justify-self-end ${hasFail ? 'text-red-500 hover:text-red-400' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Flip to Conviction"><FlipIcon /></button>
                    </div>

                    <div className="flex-1 flex flex-col items-center relative px-4 sm:px-6 pb-6 w-full pt-4 z-20">
                      {hasFail && failing ? (
                        <div className="flex flex-col items-center w-full relative">
                          <div className="w-full flex justify-center items-center h-16 mb-4 relative z-20">
                            <h3 className="bg-white text-black mix-blend-screen font-bold uppercase tracking-[0.2em] text-xl leading-tight px-4 py-2 select-none inline-block shadow-sm text-center">
                              {failing.name}
                            </h3>
                          </div>

                          <div className="flex justify-center w-full relative z-20">
                            <div className="inline-block text-left border-l pl-3 pr-1" style={{ borderColor: '#d93838' }}>
                              <p className="text-sm italic text-gray-300 leading-relaxed">
                                {compendiumFailing?.data?.statement || 'No compulsion recorded.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center w-full relative">
                          <div className="w-full flex justify-center items-center h-16 mb-4">
                            <h3 className="text-xl font-bold uppercase tracking-[0.2em] text-cyan-600 leading-tight text-center">No failing manifest</h3>
                          </div>
                          <span className="text-[10px] uppercase tracking-widest opacity-80 italic text-center text-cyan-600">{emptySubtitle}</span>
                        </div>
                      )}
                    </div>

                    {hasFail && (
                      <div className="mt-auto flex flex-col gap-4 border-t border-red-900/30 pt-4 mx-4 mb-4 relative z-20">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Rank</span>
                          <div className="flex items-center py-1">
                            <RankPips rank={failRank} type="failing" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setReflectingCard(i); }}
                          className="w-full text-[10px] uppercase tracking-widest py-2 rounded transition-colors bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400"
                        >
                          Reflect
                        </button>
                      </div>
                    )}

                  </div>
                </div>

              </div>

              {/* EDIT OVERLAY */}
              {isEditing && (
                <div className="absolute inset-0 z-50 bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
                  <div className="flex justify-between items-center mb-1 border-b border-gray-700 pb-2 shrink-0">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Edit Card {i + 1}</span>
                    <button onClick={() => setEditingCard(null)} className="text-green-500 hover:text-green-400 text-sm font-bold">Done</button>
                  </div>

                  {/* Conviction Selector */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Conviction</label>
                    {hasConv ? (
                      <div className="flex items-center justify-between gap-2 bg-black/30 border border-gray-700 rounded-lg px-3 py-2.5">
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span
                            className="w-2 h-2 rotate-45 shrink-0"
                            style={{ backgroundColor: seasonColor, boxShadow: `0 0 6px ${seasonColor}` }}
                          />
                          <span className="text-sm font-bold text-gray-100 truncate">{conviction.name}</span>
                        </div>
                        <div className="flex items-center gap-1 border-l border-gray-700 pl-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPickerTarget({ type: 'conviction', index: i })}
                            className="text-gray-400 hover:text-white text-xs px-1 transition-colors"
                            title="Change Conviction"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...char.data.convictions];
                              next[i] = { ...next[i], name: '', statement: '' };
                              patch({ convictions: next });
                            }}
                            className="text-red-500 hover:text-red-400 font-bold px-1 text-sm leading-none transition-colors"
                            title="Clear Conviction"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPickerTarget({ type: 'conviction', index: i })}
                        className="w-full py-2.5 px-3 border border-dashed border-gray-600 hover:border-gray-400 hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-200 font-medium text-sm flex items-center justify-center transition-colors"
                      >
                        + Select Conviction
                      </button>
                    )}
                  </div>

                  {/* Failing Selector */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Failing</label>
                    {hasFail && failing ? (
                      <div className="flex items-center justify-between gap-2 bg-black/30 border border-gray-700 rounded-lg px-3 py-2.5">
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="w-2 h-2 rotate-45 bg-red-500 shadow-[0_0_6px_#d93838] shrink-0" />
                          <span className="text-sm font-bold text-red-200 truncate">{failing.name}</span>
                        </div>
                        <div className="flex items-center gap-1 border-l border-gray-700 pl-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPickerTarget({ type: 'failing', index: i })}
                            className="text-gray-400 hover:text-white text-xs px-1 transition-colors"
                            title="Change Failing"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => patch({ failings: char.data.failings.filter(f => f.convictionIndex !== i) })}
                            className="text-red-500 hover:text-red-400 font-bold px-1 text-sm leading-none transition-colors"
                            title="Remove Failing"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPickerTarget({ type: 'failing', index: i })}
                        className="w-full py-2.5 px-3 border border-dashed border-gray-600 hover:border-gray-400 hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-200 font-medium text-sm flex items-center justify-center transition-colors"
                      >
                        + Select Failing
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => deleteCard(i, hasConv, hasFail)}
                    className="mt-auto w-full py-2 rounded border border-red-900/60 bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-widest transition-colors shrink-0"
                    title="Erase this card permanently (no refund)"
                  >
                    Erase Card
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {convCount > 1 && (
        <div className="sm:hidden flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => stepMobileCard(-1)}
            className="px-4 py-1.5 rounded bg-black/35 border border-gray-700 text-sm font-bold text-gray-300 hover:text-white active:bg-white/10 transition-colors"
            aria-label="Previous conviction card"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => stepMobileCard(1)}
            className="px-4 py-1.5 rounded bg-black/35 border border-gray-700 text-sm font-bold text-gray-300 hover:text-white active:bg-white/10 transition-colors"
            aria-label="Next conviction card"
          >
            ›
          </button>
        </div>
      )}

      {dedicatingCard !== null && (
        <DedicateModal
          char={char}
          patch={patch}
          index={dedicatingCard}
          onClose={() => setDedicatingCard(null)}
        />
      )}

      {reflectingCard !== null && (
        <ReflectModal
          char={char}
          patch={patch}
          index={reflectingCard}
          onClose={() => setReflectingCard(null)}
        />
      )}

      {isCrisisOpen && (
        <CrisisModal
          char={char}
          patch={patch}
          onClose={() => setIsCrisisOpen(false)}
        />
      )}

      {pickerTarget && (
        <SeasonCompendiumPickerModal
          title={pickerTarget.type === 'conviction' ? 'Select Conviction' : 'Select Failing'}
          entries={pickerTarget.type === 'conviction' ? getConvictions() : getFailings()}
          currentName={
            pickerTarget.type === 'conviction'
              ? char.data.convictions[pickerTarget.index]?.name
              : char.data.failings.find(f => f.convictionIndex === pickerTarget.index)?.name
          }
          onSelect={(entry) => {
            const idx = pickerTarget.index;
            if (pickerTarget.type === 'conviction') {
              const next = [...char.data.convictions];
              next[idx] = {
                ...next[idx],
                season: entry.data?.season || next[idx]?.season || 'Vamor',
                name: entry.name,
                statement: entry.data?.statement || '',
              };
              patch({ convictions: next });
            } else {
              const existingIndex = char.data.failings.findIndex(f => f.convictionIndex === idx);
              const statement = entry.data?.statement || '';
              if (existingIndex >= 0) {
                const next = [...char.data.failings];
                next[existingIndex] = { ...next[existingIndex], name: entry.name, statement };
                patch({ failings: next });
              } else {
                patch({
                  failings: [...char.data.failings, { name: entry.name, rank: 1, convictionIndex: idx, statement }]
                });
              }
            }
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </section>
  );
}