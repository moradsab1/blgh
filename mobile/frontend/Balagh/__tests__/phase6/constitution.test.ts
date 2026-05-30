import { strings } from '../../src/core/strings';

const ar = strings.ar;
const he = strings.he;
const en = strings.en;

// The seven covenants must stay in sync across locales and the screen.
const RULE_KEYS = [
  'noPersonalData',
  'noAuthorities',
  'anonymous',
  'onDevice',
  'minimalPermissions',
  'noSound',
  'openSource',
] as const;

describe('Privacy Constitution — structure', () => {
  it('declares exactly seven rules', () => {
    expect(RULE_KEYS).toHaveLength(7);
    expect(Object.keys(ar.constitution.rules).sort()).toEqual([...RULE_KEYS].sort());
  });

  it('has title, subtitle, updatedBadge and howWeEnsure in every locale', () => {
    for (const s of [ar, he, en]) {
      expect(s.constitution.title).toBeTruthy();
      expect(s.constitution.subtitle).toBeTruthy();
      expect(s.constitution.updatedBadge).toBeTruthy();
      expect(s.constitution.howWeEnsure).toBeTruthy();
    }
  });

  it('every rule has a title and an "ensure" answer in every locale', () => {
    for (const s of [ar, he, en]) {
      for (const key of RULE_KEYS) {
        const rule = s.constitution.rules[key];
        expect(rule.title).toBeTruthy();
        expect(rule.ensure).toBeTruthy();
      }
    }
  });
});

describe('Privacy Constitution — content guarantees', () => {
  it('the no-authorities rule never endorses police integration', () => {
    for (const s of [ar, he, en]) {
      const text = (s.constitution.rules.noAuthorities.title + ' ' +
        s.constitution.rules.noAuthorities.ensure).toLowerCase();
      // It may mention "no police" but must not reference an emergency police number.
      expect(text).not.toContain('100');
    }
  });

  it('the no-sound rule is present (zero-sound covenant)', () => {
    expect(ar.constitution.rules.noSound.title).toContain('صوت');
    expect(en.constitution.rules.noSound.title.toLowerCase()).toContain('sound');
  });
});
