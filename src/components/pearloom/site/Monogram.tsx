'use client';

/* =========================================================================
   Monogram — direct port of the prototype's MonogramTab crest generator
   (ClaudeDesign/pages/decor-library.jsx §MonogramTab, lines 250-293).

   Three frame styles + plain — each renders the couple's initials in the
   theme's display font at the centre. Frames bind to --t-accent so they
   recolor automatically when the site palette changes.

   Frame implementations (faithful to prototype):
   • 'ring'    → 150px (big) / 75px (small) circle, 1.5px solid accent
   • 'diamond' → 132px (big) / 66px (small) square rotated 45°, 1.5px solid accent
   • 'laurel'  → LaurelMotif SVG (two curved branches with leaf ellipses),
                 scaled 2.05× (big) / 1.3× (small)
   • 'none'    → plain initials, no frame

   Renderer mounts a watermark variant on the hero (top-right) when
   manifest.monogram is set; the editor panel renders a centred 190px
   live preview.
   ========================================================================= */

import type { CSSProperties } from 'react';

export type MonogramFrame = 'ring' | 'diamond' | 'laurel' | 'none';

interface MonogramProps {
  /** 1–3 characters. Typically two initials joined by '&' or space. */
  initials: string;
  /** Frame treatment. */
  frame: MonogramFrame;
  /** Container square in px. Prototype uses 190 (big) and 120 (small). */
  size?: number;
  /** Override the accent colour. Defaults to the live theme accent. */
  color?: string;
  /** Optional extra container styles (e.g. positioning when used as a watermark). */
  style?: CSSProperties;
  /** Optional className for the outer container. */
  className?: string;
  /** When true, draws the paper-card chrome (border + paper bg). False
   *  is the watermark variant — transparent, no border. */
  withCard?: boolean;
  /** Marks the element as decorative. */
  ariaHidden?: boolean;
}

/* ── LaurelMotif — two curved branches with leaf ellipses. Paths
   sourced from the prototype's themes.jsx §motifs (M40 74 …). The
   SVG is square (80×80) and centred on its mid-line so it scales
   cleanly under transform: scale(N). ── */
function LaurelMotif({ size = 80, color = 'var(--t-accent, currentColor)' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Left branch */}
      <path
        d="M40 74 C 18 66, 14 36, 26 12"
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* Right branch */}
      <path
        d="M40 74 C 62 66, 66 36, 54 12"
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* Left leaves — five ovals along the curve */}
      <ellipse cx="20" cy="58" rx="3.2" ry="1.6" fill={color} opacity={0.85} transform="rotate(-28 20 58)" />
      <ellipse cx="16" cy="46" rx="3.4" ry="1.7" fill={color} opacity={0.85} transform="rotate(-18 16 46)" />
      <ellipse cx="15" cy="34" rx="3.4" ry="1.7" fill={color} opacity={0.85} transform="rotate(-6 15 34)" />
      <ellipse cx="18" cy="22" rx="3.2" ry="1.6" fill={color} opacity={0.85} transform="rotate(8 18 22)" />
      <ellipse cx="24" cy="14" rx="2.8" ry="1.4" fill={color} opacity={0.85} transform="rotate(22 24 14)" />
      {/* Right leaves — mirror */}
      <ellipse cx="60" cy="58" rx="3.2" ry="1.6" fill={color} opacity={0.85} transform="rotate(28 60 58)" />
      <ellipse cx="64" cy="46" rx="3.4" ry="1.7" fill={color} opacity={0.85} transform="rotate(18 64 46)" />
      <ellipse cx="65" cy="34" rx="3.4" ry="1.7" fill={color} opacity={0.85} transform="rotate(6 65 34)" />
      <ellipse cx="62" cy="22" rx="3.2" ry="1.6" fill={color} opacity={0.85} transform="rotate(-8 62 22)" />
      <ellipse cx="56" cy="14" rx="2.8" ry="1.4" fill={color} opacity={0.85} transform="rotate(-22 56 14)" />
    </svg>
  );
}

/* ── Initial extraction. Mirrors the prototype's logic:
     const parts = (subject || 'A & B').replace('&', ' ').split(/\s+/).filter(Boolean);
     const initA = (parts[0] || 'A')[0].toUpperCase();
     const initB = (parts[1] || parts[2] || 'B')[0].toUpperCase();
   Then joined either with '&' (default, italic accent) or a space.
   This helper returns the three pieces so the JSX can style the
   joiner separately (the prototype italicises it and recolors it
   to --t-accent-ink). ── */
export function deriveInitials(subject?: string | null): { initA: string; initB: string; raw: string } {
  const s = (subject || '').trim();
  if (!s) return { initA: 'A', initB: 'B', raw: 'A & B' };
  // If caller passed a single 1-3 char string (already in initials form)
  // e.g. 'EJ' or 'E&J', honour it verbatim.
  if (s.length <= 3 && !/\s/.test(s)) {
    const stripped = s.replace(/[^A-Za-z]/g, '');
    if (stripped.length === 1) return { initA: stripped[0].toUpperCase(), initB: '', raw: s };
    if (stripped.length === 2) return { initA: stripped[0].toUpperCase(), initB: stripped[1].toUpperCase(), raw: s };
    if (stripped.length === 3) return { initA: stripped[0].toUpperCase(), initB: stripped[2].toUpperCase(), raw: s };
  }
  const parts = s.replace('&', ' ').split(/\s+/).filter(Boolean);
  const initA = (parts[0] || 'A')[0].toUpperCase();
  const initB = (parts[1] || parts[2] || 'B')[0].toUpperCase();
  return { initA, initB, raw: s };
}

export function Monogram({
  initials,
  frame,
  size = 190,
  color,
  style,
  className,
  withCard = true,
  ariaHidden = false,
}: MonogramProps) {
  /* Prototype scales every internal element off the big/small flag —
     `s = big ? 1 : 0.5`. We generalise that so the component scales
     smoothly with the size prop while keeping the prototype's 190px
     "big" and 120px "small" defaults intact:
       big   (190px) → s = 1
       small (120px) → s = 0.5
     Anywhere in between (and beyond) interpolates linearly. */
  const s = Math.max(0.25, (size - 60) / 130); // 190 → 1.0, 120 → 0.46 (≈ prototype's 0.5)
  const ringSize = 150 * s;
  const diamondSize = 132 * s;
  const laurelScale = size >= 160 ? 2.05 : 1.3;

  /* Initial parsing. Accept both 'A & B' (subject form) and 'AB' /
     'EJ' (already-initialled form). Joiner detection: presence of
     '&' in the source means use ampersand; otherwise use a space.
     The renderer's wrapper decides what to pass; the editor panel
     toggle directly controls this via the source string. */
  const { initA, initB, raw } = deriveInitials(initials);
  const useAmp = raw.includes('&');
  const hasTwo = Boolean(initB);

  /* Centred fontSize scales with the container. Prototype: 64px (big)
     / 40px (small). We mirror the 64/190 ratio (~0.337). */
  const fontSize = Math.round(size * 0.337);

  /* Frame colour binds to --t-accent so it follows the live theme.
     The override prop wins for the editor preview (where the user
     wants to see exact swatches). */
  const accent = color || 'var(--t-accent, var(--pl-olive, #5C6B3F))';
  const ink = 'var(--t-ink, var(--pl-ink, #0E0D0B))';
  const accentInk = color || 'var(--t-accent-ink, var(--pl-olive-deep, #363F22))';

  const cardStyle: CSSProperties = withCard
    ? {
        background: 'var(--t-paper, var(--paper, transparent))',
        borderRadius: 14,
        border: '1px solid var(--t-line, rgba(14,13,11,0.08))',
      }
    : {};

  return (
    <div
      className={className}
      aria-hidden={ariaHidden || undefined}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        ...cardStyle,
        ...style,
      }}
    >
      {/* Frame layer */}
      {frame === 'ring' && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: ringSize,
            height: ringSize,
            borderRadius: '50%',
            border: `1.5px solid ${accent}`,
            pointerEvents: 'none',
          }}
        />
      )}
      {frame === 'diamond' && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: diamondSize,
            height: diamondSize,
            transform: 'rotate(45deg)',
            border: `1.5px solid ${accent}`,
            pointerEvents: 'none',
          }}
        />
      )}
      {frame === 'laurel' && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            opacity: 0.9,
            transform: `scale(${laurelScale})`,
            pointerEvents: 'none',
          }}
        >
          <LaurelMotif size={80} color={accent} />
        </div>
      )}

      {/* Initials */}
      <div
        style={{
          position: 'relative',
          fontFamily: 'var(--t-display, var(--font-display, Fraunces, serif))',
          fontWeight: 'var(--t-display-wght, 500)' as unknown as number,
          color: ink,
          fontSize,
          lineHeight: 1,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {initA}
        {hasTwo && (
          <>
            <span
              style={{
                fontStyle: 'italic',
                color: accentInk,
                margin: '0 0.04em',
              }}
            >
              {useAmp ? '&' : ' '}
            </span>
            {initB}
          </>
        )}
      </div>
    </div>
  );
}

export { LaurelMotif };
