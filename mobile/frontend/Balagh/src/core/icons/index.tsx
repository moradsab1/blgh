import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';

// ── Minimal icon set ─────────────────────────────────────────────────────────
// Drop-in replacement for the handful of `lucide-react-native` icons the app
// used. lucide depends on `react-native-svg` (a native module that needs a
// CMake/NDK build and adds to startup), so for a few static glyphs we render
// plain text instead — no native module, no SVG runtime.
//
// The public API matches lucide's: <IconName size={20} color="#fff" style={…} />
//   • "mono" glyphs are monochrome text symbols and honor the `color` prop
//     (used for chevrons / arrows / check where theming matters).
//   • emoji glyphs render in their own colors (the `color` prop is ignored by
//     the platform for emoji) — fine for the decorative / list icons.

export interface IconProps {
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

const makeIcon = (glyph: string, mono: boolean) => {
  const Icon = ({ size = 24, color = '#000', style }: IconProps): React.ReactElement => (
    <Text
      allowFontScaling={false}
      style={[
        { fontSize: size, lineHeight: size * 1.15, textAlign: 'center' },
        mono ? { color } : null,
        style,
      ]}>
      {glyph}
    </Text>
  );
  Icon.displayName = 'Icon';
  return Icon;
};

// Monochrome — respect `color`
export const ChevronRight = makeIcon('❯', true);
export const ChevronLeft = makeIcon('❮', true);
export const ArrowRight = makeIcon('→', true);
export const ArrowLeft = makeIcon('←', true);
export const Check = makeIcon('✓', true);
export const X = makeIcon('✕', true);
export const Plus = makeIcon('＋', true);
export const Minus = makeIcon('－', true);
export const Send = makeIcon('➤', true);
export const ThumbsUp = makeIcon('✓', true);
export const ThumbsDown = makeIcon('✕', true);

// Emoji — colorful glyphs
export const Shield = makeIcon('🛡️', false);
export const MapPin = makeIcon('📍', false);
export const Radio = makeIcon('📡', false);
export const Search = makeIcon('🔍', false);
export const Globe = makeIcon('🌐', false);
export const Key = makeIcon('🔑', false);
export const Trash2 = makeIcon('🗑️', false);
export const Bell = makeIcon('🔔', false);
export const Info = makeIcon('ℹ️', false);
export const HelpCircle = makeIcon('❓', false);
export const Mail = makeIcon('✉️', false);
export const Copy = makeIcon('📋', false);
export const Newspaper = makeIcon('📰', false);
export const Siren = makeIcon('🚨', false);
// Mono bookmark glyphs so the active/inactive color difference is visible.
// Emoji ignore the color prop, so we pair a filled vs outline character with
// an explicit color difference instead of relying on opacity alone.
export const Bookmark = makeIcon('★', true);
export const BookmarkFilled = makeIcon('★', true);
export const BookmarkOutline = makeIcon('☆', true);
export const MessageCircle = makeIcon('💬', false);
export const Compass = makeIcon('🧭', false);
export const Settings = makeIcon('⚙️', false);

// Category glyphs (used by the feed + report category grid)
export const CategoryGunfire = makeIcon('🔫', false);
export const CategoryStabbing = makeIcon('🔪', false);
export const CategoryAssault = makeIcon('👊', false);
export const CategoryRobbery = makeIcon('🦹', false);
export const CategorySuspicious = makeIcon('👁️', false);
export const CategoryOther = makeIcon('⚠️', false);

import type { Category } from '../types';

export const CATEGORY_ICON: Record<Category, ReturnType<typeof makeIcon>> = {
  GUNFIRE: CategoryGunfire,
  STABBING: CategoryStabbing,
  ASSAULT: CategoryAssault,
  ROBBERY: CategoryRobbery,
  SUSPICIOUS: CategorySuspicious,
  OTHER: CategoryOther,
};
