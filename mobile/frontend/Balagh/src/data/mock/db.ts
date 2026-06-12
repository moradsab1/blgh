import type { Incident, AppNotification, Locality } from '../../core/types';

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
    description: 'سيارة بيضاء تتحرك ببطء قرب مدرسة الرشيد منذ نصف ساعة. السائق يراقب الأطفال أثناء خروجهم.',
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
    description: 'مشاجرة بين شابين في المنطقة التجارية، أحدهما يحمل عصا. الناس يتجمعون حولهم.',
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
    description: 'صوت إطلاق رصاص في الهواء قرب الحديقة العامة. ٣ طلقات على الأقل خلال دقيقة.',
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
    description: 'سرقة من سوبرماركت في الشارع الرئيسي. السارقون فروا في سيارة سوداء صغيرة باتجاه الجنوب.',
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
    description: 'اعتداء بسكين في منطقة المحطة المركزية. الإسعاف وصل والمصاب نُقل إلى المستشفى.',
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
    description: 'شخص يحاول فتح أبواب السيارات في الموقف خلف العمارة. غادر بعد دقائق.',
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
    description: 'تجمع مشبوه بالقرب من الجامع بعد منتصف الليل. الأصوات عالية والأمور تبدو متوترة.',
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
    description: 'شجار جماعي قرب ملعب كرة القدم. على الأقل ٥ أشخاص متورطين والوضع يتصاعد.',
    lat: 32.2670,
    lng: 34.9960,
    localityId: 'taibe',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
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


export const db = {
  incidents: {
    getAll: () => [..._incidents],
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
};
