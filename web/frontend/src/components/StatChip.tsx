interface Props {
  label: string;
  value: number | string;
  color?: string;
}

export default function StatChip({ label, value, color }: Props) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-surface-alt min-w-[56px]">
      <span
        className="text-sm font-bold leading-none"
        style={{ color: color ?? 'var(--text-primary)' }}
      >
        {value}
      </span>
      <span className="text-[9px] text-text-muted mt-0.5">{label}</span>
    </div>
  );
}
