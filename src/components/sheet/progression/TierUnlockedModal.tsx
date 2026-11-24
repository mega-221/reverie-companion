import { createPortal } from 'react-dom';
import {
  ADVANCEMENT_NODES,
  ADVANCEMENT_CATEGORY_HEX,
  getTierDefinition,
  getTierGains,
  isNodeAvailableInTier,
} from './progressionData';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../../hooks/useEscapeKey';

export default function TierUnlockedModal({
  tier,
  onClose,
}: {
  tier: number | null;
  onClose: () => void;
}) {
  useBodyScrollLock(Boolean(tier && tier > 0));

  useEscapeKey(Boolean(tier && tier > 0), onClose);

  if (!tier || tier <= 0 || typeof document === 'undefined') return null;

  const tierDef = getTierDefinition(tier);
  const boons = getTierGains(tier);
  const availableAdvancements = ADVANCEMENT_NODES.filter(n => isNodeAvailableInTier(n, tier));

  return createPortal(
    <div
      className="fixed inset-0 z-[210] rev-backdrop flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="sheet-modal max-w-lg w-full max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Clean Rectangular Header */}
        <div className="flex items-start justify-between gap-4 p-4 sm:px-6 border-b border-gray-700 bg-black/20 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest mb-1">
              <span className="text-purple-400">Tier {tierDef.tier} Reached</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400">{tierDef.levelRange}</span>
            </div>
            <h2 className="font-spectral font-bold text-2xl text-gray-100 truncate">
              {tierDef.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:px-6 overflow-y-auto space-y-5">


          {/* Boons Gained */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">
              Tier Boons
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {boons.map((boon, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-700/80 bg-black/25 px-3 py-2 flex items-center gap-2.5"
                >
                  <span className="w-2 h-2 rotate-45 bg-purple-400/80 shrink-0" />
                  <span className="font-semibold text-xs text-gray-200">
                    {boon.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Available Advancements */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">
              Available Advancements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableAdvancements.map(node => {
                const isExclusiveToThisTier =
                  !node.allTiers && node.tiers.length === 1 && node.tiers[0] === tier;
                const diamondHex = ADVANCEMENT_CATEGORY_HEX[node.category];

                return (
                  <div
                    key={node.type}
                    className="rounded-lg border border-gray-700/80 bg-black/25 px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rotate-45 shrink-0"
                        style={{
                          backgroundColor: diamondHex,
                          boxShadow: `0 0 6px ${diamondHex}`,
                        }}
                      />
                      <span className="font-semibold text-xs text-gray-200 truncate">
                        {node.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isExclusiveToThisTier && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/70 text-purple-200">
                          New
                        </span>
                      )}
                      <span className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-black/50 border border-gray-700 text-gray-300">
                        ×{node.maxPerTier}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-gray-700 bg-black/20 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-white font-bold text-sm transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
