import { db } from '../../src/data/mock/db';
import { MockIncidentRepo } from '../../src/data/mock/MockIncidentRepo';
import { ensureIdentity, getPublicKeyHex, deriveEmojis } from '../../src/core/identity';
import type { Incident } from '../../src/core/types';

const repo = new MockIncidentRepo();

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
  confirmations: 0,
  denials: 0,
  commentCount: 0,
  myVote: null,
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

  it('a vote mutation is reflected in subsequent reads', async () => {
    const inc = makeIncident('consistency-2');
    db.incidents.add(inc);

    await repo.vote('consistency-2', 'confirm');

    const updated = db.incidents.getById('consistency-2');
    expect(updated?.confirmations).toBe(1);
    expect(updated?.myVote).toBe('confirm');
  });
});

describe('votes are one-way and irrevocable', () => {
  it('a second vote on the same incident throws a 409', async () => {
    const inc = makeIncident('vote-1');
    db.incidents.add(inc);

    await repo.vote('vote-1', 'confirm');

    await expect(repo.vote('vote-1', 'deny')).rejects.toMatchObject({ code: 409 });

    // The count did not change after the rejected duplicate.
    expect(db.incidents.getById('vote-1')?.confirmations).toBe(1);
    expect(db.incidents.getById('vote-1')?.denials).toBe(0);
  });
});

describe('deterministic 3-emoji identity tag on comments', () => {
  beforeAll(async () => {
    await ensureIdentity();
  });

  it('the same commenter always gets the same emoji tag', async () => {
    const inc = makeIncident('comment-1');
    db.incidents.add(inc);

    const c1 = await repo.addComment('comment-1', 'first');
    const c2 = await repo.addComment('comment-1', 'second');

    expect(c1.identityTag).toEqual(c2.identityTag);
    expect(c1.identityTag).toEqual(deriveEmojis(getPublicKeyHex()));
    expect(c1.identityTag).toHaveLength(3);
  });

  it('addComment increments the incident comment count', async () => {
    const inc = makeIncident('comment-2');
    db.incidents.add(inc);

    await repo.addComment('comment-2', 'hello');
    expect(db.incidents.getById('comment-2')?.commentCount).toBe(1);
  });

  it('comment bodies are clamped to 280 characters', async () => {
    const inc = makeIncident('comment-3');
    db.incidents.add(inc);

    const long = 'x'.repeat(400);
    const c = await repo.addComment('comment-3', long);
    expect(c.body.length).toBe(280);
  });
});
