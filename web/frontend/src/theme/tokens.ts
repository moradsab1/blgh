export const palette = {
  bg: '#0E1116',
  surface: '#161B22',
  surfaceAlt: '#1C232C',
  border: '#2A323D',
  textPrimary: '#E6EDF3',
  textSecondary: '#9AA7B4',
  textMuted: '#6B7785',
  critical: '#E5484D',
  high: '#F76808',
  medium: '#FFB224',
  low: '#3B82F6',
  calm: '#3FB950',
  watch: '#FFB224',
  active: '#E5484D',
  resolved: '#3FB950',
  hidden: '#6B7785',
  tierCouncil: '#A83231',
  tierCoalition: '#5A6E3F',
  tierOperator: '#1F2818',
} as const;

export type SeverityColor = typeof palette.critical | typeof palette.high | typeof palette.medium | typeof palette.low;
