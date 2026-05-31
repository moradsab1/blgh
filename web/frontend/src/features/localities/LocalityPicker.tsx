import { useState } from 'react';
import { useLocalities } from './useLocalities';
import type { Locality } from '../../lib/contracts';

interface Props {
  selected: Locality | null;
  onSelect: (locality: Locality) => void;
}

export default function LocalityPicker({ selected, onSelect }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data: localities = [], isLoading } = useLocalities(q);

  function handleSelect(loc: Locality) {
    onSelect(loc);
    setOpen(false);
    setQ('');
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text-primary hover:border-[color:var(--accent)] transition-colors min-w-[160px]"
      >
        <span className="text-text-muted text-xs">📍</span>
        <span className="flex-1 text-start truncate">
          {selected?.nameAr ?? 'اختر المنطقة'}
        </span>
        <span className="text-text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 start-0 z-50 w-64 bg-surface border border-border rounded-lg shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن منطقة..."
              className="w-full px-3 py-2 bg-surface-alt text-sm text-text-primary placeholder-text-muted rounded-md border border-border focus:outline-none focus:border-[color:var(--accent)]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {isLoading && (
              <div className="p-3 text-center text-text-muted text-sm">جارٍ البحث...</div>
            )}
            {!isLoading && localities.length === 0 && (
              <div className="p-3 text-center text-text-muted text-sm">لا نتائج</div>
            )}
            {localities.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleSelect(loc)}
                className="w-full text-start px-3 py-2.5 text-sm text-text-primary hover:bg-surface-alt transition-colors flex items-center justify-between"
              >
                <span>{loc.nameAr}</span>
                {selected?.id === loc.id && (
                  <span className="text-[color:var(--accent)] text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
