/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  important: '#root',
  theme: {
    extend: {
      colors: {
        primary: {
          main: '#42A5F5',
          light: '#e3f2fd',
          soft: '#bbdefb',
          DEFAULT: '#42A5F5',
        },
        secondary: {
          main: '#FFA726',
          DEFAULT: '#FFA726',
        },
        warm: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
        },
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'soft-lg': '0 4px 6px -1px rgb(0 0 0 / 0.04), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}

