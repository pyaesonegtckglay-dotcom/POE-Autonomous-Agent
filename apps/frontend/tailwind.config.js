/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        poe: {
          cyan: '#35E6F0',
          blue: '#4C7DFF',
          purple: '#8E4CF7',
          magenta: '#D24BF3',
          dark: '#050816',
          navy: '#0A1628',
          card: '#0D1B3E',
        },
      },
      backgroundImage: {
        'poe-gradient': 'linear-gradient(135deg, #8E4CF7 0%, #4C7DFF 50%, #35E6F0 100%)',
        'poe-dark': 'linear-gradient(180deg, #050816 0%, #0A1628 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #35E6F0, 0 0 10px #35E6F0' },
          '100%': { boxShadow: '0 0 20px #8E4CF7, 0 0 40px #8E4CF7' },
        },
      },
    },
  },
  plugins: [],
}
