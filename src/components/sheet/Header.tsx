import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../types';
import { vigorMax, strainMax, dpMax, apMax } from '../../calc';
import { useCompendium } from '../../CompendiumContext';
import VitalsCard from './gameplay/VitalsCard';

export default function Header({ 
  char, onBack, onSave, saving, saved, hasUnsavedChanges, onNameSave, showPulse, updateTracker
}: { 
  char: Character, 
  onBack: () => void, 
  onSave: () => void, 
  saving: boolean, 
  saved: boolean,
  hasUnsavedChanges?: boolean,
  onNameSave: (name: string) => void,
  showPulse?: boolean,
  updateTracker: (k: 'vigor' | 'strain' | 'dp' | 'ap' | 'acc', amount: number) => void
}) {
  const { getEntryByName } = useCompendium();
  const maxAp = apMax(char.data, getEntryByName);
  const currentAp = char.data.trackers.ap ?? 0;
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [vitalsOpen, setVitalsOpen] = useState(false);

  const convictionList = char.data.convictions.map(c => c.name).filter(Boolean);
  const classPathDisplay = [char.data.identity.className, char.data.identity.path].filter(Boolean).join(', ');

  const handleSave = () => {
    if (!tempName.trim() || tempName === char.name) { 
      setIsEditingName(false); 
      return; 
    }
    onNameSave(tempName);
    setIsEditingName(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-red-950 text-white shadow-md border-b border-red-900 w-full transition-colors duration-1000">
        <div className="w-full px-3 sm:px-4 py-3 flex justify-between items-center overflow-x-hidden gap-2">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
            <button onClick={onBack} className="text-red-300 hover:text-white transition-colors text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 shrink-0">
              ← Back
            </button>
            <div className="w-px h-5 bg-red-800 shrink-0"></div>
            
            {isEditingName ? (
              <input 
                type="text" 
                className="text-lg sm:text-2xl font-cinzel font-bold bg-red-900 text-white border-b-2 border-red-400 focus:outline-none px-2 py-1 rounded w-36 sm:w-64" 
                value={tempName} 
                onChange={(e) => setTempName(e.target.value)} 
                onBlur={handleSave} 
                onKeyDown={(e) => e.key === 'Enter' && handleSave()} 
                autoFocus 
              />
            ) : (
              <h1 
                onClick={() => { setTempName(char.name); setIsEditingName(true); }} 
                className="text-lg sm:text-2xl font-cinzel first-letter:font-cinzelDeco font-bold truncate cursor-pointer hover:text-red-200 transition-colors shrink-0 max-w-[140px] sm:max-w-xs" 
                title="Click to rename"
              >
                {char.name || 'Unnamed Character'}
              </h1>
            )}

            {(classPathDisplay || convictionList.length > 0) && (
              <div className="hidden lg:flex items-center gap-3 text-sm italic text-red-200 min-w-0">
                <div className="w-px h-5 bg-red-800 shrink-0"></div>
                {classPathDisplay && (
                  <span className="shrink-0 whitespace-nowrap">{classPathDisplay}</span>
                )}
                {classPathDisplay && convictionList.length > 0 && (
                  <div className="w-px h-5 bg-red-800 shrink-0"></div>
                )}
                {convictionList.length > 0 && (
                  <span className="truncate">{convictionList.join(' • ')}</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 shrink-0">
            
            {/* Heart Attack Indicator */}
            {showPulse && (
              <div className="hidden md:flex items-center animate-pulse">
                <span className="text-cyan-400 font-cinzel font-bold text-lg tracking-[0.2em] drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                  ~ Heart Attack ~
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setVitalsOpen(true)}
              title="Open quick vitals editor"
              aria-label="Open quick vitals"
              className="md:hidden px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium shadow-sm bg-red-900 hover:bg-red-800 text-red-100 shrink-0 transition-colors"
            >
              Vitals
            </button>

            <button
              type="button"
              onClick={() => setVitalsOpen(true)}
              title="Open quick vitals editor"
              className="hidden md:flex gap-4 lg:gap-6 text-sm font-bold px-3 py-1.5 rounded border border-transparent hover:border-red-800 hover:bg-red-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
            >
              <span title="Vigor">
                VG:{' '}
                <span className={char.data.trackers.vigor < 0 ? 'text-red-400' : ''}>
                  {char.data.trackers.vigor}
                </span>
                /{vigorMax(char.data)}
              </span>
              <span title="Strain">
                SN:{' '}
                <span className={char.data.trackers.strain < 0 ? 'text-red-400' : ''}>
                  {char.data.trackers.strain}
                </span>
                /{strainMax(char.data)}
              </span>
              <span title="Destiny">
                DP:{' '}
                <span className={char.data.trackers.dp < 0 ? 'text-red-400' : ''}>
                  {char.data.trackers.dp}
                </span>
                /{dpMax(char.data)}
              </span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold bg-red-900/50 px-3 py-1.5 rounded border border-red-800 shrink-0">
              <span>Tier {char.data.progression.tier}</span>
              <div className="w-px h-5 bg-red-800 shrink-0 mx-1"></div>
              <span>Lvl {char.data.progression.level}</span>
            </div>
            <button 
              onClick={onSave} 
              disabled={saving} 
              title={hasUnsavedChanges ? 'You have unsaved changes' : 'Save character'}
              className={`px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium shadow-sm transition-colors flex items-center gap-1.5 ${
                saved
                  ? 'bg-green-600'
                  : hasUnsavedChanges
                  ? 'bg-red-700 hover:bg-red-600 ring-1 ring-white/40'
                  : 'bg-red-700 hover:bg-red-600'
              }`}
            >
              {hasUnsavedChanges && !saving && !saved && (
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              )}
              <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}</span>
            </button>
          </div>
        </div>
      </header>

      {vitalsOpen && createPortal(
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setVitalsOpen(false)}
        >
          <div
            className="sheet-modal max-w-md max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
              <h2 className="font-cinzel font-bold text-xl text-gray-200">Vitals</h2>
              <button onClick={() => setVitalsOpen(false)} className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2">×</button>
            </div>
            <div className="p-4 overflow-y-auto flex flex-col gap-3">
              <VitalsCard char={char} updateTracker={updateTracker} />
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Armour Points (AP)</span>
                  <span className="text-[11px] text-gray-500">
                    {maxAp > 0 && currentAp < maxAp
                      ? `${maxAp - currentAp} depleted (restores after combat)`
                      : maxAp > 0
                      ? 'Active damage reduction'
                      : 'No armour equipped'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {currentAp < maxAp && (
                    <button
                      type="button"
                      onClick={() => updateTracker('ap', maxAp - currentAp)}
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-800 text-cyan-200"
                    >
                      Restore
                    </button>
                  )}
                  <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm h-8 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateTracker('ap', -1)}
                      disabled={currentAp <= 0}
                      className="w-8 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 font-bold"
                    >
                      −
                    </button>
                    <span className={`px-2 text-sm font-bold tabular-nums ${currentAp < maxAp ? 'text-amber-400' : currentAp > maxAp ? 'text-cyan-300' : 'text-white'}`}>
                      {currentAp}{maxAp > 0 ? <span className="text-xs text-gray-500 font-normal">/{maxAp}</span> : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateTracker('ap', 1)}
                      className="w-8 h-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}