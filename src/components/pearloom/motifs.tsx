'use client';

/* ========================================================================
   PEARLOOM MOTIFS — shared visual language (v9, editorial pass)

   2026-04-24 — refactored to remove the clip-art-y squiggles, generic
   blobs, and the heart that used to land everywhere. The legacy
   exports (Heart / Squiggle / Blob) are preserved as named functions
   so existing callsites keep compiling, but their internals are
   replaced with editorial primitives:

       Heart      → Sprig (olive sprig, hairline + small leaves)
       Squiggle   → Filigree (bezier book-ornament flourish)
       Blob       → Wash (paper-grain radial wash)
       Stamp icon="heart"  → renders the new Sprig glyph

   New exports (use these in new code):
       Sprig, Filigree, Asterism, Fleuron, HairlineRule, Wash, Bookmark
   ======================================================================== */

import React, { useId, type CSSProperties, type ReactNode } from 'react';

type PearTone = 'sage' | 'lavender' | 'peach' | 'cream' | 'ink';

export function Pear({
  size = 56,
  tone = 'sage',
  shadow = true,
  sparkle = false,
  className = '',
  style,
}: {
  size?: number;
  tone?: PearTone;
  shadow?: boolean;
  sparkle?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const tones: Record<PearTone, { body: string; shade: string; leaf: string; stem: string }> = {
    sage: { body: '#8B9C5A', shade: '#6d7d3f', leaf: '#6d7d3f', stem: '#4a3b1f' },
    lavender: { body: '#C4B5D9', shade: '#a08bc2', leaf: '#6d7d3f', stem: '#4a3b1f' },
    peach: { body: '#EAB286', shade: '#d49960', leaf: '#6d7d3f', stem: '#4a3b1f' },
    cream: { body: '#F3E9D4', shade: '#e0d3b3', leaf: '#6d7d3f', stem: '#4a3b1f' },
    ink: { body: '#3D4A1F', shade: '#2a3512', leaf: '#8B9C5A', stem: '#D4A95D' },
  };
  const t = tones[tone] ?? tones.sage;
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} className={className} style={style} aria-hidden>
      {shadow && <ellipse cx="50" cy="114" rx="26" ry="3" fill="rgba(61,74,31,0.15)" />}
      <path
        d="M50 22 C 38 22, 30 30, 30 44 C 30 56, 20 64, 20 82 C 20 100, 34 112, 50 112 C 66 112, 80 100, 80 82 C 80 64, 70 56, 70 44 C 70 30, 62 22, 50 22 Z"
        fill={t.body}
      />
      <path
        d="M64 44 C 72 54, 78 68, 74 88 C 70 102, 60 110, 50 112 C 62 110, 72 100, 76 86 C 80 70, 74 56, 68 48 C 66 46, 65 45, 64 44 Z"
        fill={t.shade}
        opacity="0.8"
      />
      <path d="M50 22 L 50 10 Q 50 6, 54 4" stroke={t.stem} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M54 4 C 64 2, 74 8, 74 18 C 66 20, 56 16, 54 4 Z" fill={t.leaf} />
      <ellipse cx="40" cy="58" rx="6" ry="14" fill="rgba(255,255,255,0.25)" transform="rotate(-20 40 58)" />
      {sparkle && (
        <path d="M 20 30 L 22 34 L 26 36 L 22 38 L 20 42 L 18 38 L 14 36 L 18 34 Z" fill="#D4A95D" />
      )}
    </svg>
  );
}

type Mood = 'happy' | 'wink' | 'love' | 'sleep' | 'wave';

export function PearMascot({
  size = 120,
  mood = 'happy',
  className = '',
  style,
}: {
  size?: number;
  mood?: Mood;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={size * (140 / 120)}
      className={className}
      style={style}
      aria-hidden
    >
      <ellipse cx="60" cy="134" rx="30" ry="3.5" fill="rgba(61,74,31,0.12)" />
      <path d="M60 22 C 60 14, 58 8, 54 4" stroke="#4a3b1f" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M54 4 C 44 2, 36 10, 38 22 C 48 22, 56 16, 54 4 Z" fill="#6d7d3f" />
      <path d="M62 10 C 72 12, 80 22, 74 30 C 66 28, 60 20, 62 10 Z" fill="#8B9C5A" />
      <path
        d="M60 24 C 48 24, 40 32, 40 46 C 40 58, 28 66, 28 86 C 28 108, 44 124, 60 124 C 76 124, 92 108, 92 86 C 92 66, 80 58, 80 46 C 80 32, 72 24, 60 24 Z"
        fill="#A8BA72"
      />
      <path
        d="M72 46 C 82 58, 88 74, 84 94 C 80 112, 68 122, 60 124 C 74 122, 86 108, 88 90 C 90 72, 84 58, 78 50 Z"
        fill="#8B9C5A"
      />
      <ellipse cx="46" cy="60" rx="7" ry="16" fill="rgba(255,255,255,0.28)" transform="rotate(-15 46 60)" />
      <ellipse cx="46" cy="86" rx="6" ry="4" fill="#F4B0A0" opacity="0.75" />
      <ellipse cx="74" cy="86" rx="6" ry="4" fill="#F4B0A0" opacity="0.75" />
      {mood === 'wink' ? (
        <>
          <circle cx="50" cy="76" r="2.4" fill="#3D4A1F" />
          <path d="M70 76 Q 74 74 78 76" stroke="#3D4A1F" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      ) : mood === 'sleep' ? (
        <>
          <path d="M46 76 Q 50 74 54 76" stroke="#3D4A1F" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M66 76 Q 70 74 74 76" stroke="#3D4A1F" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      ) : mood === 'love' ? (
        <>
          <path d="M50 78 l-3 -3 a2 2 0 113 -3 a2 2 0 113 3 z" fill="#E8A07A" />
          <path d="M70 78 l-3 -3 a2 2 0 113 -3 a2 2 0 113 3 z" fill="#E8A07A" />
        </>
      ) : (
        <>
          <circle cx="50" cy="76" r="2.4" fill="#3D4A1F" />
          <circle cx="70" cy="76" r="2.4" fill="#3D4A1F" />
          <circle cx="50.8" cy="75.2" r="0.8" fill="#fff" />
          <circle cx="70.8" cy="75.2" r="0.8" fill="#fff" />
        </>
      )}
      <path d="M54 90 Q 60 95 66 90" stroke="#3D4A1F" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function PearloomLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="logo">
      <Pear size={size + 8} tone="sage" shadow={false} />
      <span
        style={{
          fontSize: size * 0.9,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        Pearloom
        <svg width={size * 0.28} height={size * 0.28} viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2 L13 10 L22 12 L13 14 L12 22 L11 14 L2 12 L11 10 Z" fill="var(--gold)" />
        </svg>
      </span>
    </div>
  );
}

type StampTone = 'lavender' | 'peach' | 'sage' | 'cream';

export function Stamp({
  size = 100,
  tone = 'lavender',
  text = 'MADE FOR MEANINGFUL MOMENTS',
  icon = 'pear',
  rotation = -8,
  className = '',
  style,
}: {
  size?: number;
  tone?: StampTone;
  text?: string;
  icon?: 'pear' | 'heart' | 'sparkle';
  rotation?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  const tones: Record<StampTone, { bg: string; ink: string }> = {
    lavender: { bg: '#C4B5D9', ink: '#3D4A1F' },
    peach: { bg: '#F0C9A8', ink: '#3D4A1F' },
    sage: { bg: '#CBD29E', ink: '#3D4A1F' },
    cream: { bg: '#F3E9D4', ink: '#3D4A1F' },
  };
  const t = tones[tone];
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        transform: `rotate(${rotation}deg)`,
        ...style,
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <circle cx="50" cy="50" r="48" fill={t.bg} />
        <circle cx="50" cy="50" r="44" fill="none" stroke={t.ink} strokeWidth="0.5" strokeDasharray="1 3" />
        <defs>
          <path id={`${id}-arc`} d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
        </defs>
        <text fill={t.ink} fontSize="9" fontWeight={700} fontFamily="Inter, sans-serif" letterSpacing="1.2">
          <textPath href={`#${id}-arc`} startOffset="2%">
            {text} · {text} ·
          </textPath>
        </text>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        {icon === 'pear' && <Pear size={size * 0.32} tone="ink" shadow={false} />}
        {/* Legacy 'heart' icon now renders the Sprig glyph — every
            prior Stamp icon="heart" call automatically swaps. */}
        {icon === 'heart' && <Sprig size={size * 0.36} color="#3D4A1F" />}
        {icon === 'sparkle' && (
          <svg viewBox="0 0 24 24" width={size * 0.32} height={size * 0.32}>
            <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="#3D4A1F" />
          </svg>
        )}
      </div>
    </div>
  );
}

type WashTone = 'lavender' | 'lavender-deep' | 'peach' | 'peach-deep' | 'sage' | 'sage-deep' | 'cream';

/* ────────────────────────────────────────────────────────────────────
   Wash — replaces the hard-edged Blob with a soft radial paper wash.
   Renders as a circle filled by a centered radial gradient that
   fades to fully transparent. Reads as light bouncing through linen
   instead of a coloured shape pasted onto the page.
   ──────────────────────────────────────────────────────────────────── */
export function Wash({
  tone = 'lavender',
  seed = 0,
  size = 400,
  opacity = 1,
  className = '',
  style,
}: {
  tone?: WashTone;
  seed?: number;
  size?: number;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const palette: Record<WashTone, string> = {
    lavender: '#C4B5D9',
    'lavender-deep': '#A88BC8',
    peach: '#EAB286',
    'peach-deep': '#C6703D',
    sage: '#A8BA72',
    'sage-deep': '#5C6B3F',
    cream: '#E0D3B3',
  };
  const fill = palette[tone] ?? palette.lavender;
  const id = useId();
  // Subtle aspect variance per seed so multiple Washes don't render
  // as identical circles.
  const stretches: Array<[number, number]> = [
    [1, 1],
    [1.18, 0.9],
    [0.92, 1.12],
    [1.06, 1.02],
  ];
  const [sx, sy] = stretches[seed % stretches.length] ?? [1, 1];
  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      style={{ opacity, ...style }}
      aria-hidden
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={fill} stopOpacity="0.78" />
          <stop offset="55%" stopColor={fill} stopOpacity="0.32" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="200" rx={180 * sx} ry={180 * sy} fill={`url(#${id})`} />
    </svg>
  );
}

/** Legacy alias — every prior `<Blob>` callsite now renders a Wash. */
export const Blob = Wash;
export type BlobTone = WashTone;

/* ────────────────────────────────────────────────────────────────────
   Filigree — replaces Squiggle with a hairline book-ornament
   flourish. No zigzag clipart. Five variants share the same DNA:
   single-stroke bezier curls drawn at hairline weight, ~half opacity
   so they read as a quiet trace rather than decoration.
   Default stroke is the brand gold; the line caps are round so the
   path feels handmade, not mechanical.
   ──────────────────────────────────────────────────────────────────── */
export function Filigree({
  width = 220,
  height = 80,
  variant = 0,
  stroke = 'var(--gold-line, #D4A95D)',
  strokeWidth = 1.2,
  className = '',
  style,
}: {
  width?: number;
  height?: number;
  variant?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  // Each variant is a clean editorial flourish — gentle bezier sweep
  // (variant 0), classical S-curve (1), bracket with terminal dots
  // (2), arc with center fleuron (3), trailing tendril (4). All sit
  // inside the same 220×80 viewBox so they swap visually 1:1 with
  // the legacy Squiggle calls.
  const variants: Array<{ d: string; dots?: Array<[number, number]>; fleur?: [number, number] }> = [
    { d: 'M 6 40 C 50 16, 100 64, 150 40 C 180 26, 200 36, 214 40' },
    { d: 'M 8 50 C 30 24, 70 24, 110 40 S 200 56, 212 30' },
    { d: 'M 8 40 C 60 8, 110 72, 162 40', dots: [[8, 40], [212, 40]] },
    { d: 'M 14 44 C 60 14, 160 14, 206 44', fleur: [110, 32] },
    { d: 'M 8 56 C 40 16, 90 76, 130 40 C 158 14, 196 56, 212 28' },
  ];
  const v = variants[Math.abs(variant) % variants.length] ?? variants[0]!;
  return (
    <svg
      viewBox="0 0 220 80"
      width={width}
      height={height}
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0%" x2="100%" y1="50%" y2="50%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0" />
          <stop offset="20%" stopColor={stroke} stopOpacity="0.9" />
          <stop offset="80%" stopColor={stroke} stopOpacity="0.9" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={v.d}
        stroke={`url(#${id})`}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      {v.dots?.map((pt, i) => (
        <circle key={i} cx={pt[0]} cy={pt[1]} r={1.6} fill={stroke} />
      ))}
      {v.fleur && (
        <g transform={`translate(${v.fleur[0]} ${v.fleur[1]})`}>
          <circle cx="0" cy="0" r="2" fill={stroke} />
          <path
            d="M -10 0 C -7 -4, -3 -4, 0 0 C 3 -4, 7 -4, 10 0"
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}

/** Legacy alias — every prior `<Squiggle>` now renders a Filigree.
 *  Maps `stroke` directly so existing color overrides keep working. */
export function Squiggle({
  width = 200,
  height = 80,
  variant = 0,
  stroke = 'var(--gold-line, #D4A95D)',
  className = '',
  style,
}: {
  width?: number;
  height?: number;
  variant?: number;
  stroke?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Filigree
      width={width}
      height={height}
      variant={variant}
      stroke={stroke}
      className={className}
      style={style}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────
   HairlineRule — a thin double-line section divider with an optional
   centred glyph (asterism / fleuron / dot). Designed to replace the
   Squiggle when used as a *divider* between sections — a place where
   the wavy line never read as editorial.
   ──────────────────────────────────────────────────────────────────── */
export function HairlineRule({
  width = 240,
  glyph = 'asterism',
  color = 'var(--ink-muted, #8a8671)',
  className = '',
  style,
}: {
  width?: number | string;
  glyph?: 'asterism' | 'fleuron' | 'dot' | 'none';
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        color,
        width,
        ...style,
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.45 }} />
      {glyph !== 'none' && (
        <span aria-hidden style={{ display: 'inline-flex', opacity: 0.85 }}>
          {glyph === 'asterism' && <Asterism size={18} color="currentColor" />}
          {glyph === 'fleuron' && <Fleuron size={20} color="currentColor" />}
          {glyph === 'dot' && (
            <svg viewBox="0 0 8 8" width={8} height={8} aria-hidden>
              <circle cx="4" cy="4" r="2" fill="currentColor" />
            </svg>
          )}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.45 }} />
    </div>
  );
}

export function Sparkle({
  size = 14,
  color = '#D4A95D',
  className = '',
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M12 2 L13 10 L22 12 L13 14 L12 22 L11 14 L2 12 L11 10 Z" fill={color} />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Sprig — single olive sprig. A curved stem with five small leaves.
   Replaces the Heart everywhere it lived. Far more editorial, on-brand
   for Pearloom (olive is the brand colour), and reads at any size.
   The hairline stem + filled leaves give it weight without shouting.
   ──────────────────────────────────────────────────────────────────── */
export function Sprig({
  size = 16,
  color = 'var(--sage-deep, #5C6B3F)',
  accent,
  className = '',
  style,
}: {
  size?: number;
  color?: string;
  /** Optional secondary colour for the stem. Defaults to `color`. */
  accent?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const stem = accent ?? color;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden
    >
      {/* Curved stem — single bezier from bottom-left to top-right. */}
      <path
        d="M 4 21 C 8 17, 11 13, 19 4"
        stroke={stem}
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
      />
      {/* Five small leaves alternating on either side of the stem,
          drawn as filled ellipses rotated to lie tangent to the curve. */}
      <ellipse cx="6.5" cy="18" rx="2.2" ry="1.05" fill={color} transform="rotate(-32 6.5 18)" />
      <ellipse cx="9" cy="15" rx="2.2" ry="1.05" fill={color} transform="rotate(-38 9 15)" />
      <ellipse cx="12" cy="11.8" rx="2.2" ry="1" fill={color} transform="rotate(-44 12 11.8)" />
      <ellipse cx="14.6" cy="9" rx="2.0" ry="0.95" fill={color} transform="rotate(-50 14.6 9)" />
      <ellipse cx="17" cy="6" rx="1.7" ry="0.85" fill={color} transform="rotate(-58 17 6)" />
    </svg>
  );
}

/** Legacy alias — every prior `<Heart>` now renders a Sprig.
 *  The orange peach default colour maps to the sage deep so the new
 *  glyph reads correctly on cream surfaces without further changes. */
export function Heart({
  size = 16,
  color,
  className = '',
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  // The legacy default was a peach colour for hearts. Treat any
  // explicit color as the user's intention; fall back to sage when
  // the caller didn't pass one.
  const resolved = color && color !== '#E8A07A' ? color : 'var(--sage-deep, #5C6B3F)';
  return <Sprig size={size} color={resolved} className={className} style={style} />;
}

/* ────────────────────────────────────────────────────────────────────
   Asterism — three diamonds in a typographic flourish (⁂). Classical
   book ornament, perfect for section labels where the legacy Heart
   used to sit. Renders as currentColor so it inherits text colour.
   ──────────────────────────────────────────────────────────────────── */
export function Asterism({
  size = 18,
  color = 'currentColor',
  className = '',
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 28 12"
      width={size * (28 / 12)}
      height={size}
      className={className}
      style={style}
      aria-hidden
    >
      <path d="M6 6 L8.4 3.6 L10.8 6 L8.4 8.4 Z" fill={color} />
      <path d="M16 2.4 L18.4 0 L20.8 2.4 L18.4 4.8 Z" fill={color} />
      <path d="M16 9.6 L18.4 7.2 L20.8 9.6 L18.4 12 Z" fill={color} />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Fleuron — a refined wing-and-dot ornament. Reads as a typographic
   ornament (think a Penguin Classics chapter break) without referencing
   a heart shape. Two opposing curls flanking a centred dot.
   ──────────────────────────────────────────────────────────────────── */
export function Fleuron({
  size = 22,
  color = 'currentColor',
  className = '',
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 32 18"
      width={size * (32 / 18)}
      height={size}
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d="M 2 12 C 4 4, 12 4, 14 9 C 12 11, 6 12, 2 12 Z"
        fill={color}
        opacity="0.92"
      />
      <path
        d="M 30 12 C 28 4, 20 4, 18 9 C 20 11, 26 12, 30 12 Z"
        fill={color}
        opacity="0.92"
      />
      <circle cx="16" cy="10" r="1.5" fill={color} />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Bookmark — simple ribbon glyph for "tip" / "saved" badges. Replaces
   the Heart that used to live in those badge slots.
   ──────────────────────────────────────────────────────────────────── */
export function Bookmark({
  size = 18,
  color = 'currentColor',
  className = '',
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size * (24 / 24)}
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d="M6 3h12v18l-6-4-6 4z"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PostIt({
  tone = 'lavender',
  children,
  width = 220,
  rotation = -4,
  tape = true,
  className = '',
  style,
}: {
  tone?: StampTone;
  children?: ReactNode;
  width?: number;
  rotation?: number;
  tape?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const bgs: Record<StampTone, string> = {
    lavender: '#C4B5D9',
    peach: '#F0C9A8',
    cream: '#F3E9D4',
    sage: '#CBD29E',
  };
  return (
    <div
      className={className}
      style={{
        width,
        background: bgs[tone] ?? bgs.lavender,
        padding: '18px 20px 24px',
        borderRadius: 4,
        boxShadow: '0 10px 24px rgba(61,74,31,0.12)',
        transform: `rotate(${rotation}deg)`,
        position: 'relative',
        fontFamily: 'var(--font-script)',
        fontSize: 22,
        color: 'var(--ink)',
        lineHeight: 1.15,
        ...style,
      }}
    >
      {tape && (
        <div
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%) rotate(-3deg)',
            width: 70,
            height: 22,
            background: 'rgba(234, 178, 134, 0.6)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
        />
      )}
      {children}
    </div>
  );
}

export function Polaroid({
  src,
  alt = '',
  width = 200,
  rotation = -3,
  caption,
  tape = false,
  className = '',
  style,
}: {
  src?: string;
  alt?: string;
  width?: number;
  rotation?: number;
  caption?: ReactNode;
  tape?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        width,
        background: '#fff',
        padding: '10px 10px 40px',
        boxShadow: '0 10px 28px rgba(61,74,31,0.15), 0 1px 2px rgba(0,0,0,0.06)',
        transform: `rotate(${rotation}deg)`,
        position: 'relative',
        ...style,
      }}
    >
      {tape && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%) rotate(-2deg)',
            width: 80,
            height: 24,
            background: 'rgba(234,178,134,0.55)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
        />
      )}
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          background: src
            ? `#e8e4d5 url(${src}) center/cover no-repeat`
            : 'linear-gradient(135deg, #E3E6C8, #F3E9D4)',
        }}
        role="img"
        aria-label={alt}
      />
      {caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-script)',
            fontSize: 18,
            color: 'var(--ink-soft)',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

type PhotoTone = 'lavender' | 'peach' | 'sage' | 'cream' | 'warm' | 'field' | 'dusk';

export function PhotoPlaceholder({
  tone = 'lavender',
  label,
  src,
  width = '100%',
  aspect = '1 / 1',
  style,
  className = '',
}: {
  tone?: PhotoTone;
  label?: ReactNode;
  src?: string;
  width?: string | number;
  aspect?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const bgs: Record<PhotoTone, string> = {
    lavender: 'linear-gradient(135deg, #D7CCE5, #B7A4D0)',
    peach: 'linear-gradient(135deg, #F7DDC2, #EAB286)',
    sage: 'linear-gradient(135deg, #E3E6C8, #8B9C5A)',
    cream: 'linear-gradient(135deg, #F3E9D4, #E0D3B3)',
    warm: 'linear-gradient(135deg, #F0C9A8, #C4B5D9)',
    field: 'linear-gradient(160deg, #CBD29E 0%, #8B9C5A 55%, #F0C9A8 100%)',
    dusk: 'linear-gradient(200deg, #C4B5D9 0%, #F0C9A8 70%, #CBD29E 100%)',
  };
  return (
    <div
      className={className}
      style={{
        width,
        aspectRatio: aspect,
        background: src ? `#e8e4d5 url(${src}) center/cover no-repeat` : bgs[tone] ?? bgs.lavender,
        display: 'grid',
        placeItems: 'center',
        color: 'rgba(61,74,31,0.5)',
        fontFamily: 'var(--font-script)',
        fontSize: 22,
        ...style,
      }}
    >
      {!src && label}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Atmosphere — composed background paper-washes + hairline filigree.
   v9: same prop API as before, so every existing call site is
   unchanged, but the items render as Wash + Filigree instead of
   Blob + Squiggle. Opacities pulled down ~30% so the new washes
   read as quiet light through paper, not shapes pasted on top.
   ──────────────────────────────────────────────────────────────────── */
export function Atmosphere({
  preset = 'warm',
  className = '',
  style,
}: {
  preset?: 'warm' | 'hero' | 'sparse';
  className?: string;
  style?: CSSProperties;
}) {
  const presets = {
    warm: [
      { el: 'wash' as const, tone: 'lavender' as WashTone, size: 540, opacity: 0.55, style: { top: -120, left: -160 } },
      { el: 'wash' as const, tone: 'peach' as WashTone, size: 460, opacity: 0.42, style: { top: 0, right: -160 } },
      { el: 'wash' as const, tone: 'sage' as WashTone, size: 400, opacity: 0.35, style: { bottom: -140, left: 0 } },
      { el: 'filigree' as const, variant: 0, width: 280, style: { top: 140, right: 220, transform: 'rotate(-10deg)' } },
      { el: 'filigree' as const, variant: 3, width: 200, style: { bottom: 140, left: 180, transform: 'rotate(8deg)' } },
    ],
    hero: [
      { el: 'wash' as const, tone: 'lavender' as WashTone, size: 580, opacity: 0.45, style: { top: -160, left: -140 } },
      { el: 'wash' as const, tone: 'peach' as WashTone, size: 480, opacity: 0.36, style: { top: 60, right: -160 } },
      { el: 'wash' as const, tone: 'sage' as WashTone, size: 420, opacity: 0.26, style: { bottom: -180, right: 80 } },
      { el: 'filigree' as const, variant: 1, width: 260, style: { top: 80, right: 320, transform: 'rotate(6deg)' } },
      { el: 'filigree' as const, variant: 3, width: 200, style: { top: 260, left: 60, transform: 'rotate(-8deg)' } },
    ],
    sparse: [
      { el: 'wash' as const, tone: 'lavender' as WashTone, size: 320, opacity: 0.30, style: { top: 60, left: -80 } },
      { el: 'wash' as const, tone: 'peach' as WashTone, size: 260, opacity: 0.22, style: { bottom: -60, right: 40 } },
      { el: 'filigree' as const, variant: 0, width: 220, style: { top: 100, right: 80, transform: 'rotate(4deg)' } },
    ],
  };
  const items = presets[preset] ?? presets.warm;
  return (
    <div className={`atmosphere ${className}`} style={style}>
      {items.map((it, i) =>
        it.el === 'wash' ? (
          <Wash key={i} tone={it.tone} size={it.size} opacity={it.opacity} seed={i} style={it.style as CSSProperties} />
        ) : (
          <Filigree
            key={i}
            variant={it.variant}
            width={it.width}
            height={it.width * 0.36}
            style={it.style as CSSProperties}
          />
        )
      )}
    </div>
  );
}

/* Icon set */
export function Icon({
  name,
  size = 16,
  color = 'currentColor',
  className = '',
  style,
  strokeWidth = 1.75,
}: {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
    'aria-hidden': true,
  };
  switch (name) {
    case 'arrow-right':   return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'arrow-left':    return <svg {...common}><path d="M19 12H5M11 5l-7 7 7 7"/></svg>;
    case 'arrow-up':      return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case 'arrow-down':    return <svg {...common}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    case 'arrow-ur':      return <svg {...common}><path d="M7 17L17 7M8 7h9v9"/></svg>;
    case 'undo':          return <svg {...common}><path d="M3 7v6h6"/><path d="M3.5 13a8 8 0 1 0 2.3-7.7L3 8"/></svg>;
    case 'redo':          return <svg {...common}><path d="M21 7v6h-6"/><path d="M20.5 13a8 8 0 1 1-2.3-7.7L21 8"/></svg>;
    case 'chev-right':    return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chev-left':     return <svg {...common}><path d="M15 6l-6 6 6 6"/></svg>;
    case 'chev-down':     return <svg {...common}><path d="M6 9l6 6 6-6"/></svg>;
    case 'chev-up':       return <svg {...common}><path d="M6 15l6-6 6 6"/></svg>;
    case 'plus':          return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus':         return <svg {...common}><path d="M5 12h14"/></svg>;
    case 'close':         return <svg {...common}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    case 'check':         return <svg {...common}><path d="M20 6L9 17l-5-5"/></svg>;
    case 'dot':           return <svg {...common}><circle cx="12" cy="12" r="3" fill={color}/></svg>;
    case 'more':          return <svg {...common}><circle cx="5" cy="12" r="1.2" fill={color}/><circle cx="12" cy="12" r="1.2" fill={color}/><circle cx="19" cy="12" r="1.2" fill={color}/></svg>;
    case 'drag':          return <svg {...common}><circle cx="9" cy="6" r="1.2" fill={color}/><circle cx="15" cy="6" r="1.2" fill={color}/><circle cx="9" cy="12" r="1.2" fill={color}/><circle cx="15" cy="12" r="1.2" fill={color}/><circle cx="9" cy="18" r="1.2" fill={color}/><circle cx="15" cy="18" r="1.2" fill={color}/></svg>;
    case 'search':        return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case 'filter':        return <svg {...common}><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>;
    case 'settings':      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>;
    case 'sliders':       return <svg {...common}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h14M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/></svg>;
    case 'eye':           return <svg {...common}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'eye-off':       return <svg {...common}><path d="M17.9 17.9A10.1 10.1 0 0112 19c-7 0-11-7-11-7a17.6 17.6 0 013.4-4.3M9.9 4.2A10 10 0 0112 4c7 0 11 7 11 7a17.8 17.8 0 01-2.3 3.3M1 1l22 22"/><path d="M9.9 9.9a3 3 0 104.2 4.2"/></svg>;
    case 'play':          return <svg {...common}><path d="M7 5l12 7-12 7z" fill={color}/></svg>;
    case 'pause':         return <svg {...common}><rect x="6" y="5" width="4" height="14" fill={color}/><rect x="14" y="5" width="4" height="14" fill={color}/></svg>;
    case 'home':          return <svg {...common}><path d="M3 12l9-9 9 9M5 10v10h14V10"/></svg>;
    case 'grid':          return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'list':          return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
    case 'layers':        return <svg {...common}><path d="M12 3l10 6-10 6-10-6zM2 15l10 6 10-6M2 11l10 6 10-6"/></svg>;
    case 'layout':        return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>;
    case 'page':          return <svg {...common}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/></svg>;
    case 'block':         return <svg {...common}><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/></svg>;
    case 'section':       return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>;
    case 'phone':         return <svg {...common}><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></svg>;
    case 'tablet':        return <svg {...common}><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/></svg>;
    case 'desktop':       return <svg {...common}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>;
    case 'image':         return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.7"/><path d="M21 15l-5-5L5 21"/></svg>;
    case 'camera':        return <svg {...common}><path d="M3 7h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/></svg>;
    case 'gallery':       return <svg {...common}><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h0M17 11l-4 4-3-3-4 4M21 7v14H7"/></svg>;
    case 'music':         return <svg {...common}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
    case 'mic':           return <svg {...common}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 19v3"/></svg>;
    case 'type':          return <svg {...common}><path d="M4 7V5h16v2M9 20h6M12 5v15"/></svg>;
    case 'text':          return <svg {...common}><path d="M4 6h16M6 12h12M8 18h8"/></svg>;
    case 'palette':       return <svg {...common}><path d="M12 2a10 10 0 100 20c1.3 0 2-.8 2-2a2 2 0 00-.6-1.4A2 2 0 0115 17h2a5 5 0 005-5 10 10 0 00-10-10z"/><circle cx="7.5" cy="10.5" r="1.2" fill={color}/><circle cx="12" cy="7.5" r="1.2" fill={color}/><circle cx="16.5" cy="10.5" r="1.2" fill={color}/></svg>;
    case 'brush':         return <svg {...common}><path d="M18.4 3.4a2 2 0 112.8 2.8L9 18.4 5 20l1.6-4z"/><path d="M15 6l3 3"/></svg>;
    case 'sparkles':      return <svg {...common}><path d="M12 3l1.8 4.8L18.6 9l-4.8 1.8L12 15.6 10.2 10.8 5.4 9l4.8-1.2zM19 14l.8 2 2 .8-2 .8L19 19.6 18.2 17.6l-2-.8 2-.8z" fill={color}/></svg>;
    case 'calendar':      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>;
    case 'calendar-check':return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M9 16l2 2 4-4"/></svg>;
    case 'clock':         return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'pin':           return <svg {...common}><path d="M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>;
    case 'map':           return <svg {...common}><path d="M3 6l6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 4v16M15 6v16"/></svg>;
    case 'compass':       return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M16 8l-2 6-6 2 2-6z" fill={color} fillOpacity="0.2"/></svg>;
    case 'globe':         return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>;
    case 'ticket':        return <svg {...common}><path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4z"/><path d="M10 6v12" strokeDasharray="1 2"/></svg>;
    case 'user':          return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>;
    case 'users':         return <svg {...common}><circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><circle cx="17" cy="6" r="2.5"/><path d="M22 19a5 5 0 00-5-5"/></svg>;
    case 'user-plus':     return <svg {...common}><circle cx="9" cy="8" r="4"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M19 8v6M16 11h6"/></svg>;
    case 'mail':          return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
    case 'send':          return <svg {...common}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>;
    case 'bell':          return <svg {...common}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></svg>;
    /* heart-icon used to render a heart silhouette; v9 swaps in the
       Sprig glyph so existing "Made with care"-style labels read as
       an olive sprig instead of a heart. */
    case 'heart-icon': {
      // Now renders the Pearloom pear silhouette — a proper brand
      // mark instead of the old sprig (which read as a slash at
      // small sizes). 'sprig' kept as an alias for the original
      // sprig pattern so any decorative use still works.
      return (
        <svg {...common}>
          {/* Pear body — tapered top, rounded bottom-heavy belly. */}
          <path d="M 12 4.5 C 9.8 4.5 8.5 6 8.5 8 C 8.5 9.4 7.6 10.4 6.6 11.6 C 5.4 13 4.5 14.5 4.5 16.5 C 4.5 19.5 7.5 22 12 22 C 16.5 22 19.5 19.5 19.5 16.5 C 19.5 14.5 18.6 13 17.4 11.6 C 16.4 10.4 15.5 9.4 15.5 8 C 15.5 6 14.2 4.5 12 4.5 Z" />
          {/* Stem + leaf — quick flick at the top so the silhouette
              reads clearly even at 12-14px. */}
          <path d="M 12 4.5 L 12 2.4" strokeWidth={1.5} />
          <path d="M 12 3 C 14 1.5 16.4 2.6 16.6 4.6 C 14.6 5 12.6 4.4 12 3 Z" fill={color} stroke="none" />
        </svg>
      );
    }
    case 'sprig':         return <svg {...common}><path d="M 4 21 C 8 17, 11 13, 19 4" strokeWidth={1.4}/><ellipse cx="6.5" cy="18" rx="2.2" ry="1.05" fill={color} stroke="none" transform="rotate(-32 6.5 18)"/><ellipse cx="9" cy="15" rx="2.2" ry="1.05" fill={color} stroke="none" transform="rotate(-38 9 15)"/><ellipse cx="12" cy="11.8" rx="2.2" ry="1" fill={color} stroke="none" transform="rotate(-44 12 11.8)"/><ellipse cx="14.6" cy="9" rx="2.0" ry="0.95" fill={color} stroke="none" transform="rotate(-50 14.6 9)"/><ellipse cx="17" cy="6" rx="1.7" ry="0.85" fill={color} stroke="none" transform="rotate(-58 17 6)"/></svg>;
    case 'pear': {
      // Explicit pear icon — same shape as heart-icon now. Use this
      // name when you specifically want a pear rather than 'heart'.
      return (
        <svg {...common}>
          <path d="M 12 4.5 C 9.8 4.5 8.5 6 8.5 8 C 8.5 9.4 7.6 10.4 6.6 11.6 C 5.4 13 4.5 14.5 4.5 16.5 C 4.5 19.5 7.5 22 12 22 C 16.5 22 19.5 19.5 19.5 16.5 C 19.5 14.5 18.6 13 17.4 11.6 C 16.4 10.4 15.5 9.4 15.5 8 C 15.5 6 14.2 4.5 12 4.5 Z" />
          <path d="M 12 4.5 L 12 2.4" strokeWidth={1.5} />
          <path d="M 12 3 C 14 1.5 16.4 2.6 16.6 4.6 C 14.6 5 12.6 4.4 12 3 Z" fill={color} stroke="none" />
        </svg>
      );
    }
    case 'asterism':      return <svg {...common}><path d="M6 12 L9 9 L12 12 L9 15 Z" fill={color} stroke="none"/><path d="M14 8 L17 5 L20 8 L17 11 Z" fill={color} stroke="none"/><path d="M14 16 L17 13 L20 16 L17 19 Z" fill={color} stroke="none"/></svg>;
    case 'fleuron':       return <svg {...common}><path d="M 3 14 C 5 6, 13 6, 15 11 C 13 13, 7 14, 3 14 Z" fill={color} stroke="none" opacity="0.92"/><path d="M 21 14 C 19 6, 13 6, 11 11 C 13 13, 17 14, 21 14 Z" fill={color} stroke="none" opacity="0.92"/><circle cx="12" cy="12" r="1.5" fill={color} stroke="none"/></svg>;
    case 'file':          return <svg {...common}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/></svg>;
    case 'folder':        return <svg {...common}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>;
    case 'download':      return <svg {...common}><path d="M12 3v14M5 12l7 7 7-7M3 21h18"/></svg>;
    case 'upload':        return <svg {...common}><path d="M12 21V7M5 12l7-7 7 7M3 3h18"/></svg>;
    case 'link':          return <svg {...common}><path d="M10 14a5 5 0 017 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>;
    case 'copy':          return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3"/></svg>;
    case 'share':         return <svg {...common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>;
    case 'star':          return <svg {...common}><path d="M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.1L12 17.3 6.5 20l1-6.1L3 9.5l6.3-.9z"/></svg>;
    case 'bookmark':      return <svg {...common}><path d="M6 3h12v18l-6-4-6 4z"/></svg>;
    case 'flag':          return <svg {...common}><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>;
    case 'gift':          return <svg {...common}><path d="M3 10h18v11H3zM12 10v11M3 10V7h18v3M7 7a2 2 0 114 0c0 2-4 0-4 0zM13 7a2 2 0 114 0c0 2-4 0-4 0z"/></svg>;
    case 'wand':          return <svg {...common}><path d="M5 19l10-10M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM18 12l.6 1.4 1.4.6-1.4.6L18 16l-.6-1.4L16 14l1.4-.6z"/></svg>;
    case 'leaf':          return <svg {...common}><path d="M6 18c8-8 12-8 15-12-2 9-5 14-13 14a3 3 0 01-3-3zM6 18l-3 3"/></svg>;
    case 'sun':           return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>;
    case 'moon':          return <svg {...common}><path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z"/></svg>;
    case 'lock':          return <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>;
    case 'mic-wave':      return <svg {...common}><rect x="10" y="3" width="4" height="10" rx="2"/><path d="M6 11a6 6 0 0012 0M12 17v4"/></svg>;
    default:              return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}
