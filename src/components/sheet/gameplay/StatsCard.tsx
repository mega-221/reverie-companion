import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../../types';
import {
  evasion,
  accuracyBonus,
  movementTiles,
  burdenMax,
  calculateBurden,
  getBurdenPenalty,
  isImmobilizedByBurden,
  getEquippedArmourInfo,
  apMax,
} from '../../../calc';
import { useCompendium } from '../../../CompendiumContext';
import { Tooltip } from '../utils';
import { calculateTierFromLevel, getSpendableXp } from '../progression/progressionData';

export default function StatsCard({ char, patch }: { char: Character, patch: any }) {
  const { getEntryByName } = useCompendium();
  const [isArmourModalOpen, setIsArmourModalOpen] = useState(false);

  useEffect(() => {
    if (!isArmourModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsArmourModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isArmourModalOpen]);

  const maxBurdenVal = burdenMax(char.data);
  const currentBurdenVal = calculateBurden(char.data, getEntryByName);
  const burdenPenalty = getBurdenPenalty(char.data, getEntryByName);
  const isOverburdened = burdenPenalty > 0;
  const isImmobilized = isImmobilizedByBurden(char.data, getEntryByName);

  const armourInfo = getEquippedArmourInfo(char.data, getEntryByName);
  const maxAp = apMax(char.data, getEntryByName);
  const currentAp = char.data.trackers.ap ?? 0;
  const bonusAp = char.data.bonus?.ap ?? 0;
  const armourCombatPenalty = armourInfo?.combatRollPenalty ?? 0;
  const armourMovementPenalty = armourInfo?.totalMovementPenalty ?? 0;
  const totalCombatPenalty = burdenPenalty + armourCombatPenalty;

  const baseAcc = (char.data.trackers.acc || 0) + accuracyBonus(char.data);
  const effectiveAcc = baseAcc - totalCombatPenalty;
  const effectiveEva = evasion(char.data);
  const effectiveMov = movementTiles(char.data, getEntryByName);

  const burdenTooltip = isImmobilized
    ? `Threshold: 6 + GRT + Endurance + 2×Carry (${maxBurdenVal})\nOverburdened by ${burdenPenalty}: -${burdenPenalty} on all GRT, REF, and combat rolls.\nImmobilized: Cannot move (-10 penalty reached).`
    : isOverburdened
    ? `Threshold: 6 + GRT + Endurance + 2×Carry (${maxBurdenVal})\nOverburdened by ${burdenPenalty}: -${burdenPenalty} on all GRT, REF, and combat rolls.`
    : `Threshold: 6 + GRT + Endurance + 2×Carry (${maxBurdenVal})\nWithin capacity — no overburden penalty.`;

  const accuracyTooltip =
    totalCombatPenalty > 0
      ? [
          `Base Accuracy: ${baseAcc}`,
          isOverburdened ? `Overburden Penalty: -${burdenPenalty} (all combat rolls)` : '',
          armourCombatPenalty > 0 && armourInfo
            ? `Unmet Armour Carry (${armourInfo.characterCarry}/${armourInfo.requiredCarry}): -${armourCombatPenalty} (combat rolls)`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : `Base Accuracy + Accuracy advancements (${baseAcc})`;

  const movementTooltip = isImmobilized
    ? `Immobilized: Burden penalty reached -${burdenPenalty} (-10 or worse prevents movement).`
    : armourMovementPenalty > 0 && armourInfo
    ? [
        'Base Movement from Athletics + GRT + REF',
        armourInfo.armourMovementPenalty > 0 ? `${armourInfo.category} Armour: -${armourInfo.armourMovementPenalty} tile` : '',
        armourInfo.unmetReqMovementPenalty > 0
          ? `Unmet Carry ${armourInfo.requiredCarry} (current ${armourInfo.characterCarry}): -${armourInfo.unmetReqMovementPenalty} tile`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    : 'Movement speed in tiles based on Athletics + GRT + REF.';

  const armourTooltip = [
    armourInfo
      ? `${armourInfo.name} (${armourInfo.category} Armour): ${currentAp}/${maxAp} AP`
      : `Armour Points: ${currentAp}${maxAp > 0 ? `/${maxAp}` : ''}`,
    armourInfo && armourInfo.resists !== '-' ? `Resists: ${armourInfo.resists}` : '',
    maxAp > 0 && currentAp < maxAp ? `Depleted: ${maxAp - currentAp} AP (restores at end of combat)` : '',
    armourInfo?.stealthDisadvantage ? 'Disadvantage on Stealth checks' : '',
    armourInfo && !armourInfo.meetsCarryReq
      ? `Requires Carry ${armourInfo.requiredCarry} (current ${armourInfo.characterCarry}): -${armourInfo.combatRollPenalty} combat rolls, -1 movement`
      : '',
    'Click to manage AP & view armour details.',
  ]
    .filter(Boolean)
    .join('\n');

  const level = Math.max(0, char.data.progression.level ?? 0);
  const tier = calculateTierFromLevel(level);

  const setCurrentAp = (nextAp: number) => {
    patch({
      trackers: {
        ...char.data.trackers,
        ap: Math.max(0, nextAp),
        apInitialized: true,
      },
    });
  };

  const setBonusAp = (nextBonus: number) => {
    patch({
      bonus: {
        ...char.data.bonus,
        ap: Math.max(0, nextBonus),
      },
    });
  };

  const getSeasonColor = (season?: string) => {
    switch(season) {
      case 'Vamor': return 'rev-keep-color text-red-500'; 
      case 'Bruma': return 'rev-keep-color text-orange-400'; 
      case 'Trumst': return 'rev-keep-color text-blue-400'; 
      case 'Halice': return 'rev-keep-color text-green-500'; 
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
            className="w-full bg-transparent text-sm italic text-gray-300 placeholder:text-gray-500 resize-none focus:outline-none border-none p-0 focus:ring-0 leading-snug text-left"
            rows={2}
          />
        </div>
      </div>

      <hr className="border-gray-700 mb-3 shrink-0" />

      {/* SECTION 2: Identity/Progression & Split Convictions/Failings */}
      <div className="flex flex-col md:grid md:grid-cols-3 md:divide-x md:divide-gray-700/60 shrink-0 py-2 items-start gap-6 md:gap-0">
        
        {/* Left Block: Class, Path & Progression */}
        <div className="w-full md:pr-3 flex flex-col gap-3">
          <div className="rev-stat-box flex justify-between items-center bg-black/20 p-2.5 rounded border border-gray-700/50 w-full">
            <div className="flex flex-col items-center flex-1">
              <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Tier</span>
              <span className="text-gray-100 font-bold text-lg leading-none">{tier}</span>
            </div>
            <div className="rev-stat-divider w-px h-7 bg-gray-700"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Level</span>
              <span className="text-gray-100 font-bold text-lg leading-none">{level}</span>
            </div>
            <div className="rev-stat-divider w-px h-7 bg-gray-700"></div>
            <Tooltip
              text={`Spendable XP: ${getSpendableXp(char.data)}\nTotal Earned XP: ${char.data.progression.xp ?? 0}`}
              className="flex flex-col items-center flex-1"
              noBorder
              noTruncate
            >
              <div className="flex flex-col items-center w-full">
                <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">XP</span>
                <span className={`font-bold text-lg leading-none ${getSpendableXp(char.data) < 0 ? 'rev-keep-color text-red-400' : 'text-gray-100'}`}>
                  {getSpendableXp(char.data)}
                </span>
              </div>
            </Tooltip>
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
                        <span className="rev-dark-card vital-keep-white bg-black text-white font-bold uppercase tracking-[0.2em] text-sm leading-tight px-3 py-1 select-none inline-block shadow-sm cursor-help">
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
        <Tooltip
          text={accuracyTooltip}
          className="w-full"
          noBorder
          noTruncate
        >
          <div className="rev-stat-box w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border border-gray-700/50">
            <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
              <span className="hidden sm:inline">Accuracy</span>
              <span className="sm:hidden">ACC</span>
            </span>
            <span className={`font-bold text-lg sm:text-xl leading-none ${effectiveAcc < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
              {effectiveAcc}
            </span>
          </div>
        </Tooltip>

        {/* EVASION */}
        <div className="rev-stat-box flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
            <span className="hidden sm:inline">Evasion</span>
            <span className="sm:hidden">EVA</span>
          </span>
          <span className={`font-bold text-lg sm:text-xl leading-none ${effectiveEva < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>{effectiveEva}</span>
        </div>

        {/* ARMOUR */}
        <Tooltip
          text={armourTooltip}
          className="w-full"
          noBorder
          noTruncate
        >
          <button
            type="button"
            onClick={() => setIsArmourModalOpen(true)}
            className={`w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border transition-colors cursor-pointer hover:bg-white/5 ${
              maxAp > 0 && currentAp < maxAp
                ? 'border-amber-700/70 hover:border-amber-500'
                : 'rev-stat-box border-gray-700/50 hover:border-gray-500'
            }`}
          >
            <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
              <span className="hidden sm:inline">Armour</span>
              <span className="sm:hidden">AP</span>
            </span>
            <span
              className={`font-bold text-lg sm:text-xl leading-none tabular-nums ${
                currentAp < 0
                  ? 'rev-keep-color text-red-500'
                  : maxAp > 0 && currentAp < maxAp
                  ? 'text-amber-400'
                  : currentAp > maxAp
                  ? 'text-cyan-300'
                  : 'text-white'
              }`}
            >
              {currentAp}
              {maxAp > 0 && (
                <span className="text-[9px] sm:text-[10px] text-gray-500 font-normal">/{maxAp}</span>
              )}
            </span>
          </button>
        </Tooltip>

        {/* MOVEMENT */}
        <Tooltip
          text={movementTooltip}
          className="w-full"
          noBorder
          noTruncate
        >
          <div className="rev-stat-box w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border border-gray-700/50">
            <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
              <span className="hidden sm:inline">Movement</span>
              <span className="sm:hidden">MOV</span>
            </span>
            <span className={`font-bold text-lg sm:text-xl leading-none ${effectiveMov < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
              {effectiveMov}
            </span>
          </div>
        </Tooltip>

        {/* BURDEN */}
        <Tooltip
          text={burdenTooltip}
          className="w-full"
          noBorder
          noTruncate
        >
          <div className="rev-stat-box w-full flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 sm:py-2.5 border border-gray-700/50">
            <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest mb-1 sm:mb-1.5">
              <span className="hidden sm:inline">Burden</span>
              <span className="sm:hidden">BRD</span>
            </span>
            <span className={`font-bold text-lg sm:text-xl leading-none ${isOverburdened || currentBurdenVal < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
              {currentBurdenVal}<span className="text-[9px] sm:text-[10px] text-gray-500 font-normal">/{maxBurdenVal}</span>
            </span>
          </div>
        </Tooltip>

      </div>

      {isArmourModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsArmourModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="sheet-modal max-w-md w-full animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
              <h3 className="font-cinzel font-bold text-xl text-gray-200">Armour &amp; Protection</h3>
              <button
                type="button"
                onClick={() => setIsArmourModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              {/* Current AP Controls */}
              <div className="bg-black/30 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Current Armour Points
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Reduces incoming DMG. Depleted AP restores at end of combat.
                    </div>
                  </div>
                  <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm h-10 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrentAp(currentAp - 1)}
                      disabled={currentAp <= 0}
                      className="w-9 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 font-bold text-lg"
                      title="Deplete 1 AP"
                    >
                      −
                    </button>
                    <div className="px-3 text-center font-bold flex items-baseline gap-1 select-none tabular-nums">
                      <span
                        className={`text-xl ${
                          currentAp < 0
                            ? 'rev-keep-color text-red-500'
                            : maxAp > 0 && currentAp < maxAp
                            ? 'text-amber-400'
                            : currentAp > maxAp
                            ? 'text-cyan-300'
                            : 'text-white'
                        }`}
                      >
                        {currentAp}
                      </span>
                      {maxAp > 0 && (
                        <span className="text-xs text-gray-500 font-normal">/ {maxAp}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentAp(currentAp + 1)}
                      className="w-9 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white font-bold text-lg"
                      title="Gain / Restore 1 AP"
                    >
                      +
                    </button>
                  </div>
                </div>

                {currentAp < maxAp && (
                  <button
                    type="button"
                    onClick={() => setCurrentAp(maxAp)}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-200 transition-colors"
                  >
                    End Combat · Restore Depleted AP ({currentAp} → {maxAp})
                  </button>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Bonus / Obtained Max AP
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Permanent or passive AP from abilities &amp; features
                    </div>
                  </div>
                  <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg h-8 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setBonusAp(bonusAp - 1)}
                      disabled={bonusAp <= 0}
                      className="w-8 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 font-bold"
                    >
                      −
                    </button>
                    <span className="px-2.5 text-sm font-bold text-gray-200 tabular-nums">{bonusAp}</span>
                    <button
                      type="button"
                      onClick={() => setBonusAp(bonusAp + 1)}
                      className="w-8 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Equipped Armour Summary */}
              {armourInfo ? (
                <div className="bg-black/30 border border-gray-700 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-cinzel font-bold text-base text-gray-100 truncate">
                      {armourInfo.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-800 border border-gray-600 text-gray-200 shrink-0">
                      {armourInfo.category} Armour
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-gray-900/60 p-2 rounded border border-gray-800">
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Armour AP</div>
                      <div className="text-sm font-bold text-cyan-300">{armourInfo.ap}</div>
                    </div>
                    <div className="border-x border-gray-800">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Resists</div>
                      <div className="text-sm font-bold text-amber-300">{armourInfo.resists}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Carry Req</div>
                      <div className={`text-sm font-bold ${armourInfo.meetsCarryReq ? 'rev-keep-color text-green-400' : 'rev-keep-color text-red-400'}`}>
                        {armourInfo.requiredCarry > 0 ? `${armourInfo.characterCarry}/${armourInfo.requiredCarry}` : 'None'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    {!armourInfo.stealthDisadvantage && armourInfo.armourMovementPenalty === 0 && armourInfo.meetsCarryReq && (
                      <p className="text-green-400/90">No movement or skill penalties.</p>
                    )}
                    {armourInfo.stealthDisadvantage && (
                      <p className="text-amber-300">• Disadvantage on Stealth checks ({armourInfo.category} Armour)</p>
                    )}
                    {armourInfo.armourMovementPenalty > 0 && (
                      <p className="text-amber-300">• -{armourInfo.armourMovementPenalty} tile Movement ({armourInfo.category} Armour)</p>
                    )}
                    {!armourInfo.meetsCarryReq && (
                      <p className="rev-keep-color text-red-400 font-semibold">
                        • Carry {armourInfo.requiredCarry} required (you have {armourInfo.characterCarry}): -{armourInfo.combatRollPenalty} penalty to combat rolls &amp; -1 tile Movement.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-black/20 border border-dashed border-gray-700 rounded-xl p-4 text-center text-xs text-gray-500 italic">
                  No armour equipped in Loadout.
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      
    </div>
  );
}