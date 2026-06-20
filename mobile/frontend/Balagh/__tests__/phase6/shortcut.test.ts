/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

const ANDROID = path.join(__dirname, '../../android/app/src/main');
const MANIFEST = path.join(ANDROID, 'AndroidManifest.xml');
const SHORTCUTS = path.join(ANDROID, 'res/xml/shortcuts.xml');
const STRINGS = path.join(ANDROID, 'res/values/strings.xml');
const MAIN_ACTIVITY = path.join(ANDROID, 'java/com/balagh/MainActivity.kt');

describe('Android app-icon crisis shortcut', () => {
  it('declares a static shortcuts resource', () => {
    expect(fs.existsSync(SHORTCUTS)).toBe(true);
    const xml = fs.readFileSync(SHORTCUTS, 'utf8');
    expect(xml).toContain('android:shortcutId="crisis"');
    expect(xml).toContain('balagh://crisis');
  });

  it('wires the shortcuts meta-data into the manifest', () => {
    const manifest = fs.readFileSync(MANIFEST, 'utf8');
    expect(manifest).toContain('android.app.shortcuts');
    expect(manifest).toContain('@xml/shortcuts');
  });

  it('provides the shortcut labels', () => {
    const strings = fs.readFileSync(STRINGS, 'utf8');
    expect(strings).toContain('shortcut_crisis_short');
    expect(strings).toContain('shortcut_crisis_long');
  });

  it('keeps the balagh://crisis deep-link intent-filter', () => {
    const manifest = fs.readFileSync(MANIFEST, 'utf8');
    expect(manifest).toContain('android:scheme="balagh"');
    expect(manifest).toContain('android:host="crisis"');
  });
});

describe('Screen capture is allowed (no FLAG_SECURE)', () => {
  it('does not set FLAG_SECURE in MainActivity, so screenshots and screen sharing work', () => {
    const activity = fs.readFileSync(MAIN_ACTIVITY, 'utf8');
    expect(activity).not.toContain('FLAG_SECURE');
    expect(activity).not.toMatch(/window\.setFlags/);
  });
});
