import { db } from '../../src/data/mock/db';
import type { Incident } from '../../src/core/types';

const makeIncident = (id: string): Incident => ({
  id,
  ref: `BLG-T${id}`,
  category: 'SUSPICIOUS',
  severity: 'medium',
  description: 'test incident',
  lat: 32.5,
  lng: 35.15,
  localityId: 'umm-al-fahm',
  createdAt: new Date().toISOString(),
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
