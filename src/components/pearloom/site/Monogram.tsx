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

export type MonogramFrame =
  | 'ring'
  | 'diamond'
  | 'laurel'
  | 'none'
  /* New custom frames. */
  | 'shield'    // heraldic shield outline — formal, ceremonial
  | 'oval'      // tall vertical oval — vintage, romantic
  | 'arch'      // top arch + hairline base — postcard / chapel
  | 'sprig'     // two olive sprigs flanking the letters
  | 'seal'      // wax-seal pillow with dotted inner border
  | 'banner'    // ribbon banner draped behind the initials
  /* 2026-06-09 collection. */
  | 'stitch'    // embroidery hoop — solid ring + running-stitch inner ring
  | 'pearls'    // string-of-pearls ring with a gold keystone pearl
  | 'fan'       // deco sunburst crown above + double baseline below
  | 'garland'   // floral arc draped over the initials
  | 'lozenge'   // elongated octagon plate with inner hairline
  | 'corners';  // four engraved corner flourishes

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
      {frame === 'shield' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 110"
          width={ringSize}
          height={ringSize * 1.1}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Heraldic shield — flat top with curved bottom flank.
              Two-stroke construction so the inner hairline reads as
              a formal seal. */}
          <path
            d="M 8 8 L 92 8 L 92 60 Q 92 88, 50 104 Q 8 88, 8 60 Z"
            fill="none"
            stroke={accent}
            strokeWidth="1.5"
          />
          <path
            d="M 14 14 L 86 14 L 86 60 Q 86 84, 50 98 Q 14 84, 14 60 Z"
            fill="none"
            stroke={accent}
            strokeWidth="0.6"
            opacity="0.6"
          />
        </svg>
      )}
      {frame === 'oval' && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: ringSize * 0.78,
            height: ringSize * 1.18,
            borderRadius: '50%',
            border: `1.5px solid ${accent}`,
            pointerEvents: 'none',
          }}
        />
      )}
      {frame === 'arch' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          width={ringSize}
          height={ringSize}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Arch — top semicircle + straight base. Reads as
              chapel doorway / postcard window. */}
          <path
            d="M 10 92 L 10 50 A 40 40 0 0 1 90 50 L 90 92"
            fill="none"
            stroke={accent}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line x1="6" y1="92" x2="94" y2="92" stroke={accent} strokeWidth="0.8" />
        </svg>
      )}
      {frame === 'sprig' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 200 80"
          width={ringSize * 1.2}
          height={ringSize * 0.5}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Two horizontal olive sprigs flanking the initials. */}
          <g stroke={accent} strokeWidth="1.4" strokeLinecap="round" fill="none">
            <path d="M 60 40 Q 30 28, 10 36" />
            <path d="M 60 40 Q 30 52, 10 44" />
            <path d="M 140 40 Q 170 28, 190 36" />
            <path d="M 140 40 Q 170 52, 190 44" />
          </g>
          <g fill={accent} opacity="0.85">
            {/* Left leaves. */}
            <ellipse cx="48" cy="32" rx="5" ry="2.4" transform="rotate(-20 48 32)" />
            <ellipse cx="34" cy="30" rx="5" ry="2.4" transform="rotate(-30 34 30)" />
            <ellipse cx="20" cy="34" rx="4" ry="2" transform="rotate(-38 20 34)" />
            <ellipse cx="48" cy="48" rx="5" ry="2.4" transform="rotate(20 48 48)" />
            <ellipse cx="34" cy="50" rx="5" ry="2.4" transform="rotate(30 34 50)" />
            <ellipse cx="20" cy="46" rx="4" ry="2" transform="rotate(38 20 46)" />
            {/* Right leaves — mirror. */}
            <ellipse cx="152" cy="32" rx="5" ry="2.4" transform="rotate(20 152 32)" />
            <ellipse cx="166" cy="30" rx="5" ry="2.4" transform="rotate(30 166 30)" />
            <ellipse cx="180" cy="34" rx="4" ry="2" transform="rotate(38 180 34)" />
            <ellipse cx="152" cy="48" rx="5" ry="2.4" transform="rotate(-20 152 48)" />
            <ellipse cx="166" cy="50" rx="5" ry="2.4" transform="rotate(-30 166 50)" />
            <ellipse cx="180" cy="46" rx="4" ry="2" transform="rotate(-38 180 46)" />
          </g>
        </svg>
      )}
      {frame === 'seal' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          width={ringSize}
          height={ringSize}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Wax-seal pillow — filled circle with dashed inner ring,
              radial spokes around the rim for the "stamped" feel. */}
          <circle cx="50" cy="50" r="46" fill={accent} opacity="0.14" />
          <circle cx="50" cy="50" r="46" fill="none" stroke={accent} strokeWidth="1.2" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={accent} strokeWidth="0.6" strokeDasharray="2 3" opacity="0.7" />
          {/* Twelve spokes around the rim. */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x1 = 50 + Math.cos(a) * 42;
            const y1 = 50 + Math.sin(a) * 42;
            const x2 = 50 + Math.cos(a) * 46;
            const y2 = 50 + Math.sin(a) * 46;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth="0.8" />;
          })}
        </svg>
      )}
      {frame === 'banner' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 200 100"
          width={ringSize * 1.25}
          height={ringSize * 0.62}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Ribbon banner — straight strip with notched ends + slight
              droop. Sits BEHIND the initials. */}
          <path
            d="M 20 50 L 8 60 L 20 70 L 180 70 L 192 60 L 180 50 Z"
            fill={accent}
            opacity="0.18"
          />
          <path
            d="M 20 50 L 8 60 L 20 70 L 180 70 L 192 60 L 180 50 Z"
            fill="none"
            stroke={accent}
            strokeWidth="1.2"
          />
          {/* Notches highlight — gives the ribbon depth. */}
          <path d="M 20 50 L 20 70 M 180 50 L 180 70" stroke={accent} strokeWidth="0.8" opacity="0.7" />
        </svg>
      )}

      {frame === 'stitch' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          width={ringSize * 1.06}
          height={ringSize * 1.06}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Embroidery hoop — the loom made literal. Outer solid ring,
              inner running-stitch ring, and the hoop screw at top. */}
          <circle cx="50" cy="52" r="44" fill="none" stroke={accent} strokeWidth="1.4" />
          <circle cx="50" cy="52" r="38" fill="none" stroke={accent} strokeWidth="1.1" strokeDasharray="5 4" strokeLinecap="round" opacity="0.85" />
          {/* Screw clasp. */}
          <rect x="44" y="2" width="12" height="7" rx="2.5" fill="none" stroke={accent} strokeWidth="1.2" />
          <line x1="50" y1="2" x2="50" y2="9" stroke={accent} strokeWidth="0.8" opacity="0.7" />
        </svg>
      )}
      {frame === 'pearls' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          width={ringSize * 1.04}
          height={ringSize * 1.04}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* String of pearls — 24 beads; the keystone pearl at top is
              larger and gold. Bead size breathes slightly so the ring
              reads strung-by-hand, not stamped. */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(a) * 44;
            const y = 50 + Math.sin(a) * 44;
            if (i === 0) {
              return <circle key={i} cx={x} cy={y} r={3.4} fill="var(--t-gold, var(--pl-gold, #B8935A))" />;
            }
            const r = 1.8 + (i % 3 === 0 ? 0.5 : 0);
            return <circle key={i} cx={x} cy={y} r={r} fill={accent} opacity={0.85} />;
          })}
        </svg>
      )}
      {frame === 'fan' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 120 110"
          width={ringSize * 1.12}
          height={ringSize * 1.03}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Deco sunburst crown — nine rays fanned over the initials,
              tipped with dots on the odd rays; double rule beneath. */}
          <g stroke={accent} strokeWidth="1.3" strokeLinecap="round">
            {Array.from({ length: 9 }).map((_, i) => {
              const a = Math.PI + (i / 8) * Math.PI; // 180° fan across the top
              const long = i % 2 === 0;
              const r1 = 26;
              const r2 = long ? 44 : 36;
              return (
                <line
                  key={i}
                  x1={60 + Math.cos(a) * r1}
                  y1={52 + Math.sin(a) * r1 * 0.92}
                  x2={60 + Math.cos(a) * r2}
                  y2={52 + Math.sin(a) * r2 * 0.92}
                  opacity={long ? 1 : 0.6}
                />
              );
            })}
          </g>
          {Array.from({ length: 5 }).map((_, i) => {
            const a = Math.PI + ((i * 2) / 8) * Math.PI;
            return (
              <circle
                key={i}
                cx={60 + Math.cos(a) * 48}
                cy={52 + Math.sin(a) * 48 * 0.92}
                r="1.5"
                fill="var(--t-gold, var(--pl-gold, #B8935A))"
              />
            );
          })}
          {/* Double baseline. */}
          <line x1="22" y1="88" x2="98" y2="88" stroke={accent} strokeWidth="1.3" />
          <line x1="30" y1="93" x2="90" y2="93" stroke={accent} strokeWidth="0.7" opacity="0.65" />
        </svg>
      )}
      {frame === 'garland' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 140 120"
          width={ringSize * 1.18}
          height={ringSize * 1.01}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Floral garland — a stem arcing over the top, dressed with
              leaves and three open blooms, tails draping the sides. */}
          <path d="M14 64 C 18 28, 52 10, 70 10 C 88 10, 122 28, 126 64" fill="none" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
          {/* Leaves along the arc. */}
          <g fill={accent} opacity="0.8">
            <ellipse cx="30" cy="36" rx="5" ry="2.2" transform="rotate(-52 30 36)" />
            <ellipse cx="44" cy="22" rx="5" ry="2.2" transform="rotate(-32 44 22)" />
            <ellipse cx="96" cy="22" rx="5" ry="2.2" transform="rotate(32 96 22)" />
            <ellipse cx="110" cy="36" rx="5" ry="2.2" transform="rotate(52 110 36)" />
            <ellipse cx="20" cy="52" rx="4.4" ry="2" transform="rotate(-70 20 52)" />
            <ellipse cx="120" cy="52" rx="4.4" ry="2" transform="rotate(70 120 52)" />
          </g>
          {/* Three blooms — five-dot posies with gold hearts. */}
          {[
            [70, 9, 1],
            [36, 24, 0.85],
            [104, 24, 0.85],
          ].map(([cx, cy, s], i) => (
            <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 4.6} cy={Math.sin((a * Math.PI) / 180) * 4.6} r="2.5" fill={accent} opacity="0.55" />
              ))}
              <circle r="2" fill="var(--t-gold, var(--pl-gold, #B8935A))" />
            </g>
          ))}
        </svg>
      )}
      {frame === 'lozenge' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 160 90"
          width={ringSize * 1.32}
          height={ringSize * 0.74}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Elongated octagon plate — luggage-label formal, with an
              inner hairline and gold pips at the east/west vertices. */}
          <path d="M 34 8 L 126 8 L 154 45 L 126 82 L 34 82 L 6 45 Z" fill="none" stroke={accent} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M 38 14 L 122 14 L 146 45 L 122 76 L 38 76 L 14 45 Z" fill="none" stroke={accent} strokeWidth="0.7" opacity="0.6" strokeLinejoin="round" />
          <circle cx="10" cy="45" r="1.8" fill="var(--t-gold, var(--pl-gold, #B8935A))" />
          <circle cx="150" cy="45" r="1.8" fill="var(--t-gold, var(--pl-gold, #B8935A))" />
        </svg>
      )}
      {frame === 'corners' && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          width={ringSize * 1.14}
          height={ringSize * 1.14}
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          {/* Certificate corners — engraved L-brackets with a curl
              finishing each arm. One drawn, then mirrored. */}
          {[
            'translate(0 0)',
            'translate(100 0) scale(-1 1)',
            'translate(0 100) scale(1 -1)',
            'translate(100 100) scale(-1 -1)',
          ].map((t, i) => (
            <g key={i} transform={t} stroke={accent} fill="none" strokeWidth="1.3" strokeLinecap="round">
              <path d="M 6 26 L 6 10 Q 6 6, 10 6 L 26 6" />
              <path d="M 26 6 C 31 6, 31 11, 27 11" strokeWidth="1" />
              <path d="M 6 26 C 6 31, 11 31, 11 27" strokeWidth="1" />
              <circle cx="12" cy="12" r="1.3" fill={accent} stroke="none" opacity="0.8" />
            </g>
          ))}
        </svg>
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
