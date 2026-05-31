type WsState = 'connected' | 'reconnecting' | 'offline';

interface Props {
  state: WsState;
}

const CONFIG: Record<WsState, { dot: string; label: string }> = {
  connected: { dot: 'bg-state-calm', label: 'مباشر' },
  reconnecting: { dot: 'bg-severity-medium animate-pulse', label: 'جارٍ الاتصال' },
  offline: { dot: 'bg-severity-critical', label: 'غير متصل' },
};

export default function LiveIndicator({ state }: Props) {
  const { dot, label } = CONFIG[state];
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}
