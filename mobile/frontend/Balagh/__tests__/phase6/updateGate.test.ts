/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import { shouldGateForStatus, UPDATE_REQUIRED_STATUS } from '../../src/domain/utils/updateGate';
import { strings } from '../../src/core/strings';

describe('426 update gate — gating decision', () => {
  it('gates on HTTP 426', () => {
    expect(UPDATE_REQUIRED_STATUS).toBe(426);
    expect(shouldGateForStatus(426)).toBe(true);
  });

  it('does not gate on success or other errors', () => {
    for (const status of [200, 201, 401, 403, 409, 426 + 1, 500]) {
      expect(shouldGateForStatus(status)).toBe(status === 426);
    }
  });
});

describe('426 update gate — strings', () => {
  it('title, message and cta exist in every locale', () => {
    for (const s of [strings.ar, strings.he, strings.en]) {
      expect(s.updateGate.title).toBeTruthy();
      expect(s.updateGate.message).toBeTruthy();
      expect(s.updateGate.cta).toBeTruthy();
    }
  });
});

describe('426 update gate — non-dismissable contract', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(
      path.join(__dirname, '../../src/presentation/components/UpdateGate.tsx'),
      'utf8',
    );
  });

  it('blocks the Android hardware back button', () => {
    expect(src).toMatch(/BackHandler\.addEventListener\(\s*'hardwareBackPress'/);
    // Handler returns true → event consumed, back is blocked.
    expect(src).toMatch(/'hardwareBackPress',\s*\(\)\s*=>\s*true/);
  });

  it('exposes no onClose / onDismiss prop', () => {
    expect(src).not.toMatch(/onClose|onDismiss/);
  });
});
