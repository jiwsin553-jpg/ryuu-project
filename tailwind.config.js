/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ryuu: {
          black: '#0D0D0D',
          ink: '#1A001A',
          deep: '#2D0057',
          violet: '#6A0DAD',
          neon: '#9B30FF',
          soft: '#D8B4FE',
        },
      },
      boxShadow: {
        glow: '0 0 32px rgba(155, 48, 255, 0.38)',
        'glow-sm': '0 0 18px rgba(155, 48, 255, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
