/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ryuu: {
          black: '#0D0D0D',
          ink: '#240011',
          deep: '#4A0024',
          violet: '#C2185B',
          neon: '#FF2D8D',
          soft: '#FFB3D6',
        },
      },
      boxShadow: {
        glow: '0 0 32px rgba(255, 45, 141, 0.38)',
        'glow-sm': '0 0 18px rgba(255, 45, 141, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
