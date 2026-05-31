import type { Incident, Locality, Comment } from '../lib/contracts';

export const mockLocalities: Locality[] = [
  { id: 'loc-1', nameAr: 'الناصرة', nameHe: 'נצרת', nameEn: 'Nazareth', lat: 32.6996, lng: 35.3035 },
  { id: 'loc-2', nameAr: 'حيفا', nameHe: 'חיפה', nameEn: 'Haifa', lat: 32.7940, lng: 34.9896 },
  { id: 'loc-3', nameAr: 'أم الفحم', nameHe: 'אום אל-פחם', nameEn: 'Umm al-Fahm', lat: 32.5165, lng: 35.1529 },
  { id: 'loc-4', nameAr: 'طمرة', nameHe: 'טמרה', nameEn: 'Tamra', lat: 32.8534, lng: 35.1992 },
  { id: 'loc-5', nameAr: 'سخنين', nameHe: 'סח\'נין', nameEn: 'Sakhnin', lat: 32.8679, lng: 35.3000 },
];

const now = Date.now();

export const mockIncidents: Incident[] = [
  {
    id: 'inc-1',
    ref: 'BLG-000001',
    category: 'ASSAULT',
    severity: 'high',
    description: 'تعرض شخص للاعتداء بالقرب من الميدان الرئيسي',
    lat: 32.7020,
    lng: 35.3010,
    localityId: 'loc-1',
    createdAt: new Date(now - 15 * 60_000).toISOString(),
    confirmations: 5,
    denials: 1,
    commentCount: 3,
    myVote: null,
  },
  {
    id: 'inc-2',
    ref: 'BLG-000002',
    category: 'GUNFIRE',
    severity: 'critical',
    description: 'إطلاق نار سُمع في الحي الغربي',
    lat: 32.6980,
    lng: 35.3050,
    localityId: 'loc-1',
    createdAt: new Date(now - 45 * 60_000).toISOString(),
    confirmations: 12,
    denials: 0,
    commentCount: 7,
    myVote: null,
  },
  {
    id: 'inc-3',
    ref: 'BLG-000003',
    category: 'SUSPICIOUS',
    severity: 'medium',
    lat: 32.7010,
    lng: 35.3020,
    localityId: 'loc-1',
    createdAt: new Date(now - 2 * 60 * 60_000).toISOString(),
    confirmations: 2,
    denials: 3,
    commentCount: 1,
    myVote: null,
  },
  {
    id: 'inc-4',
    ref: 'BLG-000004',
    category: 'ROBBERY',
    severity: 'high',
    description: 'سرقة بالإكراه أمام البنك',
    lat: 32.7000,
    lng: 35.3040,
    localityId: 'loc-1',
    createdAt: new Date(now - 3 * 60 * 60_000).toISOString(),
    resolvedAt: new Date(now - 1 * 60 * 60_000).toISOString(),
    confirmations: 8,
    denials: 0,
    commentCount: 4,
    myVote: null,
  },
];

export const mockComments: Comment[] = [
  {
    id: 'cmt-1',
    incidentId: 'inc-1',
    identityTag: ['🦊', '🌙', '⚡'],
    body: 'شاهدت الحادثة بنفسي، الأمر خطير',
    createdAt: new Date(now - 10 * 60_000).toISOString(),
  },
  {
    id: 'cmt-2',
    incidentId: 'inc-1',
    identityTag: ['🐺', '🌊', '🔥'],
    body: 'وصل الشرطة للمكان',
    createdAt: new Date(now - 5 * 60_000).toISOString(),
  },
];
