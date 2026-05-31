import { describe, it, expect } from 'vitest';

describe('useIncident query key', () => {
  it('scopes to incident id', async () => {
    const { qk } = await import('../lib/queryClient');
    const key = qk.incident('inc-1');
    expect(key).toEqual(['incident', 'inc-1']);
  });
});

describe('useComments query key', () => {
  it('scopes to incident id', async () => {
    const { qk } = await import('../lib/queryClient');
    const key = qk.comments('inc-1');
    expect(key).toEqual(['comments', 'inc-1']);
  });
});

describe('mockApi.getIncident', () => {
  it('returns incident by id', async () => {
    const { mockApi } = await import('../mock/mockApi');
    const inc = await mockApi.getIncident('inc-1');
    expect(inc.id).toBe('inc-1');
    expect(typeof inc.ref).toBe('string');
    expect(typeof inc.severity).toBe('string');
    expect(typeof inc.confirmations).toBe('number');
    expect(typeof inc.denials).toBe('number');
  });

  it('throws when id not found', async () => {
    const { mockApi } = await import('../mock/mockApi');
    await expect(mockApi.getIncident('no-such-id')).rejects.toThrow();
  });
});

describe('mockApi.getComments', () => {
  it('returns comments for incident', async () => {
    const { mockApi } = await import('../mock/mockApi');
    const comments = await mockApi.getComments('inc-1');
    expect(Array.isArray(comments)).toBe(true);
    if (comments.length > 0) {
      const c = comments[0];
      expect(c.incidentId).toBe('inc-1');
      expect(Array.isArray(c.identityTag)).toBe(true);
      expect(c.identityTag).toHaveLength(3);
      expect(typeof c.body).toBe('string');
    }
  });

  it('returns empty array for incident with no comments', async () => {
    const { mockApi } = await import('../mock/mockApi');
    const comments = await mockApi.getComments('inc-no-comments');
    expect(comments).toEqual([]);
  });
});

describe('Comment identityTag', () => {
  it('each element of identityTag is an emoji string', async () => {
    const { mockComments } = await import('../mock/db');
    for (const c of mockComments) {
      expect(c.identityTag).toHaveLength(3);
      for (const tag of c.identityTag) {
        expect(typeof tag).toBe('string');
        expect(tag.length).toBeGreaterThan(0);
      }
    }
  });

  it('identityTag tuple renders as joined string', async () => {
    const { mockComments } = await import('../mock/db');
    const c = mockComments[0];
    const rendered = c.identityTag.join('');
    expect(typeof rendered).toBe('string');
    expect(rendered.length).toBeGreaterThan(0);
  });
});

describe('deferred stubs', () => {
  it('mock resolveIncident updates resolvedAt', async () => {
    const { mockApi } = await import('../mock/mockApi');
    await mockApi.resolveIncident('inc-1');
    const inc = await mockApi.getIncident('inc-1');
    expect(inc.resolvedAt).toBeDefined();
    expect(typeof inc.resolvedAt).toBe('string');
  });
});
