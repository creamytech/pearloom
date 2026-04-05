import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Semantic color tokens (maps shadcn/ui vars → --pl-* system) ──
      colors: {
        background:  'var(--background)',
        foreground:  'var(--foreground)',
        card:        { DEFAULT: 'var(--card)',        foreground: 'var(--card-foreground)'        },
        popover:     { DEFAULT: 'var(--popover)',     foreground: 'var(--popover-foreground)'     },
        primary:     { DEFAULT: 'var(--primary)',     foreground: 'var(--primary-foreground)'     },
        secondary:   { DEFAULT: 'var(--secondary)',   foreground: 'var(--secondary-foreground)'   },
        muted:       { DEFAULT: 'var(--muted)',       foreground: 'var(--muted-foreground)'       },
        accent:      { DEFAULT: 'var(--accent)',      foreground: 'var(--accent-foreground)'      },
        destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
        warning:     { DEFAULT: 'var(--pl-warning)',  mist: 'var(--pl-warning-mist)' },
        success:     { DEFAULT: 'var(--pl-success)',  mist: 'var(--pl-success-mist)' },
        olive:       { DEFAULT: 'var(--pl-olive)', hover: 'var(--pl-olive-hover)', deep: 'var(--pl-olive-deep)', mist: 'var(--pl-olive-mist)' },
        gold:        { DEFAULT: 'var(--pl-gold)',  mist: 'var(--pl-gold-mist)' },
        plum:        { DEFAULT: 'var(--pl-plum)',  mist: 'var(--pl-plum-mist)' },
        ink:         { DEFAULT: 'var(--pl-ink)',   soft: 'var(--pl-ink-soft)' },
        cream:       { DEFAULT: 'var(--pl-cream)', deep: 'var(--pl-cream-deep)' },
        border:      'var(--border)',
        input:       'var(--input)',
        ring:        'var(--ring)',
      },
      // ── Border radius ──
      borderRadius: {
        lg:   'var(--radius)',
        md:   'var(--pl-radius-md)',
        sm:   'var(--pl-radius-sm)',
        xs:   'var(--pl-radius-xs)',
        full: 'var(--pl-radius-full)',
      },
      // ── Font families — replaces v4-only font-[family-name:...] syntax ──
      fontFamily: {
        heading: 'var(--pl-font-heading)',
        body:    'var(--pl-font-body)',
      },
      // ── Keyframes ──
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(calc(-100% - var(--gap, 1rem)))' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(163,177,138,0.4)' },
          '50%':       { boxShadow: '0 0 0 8px rgba(163,177,138,0)' },
        },
        'orb-drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%':       { transform: 'translate(2%, -3%)' },
          '66%':       { transform: 'translate(-1%, 2%)' },
        },
        'orb-pulse': {
          '0%, 100%': { opacity: '0.15', transform: 'translate(-50%, -50%) scale(1)' },
          '50%':       { opacity: '0.28', transform: 'translate(-50%, -50%) scale(1.18)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.22s cubic-bezier(0.16,1,0.3,1)',
        'accordion-up':   'accordion-up 0.22s cubic-bezier(0.16,1,0.3,1)',
        shimmer:          'shimmer 1.4s cubic-bezier(0.4,0,0.6,1) infinite',
        marquee:          'marquee linear infinite',
        'pulse-glow':     'pulse-glow 2s ease-in-out infinite',
        'orb-drift':      'orb-drift 8s ease-in-out infinite',
        'orb-pulse':      'orb-pulse 6s ease-in-out infinite',
        'fade-in':        'fade-in 0.5s ease forwards',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};

export default config;
