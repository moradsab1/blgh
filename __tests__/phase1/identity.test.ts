import { deriveEmojis, ensureIdentity, getPublicIdentifier, deleteIdentity } from '../../src/core/identity';

describe('deriveEmojis', () => {
  it('returns a 3-emoji tuple', () => {
    const tag = deriveEmojis('aabbccdd11223344');
    expect(tag).toHaveLength(3);
    tag.forEach(emoji => expect(typeof emoji).toBe('string'));
  });

  it('is deterministic — same key always gives same tag', () => {
    const key = 'deadbeef12345678deadbeef12345678';
    expect(deriveEmojis(key)).toEqual(deriveEmojis(key));
  });

  it('different keys produce different tags (usually)', () => {
    expect(deriveEmojis('aaaa0000bbbb1111cccc2222dddd3333'))
      .not.toEqual(deriveEmojis('ffff9999eeee8888dddd7777cccc6666'));
  });
});

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
