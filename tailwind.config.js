/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'rgb': 'rgb',
        // Kawaii-Cyberpunk custom palette
        'brand-red': '#FF4500',
        'soft-dark': '#1A1A1B',
        'card-bg': '#272729',
        primary: {
          50: 'rgb(var(--color-bg-primary) / 0.05)',
          100: 'rgb(var(--color-bg-primary) / 0.1)',
          500: 'rgb(var(--color-bg-primary))',
          900: 'rgb(var(--color-bg-primary))',
        },
        secondary: {
          500: 'rgb(var(--color-bg-secondary))',
        },
        accent: {
          500: 'rgb(var(--color-accent))',
          600: 'rgb(var(--color-accent-hover))',
        },
        success: {
          500: 'rgb(var(--color-success))',
        },
        error: {
          500: 'rgb(var(--color-error))',
        },
        text: {
          primary: 'rgb(var(--color-text-primary))',
          secondary: 'rgb(var(--color-text-secondary))',
          tertiary: 'rgb(var(--color-text-tertiary))',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border))',
          hover: 'rgb(var(--color-border-hover))',
        },
        card: {
          DEFAULT: 'rgb(var(--color-bg-card))',
          hover: 'rgb(var(--color-bg-card-hover))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'cursive'],
        retro: ['VT323', 'monospace'],
      },
      animation: {
        'slide-in-up': 'slideInUp 0.5s ease-out',
        'slide-in-down': 'slideInDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'correct-pulse': 'correctPulse 0.6s ease-out',
        'incorrect-shake': 'incorrectShake 0.6s ease-out',
        'multiplier-pop': 'multiplierPop 2s ease-out forwards',
        'score-glow': 'scoreGlow 2s ease-in-out infinite',
        'skeleton': 'skeleton-loading 1.5s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 20px rgba(255, 69, 0, 0.5)', // brand-red glow
        'glow-strong': '0 0 30px rgba(var(--color-accent), 0.6)',
      },
      borderRadius: {
        '4xl': '2rem',
        // Kawaii-Cyberpunk custom border radius
        'kawaii': '24px',
        'pill': '9999px',
      },
      gradientColorStops: {
        'gradient-primary-start': 'rgb(99, 102, 241)',
        'gradient-primary-end': 'rgb(139, 92, 246)',
      },
    },
  },
  plugins: [],
};
