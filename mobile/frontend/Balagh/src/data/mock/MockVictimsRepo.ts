import type { IVictimsRepository } from '../repositories/interfaces';
import type { VictimStats } from '../../core/types';
import { db } from './db';

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const latency = (): number => 300 + Math.random() * 400;

export class MockVictimsRepo implements IVictimsRepository {
  async getStats(): Promise<VictimStats> {
    await sleep(latency());
    const byYear = db.victims.getAll(); // descending by year
    const currentYear = byYear[0]?.year ?? new Date().getFullYear();
    const currentYearCount = byYear.find(y => y.year === currentYear)?.count ?? 0;
    const total = byYear.reduce((sum, y) => sum + y.count, 0);
    return { currentYear, currentYearCount, byYear, total };
  }

  async getRangeCount(fromYear: number, toYear: number): Promise<number> {
    await sleep(latency());
    const [lo, hi] = fromYear <= toYear ? [fromYear, toYear] : [toYear, fromYear];
    return db.victims
      .getAll()
      .filter(y => y.year >= lo && y.year <= hi)
      .reduce((sum, y) => sum + y.count, 0);
  }
}
