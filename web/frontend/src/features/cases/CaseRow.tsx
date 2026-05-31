import type { Incident } from '../../lib/contracts';

const CATEGORY_AR: Record<string, string> = {
  GUNFIRE: 'إطلاق نار',
  STABBING: 'طعن',
  ASSAULT: 'اعتداء',
  ROBBERY: 'سرقة',
  SUSPICIOUS: 'مريب',
  OTHER: 'أخرى',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'بالغ',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#E5484D',
  high: '#F76808',
  medium: '#FFB224',
  low: '#3B82F6',
};

interface Props {
  incident: Incident;
  selected: boolean;
  onClick: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  return `منذ ${Math.floor(hrs / 24)} ي`;
}

export default function CaseRow({ incident, selected, onClick }: Props) {
  const color = SEVERITY_COLOR[incident.severity] ?? '#9AA7B4';

  return (
    <button
      onClick={onClick}
      className={`w-full text-start px-3 py-3 border-b border-border transition-colors ${
        selected
          ? 'bg-surface-alt'
          : 'hover:bg-surface-alt/50'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Severity dot */}
        <div
          className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-text-primary truncate">
              {CATEGORY_AR[incident.category] ?? incident.category}
            </span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ color, backgroundColor: `${color}20` }}
            >
              {SEVERITY_LABEL[incident.severity]}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-mono text-[10px] text-text-muted">{incident.ref}</span>
            <span className="text-[10px] text-text-muted">{relativeTime(incident.createdAt)}</span>
          </div>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] text-state-calm">✓ {incident.confirmations}</span>
            <span className="text-[10px] text-severity-critical">✗ {incident.denials}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
