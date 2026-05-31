import { useQuery } from '@tanstack/react-query';
import { qk } from '../../lib/queryClient';
import { USE_MOCK } from '../../config';
import { mockApi } from '../../mock/mockApi';
import { api } from '../../lib/api';
import type { Comment } from '../../lib/contracts';

async function fetchComments(incidentId: string): Promise<Comment[]> {
  if (USE_MOCK) return mockApi.getComments(incidentId);
  return api.get<Comment[]>(`/incidents/${incidentId}/comments`);
}

export function useComments(incidentId: string | null) {
  return useQuery({
    queryKey: qk.comments(incidentId ?? ''),
    queryFn: () => fetchComments(incidentId!),
    enabled: incidentId !== null,
  });
}
