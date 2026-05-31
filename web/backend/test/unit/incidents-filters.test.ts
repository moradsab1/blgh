import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Incident } from '../../src/lib/contracts';

// Mock the db/client module before importing the service
vi.mock('../../src/db/client', () => ({
  pool: {
    query: vi.fn(),
  },
  db: {},
}));

// Mock config to avoid env var requirement in tests
vi.mock('../../src/config', () => ({
  config: {
    DATABASE_URL: 'postgresql://test',
    OPERATOR_TOKEN: 'test-token',
    PORT: 4000,
    DASHBOARD_ORIGIN: 'http://localhost:5173',
    LOG_LEVEL: 'info',
  },
}));

import { pool } from '../../src/db/client';
import { listIncidents } from '../../src/modules/incidents/service';

const mockPool = pool as { query: ReturnType<typeof vi.fn> };

const baseRow = {
  id: 'uuid-1',
  ref: 'BLG-000001',
  category: 'GUNFIRE',
  severity: 'critical',
  description: null,
  lat: 32.0,
  lng: 34.8,
  locality_id: 'loc-1',
  created_at: '2025-01-01T12:00:00.000Z',
  resolved_at: null,
  hidden: false,
  confirmations: 2,
  denials: 0,
  comment_count: 1,
};

describe('listIncidents — filter query building', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
    mockPool.query.mockResolvedValue({ rows: [baseRow] });
  });

  it('defaults to active status filter', async () => {
    await listIncidents({});
    const [sql] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('i.hidden = false AND i.resolved_at IS NULL');
  });

  it('uses resolved predicate when status=resolved', async () => {
    await listIncidents({ status: 'resolved' });
    const [sql] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('i.resolved_at IS NOT NULL');
  });

  it('uses hidden predicate when status=hidden', async () => {
    await listIncidents({ status: 'hidden' });
    const [sql] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('i.hidden = true');
  });

  it('has no status predicate when status=all', async () => {
    await listIncidents({ status: 'all' });
    const [sql] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain('hidden =');
    expect(sql).not.toContain('resolved_at IS');
  });

  it('adds severity filter when provided', async () => {
    await listIncidents({ severity: ['critical', 'high'] });
    const [sql, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('i.severity = ANY(');
    expect(params).toContain(['critical', 'high']);
  });

  it('adds localityId filter', async () => {
    await listIncidents({ localityId: 'loc-42' });
    const [sql, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('i.locality_id =');
    expect(params).toContain('loc-42');
  });

  it('maps rows to Incident with myVote=null', async () => {
    const incidents: Incident[] = await listIncidents({});
    expect(incidents[0].myVote).toBeNull();
    expect(incidents[0].ref).toBe('BLG-000001');
  });
});
