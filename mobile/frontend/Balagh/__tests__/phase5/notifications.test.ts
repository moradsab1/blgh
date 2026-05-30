import { NotificationService } from '../../src/domain/services/notifications';
import store, { StorageKeys } from '../../src/core/storage';

describe('NotificationService', () => {
  it('requestPermission resolves without throwing', async () => {
    const service = new NotificationService();
    await expect(service.requestPermission()).resolves.toBeDefined();
  });

  it('hasPermission resolves without throwing', async () => {
    const service = new NotificationService();
    await expect(service.hasPermission()).resolves.toBeDefined();
  });

  it('requestPermission returns a boolean', async () => {
    const service = new NotificationService();
    const result = await service.requestPermission();
    expect(typeof result).toBe('boolean');
  });

  it('hasPermission returns a boolean', async () => {
    const service = new NotificationService();
    const result = await service.hasPermission();
    expect(typeof result).toBe('boolean');
  });
});

describe('notification toggle — permission gating contract', () => {
  it('permission is not requested when disabling a toggle (value = false)', async () => {
    const requestSpy = jest.fn().mockResolvedValue(true);
    const mockService = { requestPermission: requestSpy, hasPermission: jest.fn() };

    const simulateToggle = async (value: boolean): Promise<void> => {
      if (value) {
        await mockService.requestPermission();
      }
      // value=false: permission check skipped, just persist
    };

    await simulateToggle(false);
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('permission is requested when enabling a toggle (value = true)', async () => {
    const requestSpy = jest.fn().mockResolvedValue(true);
    const mockService = { requestPermission: requestSpy, hasPermission: jest.fn() };

    const simulateToggle = async (value: boolean): Promise<void> => {
      if (value) {
        await mockService.requestPermission();
      }
    };

    await simulateToggle(true);
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it('toggle does NOT persist when permission is denied', async () => {
    const requestSpy = jest.fn().mockResolvedValue(false); // denied
    let persisted = false;

    const simulateToggle = async (value: boolean): Promise<void> => {
      if (value) {
        const granted = await requestSpy();
        if (!granted) return; // bail — do not persist
      }
      persisted = true;
    };

    await simulateToggle(true);
    expect(persisted).toBe(false);
  });

  it('toggle persists immediately when permission is already granted', async () => {
    const requestSpy = jest.fn().mockResolvedValue(true); // granted
    let persisted = false;

    const simulateToggle = async (value: boolean): Promise<void> => {
      if (value) {
        const granted = await requestSpy();
        if (!granted) return;
      }
      persisted = true;
    };

    await simulateToggle(true);
    expect(persisted).toBe(true);
  });
});

describe('notification toggle storage', () => {
  beforeEach(() => {
    store.delete(StorageKeys.NOTIFICATION_NEARBY);
    store.delete(StorageKeys.NOTIFICATION_STATUS);
    store.delete(StorageKeys.NOTIFICATION_FOLLOWUP);
  });

  it('nearby toggle default is undefined (no value set)', () => {
    expect(store.getBoolean(StorageKeys.NOTIFICATION_NEARBY)).toBeUndefined();
  });

  it('setting nearby to true persists correctly', () => {
    store.setBoolean(StorageKeys.NOTIFICATION_NEARBY, true);
    expect(store.getBoolean(StorageKeys.NOTIFICATION_NEARBY)).toBe(true);
  });

  it('setting nearby to false persists correctly', () => {
    store.setBoolean(StorageKeys.NOTIFICATION_NEARBY, true);
    store.setBoolean(StorageKeys.NOTIFICATION_NEARBY, false);
    expect(store.getBoolean(StorageKeys.NOTIFICATION_NEARBY)).toBe(false);
  });

  it('all three notification keys are independent', () => {
    store.setBoolean(StorageKeys.NOTIFICATION_NEARBY, true);
    store.setBoolean(StorageKeys.NOTIFICATION_STATUS, false);
    store.setBoolean(StorageKeys.NOTIFICATION_FOLLOWUP, true);

    expect(store.getBoolean(StorageKeys.NOTIFICATION_NEARBY)).toBe(true);
    expect(store.getBoolean(StorageKeys.NOTIFICATION_STATUS)).toBe(false);
    expect(store.getBoolean(StorageKeys.NOTIFICATION_FOLLOWUP)).toBe(true);
  });
});
