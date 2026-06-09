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
      className={animated ? 'pd-anim' : undefined}
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
      className="pd-anim"
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
  ink = 'var(--pd-ink, #1F2418)',
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
      className="pd-anim"
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
        className={animated ? 'pd-anim pd-anim-draw' : undefined}
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
// `pearl` variant composes the global `.pl-pearl-accent` utility
// (iridescent pearl surface, BRAND.md §6 / CLAUDE-DESIGN.md §6) —
// it deliberately sets no inline background/color/border so the
// class (which uses !important) composes cleanly.
interface PLButtonProps {
  children: ReactNode;
  variant?: 'ink' | 'olive' | 'paper' | 'butter' | 'terra' | 'ghost' | 'pearl';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
}
// `ink`, `paper`, and `ghost` carry their own --pd-btn-* variables
// (defined on `main.pd-landing` in LandingPageWrapper): in dark mode
// the ink button INVERTS to a cream fill on midnight, the paper
// button becomes a lifted dark card, and the ghost button's ink
// strokes flip to cream. `olive`/`butter`/`terra` fills read fine on
// both papers and stay constant. Fallbacks = light values, so dash
// consumers outside the landing scope are unchanged.
const PL_PALETTES = {
  ink:    {
    bg: 'var(--pd-btn-ink-bg, #1F2418)',
    fg: 'var(--pd-btn-ink-fg, #F4ECD8)',
    hover: 'var(--pd-btn-ink-hover, #4C5A26)',
  },
  olive:  { bg: '#6B7A3A', fg: '#F4ECD8', hover: '#4C5A26' },
  paper:  {
    bg: 'var(--pd-btn-paper-bg, #F4ECD8)',
    fg: 'var(--pd-btn-paper-fg, #1F2418)',
    hover: 'var(--pd-btn-paper-hover, #EADFC4)',
  },
  butter: { bg: '#E8C77A', fg: '#1F2418', hover: '#D4B260' },
  terra:  { bg: '#B5613A', fg: '#F4ECD8', hover: '#8F4828' },
  ghost:  {
    bg: 'transparent',
    fg: 'var(--pd-ink, #1F2418)',
    hover: 'color-mix(in oklab, var(--pd-ink, #1F2418) 6%, transparent)',
  },
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
  className,
  disabled,
}: PLButtonProps) {
  const isPearl = variant === 'pearl';
  const p = PL_PALETTES[isPearl ? 'ink' : variant];
  const s = PL_SIZES[size];
  const classes = [className, isPearl ? 'pl-pearl-accent' : undefined]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={classes || undefined}
      style={{
        // Pearl buttons take bg / color / border from the global
        // .pl-pearl-accent utility — no inline paint to fight it.
        ...(isPearl
          ? {}
          : {
              background: p.bg,
              color: p.fg,
              border:
                variant === 'ghost'
                  ? '1px solid color-mix(in oklab, var(--pd-ink, #1F2418) 20%, transparent)'
                  : 'none',
            }),
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
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (!isPearl) e.currentTarget.style.background = p.hover;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        if (!isPearl) e.currentTarget.style.background = p.bg;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </button>
  );
}

// Eyebrow text — aligned with the v8 .eyebrow utility class
// (sans-serif Inter, 700 weight, 0.14em tracking) so both
// DesignAtoms-using pages and v8 pages share the same eyebrow
// voice. Was: mono Geist + 0.04em + 500. Updated 2026-04-28 to
// finish the visual unification.
export const MONO_STYLE: CSSProperties = {
  fontFamily: 'var(--font-ui), Inter, system-ui, sans-serif',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontSize: 11,
  fontWeight: 700,
};

// Display headline — aligned with the v8 .display utility class:
// 600 weight, line-height 1.02, opsz auto. Was 400 weight which
// looked thin next to v8 page headers.
export const DISPLAY_STYLE: CSSProperties = {
  fontFamily: '"Fraunces", Georgia, serif',
  fontOpticalSizing: 'auto',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  lineHeight: 1.02,
};

// Design palette tokens — migrated 2026-04-27 to align with the v8
// brand palette (CLAUDE-DESIGN.md §2). The marketing/design dash
// pages and the v8 dash pages had drifted into two visually
// distinct families; remapping these hex values to their v8
// equivalents reskins the 9 marketing/design dashboard pages
// without touching their JSX, so the whole product reads as one
// system. Order of keys preserved so existing consumers compile.
//
// 2026-06-09 — editorial-midnight dark mode. Every themed entry is
// now a `var(--pd-*, <light hex>)` string. The variables are
// defined ONLY on the landing root (`main.pd-landing` in
// LandingPageWrapper), where a `prefers-color-scheme: dark` block
// swaps them to the BRAND.md §10 "editorial midnight" values
// (warm #0D0B07-family paper, cream #F1EBDC ink, brightened olive,
// warmed gold). Everywhere else (dash mock pages, marketing/v2)
// the var() falls back to the unchanged light hex, so those
// surfaces are pixel-identical. The mascot tones (pear / pearSkin /
// butter) stay constant — the pear doesn't change color at night.
//
// CAREFUL: these values are var() strings now. Never concatenate
// an alpha suffix onto them (`${PD.olive}33` breaks). Use the
// `pdInkMix` / `pdShadowMix` helpers below, or
// `color-mix(in oklab, ${PD.x} N%, transparent)`.
export const PD = {
  // Surfaces — match v8 cream family
  paper:    'var(--pd-paper, #F5EFE2)',     // light: --pl-cream        · dark: #0D0B07
  paper2:   'var(--pd-paper2, #EBE3D2)',    // light: --pl-cream-deep   · dark: #15110A
  paper3:   'var(--pd-paper3, #EBE3D2)',    // collapsed onto cream-deep
  paperCard:'var(--pd-paperCard, #FBF7EE)', // light: --pl-cream-card   · dark: #1A1610
  paperDeep:'var(--pd-paperDeep, #EBE3D2)', // collapsed onto cream-deep
  // Ink — match v8 ink family
  ink:      'var(--pd-ink, #0E0D0B)',       // dark: cream #F1EBDC
  inkSoft:  'var(--pd-inkSoft, #3A332C)',   // dark: #D4CDBC
  // Brand voice — olive (primary), peach-ink (accent)
  olive:    'var(--pd-olive, #5C6B3F)',     // dark: brightened #A4B57A
  oliveDeep:'var(--pd-oliveDeep, #363F22)', // dark: #8A9A60
  // Pearloom mascot warm tones — constant in both modes
  pear:     '#B8C96B',
  pearSkin: '#D5DE86',
  butter:   '#E8C77A',
  // Gold + Terra — align with v8 gold + peach-ink
  gold:     'var(--pd-gold, #B8935A)',      // dark: warmed #D4B373
  terra:    'var(--pd-terra, #C6703D)',     // dark: #D67852 (warning-dark family)
  // Specialty
  rose:     'var(--pd-rose, #D9A89E)',      // dark: muted #C08A7E
  plum:     'var(--pd-plum, #7A2D2D)',      // dark: #C46A6A
  stone:    'var(--pd-stone, #C8BFA5)',     // dark: #6E6553
  // Lines + grain
  line:     'var(--pd-line, #D8CFB8)',      // dark: --pl-divider #2A241A
  sand:     'var(--pd-sand, #E8DCB4)',      // dark: #2B2412 (golden midnight)
  wash:     'var(--pd-wash, #E8D9D3)',      // dark: #2A1F1C (rosy midnight)
  blush:    'var(--pd-blush, #E3DCC0)',     // dark: #2A2418 (warm midnight)
  mint:     'var(--pd-mint, #DCDFB8)',      // dark: #232813 (green midnight)
  // Ink-slab surfaces (testimonials band, footer). In light mode
  // these equal ink/paper; in dark mode the slab LIFTS slightly
  // above the page paper (#1A1610) instead of inverting to cream,
  // so the already-dark sections stay distinguishable.
  slab:     'var(--pd-slab, #0E0D0B)',      // dark: lifted #1A1610
  slabInk:  'var(--pd-slabInk, #F5EFE2)',   // dark: cream #F1EBDC
} as const;

/** Translucent ink — replaces the old hardcoded `rgba(31,36,24,N)`
 *  hairlines/borders so they flip to cream-based lines in dark mode.
 *  `pct` is 0–100. */
export const pdInkMix = (pct: number) =>
  `color-mix(in oklab, var(--pd-ink, #0E0D0B) ${pct}%, transparent)`;

/** Shadow color — stays dark in BOTH modes (a cream-based shadow
 *  would read as a glow on midnight paper). Light: warm ink.
 *  Dark: black, matching the --pl-shadow-* dark family. */
export const pdShadowMix = (pct: number) =>
  `color-mix(in oklab, var(--pd-shadow, #1F2418) ${pct}%, transparent)`;
