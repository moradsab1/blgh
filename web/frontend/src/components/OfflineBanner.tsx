interface Props {
  visible: boolean;
}

export default function OfflineBanner({ visible }: Props) {
  if (!visible) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-2 px-4 py-2 bg-severity-medium/10 border-b border-severity-medium/30 text-severity-medium text-xs"
    >
      <span className="h-2 w-2 rounded-full bg-severity-medium flex-shrink-0 animate-pulse" />
      الاتصال بالخادم منقطع — جارٍ إعادة الاتصال
    </div>
  );
}
