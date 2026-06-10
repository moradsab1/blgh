import { ensureIdentity, getPublicIdentifier, deleteIdentity } from '../../src/core/identity';

describe('ensureIdentity', () => {
  beforeEach(async () => {
    await deleteIdentity();
  });

  it('creates and persists an identity', async () => {
    await ensureIdentity();
    const id = getPublicIdentifier();
    expect(id).toMatch(/^.{6}\.\.\..{6}$/);
  });

  it('is idempotent — same id on repeated calls', async () => {
    await ensureIdentity();
    const first = getPublicIdentifier();
    await ensureIdentity();
    expect(getPublicIdentifier()).toBe(first);
  });
});
