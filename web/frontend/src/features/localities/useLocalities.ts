import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { qk } from '../../lib/queryClient';
import { USE_MOCK } from '../../config';
import { mockApi } from '../../mock/mockApi';
import { api } from '../../lib/api';
import type { Locality } from '../../lib/contracts';

async function fetchLocalities(q: string): Promise<Locality[]> {
  if (USE_MOCK) return mockApi.getLocalities(q);
  return api.get<Locality[]>(`/localities?q=${encodeURIComponent(q)}`);
}

export function useLocalities(q: string) {
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  return useQuery({
    queryKey: qk.localities(debouncedQ),
    queryFn: () => fetchLocalities(debouncedQ),
    staleTime: 60_000,
  });
}
