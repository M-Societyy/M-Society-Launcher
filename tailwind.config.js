/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ms-dark': {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#222230',
          500: '#2a2a3a',
        },
        'ms-purple': {
          900: '#1a0033',
          800: '#2d0057',
          700: '#4a0080',
          600: '#6b00b3',
          500: '#8b00e6',
          400: '#a933ff',
          300: '#c266ff',
          200: '#d699ff',
        },
        'ms-red': {
          900: '#330000',
          800: '#5c0000',
          700: '#8b0000',
          600: '#b30000',
          500: '#e60000',
          400: '#ff3333',
          300: '#ff6666',
        },
        'ms-accent': {
          purple: '#9b30ff',
          red: '#dc143c',
          crimson: '#8b0035',
          violet: '#7b2d8b',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%': { boxShadow: '0 0 5px rgba(155, 48, 255, 0.3), 0 0 10px rgba(155, 48, 255, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(155, 48, 255, 0.6), 0 0 40px rgba(155, 48, 255, 0.3)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'ms-gradient': 'linear-gradient(135deg, #1a0033 0%, #0a0a0f 50%, #330000 100%)',
      },
    },
  },
  plugins: [],
}
