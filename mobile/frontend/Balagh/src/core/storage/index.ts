import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Architecture ───────────────────────────────────────────────────────────
// AsyncStorage is a thin, well-tested key/value store (no Nitro/JNI native
// module to crash on cold boot like MMKV). It is async-only, so we front it
// with a synchronous in-memory cache:
//   • hydrateStorage() loads every key into the cache once at startup.
//   • Reads return from the cache synchronously (keeps the existing API).
//   • Writes update the cache immediately and persist to disk fire-and-forget.
// Sensitive data (the Ed25519 private key) never lives here — it stays in
// The Ed25519 private key is stored here too (under PRIVATE_KEY).

const cache = new Map<string, string>();
let hydrated = false;

export async function hydrateStorage(): Promise<void> {
  if (hydrated) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      const entries = await AsyncStorage.multiGet(keys);
      for (const [k, v] of entries) {
        if (v != null) cache.set(k, v);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[storage] hydrate failed — starting with empty cache:', e);
  } finally {
    hydrated = true;
  }
}

function persist(key: string, value: string): void {
  AsyncStorage.setItem(key, value).catch(() => {
    // Best-effort: the in-memory cache already holds the value this session.
  });
}

export const store = {
  setString: (key: string, value: string): void => {
    cache.set(key, value);
    persist(key, value);
  },
  getString: (key: string): string | undefined => cache.get(key),

  setBoolean: (key: string, value: boolean): void => {
    const v = value ? '1' : '0';
    cache.set(key, v);
    persist(key, v);
  },
  getBoolean: (key: string): boolean | undefined => {
    const v = cache.get(key);
    return v === undefined ? undefined : v === '1';
  },

  setNumber: (key: string, value: number): void => {
    const v = String(value);
    cache.set(key, v);
    persist(key, v);
  },
  getNumber: (key: string): number | undefined => {
    const v = cache.get(key);
    return v === undefined ? undefined : Number(v);
  },

  delete: (key: string): void => {
    cache.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
  clearAll: (): void => {
    cache.clear();
    AsyncStorage.clear().catch(() => {});
  },
  getAllKeys: (): string[] => [...cache.keys()],
};

// Typed helpers for known keys

export const StorageKeys = {
  LANGUAGE: 'language',
  LOCALITY_ID: 'localityId',
  ONBOARDING_DONE: 'onboardingDone',
  PRIVATE_KEY: 'identity_priv',
  NOTIFICATION_NEARBY: 'notif_nearby',
  NOTIFICATION_STATUS: 'notif_status',
  NOTIFICATION_FOLLOWUP: 'notif_followup',
  READ_INCIDENTS: 'readIncidents',
  PENDING_REPORTS: 'pendingReports',
  LOCATION_PERMISSION_ASKED: 'locationPermAsked',
  LOCATION_GRANTED: 'locationGranted',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export default store;
