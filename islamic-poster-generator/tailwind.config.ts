import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'green-primary': '#1a4a2e',
        'green-dark': '#0a2015',
        'gold': '#d4af37',
        'gold-light': '#f5e6c0',
      },
      fontFamily: {
        amiri: ['Amiri', 'serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
