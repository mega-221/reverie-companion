import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { getSeasonHex } from '../../../constants/reverie';

interface ConvictionChoice {
  name: string;
  season: string;
  rank: number;
}

interface StrainConvictionPromptModalProps {
  currentStrain: number;
  strainMaxVal: number;
  convictions: ConvictionChoice[];
  onSelectConviction: (conviction: ConvictionChoice) => void;
}

export default function StrainConvictionPromptModal({
  currentStrain,
  strainMaxVal,
  convictions,
  onSelectConviction,
}: StrainConvictionPromptModalProps) {
  useBodyScrollLock(true);

  return createPortal(
    <div
      className="fixed inset-0 z-[410] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Strain Limit Conviction Check"
    >
      <div className="rev-dark-card w-full max-w-md bg-[#0e0b10] border-2 border-red-800/80 rounded-xl shadow-[0_0_60px_rgba(220,38,38,0.3)] overflow-hidden">
        <div className="px-5 py-4 border-b border-red-900/50 bg-red-950/40">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">
            Standing On The Edge · CL 18
          </div>
          <h2 className="font-spectral font-bold text-xl text-white mt-0.5">
            Strain Limit Reached ({currentStrain}/{strainMaxVal})
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-neutral-300 leading-relaxed">
            Your Strain has reached its limit. Choose a Conviction to test against{' '}
            <strong className="text-white">CL 18</strong> (<code className="text-amber-300">3d6 + Conviction Rank</code>).
            Failing this check will immediately trigger a <strong className="text-red-400">Crisis</strong>.
          </p>

          {convictions.length > 0 ? (
            <div className="space-y-2">
              {convictions.map((c) => {
                const sColor = getSeasonHex(c.season);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => onSelectConviction(c)}
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-lg border border-white/15 bg-black/40 hover:bg-white/10 hover:border-red-500/60 flex items-center justify-between gap-3 transition-all text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rotate-45 shrink-0"
                        style={{ backgroundColor: sColor, boxShadow: `0 0 8px ${sColor}` }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate">
                          {c.name}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                          {c.season}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-base text-white shrink-0 tabular-nums">
                      +{c.rank} <span className="text-xs text-red-300 font-sans ml-1">Roll →</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelectConviction({ name: 'Unconvicted', season: '', rank: 0 })}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-lg border border-red-800/70 bg-red-950/40 hover:bg-red-900/50 text-sm font-bold text-red-100 transition-colors"
            >
              Roll Without Conviction (+0 vs CL 18) →
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
