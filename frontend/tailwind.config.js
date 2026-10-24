/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        carbon: {
          950: '#09090B',
          900: '#111113',
          850: '#151518',
          800: '#18181B',
          700: '#27272A',
          600: '#3F3F46',
        },
        terminal: {
          emerald: '#10B981',
          cyan: '#38BDF8',
          amber: '#F59E0B',
          rose: '#F43F5E',
          zinc: '#A1A1AA',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
