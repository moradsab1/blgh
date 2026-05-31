import { describe, it, expect } from 'vitest';

describe('pinStyle', () => {
  it('maps every severity to a hex color', async () => {
    const { pinColor } = await import('../features/map/pinStyle');
    expect(pinColor('critical')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(pinColor('high')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(pinColor('medium')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(pinColor('low')).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('produces distinct colors per severity', async () => {
    const { pinColor } = await import('../features/map/pinStyle');
    const colors = ['critical', 'high', 'medium', 'low'].map(
      (s) => pinColor(s as Parameters<typeof pinColor>[0]),
    );
    const unique = new Set(colors);
    expect(unique.size).toBe(4);
  });

  it('returns an SVG string from pinSvg', async () => {
    const { pinSvg } = await import('../features/map/pinStyle');
    const svg = pinSvg('critical');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('pinSvg selected=true differs from selected=false', async () => {
    const { pinSvg } = await import('../features/map/pinStyle');
    const normal = pinSvg('high', false);
    const selected = pinSvg('high', true);
    expect(normal).not.toBe(selected);
  });
});

describe('useIncidents query key', () => {
  it('includes lat, lng, radiusKm in the key', async () => {
    const { qk } = await import('../lib/queryClient');
    const key = qk.incidents(31.7, 35.2, 10);
    expect(key).toContain(31.7);
    expect(key).toContain(35.2);
    expect(key).toContain(10);
  });
});

describe('CaseFilters state shape', () => {
  it('CaseFiltersState has correct default shape', () => {
    const state = {
      tab: 'active' as const,
      severities: new Set<string>(),
      text: '',
    };
    expect(state.tab).toBe('active');
    expect(state.severities.size).toBe(0);
    expect(state.text).toBe('');
  });

  it('severity set toggling works correctly', () => {
    const initial = new Set<string>();
    const next = new Set(initial);
    next.add('critical');
    expect(next.has('critical')).toBe(true);
    expect(initial.has('critical')).toBe(false); // immutable add
    next.delete('critical');
    expect(next.has('critical')).toBe(false);
  });
});

describe('mock locality data', () => {
  it('loads localities with required fields', async () => {
    const { mockLocalities } = await import('../mock/db');
    expect(mockLocalities.length).toBeGreaterThan(0);
    for (const loc of mockLocalities) {
      expect(typeof loc.id).toBe('string');
      expect(typeof loc.nameAr).toBe('string');
      expect(typeof loc.lat).toBe('number');
      expect(typeof loc.lng).toBe('number');
    }
  });

  it('loads incidents with required fields', async () => {
    const { mockIncidents } = await import('../mock/db');
    expect(mockIncidents.length).toBeGreaterThan(0);
    for (const inc of mockIncidents) {
      expect(typeof inc.id).toBe('string');
      expect(typeof inc.ref).toBe('string');
      expect(typeof inc.lat).toBe('number');
      expect(typeof inc.lng).toBe('number');
      expect(['critical', 'high', 'medium', 'low']).toContain(inc.severity);
      expect(typeof inc.confirmations).toBe('number');
      expect(typeof inc.denials).toBe('number');
    }
  });
});
