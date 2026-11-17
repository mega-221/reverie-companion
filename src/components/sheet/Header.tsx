import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../types';
import { vigorMax, strainMax, dpMax } from '../../calc';
import VitalsCard from './VitalsCard';

export default function Header({ 
  char, onBack, onSave, saving, saved, onNameSave, showPulse, updateTracker
}: { 
  char: Character, 
  onBack: () => void, 
  onSave: () => void, 
  saving: boolean, 
  saved: boolean, 
  onNameSave: (name: string) => void,
  showPulse?: boolean,
  updateTracker: (k: 'vigor' | 'strain' | 'dp' | 'ap' | 'acc', amount: number) => void
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [vitalsOpen, setVitalsOpen] = useState(false);

  const convictionNames = char.data.convictions.map(c => c.name).filter(Boolean).join(' • ');

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
        <div className="w-full px-4 py-3 flex justify-between items-center overflow-x-hidden">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={onBack} className="text-red-300 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider flex items-center gap-2 shrink-0">
              ← Back
            </button>
            <div className="hidden lg:block w-px h-5 bg-red-800 shrink-0"></div>
            
            {isEditingName ? (
              <input 
                type="text" 
                className="text-2xl font-cinzel font-bold bg-red-900 text-white border-b-2 border-red-400 focus:outline-none px-2 py-1 rounded w-48 sm:w-64" 
                value={tempName} 
                onChange={(e) => setTempName(e.target.value)} 
                onBlur={handleSave} 
                onKeyDown={(e) => e.key === 'Enter' && handleSave()} 
                autoFocus 
              />
            ) : (
              <h1 
                onClick={() => { setTempName(char.name); setIsEditingName(true); }} 
                className="text-2xl font-cinzel first-letter:font-cinzelDeco font-bold truncate cursor-pointer hover:text-red-200 transition-colors shrink-0 max-w-[200px] sm:max-w-xs" 
                title="Click to rename"
              >
                {char.name || 'Unnamed Character'}
              </h1>
            )}

            <div className="hidden lg:flex items-center gap-3 text-sm italic text-red-200 truncate">
              {char.data.identity.className && (
                <span className="truncate">{char.data.identity.className} {char.data.identity.path && `(${char.data.identity.path})`}</span>
              )}
              {char.data.identity.className && convictionNames && <div className="w-px h-5 bg-red-800 shrink-0"></div>}
              {convictionNames && <span className="truncate">{convictionNames}</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-6 shrink-0 ml-4">
            
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
              className="hidden md:flex gap-4 lg:gap-6 text-sm font-bold px-3 py-1.5 rounded border border-transparent hover:border-red-800 hover:bg-red-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
            >
              <span title="Vigor">VG: {char.data.trackers.vigor}/{vigorMax(char.data)}</span>
              <span title="Strain">SN: {char.data.trackers.strain}/{strainMax(char.data)}</span>
              <span title="Destiny">DP: {char.data.trackers.dp}/{dpMax(char.data)}</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold bg-red-900/50 px-3 py-1.5 rounded border border-red-800 shrink-0">
              <span>Tier {char.data.progression.tier}</span>
              <div className="w-px h-5 bg-red-800 shrink-0 mx-1"></div>
              <span>Lvl {char.data.progression.level}</span>
            </div>
            <button 
              onClick={onSave} 
              disabled={saving} 
              className={`px-4 py-1.5 rounded text-sm font-medium shadow-sm transition-colors ${saved ? 'bg-green-600' : 'bg-red-700 hover:bg-red-600'}`}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
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
            <div className="p-4 overflow-y-auto">
              <VitalsCard char={char} updateTracker={updateTracker} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}