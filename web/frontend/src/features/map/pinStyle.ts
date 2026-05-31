import type { Severity } from '../../lib/contracts';

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#E5484D',
  high:     '#F76808',
  medium:   '#FFB224',
  low:      '#3B82F6',
};

export function pinColor(severity: Severity): string {
  return SEVERITY_COLOR[severity] ?? '#9AA7B4';
}

export function pinSvg(severity: Severity, selected = false): string {
  const fill = pinColor(severity);
  const scale = selected ? 1.3 : 1;
  const size = Math.round(28 * scale);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="10" fill="${fill}" opacity="0.25"/>
      <circle cx="14" cy="14" r="6" fill="${fill}"/>
      ${selected ? `<circle cx="14" cy="14" r="10" fill="none" stroke="${fill}" stroke-width="2"/>` : ''}
    </svg>
  `.trim();
}
