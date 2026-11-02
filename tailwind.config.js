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
        space: {
          950: '#060911',
          900: '#0a0e17',
          850: '#0f1422',
          800: '#141c2e',
          700: '#1e293b',
          600: '#334155',
        },
        astro: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          purple: '#7928ca',
          pink: '#ff0080',
          lime: '#10b981',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 242, 254, 0.4)',
        'glow-lime': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(121, 40, 202, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'radial-stars': 'radial-gradient(circle at 50% 50%, rgba(20, 30, 55, 0.6) 0%, rgba(10, 14, 23, 1) 100%)',
        'grid-pattern': 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
}
