/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f4f7f8',
          100: '#e3eaed',
          200: '#c9d5db',
          300: '#a3b5c0',
          400: '#768e9d',
          500: '#5b7383',
          600: '#4e5f6e',
          700: '#43505c',
          800: '#3b454f',
          900: '#343c44',
          950: '#1c2228',
        },
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        accent: {
          DEFAULT: '#0f766e',
          soft: '#ccfbf1',
          strong: '#115e59',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28, 34, 40, 0.04), 0 8px 24px rgba(28, 34, 40, 0.06)',
        lift: '0 12px 40px rgba(28, 34, 40, 0.1)',
        glow: '0 0 0 4px rgba(8, 145, 178, 0.12)',
        panel: '0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(28,34,40,0.04), 0 10px 28px rgba(28,34,40,0.05)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      backgroundImage: {
        'app-mesh':
          'radial-gradient(1200px 600px at 10% -10%, rgba(8,145,178,0.12), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(15,118,110,0.10), transparent 50%), radial-gradient(700px 400px at 50% 100%, rgba(99,102,241,0.04), transparent 45%)',
        'login-mesh':
          'radial-gradient(900px 500px at 20% 10%, rgba(8,145,178,0.22), transparent 55%), radial-gradient(800px 500px at 90% 20%, rgba(15,118,110,0.18), transparent 50%), linear-gradient(160deg, #1c2228 0%, #243038 45%, #1c2228 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
