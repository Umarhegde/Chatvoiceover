/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        vf: {
          bg:           '#080a12',
          surface:      '#0e1018',
          card:         '#141720',
          'card-hover': '#181c2a',
          border:       '#1f2337',
          'border-hi':  '#2d3255',
          accent:       '#7c3aed',
          'accent-2':   '#6d28d9',
          glow:         '#a78bfa',
          'accent-dim': 'rgba(124,58,237,0.15)',
          text:         '#eef0f9',
          'text-dim':   '#9ba3c4',
          muted:        '#5a6180',
          success:      '#10b981',
          error:        '#f43f5e',
          warning:      '#f59e0b',
        },
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(135deg, #141720 0%, #12152a 100%)',
        'gradient-accent': 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        'gradient-glow': 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'accent': '0 0 0 1px rgba(124,58,237,0.5), 0 0 20px rgba(124,58,237,0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.4)',
        'glow-sm': '0 0 12px rgba(124,58,237,0.4)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        'fade-up':  'fade-up 0.25s ease-out both',
        'fade-in':  'fade-in 0.2s ease-out both',
        shimmer:    'shimmer 2s linear infinite',
        pulse2:     'pulse2 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
