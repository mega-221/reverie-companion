import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmDialog({
  open,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmOptions & {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useBodyScrollLock(open);

  useEscapeKey(open, onCancel);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] rev-modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="sheet-modal max-w-sm animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
          <h3 className="font-bold text-lg truncate pr-2" style={{ color: 'var(--rev-text)' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="font-bold text-2xl leading-none px-2 py-0.5 rounded hover:bg-white/10 transition-colors shrink-0"
            style={{ color: 'var(--rev-text-muted)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--rev-text-secondary)' }}>
            {message}
          </p>

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 font-bold text-sm rev-btn-secondary whitespace-nowrap"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              autoFocus
              className={`flex-1 py-2.5 px-4 font-bold text-sm shadow-sm whitespace-nowrap ${
                tone === 'danger' ? 'rev-btn-primary' : 'rev-btn-secondary'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);
  pendingRef.current = pending;

  const askConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      if (pendingRef.current) {
        pendingRef.current.resolve(false);
      }
      setPending({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const current = pendingRef.current;
    setPending(null);
    current?.resolve(true);
  }, []);

  const handleCancel = useCallback(() => {
    const current = pendingRef.current;
    setPending(null);
    current?.resolve(false);
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      open={pending !== null}
      title={pending?.title}
      message={pending?.message ?? ''}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      tone={pending?.tone}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { askConfirm, confirmDialog };
}
