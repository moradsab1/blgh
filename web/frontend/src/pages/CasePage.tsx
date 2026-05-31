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
      <div className="flex-shrink-0 flex items-center gap-3 h-12 px-4 border-b border-white/5 bg-surface">
        <button
          onClick={() => navigate('/console')}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors"
          aria-label="العودة إلى لوحة التحكم"
        >
          ← العودة
        </button>
        <span className="text-white/20 text-xs">|</span>
        <span className="text-xs text-white/50">تفاصيل الحادثة</span>
        <span className="font-mono text-xs text-white/40">{id}</span>
      </div>

      {/* Detail (scrollable, full area) */}
      <div className="flex-1 overflow-y-auto">
        <IncidentDetail incidentId={id} onAdminAction={adminAction} />
      </div>
    </div>
  );
}
