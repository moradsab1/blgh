import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export const qk = {
  health: ['health'] as const,
  localities: (q: string) => ['localities', q] as const,
  incidents: (lat: number, lng: number, radiusKm: number) =>
    ['incidents', lat, lng, radiusKm] as const,
  incident: (id: string) => ['incident', id] as const,
  comments: (id: string) => ['comments', id] as const,
  status: (lat: number, lng: number) => ['status', lat, lng] as const,
};
