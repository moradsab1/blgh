import type { Severity } from '../../lib/contracts';

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#DC2626',
  high:     '#EA580C',
  medium:   '#D97706',
  low:      '#2563EB',
};

export function pinColor(severity: Severity): string {
  return SEVERITY_COLOR[severity] ?? '#9AA7B4';
}

export function pinSvg(severity: Severity, selected = false): string {
  const fill = pinColor(severity);
  const scale = selected ? 1.25 : 1;
  const size = Math.round(32 * scale);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
      <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="${fill}" flood-opacity="0.35"/>
      </filter>
      <circle cx="16" cy="16" r="11" fill="${fill}" opacity="0.18" filter="url(#shadow)"/>
      <circle cx="16" cy="16" r="7" fill="${fill}"/>
      <circle cx="16" cy="16" r="3" fill="white" opacity="0.9"/>
      ${selected ? `<circle cx="16" cy="16" r="11" fill="none" stroke="${fill}" stroke-width="1.5" opacity="0.6"/>` : ''}
    </svg>
  `.trim();
}
