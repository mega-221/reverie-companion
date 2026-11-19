import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../types';
import { vigorMax, strainMax, dpMax, apMax } from '../../calc';
import { useCompendium } from '../../CompendiumContext';
import VitalsCard from './gameplay/VitalsCard';

export default function Header({ 
  char, onBack, onSave, saving, saved, hasUnsavedChanges, showPulse, updateTracker, readOnly, onOpenSettings
}: { 
  char: Character, 
  onBack: () => void, 
  onSave: () => void, 
  saving: boolean, 
  saved: boolean,
  hasUnsavedChanges?: boolean,
  showPulse?: boolean,
  updateTracker: (k: 'vigor' | 'strain' | 'dp' | 'ap' | 'acc', amount: number) => void,
  readOnly?: boolean,
  onOpenSettings?: () => void
}) {
  const { getEntryByName } = useCompendium();
  const maxAp = apMax(char.data, getEntryByName);
  const currentAp = char.data.trackers.ap ?? 0;
  const [vitalsOpen, setVitalsOpen] = useState(false);

  const convictionList = char.data.convictions.map(c => c.name).filter(Boolean);
  const classPathDisplay = [char.data.identity.className, char.data.identity.path].filter(Boolean).join(', ');

  return (
    <>
      <header className="sticky top-0 z-40 rev-header-bar shadow-md w-full transition-colors duration-300">
        <div className="w-full px-3 sm:px-4 py-3 flex justify-between items-center overflow-x-hidden gap-2">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="hover:text-white transition-colors text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 shrink-0"
              style={{ color: 'var(--rev-header-muted)' }}
            >
              ← Back
            </button>
            <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--rev-header-border)' }}></div>
            
            <h1 className="text-lg sm:text-2xl font-cinzel first-letter:font-cinzelDeco font-bold truncate shrink-0 max-w-[140px] sm:max-w-xs">
              {char.name || 'Unnamed Character'}
            </h1>

            {(classPathDisplay || convictionList.length > 0) && (
              <div className="hidden lg:flex items-center gap-3 text-sm italic min-w-0" style={{ color: 'var(--rev-header-muted)' }}>
                <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--rev-header-border)' }}></div>
                {classPathDisplay && (
                  <span className="shrink-0 whitespace-nowrap">{classPathDisplay}</span>
                )}
                {classPathDisplay && convictionList.length > 0 && (
                  <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--rev-header-border)' }}></div>
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
              className="md:hidden px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium shadow-sm text-white shrink-0 transition-colors"
              style={{ backgroundColor: 'var(--rev-header-btn)', border: '1px solid var(--rev-header-border)' }}
            >
              Vitals
            </button>

            <button
              type="button"
              onClick={() => setVitalsOpen(true)}
              title="Open quick vitals editor"
              className="hidden md:flex gap-4 lg:gap-6 text-sm font-bold px-3 py-1.5 rounded border border-transparent hover:bg-white/10 focus:outline-none transition-colors tabular-nums"
            >
              <span title="Vigor">
                VG:{' '}
                <span className={char.data.trackers.vigor < 0 ? 'rev-keep-color text-red-400' : ''}>
                  {char.data.trackers.vigor}
                </span>
                /{vigorMax(char.data)}
              </span>
              <span title="Strain">
                SN:{' '}
                <span className={char.data.trackers.strain < 0 ? 'rev-keep-color text-red-400' : ''}>
                  {char.data.trackers.strain}
                </span>
                /{strainMax(char.data)}
              </span>
              <span title="Destiny">
                DP:{' '}
                <span className={char.data.trackers.dp < 0 ? 'rev-keep-color text-red-400' : ''}>
                  {char.data.trackers.dp}
                </span>
                /{dpMax(char.data)}
              </span>
            </button>
            <div
              className="hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded border shrink-0 tabular-nums"
              style={{ backgroundColor: 'var(--rev-header-btn)', borderColor: 'var(--rev-header-border)' }}
            >
              <span>Tier {char.data.progression.tier}</span>
              <div className="w-px h-5 shrink-0 mx-1" style={{ backgroundColor: 'var(--rev-header-border)' }}></div>
              <span>Lvl {char.data.progression.level}</span>
            </div>
            {readOnly ? (
              <span className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-black/30 border border-white/20 text-white shrink-0">
                Read-Only View
              </span>
            ) : (
              <button 
                onClick={onSave} 
                disabled={saving} 
                title={hasUnsavedChanges ? 'You have unsaved changes' : 'Save character'}
                className={`px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium shadow-sm transition-colors flex items-center gap-1.5 ${
                  saved
                    ? 'bg-green-600 text-white'
                    : hasUnsavedChanges
                    ? 'rev-btn-primary ring-1 ring-white/40'
                    : 'rev-btn-primary'
                }`}
              >
                {hasUnsavedChanges && !saving && !saved && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                )}
                <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}</span>
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Settings"
                title="Settings"
                className="p-1.5 rounded border text-white hover:opacity-90 transition-colors shrink-0"
                style={{ backgroundColor: 'var(--rev-header-btn)', borderColor: 'var(--rev-header-border)' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
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
                    <span className={`px-2 text-sm font-bold tabular-nums ${currentAp < 0 ? 'rev-keep-color text-red-500' : currentAp < maxAp ? 'text-amber-400' : currentAp > maxAp ? 'text-cyan-300' : 'text-white'}`}>
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