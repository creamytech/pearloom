'use client';

// ─────────────────────────────────────────────────────────────
// Button — the canonical action element. One source for all
// dashboard, marketing, and editor surfaces. Replaces a half-
// dozen ad-hoc <button> styles across the codebase.
//
// Design-system v2: pill-shaped, lift + spring on hover/press,
// and a `pearl` variant — the iridescent gold surface reserved
// for the single primary CTA on a surface (BRAND §3).
// ─────────────────────────────────────────────────────────────

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'link' | 'pearl';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const sizes: Record<Size, { padX: number; padY: number; font: string; gap: number }> = {
  xs: { padX: 10, padY: 5,  font: '0.78rem', gap: 6 },
  sm: { padX: 14, padY: 8,  font: '0.86rem', gap: 7 },
  md: { padX: 18, padY: 11, font: '0.92rem', gap: 8 },
  lg: { padX: 24, padY: 14, font: '1rem',    gap: 10 },
};

// The iridescent gold-thread surface — pearl CTA only (BRAND §3).
const PEARL_SURFACE =
  'linear-gradient(135deg, #F4ECD8 0%, #E8C77A 32%, #D9A89E 58%, #B8C96B 82%, #F4ECD8 100%)';

function variantStyles(variant: Variant): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--pl-olive)',
        color: 'var(--primary-foreground)',
        border: '1px solid var(--pl-olive)',
      };
    case 'secondary':
      return {
        background: 'var(--pl-olive-mist)',
        color: 'var(--pl-ink)',
        border: '1px solid var(--pl-divider)',
      };
    case 'outline':
      return {
        background: 'transparent',
        color: 'var(--pl-ink)',
        border: '1px solid var(--pl-divider)',
      };
    case 'destructive':
      return {
        background: 'var(--pl-plum)',
        color: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-plum)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--pl-ink-soft)',
        border: '1px solid transparent',
      };
    case 'link':
      return {
        background: 'transparent',
        color: 'var(--pl-olive)',
        border: '1px solid transparent',
        padding: 0,
        textDecoration: 'underline',
        textUnderlineOffset: 4,
      };
    case 'pearl':
      return {
        background: PEARL_SURFACE,
        backgroundSize: '180% 180%',
        backgroundPosition: '0% 50%',
        color: 'var(--pl-ink)',
        border: '1px solid var(--pl-gold-soft)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.5), var(--pl-shadow-sm, 0 1px 3px rgba(40,28,12,0.10))',
      };
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    loading,
    fullWidth,
    children,
    style,
    disabled,
    ...rest
  },
  ref
) {
  const sz = sizes[size];
  const varStyle = variantStyles(variant);
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sz.gap,
        padding: variant === 'link' ? 0 : `${sz.padY}px ${sz.padX}px`,
        borderRadius: 'var(--pl-radius-full)',
        font: 'inherit',
        fontFamily: 'var(--pl-font-body)',
        fontSize: sz.font,
        fontWeight: 600,
        letterSpacing: '-0.005em',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        width: fullWidth ? '100%' : 'auto',
        transition:
          'transform var(--pl-dur-fast) var(--pl-ease-spring), background var(--pl-dur-fast) var(--pl-ease-out), background-position var(--pl-dur-slow, 0.5s) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
        ...varStyle,
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading && variant !== 'link')
          e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseEnter={(e) => {
        if (disabled || loading || variant === 'link') return;
        e.currentTarget.style.transform = 'translateY(-1px)';
        if (variant === 'primary') {
          e.currentTarget.style.background = 'var(--pl-olive-hover)';
        } else if (variant === 'secondary' || variant === 'ghost' || variant === 'outline') {
          e.currentTarget.style.background = 'var(--pl-olive-mist)';
          e.currentTarget.style.borderColor = 'var(--pl-olive)';
        } else if (variant === 'destructive') {
          e.currentTarget.style.background = '#5C1F1F';
        } else if (variant === 'pearl') {
          e.currentTarget.style.backgroundPosition = '100% 50%';
        }
      }}
      onMouseLeave={(e) => {
        const v = variantStyles(variant);
        Object.assign(e.currentTarget.style, {
          background: v.background as string,
          borderColor: (v.border as string)?.split(' ').pop(),
        });
        if (variant === 'pearl') e.currentTarget.style.backgroundPosition = '0% 50%';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {leftIcon && <span style={{ display: 'inline-flex' }}>{leftIcon}</span>}
          {children}
          {rightIcon && <span style={{ display: 'inline-flex' }}>{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 14,
        height: 14,
        border: '2px solid currentColor',
        borderRightColor: 'transparent',
        borderRadius: '50%',
        animation: 'pl-spin 0.7s linear infinite',
      }}
    />
  );
}
