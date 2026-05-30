// Ported verbatim from mobile/frontend/Balagh/src/data/mock/db.ts — LOCALITIES array.
import { Pool } from 'pg';
import { config } from '../config';

interface LocalityRow {
  id: string;
  name_ar: string;
  name_he: string;
  name_en: string;
  lat: number;
  lng: number;
}

const LOCALITIES: LocalityRow[] = [
  { id: 'umm-al-fahm', name_ar: 'أم الفحم', name_he: 'אום אל-פחם', name_en: 'Umm al-Fahm', lat: 32.5139, lng: 35.1566 },
  { id: 'lod', name_ar: 'اللد', name_he: 'לוד', name_en: 'Lod', lat: 31.9516, lng: 34.8945 },
  { id: 'ramla', name_ar: 'الرملة', name_he: 'רמלה', name_en: 'Ramla', lat: 31.9281, lng: 34.8681 },
  { id: 'nazareth', name_ar: 'الناصرة', name_he: 'נצרת', name_en: 'Nazareth', lat: 32.6996, lng: 35.3034 },
  { id: 'haifa', name_ar: 'حيفا', name_he: 'חיפה', name_en: 'Haifa', lat: 32.7940, lng: 34.9896 },
  { id: 'tira', name_ar: 'الطيرة', name_he: 'טירה', name_en: 'Tira', lat: 32.2337, lng: 34.9498 },
  { id: 'baqa', name_ar: 'باقة الغربية', name_he: 'בקה אל-גרביה', name_en: 'Baqa al-Gharbiyye', lat: 32.4180, lng: 35.0395 },
  { id: 'kafr-qasim', name_ar: 'كفر قاسم', name_he: 'כפר קאסם', name_en: 'Kafr Qasim', lat: 32.1130, lng: 34.9770 },
  { id: 'taibe', name_ar: 'الطيبة', name_he: 'טייבה', name_en: 'Tayibe', lat: 32.2665, lng: 34.9956 },
  { id: 'rahat', name_ar: 'رهط', name_he: 'רהט', name_en: 'Rahat', lat: 31.3927, lng: 34.7528 },
  { id: 'shefa-amr', name_ar: 'شفاعمرو', name_he: 'שפרעם', name_en: "Shefa-'Amr", lat: 32.8054, lng: 35.1680 },
  { id: 'sakhnin', name_ar: 'سخنين', name_he: "סח'נין", name_en: 'Sakhnin', lat: 32.8647, lng: 35.2961 },
  { id: 'arara', name_ar: 'عرعرة', name_he: 'ערערה', name_en: "Ar'ara", lat: 32.4588, lng: 35.0538 },
  { id: 'kafr-kanna', name_ar: 'كفر كنا', name_he: 'כפר כנא', name_en: 'Kafr Kanna', lat: 32.7456, lng: 35.3394 },
  { id: 'acre', name_ar: 'عكا', name_he: 'עכו', name_en: 'Acre', lat: 32.9261, lng: 35.0663 },
  { id: 'jaffa', name_ar: 'يافا', name_he: 'יפו', name_en: 'Jaffa', lat: 32.0503, lng: 34.7501 },
  { id: 'kafr-bara', name_ar: 'كفر برا', name_he: 'כפר ברא', name_en: 'Kafr Bara', lat: 32.1889, lng: 34.9631 },
  { id: 'jaljuliye', name_ar: 'جلجولية', name_he: "ג'לג'וליה", name_en: 'Jaljulye', lat: 32.1540, lng: 34.9502 },
];

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: config.DATABASE_URL });

  try {
    for (const loc of LOCALITIES) {
      await pool.query(
        `INSERT INTO localities (id, name_ar, name_he, name_en, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [loc.id, loc.name_ar, loc.name_he, loc.name_en, loc.lat, loc.lng],
      );
    }
    console.log(`seeded ${LOCALITIES.length} localities`);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('seed failed:', err);
  process.exit(1);
});
