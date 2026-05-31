import { describe, it, expect } from 'vitest';
import { deriveEmojis } from '../../src/lib/identity';

describe('deriveEmojis', () => {
  it('returns a tuple of exactly 3 strings', () => {
    const result = deriveEmojis('abcd1234efgh5678');
    expect(result).toHaveLength(3);
    result.forEach(e => expect(typeof e).toBe('string'));
  });

  it('is deterministic for the same input', () => {
    const a = deriveEmojis('deadbeef12345678');
    const b = deriveEmojis('deadbeef12345678');
    expect(a).toEqual(b);
  });

  it('produces different results for different inputs', () => {
    const a = deriveEmojis('0000000000000000');
    const b = deriveEmojis('ffffffffffffffff');
    expect(a).not.toEqual(b);
  });
});
