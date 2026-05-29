export const color = {
  bg: '#0B1220',
  card: '#1E293B',
  cardElevated: '#263347',
  border: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#DC2626',
  overlay: 'rgba(11, 18, 32, 0.8)',
  severity: {
    critical: '#DC2626',
    high: '#EA580C',
    medium: '#F59E0B',
    low: '#65A30D',
  },
  status: {
    calm: '#16A34A',
    watch: '#F59E0B',
    active: '#DC2626',
  },
  success: '#16A34A',
  warning: '#F59E0B',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

/**
 * All numerals must render as Western Arabic digits (0-9) regardless of locale.
 * Never rely on locale-specific digit shaping.
 */
export function formatNumber(n: number | string): string {
  return String(n).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
