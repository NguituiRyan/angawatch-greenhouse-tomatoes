/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand / accents extracted from the reference screenshots
        lime: {
          DEFAULT: '#A3CB38', // primary chartreuse — active tabs, +% badges, AI mark
          soft: '#C7E06A',
          tint: '#EEF6D8',
        },
        health: {
          DEFAULT: '#8BC34A',
          light: '#9CCC65',
          deep: '#6FB23E',
        },
        ink: '#1F2A24', // headings — very dark green-charcoal
        sage: '#8C9389', // secondary / muted text
        spectrum: {
          red: '#E8553E',
          amber: '#E8A23D',
          lime: '#A3CB38',
          green: '#6FB23E',
        },
        dot: {
          orange: '#E8A23D',
          green: '#9CCC65',
          grey: '#D9DDD6',
        },
        page: {
          from: '#EDEFEA',
          to: '#E6EAE3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '24px',
        inner: '16px',
        pill: '12px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.08)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.10)',
        pill: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      backdropBlur: {
        glass: '20px',
      },
      fontSize: {
        metric: ['2.25rem', { lineHeight: '1', fontWeight: '700' }],
        'metric-sm': ['1.75rem', { lineHeight: '1', fontWeight: '700' }],
        label: ['0.75rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ring-fill': {
          '0%': { strokeDashoffset: 'var(--ring-circumference)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'ring-fill': 'ring-fill 1.1s ease-out both',
      },
    },
  },
  plugins: [],
}
