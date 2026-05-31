interface Props {
  surfaceId: string;
  surfaceAr: string;
  tier: 'council' | 'coalition' | 'operator';
  descriptionAr: string;
  blockedOn: string[];
  mockChildren?: React.ReactNode;
}

const TIER_META = {
  council:   { label: 'Council-Private', color: '#A83231', labelAr: 'المجلس البلدي' },
  coalition: { label: 'Coalition-Internal', color: '#5A6E3F', labelAr: 'التحالف الداخلي' },
  operator:  { label: 'Operator-Only', color: '#1F3020', labelAr: 'المشغّل فقط' },
};

export default function DevStub({ surfaceId, surfaceAr, tier, descriptionAr, blockedOn, mockChildren }: Props) {
  const meta = TIER_META[tier];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-bg">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-white/5">
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold mt-0.5"
            style={{ backgroundColor: `${meta.color}30`, border: `1px solid ${meta.color}50` }}
          >
            {surfaceId}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{surfaceAr}</h1>
            <span
              className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ color: meta.color, backgroundColor: `${meta.color}20`, border: `1px solid ${meta.color}30` }}
            >
              {meta.label} · {meta.labelAr}
            </span>
          </div>
          <div className="ms-auto flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span>🔒</span> قيد التطوير
            </span>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-2xl">{descriptionAr}</p>
      </div>

      {/* Blocked on */}
      <div className="flex-shrink-0 px-8 py-5 border-b border-white/5">
        <p className="text-[11px] uppercase tracking-widest text-white/30 mb-3">
          يتطلب من الخلفية
        </p>
        <div className="flex flex-wrap gap-2">
          {blockedOn.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/40 border border-white/10"
            >
              <span className="text-[10px]">⬡</span> {item}
            </span>
          ))}
        </div>
      </div>

      {/* Wireframe placeholder */}
      <div className="flex-1 p-8">
        {mockChildren ?? (
          <div className="space-y-4 opacity-25 pointer-events-none select-none">
            {/* Fake stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-surface-alt border border-border" />
              ))}
            </div>
            {/* Fake chart */}
            <div className="h-48 rounded-xl bg-surface-alt border border-border" />
            {/* Fake table */}
            <div className="rounded-xl bg-surface border border-border overflow-hidden">
              <div className="h-10 bg-surface-alt border-b border-border" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 border-b border-border last:border-0" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
