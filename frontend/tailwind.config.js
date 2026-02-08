/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: { light: '#fff0f3', DEFAULT: '#f9a8c9', border: '#f3e8ee' },
        rose: { flag: '#e11d48' },
        teal: { clean: '#0d9488' },
        amber: { warn: '#d97706' },
        body: '#1a1a1a',
        muted: '#6b7280',
        receipt: '#fdf8f6',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
