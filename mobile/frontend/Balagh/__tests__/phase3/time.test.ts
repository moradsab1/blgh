import { relativeTime } from '../../src/core/format/time';

describe('relativeTime', () => {
  const iso = (msAgo: number): string => new Date(Date.now() - msAgo).toISOString();

  it('renders seconds with the Arabic short unit and Western digits', () => {
    expect(relativeTime(iso(5_000), 'ar')).toBe('5ث');
  });

  it('renders minutes', () => {
    expect(relativeTime(iso(5 * 60_000), 'ar')).toBe('5د');
  });

  it('renders hours', () => {
    expect(relativeTime(iso(3 * 3_600_000), 'ar')).toBe('3س');
  });

  it('renders days', () => {
    expect(relativeTime(iso(2 * 86_400_000), 'ar')).toBe('2ي');
  });

  it('always uses Western-Arabic numerals (0–9), never Eastern', () => {
    const out = relativeTime(iso(12 * 60_000), 'ar');
    expect(out).toMatch(/^[0-9]+/);
    expect(out).not.toMatch(/[٠-٩]/);
  });

  it('uses locale-specific unit letters for en', () => {
    expect(relativeTime(iso(5_000), 'en')).toBe('5s');
    expect(relativeTime(iso(5 * 60_000), 'en')).toBe('5m');
  });

  it('clamps future timestamps to 0 seconds', () => {
    expect(relativeTime(iso(-10_000), 'ar')).toBe('0ث');
  });
});
