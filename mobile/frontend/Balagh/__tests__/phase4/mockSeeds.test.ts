/**
 * Mock seed integrity — reporters can only choose a prepared situation
 * description (§5.13), so every seeded incident description must be exactly
 * one of those options. No free text is allowed anywhere in the mock data.
 *
 * This file must not add/submit incidents before asserting, so it validates
 * the pristine seeded db (jest isolates module state per test file).
 */

import { db } from '../../src/data/mock/db';
import { strings } from '../../src/core/strings';
import type { Category } from '../../src/core/types';

const allowedDescriptions = (category: Category): string[] => [
  ...strings.ar.report.situations[category],
  ...strings.he.report.situations[category],
  ...strings.en.report.situations[category],
];

describe('seeded mock incidents use only prepared situation descriptions', () => {
  it('every seed description is one of the prepared options for its category', () => {
    const seeds = db.incidents.getAll();
    expect(seeds.length).toBeGreaterThan(0);
    seeds.forEach(incident => {
      expect(incident.description).toBeTruthy();
      expect(allowedDescriptions(incident.category)).toContain(incident.description);
    });
  });

  it('historical seeds follow the same rule', () => {
    const historical = db.incidents.getAll().filter(i => i.id.startsWith('h'));
    expect(historical.length).toBeGreaterThan(0);
    historical.forEach(incident => {
      expect(allowedDescriptions(incident.category)).toContain(incident.description);
    });
  });
});
