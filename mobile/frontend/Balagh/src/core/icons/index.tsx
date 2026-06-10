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
  Crosshair,
  Eye,
  HandFist,
  Slice,
  TriangleAlert,
  Wallet,
} from 'lucide-react-native';

import type { Category } from '../types';

export type IconProps = LucideProps;

export {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  Check,
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
  ThumbsDown,
  ThumbsUp,
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

// Category icons (feed, report + crisis category grids)
export const CategoryGunfire = Crosshair;
export const CategoryStabbing = Slice;
export const CategoryAssault = HandFist;
export const CategoryRobbery = Wallet;
export const CategorySuspicious = Eye;
export const CategoryOther = TriangleAlert;

export const CATEGORY_ICON: Record<Category, React.ComponentType<LucideProps>> = {
  GUNFIRE: CategoryGunfire,
  STABBING: CategoryStabbing,
  ASSAULT: CategoryAssault,
  ROBBERY: CategoryRobbery,
  SUSPICIOUS: CategorySuspicious,
  OTHER: CategoryOther,
};
