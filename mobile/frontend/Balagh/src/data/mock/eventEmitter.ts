import type { WsEvent, Category, Severity, AppNotification } from '../../core/types';
import { db } from './db';

type EventHandler = (event: WsEvent) => void;

const handlers: Set<EventHandler> = new Set();

export const wsEventEmitter = {
  subscribe: (handler: EventHandler): (() => void) => {
    handlers.add(handler);
    return () => handlers.delete(handler);
  },
  emit: (event: WsEvent): void => {
    // Snapshot first so a handler that (un)subscribes during dispatch is safe,
    // and isolate failures so one throwing handler can't drop the rest.
    [...handlers].forEach(h => {
      try {
        h(event);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[wsEventEmitter] handler threw:', e);
      }
    });
  },
};

// Periodic mock emitter — fires new incidents, status changes, notifications,
// and scheduled resolves to exercise live UI during demos.
let emitterTimer: ReturnType<typeof setInterval> | null = null;
let scheduledResolveTimer: ReturnType<typeof setTimeout> | null = null;

interface MockSeed {
  category: Category;
  severity: Severity;
  description: string;
  localityId: string;
  coords: { lat: number; lng: number };
}

// Seeds spread across multiple cities so demo pins don't stack in one spot.
const MOCK_SEEDS: MockSeed[] = [
  {
    category: 'SUSPICIOUS',
    severity: 'medium',
    description: 'دراجة نارية بدون لوحة تتجول في الشوارع الفرعية.',
    localityId: 'umm-al-fahm',
    coords: { lat: 32.5175, lng: 35.1612 },
  },
  {
    category: 'ASSAULT',
    severity: 'high',
    description: 'مشاجرة بين مجموعتين قرب المحطة. الوضع يتصاعد.',
    localityId: 'lod',
    coords: { lat: 31.9528, lng: 34.8990 },
  },
  {
    category: 'GUNFIRE',
    severity: 'critical',
    description: 'إطلاق رصاص متعدد في الهواء. الناس يهربون.',
    localityId: 'nazareth',
    coords: { lat: 32.7020, lng: 35.3015 },
  },
  {
    category: 'ROBBERY',
    severity: 'high',
    description: 'سرقة كابلات نحاسية من مبنى قيد الإنشاء.',
    localityId: 'haifa',
    coords: { lat: 32.7910, lng: 34.9870 },
  },
  {
    category: 'SUSPICIOUS',
    severity: 'low',
    description: 'حقيبة متروكة عند مدخل المركز التجاري.',
    localityId: 'taibe',
    coords: { lat: 32.2680, lng: 34.9975 },
  },
  {
    category: 'OTHER',
    severity: 'medium',
    description: 'تجمع غير عادي خارج عيادة الحي بعد ساعات العمل.',
    localityId: 'baqa',
    coords: { lat: 32.4195, lng: 35.0410 },
  },
  {
    category: 'STABBING',
    severity: 'critical',
    description: 'بلاغ عن اعتداء بآلة حادة. الإسعاف في الطريق.',
    localityId: 'jaffa',
    coords: { lat: 32.0525, lng: 34.7520 },
  },
];

let mockIdCounter = 1000;

function nextIncident(): { id: string; ref: string; seed: MockSeed } {
  const seed = MOCK_SEEDS[Math.floor(Math.random() * MOCK_SEEDS.length)];
  const id = String(++mockIdCounter);
  const ref = `BLG-M${mockIdCounter.toString(36).toUpperCase()}`;
  return { id, ref, seed };
}

function notificationFor(incident: { ref: string; category: Category; severity: Severity }): AppNotification {
  const titles: Record<Severity, string> = {
    critical: 'تنبيه عاجل قريب',
    high: 'حادثة قريبة',
    medium: 'بلاغ في منطقتك',
    low: 'تنبيه منطقة',
  };
  const bodies: Record<Category, string> = {
    GUNFIRE: 'تم الإبلاغ عن إطلاق نار في منطقتك. ابقَ في مكان آمن.',
    STABBING: 'حادثة طعن قريبة. تجنّب المنطقة.',
    ASSAULT: 'مشاجرة جسدية قريبة. كن حذراً.',
    ROBBERY: 'بلاغ عن سرقة قريبة. تحقّق من ممتلكاتك.',
    SUSPICIOUS: 'نشاط مشبوه في منطقتك. الانتباه مهم.',
    OTHER: 'بلاغ جديد في منطقتك يستحق الاطلاع.',
  };
  return {
    id: `auto-${Date.now()}`,
    type: 'nearby',
    title: titles[incident.severity],
    body: bodies[incident.category],
    createdAt: new Date().toISOString(),
    read: false,
    incidentRef: incident.ref,
  };
}

export const startMockEmitter = (): void => {
  if (emitterTimer) return;

  // Schedule a single demo resolve at 90s so the audience sees the fade-out
  // animation on the seeded high-severity incident at least once.
  scheduledResolveTimer = setTimeout(() => {
    wsEventEmitter.emit({ t: 'incident.resolved', id: '2' });
  }, 90_000);

  emitterTimer = setInterval(() => {
    const roll = Math.random();

    if (roll < 0.45) {
      // New incident — also emit a paired notification so the inbox feels alive.
      const { id, ref, seed } = nextIncident();
      const incident = {
        id,
        ref,
        category: seed.category,
        severity: seed.severity,
        description: seed.description,
        lat: seed.coords.lat,
        lng: seed.coords.lng,
        localityId: seed.localityId,
        createdAt: new Date().toISOString(),
        confirmations: 0,
        denials: 0,
        myVote: null,
      };
      db.incidents.add(incident);
      wsEventEmitter.emit({ t: 'incident.created', incident });

      // Critical/high incidents trigger an inbox notification + an active status.
      if (seed.severity === 'critical' || seed.severity === 'high') {
        const notif = notificationFor(incident);
        db.notifications.add(notif);
        wsEventEmitter.emit({ t: 'notification.new', notification: notif });
        if (seed.severity === 'critical') {
          wsEventEmitter.emit({ t: 'status.changed', state: 'active', reason: 'critical_nearby' });
        }
      }
    } else if (roll < 0.6) {
      // Status oscillation: alternate between watch and calm.
      const state = Math.random() < 0.65 ? 'watch' : 'calm';
      wsEventEmitter.emit({ t: 'status.changed', state, reason: state === 'watch' ? 'incident_nearby' : 'all_clear' });
    } else if (roll < 0.72) {
      // Lightweight notification-only event (e.g. follow-up reminder).
      const notif: AppNotification = {
        id: `auto-${Date.now()}`,
        type: 'follow_up',
        title: 'هل أنت بأمان؟',
        body: 'إذا كان بلاغك السابق لا يزال نشطاً، يمكنك إضافة تفاصيل.',
        createdAt: new Date().toISOString(),
        read: false,
      };
      db.notifications.add(notif);
      wsEventEmitter.emit({ t: 'notification.new', notification: notif });
    }
  }, 15000);
};

export const stopMockEmitter = (): void => {
  if (emitterTimer) {
    clearInterval(emitterTimer);
    emitterTimer = null;
  }
  if (scheduledResolveTimer) {
    clearTimeout(scheduledResolveTimer);
    scheduledResolveTimer = null;
  }
};
