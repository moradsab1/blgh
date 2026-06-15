import type { Incident, AppNotification, FeedPost, Locality } from '../../core/types';
import { OPEN_INCIDENT_WINDOW_HOURS } from '../../core/config';
import { strings } from '../../core/strings';

// How long a just-resolved incident keeps appearing in the "open" set so the
// map can play its 30 s fade-out before the pin disappears.
const RESOLVED_LINGER_MS = 60_000;

// Seeded descriptions are never free text — reporters can only pick one of
// the prepared situation descriptions (§5.13), so the mock data references
// those exact options (Arabic, like the rest of the seed content).
const SITUATIONS = strings.ar.report.situations;

export const LOCALITIES: Locality[] = [
  { id: 'umm-al-fahm', nameAr: 'أم الفحم', nameHe: 'אום אל-פחם', nameEn: 'Umm al-Fahm', lat: 32.5139, lng: 35.1566 },
  { id: 'lod', nameAr: 'اللد', nameHe: 'לוד', nameEn: 'Lod', lat: 31.9516, lng: 34.8945 },
  { id: 'ramla', nameAr: 'الرملة', nameHe: 'רמלה', nameEn: 'Ramla', lat: 31.9281, lng: 34.8681 },
  { id: 'nazareth', nameAr: 'الناصرة', nameHe: 'נצרת', nameEn: 'Nazareth', lat: 32.6996, lng: 35.3034 },
  { id: 'haifa', nameAr: 'حيفا', nameHe: 'חיפה', nameEn: 'Haifa', lat: 32.7940, lng: 34.9896 },
  { id: 'tira', nameAr: 'الطيرة', nameHe: 'טירה', nameEn: 'Tira', lat: 32.2337, lng: 34.9498 },
  { id: 'baqa', nameAr: 'باقة الغربية', nameHe: 'בקה אל-גרביה', nameEn: "Baqa al-Gharbiyye", lat: 32.4180, lng: 35.0395 },
  { id: 'kafr-qasim', nameAr: 'كفر قاسم', nameHe: "כפר קאסם", nameEn: 'Kafr Qasim', lat: 32.1130, lng: 34.9770 },
  { id: 'taibe', nameAr: 'الطيبة', nameHe: 'טייבה', nameEn: 'Tayibe', lat: 32.2665, lng: 34.9956 },
  { id: 'rahat', nameAr: 'رهط', nameHe: 'רהט', nameEn: 'Rahat', lat: 31.3927, lng: 34.7528 },
  { id: 'shefa-amr', nameAr: 'شفاعمرو', nameHe: "שפרעם", nameEn: "Shefa-'Amr", lat: 32.8054, lng: 35.1680 },
  { id: 'sakhnin', nameAr: 'سخنين', nameHe: 'סח\'נין', nameEn: 'Sakhnin', lat: 32.8647, lng: 35.2961 },
  { id: 'arara', nameAr: 'عرعرة', nameHe: 'ערערה', nameEn: "Ar'ara", lat: 32.4588, lng: 35.0538 },
  { id: 'kafr-kanna', nameAr: 'كفر كنا', nameHe: 'כפר כנא', nameEn: 'Kafr Kanna', lat: 32.7456, lng: 35.3394 },
  { id: 'acre', nameAr: 'عكا', nameHe: 'עכו', nameEn: 'Acre', lat: 32.9261, lng: 35.0663 },
  { id: 'jaffa', nameAr: 'يافا', nameHe: 'יפו', nameEn: 'Jaffa', lat: 32.0503, lng: 34.7501 },
  { id: 'kafr-bara', nameAr: 'كفر برا', nameHe: 'כפר ברא', nameEn: 'Kafr Bara', lat: 32.1889, lng: 34.9631 },
  { id: 'jaljuliye', nameAr: 'جلجولية', nameHe: 'ג\'לג\'וליה', nameEn: 'Jaljulye', lat: 32.1540, lng: 34.9502 },
];

let _incidents: Incident[] = [
  {
    id: '1',
    ref: 'BLG-7Q2K9X',
    category: 'SUSPICIOUS',
    severity: 'medium',
    description: SITUATIONS.SUSPICIOUS[1],
    lat: 32.5145,
    lng: 35.1570,
    localityId: 'umm-al-fahm',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: '2',
    ref: 'BLG-8A3M2Y',
    category: 'ASSAULT',
    severity: 'high',
    description: SITUATIONS.ASSAULT[3],
    lat: 32.5130,
    lng: 35.1550,
    localityId: 'umm-al-fahm',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: '3',
    ref: 'BLG-9C4N1Z',
    category: 'GUNFIRE',
    severity: 'critical',
    description: SITUATIONS.GUNFIRE[2],
    lat: 32.7956,
    lng: 34.9921,
    localityId: 'haifa',
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
  {
    id: '4',
    ref: 'BLG-3F7P5K',
    category: 'ROBBERY',
    severity: 'high',
    description: SITUATIONS.ROBBERY[2],
    lat: 31.9530,
    lng: 34.8970,
    localityId: 'lod',
    createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
  },
  {
    id: '5',
    ref: 'BLG-5H8Q3L',
    category: 'STABBING',
    severity: 'critical',
    description: SITUATIONS.STABBING[0],
    lat: 32.7010,
    lng: 35.3050,
    localityId: 'nazareth',
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    id: '6',
    ref: 'BLG-2D6R4M',
    category: 'SUSPICIOUS',
    severity: 'low',
    description: SITUATIONS.SUSPICIOUS[2],
    lat: 32.0510,
    lng: 34.7530,
    localityId: 'jaffa',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: '7',
    ref: 'BLG-6J9S2N',
    category: 'OTHER',
    severity: 'medium',
    description: SITUATIONS.OTHER[2],
    lat: 32.4180,
    lng: 35.0395,
    localityId: 'baqa',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: '8',
    ref: 'BLG-4K1T7P',
    category: 'ASSAULT',
    severity: 'high',
    description: SITUATIONS.ASSAULT[1],
    lat: 32.2670,
    lng: 34.9960,
    localityId: 'taibe',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },

  // ── Historical incidents (older than the 24 h open window) ──
  // Not shown on the map — they back the feed's history filters
  // (last week / last month, per locality).
  {
    id: 'h1',
    ref: 'BLG-H1A2B3',
    category: 'ASSAULT',
    severity: 'high',
    description: SITUATIONS.ASSAULT[0],
    lat: 32.7001,
    lng: 35.2980,
    localityId: 'nazareth',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'h2',
    ref: 'BLG-H2C4D5',
    category: 'SUSPICIOUS',
    severity: 'medium',
    description: SITUATIONS.SUSPICIOUS[0],
    lat: 32.6975,
    lng: 35.3060,
    localityId: 'nazareth',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12 + 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'h3',
    ref: 'BLG-H3E6F7',
    category: 'ROBBERY',
    severity: 'high',
    description: SITUATIONS.ROBBERY[0],
    lat: 32.7012,
    lng: 35.3041,
    localityId: 'nazareth',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25 + 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'h4',
    ref: 'BLG-H4G8H9',
    category: 'GUNFIRE',
    severity: 'critical',
    description: SITUATIONS.GUNFIRE[3],
    lat: 32.5102,
    lng: 35.1493,
    localityId: 'umm-al-fahm',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'h5',
    ref: 'BLG-H5J1K2',
    category: 'SUSPICIOUS',
    severity: 'low',
    description: SITUATIONS.SUSPICIOUS[0],
    lat: 31.9495,
    lng: 34.8902,
    localityId: 'lod',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9 + 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'h6',
    ref: 'BLG-H6L3M4',
    category: 'OTHER',
    severity: 'medium',
    description: SITUATIONS.OTHER[0],
    lat: 32.7925,
    lng: 34.9889,
    localityId: 'haifa',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20 + 1000 * 60 * 60 * 3).toISOString(),
  },
];

let _notifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'nearby',
    title: 'حادثة قريبة',
    body: 'تم الإبلاغ عن نشاط مشبوه على بعد ٥٠٠ متر منك. كن حذراً.',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    read: false,
    incidentRef: 'BLG-7Q2K9X',
  },
  {
    id: 'n2',
    type: 'verification',
    title: 'بلاغك وصل',
    body: 'بلاغك يظهر الآن لسكان منطقتك. شكراً لمساهمتك.',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
    incidentRef: 'BLG-8A3M2Y',
  },
  {
    id: 'n3',
    type: 'status',
    title: 'אזור הופך לערני',
    body: 'מצב הביטחון של אזורך עלה ל"ערנות". מומלץ להישאר עירני.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: true,
  },
  {
    id: 'n4',
    type: 'follow_up',
    title: 'متابعة بلاغك',
    body: 'هل أنت بأمان؟ يمكنك إضافة تفاصيل أو تأكيد سلامتك.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: true,
    incidentRef: 'BLG-9C4N1Z',
  },
];


// Feeds content — organization announcements/events + curated news about
// violence in the Arab community. Content is Arabic seed text, like incidents.
let _feedPosts: FeedPost[] = [
  {
    id: 'fp1',
    kind: 'announcement',
    source: 'فريق بلاغ',
    title: 'ورشة مجتمعية حول السلامة الرقمية والأمان الشخصي',
    body: 'ينظّم فريق بلاغ ورشة مجانية في المركز الجماهيري لأم الفحم يوم السبت القادم، تتناول حماية الخصوصية والتبليغ الآمن. الدعوة عامة لجميع سكان البلدة.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'fp2',
    kind: 'news',
    source: 'تغطية مجتمعية',
    title: 'تصاعد حوادث العنف في البلدات العربية يدفع لجاناً أهلية للتحرك',
    body: 'شهدت عدة بلدات ارتفاعاً في حوادث إطلاق النار خلال الأسابيع الماضية، ما دفع لجاناً شعبية إلى إطلاق مبادرات وساطة وحراسات ليلية تطوعية لحماية الأحياء.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
  },
  {
    id: 'fp3',
    kind: 'announcement',
    source: 'فريق بلاغ',
    title: 'مبادرة وساطة لحل النزاعات قبل تفاقمها',
    body: 'بالتعاون مع لجان الأحياء، نطلق خط وساطة مجتمعي يتيح الإبلاغ المبكر عن التوترات بين العائلات قبل أن تتحول إلى عنف. كل البلاغات سرّية تماماً.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'fp4',
    kind: 'news',
    source: 'تغطية مجتمعية',
    title: 'حملة مطالبة بمعالجة جذور العنف والجريمة المنظمة',
    body: 'نظّم ناشطون وقفات في عدة بلدات للمطالبة بخطة شاملة لمكافحة الجريمة المنظمة ومصادر السلاح، مع التشديد على دور المجتمع في الحماية الذاتية.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
  {
    id: 'fp5',
    kind: 'announcement',
    source: 'فريق بلاغ',
    title: 'دليل سريع: ماذا تفعل عند سماع إطلاق نار؟',
    body: 'نشرنا دليلاً مختصراً بالخطوات الآمنة عند وقوع حادثة قريبة: الابتعاد عن النوافذ، البقاء منخفضاً، والإبلاغ فور الأمان. اطّلع عليه وشاركه مع عائلتك.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: 'fp6',
    kind: 'news',
    source: 'تغطية مجتمعية',
    title: 'مبادرات شبابية لإحياء المساحات العامة وتقليل التوتر',
    body: 'أطلق متطوعون شباب مشاريع لإنارة الشوارع وتنظيم فعاليات مسائية في الساحات العامة، بهدف استعادة الإحساس بالأمان في الأحياء الأكثر تأثراً.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
  },
];

export const db = {
  incidents: {
    getAll: () => [..._incidents],
    /**
     * "Currently open" incidents — what the backend will serve the map:
     * unresolved incidents reported within the last 24 h. Just-resolved
     * incidents linger briefly so the map can play its fade-out.
     */
    getOpen: (now: number = Date.now()) =>
      _incidents.filter(i => {
        const ageMs = now - new Date(i.createdAt).getTime();
        if (ageMs > OPEN_INCIDENT_WINDOW_HOURS * 3_600_000) return false;
        if (!i.resolvedAt) return true;
        return now - new Date(i.resolvedAt).getTime() < RESOLVED_LINGER_MS;
      }),
    getById: (id: string) => _incidents.find(i => i.id === id),
    add: (incident: Incident) => { _incidents = [incident, ..._incidents]; },
    update: (id: string, patch: Partial<Incident>) => {
      _incidents = _incidents.map(i => i.id === id ? { ...i, ...patch } : i);
    },
    resolve: (id: string) => {
      _incidents = _incidents.map(i =>
        i.id === id ? { ...i, resolvedAt: new Date().toISOString() } : i,
      );
    },
  },
  notifications: {
    getAll: () => [..._notifications],
    markRead: (id: string) => {
      _notifications = _notifications.map(n => n.id === id ? { ...n, read: true } : n);
    },
    markAllRead: () => {
      _notifications = _notifications.map(n => ({ ...n, read: true }));
    },
    add: (n: AppNotification) => { _notifications = [n, ..._notifications]; },
  },
  feedPosts: {
    getAll: () => [..._feedPosts],
    add: (p: FeedPost) => { _feedPosts = [p, ..._feedPosts]; },
  },
};
