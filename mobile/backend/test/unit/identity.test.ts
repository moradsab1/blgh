import { describe, it, expect } from 'vitest';
import { deriveEmojis } from '../../src/lib/identity';

describe('deriveEmojis', () => {
  it('returns a tuple of exactly 3 strings', () => {
    const result = deriveEmojis('abcd1234ef567890abcdef1234567890abcdef12');
    expect(result).toHaveLength(3);
    result.forEach(e => expect(typeof e).toBe('string'));
  });

  it('is deterministic — same input always gives same output', () => {
    const hex = 'deadbeef01234567deadbeef01234567deadbeef';
    expect(deriveEmojis(hex)).toEqual(deriveEmojis(hex));
  });

  it('produces different tags for different device ids', () => {
    const a = deriveEmojis('0000000000000000000000000000000000000000');
    const b = deriveEmojis('ffffffffffffffffffffffffffffffffffffffff');
    expect(a).not.toEqual(b);
  });

  it('each emoji comes from the known palette (non-empty string)', () => {
    const result = deriveEmojis('1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b');
    result.forEach(e => {
      expect(e.length).toBeGreaterThan(0);
    });
  });
});
