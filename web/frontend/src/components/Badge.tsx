interface Props {
  label: string;
  color: string;
}

export default function Badge({ label, color }: Props) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color, backgroundColor: `${color}20` }}
    >
      {label}
    </span>
  );
}
