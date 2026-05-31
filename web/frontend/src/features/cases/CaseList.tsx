import { useMemo } from 'react';
import type { Incident } from '../../lib/contracts';
import CaseRow from './CaseRow';
import type { CaseFiltersState } from './CaseFilters';

interface Props {
  incidents: Incident[];
  filters: CaseFiltersState;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function CaseList({ incidents, filters, selectedId, onSelect }: Props) {
  const filtered = useMemo(() => {
    return incidents
      .filter((i) => {
        const isArchived = !!i.resolvedAt;
        if (filters.tab === 'active' && isArchived) return false;
        if (filters.tab === 'archived' && !isArchived) return false;
        if (filters.severities.size > 0 && !filters.severities.has(i.severity)) return false;
        if (filters.text) {
          const t = filters.text.toLowerCase();
          if (
            !i.ref.toLowerCase().includes(t) &&
            !i.category.toLowerCase().includes(t) &&
            !(i.description?.toLowerCase().includes(t))
          ) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [incidents, filters]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-text-muted text-sm">لا توجد حوادث</p>
        {filters.text && (
          <p className="text-text-muted text-xs mt-1">
            جرّب تغيير مصطلح البحث
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      {filtered.map((inc) => (
        <CaseRow
          key={inc.id}
          incident={inc}
          selected={inc.id === selectedId}
          onClick={() => onSelect(inc.id)}
        />
      ))}
    </div>
  );
}
