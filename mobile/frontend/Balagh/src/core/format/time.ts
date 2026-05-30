import { formatNumber } from '../theme/tokens';

// Relative "time ago" with Western-Arabic digits and short script-neutral units.
// Units are short letters per locale; numbers always render 0–9 (formatNumber).

const UNITS: Record<string, { s: string; m: string; h: string; d: string }> = {
  ar: { s: 'ث', m: 'د', h: 'س', d: 'ي' },
  he: { s: "שנ'", m: "דק'", h: "שע'", d: 'ימ' },
  en: { s: 's', m: 'm', h: 'h', d: 'd' },
};

export function relativeTime(iso: string, lang: 'ar' | 'he' | 'en' = 'ar'): string {
  const u = UNITS[lang] ?? UNITS.ar;
  const diffMs = Date.now() - new Date(iso).getTime();
  const diff = Math.max(0, Math.floor(diffMs / 1000));
  if (diff < 60) return `${formatNumber(diff)}${u.s}`;
  if (diff < 3600) return `${formatNumber(Math.floor(diff / 60))}${u.m}`;
  if (diff < 86400) return `${formatNumber(Math.floor(diff / 3600))}${u.h}`;
  return `${formatNumber(Math.floor(diff / 86400))}${u.d}`;
}
