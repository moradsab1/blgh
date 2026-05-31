import type { Severity } from '../../lib/contracts';

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];
const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'بالغ',
  high:     'مرتفع',
  medium:   'متوسط',
  low:      'منخفض',
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

function severityColor(s: Severity): string {
  return ({ critical: '#E5484D', high: '#F76808', medium: '#FFB224', low: '#3B82F6' } as const)[s];
}

export default function CaseFilters({ filters, onChange }: Props) {
  function toggleSeverity(s: Severity) {
    const next = new Set(filters.severities);
    if (next.has(s)) next.delete(s); else next.add(s);
    onChange({ ...filters, severities: next });
  }

  return (
    <div className="flex-shrink-0 border-b border-border">
      {/* Active / Archived tabs */}
      <div className="flex border-b border-border">
        {(['active', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onChange({ ...filters, tab })}
            className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              filters.tab === tab
                ? 'border-[color:var(--accent)] text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab === 'active' ? 'النشطة' : 'المؤرشفة'}
          </button>
        ))}
      </div>

      <div className="px-3 pt-2 pb-2.5 space-y-2">
        {/* Text search */}
        <div className="relative">
          <span className="absolute inset-y-0 start-2.5 flex items-center text-text-muted text-xs pointer-events-none">
            🔍
          </span>
          <input
            value={filters.text}
            onChange={(e) => onChange({ ...filters, text: e.target.value })}
            placeholder="بحث في الحوادث..."
            className="w-full ps-7 pe-2.5 py-1.5 bg-bg border border-border rounded-md text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-[color:var(--accent)] transition-colors"
          />
          {filters.text && (
            <button
              onClick={() => onChange({ ...filters, text: '' })}
              className="absolute inset-y-0 end-2 flex items-center text-text-muted hover:text-text-primary text-xs"
              aria-label="مسح البحث"
            >
              ✕
            </button>
          )}
        </div>

        {/* Severity toggles */}
        <div className="flex gap-1">
          {SEVERITIES.map((s) => {
            const active = filters.severities.size === 0 || filters.severities.has(s);
            const color  = severityColor(s);
            return (
              <button
                key={s}
                onClick={() => toggleSeverity(s)}
                className={`flex-1 py-1 rounded text-[10px] font-semibold border transition-all ${
                  active ? 'opacity-100' : 'opacity-30'
                }`}
                style={{
                  color,
                  borderColor: color,
                  backgroundColor: filters.severities.has(s) ? `${color}18` : 'transparent',
                }}
              >
                {SEVERITY_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
