import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storage
const sessionStoreMock: Record<string, string> = {};
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => sessionStoreMock[k] ?? null,
  setItem: (k: string, v: string) => { sessionStoreMock[k] = v; },
  removeItem: (k: string) => { delete sessionStoreMock[k]; },
});
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-admin' });

describe('admin actions — mock resolve', () => {
  it('resolveIncident sets resolvedAt on the incident', async () => {
    const { mockApi } = await import('../mock/mockApi');
    const before = await mockApi.getIncident('inc-2');
    expect(before.resolvedAt).toBeUndefined();
    await mockApi.resolveIncident('inc-2');
    const after = await mockApi.getIncident('inc-2');
    expect(typeof after.resolvedAt).toBe('string');
  });
});

describe('admin actions — mock hide', () => {
  it('hideIncident removes incident from list', async () => {
    const { mockApi } = await import('../mock/mockApi');
    const before = await mockApi.getIncidents(0, 0, 100);
    const hadInc3 = before.some((i) => i.id === 'inc-3');
    expect(hadInc3).toBe(true);
    await mockApi.hideIncident('inc-3');
    const after = await mockApi.getIncidents(0, 0, 100);
    expect(after.some((i) => i.id === 'inc-3')).toBe(false);
  });
});

describe('WsEvent shapes', () => {
  it('incident.created event has incident object', () => {
    const event = {
      t: 'incident.created' as const,
      incident: {
        id: 'x', ref: 'BLG-X', category: 'OTHER' as const,
        severity: 'low' as const, lat: 0, lng: 0,
        localityId: 'loc-1', createdAt: new Date().toISOString(),
        confirmations: 0, denials: 0, commentCount: 0,
      },
    };
    expect(event.t).toBe('incident.created');
    expect(typeof event.incident.id).toBe('string');
  });

  it('vote.updated event has numeric counts', () => {
    const event = {
      t: 'vote.updated' as const,
      id: 'inc-1',
      confirmations: 5,
      denials: 2,
    };
    expect(event.t).toBe('vote.updated');
    expect(typeof event.confirmations).toBe('number');
    expect(typeof event.denials).toBe('number');
  });

  it('incident.resolved event has id', () => {
    const event = { t: 'incident.resolved' as const, id: 'inc-1' };
    expect(event.t).toBe('incident.resolved');
    expect(typeof event.id).toBe('string');
  });

  it('status.changed event has state and reason', () => {
    const event = {
      t: 'status.changed' as const,
      state: 'active' as const,
      reason: 'threshold exceeded',
    };
    expect(['calm', 'watch', 'active']).toContain(event.state);
    expect(typeof event.reason).toBe('string');
  });
});

describe('token — unauthorized flow', () => {
  beforeEach(() => {
    Object.keys(sessionStoreMock).forEach((k) => delete sessionStoreMock[k]);
  });

  it('clearToken removes token from sessionStorage', async () => {
    const { setToken, clearToken, hasToken } = await import('../auth/token');
    setToken('admin-secret');
    expect(hasToken()).toBe(true);
    clearToken();
    expect(hasToken()).toBe(false);
  });
});
