import { pool } from '../../db/client';
import type { AppNotification } from '../../lib/contracts';

interface NotificationRow {
  id: string;
  device_id: string;
  type: string;
  title: string;
  body: string;
  incident_ref: string | null;
  read: boolean;
  created_at: string;
}

export function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type as AppNotification['type'],
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read,
    incidentRef: row.incident_ref ?? undefined,
  };
}

export async function getNotifications(deviceId: string): Promise<AppNotification[]> {
  const { rows } = await pool.query<NotificationRow>(
    `SELECT id, device_id, type, title, body, incident_ref, read, created_at
     FROM notifications
     WHERE device_id = $1
     ORDER BY created_at DESC`,
    [deviceId],
  );
  return rows.map(rowToNotification);
}

export async function markRead(deviceId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await pool.query(
    `UPDATE notifications SET read = true
     WHERE device_id = $1 AND id = ANY($2::uuid[])`,
    [deviceId, ids],
  );
}

export async function markAllRead(deviceId: string): Promise<void> {
  await pool.query(
    'UPDATE notifications SET read = true WHERE device_id = $1',
    [deviceId],
  );
}
