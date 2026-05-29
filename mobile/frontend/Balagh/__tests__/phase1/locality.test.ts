import { LOCALITIES } from '../../src/data/mock/db';

describe('Locality data', () => {
  it('has expected localities', () => {
    expect(LOCALITIES.length).toBeGreaterThan(5);
  });

  it('each locality has all required fields', () => {
    LOCALITIES.forEach(loc => {
      expect(loc.id).toBeTruthy();
      expect(loc.nameAr).toBeTruthy();
      expect(loc.nameHe).toBeTruthy();
      expect(loc.nameEn).toBeTruthy();
      expect(typeof loc.lat).toBe('number');
      expect(typeof loc.lng).toBe('number');
    });
  });

  it('Umm al-Fahm is present', () => {
    const found = LOCALITIES.find(l => l.id === 'umm-al-fahm');
    expect(found).toBeDefined();
    expect(found?.nameAr).toBe('أم الفحم');
  });

  it('search works across Arabic script', () => {
    const q = 'الناصرة';
    const results = LOCALITIES.filter(loc =>
      loc.nameAr.toLowerCase().includes(q.toLowerCase()),
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it('search works across Hebrew script', () => {
    const q = 'חיפה';
    const results = LOCALITIES.filter(loc =>
      loc.nameHe.toLowerCase().includes(q.toLowerCase()),
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it('search works across English script', () => {
    const q = 'Nazareth';
    const results = LOCALITIES.filter(loc =>
      loc.nameEn.toLowerCase().includes(q.toLowerCase()),
    );
    expect(results.length).toBeGreaterThan(0);
  });
});
