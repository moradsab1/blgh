import { I18nManager } from 'react-native';
import type { AppLanguage } from '../types';

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['ar', 'he', 'en'];
export const RTL_LANGUAGES: AppLanguage[] = ['ar', 'he'];

export function isRTL(lang: AppLanguage): boolean {
  return RTL_LANGUAGES.includes(lang);
}

export function applyRTL(lang: AppLanguage): boolean {
  const shouldBeRTL = isRTL(lang);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.forceRTL(shouldBeRTL);
    I18nManager.allowRTL(shouldBeRTL);
    return true; // app restart needed to fully apply
  }
  return false;
}

const ar = {
  splash: { error: 'تعذّر تحميل التطبيق', retry: 'إعادة المحاولة' },
  language: {
    title: 'اختر لغتك',
    arabic: 'العربية',
    hebrew: 'עברית',
    english: 'English',
    restartTitle: 'إعادة التشغيل',
    restartMessage: 'يرجى إعادة تشغيل التطبيق لتطبيق اتجاه النص.',
  },
  welcome: {
    slide1: { title: 'بلّغ. شاهد. احمِ', subtitle: 'منصة تقارير مجتمعية فورية لمنطقتك' },
    slide2: { title: 'تنبيهات في نطاقك', subtitle: 'تنبيهات أمنية جغرافية لمنطقتك فور وقوعها' },
    slide3: {
      title: 'خصوصية مطلقة',
      subtitle: 'تقاريرك آمنة تماماً',
      check1: 'لا يُطلب رقم هاتف',
      check2: 'لا علاقة بالشرطة أو أي جهة رسمية',
      check3: 'تقارير مجهولة المصدر بالكامل',
      check4: 'بياناتك تبقى على جهازك فقط',
    },
    next: 'التالي',
    start: 'ابدأ الآن',
  },
  locality: {
    title: 'اختر بلدتك',
    subtitle: 'تُستخدم البلدة فقط لعرض التقارير القريبة — ولا تُشارك مع أي جهة',
    searchPlaceholder: 'ابحث عن بلدتك...',
    cta: 'تفعيل الحساب الآمن',
    selected: 'تم الاختيار',
    noResults: 'لا توجد نتائج مطابقة',
  },
  map: {
    status: { calm: 'هادئ', watch: 'يقظة', active: 'خطر نشط' },
    feed: 'قائمة الحوادث',
    report: 'بلاغ',
  },
  settings: {
    title: 'الإعدادات',
    account: {
      title: 'الحساب',
      locality: 'تغيير البلدة',
      language: 'تغيير اللغة',
      identifier: 'المعرّف العام',
    },
    privacy: {
      title: 'الخصوصية والأمان',
      constitution: 'ميثاق الخصوصية',
      deleteData: 'حذف بياناتي',
      deleteConfirmTitle: 'حذف جميع البيانات؟',
      deleteConfirmMessage: 'سيتم حذف جميع بياناتك من الجهاز والعودة إلى شاشة البداية. هذا الإجراء لا يمكن التراجع عنه.',
      deleteConfirmCancel: 'إلغاء',
      deleteConfirmConfirm: 'حذف',
    },
    notifications: {
      title: 'الإشعارات',
      nearby: 'الحوادث القريبة',
      statusChanges: 'تغييرات حالة المنطقة',
      followUp: 'دعوات المتابعة',
    },
    about: { title: 'حول', version: 'الإصدار' },
    support: { title: 'الدعم', howItWorks: 'كيف يعمل بلاغ؟', contact: 'تواصل معنا' },
  },
  common: {
    retry: 'إعادة المحاولة',
    back: 'رجوع',
    close: 'إغلاق',
    copied: 'تم النسخ',
    loading: 'جارٍ التحميل...',
    error: 'تعذر التحميل',
    networkError: 'تحقّق من اتصالك بالإنترنت ثم أعد المحاولة',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
  },
  errors: {
    generic: 'تعذّر التحميل',
    network: 'تحقّق من اتصالك بالإنترنت ثم أعد المحاولة',
    mapFailed: 'تعذّر تحميل الخريطة',
  },
  offline: {
    banner: 'أنت غير متصل. سيتم إرسال بلاغاتك عند عودة الاتصال.',
    reconnected: 'اتصلت مجدداً. جارٍ إرسال بلاغاتك المعلّقة.',
  },
};

const he: typeof ar = {
  splash: { error: 'לא ניתן לטעון את האפליקציה', retry: 'נסה שוב' },
  language: {
    title: 'בחר שפה',
    arabic: 'العربية',
    hebrew: 'עברית',
    english: 'English',
    restartTitle: 'הפעלה מחדש',
    restartMessage: 'אנא הפעל מחדש את האפליקציה כדי להחיל את כיוון הטקסט.',
  },
  welcome: {
    slide1: { title: 'דווח. צפה. הגן.', subtitle: 'פלטפורמת דיווח קהילתי מיידי לאזורך' },
    slide2: { title: 'התראות באזורך', subtitle: 'התראות ביטחוניות גאוגרפיות לאזורך מיד עם קרות האירוע' },
    slide3: {
      title: 'פרטיות מוחלטת',
      subtitle: 'הדיווחים שלך מאובטחים לחלוטין',
      check1: 'אין צורך במספר טלפון',
      check2: 'אין קשר לרשויות אכיפת החוק',
      check3: 'דיווחים אנונימיים לחלוטין',
      check4: 'המידע שלך נשמר על המכשיר בלבד',
    },
    next: 'הבא',
    start: 'התחל עכשיו',
  },
  locality: {
    title: 'בחר את ישובך',
    subtitle: 'הישוב משמש רק להצגת דיווחים סמוכים — ואינו משותף עם אף גורם',
    searchPlaceholder: 'חפש את ישובך...',
    cta: 'הפעל חשבון מאובטח',
    selected: 'נבחר',
    noResults: 'אין תוצאות תואמות',
  },
  map: {
    status: { calm: 'רגוע', watch: 'ערנות', active: 'סכנה פעילה' },
    feed: 'רשימת אירועים',
    report: 'דיווח',
  },
  settings: {
    title: 'הגדרות',
    account: { title: 'חשבון', locality: 'שנה ישוב', language: 'שנה שפה', identifier: 'מזהה ציבורי' },
    privacy: {
      title: 'פרטיות ואבטחה',
      constitution: 'מגילת הפרטיות',
      deleteData: 'מחק את הנתונים שלי',
      deleteConfirmTitle: 'למחוק את כל הנתונים?',
      deleteConfirmMessage: 'כל הנתונים שלך יימחקו מהמכשיר ותחזור לסך ההתחלה. פעולה זו אינה ניתנת לביטול.',
      deleteConfirmCancel: 'ביטול',
      deleteConfirmConfirm: 'מחק',
    },
    notifications: { title: 'התראות', nearby: 'אירועים סמוכים', statusChanges: 'שינויי מצב האזור', followUp: 'הזמנות מעקב' },
    about: { title: 'אודות', version: 'גרסה' },
    support: { title: 'תמיכה', howItWorks: "איך בלאג' עובד?", contact: 'צור קשר' },
  },
  common: {
    retry: 'נסה שוב',
    back: 'חזור',
    close: 'סגור',
    copied: 'הועתק',
    loading: 'טוען...',
    error: 'שגיאת טעינה',
    networkError: 'בדוק את חיבור האינטרנט ונסה שוב',
    save: 'שמור',
    cancel: 'ביטול',
    confirm: 'אשר',
  },
  errors: {
    generic: 'לא ניתן לטעון',
    network: 'בדוק את חיבור האינטרנט ונסה שוב',
    mapFailed: 'לא ניתן לטעון את המפה',
  },
  offline: {
    banner: 'אינך מחובר. הדיווחים שלך יישלחו עם חזרת החיבור.',
    reconnected: 'התחברת מחדש. שולח את הדיווחים הממתינים שלך.',
  },
};

const en: typeof ar = {
  splash: { error: 'Failed to load app', retry: 'Retry' },
  language: {
    title: 'Choose your language',
    arabic: 'العربية',
    hebrew: 'עברית',
    english: 'English',
    restartTitle: 'Restart Required',
    restartMessage: 'Please restart the app to apply the text direction.',
  },
  welcome: {
    slide1: { title: 'Report. Watch. Protect.', subtitle: 'Instant community reporting platform for your area' },
    slide2: { title: 'Alerts Where You Are', subtitle: 'Geo-targeted safety alerts for your area as they happen' },
    slide3: {
      title: 'Absolute Privacy',
      subtitle: 'Your reports are completely secure',
      check1: 'No phone number required',
      check2: 'No police or government connection',
      check3: 'Fully anonymous reports',
      check4: 'Data stays on your device only',
    },
    next: 'Next',
    start: 'Get Started',
  },
  locality: {
    title: 'Choose your locality',
    subtitle: 'Your locality is only used to show nearby reports — never shared with any party',
    searchPlaceholder: 'Search for your locality...',
    cta: 'Activate Secure Account',
    selected: 'Selected',
    noResults: 'No matching results',
  },
  map: {
    status: { calm: 'Calm', watch: 'Watch', active: 'Active Danger' },
    feed: 'Incident Feed',
    report: 'Report',
  },
  settings: {
    title: 'Settings',
    account: { title: 'Account', locality: 'Change Locality', language: 'Change Language', identifier: 'Public Identifier' },
    privacy: {
      title: 'Privacy & Security',
      constitution: 'Privacy Constitution',
      deleteData: 'Delete My Data',
      deleteConfirmTitle: 'Delete all data?',
      deleteConfirmMessage: 'All your data will be deleted from the device and you will return to onboarding. This action cannot be undone.',
      deleteConfirmCancel: 'Cancel',
      deleteConfirmConfirm: 'Delete',
    },
    notifications: { title: 'Notifications', nearby: 'Nearby incidents', statusChanges: 'Area status changes', followUp: 'Follow-up invitations' },
    about: { title: 'About', version: 'Version' },
    support: { title: 'Support', howItWorks: 'How does Balagh work?', contact: 'Contact us' },
  },
  common: {
    retry: 'Retry',
    back: 'Back',
    close: 'Close',
    copied: 'Copied',
    loading: 'Loading...',
    error: 'Failed to load',
    networkError: 'Check your internet connection and try again',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
  errors: {
    generic: 'Failed to load',
    network: 'Check your internet connection and try again',
    mapFailed: 'Failed to load map',
  },
  offline: {
    banner: 'You are offline. Reports will be sent when connection is restored.',
    reconnected: 'Reconnected. Sending your pending reports.',
  },
};

export const strings = { ar, he, en } as const;
export type Strings = typeof ar;
