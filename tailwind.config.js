/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Midnight Festival" palette
        ink: '#E7ECF5',    // light text on dark surfaces
        paper: '#0B1220',  // page background
        card: '#162032',   // card / panel surface
        well: '#1C2940',   // recessed accents: hovers, tab tracks, disabled fields
        rule: '#233047',   // subtle borders on dark
        primary: {
          // vibrant orange
          50: '#FFF1E5', 100: '#FFDAB3', 200: '#FFB870', 300: '#FF9B40',
          400: '#FF8A1F', 500: '#FF7A00', 600: '#E56C00', 700: '#B85700',
        },
        secondary: {
          // royal blue
          50: '#EAF0FE', 100: '#C7D8FC', 300: '#7FA8F8',
          500: '#2563EB', 600: '#1D4FC4', 700: '#173F9C',
        },
        accent: {
          // violet
          50: '#F3EEFE', 100: '#DCC9FB', 300: '#B79CF6',
          500: '#7C3AED', 600: '#642FBE', 700: '#4C2492',
        },
        success: { 50: '#0F2A22', 100: '#123526', 300: '#6EE7B7', 500: '#10B981', 600: '#0D9668' },
        warning: { 50: '#2E2308', 100: '#3A2C0A', 300: '#FCD34D', 500: '#F59E0B', 600: '#C77F08' },
        deficit: { 50: '#301019', 100: '#3D1420', 300: '#FDA4AF', 500: '#F43F5E', 600: '#FB7185' },
        gold: { 500: '#F59E0B', 600: '#C77F08' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
