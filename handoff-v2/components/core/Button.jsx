import React, { useState } from 'react';

const PALETTES = {
  ink:    { bg: 'var(--pl-ink)', fg: 'var(--pl-cream)', hover: 'var(--pl-olive-deep)', border: 'none' },
  olive:  { bg: 'var(--pl-olive)', fg: 'var(--pl-cream)', hover: 'var(--pl-olive-hover)', border: 'none' },
  paper:  { bg: 'var(--pl-cream-card)', fg: 'var(--pl-ink)', hover: 'var(--pl-cream-deep)', border: '1px solid var(--pl-divider)' },
  terra:  { bg: 'var(--pl-terra)', fg: 'var(--pl-cream)', hover: '#8F4828', border: 'none' },
  ghost:  { bg: 'transparent', fg: 'var(--pl-ink)', hover: 'var(--pl-olive-8)', border: '1px solid var(--pl-olive-20)' },
};

const SIZES = {
  sm: { pad: '8px 16px', fs: 13 },
  md: { pad: '12px 22px', fs: 15 },
  lg: { pad: '16px 30px', fs: 17 },
};

/**
 * Button — the Pearloom action control. Verb-first, lowercase except
 * first letter ("Begin a thread", not "GET STARTED NOW!"). Pill-shaped.
 * The `pearl` variant wears an iridescent gold surface for the single
 * primary CTA on a surface. Always honours the spring press.
 */
export function Button({
  children,
  variant = 'ink',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  className,
  style,
}) {
  const [hover, setHover] = useState(false);
  const isPearl = variant === 'pearl';
  const p = PALETTES[isPearl ? 'ink' : variant] || PALETTES.ink;
  const s = SIZES[size] || SIZES.md;

  const pearlSurface = isPearl
    ? {
        background: 'linear-gradient(135deg, #F4ECD8 0%, #E8C77A 32%, #D9A89E 58%, #B8C96B 82%, #F4ECD8 100%)',
        backgroundSize: '180% 180%',
        backgroundPosition: hover ? '100% 50%' : '0% 50%',
        color: 'var(--pl-ink)',
        border: '1px solid var(--pl-gold-soft)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), var(--pl-shadow-sm)',
      }
    : {
        background: hover && !disabled ? p.hover : p.bg,
        color: p.fg,
        border: p.border,
      };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...pearlSurface,
        padding: s.pad,
        fontSize: s.fs,
        fontWeight: 500,
        borderRadius: 'var(--pl-radius-full)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--pl-dur-quick) var(--pl-ease-out), background-position var(--pl-dur-slow) var(--pl-ease-out), transform var(--pl-dur-quick) var(--pl-ease-spring)',
        transform: hover && !disabled ? 'translateY(-1px)' : 'translateY(0)',
        fontFamily: 'var(--pl-font-body)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        letterSpacing: '-0.005em',
        opacity: disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
