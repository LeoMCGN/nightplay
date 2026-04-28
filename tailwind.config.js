/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        title: ['Righteous', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        'bg-primary': '#0D0D1A',
        violet: '#7C3AED',
        rose: '#EC4899',
        orange: '#F97316',
      },
    },
  },
  plugins: [],
}

