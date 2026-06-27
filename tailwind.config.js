/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#6366f1',
          600: '#4f46e5', // Spec Primary Color
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          400: '#f0abfc',
          500: '#d946ef',
          605: '#c084fc',
          700: '#a855f7',
        },
        darkBg: '#090d16',
        darkCard: '#111827',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Tamil', 'Noto Sans', 'sans-serif'],
        outfit: ['Outfit', 'Noto Sans Tamil', 'Noto Sans', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'premium-glow': 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(9,13,22,0) 70%)',
      }
    },
  },
  plugins: [],
}
