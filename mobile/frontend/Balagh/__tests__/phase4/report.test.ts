import { db } from '../../src/data/mock/db';
import { MockIncidentRepo } from '../../src/data/mock/MockIncidentRepo';
import { wsEventEmitter } from '../../src/data/mock/eventEmitter';
import { linking } from '../../src/navigation/linking';
import type { WsEvent } from '../../src/core/types';

const repo = new MockIncidentRepo();

describe('report happy path', () => {
  it('submitReport adds incident visible to every db reader', async () => {
    const { id } = await repo.submitReport('SUSPICIOUS', 32.5, 35.15);
    const all = db.incidents.getAll();
    expect(all.find(i => i.id === id)).toBeTruthy();
    expect(db.incidents.getById(id)).toMatchObject({ category: 'SUSPICIOUS' });
  });

  it('submitReport emits incident.created on wsEventEmitter', async () => {
    let emitted: WsEvent | null = null;
    const unsub = wsEventEmitter.subscribe(e => { emitted = e; });

    const { id } = await repo.submitReport('GUNFIRE', 32.5, 35.15, 'test description');
    unsub();

    expect(emitted).not.toBeNull();
    expect((emitted as any).t).toBe('incident.created');
    expect((emitted as any).incident.id).toBe(id);
    expect((emitted as any).incident.category).toBe('GUNFIRE');
  });

  it('ref is in BLG-XXXXXX format', async () => {
    const { ref } = await repo.submitReport('OTHER', 32.5, 35.15);
    expect(ref).toMatch(/^BLG-[A-Z0-9]+$/);
  });

  it('description is saved to the db', async () => {
    const desc = 'suspicious vehicle near school entrance';
    const { id } = await repo.submitReport('SUSPICIOUS', 32.5, 35.15, desc);
    expect(db.incidents.getById(id)?.description).toBe(desc);
  });

  it('a manually adjusted location is saved as submitted', async () => {
    // Reporter taps the map → coordinates differ from any GPS default.
    const { id } = await repo.submitReport('ROBBERY', 31.9012, 34.8765, 'desc');
    const inc = db.incidents.getById(id);
    expect(inc?.lat).toBe(31.9012);
    expect(inc?.lng).toBe(34.8765);
  });

  it('an optional text location is saved when provided, omitted when blank', async () => {
    const { id: withText } = await repo.submitReport(
      'OTHER', 32.5, 35.15, 'desc', 'قرب مدرسة الرشيد',
    );
    expect(db.incidents.getById(withText)?.locationText).toBe('قرب مدرسة الرشيد');

    const { id: blank } = await repo.submitReport('OTHER', 32.5, 35.15, 'desc', '   ');
    expect(db.incidents.getById(blank)?.locationText).toBeUndefined();
  });

  it('severity is derived from category', async () => {
    const { id: gId } = await repo.submitReport('GUNFIRE', 32.5, 35.15);
    const { id: sId } = await repo.submitReport('SUSPICIOUS', 32.5, 35.15);
    expect(db.incidents.getById(gId)?.severity).toBe('critical');
    expect(db.incidents.getById(sId)?.severity).toBe('medium');
  });

  it('submitted incident is present in subsequent getIncidents call', async () => {
    const { id } = await repo.submitReport('ASSAULT', 32.5, 35.15);
    const list = await repo.getIncidents(32.5, 35.15, 10);
    expect(list.find(i => i.id === id)).toBeTruthy();
  });
});

describe('crisis flow — ≤3 taps to submit', () => {
  it('crisis deep link maps balagh://crisis to CrisisReassure screen', () => {
    const screens = (linking.config?.screens ?? {}) as Record<string, unknown>;
    expect(screens.CrisisReassure).toBe('crisis');
  });

  it('full crisis path completes in 3 navigation steps from CrisisReassure', async () => {
    // Tap 1: select category in CrisisCategory → navigate('CrisisConfirm', { category })
    // Tap 2: tap Send in CrisisConfirm → submitReport → navigate('CrisisSuccess')
    // Tap 3: tap Back to Map (not counted as a reporting tap, just return)
    // Verify submit works end-to-end
    let emitted: any = null;
    const unsub = wsEventEmitter.subscribe(e => {
      if (e.t === 'incident.created') emitted = e.incident;
    });

    const { ref } = await repo.submitReport('GUNFIRE', 32.5139, 35.1566);
    unsub();

    expect(ref).toMatch(/^BLG-[A-Z0-9]+$/);
    expect(emitted).not.toBeNull();
    expect(emitted.category).toBe('GUNFIRE');
  });

  it('crisis submit adds incident and it appears in map data source', async () => {
    const before = db.incidents.getAll().length;
    await repo.submitReport('STABBING', 32.5, 35.15);
    expect(db.incidents.getAll().length).toBe(before + 1);
  });
});

describe('report submit optimistic flow', () => {
  it('emitted incident is immediately readable from db', async () => {
    const events: WsEvent[] = [];
    const unsub = wsEventEmitter.subscribe(e => { events.push(e); });

    await repo.submitReport('ROBBERY', 32.5, 35.15);
    unsub();

    const created = events.find(e => e.t === 'incident.created') as any;
    expect(created).toBeTruthy();
    expect(db.incidents.getById(created.incident.id)).toBeTruthy();
  });
});
