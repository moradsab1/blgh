import type { Severity } from '../../lib/contracts';

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];
const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'بالغ الخطورة',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
};

export interface CaseFiltersState {
  tab: 'active' | 'archived';
  severities: Set<Severity>;
  text: string;
}

interface Props {
  filters: CaseFiltersState;
  onChange: (f: CaseFiltersState) => void;
}

export default function CaseFilters({ filters, onChange }: Props) {
  function toggleSeverity(s: Severity) {
    const next = new Set(filters.severities);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange({ ...filters, severities: next });
  }

  return (
    <div className="space-y-2 px-3 pt-2 pb-1">
      {/* Tab row */}
      <div className="flex gap-1 bg-surface-alt rounded-lg p-1">
        {(['active', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onChange({ ...filters, tab })}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filters.tab === tab
                ? 'bg-surface text-text-primary shadow'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab === 'active' ? 'النشطة' : 'المؤرشفة'}
          </button>
        ))}
      </div>

      {/* Text search */}
      <input
        value={filters.text}
        onChange={(e) => onChange({ ...filters, text: e.target.value })}
        placeholder="ابحث في الحوادث..."
        className="w-full px-2.5 py-1.5 bg-surface-alt border border-border rounded-md text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-[color:var(--accent)]"
      />

      {/* Severity toggles */}
      <div className="flex flex-wrap gap-1">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => toggleSeverity(s)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
              filters.severities.size === 0 || filters.severities.has(s)
                ? 'opacity-100'
                : 'opacity-30'
            }`}
            style={{
              color: severityColor(s),
              borderColor: severityColor(s),
              backgroundColor: filters.severities.has(s)
                ? `${severityColor(s)}20`
                : 'transparent',
            }}
          >
            {SEVERITY_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

function severityColor(s: Severity): string {
  return { critical: '#E5484D', high: '#F76808', medium: '#FFB224', low: '#3B82F6' }[s];
}
