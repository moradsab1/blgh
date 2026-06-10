export const color = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  // Nested / inset surface (input fields, ref boxes, skeleton blocks) — one
  // step darker than `card` so it still reads on white.
  cardElevated: '#EEF2F7',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  // Text/icons placed on accent-, danger- or success-colored surfaces.
  textOnAccent: '#FFFFFF',
  accent: '#DC2626',
  // Report FAB / call-to-action color, distinct from critical/danger red so a
  // demo viewer can read "I want to file a report" vs "active threat".
  reportAccent: '#F97316',
  // Crisis-mode chrome accent, deeper than `accent` to read as "emergency".
  crisisAccent: '#B91C1C',
  // Translucent white used for chrome floating over the map.
  overlay: 'rgba(255, 255, 255, 0.94)',
  // Dimmed backdrop behind modals and bottom sheets.
  scrim: 'rgba(15, 23, 42, 0.45)',
  severity: {
    critical: '#DC2626',
    high: '#EA580C',
    medium: '#D97706',
    low: '#65A30D',
  },
  status: {
    calm: '#16A34A',
    watch: '#D97706',
    active: '#DC2626',
  },
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  transparent: 'transparent',
} as const;

export const space = (n: number): number => n * 8;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const motion = {
  instant: 100,
  fast: 200,
  base: 320,
  deliberate: 480,
} as const;

export const hit = {
  min: 48,
} as const;

export const font = {
  arabic: 'IBMPlexSansArabic-Regular',
  arabicMedium: 'IBMPlexSansArabic-Medium',
  arabicSemiBold: 'IBMPlexSansArabic-SemiBold',
  arabicBold: 'IBMPlexSansArabic-Bold',
  latin: 'Inter-Regular',
  latinMedium: 'Inter-Medium',
  latinSemiBold: 'Inter-SemiBold',
  latinBold: 'Inter-Bold',
  mono: 'JetBrainsMono-Regular',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // Stronger lift for floating chrome (FABs, pills hovering over the map).
  float: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

/**
 * All numerals must render as Western Arabic digits (0-9) regardless of locale.
 * Never rely on locale-specific digit shaping.
 */
export function formatNumber(n: number | string): string {
  return String(n).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
