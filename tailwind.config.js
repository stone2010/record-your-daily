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
        primary: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#fad7ad',
          300: '#f6bb78',
          400: '#f29541',
          500: '#ef7a1e',
          600: '#df5f10',
          700: '#b9480e',
          800: '#933b14',
          900: '#773314',
        },
        secondary: {
          50: '#f7f7f8',
          100: '#efeef1',
          200: '#dbd9e2',
          300: '#bcbbcc',
          400: '#9795ac',
          500: '#78768d',
          600: '#5f5e72',
          700: '#4c4b5c',
          800: '#403f4c',
          900: '#393842',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}