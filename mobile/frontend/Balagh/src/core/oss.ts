// Open-source acknowledgements shown on the About screen.
// Kept here (not in the screen) so a test can assert the list stays
// alphabetised and in sync with the runtime dependency set (§14 Phase 6).
//
// Every entry is one of the project's runtime dependencies (package.json
// "dependencies"). The list is rendered verbatim and is the single source of
// truth for OSS attribution.

export interface OssLibrary {
  name: string;
  license: string;
}

export const GITHUB_URL = 'https://github.com/balagh-app/balagh';

export const OSS_LIBRARIES: readonly OssLibrary[] = [
  { name: '@react-native-async-storage/async-storage', license: 'MIT' },
  { name: '@react-navigation/native', license: 'MIT' },
  { name: '@react-navigation/native-stack', license: 'MIT' },
  { name: '@rnmapbox/maps', license: 'MIT' },
  { name: 'react', license: 'MIT' },
  { name: 'react-native', license: 'MIT' },
  { name: 'react-native-safe-area-context', license: 'MIT' },
  { name: 'react-native-screens', license: 'MIT' },
  { name: 'zustand', license: 'MIT' },
];
