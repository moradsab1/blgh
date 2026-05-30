import { db } from '../../src/data/mock/db';
import { MockNotificationRepo } from '../../src/data/mock/MockNotificationRepo';
import { groupNotifications, unreadCount } from '../../src/domain/utils/notifications';
import type { AppNotification } from '../../src/core/types';

const repo = new MockNotificationRepo();

const LABELS = { today: 'Today', yesterday: 'Yesterday', lastWeek: 'This Week' };

const makeNotif = (id: string, msAgo: number, read = false): AppNotification => ({
  id,
  type: 'nearby',
  title: `Notification ${id}`,
  body: 'test body',
  createdAt: new Date(Date.now() - msAgo).toISOString(),
  read,
});

describe('inbox grouping', () => {
  it('groups a notification from today into the Today bucket', () => {
    const notifs = [makeNotif('t1', 5 * 60_000)]; // 5 min ago
    const groups = groupNotifications(notifs, LABELS);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('today');
    expect(groups[0].data).toHaveLength(1);
  });

  it('groups a notification from yesterday into the Yesterday bucket', () => {
    const notifs = [makeNotif('y1', 26 * 3_600_000)]; // 26h ago
    const groups = groupNotifications(notifs, LABELS);
    expect(groups[0].key).toBe('yesterday');
  });

  it('groups a notification from 3 days ago into the Last Week bucket', () => {
    const notifs = [makeNotif('w1', 3 * 86_400_000)]; // 3 days ago
    const groups = groupNotifications(notifs, LABELS);
    expect(groups[0].key).toBe('lastWeek');
  });

  it('groups a notification older than 7 days into its own date bucket', () => {
    const notifs = [makeNotif('o1', 10 * 86_400_000)]; // 10 days ago
    const groups = groupNotifications(notifs, LABELS);
    expect(groups[0].key).not.toMatch(/^(today|yesterday|lastWeek)$/);
  });

  it('puts multiple notifications from the same day in the same group', () => {
    const notifs = [
      makeNotif('a1', 10 * 60_000),
      makeNotif('a2', 20 * 60_000),
      makeNotif('a3', 30 * 60_000),
    ];
    const groups = groupNotifications(notifs, LABELS);
    expect(groups).toHaveLength(1);
    expect(groups[0].data).toHaveLength(3);
  });

  it('creates separate groups for different days', () => {
    const notifs = [
      makeNotif('b1', 5 * 60_000),         // today
      makeNotif('b2', 26 * 3_600_000),      // yesterday
      makeNotif('b3', 3 * 86_400_000),      // last week
    ];
    const groups = groupNotifications(notifs, LABELS);
    expect(groups).toHaveLength(3);
  });

  it('preserves notification order within a group', () => {
    const notifs = [
      makeNotif('c1', 5 * 60_000),
      makeNotif('c2', 15 * 60_000),
    ];
    const groups = groupNotifications(notifs, LABELS);
    expect(groups[0].data[0].id).toBe('c1');
    expect(groups[0].data[1].id).toBe('c2');
  });
});

describe('unread count', () => {
  it('returns 0 when all notifications are read', () => {
    const notifs = [makeNotif('r1', 100, true), makeNotif('r2', 200, true)];
    expect(unreadCount(notifs)).toBe(0);
  });

  it('counts only unread notifications', () => {
    const notifs = [
      makeNotif('u1', 100, false),
      makeNotif('u2', 200, true),
      makeNotif('u3', 300, false),
    ];
    expect(unreadCount(notifs)).toBe(2);
  });
});

describe('MockNotificationRepo', () => {
  it('getNotifications returns the mock db list', async () => {
    const all = await repo.getNotifications();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThanOrEqual(0);
  });

  it('markRead marks the specified notification as read', async () => {
    const notif: AppNotification = {
      id: 'mark-test-1',
      type: 'nearby',
      title: 'test',
      body: 'test',
      createdAt: new Date().toISOString(),
      read: false,
    };
    db.notifications.add(notif);

    await repo.markRead(['mark-test-1']);

    const updated = await repo.getNotifications();
    expect(updated.find(n => n.id === 'mark-test-1')?.read).toBe(true);
  });

  it('markAllRead clears all unread state', async () => {
    db.notifications.add({
      id: 'all-read-1',
      type: 'status',
      title: 'test',
      body: 'test',
      createdAt: new Date().toISOString(),
      read: false,
    });

    await repo.markAllRead();

    const all = await repo.getNotifications();
    expect(all.every(n => n.read)).toBe(true);
  });
});
