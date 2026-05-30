// Ported verbatim from mobile/frontend/Balagh/src/core/identity/index.ts

const EMOJI_PALETTE = [
  '🦁', '🐯', '🦊', '🐺', '🦝', '🦄', '🐲', '🦋',
  '🌵', '🌴', '🍀', '🌸', '🌙', '⭐', '🔥', '💧',
  '🎯', '🎸', '🎭', '🎨', '🏔️', '🌊', '🌪️', '🌈',
  '🦅', '🦉', '🦚', '🦜', '🐬', '🦭', '🐢', '🐙',
];

export function deriveEmojis(pubHex: string): [string, string, string] {
  const i0 = parseInt(pubHex.slice(0, 4), 16) % EMOJI_PALETTE.length;
  const i1 = parseInt(pubHex.slice(4, 8), 16) % EMOJI_PALETTE.length;
  const i2 = parseInt(pubHex.slice(8, 12), 16) % EMOJI_PALETTE.length;
  return [EMOJI_PALETTE[i0], EMOJI_PALETTE[i1], EMOJI_PALETTE[i2]];
}
