import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  confirmDestructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-60 bg-black/60"
        aria-hidden="true"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? 'confirm-desc' : undefined}
        className="fixed inset-0 z-70 flex items-center justify-center p-4"
      >
        <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
          <h2 id="confirm-title" className="text-sm font-semibold text-text-primary">
            {title}
          </h2>
          {description && (
            <p id="confirm-desc" className="text-xs text-text-secondary leading-relaxed">
              {description}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              ref={cancelRef}
              onClick={onCancel}
              className="px-3 py-1.5 text-xs rounded-md border border-border text-text-secondary hover:bg-surface-alt transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-colors ${
                confirmDestructive
                  ? 'bg-severity-critical text-white hover:bg-severity-critical/90'
                  : 'bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent)]/90'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
