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
        bg: '#0E1116',
        surface: '#161B22',
        'surface-alt': '#1C232C',
        border: '#2A323D',
        'text-primary': '#E6EDF3',
        'text-secondary': '#9AA7B4',
        'text-muted': '#6B7785',
        severity: {
          critical: '#E5484D',
          high: '#F76808',
          medium: '#FFB224',
          low: '#3B82F6',
        },
        state: {
          calm: '#3FB950',
          watch: '#FFB224',
          active: '#E5484D',
        },
        status: {
          resolved: '#3FB950',
          hidden: '#6B7785',
        },
        tier: {
          council: '#A83231',
          coalition: '#5A6E3F',
          operator: '#1F2818',
        },
      },
      animation: {
        pulse2: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
