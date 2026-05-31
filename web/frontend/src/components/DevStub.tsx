interface Props {
  surfaceId: string;
  surfaceAr: string;
  tier: 'council' | 'coalition' | 'operator';
  descriptionAr: string;
  blockedOn: string[];
  mockChildren?: React.ReactNode;
}

const TIER_META = {
  council:   { label: 'Council-Private',    color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.2)',   labelAr: 'المجلس البلدي',     icon: '🏛️' },
  coalition: { label: 'Coalition-Internal', color: '#16A34A', bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.2)',   labelAr: 'التحالف الداخلي',   icon: '🤝' },
  operator:  { label: 'Operator-Only',      color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.2)',   labelAr: 'المشغّل',          icon: '⚙️' },
};

export default function DevStub({ surfaceId, surfaceAr, tier, descriptionAr, blockedOn, mockChildren }: Props) {
  const meta = TIER_META[tier];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-bg">
      {/* Page header card */}
      <div className="flex-shrink-0 bg-surface border-b border-border px-8 py-6">
        <div className="flex items-start gap-4 max-w-3xl">
          {/* Surface ID badge */}
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm mt-0.5"
            style={{ backgroundColor: meta.bg, border: `1.5px solid ${meta.border}`, color: meta.color }}
          >
            {surfaceId}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary">{surfaceAr}</h1>
              {/* Under development badge */}
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                🔒 قيد التطوير
              </span>
            </div>
            {/* Tier badge */}
            <span
              className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}
            >
              <span>{meta.icon}</span>
              {meta.label} · {meta.labelAr}
            </span>
            <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-xl">{descriptionAr}</p>
          </div>
        </div>
      </div>

      {/* Blocked-on requirements */}
      <div className="flex-shrink-0 bg-surface border-b border-border px-8 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          🔗 يتطلب من الخلفية
        </p>
        <div className="flex flex-wrap gap-2">
          {blockedOn.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface-alt text-text-secondary border border-border font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Wireframe placeholder */}
      <div className="flex-1 p-8">
        {mockChildren ?? (
          <div className="space-y-4 opacity-30 pointer-events-none select-none">
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-surface border border-border shadow-card" />
              ))}
            </div>
            <div className="h-48 rounded-xl bg-surface border border-border shadow-card" />
            <div className="rounded-xl bg-surface border border-border shadow-card overflow-hidden">
              <div className="h-10 bg-surface-alt border-b border-border" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-11 border-b border-border last:border-0" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
