import type { ILocalityRepository } from '../repositories/interfaces';
import type { Locality } from '../../core/types';
import { LOCALITIES } from './db';

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export class MockLocalityRepo implements ILocalityRepository {
  async searchLocalities(query: string): Promise<Locality[]> {
    await sleep(200);
    if (!query.trim()) return LOCALITIES;
    const q = query.toLowerCase();
    return LOCALITIES.filter(
      loc =>
        loc.nameAr.toLowerCase().includes(q) ||
        loc.nameHe.toLowerCase().includes(q) ||
        loc.nameEn.toLowerCase().includes(q),
    );
  }
}
