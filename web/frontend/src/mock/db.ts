import type { Incident, Locality, Comment } from '../lib/contracts';

export const mockLocalities: Locality[] = [
  { id: 'loc-1', nameAr: 'الناصرة',   nameHe: 'נצרת',         nameEn: 'Nazareth',     lat: 32.6996, lng: 35.3035 },
  { id: 'loc-2', nameAr: 'حيفا',      nameHe: 'חיפה',          nameEn: 'Haifa',        lat: 32.7940, lng: 34.9896 },
  { id: 'loc-3', nameAr: 'أم الفحم',  nameHe: 'אום אל-פחם',   nameEn: 'Umm al-Fahm', lat: 32.5165, lng: 35.1529 },
  { id: 'loc-4', nameAr: 'طمرة',      nameHe: 'טמרה',          nameEn: 'Tamra',        lat: 32.8534, lng: 35.1992 },
  { id: 'loc-5', nameAr: 'سخنين',     nameHe: "סח'נין",        nameEn: 'Sakhnin',      lat: 32.8679, lng: 35.3000 },
];

const now = Date.now();
const min = 60_000;
const hr  = 60 * min;

export const mockIncidents: Incident[] = [
  // ── الناصرة ──────────────────────────────────────────────────
  {
    id: 'inc-1', ref: 'BLG-000001', category: 'ASSAULT', severity: 'high',
    description: 'تعرض شخص للاعتداء بالقرب من الميدان الرئيسي',
    lat: 32.7020, lng: 35.3010, localityId: 'loc-1',
    createdAt: new Date(now - 15 * min).toISOString(),
    confirmations: 5, denials: 1, commentCount: 3, myVote: null,
  },
  {
    id: 'inc-2', ref: 'BLG-000002', category: 'GUNFIRE', severity: 'critical',
    description: 'إطلاق نار سُمع في الحي الغربي',
    lat: 32.6980, lng: 35.3050, localityId: 'loc-1',
    createdAt: new Date(now - 45 * min).toISOString(),
    confirmations: 12, denials: 0, commentCount: 7, myVote: null,
  },
  {
    id: 'inc-3', ref: 'BLG-000003', category: 'SUSPICIOUS', severity: 'medium',
    lat: 32.7010, lng: 35.3020, localityId: 'loc-1',
    createdAt: new Date(now - 2 * hr).toISOString(),
    confirmations: 2, denials: 3, commentCount: 1, myVote: null,
  },
  {
    id: 'inc-4', ref: 'BLG-000004', category: 'ROBBERY', severity: 'high',
    description: 'سرقة بالإكراه أمام البنك',
    lat: 32.7000, lng: 35.3040, localityId: 'loc-1',
    createdAt: new Date(now - 3 * hr).toISOString(),
    resolvedAt: new Date(now - 1 * hr).toISOString(),
    confirmations: 8, denials: 0, commentCount: 4, myVote: null,
  },

  // ── حيفا ─────────────────────────────────────────────────────
  {
    id: 'inc-5', ref: 'BLG-000005', category: 'STABBING', severity: 'critical',
    description: 'حادثة طعن في المنطقة التجارية',
    lat: 32.8000, lng: 34.9900, localityId: 'loc-2',
    createdAt: new Date(now - 20 * min).toISOString(),
    confirmations: 9, denials: 1, commentCount: 5, myVote: null,
  },
  {
    id: 'inc-6', ref: 'BLG-000006', category: 'SUSPICIOUS', severity: 'low',
    description: 'شخص مشبوه يراقب المدرسة',
    lat: 32.7900, lng: 34.9850, localityId: 'loc-2',
    createdAt: new Date(now - 50 * min).toISOString(),
    confirmations: 3, denials: 2, commentCount: 0, myVote: null,
  },

  // ── أم الفحم ─────────────────────────────────────────────────
  {
    id: 'inc-7', ref: 'BLG-000007', category: 'ASSAULT', severity: 'medium',
    description: 'شجار بين مجموعتين في الشارع الرئيسي',
    lat: 32.5200, lng: 35.1550, localityId: 'loc-3',
    createdAt: new Date(now - 30 * min).toISOString(),
    confirmations: 4, denials: 0, commentCount: 2, myVote: null,
  },
  {
    id: 'inc-8', ref: 'BLG-000008', category: 'ROBBERY', severity: 'high',
    description: 'سرقة مركبة بالقوة',
    lat: 32.5180, lng: 35.1520, localityId: 'loc-3',
    createdAt: new Date(now - 90 * min).toISOString(),
    confirmations: 6, denials: 1, commentCount: 3, myVote: null,
  },

  // ── طمرة ─────────────────────────────────────────────────────
  {
    id: 'inc-9', ref: 'BLG-000009', category: 'GUNFIRE', severity: 'critical',
    description: 'إطلاق نار متعدد قرب المستشفى',
    lat: 32.8540, lng: 35.2000, localityId: 'loc-4',
    createdAt: new Date(now - 10 * min).toISOString(),
    confirmations: 15, denials: 0, commentCount: 8, myVote: null,
  },
  {
    id: 'inc-10', ref: 'BLG-000010', category: 'OTHER', severity: 'medium',
    description: 'حريق في موقع سكني',
    lat: 32.8520, lng: 35.1980, localityId: 'loc-4',
    createdAt: new Date(now - 75 * min).toISOString(),
    confirmations: 7, denials: 0, commentCount: 2, myVote: null,
  },

  // ── سخنين ─────────────────────────────────────────────────────
  {
    id: 'inc-11', ref: 'BLG-000011', category: 'ASSAULT', severity: 'low',
    description: 'شجار بسيط أمام المركز التجاري',
    lat: 32.8700, lng: 35.3010, localityId: 'loc-5',
    createdAt: new Date(now - 4 * hr).toISOString(),
    confirmations: 2, denials: 1, commentCount: 0, myVote: null,
  },
  {
    id: 'inc-12', ref: 'BLG-000012', category: 'SUSPICIOUS', severity: 'low',
    description: 'مركبة مشبوهة متوقفة منذ فترة طويلة',
    lat: 32.8690, lng: 35.3020, localityId: 'loc-5',
    createdAt: new Date(now - 5 * hr).toISOString(),
    resolvedAt: new Date(now - 2 * hr).toISOString(),
    confirmations: 3, denials: 0, commentCount: 1, myVote: null,
  },
];

export const mockComments: Comment[] = [
  {
    id: 'cmt-1', incidentId: 'inc-1',
    identityTag: ['🦊', '🌙', '⚡'],
    body: 'شاهدت الحادثة بنفسي، الأمر خطير',
    createdAt: new Date(now - 10 * min).toISOString(),
  },
  {
    id: 'cmt-2', incidentId: 'inc-1',
    identityTag: ['🐺', '🌊', '🔥'],
    body: 'وصلت الشرطة للمكان',
    createdAt: new Date(now - 5 * min).toISOString(),
  },
  {
    id: 'cmt-3', incidentId: 'inc-2',
    identityTag: ['🦅', '💫', '🌿'],
    body: 'سمعت ثلاث طلقات متتالية',
    createdAt: new Date(now - 40 * min).toISOString(),
  },
];
