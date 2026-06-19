/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0f1117',
          surface: '#1a1d27',
          card: '#21253a',
          border: '#2d3152',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          muted: '#6b7280',
          text: '#e2e8f0',
          'text-dim': '#94a3b8',
        },
      },
    },
  },
  plugins: [],
}
