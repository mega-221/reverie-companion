import { useState } from 'react';
import type { Character } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { SEASONS } from '../utils';
import { dpMax } from '../../../calc';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const FlipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

const RankPips = ({ rank, type, color }: { rank: number, type: 'conviction' | 'failing', color?: string }) => {
  const maxRank = 4;
  const activeColor = type === 'conviction' ? (color || '#9ca3af') : '#d93838';
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
                className="h-px w-3 mx-1.5 transition-colors duration-300"
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
  const maxRank = 4;
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

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="sheet-modal animate-in zoom-in-95 duration-200 max-w-sm">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-cinzel font-bold text-xl text-gray-200 truncate pr-2">Dedicate to {conviction.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2 shrink-0">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="bg-black/20 rounded-lg p-3 border border-gray-700 flex flex-col items-center justify-center shadow-inner">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Current Rank</div>
            <div className="text-3xl font-bold text-white mb-2">{currentRank} <span className="text-lg text-gray-500 font-normal">/ {maxRank}</span></div>

            <div className="mt-1 mb-2">
              <RankPips rank={currentRank} type="conviction" color={seasonColor} />
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
            <span className={canAfford && !isMaxed ? "text-cyan-400" : "text-gray-400"}>
              {availableDp} / {dpMax(char.data)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConvictionsCard({ char, patch }: { char: Character, patch: any }) {
  const { getConvictions, getFailings, getEntryByName } = useCompendium();

  const [cardRotations, setCardRotations] = useState<Record<number, number>>({});
  const [editingCard, setEditingCard] = useState<number | null>(null);
  const [dedicatingCard, setDedicatingCard] = useState<number | null>(null);

  const toggleFlip = (index: number) => {
    setCardRotations(prev => ({ ...prev, [index]: (prev[index] || 0) + 180 }));
  };

  const canAddConviction = char.data.convictions.length < 3;

  const addConviction = () => {
    if (!canAddConviction) return;
    patch({ convictions: [...char.data.convictions, { season: 'Vamor', name: '', statement: '', rank: 1 }] });
  };

  const deleteCard = (index: number, hasConv: boolean, hasFail: boolean) => {
    const summary = hasConv && hasFail ? 'the conviction and its linked failing' : hasConv ? 'the conviction' : 'the failing';
    if (!confirm(`Erase ${summary}? This cannot be undone and no DP or other resources are refunded.`)) return;

    const newConvs = char.data.convictions.filter((_, idx) => idx !== index);
    const newFails = char.data.failings
      .filter(f => f.convictionIndex !== index)
      .map(f => f.convictionIndex > index ? { ...f, convictionIndex: f.convictionIndex - 1 } : f);

    patch({ convictions: newConvs, failings: newFails });
    setEditingCard(null);
  };

  return (
    <section className="sheet-panel p-5 w-full">
      <div className="flex justify-between items-end mb-6 border-b border-gray-700 pb-2">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Convictions & Failings</h2>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">The Philosophical Core</span>
          <button
            onClick={addConviction}
            disabled={!canAddConviction}
            className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border transition-colors ${canAddConviction ? 'text-cyan-400 border-cyan-800 hover:bg-cyan-950/40 hover:text-cyan-300' : 'text-gray-600 border-gray-700 cursor-not-allowed'}`}
            title={canAddConviction ? 'Add new conviction slot' : 'All slots filled'}
          >
            + Add
          </button>
        </div>
      </div>

      {char.data.convictions.length === 0 && (
        <div className="flex justify-center items-center py-16 text-cyan-800/60 italic text-sm">
          No convictions yet. Click "+ Add" above to begin.
        </div>
      )}

      <div className="flex justify-evenly w-full">
        {char.data.convictions.map((conviction, i) => {
          const failing = char.data.failings.find(f => f.convictionIndex === i);

          const rotation = cardRotations[i] || 0;
          const isFlipped = (rotation / 180) % 2 !== 0;
          const isEditing = editingCard === i;

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
            <div key={i} className="[perspective:1000px] w-[320px] shrink-0 aspect-[2.5/3.5] relative">
              <div
                className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
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
                      <button onClick={() => setEditingCard(i)} className={`justify-self-start ${hasConv ? 'text-gray-400 hover:text-white' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Edit">✎</button>
                      <span className={`justify-self-center text-[10px] font-bold uppercase tracking-widest ${hasConv ? 'text-gray-300 opacity-90' : 'text-cyan-600'}`}>Conviction</span>
                      <button onClick={() => toggleFlip(i)} className={`justify-self-end ${hasConv ? 'text-gray-400 hover:text-white' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Flip to Failing"><FlipIcon /></button>
                    </div>

                    <div className="flex-1 flex flex-col items-center relative px-6 pb-6 w-full pt-4 z-20">
                      {hasConv ? (
                        <div className="flex flex-col items-center w-full relative">
                          <div className="w-full flex justify-center items-center h-16 mb-4">
                            <h3 className="text-2xl text-white uppercase tracking-[0.2em] drop-shadow-md leading-tight relative z-20">{conviction?.name}</h3>
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
                            <RankPips rank={convRank} type="conviction" color={seasonColor} />
                          </div>
                        </div>
                        <button
                          onClick={() => setDedicatingCard(i)}
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
                      <button onClick={() => setEditingCard(i)} className={`justify-self-start ${hasFail ? 'text-red-500 hover:text-red-400' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Edit">✎</button>
                      <span className={`justify-self-center text-[10px] font-bold uppercase tracking-widest ${hasFail ? 'text-red-500/70' : 'text-cyan-600'}`}>Failing</span>
                      <button onClick={() => toggleFlip(i)} className={`justify-self-end ${hasFail ? 'text-red-500 hover:text-red-400' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Flip to Conviction"><FlipIcon /></button>
                    </div>

                    <div className="flex-1 flex flex-col items-center relative px-6 pb-6 w-full pt-4 z-20">
                      {hasFail && failing ? (
                        <div className="flex flex-col items-center w-full relative">
                          <div className="w-full flex justify-center items-center h-16 mb-4 relative z-20">
                            <h3 className="bg-white text-black mix-blend-screen font-bold uppercase tracking-[0.2em] text-xl leading-tight px-4 py-2 select-none inline-block shadow-sm">
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
                        <button className="w-full text-[10px] uppercase tracking-widest py-2 rounded transition-colors bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400">
                          Resolve Crisis
                        </button>
                      </div>
                    )}

                  </div>
                </div>

              </div>

              {/* EDIT OVERLAY */}
              {isEditing && (
                <div className="absolute inset-0 z-50 bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
                  <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2 shrink-0">
                    <span className="text-xs font-bold text-gray-400 uppercase">Edit Slot {i + 1}</span>
                    <button onClick={() => setEditingCard(null)} className="text-green-500 hover:text-green-400 text-sm font-bold">Done</button>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Conviction</label>
                    <div className="flex gap-2">
                      <select className="border border-gray-700 bg-black/40 p-1.5 rounded text-xs shadow-inner focus:outline-none text-gray-200 shrink-0" value={conviction?.season || 'Vamor'} onChange={e => {
                        const next = [...char.data.convictions]; next[i] = { ...next[i], season: e.target.value, name: '', statement: '' }; patch({ convictions: next });
                      }}>
                        {SEASONS.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <select className="border border-gray-700 bg-black/40 p-1.5 rounded text-xs shadow-inner focus:outline-none text-gray-200 flex-1 min-w-0" value={conviction?.name || ''} onChange={e => {
                        const newName = e.target.value;
                        const compendiumItem = getEntryByName(newName);
                        const next = [...char.data.convictions];
                        next[i] = { ...next[i], name: newName, statement: compendiumItem?.data?.statement || '' };
                        patch({ convictions: next });
                      }}>
                        <option value="">— Select —</option>
                        {getConvictions().filter(c => c.data.season === (conviction?.season || 'Vamor')).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 mt-2">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Linked Failing</label>
                    <select className="border border-gray-700 bg-black/40 p-1.5 rounded text-xs shadow-inner w-full focus:outline-none text-gray-200" value={failing?.name || ''} onChange={e => {
                      const newName = e.target.value;
                      if (!newName) {
                         patch({ failings: char.data.failings.filter(f => f.convictionIndex !== i) });
                         return;
                      }
                      const compendiumItem = getEntryByName(newName);
                      const existingFailingIndex = char.data.failings.findIndex(f => f.convictionIndex === i);

                      if (existingFailingIndex >= 0) {
                        const next = [...char.data.failings];
                        next[existingFailingIndex] = { ...next[existingFailingIndex], name: newName, statement: compendiumItem?.data?.statement || '' };
                        patch({ failings: next });
                      } else {
                        patch({ failings: [...char.data.failings, { name: newName, rank: 1, convictionIndex: i, statement: compendiumItem?.data?.statement || '' }] });
                      }
                    }}>
                      <option value="">— None —</option>
                      {getFailings().map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
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

      {dedicatingCard !== null && (
        <DedicateModal
          char={char}
          patch={patch}
          index={dedicatingCard}
          onClose={() => setDedicatingCard(null)}
        />
      )}
    </section>
  );
}