/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C2410C',
          hover: '#9A3412',
          active: '#7C2D12',
          light: '#FDF6EC',
        },
        secondary: {
          DEFAULT: '#D4A373',
          light: '#FAF1E6',
        },
        tertiary: {
          DEFAULT: '#365314',
          light: '#F4F7EE',
        },
        warm: {
          bg: '#FFFBF5',
          surface: '#FFFFFF',
          tint: '#FDF6EC',
        },
        stone: {
          subtle: '#E7E5E4',
          medium: '#D6D3D1',
          dark: '#A8A29E',
          text: '#1C1917',
          muted: '#57534E',
        },
        status: {
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#DC2626',
          info: '#3B82F6',
        }
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['"Open Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Source Code Pro"', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '20px',
      },
      boxShadow: {
        // MarketNest has NO drop shadows by design, except the modal overlay
        'none': 'none',
        'modal': '0 8px 24px rgba(28, 25, 23, 0.12)',
      }
    },
  },
  plugins: [],
}

