/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-01-26 11:22:53
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-01-28 14:45:05
 * @FilePath: /v3/tailwind.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
        apple: {
          blue: '#007AFF',
          'blue-hover': '#0066DD',
          'blue-light': '#5AC8FA',
          silver: '#8E8E93',
          'silver-light': '#C0C0C0',
        },
      },
      boxShadow: {
        float: '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'bounce-custom': 'bounce 2s infinite',
        'bounce-subtle': 'bounce-subtle 2s infinite',
        'bounce-minimal': 'bounce-minimal 1.4s infinite',
        'typing-dot-1': 'typing-dot-1 1.4s ease-in-out infinite',
        'typing-dot-2': 'typing-dot-2 1.4s ease-in-out infinite',
        'typing-dot-3': 'typing-dot-3 1.4s ease-in-out infinite',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(-7.5%)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        'bounce-minimal': {
          '0%, 100%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(-3px)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        'typing-dot-1': {
          '0%, 100%': {
            opacity: '1',
          },
        },
        'typing-dot-2': {
          '0%, 19%': {
            opacity: '0',
          },
          '20%, 79%': {
            opacity: '1',
          },
          '80%, 100%': {
            opacity: '0',
          },
        },
        'typing-dot-3': {
          '0%, 39%': {
            opacity: '0',
          },
          '40%, 59%': {
            opacity: '1',
          },
          '60%, 100%': {
            opacity: '0',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
