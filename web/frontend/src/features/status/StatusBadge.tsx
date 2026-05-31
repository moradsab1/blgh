import type { SafetyState } from '../../lib/contracts';

const CONFIG: Record<SafetyState, { label: string; color: string; bg: string; border: string; icon: string }> = {
  calm:   { label: 'هادئ',  color: '#16A34A', bg: 'rgba(22,163,74,0.10)',  border: 'rgba(22,163,74,0.25)',  icon: '🟢' },
  watch:  { label: 'تنبّه', color: '#D97706', bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.25)',  icon: '🟡' },
  active: { label: 'نشط',   color: '#DC2626', bg: 'rgba(220,38,38,0.10)',  border: 'rgba(220,38,38,0.25)',  icon: '🔴' },
};

interface Props {
  state: SafetyState;
}

export default function StatusBadge({ state }: Props) {
  const { label, color, bg, border, icon } = CONFIG[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color, backgroundColor: bg, border: `1px solid ${border}` }}
    >
      <span className="text-[10px] leading-none">{icon}</span>
      {label}
    </span>
  );
}
