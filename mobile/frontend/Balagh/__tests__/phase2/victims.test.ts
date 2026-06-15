import { db } from '../../src/data/mock/db';
import { MockVictimsRepo } from '../../src/data/mock/MockVictimsRepo';
import { strings } from '../../src/core/strings';

const repo = new MockVictimsRepo();

describe('victims statistics', () => {
  it('getStats returns current year, per-year list and an all-years total', async () => {
    const stats = await repo.getStats();
    const seed = db.victims.getAll();

    expect(stats.currentYear).toBe(seed[0].year); // descending → first is current
    expect(stats.currentYearCount).toBe(seed[0].count);
    expect(stats.byYear.length).toBe(seed.length);
    expect(stats.total).toBe(seed.reduce((s, y) => s + y.count, 0));
  });

  it('byYear is sorted descending by year', async () => {
    const { byYear } = await repo.getStats();
    const years = byYear.map(y => y.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('getRangeCount sums an inclusive year range', async () => {
    const all = db.victims.getAll();
    const lo = all[all.length - 1].year;
    const hi = all[0].year;
    const full = await repo.getRangeCount(lo, hi);
    expect(full).toBe(all.reduce((s, y) => s + y.count, 0));

    const single = await repo.getRangeCount(hi, hi);
    expect(single).toBe(all.find(y => y.year === hi)?.count);
  });

  it('getRangeCount tolerates reversed bounds', async () => {
    const all = db.victims.getAll();
    const lo = all[all.length - 1].year;
    const hi = all[0].year;
    const forward = await repo.getRangeCount(lo, hi);
    const reversed = await repo.getRangeCount(hi, lo);
    expect(reversed).toBe(forward);
  });

  it('victims chrome strings exist in every locale', () => {
    for (const s of [strings.ar, strings.he, strings.en]) {
      expect(s.victims.title).toBeTruthy();
      expect(s.victims.total).toBeTruthy();
      expect(s.victims.memorialLabel).toBeTruthy();
      expect(s.victims.memorialDesc).toBeTruthy();
    }
  });
});
