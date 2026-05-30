/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

// Zero-sound is a hard constraint (§14): the app must never import or play
// audio. This test is the CI guard — it walks the whole src tree and fails on
// any audio library import or bundled audio asset reference.

const SRC = path.join(__dirname, '../../src');

const BANNED_PATTERNS: RegExp[] = [
  /react-native-sound/,
  /expo-av/,
  /expo-audio/,
  /react-native-track-player/,
  /react-native-video/,
  /@react-native-community\/audio/,
  /\bnew\s+Audio\s*\(/,
  /\.(mp3|wav|aac|m4a|ogg|flac)['"]/i,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('zero-sound CI check', () => {
  const files = walk(SRC);

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('no source file imports or references audio', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(`${path.relative(SRC, file)} :: ${pattern}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
