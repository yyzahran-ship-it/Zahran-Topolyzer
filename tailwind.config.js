/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          blue: '#0369a1',
          teal: '#0891b2',
          dark: '#0c1a2e',
        }
      }
    },
  },
  plugins: [],
}
