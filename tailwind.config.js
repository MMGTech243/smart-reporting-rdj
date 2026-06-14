/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        fadeUp:   { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer:  { '0%,100%': { opacity: 0.6 }, '50%': { opacity: 1 } },
        glow:     { '0%,100%': { boxShadow: '0 0 8px rgba(77,159,255,0.2)' }, '50%': { boxShadow: '0 0 24px rgba(77,159,255,0.5)' } },
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease both',
        'fade-in':    'fadeIn 0.3s ease both',
        'shimmer':    'shimmer 2s ease-in-out infinite',
        'glow':       'glow 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      colors: {
        cnssap: {
          bg:       'var(--cn-bg)',
          surface:  'var(--cn-surface)',
          surface2: 'var(--cn-surface2)',
          border:   'var(--cn-border)',
          border2:  'var(--cn-border2)',
          primary:  '#003f7f',
          hover:    '#0060c0',
          accent:   '#4d9fff',
          text:     'var(--cn-text)',
          muted:    'var(--cn-muted)',
          dim:      'var(--cn-dim)',
          success:  '#2ecc71',
          warning:  '#e67e22',
          danger:   '#e74c3c',
        },
      },
    },
  },
  plugins: [],
}

