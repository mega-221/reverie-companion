import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PartyNotificationPayload } from '../../types';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { getItemDisplayLabel } from '../../utils/itemTransfer';

export type GiveTargetCharacter = {
  id: string;
  name: string;
};

export default function PartyNotificationPopup({
  notification,
  queueCount = 1,
  giveTargets,
  onRespondGive,
  onRespondCrisis,
  onRespondItemTransfer,
  onInitiateRoll,
  onDismiss,
}: {
  notification: PartyNotificationPayload | null;
  queueCount?: number;
  giveTargets?: GiveTargetCharacter[];
  onRespondGive?: (
    notification: PartyNotificationPayload,
    accepted: boolean,
    targetCharacterId?: string
  ) => Promise<void> | void;
  onRespondCrisis?: (
    notification: PartyNotificationPayload,
    accepted: boolean,
    targetCharacterId?: string
  ) => Promise<void> | void;
  onRespondItemTransfer?: (
    notification: PartyNotificationPayload,
    accepted: boolean
  ) => Promise<void> | void;
  onInitiateRoll?: (skillName: string, challengeLevel: number) => void;
  onDismiss: (id: string) => void;
}) {
  const [rendered, setRendered] = useState<PartyNotificationPayload | null>(notification);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [responding, setResponding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useBodyScrollLock(Boolean(rendered));

  useEffect(() => {
    if (notification) {
      setVisible(false);
      setRendered(notification);
      setClosing(false);
      setResponding(false);
      setActionError(null);
      setSelectedTargetId(giveTargets?.[0]?.id || '');
      let raf1 = 0;
      let raf2 = 0;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    } else {
      setVisible(false);
      setRendered(null);
      setClosing(false);
      setResponding(false);
      setActionError(null);
    }
  }, [notification]);

  useEffect(() => {
    if (!selectedTargetId && giveTargets && giveTargets.length > 0) {
      setSelectedTargetId(giveTargets[0].id);
    }
  }, [giveTargets, selectedTargetId]);

  const isGive =
    rendered?.type === 'give' &&
    Boolean(rendered.grantResource) &&
    typeof rendered.grantAmount === 'number' &&
    rendered.grantAmount > 0;
  const isCrisis = rendered?.type === 'crisis';
  const isItemTransfer = rendered?.type === 'item_transfer' && Boolean(rendered.itemTransfer);
  const isActionable = isGive || isCrisis || isItemTransfer;

  const handleClose = () => {
    if (!rendered || closing || responding) return;
    setClosing(true);
    setVisible(false);
    const idToDismiss = rendered.id;
    window.setTimeout(() => {
      onDismiss(idToDismiss);
    }, 300);
  };

  const handleActionDecision = async (accepted: boolean) => {
    if (!rendered || closing || responding) return;
    setActionError(null);
    setResponding(true);
    const targetId = accepted ? selectedTargetId || giveTargets?.[0]?.id : undefined;
    try {
      if (isItemTransfer) {
        await onRespondItemTransfer?.(rendered, accepted);
      } else if (isCrisis) {
        await onRespondCrisis?.(rendered, accepted, targetId);
      } else {
        await onRespondGive?.(rendered, accepted, targetId);
      }
      setClosing(true);
      setVisible(false);
      const idToDismiss = rendered.id;
      window.setTimeout(() => {
        onDismiss(idToDismiss);
      }, 300);
    } catch (err: any) {
      setActionError(
        err?.message ||
          (isItemTransfer
            ? 'Could not process item transfer.'
            : isCrisis
            ? 'Could not open Resolve Crisis.'
            : 'Could not apply reward.')
      );
      setResponding(false);
    }
  };

  useEscapeKey(Boolean(rendered) && !isActionable, handleClose);

  if (!rendered) return null;

  const canAcceptAction =
    !responding && (isItemTransfer || !giveTargets || giveTargets.length > 0);
  const resourceLabel =
    rendered.grantResource === 'dp'
      ? rendered.grantAmount === 1
        ? 'Destiny Point'
        : 'Destiny Points'
      : 'XP';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="party-notif-title"
      onClick={() => {
        if (!isActionable) handleClose();
      }}
      className={`fixed inset-0 z-[290] flex items-center justify-center p-3 sm:p-4 rev-backdrop overflow-y-auto no-scrollbar transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${closing ? 'pointer-events-none' : ''}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`sheet-modal w-full max-w-md max-h-[88vh] max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        <div className="px-5 py-3.5 border-b rev-divider rev-inset-soft flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-xs font-bold uppercase tracking-wider truncate"
              style={{ color: 'var(--rev-badge-warn)' }}
            >
              {rendered.partyName}
            </span>
            <span style={{ color: 'var(--rev-text-faint)' }}>·</span>
            <span className="text-xs truncate" style={{ color: 'var(--rev-text-muted)' }}>
              From {rendered.senderName}
            </span>
          </div>
          {queueCount > 1 && (
            <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: 'var(--rev-text-muted)' }}>
              1 of {queueCount}
            </span>
          )}
        </div>

        <div className="p-5 sm:p-6 flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-4">
          <h3
            id="party-notif-title"
            className="font-spectral font-bold text-xl leading-snug"
            style={{ color: 'var(--rev-text-bright)' }}
          >
            {rendered.title}
          </h3>

          {isGive && (
            <div className="rev-inset flex flex-col gap-2.5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                  Gift Offered
                </span>
                <span
                  className="font-bold text-lg tabular-nums"
                  style={{ color: 'var(--rev-accent-text)' }}
                >
                  +{rendered.grantAmount} {resourceLabel}
                </span>
              </div>

              {giveTargets && giveTargets.length > 1 && (
                <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                  <span className="font-bold uppercase tracking-wider text-[11px]">Receiving Character</span>
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    disabled={responding}
                    className="rev-input px-2.5 py-1.5 text-sm font-bold"
                  >
                    {giveTargets.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {giveTargets && giveTargets.length === 1 && (
                <div className="text-xs flex items-center justify-between gap-2" style={{ color: 'var(--rev-text-muted)' }}>
                  <span>Receiving Character:</span>
                  <strong style={{ color: 'var(--rev-text-bright)' }}>{giveTargets[0].name}</strong>
                </div>
              )}
            </div>
          )}

          {isItemTransfer && rendered.itemTransfer && (
            <div className="rev-inset flex flex-col gap-2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                  Item Offered
                </span>
                <span className="font-bold text-sm" style={{ color: 'var(--rev-accent-text)' }}>
                  {rendered.itemTransfer.item.qty}× {getItemDisplayLabel(rendered.itemTransfer.item)}
                </span>
              </div>
              <div className="text-xs flex items-center justify-between gap-2" style={{ color: 'var(--rev-text-muted)' }}>
                <span>Recipient Character:</span>
                <strong style={{ color: 'var(--rev-text-bright)' }}>{rendered.itemTransfer.toCharName}</strong>
              </div>
            </div>
          )}

          {isCrisis && (
            <div className="rev-inset flex flex-col gap-2.5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                  Breaking Point
                </span>
                <span className="rev-keep-color font-bold text-sm uppercase tracking-wider text-red-400">
                  Resolve Crisis
                </span>
              </div>

              {giveTargets && giveTargets.length > 1 && (
                <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                  <span className="font-bold uppercase tracking-wider text-[11px]">Affected Character</span>
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    disabled={responding}
                    className="rev-input px-2.5 py-1.5 text-sm font-bold"
                  >
                    {giveTargets.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {giveTargets && giveTargets.length === 1 && (
                <div className="text-xs flex items-center justify-between gap-2" style={{ color: 'var(--rev-text-muted)' }}>
                  <span>Affected Character:</span>
                  <strong style={{ color: 'var(--rev-text-bright)' }}>{giveTargets[0].name}</strong>
                </div>
              )}
            </div>
          )}

          {!isActionable && rendered.skill && (
            <div className="rev-inset flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold" style={{ color: 'var(--rev-text-bright)' }}>
                  {rendered.skill}
                </span>
                {typeof rendered.challengeLevel === 'number' && (
                  <span
                    className="text-xs font-bold uppercase tracking-wider tabular-nums px-2 py-0.5 rounded border"
                    style={{ color: 'var(--rev-badge-warn)', borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.1)' }}
                  >
                    CL {rendered.challengeLevel}
                  </span>
                )}
              </div>
              {onInitiateRoll && (
                <button
                  type="button"
                  onClick={() => {
                    onInitiateRoll(rendered.skill!, rendered.challengeLevel ?? 12);
                    handleClose();
                  }}
                  className="px-3.5 py-1.5 rounded text-xs font-bold rev-btn-primary shadow-sm"
                >
                  Roll {rendered.skill} (CL {rendered.challengeLevel ?? 12})
                </button>
              )}
            </div>
          )}

          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--rev-text-secondary)' }}>
            {rendered.message}
          </p>

          {actionError && (
            <div className="sheet-panel-red text-xs p-2.5" style={{ color: 'var(--rev-accent-text)' }}>
              {actionError}
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-3 border-t rev-divider-subtle shrink-0">
          {isActionable ? (
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={responding}
                onClick={() => handleActionDecision(false)}
                className="flex-1 sm:flex-initial px-4 py-2 text-sm font-bold rev-btn-secondary disabled:opacity-40"
              >
                {isItemTransfer ? 'Return' : 'Reject'}
              </button>
              <button
                type="button"
                disabled={!canAcceptAction}
                onClick={() => handleActionDecision(true)}
                className="flex-1 sm:flex-initial px-5 py-2 text-sm font-bold rev-btn-primary disabled:opacity-40"
              >
                {responding
                  ? isCrisis
                    ? 'Opening...'
                    : isItemTransfer
                    ? 'Claiming...'
                    : 'Applying...'
                  : 'Accept'}
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-5 py-2 text-sm font-bold rev-btn-secondary"
              >
                {queueCount > 1 ? 'Next' : 'Acknowledge'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
