import { useQueryClient } from '@tanstack/react-query';
import { USE_MOCK } from '../../config';
import { mockApi } from '../../mock/mockApi';
import { api, ApiRequestError } from '../../lib/api';
import { clearToken } from '../../auth/token';
import { qk } from '../../lib/queryClient';
import type { Incident } from '../../lib/contracts';

export type AdminAction = 'resolve' | 'hide';

interface Params {
  lat: number;
  lng: number;
  radiusKm: number;
  onUnauthorized: () => void;
}

export function useAdminActions({ lat, lng, radiusKm, onUnauthorized }: Params) {
  const queryClient = useQueryClient();
  const listKey = qk.incidents(lat, lng, radiusKm);

  async function perform(action: AdminAction, incidentId: string): Promise<void> {
    // Optimistic update
    if (action === 'resolve') {
      queryClient.setQueryData<Incident[]>(listKey, (prev = []) =>
        prev.map((i) =>
          i.id === incidentId ? { ...i, resolvedAt: new Date().toISOString() } : i,
        ),
      );
    } else {
      queryClient.setQueryData<Incident[]>(listKey, (prev = []) =>
        prev.filter((i) => i.id !== incidentId),
      );
    }

    try {
      if (USE_MOCK) {
        if (action === 'resolve') await mockApi.resolveIncident(incidentId);
        else await mockApi.hideIncident(incidentId);
      } else {
        await api.adminPost(`/incidents/${incidentId}/${action}`);
      }
      // Also invalidate the individual incident cache
      queryClient.invalidateQueries({ queryKey: qk.incident(incidentId) });
    } catch (err) {
      // Roll back optimistic update on failure
      queryClient.invalidateQueries({ queryKey: listKey });

      if (err instanceof ApiRequestError && err.status === 401) {
        clearToken();
        onUnauthorized();
      }
      throw err;
    }
  }

  return { perform };
}
