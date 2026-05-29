import type { INotificationRepository } from '../repositories/interfaces';
import type { AppNotification } from '../../core/types';
import { db } from './db';

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export class MockNotificationRepo implements INotificationRepository {
  async getNotifications(): Promise<AppNotification[]> {
    await sleep(300);
    return db.notifications.getAll();
  }

  async markRead(ids: string[]): Promise<void> {
    await sleep(150);
    ids.forEach(id => db.notifications.markRead(id));
  }

  async markAllRead(): Promise<void> {
    await sleep(150);
    db.notifications.markAllRead();
  }
}
