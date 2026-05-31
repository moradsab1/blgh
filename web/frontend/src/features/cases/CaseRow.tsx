import type { Incident } from '../../lib/contracts';

const CATEGORY_AR: Record<string, string> = {
  GUNFIRE:    'إطلاق نار',
  STABBING:   'طعن',
  ASSAULT:    'اعتداء',
  ROBBERY:    'سرقة',
  SUSPICIOUS: 'مريب',
  OTHER:      'أخرى',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'بالغ',
  high:     'مرتفع',
  medium:   'متوسط',
  low:      'منخفض',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#E5484D',
  high:     '#F76808',
  medium:   '#FFB224',
  low:      '#3B82F6',
};

interface Props {
  incident: Incident;
  localityName?: string;
  selected: boolean;
  onClick: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'الآن';
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} س`;
  return `${Math.floor(hrs / 24)} ي`;
}

export default function CaseRow({ incident, localityName, selected, onClick }: Props) {
  const color      = SEVERITY_COLOR[incident.severity] ?? '#9AA7B4';
  const isArchived = !!incident.resolvedAt;

  return (
    <button
      onClick={onClick}
      className={`w-full text-start border-b border-border transition-colors ${
        selected ? 'bg-surface-alt' : 'hover:bg-surface-alt/60'
      }`}
    >
      <div className="flex">
        {/* Left severity bar */}
        <div
          className="w-0.5 flex-shrink-0 self-stretch"
          style={{ backgroundColor: selected ? color : `${color}55` }}
        />

        <div className="flex-1 px-3 py-2.5">
          {/* Category + severity badge + time */}
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold truncate ${isArchived ? 'text-text-muted' : 'text-text-primary'}`}>
              {CATEGORY_AR[incident.category] ?? incident.category}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ color, backgroundColor: `${color}18` }}
              >
                {SEVERITY_LABEL[incident.severity]}
              </span>
              <span className="text-[10px] text-text-muted tabular-nums">
                {relativeTime(incident.createdAt)}
              </span>
            </div>
          </div>

          {/* Ref + locality */}
          <div className="flex items-center gap-1 mt-0.5">
            <span className="font-mono text-[10px] text-text-muted">{incident.ref}</span>
            {localityName && (
              <>
                <span className="text-[10px] text-border mx-0.5">·</span>
                <span className="text-[10px] text-text-muted">{localityName}</span>
              </>
            )}
            {isArchived && (
              <>
                <span className="text-[10px] text-border mx-0.5">·</span>
                <span className="text-[10px] text-status-resolved">مؤرشف</span>
              </>
            )}
          </div>

          {/* Description preview */}
          {incident.description && (
            <p className="text-[11px] text-text-secondary mt-1 line-clamp-1 leading-snug">
              {incident.description}
            </p>
          )}

          {/* Votes + comments */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-state-calm">✓ {incident.confirmations}</span>
            <span className="text-[10px] text-severity-critical">✗ {incident.denials}</span>
            {incident.commentCount > 0 && (
              <span className="text-[10px] text-text-muted">💬 {incident.commentCount}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
