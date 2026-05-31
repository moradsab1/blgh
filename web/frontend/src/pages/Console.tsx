import { useState, useCallback } from 'react';
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
import StatChip from '../components/StatChip';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import Drawer from '../components/Drawer';
import IncidentDetail from '../features/incident/IncidentDetail';

const RADIUS_OPTIONS = [1, 3, 5, 10, 20];
const DEFAULT_RADIUS = 5;

type WsState = 'connected' | 'reconnecting' | 'offline';

export default function Console() {
  const [locality, setLocality] = useState<Locality | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wsState, setWsState] = useState<WsState>('offline');
  const [filters, setFilters] = useState<CaseFiltersState>({
    tab: 'active',
    severities: new Set(),
    text: '',
  });

  const lat = locality?.lat ?? null;
  const lng = locality?.lng ?? null;

  const { data: status } = useStatus(lat, lng);

  const {
    data: incidents = [],
    isLoading: incidentsLoading,
    isError: incidentsError,
    refetch: refetchIncidents,
  } = useIncidents({
    lat,
    lng,
    radiusKm,
    onWsState: useCallback((s: WsState) => setWsState(s), [setWsState]),
  });

  const activeCount = incidents.filter((i) => !i.resolvedAt).length;
  const criticalCount = incidents.filter((i) => i.severity === 'critical' && !i.resolvedAt).length;

  const selectedIncident = incidents.find((i) => i.id === selectedId);

  return (
    <div className="flex flex-col h-screen bg-bg text-text-primary overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface">
        {/* Brand */}
        <div className="flex items-center gap-2 me-2">
          <span className="text-[color:var(--accent)] font-bold text-sm tracking-wide">بلاغ</span>
          <span className="text-text-muted text-xs">|</span>
          <span className="text-text-muted text-xs">لوحة التحكم</span>
        </div>

        {/* Locality picker */}
        <LocalityPicker selected={locality} onSelect={setLocality} />

        {/* Radius selector */}
        <div className="flex items-center gap-1">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                radiusKm === r
                  ? 'bg-[color:var(--accent)] text-white'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {r} كم
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Status badge */}
        {status && <StatusBadge state={status.state} />}

        {/* Stat strip */}
        {lat !== null && (
          <div className="flex items-center gap-2">
            <StatChip label="نشطة" value={activeCount} />
            <StatChip label="بالغة" value={criticalCount} color="#E5484D" />
          </div>
        )}

        {/* WS indicator */}
        {lat !== null && <LiveIndicator state={wsState} />}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Triage rail */}
        <aside className="w-80 flex-shrink-0 flex flex-col border-e border-border bg-surface overflow-hidden">
          {lat === null ? (
            <div className="flex flex-col items-center justify-center flex-1 p-6 text-center gap-2">
              <span className="text-3xl">🗺️</span>
              <p className="text-text-muted text-sm">اختر منطقة لعرض الحوادث</p>
            </div>
          ) : (
            <>
              <CaseFilters filters={filters} onChange={setFilters} />
              <div className="flex-1 overflow-hidden flex flex-col">
                {incidentsLoading && (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                )}
                {incidentsError && !incidentsLoading && (
                  <ErrorState
                    message="تعذّر تحميل الحوادث"
                    onRetry={() => refetchIncidents()}
                  />
                )}
                {!incidentsLoading && !incidentsError && (
                  <CaseList
                    incidents={incidents}
                    filters={filters}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                )}
              </div>
            </>
          )}
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <IncidentMap
            locality={locality}
            incidents={incidents}
            selectedId={selectedId}
            onSelectIncident={setSelectedId}
          />
        </main>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={selectedIncident
          ? `حادثة ${selectedIncident.ref}`
          : 'تفاصيل الحادثة'}
      >
        {selectedId && <IncidentDetail incidentId={selectedId} />}
      </Drawer>
    </div>
  );
}
