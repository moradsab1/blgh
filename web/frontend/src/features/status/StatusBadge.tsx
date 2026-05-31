import type { SafetyState } from '../../lib/contracts';

const CONFIG: Record<SafetyState, { label: string; color: string; bg: string }> = {
  calm:   { label: 'هادئ', color: '#3FB950', bg: 'rgba(63,185,80,0.12)' },
  watch:  { label: 'تنبّه', color: '#FFB224', bg: 'rgba(255,178,36,0.12)' },
  active: { label: 'نشط',  color: '#E5484D', bg: 'rgba(229,72,77,0.12)' },
};

interface Props {
  state: SafetyState;
}

export default function StatusBadge({ state }: Props) {
  const { label, color, bg } = CONFIG[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color, backgroundColor: bg }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
