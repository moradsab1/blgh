import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/db/client', () => ({
  pool: { query: vi.fn() },
  db: {},
}));

import { pool } from '../../src/db/client';
import { getNotifications, markRead, markAllRead } from '../../src/modules/notifications/service';

const mockQuery = pool.query as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockQuery.mockReset();
});

const fakeRow = {
  id: 'notif-1',
  device_id: 'device-a',
  type: 'nearby',
  title: 'بلاغ جديد',
  body: 'BLG-000001',
  incident_ref: 'BLG-000001',
  read: false,
  created_at: '2024-01-01T00:00:00.000Z',
};

describe('getNotifications', () => {
  it('returns mapped notifications for device', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeRow] });
    const result = await getNotifications('device-a');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'notif-1',
      type: 'nearby',
      title: 'بلاغ جديد',
      body: 'BLG-000001',
      incidentRef: 'BLG-000001',
      read: false,
    });
  });

  it('returns empty array when no notifications', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getNotifications('device-new');
    expect(result).toEqual([]);
  });

  it('maps null incident_ref to undefined', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...fakeRow, incident_ref: null }] });
    const [notif] = await getNotifications('device-a');
    expect(notif.incidentRef).toBeUndefined();
  });
});

describe('markRead', () => {
  it('does nothing when ids array is empty', async () => {
    await markRead('device-a', []);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('sends UPDATE query with device_id and ids', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await markRead('device-a', ['notif-1', 'notif-2']);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE notifications');
    expect(sql).toContain('read = true');
    expect(params).toEqual(['device-a', ['notif-1', 'notif-2']]);
  });
});

describe('markAllRead', () => {
  it('sends UPDATE query scoped to device_id', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 });
    await markAllRead('device-a');
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE notifications');
    expect(sql).toContain('read = true');
    expect(params).toEqual(['device-a']);
  });
});
