/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '../../src');
const ROOT_NAV = path.join(SRC, 'navigation/RootNavigator.tsx');
const TYPES = path.join(SRC, 'navigation/types.ts');

describe('Phase 6 exit criterion — no stub routes remain', () => {
  let nav: string;

  beforeAll(() => {
    nav = fs.readFileSync(ROOT_NAV, 'utf8');
  });

  it('RootNavigator defines no StubScreen', () => {
    expect(nav).not.toMatch(/StubScreen/);
  });

  it('PrivacyConstitution is wired to a real screen component', () => {
    expect(nav).toMatch(/name="PrivacyConstitution"\s+component=\{PrivacyConstitutionScreen\}/);
  });

  it('About is wired to a real screen component', () => {
    expect(nav).toMatch(/name="About"\s+component=\{AboutScreen\}/);
  });

  it('every route in RootStackParamList has a <Stack.Screen> registration', () => {
    const types = fs.readFileSync(TYPES, 'utf8');
    // Extract the RootStackParamList route names.
    const block = types.slice(
      types.indexOf('RootStackParamList = {'),
      types.indexOf('};'),
    );
    const routeNames = [...block.matchAll(/^\s{2}(\w+):/gm)].map(m => m[1]);
    expect(routeNames.length).toBeGreaterThan(0);
    for (const route of routeNames) {
      expect(nav).toContain(`name="${route}"`);
    }
  });
});
