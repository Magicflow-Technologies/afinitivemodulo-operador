/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            DEFAULT: '#0D1B2A',
            light: '#1B263B',
            dark: '#08101A',
          },
          gold: {
            DEFAULT: '#C9A84C',
            light: '#D4AF37',
            dark: '#AA882C',
          },
        },
      },
    },
  },
  plugins: [],
}
