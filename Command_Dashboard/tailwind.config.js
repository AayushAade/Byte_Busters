/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'canvas-light': '#F1F2F6',
        'panel-white': '#FFFFFF',
        'sidebar-lavender': '#F1F1FE',
        'primary-purple': '#7C3AED',
        'accent-soft': '#EDE9FE',
        'text-primary': '#1A1A2E',
        'text-secondary': '#64748B',
        'crimson-alert': '#FF3B30',
        'safe-green': '#34C759',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
