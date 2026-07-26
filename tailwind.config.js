/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "The Working Ledger" palette — see DESIGN.md
        ink: '#16231F',
        paper: '#F1F3EC',
        rule: '#D7DCCF',
        primary: {
          50: '#EAF3F0',
          100: '#CFE6DE',
          200: '#A0CDBC',
          300: '#71B49A',
          400: '#438B75',
          500: '#1F6F5C',
          600: '#195A4A',
          700: '#134539',
        },
        gold: {
          50: '#FBF3E6',
          100: '#F3E0BE',
          200: '#E6C179',
          300: '#D2A24F',
          400: '#B8863A',
          500: '#96692B',
          600: '#7A5522',
        },
        deficit: {
          50: '#FBEBEB',
          100: '#F2C9C9',
          300: '#D98686',
          500: '#A63A3A',
          600: '#872E2E',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
