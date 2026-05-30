import { strings } from '../../src/core/strings';

const ar = strings.ar;
const he = strings.he;
const en = strings.en;

describe('follow-up wellbeing gate strings', () => {
  it('has gateQuestion, safeYes, safeNo in Arabic', () => {
    expect(ar.followup.gateQuestion).toBeTruthy();
    expect(ar.followup.safeYes).toBeTruthy();
    expect(ar.followup.safeNo).toBeTruthy();
  });

  it('"no" path shows resources — strings present and do not mention police', () => {
    const { resourcesTitle, resourcesNote, mdaLabel, mdaNumber, civilLabel } = ar.followup;
    expect(resourcesTitle).toBeTruthy();
    expect(resourcesNote).toBeTruthy();
    expect(mdaLabel).toBeTruthy();
    expect(mdaNumber).toBe('101');
    expect(civilLabel).toBeTruthy();

    // Must NOT reference police / شرطة / polizei in any resource
    const text = [resourcesTitle, resourcesNote, mdaLabel, civilLabel].join(' ').toLowerCase();
    expect(text).not.toContain('שוטר');
    expect(text).not.toContain('police');
    expect(text).not.toContain('شرطة');
    expect(text).not.toContain('100'); // Israeli police emergency number
  });

  it('"yes" path detail chips include vehicle, assailants, direction, weapon', () => {
    const { vehicleLabel, assailantLabel, directionLabel, weaponLabel } = ar.followup;
    expect(vehicleLabel).toBeTruthy();
    expect(assailantLabel).toBeTruthy();
    expect(directionLabel).toBeTruthy();
    expect(weaponLabel).toBeTruthy();
  });

  it('"yes" path has skip option (all chips optional)', () => {
    expect(ar.followup.skip).toBeTruthy();
    expect(ar.followup.submitDetails).toBeTruthy();
  });
});

describe('follow-up resources are civilian only', () => {
  it('MDA number is 101 in all locales', () => {
    expect(ar.followup.mdaNumber).toBe('101');
    expect(he.followup.mdaNumber).toBe('101');
    expect(en.followup.mdaNumber).toBe('101');
  });

  it('resources do not include police in any locale', () => {
    for (const s of [ar, he, en]) {
      const allText = [
        s.followup.resourcesTitle,
        s.followup.resourcesNote,
        s.followup.mdaLabel,
        s.followup.civilLabel,
      ].join(' ').toLowerCase();

      expect(allText).not.toContain('police');
      expect(allText).not.toContain('שוטר');
      expect(allText).not.toContain('שוטרים');
      expect(allText).not.toContain('شرطة');
    }
  });
});

describe('follow-up string completeness', () => {
  const REQUIRED_KEYS: (keyof typeof ar.followup)[] = [
    'title', 'gateQuestion', 'safeYes', 'safeNo',
    'detailsTitle', 'detailsSubtitle',
    'vehicleLabel', 'assailantLabel', 'directionLabel', 'weaponLabel',
    'submitDetails', 'skip', 'yes', 'no',
    'resourcesTitle', 'resourcesNote', 'mdaLabel', 'mdaNumber', 'civilLabel',
    'done', 'call',
  ];

  it('all required follow-up strings exist in Arabic', () => {
    for (const key of REQUIRED_KEYS) {
      expect(ar.followup[key]).toBeTruthy();
    }
  });

  it('all required follow-up strings exist in Hebrew', () => {
    for (const key of REQUIRED_KEYS) {
      expect(he.followup[key]).toBeTruthy();
    }
  });

  it('all required follow-up strings exist in English', () => {
    for (const key of REQUIRED_KEYS) {
      expect(en.followup[key]).toBeTruthy();
    }
  });
});
