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
  council:   '#C23B3A',
  coalition: '#6A8B4A',
  operator:  '#2E4430',
};

const TIER_LABEL: Record<Tier, string> = {
  council:   'المجلس',
  coalition: 'التحالف',
  operator:  'المشغّل',
};

const SURFACES: Surface[] = [
  { path: '/console',       icon: '⬡',  labelAr: 'خارطة الأحداث الحية',          tier: 'council',   ready: true  },
  { path: '/mayors-brief',  icon: '📊', labelAr: 'موجز رئيس السلطة المحلية',      tier: 'council',   ready: false, blockedOn: 'analytics + export' },

  { path: '/national',      icon: '🌐', labelAr: 'لوحة المؤشرات الوطنية',         tier: 'coalition', ready: false, blockedOn: 'analytics pipeline' },
  { path: '/trends',        icon: '📈', labelAr: 'استوديو دراسة الاتجاهات',       tier: 'coalition', ready: false, blockedOn: 'analytics pipeline' },
  { path: '/partners',      icon: '🤝', labelAr: 'مساحة عمل الشركاء',             tier: 'coalition', ready: false, blockedOn: 'messaging system'   },

  { path: '/moderation',    icon: '🛡',  labelAr: 'كونسول مراجعة البلاغات',        tier: 'operator',  ready: false, blockedOn: 'moderation queue + PII detection' },
  { path: '/abuse',         icon: '⚠',  labelAr: 'لوحة مكافحة إساءة الاستخدام',  tier: 'operator',  ready: false, blockedOn: 'threat scoring + policy engine' },
];

const GROUPS: Tier[] = ['council', 'coalition', 'operator'];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="flex-shrink-0 w-12 flex flex-col bg-[#0A0F18] border-e border-[#1E2D42]"
    >
      {/* Brand mark */}
      <div className="h-12 flex items-center justify-center flex-shrink-0 border-b border-[#1E2D42]">
        <span
          className="h-7 w-7 rounded-lg text-white text-sm font-bold flex items-center justify-center shadow-md"
          style={{ backgroundColor: TIER_COLOR.council }}
        >
          ب
        </span>
      </div>

      {/* Surface groups */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5">
        {GROUPS.map((tier, gi) => {
          const items = SURFACES.filter((s) => s.tier === tier);
          return (
            <div key={tier}>
              {gi > 0 && (
                <div className="mx-2 my-2 h-px bg-[#1E2D42]" />
              )}
              {/* Tier label strip */}
              <div
                className="mx-2 mb-1 h-[2px] rounded-full"
                style={{ backgroundColor: `${TIER_COLOR[tier]}60` }}
                title={TIER_LABEL[tier]}
              />
              {items.map((surface) => {
                const isActive =
                  location.pathname === surface.path ||
                  (surface.path === '/console' && location.pathname.startsWith('/console'));

                if (!surface.ready) {
                  return (
                    <div
                      key={surface.path}
                      title={`${surface.labelAr}\n🔒 قيد التطوير — يتطلب: ${surface.blockedOn}`}
                      className="relative flex items-center justify-center h-9 w-9 mx-auto my-0.5 rounded-lg cursor-not-allowed select-none"
                      style={{ opacity: 0.25 }}
                    >
                      <span className="text-base leading-none">{surface.icon}</span>
                      <span className="absolute bottom-0 end-0 text-[7px] leading-none">🔒</span>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={surface.path}
                    to={surface.path}
                    title={surface.labelAr}
                    className={`relative flex items-center justify-center h-9 w-9 mx-auto my-0.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-white/10 ring-1 ring-white/10'
                        : 'hover:bg-white/6 text-white/50 hover:text-white/80'
                    }`}
                  >
                    {isActive && (
                      <div
                        className="absolute start-0 inset-y-1.5 w-0.5 rounded-e-full"
                        style={{ backgroundColor: TIER_COLOR[tier] }}
                      />
                    )}
                    <span
                      className="text-base leading-none"
                      style={{
                        filter: isActive ? 'brightness(1.4) saturate(1.2)' : undefined,
                        color: isActive ? 'rgba(255,255,255,0.9)' : undefined,
                      }}
                    >
                      {surface.icon}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Version */}
      <div className="h-10 flex items-center justify-center border-t border-[#1E2D42]">
        <span className="text-[9px] text-white/15 font-mono" title="إصدار التطبيق">v1</span>
      </div>
    </nav>
  );
}
