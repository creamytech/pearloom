'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/SquishyButton.tsx
//
// The groove-brand primary CTA. Pill-shaped, gradient filled,
// squishes on tap via the --pl-groove-ease-squish back-out
// cubic. Drop-in replacement for editorial ink buttons on the
// product-UI surfaces (marketing + dashboard + chrome pages).
//
// Do NOT use on the published site — that stays editorial.
// ─────────────────────────────────────────────────────────────

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type SquishPalette = 'sunrise' | 'orchard' | 'petal' | 'ink';
type SquishSize = 'sm' | 'md' | 'lg';

interface SquishyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  palette?: SquishPalette;
  size?: SquishSize;
  icon?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
}

const PALETTE_BG: Record<SquishPalette, string> = {
  sunrise: 'var(--pl-groove-blob-sunrise)',
  orchard: 'var(--pl-groove-blob-orchard)',
  petal:   'var(--pl-groove-blob-petal)',
  ink:     'var(--pl-groove-ink)',
};

const PALETTE_FG: Record<SquishPalette, string> = {
  sunrise: '#fff',
  orchard: 'var(--pl-groove-ink)',
  petal:   '#fff',
  ink:     'var(--pl-groove-cream)',
};

const SIZE_PAD: Record<SquishSize, string> = {
  sm: '10px 18px',
  md: '14px 26px',
  lg: '18px 34px',
};

const SIZE_FONT: Record<SquishSize, string> = {
  sm: '0.88rem',
  md: '1rem',
  lg: '1.1rem',
};

const SIZE_MIN_HEIGHT: Record<SquishSize, number> = {
  sm: 40,
  md: 48,
  lg: 56,
};

export const SquishyButton = forwardRef<HTMLButtonElement, SquishyButtonProps>(
  function SquishyButton(
    {
      palette = 'sunrise',
      size = 'md',
      icon,
      trailing,
      fullWidth = false,
      children,
      style,
      disabled,
      onMouseDown,
      onMouseUp,
      onMouseLeave,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled}
        onMouseDown={(e) => {
          if (!disabled) e.currentTarget.style.transform = 'scale(0.94)';
          onMouseDown?.(e);
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = '';
          onMouseUp?.(e);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          onMouseLeave?.(e);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: SIZE_PAD[size],
          minHeight: SIZE_MIN_HEIGHT[size],
          width: fullWidth ? '100%' : undefined,
          borderRadius: 'var(--pl-groove-radius-pill)',
          border: 'none',
          background: PALETTE_BG[palette],
          color: PALETTE_FG[palette],
          fontFamily: 'var(--pl-font-body)',
          fontSize: SIZE_FONT[size],
          fontWeight: 600,
          letterSpacing: '-0.005em',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          boxShadow:
            '0 6px 18px rgba(139,74,106,0.22), 0 2px 6px rgba(43,30,20,0.08)',
          transition:
            'transform var(--pl-dur-fast) var(--pl-groove-ease-squish),' +
            ' box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
          ...style,
        }}
        {...rest}
      >
        {icon}
        <span>{children}</span>
        {trailing}
      </button>
    );
  },
);
