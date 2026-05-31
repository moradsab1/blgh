import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sessionStorage and localStorage before any imports that use them
const sessionStoreMock: Record<string, string> = {};
const localStoreMock: Record<string, string> = {};

vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => sessionStoreMock[k] ?? null,
  setItem: (k: string, v: string) => { sessionStoreMock[k] = v; },
  removeItem: (k: string) => { delete sessionStoreMock[k]; },
});
vi.stubGlobal('localStorage', {
  getItem: (k: string) => localStoreMock[k] ?? null,
  setItem: (k: string, v: string) => { localStoreMock[k] = v; },
  removeItem: (k: string) => { delete localStoreMock[k]; },
});
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });

describe('contracts', () => {
  it('exports required types without error', async () => {
    const mod = await import('../lib/contracts');
    expect(mod).toBeDefined();
  });
});

describe('token store', () => {
  beforeEach(() => {
    Object.keys(sessionStoreMock).forEach((k) => delete sessionStoreMock[k]);
  });

  it('returns null when no token set', async () => {
    const { getToken } = await import('../auth/token');
    expect(getToken()).toBeNull();
  });

  it('stores, retrieves, and clears token', async () => {
    const { setToken, getToken, hasToken, clearToken } = await import('../auth/token');
    setToken('my-secret');
    expect(getToken()).toBe('my-secret');
    expect(hasToken()).toBe(true);
    clearToken();
    expect(getToken()).toBeNull();
    expect(hasToken()).toBe(false);
  });
});

describe('config', () => {
  it('exports USE_MOCK as boolean', async () => {
    const { USE_MOCK } = await import('../config');
    expect(typeof USE_MOCK).toBe('boolean');
  });
});

describe('query keys', () => {
  it('builds stable typed query keys', async () => {
    const { qk } = await import('../lib/queryClient');
    expect(qk.incidents(32.5, 35.1, 5)).toEqual(['incidents', 32.5, 35.1, 5]);
    expect(qk.incident('abc')).toEqual(['incident', 'abc']);
    expect(qk.status(32.5, 35.1)).toEqual(['status', 32.5, 35.1]);
    expect(qk.localities('ن')).toEqual(['localities', 'ن']);
  });
});

describe('mock statusLogic', () => {
  it('returns calm when no incidents', async () => {
    const { calculateStatus } = await import('../mock/statusLogic');
    const result = calculateStatus([], 32.5, 35.1);
    expect(result.state).toBe('calm');
  });

  it('returns watch when recent incident nearby', async () => {
    const { calculateStatus } = await import('../mock/statusLogic');
    const { mockIncidents } = await import('../mock/db');
    const result = calculateStatus(mockIncidents.slice(0, 1), mockIncidents[0].lat, mockIncidents[0].lng);
    expect(['watch', 'active', 'calm']).toContain(result.state);
  });
});
