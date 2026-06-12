import { db } from '../../src/data/mock/db';
import { filterIncidents, FEED_RANGE_HOURS } from '../../src/domain/feed/filters';
import type { Incident } from '../../src/core/types';

const HOUR_MS = 3_600_000;

const makeIncident = (id: string, opts: Partial<Incident> = {}): Incident => ({
  id,
  ref: `BLG-T${id}`,
  category: 'SUSPICIOUS',
  severity: 'medium',
  description: 'test incident',
  lat: 32.5,
  lng: 35.15,
  localityId: 'umm-al-fahm',
  createdAt: new Date().toISOString(),
  ...opts,
});

describe('feed ↔ map data consistency', () => {
  it('an incident added to the shared db is visible to every reader', () => {
    const inc = makeIncident('consistency-1');
    db.incidents.add(inc);

    // The feed and the map both call db.incidents.getAll() — same source.
    const all = db.incidents.getAll();
    expect(all.find(i => i.id === 'consistency-1')).toBeTruthy();
    expect(db.incidents.getById('consistency-1')).toMatchObject({ id: 'consistency-1' });
  });

  it('a resolve mutation is reflected in subsequent reads', () => {
    const inc = makeIncident('consistency-2');
    db.incidents.add(inc);

    db.incidents.resolve('consistency-2');

    const updated = db.incidents.getById('consistency-2');
    expect(updated?.resolvedAt).toBeTruthy();
  });
});

describe('24 h open-incident window (map data)', () => {
  it('getOpen returns fresh unresolved incidents', () => {
    db.incidents.add(makeIncident('open-fresh'));
    expect(db.incidents.getOpen().find(i => i.id === 'open-fresh')).toBeTruthy();
  });

  it('getOpen excludes incidents older than 24 h', () => {
    db.incidents.add(
      makeIncident('open-stale', {
        createdAt: new Date(Date.now() - 25 * HOUR_MS).toISOString(),
      }),
    );
    expect(db.incidents.getOpen().find(i => i.id === 'open-stale')).toBeUndefined();
    // …but history (getAll) still has it
    expect(db.incidents.getAll().find(i => i.id === 'open-stale')).toBeTruthy();
  });

  it('getOpen excludes resolved incidents after the fade linger', () => {
    db.incidents.add(
      makeIncident('open-resolved', {
        createdAt: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
        resolvedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      }),
    );
    expect(db.incidents.getOpen().find(i => i.id === 'open-resolved')).toBeUndefined();
  });

  it('getOpen briefly keeps a just-resolved incident so the map can fade it out', () => {
    db.incidents.add(
      makeIncident('open-fading', {
        createdAt: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
        resolvedAt: new Date().toISOString(),
      }),
    );
    expect(db.incidents.getOpen().find(i => i.id === 'open-fading')).toBeTruthy();
  });
});

describe('feed history filters', () => {
  const now = Date.now();
  const at = (hoursAgo: number): string => new Date(now - hoursAgo * HOUR_MS).toISOString();

  const dataset: Incident[] = [
    makeIncident('f-today', { createdAt: at(3) }),
    makeIncident('f-3days', { localityId: 'nazareth', createdAt: at(24 * 3), resolvedAt: at(24 * 3 - 2) }),
    makeIncident('f-3weeks', { localityId: 'nazareth', createdAt: at(24 * 21), resolvedAt: at(24 * 21 - 4) }),
    makeIncident('f-2months', { localityId: 'nazareth', createdAt: at(24 * 60) }),
  ];

  it('default 24 h range shows only today', () => {
    const out = filterIncidents(dataset, { range: 'day', now });
    expect(out.map(i => i.id)).toEqual(['f-today']);
  });

  it('week range includes the 3-day-old incident', () => {
    const out = filterIncidents(dataset, { range: 'week', now });
    expect(out.map(i => i.id).sort()).toEqual(['f-3days', 'f-today']);
  });

  it('month range in Nazareth shows that locality history only', () => {
    const out = filterIncidents(dataset, { range: 'month', localityIds: ['nazareth'], now });
    expect(out.map(i => i.id).sort()).toEqual(['f-3days', 'f-3weeks']);
  });

  it('locality filter is multi-select', () => {
    const out = filterIncidents(dataset, {
      range: 'month',
      localityIds: ['nazareth', 'umm-al-fahm'],
      now,
    });
    expect(out.map(i => i.id).sort()).toEqual(['f-3days', 'f-3weeks', 'f-today']);
  });

  it('category filter is multi-select and combines with the other filters', () => {
    const mixed = [
      ...dataset,
      makeIncident('f-gunfire', { category: 'GUNFIRE', createdAt: at(5) }),
      makeIncident('f-robbery', { category: 'ROBBERY', createdAt: at(6) }),
    ];
    const out = filterIncidents(mixed, {
      range: 'day',
      categories: ['GUNFIRE', 'ROBBERY'],
      now,
    });
    expect(out.map(i => i.id).sort()).toEqual(['f-gunfire', 'f-robbery']);

    // Empty array = no category restriction
    const all = filterIncidents(mixed, { range: 'day', categories: [], now });
    expect(all.length).toBe(3);
  });

  it('nothing older than a month is ever shown', () => {
    const out = filterIncidents(dataset, { range: 'month', now });
    expect(out.find(i => i.id === 'f-2months')).toBeUndefined();
  });

  it('range hours are 24 / 168 / 720 / 2160 / 8760', () => {
    expect(FEED_RANGE_HOURS.day).toBe(24);
    expect(FEED_RANGE_HOURS.week).toBe(168);
    expect(FEED_RANGE_HOURS.month).toBe(720);
    expect(FEED_RANGE_HOURS.quarter).toBe(24 * 90);
    expect(FEED_RANGE_HOURS.year).toBe(24 * 365);
  });

  it('quarter (90 d) and year ranges include progressively older incidents', () => {
    const quarter = filterIncidents(dataset, { range: 'quarter', now });
    expect(quarter.map(i => i.id).sort()).toEqual(['f-2months', 'f-3days', 'f-3weeks', 'f-today']);

    const year = filterIncidents(dataset, { range: 'year', now });
    expect(year.find(i => i.id === 'f-2months')).toBeTruthy();
  });

  it('custom range returns only incidents between the chosen dates', () => {
    const out = filterIncidents(dataset, {
      range: 'custom',
      customFrom: now - 24 * 30 * HOUR_MS, // 30 days ago
      customTo: now - 24 * 2 * HOUR_MS, // 2 days ago
      now,
    });
    expect(out.map(i => i.id).sort()).toEqual(['f-3days', 'f-3weeks']);
  });

  it('custom range with open bounds falls back to no cut-off on that side', () => {
    const out = filterIncidents(dataset, {
      range: 'custom',
      customFrom: null,
      customTo: now - 24 * 40 * HOUR_MS, // everything older than 40 days
      now,
    });
    expect(out.map(i => i.id)).toEqual(['f-2months']);
  });
});
