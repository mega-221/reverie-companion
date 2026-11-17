import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="sheet-modal max-w-sm animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h3 className="font-cinzel font-bold text-lg text-gray-200 truncate pr-2">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2 shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <p className="text-sm text-gray-300 leading-relaxed">{message}</p>

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm border border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              autoFocus
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm border shadow-sm transition-colors whitespace-nowrap ${
                tone === 'danger'
                  ? 'bg-red-900 hover:bg-red-800 border-red-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 border-gray-500 text-white'
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
