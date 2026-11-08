/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C2410C',
          hover: '#EA580C',
          active: '#9A3412',
          light: '#FFF7ED',
        },
        secondary: {
          DEFAULT: '#20970B',
          light: '#ECFDF5',
        },
        genesis: {
          bg: '#FAFAFA',
          surface: '#FFFFFF',
          text: '#0A0A0A',
          muted: '#6B6B6B',
          neutral: '#9C9C9C',
          border: '#E8E8EC',
          darkBg: '#000000',
          darkSurface: '#0A0A0E',
          darkElevated: '#121218',
          darkBorder: '#1F1F27',
          darkText: '#FAFAFA',
          darkMuted: '#A1A1AA',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#C2410C',
        }
      },
      fontFamily: {
        display: ['"General Sans"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"General Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'full': '9999px',
      },
      boxShadow: {
        'none': 'none',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'primary-glow': '0 4px 12px rgba(194, 65, 12, 0.35)',
        'modal': '0 12px 36px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
