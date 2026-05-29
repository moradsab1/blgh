import store, { StorageKeys } from '../storage';

// Hermes (RN 0.73+) exposes crypto.getRandomValues natively. TypeScript's
// React Native config omits the DOM lib, so we declare the global locally.
declare const crypto: { getRandomValues: (buf: Uint8Array) => void };

// Device identity is a persistent random 32-byte hex string.
// It survives across sessions (stored in AsyncStorage) and identifies
// the device anonymously. No signing infrastructure is needed until a
// real backend exists — signRequest() is a stub for future use.

let _idHex: string | null = null;

function randomHex(byteCount: number): string {
  const buf = new Uint8Array(byteCount);
  // crypto.getRandomValues is built into Hermes (RN 0.73+)
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const ensureIdentity = async (): Promise<void> => {
  if (_idHex) return;
  const saved = store.getString(StorageKeys.PRIVATE_KEY);
  if (saved) { _idHex = saved; return; }
  _idHex = randomHex(32);
  store.setString(StorageKeys.PRIVATE_KEY, _idHex);
};

export const getPublicKeyHex = (): string => {
  if (!_idHex) throw new Error('Identity not initialized. Call ensureIdentity() first.');
  return _idHex;
};

export const getPublicIdentifier = (): string => {
  const id = getPublicKeyHex();
  return `${id.slice(0, 6)}...${id.slice(-6)}`;
};

export const signRequest = async (
  _method: string,
  _path: string,
  _body: string,
): Promise<{ signature: string; timestamp: string }> => {
  await ensureIdentity();
  // Signing stub — no backend yet. Returns empty signature.
  return { signature: '', timestamp: String(Date.now()) };
};

const EMOJI_PALETTE = [
  '🦁', '🐯', '🦊', '🐺', '🦝', '🦄', '🐲', '🦋',
  '🌵', '🌴', '🍀', '🌸', '🌙', '⭐', '🔥', '💧',
  '🎯', '🎸', '🎭', '🎨', '🏔️', '🌊', '🌪️', '🌈',
  '🦅', '🦉', '🦚', '🦜', '🐬', '🦭', '🐢', '🐙',
];

export const deriveEmojis = (pubHex: string): [string, string, string] => {
  const i0 = parseInt(pubHex.slice(0, 4), 16) % EMOJI_PALETTE.length;
  const i1 = parseInt(pubHex.slice(4, 8), 16) % EMOJI_PALETTE.length;
  const i2 = parseInt(pubHex.slice(8, 12), 16) % EMOJI_PALETTE.length;
  return [EMOJI_PALETTE[i0], EMOJI_PALETTE[i1], EMOJI_PALETTE[i2]];
};

export const deleteIdentity = async (): Promise<void> => {
  store.delete(StorageKeys.PRIVATE_KEY);
  _idHex = null;
};
