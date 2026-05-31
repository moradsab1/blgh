import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Drawer({ open, onClose, title, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => { prev?.focus(); };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel — slide from end (right in LTR, left in RTL) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="fixed inset-y-0 end-0 z-50 w-full sm:w-[420px] bg-surface border-s border-border flex flex-col shadow-2xl outline-none"
        style={{ animation: 'slideIn 0.2s ease-out' }}
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
          [dir="rtl"] @keyframes slideIn {
            from { transform: translateX(-100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="h-8 w-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
