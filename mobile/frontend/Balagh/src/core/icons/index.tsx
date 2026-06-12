/**
 * Icon set — thin wrapper over `lucide-react-native` (SVG vector icons).
 *
 * Exposes the same names the app has always imported (`<IconName size color
 * style />`), so call sites don't care that the implementation moved from
 * text glyphs to real vectors. All icons are monochrome strokes that honor
 * the `color` prop and scale crisply at any size.
 */
import React from 'react';
import type { LucideProps } from 'lucide-react-native';
import {
  Bookmark as LucideBookmark,
  CircleQuestionMark,
  HandCoins,
  HandFist,
  ScanEye,
  Siren,
  Sword,
  Target,
} from 'lucide-react-native';

import type { Category } from '../types';

export type IconProps = LucideProps;

export {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Globe,
  Info,
  Key,
  List,
  Locate,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Newspaper,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react-native';

export const HelpCircle = CircleQuestionMark;

// Filled vs outline bookmark so the active state is unmistakable.
export const BookmarkFilled = ({
  color = '#000',
  ...rest
}: LucideProps): React.ReactElement => (
  <LucideBookmark color={color} fill={color} {...rest} />
);
export const BookmarkOutline = LucideBookmark;

// Category icons (feed, report + crisis category grids).
// Chosen to read instantly under stress: a shooting target for gunfire, a
// blade for stabbing, a fist for assault, a hand taking money for robbery,
// a scanned eye for suspicious surveillance, and a siren for any other
// emergency — all modern monochrome lucide strokes.
export const CategoryGunfire = Target;
export const CategoryStabbing = Sword;
export const CategoryAssault = HandFist;
export const CategoryRobbery = HandCoins;
export const CategorySuspicious = ScanEye;
export const CategoryOther = Siren;

export const CATEGORY_ICON: Record<Category, React.ComponentType<LucideProps>> = {
  GUNFIRE: CategoryGunfire,
  STABBING: CategoryStabbing,
  ASSAULT: CategoryAssault,
  ROBBERY: CategoryRobbery,
  SUSPICIOUS: CategorySuspicious,
  OTHER: CategoryOther,
};
