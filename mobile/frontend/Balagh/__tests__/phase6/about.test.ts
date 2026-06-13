/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import { strings } from '../../src/core/strings';

const ar = strings.ar;
const he = strings.he;
const en = strings.en;

const ABOUT_SCREEN = path.join(__dirname, '../../src/screens/settings/About.tsx');

describe('About — string completeness (general info only)', () => {
  const KEYS: (keyof typeof ar.about)[] = ['title', 'tagline', 'mission', 'versionLabel'];

  it('all About strings exist in every locale', () => {
    for (const s of [ar, he, en]) {
      for (const key of KEYS) {
        expect(s.about[key]).toBeTruthy();
      }
    }
  });

  it('About mentions no GitHub link or library list in any locale', () => {
    for (const s of [ar, he, en]) {
      const all = JSON.stringify(s.about).toLowerCase();
      expect(all).not.toContain('github');
      expect(all).not.toContain('apache');
    }
  });
});

describe('About screen — no source link / OSS list', () => {
  it('the screen references no GitHub URL or OSS catalog', () => {
    const src = fs.readFileSync(ABOUT_SCREEN, 'utf8');
    expect(src).not.toMatch(/github/i);
    expect(src).not.toMatch(/OSS_LIBRARIES/);
    expect(src).not.toMatch(/Linking/);
  });
});

describe('How it works — its own screen, not the Privacy Constitution', () => {
  it('has four localized steps in every locale', () => {
    for (const s of [ar, he, en]) {
      expect(s.howItWorks.title).toBeTruthy();
      expect(s.howItWorks.steps).toHaveLength(4);
      for (const step of s.howItWorks.steps) {
        expect(step.title).toBeTruthy();
        expect(step.body).toBeTruthy();
      }
    }
  });

  it('Settings routes support → HowItWorks (no duplicate constitution page)', () => {
    const settings = fs.readFileSync(
      path.join(__dirname, '../../src/screens/settings/Settings.tsx'),
      'utf8',
    );
    expect(settings).toMatch(/howItWorks[\s\S]{0,200}navigate\('HowItWorks'\)/);
  });
});
