import { useState } from 'react';
import type { Character } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { SEASONS } from '../utils';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const FlipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const RankPips = ({ rank, type, color }: { rank: number, type: 'conviction' | 'failing', color?: string }) => {
  const maxRank = 4;
  return (
    <div className="flex gap-1.5 items-center justify-center relative z-20">
      {Array.from({ length: maxRank }).map((_, i) => {
        const isFilled = i < rank;
        const activeColor = type === 'conviction' ? color : '#d93838';
        
        return (
          <div 
            key={i} 
            className={`w-2.5 h-2.5 rotate-45 border transition-all duration-300 ${
              isFilled 
                ? 'border-transparent' 
                : 'bg-transparent border-gray-600'
            }`}
            style={isFilled ? { backgroundColor: activeColor, boxShadow: `0 0 6px ${activeColor}` } : {}}
          />
        );
      })}
    </div>
  );
};

export default function ConvictionsCard({ char, patch }: { char: Character, patch: any }) {
  const { getConvictions, getFailings, getEntryByName } = useCompendium();
  
  const [cardRotations, setCardRotations] = useState<Record<number, number>>({});
  const [editingCard, setEditingCard] = useState<number | null>(null);

  const toggleFlip = (index: number) => {
    setCardRotations(prev => ({ ...prev, [index]: (prev[index] || 0) + 180 }));
  };

  const getSeasonHex = (season?: string) => {
    switch(season) {
      case 'Vamor': return '#d93838'; // Crimson
      case 'Bruma': return '#e28927'; // Gold
      case 'Trumst': return '#2864d1'; // Azure
      case 'Halice': return '#21c15b'; // Toxic Green
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

  const updateRank = (index: number, type: 'conviction' | 'failing', newRank: number) => {
    const clampedRank = Math.max(0, Math.min(4, newRank));
    if (type === 'conviction') {
      const next = [...char.data.convictions];
      if (next[index]) { next[index] = { ...next[index], rank: clampedRank }; patch({ convictions: next }); }
    } else {
      const failingIdx = char.data.failings.findIndex(f => f.convictionIndex === index);
      if (failingIdx >= 0) { const next = [...char.data.failings]; next[failingIdx] = { ...next[failingIdx], rank: clampedRank }; patch({ failings: next }); }
    }
  };

  return (
    <section className="sheet-panel p-5 w-full">
      <div className="flex justify-between items-end mb-6 border-b border-gray-700 pb-2">
        <h2 className="text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">Convictions & Failings</h2>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">The Philosophical Core</span>
      </div>
      
      <div className="flex justify-center gap-8 w-full">
        {[...Array(4)].map((_, i) => {
          const conviction = char.data.convictions[i];
          const failing = char.data.failings.find(f => f.convictionIndex === i);
          
          if (!conviction && !failing) {
            return (
              <div key={i} className="[perspective:1000px] w-[320px] shrink-0 aspect-[2.5/3.5]">
                <button 
                  className="relative w-full h-full border-2 border-dashed border-cyan-900/40 bg-[#020810] rounded-xl text-cyan-800 hover:bg-[#040f1a] hover:border-cyan-700/60 transition-colors font-bold flex flex-col items-center justify-center shadow-[inset_0_0_30px_rgba(8,145,178,0.1)] group overflow-hidden" 
                  onClick={() => patch({ convictions: [...char.data.convictions, { season: 'Vamor', name: '', statement: '', rank: 1 }] })}
                >
                  <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-900/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
                  <span className="text-3xl mb-2 opacity-50 group-hover:opacity-100 transition-opacity relative z-10">+</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity relative z-10">The mind is dormant</span>
                </button>
              </div>
            );
          }

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
                    hasConv ? 'bg-gradient-to-b' : 'border-cyan-900/40 bg-[#020810] shadow-[inset_0_0_30px_rgba(8,145,178,0.15)]'
                  } ${hasConv ? getSeasonGradient(conviction?.season) : ''}`}
                  style={hasConv ? { borderColor: `${seasonColor}aa` } : {}}
                >
                  {/* Fine Grain Texture - Behind Everything */}
                  {hasConv && (
                    <div 
                      className="absolute inset-0 z-0 pointer-events-none opacity-[0.06]"
                      style={{ backgroundImage: NOISE_BG }}
                    />
                  )}

                  {/* Inner Decorative Tarot Frame */}
                  <div 
                    className="absolute inset-[6px] border rounded-lg pointer-events-none opacity-30 z-10"
                    style={{ borderColor: hasConv ? seasonColor : '#164e63' }}
                  />

                  {/* Dynamic Lighting */}
                  {hasConv && (
                    <div 
                      className="absolute inset-0 z-10 pointer-events-none opacity-40"
                      style={{ background: `radial-gradient(circle at top center, ${seasonColor}80 0%, transparent 60%)` }}
                    />
                  )}

                  {/* --- CONVICTION BACKGROUND LAYERS (Animated) --- */}
                  {hasConv && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-10">
                      
                      {/* Slot 1: Drift (Rank 1 & 2) */}
                      <div className={`absolute inset-0 transition-opacity duration-1000 ${convRank >= 1 && convRank <= 2 ? 'opacity-100' : 'opacity-0'}`}>
                        {convRank >= 1 && convRank <= 2 && (
                          <div className="absolute inset-0" 
                               style={{ 
                                 background: `radial-gradient(circle at center, ${seasonColor}40 0%, transparent 50%)`,
                                 animation: 'drift 12s ease-in-out infinite'
                               }} />
                        )}
                      </div>

                      {/* Slot 2: Breathe Centre (Rank 3 & 4) - Toned down */}
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
                      
                      {/* Slot 3: Season Embers (Rank 2+) */}
                      <div className={`absolute inset-0 transition-opacity duration-1000 ${convRank >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="absolute bottom-0 w-full h-full">
                          <div className="absolute bottom-0 left-1/4 w-1 h-1 rounded-full" style={{ backgroundColor: seasonColor, boxShadow: `0 0 5px ${seasonColor}`, animation: 'floatUp 4s linear infinite' }} />
                          <div className="absolute bottom-8 right-1/4 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seasonColor, boxShadow: `0 0 8px ${seasonColor}`, animation: 'floatUp 5s linear infinite 1s' }} />
                          <div className="absolute bottom-4 left-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: seasonColor, boxShadow: `0 0 6px ${seasonColor}`, animation: 'floatUp 3.5s linear infinite 2s' }} />
                        </div>
                      </div>

                      {/* Slot 4: Ambedic Particles (Rank 4, Faster) */}
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

                  {/* --- MAIN CONTENT WRAPPER --- */}
                  <div className="w-full h-full p-5 flex flex-col relative z-20">
                    <div className="flex justify-between items-center mb-4 mt-2 px-2 z-20">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${hasConv ? 'text-gray-300 opacity-90' : 'text-cyan-600'}`}>Conviction</span>
                      <div className="flex gap-3 ml-auto z-10">
                        <button onClick={() => setEditingCard(i)} className={`${hasConv ? 'text-gray-400 hover:text-white' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Edit">✎</button>
                        <button onClick={() => toggleFlip(i)} className={`${hasConv ? 'text-gray-400 hover:text-white' : 'text-cyan-700 hover:text-cyan-300'} transition-colors`} title="Flip to Failing"><FlipIcon /></button>
                      </div>
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
                        <div className="flex flex-col items-center justify-center h-full w-full text-cyan-500 gap-2 drop-shadow-md">
                          <h3 className="text-xl font-bold uppercase tracking-[0.2em] mb-2">No conviction chosen</h3>
                          <span className="text-[10px] uppercase tracking-widest opacity-80 italic">{emptySubtitle}</span>
                        </div>
                      )}
                    </div>

                    <div className={`mt-auto flex flex-col gap-4 border-t pt-4 mx-4 mb-4 relative z-20 ${hasConv ? 'border-white/10' : 'border-cyan-900/30'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${hasConv ? 'text-gray-400' : 'text-cyan-800'}`}>Rank</span>
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); updateRank(i, 'conviction', convRank - 1); }} className="text-gray-500 hover:text-white disabled:opacity-30 px-1" disabled={!hasConv || convRank <= 0}>−</button>
                          <RankPips rank={convRank} type="conviction" color={seasonColor} />
                          <button onClick={(e) => { e.stopPropagation(); updateRank(i, 'conviction', convRank + 1); }} className="text-gray-500 hover:text-white disabled:opacity-30 px-1" disabled={!hasConv || convRank >= 4}>+</button>
                        </div>
                      </div>
                      <button 
                        disabled={!hasConv} 
                        className={`w-full text-[10px] uppercase tracking-widest py-2 rounded transition-colors shadow-sm ${hasConv ? 'bg-black/40 hover:bg-black/60 border border-white/20 text-white' : 'bg-black/20 border border-cyan-900/30 text-cyan-800/50 cursor-not-allowed'}`}
                      >
                        Dedicate DP
                      </button>
                    </div>
                  </div>
                </div>

                {/* BACK: Failing */}
                <div 
                  className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] border-[3px] border-double rounded-xl flex flex-col shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] overflow-hidden ${!isFlipped ? 'pointer-events-none z-0' : 'pointer-events-auto z-10'} ${
                    hasFail ? 'border-red-900/50 bg-[#090303]' : 'border-cyan-900/30 bg-[#010408] shadow-[inset_0_0_30px_rgba(8,145,178,0.1)]'
                  }`}
                >
                  {/* Fine Grain Texture - Behind Everything */}
                  {hasFail && (
                    <div 
                      className="absolute inset-0 z-0 pointer-events-none opacity-[0.06]"
                      style={{ backgroundImage: NOISE_BG }}
                    />
                  )}

                  {/* Inner Decorative Tarot Frame */}
                  <div 
                    className="absolute inset-[6px] border rounded-lg pointer-events-none opacity-30 z-10"
                    style={{ borderColor: hasFail ? '#d93838' : '#164e63' }}
                  />

                  {/* Tremor Wrapper */}
                  <div 
                    className="w-full h-full p-5 flex flex-col relative"
                    style={{ animation: failRank >= 4 && isFlipped ? 'crisis-tremor 10s infinite' : 'none' }}
                  >
                    
                    {/* --- FAILING BACKGROUND LAYERS --- */}
                    {hasFail && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-10">
                        
                        {/* Rank 1: Drift (Active 1 & 2) */}
                        <div className={`absolute inset-0 transition-opacity duration-1000 ${failRank >= 1 && failRank <= 2 ? 'opacity-100' : 'opacity-0'}`}>
                          {failRank >= 1 && failRank <= 2 && (
                            <div className="absolute inset-0" 
                                 style={{ 
                                   background: `radial-gradient(circle at center, #d9383840 0%, transparent 50%)`,
                                   animation: 'drift 12s ease-in-out infinite'
                                 }} />
                          )}
                        </div>

                        {/* Rank 3: Breathe (Active 3+) - Toned down */}
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
                    {!hasFail && <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-teal-900/10 rounded-full blur-3xl pointer-events-none z-10" />}

                    {/* --- FALLING ASH (Layer above background, below UI) --- */}
                    {hasFail && (
                      <div className={`absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-10 transition-opacity duration-1000 ${failRank >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="absolute top-0 left-[10%] w-2 h-2 bg-black rounded-full" style={{ animation: 'fallAsh 5s linear infinite' }} />
                        <div className="absolute top-0 right-[30%] w-1.5 h-1.5 bg-black rounded-full" style={{ animation: 'fallAsh 7s linear infinite 1.5s' }} />
                        <div className="absolute top-0 left-[40%] w-1.5 h-1.5 bg-black rounded-full" style={{ animation: 'fallAsh 4s linear infinite 0.5s' }} />
                        <div className="absolute top-0 right-[15%] w-1.5 h-1.5 bg-black rounded-full" style={{ animation: 'fallAsh 6s linear infinite 2s' }} />
                        <div className="absolute top-0 left-[70%] w-2 h-2 bg-black rounded-full" style={{ animation: 'fallAsh 8s linear infinite 3s' }} />
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-4 mt-2 px-2 z-20">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${hasFail ? 'text-red-500/70' : 'text-cyan-700/60'}`}>Failing</span>
                      <div className="flex gap-3 ml-auto z-10">
                        <button onClick={() => setEditingCard(i)} className={`${hasFail ? 'text-gray-500 hover:text-white' : 'text-cyan-800 hover:text-cyan-400'} transition-colors`} title="Edit">✎</button>
                        <button onClick={() => toggleFlip(i)} className={`${hasFail ? 'text-red-500 hover:text-red-400' : 'text-cyan-800 hover:text-cyan-400'} transition-colors`} title="Flip to Conviction"><FlipIcon /></button>
                      </div>
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
                        <div className="flex flex-col items-center justify-center h-full w-full text-cyan-700 gap-2 drop-shadow-md">
                          <h3 className="text-xl font-bold uppercase tracking-[0.2em] mb-2">No failing manifest</h3>
                          <span className="text-[10px] uppercase tracking-widest opacity-80 italic">{emptySubtitle}</span>
                        </div>
                      )}
                    </div>

                    <div className={`mt-auto flex flex-col gap-4 border-t pt-4 mx-4 mb-4 relative z-20 ${hasFail ? 'border-red-900/30' : 'border-cyan-900/20'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${hasFail ? 'text-gray-600' : 'text-cyan-900'}`}>Rank</span>
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); updateRank(i, 'failing', failRank - 1); }} className="text-gray-600 hover:text-white disabled:opacity-30 px-1" disabled={!hasFail || failRank <= 0}>−</button>
                          <RankPips rank={failRank} type="failing" />
                          <button onClick={(e) => { e.stopPropagation(); updateRank(i, 'failing', failRank + 1); }} className="text-gray-600 hover:text-white disabled:opacity-30 px-1" disabled={!hasFail || failRank >= 4}>+</button>
                        </div>
                      </div>
                      <button disabled={!hasFail} className={`w-full text-[10px] uppercase tracking-widest py-2 rounded transition-colors ${hasFail ? 'bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400' : 'bg-black/20 border border-cyan-900/20 text-cyan-900/50 cursor-not-allowed'}`}>
                        Resolve Crisis
                      </button>
                    </div>

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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}