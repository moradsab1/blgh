import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
        sans: ['Inter', 'IBM Plex Sans Arabic', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg:               '#0D1117',
        surface:          '#161D28',
        'surface-alt':    '#1D2840',
        'surface-raised': '#243050',
        border:           '#2E3F58',
        'border-subtle':  '#1E2D42',
        'text-primary':   '#E9F0F8',
        'text-secondary': '#8CAAC6',
        'text-muted':     '#506070',
        severity: {
          critical: '#E5484D',
          high:     '#F76808',
          medium:   '#FFB224',
          low:      '#4A90D9',
        },
        state: {
          calm:   '#3FC96D',
          watch:  '#FFB224',
          active: '#E5484D',
        },
        status: {
          resolved: '#3FC96D',
          hidden:   '#506070',
        },
        tier: {
          council:   '#C23B3A',
          coalition: '#6A8B4A',
          operator:  '#2E4430',
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
        card:  '0 2px 8px 0 rgba(0,0,0,0.45)',
        panel: '0 4px 20px 0 rgba(0,0,0,0.5)',
        glow:  '0 0 0 1px rgba(194,59,58,0.4)',
      },
      animation: {
        pulse2: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
