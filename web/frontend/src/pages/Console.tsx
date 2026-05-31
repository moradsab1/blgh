import { useState, useCallback, useMemo } from 'react';
import type { Locality } from '../lib/contracts';
import LocalityPicker from '../features/localities/LocalityPicker';
import { useStatus } from '../features/status/useStatus';
import StatusBadge from '../features/status/StatusBadge';
import { useIncidents } from '../features/cases/useIncidents';
import CaseFilters from '../features/cases/CaseFilters';
import CaseList from '../features/cases/CaseList';
import IncidentMap from '../features/map/IncidentMap';
import type { CaseFiltersState } from '../features/cases/CaseFilters';
import LiveIndicator from '../components/LiveIndicator';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import Drawer from '../components/Drawer';
import IncidentDetail from '../features/incident/IncidentDetail';
import { useAdminActions } from '../features/incident/useAdminActions';
import OfflineBanner from '../components/OfflineBanner';
import { mockLocalities } from '../mock/db';

const RADIUS_OPTIONS = [1, 3, 5, 10, 20];
const DEFAULT_RADIUS = 5;

type WsState = 'connected' | 'reconnecting' | 'offline';

const SEVERITY_STATS = [
  { key: 'critical', label: 'بالغ',   color: '#E5484D' },
  { key: 'high',     label: 'مرتفع',  color: '#F76808' },
  { key: 'medium',   label: 'متوسط',  color: '#FFB224' },
  { key: 'low',      label: 'منخفض',  color: '#3B82F6' },
] as const;

// Build locality id → Arabic name map from mock data
// (real mode would source this from the locality query)
const LOCALITY_NAMES: Record<string, string> = Object.fromEntries(
  mockLocalities.map((l) => [l.id, l.nameAr]),
);

export default function Console() {
  const [locality, setLocality]   = useState<Locality | null>(null);
  const [radiusKm, setRadiusKm]   = useState(DEFAULT_RADIUS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wsState, setWsState]     = useState<WsState>('offline');
  const [filters, setFilters]     = useState<CaseFiltersState>({
    tab: 'active',
    severities: new Set(),
    text: '',
  });

  const lat = locality?.lat ?? null;
  const lng = locality?.lng ?? null;

  const { data: status } = useStatus(lat, lng);

  const {
    data: incidents = [],
    isLoading,
    isError,
    refetch,
  } = useIncidents({
    lat,
    lng,
    radiusKm,
    onWsState: useCallback((s: WsState) => setWsState(s), [setWsState]),
  });

  const { perform: adminAction } = useAdminActions({
    lat: lat ?? 0,
    lng: lng ?? 0,
    radiusKm,
    onUnauthorized: useCallback(() => {
      window.dispatchEvent(new CustomEvent('balagh:unauthorized'));
    }, []),
  });

  // Stats: always computed over all fetched incidents
  const activeIncidents = useMemo(() => incidents.filter((i) => !i.resolvedAt), [incidents]);
  const severityCounts  = useMemo(
    () =>
      SEVERITY_STATS.map(({ key, label, color }) => ({
        key, label, color,
        count: activeIncidents.filter((i) => i.severity === key).length,
      })),
    [activeIncidents],
  );

  const selectedIncident = incidents.find((i) => i.id === selectedId);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-bg text-text-primary overflow-hidden">
      <OfflineBanner visible={locality !== null && wsState === 'offline'} />

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 h-12 border-b border-border bg-surface">
        {/* Locality picker */}
        <LocalityPicker selected={locality} onSelect={setLocality} />

        {/* Radius (only meaningful when locality is selected) */}
        {locality && (
          <div className="flex items-center gap-0.5 bg-surface-alt rounded-lg p-0.5">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                  radiusKm === r
                    ? 'bg-[color:var(--accent)] text-white'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {r}كم
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Status badge (only when locality selected) */}
        {status && locality && <StatusBadge state={status.state} />}

        {/* Live indicator */}
        {locality && <LiveIndicator state={wsState} />}
      </header>

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-px bg-surface border-b border-border overflow-x-auto">
        {/* Total */}
        <div className="flex flex-col items-center px-4 py-2 min-w-[64px]">
          <span className="text-base font-bold text-text-primary tabular-nums leading-none">
            {activeIncidents.length}
          </span>
          <span className="text-[9px] text-text-muted mt-0.5 uppercase tracking-wide">مجموع</span>
        </div>

        <div className="w-px h-8 bg-border flex-shrink-0" />

        {/* Per-severity counts */}
        {severityCounts.map(({ key, label, color, count }) => (
          <button
            key={key}
            onClick={() => {
              const next = new Set(filters.severities);
              if (next.has(key as 'critical')) next.delete(key as 'critical');
              else next.add(key as 'critical');
              setFilters((f) => ({ ...f, severities: next }));
            }}
            className={`flex flex-col items-center px-4 py-2 min-w-[60px] transition-colors hover:bg-surface-alt ${
              filters.severities.has(key as 'critical') ? 'bg-surface-alt' : ''
            }`}
          >
            <span
              className="text-base font-bold tabular-nums leading-none"
              style={{ color }}
            >
              {count}
            </span>
            <span className="text-[9px] text-text-muted mt-0.5" style={{ color: `${color}99` }}>
              {label}
            </span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Area label */}
        <div className="px-4 py-2 text-xs text-text-muted flex-shrink-0">
          {locality
            ? <span>📍 <span className="text-text-secondary">{locality.nameAr}</span> · {radiusKm} كم</span>
            : <span className="text-text-muted">جميع المناطق</span>
          }
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Triage rail */}
        <aside className="w-72 flex-shrink-0 flex flex-col border-e border-border bg-surface overflow-hidden">
          <CaseFilters filters={filters} onChange={setFilters} />

          {isLoading && (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          )}
          {isError && !isLoading && (
            <ErrorState message="تعذّر تحميل الحوادث" onRetry={() => refetch()} />
          )}
          {!isLoading && !isError && (
            <CaseList
              incidents={incidents}
              filters={filters}
              localityNames={LOCALITY_NAMES}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <IncidentMap
            locality={locality}
            incidents={activeIncidents}
            selectedId={selectedId}
            onSelectIncident={setSelectedId}
          />
        </main>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={selectedIncident ? `حادثة ${selectedIncident.ref}` : 'تفاصيل الحادثة'}
      >
        {selectedId && (
          <IncidentDetail incidentId={selectedId} onAdminAction={adminAction} />
        )}
      </Drawer>
    </div>
  );
}
