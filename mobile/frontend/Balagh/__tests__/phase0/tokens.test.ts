import { color, space, radius, motion, hit, formatNumber } from '../../src/core/theme/tokens';

describe('Design tokens', () => {
  it('snapshot — palette is stable', () => {
    expect(color).toMatchSnapshot();
  });

  it('space(1) returns 8', () => {
    expect(space(1)).toBe(8);
    expect(space(3)).toBe(24);
  });

  it('radius values exist', () => {
    expect(radius.sm).toBe(8);
    expect(radius.pill).toBe(999);
  });

  it('motion range 100–480ms', () => {
    expect(motion.instant).toBe(100);
    expect(motion.deliberate).toBe(480);
  });

  it('minimum tap target is 48pt', () => {
    expect(hit.min).toBeGreaterThanOrEqual(48);
  });

  it('severity colors defined', () => {
    expect(color.severity.critical).toBeDefined();
    expect(color.severity.high).toBeDefined();
    expect(color.severity.medium).toBeDefined();
    expect(color.severity.low).toBeDefined();
  });

  it('status colors defined', () => {
    expect(color.status.calm).toBeDefined();
    expect(color.status.watch).toBeDefined();
    expect(color.status.active).toBeDefined();
  });
});

describe('formatNumber — Western Arabic digits', () => {
  it('passes through regular digits unchanged', () => {
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber('123')).toBe('123');
    expect(formatNumber(0)).toBe('0');
  });

  it('converts Eastern Arabic digits to Western', () => {
    expect(formatNumber('٣')).toBe('3');
    expect(formatNumber('١٢٣')).toBe('123');
    expect(formatNumber('٠')).toBe('0');
  });

  it('handles mixed strings', () => {
    expect(formatNumber('١00')).toBe('100');
  });
});
