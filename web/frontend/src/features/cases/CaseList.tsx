import { useMemo } from 'react';
import type { Incident } from '../../lib/contracts';
import CaseRow from './CaseRow';
import type { CaseFiltersState } from './CaseFilters';

interface Props {
  incidents: Incident[];
  filters: CaseFiltersState;
  localityNames: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function CaseList({ incidents, filters, localityNames, selectedId, onSelect }: Props) {
  const filtered = useMemo(() => {
    return incidents
      .filter((i) => {
        const isArchived = !!i.resolvedAt;
        if (filters.tab === 'active'   && isArchived)  return false;
        if (filters.tab === 'archived' && !isArchived) return false;
        if (filters.severities.size > 0 && !filters.severities.has(i.severity)) return false;
        if (filters.text) {
          const t = filters.text.toLowerCase();
          if (
            !i.ref.toLowerCase().includes(t) &&
            !i.category.toLowerCase().includes(t) &&
            !(i.description?.toLowerCase().includes(t)) &&
            !(localityNames[i.localityId]?.includes(t))
          ) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [incidents, filters, localityNames]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Count bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border flex-shrink-0">
        <span className="text-[10px] text-text-muted uppercase tracking-wide">
          {filters.tab === 'active' ? 'النشطة' : 'المؤرشفة'}
        </span>
        <span className="text-[10px] font-semibold text-text-secondary tabular-nums">
          {filtered.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-text-muted text-sm">لا توجد حوادث</p>
          {filters.text && (
            <p className="text-text-muted text-xs mt-1">جرّب تغيير مصطلح البحث</p>
          )}
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {filtered.map((inc) => (
            <CaseRow
              key={inc.id}
              incident={inc}
              localityName={localityNames[inc.localityId]}
              selected={inc.id === selectedId}
              onClick={() => onSelect(inc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
