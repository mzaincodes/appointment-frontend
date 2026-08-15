import type { Config } from 'tailwindcss';

/**
 * Design system.
 *
 * Colours are declared as CSS custom properties in `app/globals.css` and
 * referenced here through `rgb(var(--token) / <alpha-value>)`. That indirection
 * is what makes the dark theme a swap of variable values rather than a second
 * set of `dark:` classes on every element — components name a *role*
 * ("surface", "muted"), never a literal colour, so both themes stay coherent by
 * construction instead of by discipline.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — a clinical teal that reads as medical without feeling cold.
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        /*
         * Brand *roles* — prefer these over the numbered scale for anything
         * that carries text. `brand-solid` and `brand-on-solid` are guaranteed
         * to meet WCAG AA together in both themes; a hand-picked pair from the
         * scale is not.
         */
        'brand-solid': {
          DEFAULT: 'rgb(var(--brand-solid) / <alpha-value>)',
          hover: 'rgb(var(--brand-solid-hover) / <alpha-value>)',
        },
        'brand-on-solid': 'rgb(var(--brand-on-solid) / <alpha-value>)',
        'brand-text': 'rgb(var(--brand-text) / <alpha-value>)',

        accent: {
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
        },

        // Semantic surfaces — these are what components actually use.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',

        content: {
          DEFAULT: 'rgb(var(--content) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          subtle: 'rgb(var(--content-subtle) / <alpha-value>)',
          inverse: 'rgb(var(--content-inverse) / <alpha-value>)',
        },

        success: {
          bg: 'rgb(var(--success-bg) / <alpha-value>)',
          fg: 'rgb(var(--success-fg) / <alpha-value>)',
          border: 'rgb(var(--success-border) / <alpha-value>)',
        },
        warning: {
          bg: 'rgb(var(--warning-bg) / <alpha-value>)',
          fg: 'rgb(var(--warning-fg) / <alpha-value>)',
          border: 'rgb(var(--warning-border) / <alpha-value>)',
        },
        danger: {
          bg: 'rgb(var(--danger-bg) / <alpha-value>)',
          fg: 'rgb(var(--danger-fg) / <alpha-value>)',
          border: 'rgb(var(--danger-border) / <alpha-value>)',
        },
        info: {
          bg: 'rgb(var(--info-bg) / <alpha-value>)',
          fg: 'rgb(var(--info-fg) / <alpha-value>)',
          border: 'rgb(var(--info-border) / <alpha-value>)',
        },
      },

      /*
       * Values missing from Tailwind's default scale.
       *
       * Without these, `h-13` and `h-4.5` generate no CSS at all — the class is
       * simply dropped, and the element falls back to its content height. That
       * made the `lg` button (h-13) render at 24px, i.e. *shorter* than the
       * `sm` button at 36px.
       */
      spacing: {
        4.5: '1.125rem', // 18px — icon size between h-4 and h-5
        13: '3.25rem', // 52px — large control height, between h-12 and h-14
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
      },

      // Slightly tightened tracking on large text — the display face is set for
      // headlines, and default tracking looks loose above ~30px.
      letterSpacing: {
        tight: '-0.015em',
        tighter: '-0.03em',
      },

      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      boxShadow: {
        // Layered shadows: a tight contact shadow plus a soft ambient one reads
        // far more natural than a single large blur.
        card: '0 1px 2px rgb(var(--shadow) / 0.04), 0 4px 12px rgb(var(--shadow) / 0.05)',
        'card-hover': '0 2px 4px rgb(var(--shadow) / 0.06), 0 12px 28px rgb(var(--shadow) / 0.10)',
        lifted: '0 4px 8px rgb(var(--shadow) / 0.06), 0 20px 48px rgb(var(--shadow) / 0.14)',
        glow: '0 0 0 1px rgb(var(--brand-500) / 0.25), 0 8px 32px rgb(var(--brand-500) / 0.22)',
        'inner-line': 'inset 0 0 0 1px rgb(var(--line) / 1)',
      },

      backgroundImage: {
        // Both stops are dark enough (light) / light enough (dark) to carry
        //`brand-on-solid` across the whole sweep — the old brand-500 start
        // measured 2.49:1 against white.
        'brand-gradient':
          'linear-gradient(135deg, rgb(var(--brand-solid)) 0%, rgb(var(--brand-solid-hover)) 100%)',
        'hero-glow':
          'radial-gradient(70% 55% at 50% 0%, rgb(var(--brand-500) / 0.16) 0%, transparent 70%)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Three dots, each offset — the classic typing indicator.
        'typing-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.5' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'fade-up': 'fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.8s infinite',
        'typing-bounce': 'typing-bounce 1.2s infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
