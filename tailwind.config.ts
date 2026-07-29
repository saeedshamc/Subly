import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        vazir: ['Vazirmatn', 'Tahoma', 'sans-serif'],
      },
      colors: {
        network: {
          bit: '#2563eb', // network bits highlight (blue)
        },
        host: {
          bit: '#f59e0b', // host bits highlight (amber)
        },
      },
    },
  },
  plugins: [],
};

export default config;
