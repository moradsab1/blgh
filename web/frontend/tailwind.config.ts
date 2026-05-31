import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
        sans:   ['Inter', 'IBM Plex Sans Arabic', 'sans-serif'],
        mono:   ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg:               '#F1F5F9',   // slate-100 — page canvas
        surface:          '#FFFFFF',   // white — cards / panels
        'surface-alt':    '#F8FAFC',   // slate-50 — subtle fills / hover
        'surface-raised': '#EFF6FF',   // blue-50 — active / selected
        border:           '#E2E8F0',   // slate-200
        'border-subtle':  '#F1F5F9',   // slate-100
        'text-primary':   '#0F172A',   // slate-900
        'text-secondary': '#475569',   // slate-600
        'text-muted':     '#94A3B8',   // slate-400
        severity: {
          critical: '#DC2626',         // red-600
          high:     '#EA580C',         // orange-600
          medium:   '#D97706',         // amber-600
          low:      '#2563EB',         // blue-600
        },
        state: {
          calm:   '#16A34A',           // green-600
          watch:  '#D97706',           // amber-600
          active: '#DC2626',           // red-600
        },
        status: {
          resolved: '#16A34A',
          hidden:   '#94A3B8',
        },
        tier: {
          council:   '#DC2626',        // red
          coalition: '#16A34A',        // green
          operator:  '#2563EB',        // blue
        },
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm:    '0.375rem',
        md:    '0.5rem',
        lg:    '0.75rem',
        xl:    '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card:   '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)',
        panel:  '0 4px 16px -2px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.06)',
        dialog: '0 20px 60px -10px rgba(0,0,0,0.25)',
        inset:  'inset 0 1px 2px 0 rgba(0,0,0,0.06)',
      },
      animation: {
        pulse2:   'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        fadeIn:   'fadeIn 0.15s ease-out',
        slideIn:  'slideIn 0.2s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
