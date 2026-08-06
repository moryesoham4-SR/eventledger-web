/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Midnight Festival" / light-mode-aware palette — the five surface
        // tokens and the error-banner tint switch with data-theme (see
        // index.css); everything else (brand accents, status dots) stays a
        // fixed saturated color that reads fine on either background.
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        well: 'rgb(var(--color-well) / <alpha-value>)',
        rule: 'rgb(var(--color-rule) / <alpha-value>)',
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
        deficit: {
          50: 'rgb(var(--color-deficit-tint) / <alpha-value>)',
          100: 'rgb(var(--color-deficit-tint-border) / <alpha-value>)',
          300: '#FDA4AF',
          500: '#F43F5E',
          600: 'rgb(var(--color-deficit-tint-text) / <alpha-value>)',
          700: '#C22945', // fixed — solid-button hover states (Reject etc.), not the tint-text use of 600
        },
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
