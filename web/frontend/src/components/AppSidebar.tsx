import { NavLink, useLocation } from 'react-router-dom';

type Tier = 'council' | 'coalition' | 'operator';

interface Surface {
  path: string;
  icon: string;
  labelAr: string;
  tier: Tier;
  ready: boolean;
  blockedOn?: string;
}

const TIER_COLOR: Record<Tier, string> = {
  council:   '#DC2626',
  coalition: '#16A34A',
  operator:  '#2563EB',
};

const TIER_BG: Record<Tier, string> = {
  council:   'rgba(220,38,38,0.08)',
  coalition: 'rgba(22,163,74,0.08)',
  operator:  'rgba(37,99,235,0.08)',
};

const TIER_LABEL: Record<Tier, string> = {
  council:   'المجلس البلدي',
  coalition: 'التحالف الداخلي',
  operator:  'المشغّل',
};

const TIER_ICON: Record<Tier, string> = {
  council:   '🏛️',
  coalition: '🤝',
  operator:  '⚙️',
};

const SURFACES: Surface[] = [
  {
    path: '/console',
    icon: '🗺️',
    labelAr: 'خارطة الأحداث',
    tier: 'council',
    ready: true,
  },
  {
    path: '/mayors-brief',
    icon: '📊',
    labelAr: 'موجز الرئيس',
    tier: 'council',
    ready: false,
    blockedOn: 'analytics + export',
  },

  {
    path: '/national',
    icon: '🌐',
    labelAr: 'المؤشرات الوطنية',
    tier: 'coalition',
    ready: false,
    blockedOn: 'analytics pipeline',
  },
  {
    path: '/trends',
    icon: '📈',
    labelAr: 'استوديو الاتجاهات',
    tier: 'coalition',
    ready: false,
    blockedOn: 'analytics pipeline',
  },
  {
    path: '/partners',
    icon: '🏢',
    labelAr: 'مساحة الشركاء',
    tier: 'coalition',
    ready: false,
    blockedOn: 'messaging system',
  },

  {
    path: '/moderation',
    icon: '🛡️',
    labelAr: 'مراجعة البلاغات',
    tier: 'operator',
    ready: false,
    blockedOn: 'moderation queue',
  },
  {
    path: '/abuse',
    icon: '🔍',
    labelAr: 'مكافحة الإساءة',
    tier: 'operator',
    ready: false,
    blockedOn: 'threat scoring',
  },
];

const GROUPS: Tier[] = ['council', 'coalition', 'operator'];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="flex-shrink-0 w-56 flex flex-col bg-surface border-e border-border shadow-card overflow-y-auto overflow-x-hidden"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
        <span
          className="h-8 w-8 rounded-lg text-white text-sm font-bold flex items-center justify-center shadow-sm flex-shrink-0"
          style={{ backgroundColor: TIER_COLOR.council }}
        >
          ب
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary leading-none">بلاغ</p>
          <p className="text-[10px] text-text-muted mt-0.5">لوحة التحكم</p>
        </div>
      </div>

      {/* Surface groups */}
      <div className="flex-1 py-3 space-y-1">
        {GROUPS.map((tier, gi) => {
          const items = SURFACES.filter((s) => s.tier === tier);
          return (
            <div key={tier}>
              {gi > 0 && <div className="h-px bg-border mx-4 my-3" />}

              {/* Tier heading */}
              <div className="flex items-center gap-2 px-4 mb-1.5">
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    color: TIER_COLOR[tier],
                    backgroundColor: TIER_BG[tier],
                  }}
                >
                  <span>{TIER_ICON[tier]}</span>
                  {TIER_LABEL[tier]}
                </span>
              </div>

              {/* Nav items */}
              {items.map((surface) => {
                const isActive =
                  location.pathname === surface.path ||
                  (surface.path === '/console' && location.pathname.startsWith('/console'));

                if (!surface.ready) {
                  return (
                    <div
                      key={surface.path}
                      title={`قيد التطوير — يتطلب: ${surface.blockedOn}`}
                      className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg cursor-not-allowed select-none opacity-35"
                    >
                      <span className="text-base w-5 text-center flex-shrink-0">{surface.icon}</span>
                      <span className="text-xs text-text-secondary truncate flex-1">{surface.labelAr}</span>
                      <span className="text-[9px] text-text-muted flex-shrink-0">🔒</span>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={surface.path}
                    to={surface.path}
                    className={() =>
                      `flex items-center gap-3 mx-2 px-3 py-2 rounded-lg transition-all duration-150 relative group ${
                        isActive
                          ? 'text-text-primary font-semibold shadow-sm'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt'
                      }`
                    }
                    style={
                      isActive
                        ? { backgroundColor: TIER_BG[tier], color: TIER_COLOR[tier] }
                        : undefined
                    }
                  >
                    {isActive && (
                      <div
                        className="absolute start-0 inset-y-1.5 w-0.5 rounded-e-full"
                        style={{ backgroundColor: TIER_COLOR[tier] }}
                      />
                    )}
                    <span
                      className="text-base w-5 text-center flex-shrink-0"
                      style={isActive ? { filter: 'saturate(1.2)' } : undefined}
                    >
                      {surface.icon}
                    </span>
                    <span className="text-xs truncate flex-1">{surface.labelAr}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <p className="text-[10px] text-text-muted font-mono">v1 · mock</p>
      </div>
    </nav>
  );
}
