import type { AppNotification } from '../../core/types';

export interface NotificationGroup {
  label: string;
  key: string;
  data: AppNotification[];
}

export interface GroupLabels {
  today: string;
  yesterday: string;
  lastWeek: string;
}

export function groupNotifications(
  notifications: AppNotification[],
  labels: GroupLabels,
  now: Date = new Date(),
): NotificationGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const groupMap = new Map<string, NotificationGroup>();

  const ensureGroup = (key: string, label: string): void => {
    if (!groupMap.has(key)) {
      groupMap.set(key, { key, label, data: [] });
    }
  };

  for (const notif of notifications) {
    const d = new Date(notif.createdAt);

    if (d >= startOfToday) {
      ensureGroup('today', labels.today);
      groupMap.get('today')!.data.push(notif);
    } else if (d >= startOfYesterday) {
      ensureGroup('yesterday', labels.yesterday);
      groupMap.get('yesterday')!.data.push(notif);
    } else if (d >= startOfWeek) {
      ensureGroup('lastWeek', labels.lastWeek);
      groupMap.get('lastWeek')!.data.push(notif);
    } else {
      const dateKey = d.toDateString();
      const dateLabel = d.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      ensureGroup(dateKey, dateLabel);
      groupMap.get(dateKey)!.data.push(notif);
    }
  }

  return Array.from(groupMap.values());
}

export function unreadCount(notifications: AppNotification[]): number {
  return notifications.filter(n => !n.read).length;
}
