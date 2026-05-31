interface Props {
  icon?: string;
  message: string;
  hint?: string;
}

export default function EmptyState({ icon = '📭', message, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-text-muted text-sm">{message}</p>
      {hint && <p className="text-text-muted text-xs mt-1">{hint}</p>}
    </div>
  );
}
