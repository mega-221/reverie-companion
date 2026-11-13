import type { Character } from '../../types';
import { evasion, movementTiles, burdenMax, calculateBurden } from '../../calc';
import { useCompendium } from '../../CompendiumContext';
import { Tooltip } from './utils';

export default function StatsCard({ char, patch }: { char: Character, updateTracker: (k: any, a: number) => void, patch: any }) {
  const { getEntryByName } = useCompendium();
  const maxBurdenVal = burdenMax(char.data);
  const currentBurdenVal = calculateBurden(char.data, getEntryByName);
  const isOverburdened = currentBurdenVal > maxBurdenVal;

  const getSeasonColor = (season?: string) => {
    switch(season) {
      case 'Vamor': return 'text-red-500'; 
      case 'Bruma': return 'text-orange-400'; 
      case 'Trumst': return 'text-blue-400'; 
      case 'Halice': return 'text-green-500'; 
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-sm p-5 flex flex-col h-full">
      
      {/* SECTION 1: Identity & Quote (Top Aligned) */}
      <div className="shrink-0 pb-4 pt-2">
        <h2 className="text-3xl font-cinzel font-bold text-gray-100 
          first-letter:text-[3.5rem] first-letter:font-cinzelDeco first-letter:text-red-500 
          first-letter:float-left first-letter:mr-0.5 first-letter:-mt-1 first-letter:leading-[0.8] 
          leading-tight break-words text-left">
          {char.name || 'Unnamed Character'}&#8203;
        </h2>
        
        <div className="clear-both text-xs font-bold text-gray-500 uppercase tracking-widest mt-3">
          {char.data.identity.origin || 'Unknown Origin'}
        </div>

        <div className="border-l-2 border-gray-600 pl-3 mt-3">
          <textarea 
            value={char.data.identity.quote || ''}
            onChange={e => patch({ identity: { ...char.data.identity, quote: e.target.value } })}
            placeholder="Add a custom quote, description or an epitaph..."
            className="w-full bg-transparent text-sm italic text-gray-300 resize-none focus:outline-none border-none p-0 focus:ring-0 leading-snug text-left"
            rows={2}
          />
        </div>
      </div>

      <hr className="border-gray-700 mb-3 shrink-0" />

      {/* SECTION 2: Identity/Progression & Split Convictions/Failings */}
      <div className="flex flex-col md:grid md:grid-cols-3 md:divide-x md:divide-gray-700/60 shrink-0 py-2 items-start gap-6 md:gap-0">
        
        {/* Left Block: Class, Path & Progression */}
        <div className="w-full md:pr-3 flex flex-col gap-3">
          <div className="flex justify-between items-center bg-black/20 p-2.5 rounded border border-gray-700/50 w-full">
            <div className="flex flex-col items-center flex-1">
              <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Tier</span>
              <span className="text-gray-100 font-bold text-lg leading-none">{char.data.progression.tier}</span>
            </div>
            <div className="w-px h-7 bg-gray-700"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Level</span>
              <span className="text-gray-100 font-bold text-lg leading-none">{char.data.progression.level}</span>
            </div>
            <div className="w-px h-7 bg-gray-700"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">XP</span>
              <span className="text-gray-100 font-bold text-lg leading-none">{char.data.progression.xp}</span>
            </div>
          </div>

          {/* Row on mobile, column on desktop */}
          <div className="flex flex-row md:flex-col justify-between md:justify-start gap-2 md:gap-0 mt-1 w-full">
            <div className="text-center flex-1 md:flex-none">
              <span className="text-gray-500 font-bold uppercase tracking-widest block text-[10px] mb-1">Class</span>
              <span className="text-gray-100 font-bold text-sm md:text-base leading-tight truncate block">{char.data.identity.className || '—'}</span>
            </div>
            <div className="text-center flex-1 md:flex-none">
              <span className="text-gray-500 font-bold uppercase tracking-widest block text-[10px] mb-1">Path</span>
              <span className="text-gray-100 font-bold text-sm md:text-base leading-tight truncate block">{char.data.identity.path || '—'}</span>
            </div>
          </div>
        </div>

        {/* Right Block: Side-by-Side Convictions & Failings */}
        <div className="w-full md:col-span-2 md:pl-4 flex flex-col h-full">
          
          <div className="grid grid-cols-2 gap-4 mb-2 text-center w-full">
            <span className="text-gray-500 font-bold uppercase tracking-widest block text-[10px]">Convictions</span>
            <span className="text-gray-500 font-bold uppercase tracking-widest block text-[10px]">Failings</span>
          </div>

          <div className="flex-1 flex flex-col justify-evenly w-full mt-2 gap-3 md:gap-0">
            {char.data.convictions.length === 0 && (
              <div className="grid grid-cols-2 gap-4 w-full items-center">
                <div className="flex justify-center"><span className="text-gray-600 italic text-sm">—</span></div>
                <div className="flex justify-center"><span className="text-gray-600 italic text-sm">—</span></div>
              </div>
            )}
            
            {char.data.convictions.map((c, i) => {
              const f = char.data.failings.find(fail => fail.convictionIndex === i);
              const hasConv = !!c.name;
              const hasFail = !!(f && f.name);
              
              const convStatement = hasConv ? getEntryByName(c.name)?.data?.statement || '' : '';
              const failStatement = hasFail && f ? getEntryByName(f.name)?.data?.statement || '' : '';

              return (
                <div key={i} className="grid grid-cols-2 gap-4 w-full items-center text-center">
                  <div className="flex justify-center w-full">
                    {hasConv ? (
                      <Tooltip text={convStatement} className="w-auto" noBorder>
                        <span className={`${getSeasonColor(c.season)} font-bold uppercase tracking-[0.2em] text-sm leading-tight cursor-help`}>
                          {c.name}
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="text-gray-600 italic text-sm">—</span>
                    )}
                  </div>
                  <div className="flex justify-center w-full">
                    {hasFail && f ? (
                      <Tooltip text={failStatement} className="w-auto" noBorder>
                        <span className="bg-black text-white font-bold uppercase tracking-[0.2em] text-sm leading-tight px-3 py-1 select-none inline-block shadow-sm cursor-help">
                          {f.name}
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="text-gray-600 italic text-sm">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <hr className="border-gray-700 mt-3 mb-4 shrink-0" />

      {/* SECTION 3: Core Stats (Reordered) */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center shrink-0 mt-auto">
        
        {/* ACCURACY */}
        <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
            <span className="hidden sm:inline">Accuracy</span>
            <span className="sm:hidden">ACC</span>
          </span>
          <span className="font-bold text-lg sm:text-xl text-white leading-none">{char.data.trackers.acc || 0}</span>
        </div>

        {/* EVASION */}
        <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
            <span className="hidden sm:inline">Evasion</span>
            <span className="sm:hidden">EVA</span>
          </span>
          <span className="font-bold text-lg sm:text-xl text-white leading-none">{evasion(char.data)}</span>
        </div>

        {/* ARMOUR */}
        <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
            <span className="hidden sm:inline">Armour</span>
            <span className="sm:hidden">AP</span>
          </span>
          <span className="font-bold text-lg sm:text-xl text-white leading-none">{char.data.trackers.ap}</span>
        </div>

        {/* MOVEMENT */}
        <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
            <span className="hidden sm:inline">Movement</span>
            <span className="sm:hidden">MOV</span>
          </span>
          <span className="font-bold text-lg sm:text-xl text-white leading-none">{movementTiles(char.data)}</span>
        </div>

        {/* BURDEN */}
        <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
            <span className="hidden sm:inline">Burden</span>
            <span className="sm:hidden">BRD</span>
          </span>
          <span className={`font-bold text-lg sm:text-xl leading-none ${isOverburdened ? 'text-red-500' : 'text-white'}`}>
            {currentBurdenVal}<span className="text-[9px] sm:text-[10px] text-gray-500 font-normal">/{maxBurdenVal}</span>
          </span>
        </div>

      </div>
      
    </div>
  );
}