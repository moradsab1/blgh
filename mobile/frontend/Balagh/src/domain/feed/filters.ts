/**
 * Feed history filtering — §5.10.
 *
 * The map only ever shows currently open incidents (last 24 h, served by the
 * backend), but the feed lets users browse history: quick time-range chips
 * (24 h / last week / last month), extended ranges behind the "more filters"
 * sheet (last 3 months / last year), or a fully custom date range — all
 * optionally narrowed to a single locality, e.g. "last month in Nazareth".
 * (Free-text search was removed from the feed — descriptions are prepared
 * options, so time + locality are the meaningful filters.)
 */

import type { Category, Incident } from '../../core/types';

export type FeedRangeKey = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/** Quick ranges rendered as inline chips in the filter bar. */
export const FEED_RANGES: Exclude<FeedRangeKey, 'quarter' | 'year' | 'custom'>[] = [
  'day',
  'week',
  'month',
];

/** Extended ranges offered inside the "more filters" sheet. */
export const FEED_MORE_RANGES: Extract<FeedRangeKey, 'quarter' | 'year'>[] = [
  'quarter',
  'year',
];

export const FEED_RANGE_HOURS: Record<Exclude<FeedRangeKey, 'custom'>, number> = {
  day: 24,
  week: 24 * 7,
  month: 24 * 30,
  quarter: 24 * 90,
  year: 24 * 365,
};

export interface FeedFilter {
  range: FeedRangeKey;
  /** Inclusive custom-range bounds (ms epoch) — used only when range === 'custom'. */
  customFrom?: number | null;
  customTo?: number | null;
  /** Restrict to these localities (multi-select); empty/null = all. */
  localityIds?: string[] | null;
  /** Restrict to these incident types (multi-select); empty/null = all. */
  categories?: Category[] | null;
  now?: number;
}

export function filterIncidents(incidents: Incident[], filter: FeedFilter): Incident[] {
  const now = filter.now ?? Date.now();

  return incidents.filter(i => {
    const createdMs = new Date(i.createdAt).getTime();
    if (filter.range === 'custom') {
      if (filter.customFrom != null && createdMs < filter.customFrom) return false;
      if (filter.customTo != null && createdMs > filter.customTo) return false;
    } else {
      if (now - createdMs > FEED_RANGE_HOURS[filter.range] * 3_600_000) return false;
    }
    if (filter.localityIds?.length && !filter.localityIds.includes(i.localityId)) return false;
    if (filter.categories?.length && !filter.categories.includes(i.category)) return false;
    return true;
  });
}
