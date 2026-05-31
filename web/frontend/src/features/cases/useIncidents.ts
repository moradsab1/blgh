import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { qk } from '../../lib/queryClient';
import { USE_MOCK } from '../../config';
import { mockApi } from '../../mock/mockApi';
import { api } from '../../lib/api';
import { createWsClient } from '../../lib/ws';
import { getToken } from '../../auth/token';
import type { Incident, WsEvent } from '../../lib/contracts';

function getDeviceId(): string {
  const stored = localStorage.getItem('balagh_device_id');
  if (stored) return stored;
  const id = `dashboard-${crypto.randomUUID()}`;
  localStorage.setItem('balagh_device_id', id);
  return id;
}

async function fetchIncidents(lat: number | null, lng: number | null, radiusKm: number): Promise<Incident[]> {
  if (USE_MOCK) return mockApi.getIncidents(lat, lng, radiusKm);
  // No locality selected → global view (all active incidents)
  if (lat === null || lng === null) return api.get<Incident[]>('/incidents');
  // Locality selected → geo-scoped view
  return api.get<Incident[]>(`/incidents?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
}

interface Params {
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  onWsState?: (state: 'connected' | 'reconnecting' | 'offline') => void;
}

export function useIncidents({ lat, lng, radiusKm, onWsState }: Params) {
  const queryClient = useQueryClient();
  const hasCoords = lat !== null && lng !== null;

  const query = useQuery({
    queryKey: qk.incidents(lat ?? 0, lng ?? 0, radiusKm),
    queryFn: () => fetchIncidents(lat, lng, radiusKm),
    enabled: true,
    // Poll for new incidents created by mobile/backend (cross-process; no live push)
    refetchInterval: USE_MOCK ? false : 20_000,
  });

  // WebSocket → cache bridge (real mode only)
  useEffect(() => {
    if (USE_MOCK) return;

    const handleEvent = (event: WsEvent) => {
      const key = qk.incidents(lat ?? 0, lng ?? 0, radiusKm);

      if (event.t === 'incident.created') {
        queryClient.setQueryData<Incident[]>(key, (prev = []) =>
          [event.incident, ...prev],
        );
      }
      if (event.t === 'vote.updated') {
        queryClient.setQueryData<Incident[]>(key, (prev = []) =>
          prev.map((i) =>
            i.id === event.id
              ? { ...i, confirmations: event.confirmations, denials: event.denials }
              : i,
          ),
        );
      }
      if (event.t === 'incident.resolved') {
        queryClient.setQueryData<Incident[]>(key, (prev = []) =>
          prev.map((i) =>
            i.id === event.id ? { ...i, resolvedAt: new Date().toISOString() } : i,
          ),
        );
      }
      if (event.t === 'status.changed') {
        queryClient.setQueryData(qk.status(lat ?? 0, lng ?? 0), {
          state: event.state,
          reason: event.reason,
        });
      }
    };

    const client = createWsClient({
      deviceId: getDeviceId(),
      token: getToken() ?? undefined,
      onEvent: handleEvent,
      onStateChange: onWsState ?? (() => {}),
    });
    if (hasCoords) {
      client.subscribe({ lat: lat!, lng: lng!, radiusKm });
    }

    return () => client.destroy();
  }, [lat, lng, radiusKm, hasCoords, queryClient, onWsState]);

  return query;
}
