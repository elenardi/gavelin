/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gavelin: {
          bg:      '#0d0520',
          surface: '#1a0a2e',
          panel:   '#221442',
          purple:  '#7c3aed',
          gold:    '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
