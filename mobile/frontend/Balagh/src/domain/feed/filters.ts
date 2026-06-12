/**
 * Feed history filtering — §5.10.
 *
 * The map only ever shows currently open incidents (last 24 h, served by the
 * backend), but the feed lets users browse history: a time range (24 h /
 * last week / last month) optionally narrowed to a single locality, e.g.
 * "last month in Nazareth".
 */

import type { Category, Incident } from '../../core/types';

export type FeedRangeKey = 'day' | 'week' | 'month';

export const FEED_RANGES: FeedRangeKey[] = ['day', 'week', 'month'];

export const FEED_RANGE_HOURS: Record<FeedRangeKey, number> = {
  day: 24,
  week: 24 * 7,
  month: 24 * 30,
};

export interface FeedFilter {
  range: FeedRangeKey;
  /** Restrict to one locality; null/undefined = all localities. */
  localityId?: string | null;
  query?: string;
  now?: number;
}

export function filterIncidents(
  incidents: Incident[],
  filter: FeedFilter,
  categoryLabels?: Partial<Record<Category, string>>,
): Incident[] {
  const now = filter.now ?? Date.now();
  const maxAgeMs = FEED_RANGE_HOURS[filter.range] * 3_600_000;
  const q = filter.query?.trim().toLowerCase() ?? '';

  return incidents.filter(i => {
    if (now - new Date(i.createdAt).getTime() > maxAgeMs) return false;
    if (filter.localityId && i.localityId !== filter.localityId) return false;
    if (q) {
      const haystack = `${i.description ?? ''} ${i.ref} ${categoryLabels?.[i.category] ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
