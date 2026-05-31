interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'حدث خطأ', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <div className="text-3xl">⚠️</div>
      <p className="text-text-muted text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1.5 rounded-md border border-border text-text-secondary hover:bg-surface-alt transition-colors"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
