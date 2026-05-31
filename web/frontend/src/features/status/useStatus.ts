import { useQuery } from '@tanstack/react-query';
import { qk } from '../../lib/queryClient';
import { USE_MOCK } from '../../config';
import { mockApi } from '../../mock/mockApi';
import { api } from '../../lib/api';
import type { StatusResponse } from '../../lib/contracts';

async function fetchStatus(lat: number, lng: number): Promise<StatusResponse> {
  if (USE_MOCK) return mockApi.getStatus(lat, lng);
  return api.get<StatusResponse>(`/status?lat=${lat}&lng=${lng}`);
}

export function useStatus(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: qk.status(lat ?? 0, lng ?? 0),
    queryFn: () => fetchStatus(lat!, lng!),
    enabled: lat !== null && lng !== null,
    refetchInterval: 30_000,
  });
}
