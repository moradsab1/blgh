import { strings } from '../../src/core/strings';
import { OSS_LIBRARIES, GITHUB_URL } from '../../src/core/oss';

const ar = strings.ar;
const he = strings.he;
const en = strings.en;

describe('About — string completeness', () => {
  const KEYS: (keyof typeof ar.about)[] = [
    'title', 'tagline', 'versionLabel', 'licenseTitle', 'license',
    'licenseNote', 'sourceTitle', 'sourceLabel', 'acknowledgements', 'ossNote',
  ];

  it('all About strings exist in every locale', () => {
    for (const s of [ar, he, en]) {
      for (const key of KEYS) {
        expect(s.about[key]).toBeTruthy();
      }
    }
  });

  it('license is Apache 2.0 in every locale', () => {
    for (const s of [ar, he, en]) {
      expect(s.about.license).toBe('Apache License 2.0');
    }
  });
});

describe('About — open-source acknowledgements', () => {
  it('lists at least the eight runtime dependencies', () => {
    expect(OSS_LIBRARIES.length).toBeGreaterThanOrEqual(8);
  });

  it('is sorted alphabetically by name', () => {
    const names = OSS_LIBRARIES.map(l => l.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('contains no duplicate library names', () => {
    const names = OSS_LIBRARIES.map(l => l.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every entry carries a license', () => {
    for (const lib of OSS_LIBRARIES) {
      expect(lib.license).toBeTruthy();
    }
  });

  it('exposes a single GitHub source link', () => {
    expect(GITHUB_URL).toMatch(/^https:\/\/github\.com\//);
  });
});
