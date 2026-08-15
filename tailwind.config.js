/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-base': '#0B0F17',
        'dark-surface': '#111827',
        'dark-card': '#1E293B',
      },
    },
  },
  plugins: [],
};
