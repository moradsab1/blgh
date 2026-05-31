import { useQuery } from '@tanstack/react-query';
import { qk } from '../../lib/queryClient';
import { USE_MOCK } from '../../config';
import { mockApi } from '../../mock/mockApi';
import { api } from '../../lib/api';
import type { Incident } from '../../lib/contracts';

async function fetchIncident(id: string): Promise<Incident> {
  if (USE_MOCK) return mockApi.getIncident(id);
  return api.get<Incident>(`/incidents/${id}`);
}

export function useIncident(id: string | null) {
  return useQuery({
    queryKey: qk.incident(id ?? ''),
    queryFn: () => fetchIncident(id!),
    enabled: id !== null,
  });
}
