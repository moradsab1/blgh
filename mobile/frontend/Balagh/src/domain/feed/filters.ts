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

// ── Facet counts ──────────────────────────────────────────────────────────────
// Each filter option shows how many incidents it would match under the user's
// OTHER active filters (e.g. with "last month" active, every city row shows
// that city's last-month count). The option's own dimension is ignored so all
// of its choices stay comparable.

/** Per-locality counts honoring the range + category filters. */
export function countByLocality(
  incidents: Incident[],
  filter: FeedFilter,
): Record<string, number> {
  const matched = filterIncidents(incidents, { ...filter, localityIds: [] });
  const out: Record<string, number> = {};
  for (const i of matched) out[i.localityId] = (out[i.localityId] ?? 0) + 1;
  return out;
}

/** Per-category counts honoring the range + locality filters. */
export function countByCategory(
  incidents: Incident[],
  filter: FeedFilter,
): Partial<Record<Category, number>> {
  const matched = filterIncidents(incidents, { ...filter, categories: [] });
  const out: Partial<Record<Category, number>> = {};
  for (const i of matched) out[i.category] = (out[i.category] ?? 0) + 1;
  return out;
}

/** Count per preset time range honoring the locality + category filters. */
export function countByRange(
  incidents: Incident[],
  filter: FeedFilter,
): Record<Exclude<FeedRangeKey, 'custom'>, number> {
  const keys = Object.keys(FEED_RANGE_HOURS) as Exclude<FeedRangeKey, 'custom'>[];
  const out = {} as Record<Exclude<FeedRangeKey, 'custom'>, number>;
  for (const key of keys) {
    out[key] = filterIncidents(incidents, { ...filter, range: key }).length;
  }
  return out;
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
