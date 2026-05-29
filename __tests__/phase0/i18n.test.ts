import { strings, RTL_LANGUAGES, SUPPORTED_LANGUAGES, isRTL } from '../../src/core/strings';

// Recursive key extractor
function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      return getKeys(v as Record<string, unknown>, key);
    }
    return [key];
  });
}

describe('strings key parity', () => {
  const arKeys = new Set(getKeys(strings.ar as unknown as Record<string, unknown>));
  const heKeys = new Set(getKeys(strings.he as unknown as Record<string, unknown>));
  const enKeys = new Set(getKeys(strings.en as unknown as Record<string, unknown>));

  it('Hebrew has all Arabic keys', () => {
    arKeys.forEach(key => { expect(heKeys.has(key)).toBe(true); });
  });

  it('English has all Arabic keys', () => {
    arKeys.forEach(key => { expect(enKeys.has(key)).toBe(true); });
  });

  it('Arabic has all English keys', () => {
    enKeys.forEach(key => { expect(arKeys.has(key)).toBe(true); });
  });

  it('all locales have the same number of keys', () => {
    expect(arKeys.size).toBe(heKeys.size);
    expect(arKeys.size).toBe(enKeys.size);
  });
});

describe('RTL helpers', () => {
  it('Arabic is RTL', () => { expect(isRTL('ar')).toBe(true); });
  it('Hebrew is RTL', () => { expect(isRTL('he')).toBe(true); });
  it('English is LTR', () => { expect(isRTL('en')).toBe(false); });

  it('RTL_LANGUAGES contains ar and he', () => {
    expect(RTL_LANGUAGES).toContain('ar');
    expect(RTL_LANGUAGES).toContain('he');
  });

  it('SUPPORTED_LANGUAGES has all 3 locales', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(3);
    expect(SUPPORTED_LANGUAGES).toContain('ar');
    expect(SUPPORTED_LANGUAGES).toContain('he');
    expect(SUPPORTED_LANGUAGES).toContain('en');
  });
});
