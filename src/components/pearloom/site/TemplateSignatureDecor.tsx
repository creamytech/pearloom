'use client';

/* ========================================================================
   TemplateSignatureDecor — distinctive illustrated SVGs per template
   that give each one a real visual identity (the way Y2K's disco ball
   gives that template its personality, not just a typography stamp).

   Drop in the hero with: <TemplateSignatureDecor kind="monolith" />.
   Reads three CSS vars (peach-ink = accent, sage-deep = deep, ink =
   foreground) so the template's palette flows through automatically.

   Each kind is a research-backed illustration tied to a specific
   wedding aesthetic — NOT a clip-art symbol. They live as inline
   SVG so they animate and theme with the rest of the page.
   ======================================================================== */

import type { CSSProperties } from 'react';

export type SignatureDecorKind =
  | 'monolith'        // Marfa: aluminum Judd cube + setting sun on horizon
  | 'citrus'          // Lake Como: lemons + leaves
  | 'champagne-coupe' // Hotel Costes: coupe glass + a single drop
  | 'cliff-fog'       // Big Sur: layered cliff silhouettes through fog
  | 'candlestick'     // Hudson Valley: brass taper with dripping wax
  | 'lavender-bundle' // Provence: tied lavender stems
  | 'brushstroke'     // Tokyo Modern: single vermillion brushstroke
  | 'tea-bowl'        // Kyoto: low matcha bowl + bamboo whisk
  | 'cedar-cone'      // Cedar & Moss: pine cone + cedar sprig
  | 'chianti-bottle'  // Chianti: classic-shape bottle in straw basket
  | 'loire-key'       // Loire chateau: ornate iron key
  | 'saguaro'         // Joshua Tree: silhouetted saguaro arms
  | 'edison'          // Brooklyn: hanging edison bulb
  | 'none';

interface Props {
  kind?: SignatureDecorKind | string;
  /** Position preset — anchored corners around the hero. */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Pixel size of the longest edge. Default 200. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function TemplateSignatureDecor({ kind, position = 'top-right', size = 200, className = '', style }: Props) {
  if (!kind || kind === 'none') return null;

  const positionStyle: CSSProperties = (() => {
    switch (position) {
      case 'top-left':     return { top: 16, left: 24 };
      case 'top-right':    return { top: 16, right: 24 };
      case 'bottom-left':  return { bottom: 16, left: 24 };
      case 'bottom-right': return { bottom: 16, right: 24 };
    }
  })();

  const accent = 'var(--peach-ink, #C6703D)';
  const deep   = 'var(--sage-deep, #5C6B3F)';
  const ink    = 'var(--ink, #18181B)';
  const cream  = 'var(--cream, #F8F1E4)';

  return (
    <div
      aria-hidden="true"
      className={`pl8-sig-decor pl8-sig-${kind} ${className}`}
      style={{
        position: 'absolute',
        ...positionStyle,
        width: size,
        height: size,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {render(kind as SignatureDecorKind, { accent, deep, ink, cream })}
    </div>
  );
}

interface Palette {
  accent: string;
  deep: string;
  ink: string;
  cream: string;
}

function render(kind: SignatureDecorKind, p: Palette) {
  switch (kind) {
    /* ── Marfa Dusk: aluminum Judd cube on horizon line + setting sun ── */
    case 'monolith':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Setting sun — warm gradient circle */}
          <defs>
            <radialGradient id="sd-sun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={p.accent} stopOpacity="0.95" />
              <stop offset="60%" stopColor={p.accent} stopOpacity="0.55" />
              <stop offset="100%" stopColor={p.accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="142" cy="76" r="48" fill="url(#sd-sun)" />
          {/* Horizon — long thin line */}
          <line x1="0" y1="138" x2="200" y2="138" stroke={p.deep} strokeWidth="0.8" opacity="0.55" />
          {/* Aluminum monolith — Judd-style cube */}
          <g>
            {/* Front face */}
            <path d="M58 88 L98 88 L98 138 L58 138 Z" fill={p.ink} opacity="0.96" />
            {/* Top */}
            <path d="M58 88 L74 78 L114 78 L98 88 Z" fill={p.ink} opacity="0.78" />
            {/* Side */}
            <path d="M98 88 L114 78 L114 128 L98 138 Z" fill={p.ink} opacity="0.86" />
            {/* Highlight */}
            <line x1="64" y1="92" x2="64" y2="134" stroke={p.cream} strokeWidth="0.6" opacity="0.4" />
          </g>
          {/* Sand texture: 3 dot rows */}
          {[152, 162, 172].map((y, i) => (
            <g key={i} opacity={0.4 - i * 0.1}>
              {Array.from({ length: 12 }).map((_, j) => (
                <circle key={j} cx={20 + j * 16 + (i % 2) * 6} cy={y} r="0.6" fill={p.deep} />
              ))}
            </g>
          ))}
        </svg>
      );

    /* ── Lake Como: 3 lemons with leaves ── */
    case 'citrus':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Branch */}
          <path d="M30 168 Q 90 130, 170 60" fill="none" stroke={p.deep} strokeWidth="1.6" />
          {/* Leaves */}
          {[
            { cx: 60, cy: 142, r: 14, rot: -22 },
            { cx: 110, cy: 102, r: 16, rot: -32 },
            { cx: 156, cy: 70, r: 14, rot: -42 },
          ].map((l, i) => (
            <ellipse key={i} cx={l.cx} cy={l.cy} rx={l.r} ry={l.r * 0.45} fill={p.deep} opacity="0.78" transform={`rotate(${l.rot} ${l.cx} ${l.cy})`} />
          ))}
          {/* Lemons — sun-bleached yellow-cream */}
          <ellipse cx="46" cy="130" rx="13" ry="16" fill={p.accent} opacity="0.95" transform="rotate(-15 46 130)" />
          <ellipse cx="92" cy="92" rx="14" ry="17" fill={p.accent} opacity="0.92" transform="rotate(-30 92 92)" />
          <ellipse cx="142" cy="56" rx="12" ry="15" fill={p.accent} opacity="0.88" transform="rotate(-44 142 56)" />
          {/* Lemon nubs */}
          <ellipse cx="38" cy="116" rx="2" ry="3" fill={p.deep} transform="rotate(-15 38 116)" />
          <ellipse cx="86" cy="78" rx="2" ry="3" fill={p.deep} transform="rotate(-30 86 78)" />
          <ellipse cx="138" cy="42" rx="2" ry="3" fill={p.deep} transform="rotate(-44 138 42)" />
        </svg>
      );

    /* ── Hotel Costes: champagne coupe + a single drop ── */
    case 'champagne-coupe':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Coupe rim — wide flat oval */}
          <ellipse cx="100" cy="62" rx="58" ry="10" fill="none" stroke={p.accent} strokeWidth="1.6" />
          {/* Coupe body — shallow dome */}
          <path d="M42 62 Q 100 110, 158 62" fill={p.accent} opacity="0.18" stroke={p.accent} strokeWidth="1.4" />
          {/* Stem */}
          <line x1="100" y1="100" x2="100" y2="160" stroke={p.accent} strokeWidth="1.6" />
          {/* Foot */}
          <ellipse cx="100" cy="164" rx="22" ry="4" fill="none" stroke={p.accent} strokeWidth="1.6" />
          {/* A single bubble rising */}
          <circle cx="92" cy="84" r="2" fill={p.accent} opacity="0.85" />
          <circle cx="106" cy="78" r="1.4" fill={p.accent} opacity="0.7" />
          <circle cx="98" cy="72" r="1.2" fill={p.accent} opacity="0.55" />
        </svg>
      );

    /* ── Big Sur: layered cliff silhouettes ── */
    case 'cliff-fog':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Sky gradient suggestion */}
          <rect x="0" y="0" width="200" height="200" fill="none" />
          {/* Furthest cliff (lightest) */}
          <path d="M0 130 L40 100 L80 110 L120 90 L160 105 L200 80 L200 200 L0 200 Z" fill={p.deep} opacity="0.18" />
          {/* Middle cliff */}
          <path d="M0 150 L30 130 L70 140 L110 115 L150 130 L200 105 L200 200 L0 200 Z" fill={p.deep} opacity="0.32" />
          {/* Front cliff (darkest) */}
          <path d="M0 175 L20 160 L60 168 L100 145 L140 160 L180 138 L200 145 L200 200 L0 200 Z" fill={p.deep} opacity="0.55" />
          {/* Lone cypress on the front cliff */}
          <line x1="100" y1="142" x2="100" y2="120" stroke={p.ink} strokeWidth="1.2" />
          <ellipse cx="100" cy="118" rx="6" ry="8" fill={p.ink} opacity="0.88" />
        </svg>
      );

    /* ── Hudson Valley: brass candlestick with dripping wax ── */
    case 'candlestick':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Flame */}
          <path d="M100 18 Q 92 32, 100 48 Q 108 32, 100 18 Z" fill={p.accent} opacity="0.95" />
          <path d="M100 22 Q 96 32, 100 42 Q 104 32, 100 22 Z" fill={p.cream} opacity="0.7" />
          {/* Wick */}
          <line x1="100" y1="48" x2="100" y2="56" stroke={p.ink} strokeWidth="1" />
          {/* Candle */}
          <rect x="90" y="56" width="20" height="80" fill={p.cream} stroke={p.accent} strokeWidth="0.8" />
          {/* Wax drip */}
          <path d="M88 110 L86 130 L92 130 Z" fill={p.cream} stroke={p.accent} strokeWidth="0.8" />
          {/* Cup */}
          <path d="M84 136 L116 136 L114 148 L86 148 Z" fill={p.accent} opacity="0.9" />
          {/* Stem */}
          <rect x="96" y="148" width="8" height="22" fill={p.accent} opacity="0.95" />
          {/* Base */}
          <ellipse cx="100" cy="172" rx="22" ry="4" fill={p.accent} />
          <ellipse cx="100" cy="170" rx="22" ry="4" fill={p.accent} opacity="0.7" />
        </svg>
      );

    /* ── Provence: tied lavender bundle ── */
    case 'lavender-bundle':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Stems */}
          {[78, 90, 100, 110, 122].map((x, i) => (
            <line key={i} x1={x} y1="170" x2={x + (i - 2) * 8} y2="80" stroke={p.deep} strokeWidth="1.2" />
          ))}
          {/* Lavender flower spikes */}
          {[
            { cx: 62, cy: 60 },  { cx: 80, cy: 50 },  { cx: 100, cy: 44 },
            { cx: 120, cy: 50 }, { cx: 140, cy: 60 },
          ].map((s, i) => (
            <g key={i}>
              {Array.from({ length: 6 }).map((_, j) => (
                <ellipse
                  key={j}
                  cx={s.cx + (j % 2 === 0 ? -2 : 2)}
                  cy={s.cy + j * 4}
                  rx="3"
                  ry="2.5"
                  fill="var(--lavender, #C5BED9)"
                  opacity={0.85 - j * 0.05}
                />
              ))}
            </g>
          ))}
          {/* Twine tie */}
          <rect x="86" y="138" width="28" height="6" fill={p.accent} opacity="0.8" />
          <line x1="100" y1="144" x2="98" y2="158" stroke={p.accent} strokeWidth="1" />
          <line x1="102" y1="144" x2="106" y2="160" stroke={p.accent} strokeWidth="1" />
        </svg>
      );

    /* ── Tokyo Modern: single vermillion brushstroke ── */
    case 'brushstroke':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Single calligraphic vertical brushstroke — wet ink feel */}
          <defs>
            <linearGradient id="sd-brush" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%"  stopColor={p.accent} stopOpacity="0" />
              <stop offset="15%" stopColor={p.accent} stopOpacity="0.95" />
              <stop offset="80%" stopColor={p.accent} stopOpacity="0.95" />
              <stop offset="100%" stopColor={p.accent} stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M104 24 Q 96 50, 100 80 Q 104 110, 96 140 Q 88 168, 104 178 L116 174 Q 108 150, 112 118 Q 116 88, 110 58 Q 106 40, 116 28 Z"
            fill="url(#sd-brush)"
          />
          {/* Tiny ink-splatter dots near the bottom */}
          <circle cx="84" cy="170" r="1.5" fill={p.accent} opacity="0.6" />
          <circle cx="124" cy="180" r="1" fill={p.accent} opacity="0.5" />
          <circle cx="78" cy="186" r="0.8" fill={p.accent} opacity="0.4" />
        </svg>
      );

    /* ── Kyoto: low matcha tea bowl + bamboo whisk ── */
    case 'tea-bowl':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Whisk handle (bamboo) */}
          <line x1="40" y1="20" x2="80" y2="80" stroke={p.deep} strokeWidth="3" strokeLinecap="round" />
          {/* Whisk tines */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1={80 - 6 + i * 1}
              y1={80}
              x2={80 - 16 + i * 2}
              y2={108}
              stroke={p.deep}
              strokeWidth="0.7"
              opacity="0.8"
            />
          ))}
          {/* Tea bowl — wide low ceramic */}
          <ellipse cx="120" cy="124" rx="60" ry="8" fill={p.ink} opacity="0.85" />
          <path d="M60 124 Q 60 168, 120 172 Q 180 168, 180 124 Z" fill={p.ink} opacity="0.92" />
          {/* Matcha foam — pale jade swirl */}
          <ellipse cx="120" cy="124" rx="54" ry="6" fill="var(--sage-tint, #C5D2BD)" opacity="0.85" />
          <path d="M88 120 Q 110 116, 134 122 Q 148 124, 156 120" fill="none" stroke="var(--sage-tint, #C5D2BD)" strokeWidth="0.9" opacity="0.7" />
        </svg>
      );

    /* ── Cedar & Moss: pine cone + cedar sprig ── */
    case 'cedar-cone':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Cedar sprig stem */}
          <line x1="40" y1="30" x2="92" y2="92" stroke={p.deep} strokeWidth="1.4" />
          {/* Cedar fronds */}
          {Array.from({ length: 6 }).map((_, i) => {
            const t = i * 0.18 + 0.1;
            const sx = 40 + (92 - 40) * t;
            const sy = 30 + (92 - 30) * t;
            return (
              <g key={i}>
                <path d={`M${sx} ${sy} L${sx - 12 - i * 2} ${sy + 4 + i}`} stroke={p.deep} strokeWidth="1" />
                <path d={`M${sx} ${sy} L${sx + 12 + i * 2} ${sy - 4 - i}`} stroke={p.deep} strokeWidth="1" />
              </g>
            );
          })}
          {/* Pine cone — overlapping scales */}
          <g transform="translate(108, 88)">
            <ellipse cx="40" cy="50" rx="28" ry="42" fill={p.ink} opacity="0.9" />
            {Array.from({ length: 6 }).map((_, row) =>
              Array.from({ length: 4 }).map((_, col) => (
                <ellipse
                  key={`${row}-${col}`}
                  cx={20 + col * 12 + (row % 2 === 0 ? 0 : 6)}
                  cy={14 + row * 10}
                  rx="6.5"
                  ry="5.5"
                  fill={p.deep}
                  stroke={p.cream}
                  strokeWidth="0.5"
                  opacity="0.95"
                />
              )),
            )}
            <line x1="40" y1="0" x2="40" y2="-12" stroke={p.deep} strokeWidth="1.2" />
          </g>
        </svg>
      );

    /* ── Chianti: wine bottle in a straw basket ── */
    case 'chianti-bottle':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Bottle neck */}
          <rect x="92" y="14" width="16" height="40" fill={p.deep} opacity="0.94" />
          {/* Cork */}
          <rect x="94" y="8" width="12" height="8" fill={p.accent} />
          {/* Bottle shoulder */}
          <path d="M82 54 Q 82 62, 80 76 L 120 76 Q 118 62, 118 54 Z" fill={p.deep} opacity="0.94" />
          {/* Bottle body (wrapped in straw) */}
          <rect x="76" y="76" width="48" height="80" fill={p.deep} opacity="0.94" />
          {/* Straw weave pattern — diagonal lines */}
          <g opacity="0.6">
            {Array.from({ length: 18 }).map((_, i) => (
              <line key={`a-${i}`} x1={70 + i * 4} y1="76" x2={74 + i * 4} y2="156" stroke={p.accent} strokeWidth="0.6" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`b-${i}`} x1="76" y1={84 + i * 9} x2="124" y2={84 + i * 9} stroke={p.accent} strokeWidth="0.5" opacity="0.5" />
            ))}
          </g>
          {/* Base — straw flair */}
          <ellipse cx="100" cy="160" rx="32" ry="6" fill={p.accent} opacity="0.85" />
        </svg>
      );

    /* ── Loire: ornate iron key ── */
    case 'loire-key':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Bow (top loop) — ornate cloverleaf */}
          <g transform="translate(100, 50)">
            <circle cx="0" cy="0" r="22" fill="none" stroke={p.accent} strokeWidth="2" />
            <circle cx="0" cy="0" r="12" fill="none" stroke={p.accent} strokeWidth="1.4" />
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <ellipse
                key={i}
                cx={Math.cos((deg * Math.PI) / 180) * 24}
                cy={Math.sin((deg * Math.PI) / 180) * 24}
                rx="6"
                ry="4"
                fill={p.accent}
                opacity="0.85"
                transform={`rotate(${deg} ${Math.cos((deg * Math.PI) / 180) * 24} ${Math.sin((deg * Math.PI) / 180) * 24})`}
              />
            ))}
          </g>
          {/* Shaft */}
          <line x1="100" y1="78" x2="100" y2="160" stroke={p.accent} strokeWidth="3.4" />
          {/* Bit (teeth) */}
          <rect x="94" y="140" width="20" height="6" fill={p.accent} />
          <rect x="94" y="150" width="14" height="6" fill={p.accent} />
        </svg>
      );

    /* ── Joshua Tree: silhouetted saguaro arms ── */
    case 'saguaro':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Sun */}
          <circle cx="160" cy="50" r="22" fill={p.accent} opacity="0.85" />
          {/* Saguaro */}
          <g fill={p.deep} opacity="0.95">
            <rect x="86" y="60" width="20" height="120" rx="10" />
            {/* Left arm */}
            <rect x="64" y="86" width="14" height="28" rx="7" />
            <rect x="50" y="98" width="14" height="36" rx="7" />
            {/* Right arm */}
            <rect x="118" y="100" width="14" height="22" rx="7" />
            <rect x="132" y="76" width="14" height="44" rx="7" />
          </g>
          {/* Ribbed lines on saguaro for texture */}
          <g stroke={p.ink} strokeWidth="0.4" opacity="0.5">
            {[91, 96, 101].map((x) => (
              <line key={x} x1={x} y1="62" x2={x} y2="178" />
            ))}
          </g>
          {/* Ground */}
          <line x1="0" y1="184" x2="200" y2="184" stroke={p.deep} strokeWidth="0.6" opacity="0.5" />
        </svg>
      );

    /* ── Brooklyn: hanging Edison bulb ── */
    case 'edison':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Cord */}
          <line x1="100" y1="0" x2="100" y2="68" stroke={p.ink} strokeWidth="1.4" />
          {/* Brass cap */}
          <rect x="86" y="64" width="28" height="14" fill={p.accent} />
          <rect x="84" y="76" width="32" height="6" fill={p.accent} />
          <rect x="86" y="82" width="28" height="6" fill={p.accent} opacity="0.7" />
          <rect x="86" y="90" width="28" height="6" fill={p.accent} />
          {/* Bulb glass */}
          <defs>
            <radialGradient id="sd-edison" cx="50%" cy="55%" r="50%">
              <stop offset="0%"  stopColor={p.accent} stopOpacity="0.95" />
              <stop offset="60%" stopColor={p.accent} stopOpacity="0.45" />
              <stop offset="100%" stopColor={p.accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="100" cy="138" rx="34" ry="42" fill="url(#sd-edison)" />
          <ellipse cx="100" cy="138" rx="34" ry="42" fill="none" stroke={p.ink} strokeWidth="1" opacity="0.5" />
          {/* Filament (tungsten zigzag) */}
          <path d="M88 130 Q 92 138, 88 148 Q 92 156, 88 164" fill="none" stroke={p.accent} strokeWidth="1" />
          <path d="M112 130 Q 108 138, 112 148 Q 108 156, 112 164" fill="none" stroke={p.accent} strokeWidth="1" />
          <line x1="88" y1="130" x2="112" y2="130" stroke={p.accent} strokeWidth="0.8" />
          <line x1="88" y1="164" x2="112" y2="164" stroke={p.accent} strokeWidth="0.8" />
        </svg>
      );

    default:
      return null;
  }
}
