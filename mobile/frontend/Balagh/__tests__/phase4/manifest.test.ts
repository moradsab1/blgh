/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

const PROJECT = path.join(__dirname, '../../');
const ANDROID_MANIFEST = path.join(PROJECT, 'android/app/src/main/AndroidManifest.xml');
const IOS_PLIST = path.join(PROJECT, 'ios/Balagh/Info.plist');

describe('AndroidManifest.xml — permission allowlist', () => {
  let manifest: string;

  beforeAll(() => {
    manifest = fs.readFileSync(ANDROID_MANIFEST, 'utf8');
  });

  it('has no CAMERA permission', () => {
    expect(manifest).not.toContain('CAMERA');
  });

  it('has no RECORD_AUDIO permission', () => {
    expect(manifest).not.toContain('RECORD_AUDIO');
  });

  it('has no READ_EXTERNAL_STORAGE permission', () => {
    expect(manifest).not.toContain('READ_EXTERNAL_STORAGE');
  });

  it('has no WRITE_EXTERNAL_STORAGE permission', () => {
    expect(manifest).not.toContain('WRITE_EXTERNAL_STORAGE');
  });

  it('has no BACKGROUND_LOCATION permission', () => {
    expect(manifest).not.toContain('ACCESS_BACKGROUND_LOCATION');
  });

  it('has no READ_CONTACTS permission', () => {
    expect(manifest).not.toContain('READ_CONTACTS');
  });

  it('retains required ACCESS_FINE_LOCATION permission', () => {
    expect(manifest).toContain('ACCESS_FINE_LOCATION');
  });

  it('retains required INTERNET permission', () => {
    expect(manifest).toContain('INTERNET');
  });
});

describe('iOS Info.plist — permission allowlist', () => {
  let plist: string;

  beforeAll(() => {
    plist = fs.readFileSync(IOS_PLIST, 'utf8');
  });

  it('has no NSCameraUsageDescription', () => {
    expect(plist).not.toContain('NSCameraUsageDescription');
  });

  it('has no NSMicrophoneUsageDescription', () => {
    expect(plist).not.toContain('NSMicrophoneUsageDescription');
  });

  it('has no NSPhotoLibraryUsageDescription', () => {
    expect(plist).not.toContain('NSPhotoLibraryUsageDescription');
  });

  it('has no NSContactsUsageDescription', () => {
    expect(plist).not.toContain('NSContactsUsageDescription');
  });

  it('has no NSCalendarsUsageDescription', () => {
    expect(plist).not.toContain('NSCalendarsUsageDescription');
  });

  it('has no NSLocationAlwaysUsageDescription', () => {
    expect(plist).not.toContain('NSLocationAlwaysUsageDescription');
  });

  it('retains NSLocationWhenInUseUsageDescription', () => {
    expect(plist).toContain('NSLocationWhenInUseUsageDescription');
  });
});
