import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { getSeasonHex } from '../../../constants/reverie';
import {
  computeRollOutcome,
  rollSingleDie,
  type ActiveRollSession,
  type DieSize,
} from '../../../utils/diceRoller';

interface ConvictionOption {
  name: string;
  season: string;
  rank: number;
}

interface DiscoRollOverlayProps {
  session: ActiveRollSession;
  charName: string;
  currentStrain: number;
  strainMaxVal: number;
  exertStrainCost: number;
  currentDp: number;
  namedConvictions: ConvictionOption[];
  readOnly?: boolean;
  onExertDie: (dieId: string) => void;
  onSpendDestiny: (conviction: ConvictionOption) => void;
  onAccept: (session: ActiveRollSession, restoreVigor: boolean, restoreStrain: boolean) => void;
}

interface FaceTrackEntry {
  prev: number;
  curr: number;
  step: number;
}

const D6_PIP_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function rollDistinctFace(size: DieSize, previous: number): number {
  if (size === 'coinflip') {
    return previous >= 2 ? 1 : 2;
  }
  const sides = size === 'd6' ? 6 : 20;
  let candidate = rollSingleDie(size);
  if (sides > 1 && candidate === previous) {
    candidate = (candidate % sides) + 1;
  }
  return candidate;
}

function renderDieFaceContent(
  size: DieSize,
  value: number,
  pipToneClass: string,
  textToneClass: string
) {
  if (size === 'coinflip') {
    const isHeads = value >= 2;
    return (
      <span className={`font-bold text-xs uppercase tracking-[0.2em] ${textToneClass}`}>
        {isHeads ? 'HEADS' : 'TAILS'}
      </span>
    );
  }

  if (size === 'd6') {
    const v = Math.max(1, Math.min(6, value));
    const active = new Set(D6_PIP_POSITIONS[v] || [4]);
    return (
      <div className="w-9 h-9 sm:w-10 sm:h-10 grid grid-cols-3 grid-rows-3 place-items-center">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className={`w-[7px] h-[7px] sm:w-2 sm:h-2 rounded-full transition-colors duration-300 ${
              active.has(i) ? pipToneClass : 'bg-transparent'
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <span className={`font-spectral font-bold text-xl sm:text-2xl tabular-nums transition-colors duration-300 ${textToneClass}`}>
      {value}
    </span>
  );
}

export default function DiscoRollOverlay({
  session,
  charName,
  currentStrain,
  strainMaxVal,
  exertStrainCost,
  currentDp,
  namedConvictions,
  readOnly = false,
  onExertDie,
  onSpendDestiny,
  onAccept,
}: DiscoRollOverlayProps) {
  useBodyScrollLock(true);

  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const [settledDieIds, setSettledDieIds] = useState<Set<string>>(() => new Set());
  const [faceTrack, setFaceTrack] = useState<Record<string, FaceTrackEntry>>({});
  const [pickDieForExert, setPickDieForExert] = useState(false);
  const [destinyMenuOpen, setDestinyMenuOpen] = useState(false);

  // Radiant Success selectable options (applied upon closing)
  const [radiantVigorSelected, setRadiantVigorSelected] = useState(false);
  const [radiantStrainSelected, setRadiantStrainSelected] = useState(false);

  // Fade in backdrop blur and elements on mount
  useEffect(() => {
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const rollingKey = `${session.id}:${session.rollSerial}:${session.rollingDieIds.join(',')}`;

  useEffect(() => {
    const rollingIds = session.rollingDieIds;
    if (rollingIds.length === 0) {
      setSettledDieIds(new Set(session.dice.map((d) => d.id)));
      return;
    }

    const rollingSet = new Set(rollingIds);
    setSettledDieIds(
      new Set(session.dice.filter((d) => !rollingSet.has(d.id)).map((d) => d.id))
    );

    // Seed initial reel faces for newly rolling dice
    setFaceTrack((prevTrack) => {
      const next: Record<string, FaceTrackEntry> = { ...prevTrack };
      for (const die of session.dice) {
        if (rollingSet.has(die.id)) {
          const prevVal = prevTrack[die.id]?.curr ?? rollSingleDie(die.size);
          const currVal = rollDistinctFace(die.size, prevVal);
          next[die.id] = {
            prev: prevVal,
            curr: currVal,
            step: (prevTrack[die.id]?.step ?? 0) + 1,
          };
        }
      }
      return next;
    });

    const settledLocal = new Set<string>(
      session.dice.filter((d) => !rollingSet.has(d.id)).map((d) => d.id)
    );

    const intervalId = window.setInterval(() => {
      setFaceTrack((prevTrack) => {
        const next: Record<string, FaceTrackEntry> = { ...prevTrack };
        let changed = false;
        for (const die of session.dice) {
          if (rollingSet.has(die.id) && !settledLocal.has(die.id)) {
            const current = prevTrack[die.id]?.curr ?? die.value;
            const rolled = rollDistinctFace(die.size, current);
            next[die.id] = {
              prev: current,
              curr: rolled,
              step: (prevTrack[die.id]?.step ?? 0) + 1,
            };
            changed = true;
          }
        }
        return changed ? next : prevTrack;
      });
    }, 115);

    const timers: number[] = [];
    rollingIds.forEach((dieId, orderIdx) => {
      const settleMs = rollingIds.length === 1 ? 1050 : 950 + orderIdx * 360;
      const t = window.setTimeout(() => {
        settledLocal.add(dieId);
        setSettledDieIds((prev) => {
          const next = new Set(prev);
          next.add(dieId);
          return next;
        });
      }, settleMs);
      timers.push(t);
    });

    return () => {
      window.clearInterval(intervalId);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [rollingKey]);

  const allSettled = useMemo(
    () => session.dice.every((d) => settledDieIds.has(d.id)),
    [session.dice, settledDieIds]
  );

  const handleSkipAnimation = () => {
    if (!allSettled && !isClosing) {
      setSettledDieIds(new Set(session.dice.map((d) => d.id)));
    }
  };

  const handleAcceptClick = () => {
    if (!allSettled || isClosing) return;
    setIsClosing(true);
    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      onAccept(session, radiantVigorSelected, radiantStrainSelected);
    }, 300);
  };

  const outcome = useMemo(() => computeRollOutcome(session), [session]);

  const isThreeD6 = session.dice.filter((d) => d.size === 'd6').length === 3;
  const isOverStrainLimit = currentStrain > strainMaxVal;
  const canExert = !readOnly && allSettled && !isClosing && !isOverStrainLimit && isThreeD6;
  const canSpendDestiny =
    !readOnly &&
    allSettled &&
    !isClosing &&
    !session.destinyApplied &&
    currentDp >= 1 &&
    namedConvictions.length > 0 &&
    isThreeD6;

  const centerDieIndex = Math.floor(session.dice.length / 2);

  // Verdict container classes aligned with green/red UI conventions
  const verdictBoxClass = useMemo(() => {
    if (outcome.outcomeTone === 'radiant') {
      return 'rev-keep-color border-green-700 bg-green-950/75 text-green-200';
    }
    if (outcome.outcomeTone === 'success') {
      return 'rev-keep-color border-green-800 bg-green-950/75 text-green-200';
    }
    if (outcome.outcomeTone === 'failure') {
      return 'rev-keep-color border-red-800 bg-red-950/75 text-red-200';
    }
    return 'border-white/30 bg-black/45 text-white';
  }, [outcome.outcomeTone]);

  return createPortal(
    <div
      className={`fixed inset-0 z-[420] flex items-center justify-center p-4 sm:p-6 transition-[backdrop-filter,opacity] duration-300 ease-out ${
        isVisible && !isClosing
          ? 'backdrop-blur-2xl opacity-100'
          : 'backdrop-blur-none opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`Skill Check: ${session.title}`}
    >
      <div
        className={`relative w-full max-w-lg max-h-[90vh] flex flex-col text-white overflow-y-auto no-scrollbar p-6 transition-all duration-300 ease-out ${
          isVisible && !isClosing ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4 mb-5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
              <span>{charName}</span>
              {session.advantageMode !== 'normal' && (
                <span className="px-1.5 py-0.5 rounded border border-white/30 text-[10px]">
                  {session.advantageMode}
                </span>
              )}
            </div>
            <h2 className="font-spectral font-bold text-2xl sm:text-3xl text-white tracking-wide">
              {session.title}
            </h2>
          </div>

          {session.targetValue !== undefined && (
            <div className="px-3.5 py-1.5 rounded-lg border border-white/30 bg-black/40 text-center shrink-0">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold block">
                {session.targetLabel || 'CL'}
              </span>
              <span className="text-xl font-bold text-white tabular-nums">
                {session.category === 'death_save' ? `${session.targetValue}+` : session.targetValue}
              </span>
            </div>
          )}
        </div>

        {/* Dice Stage */}
        <div
          onClick={handleSkipAnimation}
          className={`flex flex-col items-center justify-center py-4 ${
            !allSettled ? 'cursor-pointer' : ''
          }`}
          title={!allSettled ? 'Click to settle dice immediately' : undefined}
        >
          <div className="flex flex-wrap items-center justify-center gap-4">
            {session.dice.map((die, idx) => {
              const isSettled = settledDieIds.has(die.id);
              const track = faceTrack[die.id];
              const currVal = track?.curr ?? die.value;
              const prevVal = track?.prev ?? die.value;
              const step = track?.step ?? 0;
              const isCoin = die.size === 'coinflip';
              const clickableForExert = pickDieForExert && isSettled && !isClosing;

              const isCenterDie = idx === centerDieIndex;
              const isRadiantCenter =
                allSettled && outcome.outcomeTone === 'radiant' && isCenterDie;
              const isSuccessOutcome =
                allSettled &&
                (outcome.outcomeTone === 'success' || outcome.outcomeTone === 'radiant');
              const isFailureOutcome = allSettled && outcome.outcomeTone === 'failure';

              let boxBorderClass = 'border-white/85';
              let pipToneClass = 'bg-white';
              let textToneClass = 'text-white';
              let boxInlineStyle: React.CSSProperties | undefined;

              if (clickableForExert) {
                boxBorderClass = 'rev-keep-color border-amber-400 ring-2 ring-amber-400/50';
                pipToneClass = 'bg-amber-300';
                textToneClass = 'text-amber-200';
              } else if (isRadiantCenter) {
                boxBorderClass = 'rev-keep-color border-yellow-400';
                pipToneClass = 'bg-yellow-300';
                textToneClass = 'text-yellow-200';
                boxInlineStyle = {
                  boxShadow:
                    '0 0 24px rgba(250, 204, 21, 0.58), 0 0 8px rgba(251, 191, 36, 0.7), inset 0 0 14px rgba(250, 204, 21, 0.28)',
                };
              } else if (isSuccessOutcome) {
                boxBorderClass = 'rev-keep-color border-green-600';
                pipToneClass = 'bg-green-300';
                textToneClass = 'text-green-200';
              } else if (isFailureOutcome) {
                boxBorderClass = 'rev-keep-color border-red-700';
                pipToneClass = 'bg-red-300';
                textToneClass = 'text-red-200';
              }

              const boxDimensionClass = isCoin
                ? 'w-24 h-12 rounded-full'
                : 'w-14 h-14 sm:w-16 sm:h-16 rounded-lg';

              return (
                <button
                  key={die.id}
                  type="button"
                  disabled={!clickableForExert}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!clickableForExert) return;
                    setPickDieForExert(false);
                    onExertDie(die.id);
                  }}
                  className={`flex flex-col items-center transition-transform duration-200 ${
                    clickableForExert ? 'cursor-pointer scale-110' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`relative overflow-hidden bg-transparent border-2 flex items-center justify-center select-none transition-[border-color,box-shadow,transform,opacity] duration-300 ${boxDimensionClass} ${boxBorderClass} ${
                      !isSettled ? 'opacity-90 scale-[0.98]' : 'opacity-100 scale-100'
                    }`}
                    style={boxInlineStyle}
                  >
                    {/* Conviction-card inspired yellow radial aura for Radiant center die */}
                    {isRadiantCenter && !clickableForExert && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle at center, rgba(250, 204, 21, 0.34) 0%, transparent 72%)',
                        }}
                      />
                    )}

                    {/* Slot-machine downward rotating face reel */}
                    {!isSettled ? (
                      <div
                        key={`roll-${step}`}
                        className="absolute inset-x-0 top-0 h-[200%] flex flex-col dice-slot-step"
                      >
                        <div className="h-1/2 w-full flex items-center justify-center">
                          {renderDieFaceContent(die.size, currVal, pipToneClass, textToneClass)}
                        </div>
                        <div className="h-1/2 w-full flex items-center justify-center">
                          {renderDieFaceContent(die.size, prevVal, pipToneClass, textToneClass)}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={`settled-${session.rollSerial}-${die.id}`}
                        className="absolute inset-x-0 top-0 h-[200%] flex flex-col dice-slot-settle"
                      >
                        <div className="h-1/2 w-full flex items-center justify-center">
                          {renderDieFaceContent(die.size, die.value, pipToneClass, textToneClass)}
                        </div>
                        <div className="h-1/2 w-full flex items-center justify-center">
                          {renderDieFaceContent(die.size, currVal, pipToneClass, textToneClass)}
                        </div>
                      </div>
                    )}
                  </div>

                  {clickableForExert && (
                    <span className="rev-keep-color text-[10px] font-bold uppercase tracking-wider text-amber-300 mt-1 animate-pulse">
                      Reroll
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Smooth collapsible Rolling indicator so disappearing doesn't snap */}
          <div
            className={`grid w-full transition-[grid-template-rows,opacity] duration-500 ease-out ${
              !allSettled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden min-h-0 flex justify-center">
              <span className="pt-3 text-xs uppercase tracking-widest text-neutral-300">
                Rolling...
              </span>
            </div>
          </div>
        </div>

        {/* Settled Results & Verdict — smoothly expands and pushes dice upward */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            allSettled
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="space-y-4 pt-3">
              {!outcome.isPureCoinflip && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-white/20 bg-black/40 text-sm font-mono">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/20 font-bold text-white tabular-nums">
                      Dice: {outcome.diceSum}
                    </span>
                    {session.baseModifiers.map((m, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-white/10 text-neutral-200 tabular-nums">
                        {m.value >= 0 ? `+${m.value}` : m.value} {m.label}
                      </span>
                    ))}
                    {session.destinyApplied && (
                      <span className="rev-keep-color px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700 text-cyan-200 tabular-nums">
                        +{session.destinyApplied.bonus} {session.destinyApplied.convictionName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 ml-auto">
                    <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold">Total</span>
                    <span className="font-spectral font-bold text-2xl text-white tabular-nums">
                      {outcome.total}
                    </span>
                  </div>
                </div>
              )}

              {/* Verdict Box (Green on Success/Radiant, Red on Failure) */}
              <div className={`rounded-xl border p-4 text-center space-y-3 transition-colors duration-300 ${verdictBoxClass}`}>
                <div
                  className={`font-spectral font-bold text-xl tracking-wider uppercase ${
                    outcome.outcomeTone === 'radiant'
                      ? 'rev-keep-color text-yellow-200 drop-shadow-[0_0_10px_rgba(250,204,21,0.45)]'
                      : ''
                  }`}
                >
                  {outcome.outcomeLabel}
                </div>

                {outcome.outcomeTone === 'radiant' &&
                  (session.category === 'skill' ||
                    session.category === 'special_skill' ||
                    session.category === 'attribute') && (
                    <div className="space-y-3 pt-2 border-t border-green-700/60 text-left">
                      <p className="text-xs text-green-100/90 leading-relaxed">
                        Radiant Success (CL +4): Select restoration options below to apply when closing this roll.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-2 rounded border border-green-700/60 bg-black/30 hover:bg-black/45 transition-colors">
                          <input
                            type="checkbox"
                            checked={radiantVigorSelected}
                            onChange={(e) => setRadiantVigorSelected(e.target.checked)}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: 'var(--rev-accent)' }}
                          />
                          <span>Restore 3 Vigor</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-2 rounded border border-green-700/60 bg-black/30 hover:bg-black/45 transition-colors">
                          <input
                            type="checkbox"
                            checked={radiantStrainSelected}
                            onChange={(e) => setRadiantStrainSelected(e.target.checked)}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: 'var(--rev-accent)' }}
                          />
                          <span>Restore 3 Strain</span>
                        </label>
                      </div>
                    </div>
                  )}
              </div>

              {/* Destiny Menu — smooth collapsible height */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  destinyMenuOpen
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="overflow-hidden min-h-0">
                  <div className="rounded-xl border border-white/30 bg-black/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cyan-300">
                      <span>Spend 1 Destiny Point — Choose Conviction</span>
                      <button type="button" onClick={() => setDestinyMenuOpen(false)} className="text-neutral-400 hover:text-white">
                        Close
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {namedConvictions.map((conv) => {
                        const sColor = getSeasonHex(conv.season);
                        return (
                          <button
                            key={conv.name}
                            type="button"
                            onClick={() => {
                              setDestinyMenuOpen(false);
                              onSpendDestiny(conv);
                            }}
                            className="px-3 py-2 rounded-lg border border-white/20 bg-black/50 hover:bg-white/10 flex items-center justify-between gap-2 text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rotate-45 shrink-0" style={{ backgroundColor: sColor }} />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white truncate">{conv.name}</div>
                                <div className="text-[10px] uppercase text-neutral-400">{conv.season}</div>
                              </div>
                            </div>
                            <span className="font-bold text-cyan-300 tabular-nums">+{conv.rank}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Post-Roll Actions */}
              {isThreeD6 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={!canExert}
                    onClick={() => {
                      setDestinyMenuOpen(false);
                      setPickDieForExert((prev) => !prev);
                    }}
                    className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors flex flex-col items-center justify-center ${
                      pickDieForExert
                        ? 'rev-keep-color bg-amber-900 border-amber-400 text-amber-100'
                        : canExert
                        ? 'rev-keep-color bg-black/60 hover:bg-black/80 border-amber-500/60 text-amber-200'
                        : 'bg-black/20 border-white/10 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Exert (+{exertStrainCost} SN)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!canSpendDestiny}
                    onClick={() => {
                      setPickDieForExert(false);
                      setDestinyMenuOpen((prev) => !prev);
                    }}
                    className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors flex flex-col items-center justify-center ${
                      session.destinyApplied
                        ? 'rev-keep-color bg-cyan-950 border-cyan-600 text-cyan-200'
                        : canSpendDestiny
                        ? 'rev-keep-color bg-black/60 hover:bg-black/80 border-cyan-500/60 text-cyan-200'
                        : 'bg-black/20 border-white/10 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <span>
                      {session.destinyApplied
                        ? `Destiny: ${session.destinyApplied.convictionName} (+${session.destinyApplied.bonus})`
                        : 'Spend Destiny (-1 DP)'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accept Button */}
        <div className="pt-5">
          <button
            type="button"
            disabled={!allSettled || isClosing}
            onClick={handleAcceptClick}
            className={`w-full min-h-[48px] rounded-lg font-bold text-base uppercase tracking-[0.2em] transition-all ${
              allSettled && !isClosing
                ? 'bg-white hover:bg-neutral-200 text-black cursor-pointer shadow-xl'
                : 'bg-white/20 text-neutral-400 cursor-not-allowed'
            }`}
          >
            {allSettled ? 'Accept' : 'Rolling...'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
