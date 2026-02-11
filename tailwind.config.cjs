module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/main.tsx',
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
    './src/styles/**/*.css'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'sans-serif']
      },
      colors: {
        safari: {
          light: {
            bg: '#fbfbfb',
            toolbar: 'rgba(245, 245, 245, 0.85)',
            bar: '#e5e5e5'
          },
          dark: {
            bg: '#1e1e1e',
            toolbar: 'rgba(40, 40, 40, 0.85)',
            bar: '#3a3a3a'
          }
        }
      }
    }
  },
  plugins: []
};
