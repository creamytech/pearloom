'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/DesignAtoms.tsx
//
// Small SVG atoms used across the "Pearloom Home" design bundle:
// Pear (2D), HeroPear (large stylized), Pill (mono label),
// Pearl (iridescent dot), Leaf, Squiggle (wavy underline),
// Ornament (crosshair). Each matches the design's prototype
// atoms so the landing page feels cohesive.
//
// These live under /marketing/design/ because they're tuned to
// the exact palette of the marketing home page. For general
// product UI use the primitives in /brand/groove instead.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from 'react';

// ── Pear glyph (small) ────────────────────────────────────────
interface PearProps {
  size?: number;
  color?: string;
  stem?: string;
  leaf?: string;
  highlight?: boolean;
  animated?: boolean;
  style?: CSSProperties;
}
export function Pear({
  size = 64,
  color = '#B8C96B',
  stem = '#4C5A26',
  leaf = '#6B7A3A',
  highlight = true,
  animated = false,
  style,
}: PearProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={{ display: 'block', animation: animated ? 'pl-float-y 4s ease-in-out infinite' : undefined, ...style }}
    >
      <path d="M50 20 C 47 12, 43 7, 38 9" stroke={stem} strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="40" cy="10" rx="6" ry="3.2" fill={leaf} transform="rotate(-30 40 10)" />
      <path
        d="M50 22 C 30 22, 20 42, 23 64 C 26 82, 40 94, 55 92 C 76 90, 82 72, 80 56 C 78 38, 68 22, 50 22 Z"
        fill={color}
      />
      {highlight && (
        <ellipse cx="38" cy="46" rx="7" ry="13" fill="#fff" opacity="0.22" transform="rotate(-20 38 46)" />
      )}
    </svg>
  );
}

// ── Hero pear (large, ripens with gradient + shadow) ──────────
interface HeroPearProps {
  size?: number;
}
export function HeroPear({ size = 420 }: HeroPearProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      style={{ animation: 'pl-ripen 12s ease-in-out infinite', display: 'block' }}
    >
      <defs>
        <radialGradient id="pd-pear-grad" cx="38%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#E1E99A" />
          <stop offset="45%" stopColor="#B8C96B" />
          <stop offset="85%" stopColor="#6B7A3A" />
          <stop offset="100%" stopColor="#3A4520" />
        </radialGradient>
        <radialGradient id="pd-pear-hl" cx="35%" cy="38%" r="30%">
          <stop offset="0%" stopColor="#FFFDE8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFDE8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pd-leaf-g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#8D9E4A" />
          <stop offset="100%" stopColor="#4C5A26" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="360" rx="130" ry="16" fill="#1F2418" opacity="0.2" />
      <path d="M200 90 C 192 60, 175 40, 158 44" stroke="#4C5A26" strokeWidth="7" strokeLinecap="round" fill="none" />
      <g transform="translate(156 40) rotate(-28)">
        <ellipse cx="0" cy="0" rx="28" ry="12" fill="url(#pd-leaf-g)" />
        <path d="M-26 0 L 26 0" stroke="#3A4520" strokeWidth="1.2" opacity="0.6" />
      </g>
      <path
        d="M200 96 C 140 96, 100 156, 108 230 C 116 306, 158 348, 200 348 C 242 348, 294 310, 298 232 C 302 160, 260 96, 200 96 Z"
        fill="url(#pd-pear-grad)"
      />
      <ellipse cx="155" cy="190" rx="40" ry="70" fill="url(#pd-pear-hl)" transform="rotate(-18 155 190)" />
      {[[170, 160], [180, 210], [220, 170], [240, 230], [200, 270], [160, 250]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#3A4520" opacity="0.35" />
      ))}
    </svg>
  );
}

// ── Mono uppercase pill — editorial chip ──────────────────────
interface PillProps {
  children: ReactNode;
  color?: string;
  ink?: string;
  style?: CSSProperties;
  bordered?: boolean;
  onClick?: () => void;
}
export function Pill({
  children,
  color = 'transparent',
  ink = '#1F2418',
  bordered = true,
  onClick,
  style,
}: PillProps) {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        background: color,
        color: ink,
        border: bordered ? `1px solid ${ink}` : 'none',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'var(--pl-font-mono)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        fontSize: 11,
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ── Iridescent pearl dot ──────────────────────────────────────
export function Pearl({ size = 10, style }: { size?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 999,
        background:
          'linear-gradient(135deg, #F4ECD8 0%, #E8C77A 30%, #D9A89E 55%, #B8C96B 80%, #F4ECD8 100%)',
        backgroundSize: '200% 200%',
        animation: 'pl-pearl-shimmer 6s ease-in-out infinite',
        boxShadow: 'inset 0 0 4px rgba(255,255,255,0.4), 0 0 1px rgba(31,36,24,0.3)',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

// ── Organic leaf ──────────────────────────────────────────────
export function Leaf({
  size = 16,
  color = '#6B7A3A',
  rotate = 0,
}: {
  size?: number;
  color?: string;
  rotate?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      style={{ transform: `rotate(${rotate}deg)`, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <path d="M2 18 Q 2 2, 18 2 Q 18 18, 2 18 Z" fill={color} />
    </svg>
  );
}

// ── Wiggly hand-drawn underline ───────────────────────────────
interface SquiggleProps {
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  animated?: boolean;
  style?: CSSProperties;
}
export function Squiggle({
  width = 120,
  height = 14,
  color = '#B89244',
  strokeWidth = 2.5,
  animated = false,
  style,
}: SquiggleProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <path
        d={`M2 ${height / 2} Q ${width * 0.15} 2, ${width * 0.3} ${height / 2} T ${width * 0.6} ${height / 2} T ${width * 0.9} ${height / 2} T ${width - 2} ${height / 2}`}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        style={
          animated
            ? {
                strokeDasharray: width * 1.5,
                strokeDashoffset: width * 1.5,
                animation: 'pl-draw-in 1.6s cubic-bezier(.2,.8,.2,1) forwards',
              }
            : undefined
        }
      />
    </svg>
  );
}

// ── Crosshair ornament ────────────────────────────────────────
export function Ornament({ size = 24, color = '#6B7A3A' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="3" fill={color} />
      <path
        d="M12 2 L 12 22 M 2 12 L 22 12"
        stroke={color}
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

// ── Curvy button with pearl ──────────────────────────────────
interface PLButtonProps {
  children: ReactNode;
  variant?: 'ink' | 'olive' | 'paper' | 'butter' | 'terra' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: CSSProperties;
  disabled?: boolean;
}
const PL_PALETTES = {
  ink:    { bg: '#1F2418', fg: '#F4ECD8', hover: '#4C5A26' },
  olive:  { bg: '#6B7A3A', fg: '#F4ECD8', hover: '#4C5A26' },
  paper:  { bg: '#F4ECD8', fg: '#1F2418', hover: '#EADFC4' },
  butter: { bg: '#E8C77A', fg: '#1F2418', hover: '#D4B260' },
  terra:  { bg: '#B5613A', fg: '#F4ECD8', hover: '#8F4828' },
  ghost:  { bg: 'transparent', fg: '#1F2418', hover: 'rgba(31,36,24,0.06)' },
} as const;

const PL_SIZES = {
  sm: { pad: '8px 16px', fs: 13 },
  md: { pad: '12px 22px', fs: 15 },
  lg: { pad: '16px 30px', fs: 17 },
} as const;

export function PLButton({
  children,
  variant = 'ink',
  size = 'md',
  onClick,
  style,
  disabled,
}: PLButtonProps) {
  const p = PL_PALETTES[variant];
  const s = PL_SIZES[size];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: p.bg,
        color: p.fg,
        border: variant === 'ghost' ? '1px solid rgba(31,36,24,0.2)' : 'none',
        padding: s.pad,
        fontSize: s.fs,
        fontWeight: 500,
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), transform var(--pl-dur-fast) var(--pl-ease-out)',
        fontFamily: 'var(--pl-font-body)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        letterSpacing: '-0.005em',
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = p.hover;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = p.bg;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </button>
  );
}

// Design mono utility — uppercase eyebrow text
export const MONO_STYLE: CSSProperties = {
  fontFamily: 'var(--pl-font-mono)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  fontSize: 11,
  fontWeight: 500,
};

export const DISPLAY_STYLE: CSSProperties = {
  fontFamily: '"Fraunces", Georgia, serif',
  fontVariationSettings: '"SOFT" 80, "WONK" 0, "opsz" 144',
  fontWeight: 400,
  letterSpacing: '-0.02em',
};

// Design palette tokens — migrated 2026-04-27 to align with the v8
// brand palette (CLAUDE-DESIGN.md §2). The marketing/design dash
// pages and the v8 dash pages had drifted into two visually
// distinct families; remapping these hex values to their v8
// equivalents reskins the 9 marketing/design dashboard pages
// without touching their JSX, so the whole product reads as one
// system. Order of keys preserved so existing consumers compile.
export const PD = {
  // Surfaces — match v8 cream family
  paper:    '#F5EFE2',  // was #F4ECD8 — now var(--pl-cream)
  paper2:   '#EBE3D2',  // was #EADFC4 — now var(--pl-cream-deep)
  paper3:   '#EBE3D2',  // was #EFE4C3 — collapsed onto cream-deep
  paperCard:'#FBF7EE',  // was #F7F0DC — now var(--pl-cream-card)
  paperDeep:'#EBE3D2',  // was #F1E6C8 — collapsed onto cream-deep
  // Ink — match v8 ink family
  ink:      '#0E0D0B',  // was #1F2418 — now var(--pl-ink)
  inkSoft:  '#3A332C',  // was #4A4A3A — now var(--pl-ink-soft)
  // Brand voice — olive (primary), peach-ink (accent)
  olive:    '#5C6B3F',  // was #6B7A3A — now var(--pl-olive)
  oliveDeep:'#363F22',  // was #4C5A26 — matches v8 olive-deep
  // Pearloom mascot warm tones — kept (these are brand-unique)
  pear:     '#B8C96B',
  pearSkin: '#D5DE86',
  butter:   '#E8C77A',
  // Gold + Terra — align with v8 gold + peach-ink
  gold:     '#B8935A',  // was #B89244 — now var(--pl-gold)
  terra:    '#C6703D',  // was #B5613A — now matches editor peach-ink
  // Specialty — kept
  rose:     '#D9A89E',
  plum:     '#7A2D2D',  // was #704A5A — now var(--pl-plum)
  stone:    '#C8BFA5',
  // Lines + grain
  line:     '#D8CFB8',  // was #D4C9AC — now var(--pl-divider)
  sand:     '#E8DCB4',
  wash:     '#E8D9D3',
  blush:    '#E3DCC0',
  mint:     '#DCDFB8',
} as const;
