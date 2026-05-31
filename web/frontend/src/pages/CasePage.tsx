import { useParams, useNavigate } from 'react-router-dom';
import IncidentDetail from '../features/incident/IncidentDetail';
import { useAdminActions } from '../features/incident/useAdminActions';
import { useCallback } from 'react';

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { perform: adminAction } = useAdminActions({
    lat: 0, lng: 0, radiusKm: 5,
    onUnauthorized: useCallback(() => {
      window.dispatchEvent(new CustomEvent('balagh:unauthorized'));
    }, []),
  });

  if (!id) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 flex items-center gap-3 h-14 px-4 border-b border-border bg-surface shadow-sm">
        <button
          onClick={() => navigate('/console')}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary text-xs transition-colors px-2 py-1 rounded-md hover:bg-surface-alt"
          aria-label="العودة إلى لوحة التحكم"
        >
          ← العودة
        </button>
        <div className="w-px h-4 bg-border" />
        <span className="text-xs text-text-muted">تفاصيل الحادثة</span>
        <span className="font-mono text-xs text-text-secondary bg-surface-alt px-1.5 py-0.5 rounded">{id}</span>
      </div>

      {/* Detail (scrollable, full area) */}
      <div className="flex-1 overflow-y-auto">
        <IncidentDetail incidentId={id} onAdminAction={adminAction} />
      </div>
    </div>
  );
}
