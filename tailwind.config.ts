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
        primary: {
          50: '#F9F9F6',
          100: '#F4F4F1',
          900: '#1D1D1D',
        },
      },
      boxShadow: {
        float: '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'bounce-custom': 'bounce 2s infinite',
        'bounce-subtle': 'bounce-subtle 2s infinite',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(-12.5%)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
