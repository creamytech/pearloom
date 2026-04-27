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
  // ── Birthday / party ───────────────────────────────────────
  | 'disco-ball'         // Y2K, Retro Disco: faceted ball + sparkles
  | 'wine-coupe'         // Aged to Perfection: tilted wine glass + grape
  | 'circuit-trace'      // Future Noir: angular neon circuit lines
  | 'martini-olive'      // Martini Hour: martini glass with olive
  | 'venetian-mask'      // Gothic Masquerade: ornate eye mask
  | 'confetti-burst'     // Maximalist Fun House, Maximalist Color: scattered confetti
  | 'art-deco-fan'       // Art Deco Glamour, Regency Romance: radiating fan
  | 'birthday-candle'    // Spotlight Sixteen, milestone bdays: lit candle + cake slice
  // ── Florals & nature ──────────────────────────────────────
  | 'rose-bloom'         // Vintage Romance, Dark Romance: open rose
  | 'peony-bloom'        // Romantic Blush: layered peony
  | 'magnolia'           // Southern Charm: single magnolia bloom
  | 'pampas-grass'       // Boho Wildflower: feathered pampas plumes
  | 'wildflower-cluster' // Wildflower Meadow, Nature Organic: 3 small blooms
  | 'pressed-daisy'      // Cottagecore, Whimsical Garden: simple daisy
  | 'wheat-stalk'        // Country Barn, Fall Harvest: bundled wheat
  | 'pine-bough'         // Mountain Lodge, Winter Wonderland: pine sprig + cone
  | 'palm-frond'         // Tropical Paradise: arching palm leaf
  | 'snowflake'          // Winter Wonderland: hexagonal flake
  | 'constellation'      // Celestial Night: dot-and-line stars
  | 'mushroom-pair'      // Whimsical Garden, Cottagecore: two toadstools
  | 'cactus-bloom'       // Western Ranch: prickly pear with flower
  // ── Architecture & objects ────────────────────────────────
  | 'copper-pipe'        // Industrial Chic: jointed copper pipe
  | 'marble-column'      // Black & White, Classic Elegance: ionic column
  | 'stained-glass'      // Gothic Cathedral, Fairytale Castle: arched window
  | 'anchor-rope'        // Nautical Prep: anchor with rope coil
  | 'bamboo-stem'        // Japandi Zen: bamboo segments with leaves
  | 'cameo-oval'         // Victorian Garden: silhouette cameo
  | 'quill-ink'          // Dark Academia, Old Money: quill + inkpot
  | 'laurel-wreath'      // Classic Elegance, Old Money: laurel half-wreath
  | 'castle-turret'      // Fairytale Castle: turret with banner
  // ── Event-OS specific ─────────────────────────────────────
  | 'suitcase'           // Last Weekend In, Warm Threshold: vintage suitcase
  | 'champagne-tower'    // Gentle Gathering, One More Round: stacked coupes
  | 'place-setting'      // The Night Before: plate + cutlery
  | 'time-capsule'       // Saying It Again: locked memory box
  | 'baby-rattle'        // Come Meet the Baby, Sip & See: vintage rattle
  | 'baby-bottle'        // Baby Shower templates: classic bottle
  | 'mortarboard'        // From One Chapter (graduation): cap + tassel
  | 'retirement-clock'   // Career Remembered: pocket watch
  | 'candle-vigil'       // Memorial / Celebration of Life: 3 lit votives
  | 'torah-scroll'       // Bar/Bat Mitzvah: open scroll with rolled ends
  | 'baptism-shell'      // Baptism, First Communion: scallop shell + droplet
  | 'tiara'              // Quinceañera (Fifteen And...): tiara silhouette
  | 'house-key-ring'     // Housewarming: ring with two house keys
  | 'balloon-cluster'    // Gender Reveal: 3 balloons on strings
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

    /* ── Y2K / Retro Disco: faceted disco ball with sparkles ── */
    case 'disco-ball':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Hanging cord */}
          <line x1="100" y1="0" x2="100" y2="46" stroke={p.ink} strokeWidth="1" />
          {/* Top cap */}
          <rect x="92" y="42" width="16" height="6" fill={p.accent} />
          {/* Ball */}
          <defs>
            <radialGradient id="sd-disco" cx="38%" cy="34%" r="68%">
              <stop offset="0%" stopColor={p.cream} stopOpacity="0.95" />
              <stop offset="55%" stopColor={p.accent} stopOpacity="0.85" />
              <stop offset="100%" stopColor={p.deep} stopOpacity="0.95" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="106" r="56" fill="url(#sd-disco)" />
          {/* Facet grid — vertical curves */}
          <g stroke={p.ink} strokeWidth="0.5" opacity="0.45" fill="none">
            <ellipse cx="100" cy="106" rx="56" ry="56" />
            <ellipse cx="100" cy="106" rx="40" ry="56" />
            <ellipse cx="100" cy="106" rx="20" ry="56" />
            <ellipse cx="100" cy="106" rx="56" ry="40" />
            <ellipse cx="100" cy="106" rx="56" ry="20" />
          </g>
          {/* Sparkles */}
          {[
            { x: 38, y: 60, s: 5 }, { x: 168, y: 78, s: 4 }, { x: 22, y: 130, s: 3 },
            { x: 178, y: 156, s: 4 }, { x: 60, y: 184, s: 3 }, { x: 156, y: 178, s: 3 },
          ].map((sp, i) => (
            <g key={i} fill={p.accent}>
              <path d={`M${sp.x} ${sp.y - sp.s} L${sp.x + 1} ${sp.y - 1} L${sp.x + sp.s} ${sp.y} L${sp.x + 1} ${sp.y + 1} L${sp.x} ${sp.y + sp.s} L${sp.x - 1} ${sp.y + 1} L${sp.x - sp.s} ${sp.y} L${sp.x - 1} ${sp.y - 1} Z`} />
            </g>
          ))}
        </svg>
      );

    /* ── Aged to Perfection: tilted wine glass + grape cluster ── */
    case 'wine-coupe':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Glass — tilted slightly right */}
          <g transform="rotate(8 100 100)">
            <path d="M70 36 Q 100 30, 130 36 L 124 92 Q 100 108, 76 92 Z" fill={p.accent} opacity="0.32" stroke={p.accent} strokeWidth="1.4" />
            <line x1="100" y1="108" x2="100" y2="158" stroke={p.accent} strokeWidth="1.6" />
            <ellipse cx="100" cy="162" rx="22" ry="4" fill="none" stroke={p.accent} strokeWidth="1.6" />
          </g>
          {/* Grape cluster bottom-right */}
          <g fill={p.deep} opacity="0.85">
            <circle cx="156" cy="142" r="6" />
            <circle cx="166" cy="148" r="6" />
            <circle cx="148" cy="150" r="6" />
            <circle cx="158" cy="156" r="6" />
            <circle cx="170" cy="160" r="5" />
            <circle cx="152" cy="164" r="5" />
            <circle cx="162" cy="170" r="5" />
          </g>
          {/* Vine leaf */}
          <path d="M152 138 Q 144 124, 134 130 Q 142 136, 152 138 Z" fill={p.deep} opacity="0.7" />
        </svg>
      );

    /* ── Future Noir: angular neon circuit ── */
    case 'circuit-trace':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <g stroke={p.accent} strokeWidth="1.4" fill="none" strokeLinecap="square">
            <path d="M20 40 L60 40 L60 80 L120 80 L120 40 L180 40" />
            <path d="M20 100 L80 100 L80 140 L140 140 L140 100 L180 100" />
            <path d="M40 160 L40 120 L100 120" />
          </g>
          {/* Nodes */}
          {[
            [60, 40], [60, 80], [120, 80], [120, 40],
            [80, 100], [80, 140], [140, 140], [140, 100],
            [40, 120], [100, 120],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill={p.accent} />
          ))}
          {/* Glow node */}
          <circle cx="100" cy="120" r="8" fill={p.accent} opacity="0.25" />
        </svg>
      );

    /* ── Martini Hour: martini glass with olive ── */
    case 'martini-olive':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* V-shape glass */}
          <path d="M48 50 L100 110 L152 50 Z" fill={p.accent} opacity="0.18" stroke={p.accent} strokeWidth="1.6" />
          {/* Stem */}
          <line x1="100" y1="110" x2="100" y2="160" stroke={p.accent} strokeWidth="1.6" />
          {/* Foot */}
          <line x1="76" y1="160" x2="124" y2="160" stroke={p.accent} strokeWidth="1.6" />
          {/* Toothpick */}
          <line x1="74" y1="40" x2="118" y2="84" stroke={p.ink} strokeWidth="0.8" />
          {/* Olive */}
          <ellipse cx="120" cy="86" rx="9" ry="7" fill={p.deep} />
          <circle cx="124" cy="84" r="1.5" fill={p.accent} />
          {/* Surface line in glass */}
          <line x1="68" y1="74" x2="132" y2="74" stroke={p.accent} strokeWidth="0.8" opacity="0.5" />
        </svg>
      );

    /* ── Gothic Masquerade: ornate venetian eye mask ── */
    case 'venetian-mask':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Mask body */}
          <path d="M30 100 Q 30 70, 60 64 Q 100 58, 140 64 Q 170 70, 170 100 Q 168 124, 140 132 Q 100 138, 60 132 Q 32 124, 30 100 Z"
                fill={p.deep} opacity="0.88" />
          {/* Eye holes */}
          <ellipse cx="68" cy="98" rx="14" ry="10" fill={p.cream} />
          <ellipse cx="132" cy="98" rx="14" ry="10" fill={p.cream} />
          {/* Filigree on top edge */}
          <g stroke={p.accent} strokeWidth="1" fill="none">
            <path d="M52 70 Q 60 56, 72 66" />
            <path d="M86 62 Q 100 50, 114 62" />
            <path d="M128 66 Q 140 56, 148 70" />
          </g>
          {/* Forehead jewel */}
          <circle cx="100" cy="76" r="3" fill={p.accent} />
          {/* Mask ribbon trailing left */}
          <path d="M30 100 Q 16 124, 22 152" fill="none" stroke={p.accent} strokeWidth="1.4" opacity="0.7" />
          <path d="M170 100 Q 184 124, 178 152" fill="none" stroke={p.accent} strokeWidth="1.4" opacity="0.7" />
        </svg>
      );

    /* ── Maximalist Fun House: scattered confetti ── */
    case 'confetti-burst':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {[
            { x: 30, y: 40, c: 'a', r: 0 }, { x: 60, y: 30, c: 'd', r: 30 },
            { x: 100, y: 50, c: 'i', r: -20 }, { x: 140, y: 30, c: 'a', r: 50 },
            { x: 170, y: 60, c: 'd', r: -10 }, { x: 50, y: 80, c: 'i', r: 60 },
            { x: 120, y: 90, c: 'a', r: 20 }, { x: 30, y: 120, c: 'd', r: -40 },
            { x: 75, y: 130, c: 'i', r: 0 }, { x: 110, y: 140, c: 'a', r: 70 },
            { x: 160, y: 130, c: 'd', r: 25 }, { x: 40, y: 170, c: 'i', r: -30 },
            { x: 100, y: 178, c: 'a', r: 45 }, { x: 165, y: 175, c: 'd', r: -55 },
          ].map((c, i) => {
            const fill = c.c === 'a' ? p.accent : c.c === 'd' ? p.deep : p.ink;
            return (
              <rect key={i} x={c.x - 4} y={c.y - 1.5} width="9" height="3" fill={fill}
                    opacity={0.85} transform={`rotate(${c.r} ${c.x} ${c.y})`} rx="0.6" />
            );
          })}
          {/* Curly streamers */}
          <path d="M16 100 Q 40 70, 26 50 Q 12 30, 30 16" fill="none" stroke={p.accent} strokeWidth="1.2" opacity="0.8" />
          <path d="M184 110 Q 168 132, 184 156 Q 200 180, 180 192" fill="none" stroke={p.deep} strokeWidth="1.2" opacity="0.8" />
        </svg>
      );

    /* ── Art Deco Glamour: radiating fan ── */
    case 'art-deco-fan':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <g transform="translate(100 168)">
            {/* Fan rays */}
            {Array.from({ length: 9 }).map((_, i) => {
              const angle = -90 + (i - 4) * 11;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * 110;
              const y = Math.sin(rad) * 110;
              return (
                <line key={i} x1="0" y1="0" x2={x} y2={y} stroke={p.accent} strokeWidth="1.2" opacity="0.85" />
              );
            })}
            {/* Outer arc */}
            <path d="M -110 0 A 110 110 0 0 1 110 0" fill="none" stroke={p.accent} strokeWidth="1.6" />
            {/* Inner arc */}
            <path d="M -70 0 A 70 70 0 0 1 70 0" fill="none" stroke={p.accent} strokeWidth="1" opacity="0.7" />
            {/* Tiny arc */}
            <path d="M -36 0 A 36 36 0 0 1 36 0" fill="none" stroke={p.accent} strokeWidth="0.8" opacity="0.55" />
            {/* Pivot dot */}
            <circle cx="0" cy="0" r="3.5" fill={p.deep} />
          </g>
        </svg>
      );

    /* ── Spotlight Sixteen / milestone bday: lit candle ── */
    case 'birthday-candle':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Flame */}
          <path d="M100 28 Q 88 50, 100 72 Q 112 50, 100 28 Z" fill={p.accent} opacity="0.95" />
          <path d="M100 36 Q 94 50, 100 64 Q 106 50, 100 36 Z" fill={p.cream} opacity="0.85" />
          {/* Wick */}
          <line x1="100" y1="72" x2="100" y2="84" stroke={p.ink} strokeWidth="1.2" />
          {/* Striped candle */}
          <rect x="86" y="84" width="28" height="64" fill={p.cream} stroke={p.accent} strokeWidth="0.8" />
          <line x1="86" y1="98" x2="114" y2="98" stroke={p.accent} strokeWidth="1.4" />
          <line x1="86" y1="118" x2="114" y2="118" stroke={p.accent} strokeWidth="1.4" />
          <line x1="86" y1="138" x2="114" y2="138" stroke={p.accent} strokeWidth="1.4" />
          {/* Cake top — frosting wave */}
          <path d="M40 156 Q 50 148, 60 156 Q 70 164, 80 156 Q 90 148, 100 156 Q 110 164, 120 156 Q 130 148, 140 156 Q 150 164, 160 156 L 160 188 L 40 188 Z"
                fill={p.deep} opacity="0.88" />
          {/* Cake plate */}
          <line x1="32" y1="190" x2="168" y2="190" stroke={p.ink} strokeWidth="1.2" />
        </svg>
      );

    /* ── Vintage Romance / Dark Romance: open rose bloom ── */
    case 'rose-bloom':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Stem */}
          <path d="M100 200 Q 98 160, 100 110" fill="none" stroke={p.deep} strokeWidth="1.6" />
          {/* Leaf */}
          <path d="M100 168 Q 78 158, 70 138 Q 88 148, 100 168 Z" fill={p.deep} opacity="0.78" />
          {/* Rose petals — concentric */}
          <g>
            <circle cx="100" cy="84" r="42" fill={p.accent} opacity="0.45" />
            <path d="M68 70 Q 60 90, 76 110 Q 100 116, 124 110 Q 140 90, 132 70 Q 116 58, 100 64 Q 84 58, 68 70 Z" fill={p.accent} opacity="0.85" />
            <path d="M82 80 Q 76 96, 88 110 Q 100 114, 112 110 Q 124 96, 118 80 Q 108 70, 100 76 Q 92 70, 82 80 Z" fill={p.accent} opacity="0.95" />
            <path d="M92 88 Q 88 100, 96 108 Q 104 108, 108 100 Q 110 90, 100 86 Q 94 84, 92 88 Z" fill={p.deep} opacity="0.85" />
            {/* Curl in centre */}
            <path d="M96 96 Q 100 92, 104 96" fill="none" stroke={p.cream} strokeWidth="0.8" opacity="0.85" />
          </g>
        </svg>
      );

    /* ── Romantic Blush: layered peony ── */
    case 'peony-bloom':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Stem and leaves */}
          <path d="M100 200 L 100 138" stroke={p.deep} strokeWidth="1.6" fill="none" />
          <path d="M100 174 Q 78 168, 64 178 Q 84 184, 100 178 Z" fill={p.deep} opacity="0.7" />
          <path d="M100 162 Q 124 156, 138 168 Q 116 174, 100 168 Z" fill={p.deep} opacity="0.7" />
          {/* Outer petals — layered ruffles */}
          <g>
            {Array.from({ length: 9 }).map((_, i) => {
              const angle = (i / 9) * 360;
              const rad = (angle * Math.PI) / 180;
              const x = 100 + Math.cos(rad) * 36;
              const y = 90 + Math.sin(rad) * 36;
              return (
                <ellipse key={i} cx={x} cy={y} rx="22" ry="14"
                         fill={p.accent} opacity="0.42"
                         transform={`rotate(${angle} ${x} ${y})`} />
              );
            })}
          </g>
          {/* Inner ruffles */}
          <g>
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = (i / 6) * 360;
              const rad = (angle * Math.PI) / 180;
              const x = 100 + Math.cos(rad) * 18;
              const y = 90 + Math.sin(rad) * 18;
              return (
                <circle key={i} cx={x} cy={y} r="14" fill={p.accent} opacity="0.65" />
              );
            })}
          </g>
          <circle cx="100" cy="90" r="14" fill={p.accent} opacity="0.95" />
          <circle cx="100" cy="90" r="6" fill={p.deep} opacity="0.85" />
        </svg>
      );

    /* ── Southern Charm: magnolia bloom ── */
    case 'magnolia':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Branch */}
          <path d="M170 188 Q 130 160, 110 130" fill="none" stroke={p.deep} strokeWidth="1.6" />
          {/* Leaves */}
          <ellipse cx="146" cy="168" rx="14" ry="6" fill={p.deep} opacity="0.78" transform="rotate(-32 146 168)" />
          <ellipse cx="160" cy="158" rx="12" ry="5" fill={p.deep} opacity="0.7" transform="rotate(-44 160 158)" />
          {/* Magnolia petals — large rounded triangles around centre */}
          <g>
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = -90 + (i / 6) * 360;
              const rad = (angle * Math.PI) / 180;
              const cx = 100 + Math.cos(rad) * 28;
              const cy = 96 + Math.sin(rad) * 28;
              return (
                <ellipse key={i} cx={cx} cy={cy} rx="22" ry="14"
                         fill={p.cream} stroke={p.accent} strokeWidth="0.8"
                         opacity="0.92"
                         transform={`rotate(${angle + 90} ${cx} ${cy})`} />
              );
            })}
          </g>
          {/* Centre cone */}
          <ellipse cx="100" cy="96" rx="11" ry="13" fill={p.accent} opacity="0.95" />
          {/* Stamen dots */}
          {[
            [96, 90], [104, 90], [100, 86], [96, 100], [104, 100], [100, 104],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1.2" fill={p.deep} />
          ))}
        </svg>
      );

    /* ── Boho Wildflower: pampas plumes ── */
    case 'pampas-grass':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Three plumes — fan out */}
          {[
            { x0: 60, x1: 30,  y1: 30 },
            { x0: 100, x1: 100, y1: 18 },
            { x0: 140, x1: 170, y1: 30 },
          ].map((s, i) => {
            const dx = (s.x1 - s.x0) / 14;
            const dy = (s.y1 - 188) / 14;
            return (
              <g key={i}>
                <line x1={s.x0} y1="188" x2={s.x1} y2={s.y1} stroke={p.deep} strokeWidth="1" />
                {Array.from({ length: 14 }).map((_, j) => {
                  const cx = s.x0 + dx * j;
                  const cy = 188 + dy * j;
                  const len = 16 + Math.abs(7 - j) * 1.5;
                  const side = j % 2 === 0 ? 1 : -1;
                  return (
                    <line key={j} x1={cx} y1={cy} x2={cx + side * len * 0.75} y2={cy - len * 0.4}
                          stroke={p.accent} strokeWidth="0.8" opacity="0.85" />
                  );
                })}
              </g>
            );
          })}
          {/* Tied ribbon at bottom */}
          <path d="M68 188 Q 100 196, 132 188 L 132 196 L 68 196 Z" fill={p.deep} opacity="0.85" />
        </svg>
      );

    /* ── Wildflower Meadow / Nature Organic: small bloom cluster ── */
    case 'wildflower-cluster':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Stems */}
          <g stroke={p.deep} strokeWidth="1.2" fill="none">
            <path d="M60 196 Q 56 150, 60 96" />
            <path d="M100 198 Q 100 138, 100 76" />
            <path d="M142 196 Q 148 156, 142 110" />
          </g>
          {/* Tiny leaves */}
          {[
            { cx: 56, cy: 156, r: -30 }, { cx: 102, cy: 168, r: -50 },
            { cx: 146, cy: 156, r: 30 },
          ].map((l, i) => (
            <ellipse key={i} cx={l.cx} cy={l.cy} rx="6" ry="2.5"
                     fill={p.deep} opacity="0.75"
                     transform={`rotate(${l.r} ${l.cx} ${l.cy})`} />
          ))}
          {/* Flower heads */}
          {[
            { cx: 60,  cy: 96,  c: 'accent' },
            { cx: 100, cy: 76,  c: 'deep'   },
            { cx: 142, cy: 110, c: 'accent' },
          ].map((f, i) => {
            const fill = f.c === 'accent' ? p.accent : p.deep;
            return (
              <g key={i}>
                {Array.from({ length: 6 }).map((_, j) => {
                  const angle = (j / 6) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const px = f.cx + Math.cos(rad) * 10;
                  const py = f.cy + Math.sin(rad) * 10;
                  return <circle key={j} cx={px} cy={py} r="5" fill={fill} opacity="0.85" />;
                })}
                <circle cx={f.cx} cy={f.cy} r="4" fill={p.cream} stroke={p.ink} strokeWidth="0.6" />
              </g>
            );
          })}
        </svg>
      );

    /* ── Cottagecore / Whimsical: pressed daisy ── */
    case 'pressed-daisy':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Stem */}
          <path d="M100 200 Q 100 148, 100 110" fill="none" stroke={p.deep} strokeWidth="1.6" />
          {/* Leaf */}
          <path d="M100 168 Q 80 162, 70 148 Q 90 154, 100 168 Z" fill={p.deep} opacity="0.78" />
          {/* Petals */}
          <g>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * 360;
              const rad = (angle * Math.PI) / 180;
              const cx = 100 + Math.cos(rad) * 26;
              const cy = 88 + Math.sin(rad) * 26;
              return (
                <ellipse key={i} cx={cx} cy={cy} rx="14" ry="6"
                         fill={p.cream} stroke={p.accent} strokeWidth="0.7"
                         transform={`rotate(${angle} ${cx} ${cy})`} />
              );
            })}
          </g>
          {/* Centre */}
          <circle cx="100" cy="88" r="9" fill={p.accent} />
          {/* Stamen dots */}
          {[
            [97, 84], [103, 84], [100, 89], [96, 91], [104, 91],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1" fill={p.deep} />
          ))}
        </svg>
      );

    /* ── Country Barn / Fall Harvest: bundled wheat ── */
    case 'wheat-stalk':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Three stalks crossing */}
          {[
            { x0: 70, x1: 86, ang: -10 },
            { x0: 100, x1: 100, ang: 0 },
            { x0: 130, x1: 114, ang: 10 },
          ].map((s, i) => (
            <g key={i}>
              <line x1={s.x0} y1="190" x2={s.x1} y2="38" stroke={p.deep} strokeWidth="1" />
              {/* Wheat grains as rotated ellipses up the stem */}
              {Array.from({ length: 8 }).map((_, j) => {
                const dy = 38 + j * 14;
                const dx = s.x0 + (s.x1 - s.x0) * (j / 7);
                return (
                  <g key={j}>
                    <ellipse cx={dx - 7} cy={dy} rx="4" ry="2.5" fill={p.accent}
                             transform={`rotate(${-25 + s.ang} ${dx - 7} ${dy})`} />
                    <ellipse cx={dx + 7} cy={dy} rx="4" ry="2.5" fill={p.accent}
                             transform={`rotate(${25 + s.ang} ${dx + 7} ${dy})`} />
                  </g>
                );
              })}
            </g>
          ))}
          {/* Tied ribbon */}
          <path d="M76 156 Q 100 162, 124 156 L 124 168 Q 100 174, 76 168 Z" fill={p.deep} opacity="0.88" />
        </svg>
      );

    /* ── Mountain Lodge / Winter Wonderland: pine sprig + cone ── */
    case 'pine-bough':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Branch */}
          <path d="M30 120 Q 100 96, 170 130" fill="none" stroke={p.deep} strokeWidth="1.6" />
          {/* Needles */}
          {Array.from({ length: 14 }).map((_, i) => {
            const t = i / 13;
            const px = 30 + t * 140;
            const py = 120 - Math.sin(t * Math.PI) * 24;
            const side = i % 2 === 0 ? 1 : -1;
            return (
              <g key={i}>
                <line x1={px} y1={py} x2={px - 6} y2={py + 14 * side} stroke={p.deep} strokeWidth="0.9" opacity="0.85" />
                <line x1={px} y1={py} x2={px + 6} y2={py + 14 * side} stroke={p.deep} strokeWidth="0.9" opacity="0.85" />
                <line x1={px} y1={py} x2={px} y2={py + 16 * side} stroke={p.deep} strokeWidth="0.9" opacity="0.85" />
              </g>
            );
          })}
          {/* Pine cone — overlapping scales */}
          <g transform="translate(120 56)">
            <ellipse cx="0" cy="0" rx="14" ry="22" fill={p.accent} opacity="0.92" />
            {[
              [-6, -16], [6, -16], [-9, -8], [0, -8], [9, -8],
              [-6, 0], [6, 0], [-9, 8], [0, 8], [9, 8],
              [-6, 16], [6, 16],
            ].map(([dx, dy], i) => (
              <path key={i} d={`M ${dx - 5} ${dy} Q ${dx} ${dy - 4}, ${dx + 5} ${dy} Q ${dx} ${dy + 4}, ${dx - 5} ${dy} Z`}
                    fill={p.deep} opacity="0.7" />
            ))}
          </g>
        </svg>
      );

    /* ── Tropical Paradise: arching palm frond ── */
    case 'palm-frond':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Stem — arching from bottom-left to top-right */}
          <path d="M28 188 Q 80 80, 178 24" fill="none" stroke={p.deep} strokeWidth="1.8" />
          {/* Leaflets along the stem */}
          {Array.from({ length: 16 }).map((_, i) => {
            const t = i / 15;
            // Quadratic bezier evaluation
            const px = 28 * (1 - t) * (1 - t) + 2 * 80 * (1 - t) * t + 178 * t * t;
            const py = 188 * (1 - t) * (1 - t) + 2 * 80 * (1 - t) * t + 24 * t * t;
            // Tangent angle approx
            const tangent = Math.atan2(
              2 * (1 - t) * (80 - 188) + 2 * t * (24 - 80),
              2 * (1 - t) * (80 - 28) + 2 * t * (178 - 80),
            );
            const perpA = tangent + Math.PI / 2;
            const len = 32 - Math.abs(7 - i) * 2;
            const ax = px + Math.cos(perpA) * len;
            const ay = py + Math.sin(perpA) * len;
            const bx = px - Math.cos(perpA) * len;
            const by = py - Math.sin(perpA) * len;
            return (
              <g key={i}>
                <line x1={px} y1={py} x2={ax} y2={ay} stroke={p.deep} strokeWidth="1.4" opacity="0.85" />
                <line x1={px} y1={py} x2={bx} y2={by} stroke={p.deep} strokeWidth="1.4" opacity="0.85" />
              </g>
            );
          })}
        </svg>
      );

    /* ── Winter Wonderland: hexagonal snowflake ── */
    case 'snowflake':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <g transform="translate(100 100)" stroke={p.accent} strokeWidth="1.4" fill="none" strokeLinecap="round">
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = (i / 6) * 360;
              return (
                <g key={i} transform={`rotate(${angle})`}>
                  <line x1="0" y1="0" x2="0" y2="-72" />
                  <line x1="0" y1="-30" x2="-10" y2="-40" />
                  <line x1="0" y1="-30" x2="10" y2="-40" />
                  <line x1="0" y1="-50" x2="-12" y2="-62" />
                  <line x1="0" y1="-50" x2="12" y2="-62" />
                  <line x1="0" y1="-66" x2="-6" y2="-72" />
                  <line x1="0" y1="-66" x2="6" y2="-72" />
                </g>
              );
            })}
          </g>
          {/* Centre crystal */}
          <circle cx="100" cy="100" r="4" fill={p.accent} />
        </svg>
      );

    /* ── Celestial Night: dot-and-line star map ── */
    case 'constellation':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Constellation lines (Cassiopeia-ish W) */}
          <path d="M30 130 L70 70 L110 110 L150 50 L190 100" fill="none" stroke={p.accent} strokeWidth="0.8" opacity="0.65" />
          {/* Stars on the constellation */}
          {[
            { cx: 30,  cy: 130, r: 4 }, { cx: 70,  cy: 70,  r: 3 },
            { cx: 110, cy: 110, r: 4 }, { cx: 150, cy: 50,  r: 3 },
            { cx: 190, cy: 100, r: 4 },
          ].map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={p.accent} />
          ))}
          {/* Background stars */}
          {[
            [50, 38], [88, 156], [40, 174], [162, 170], [126, 24],
            [22, 88], [180, 36], [14, 50], [104, 178],
          ].map(([cx, cy], i) => (
            <circle key={`bg${i}`} cx={cx} cy={cy} r="1.4" fill={p.cream} opacity="0.85" />
          ))}
          {/* Crescent moon top-right */}
          <path d="M158 30 A 16 16 0 1 0 174 46 A 12 12 0 1 1 158 30 Z" fill={p.accent} opacity="0.85" />
        </svg>
      );

    /* ── Whimsical Garden / Cottagecore: two toadstools ── */
    case 'mushroom-pair':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Larger mushroom */}
          <g>
            <path d="M48 124 Q 48 80, 96 80 Q 144 80, 144 124 Z" fill={p.accent} opacity="0.95" />
            {/* Spots */}
            <circle cx="76" cy="106" r="6" fill={p.cream} />
            <circle cx="100" cy="94" r="5" fill={p.cream} />
            <circle cx="120" cy="108" r="4" fill={p.cream} />
            <circle cx="86" cy="118" r="3" fill={p.cream} />
            {/* Stem */}
            <rect x="80" y="124" width="32" height="44" rx="6" fill={p.cream} stroke={p.deep} strokeWidth="0.8" />
            {/* Gills */}
            <ellipse cx="96" cy="124" rx="48" ry="6" fill={p.cream} stroke={p.deep} strokeWidth="0.6" />
            <line x1="80" y1="124" x2="80" y2="120" stroke={p.deep} strokeWidth="0.6" />
            <line x1="96" y1="126" x2="96" y2="120" stroke={p.deep} strokeWidth="0.6" />
            <line x1="112" y1="124" x2="112" y2="120" stroke={p.deep} strokeWidth="0.6" />
          </g>
          {/* Smaller mushroom */}
          <g transform="translate(40 0)">
            <path d="M120 158 Q 120 134, 144 134 Q 168 134, 168 158 Z" fill={p.accent} opacity="0.85" />
            <circle cx="136" cy="148" r="3" fill={p.cream} />
            <circle cx="152" cy="142" r="2.5" fill={p.cream} />
            <rect x="138" y="158" width="14" height="22" rx="3" fill={p.cream} stroke={p.deep} strokeWidth="0.6" />
          </g>
          {/* Ground */}
          <path d="M14 178 Q 100 184, 188 178" fill="none" stroke={p.deep} strokeWidth="0.8" opacity="0.55" />
        </svg>
      );

    /* ── Western Ranch: prickly pear cactus with bloom ── */
    case 'cactus-bloom':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Pads — paddle-shaped */}
          <g fill={p.deep} opacity="0.95">
            <ellipse cx="100" cy="148" rx="28" ry="38" />
            <ellipse cx="68" cy="106" rx="22" ry="28" transform="rotate(-30 68 106)" />
            <ellipse cx="132" cy="100" rx="22" ry="28" transform="rotate(30 132 100)" />
          </g>
          {/* Spines */}
          <g stroke={p.cream} strokeWidth="0.6" opacity="0.78">
            {[
              [100, 130], [100, 150], [100, 168], [88, 140], [112, 140],
              [70, 100], [62, 116], [78, 96], [126, 94], [134, 110], [120, 108],
            ].map(([cx, cy], i) => (
              <g key={i}>
                <line x1={cx - 1.5} y1={cy} x2={cx + 1.5} y2={cy} />
                <line x1={cx} y1={cy - 1.5} x2={cx} y2={cy + 1.5} />
              </g>
            ))}
          </g>
          {/* Pink bloom on top pad */}
          <g transform="translate(100 116)">
            {Array.from({ length: 5 }).map((_, i) => {
              const angle = (i / 5) * 360;
              const rad = (angle * Math.PI) / 180;
              const cx = Math.cos(rad) * 8;
              const cy = Math.sin(rad) * 8;
              return (
                <ellipse key={i} cx={cx} cy={cy} rx="8" ry="5"
                         fill={p.accent} opacity="0.92"
                         transform={`rotate(${angle} ${cx} ${cy})`} />
              );
            })}
            <circle cx="0" cy="0" r="3" fill={p.cream} />
          </g>
          {/* Soil */}
          <path d="M30 188 Q 100 196, 170 188" fill="none" stroke={p.ink} strokeWidth="0.6" opacity="0.45" />
        </svg>
      );

    /* ── Industrial Chic: jointed copper pipe ── */
    case 'copper-pipe':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Pipe segments */}
          <g stroke={p.accent} strokeWidth="6" fill="none" strokeLinecap="butt">
            <line x1="20" y1="60" x2="86" y2="60" />
            <path d="M86 60 Q 96 60, 96 70 L 96 130" />
            <line x1="96" y1="130" x2="180" y2="130" />
          </g>
          {/* Joint flanges */}
          {[
            { cx: 86, cy: 60 }, { cx: 96, cy: 130 },
          ].map((j, i) => (
            <g key={i}>
              <circle cx={j.cx} cy={j.cy} r="11" fill={p.accent} />
              <circle cx={j.cx} cy={j.cy} r="6" fill={p.deep} />
            </g>
          ))}
          {/* Bolts */}
          {[
            [40, 60], [60, 60], [120, 130], [160, 130],
          ].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="2" fill={p.deep} />
            </g>
          ))}
          {/* End caps */}
          <rect x="14" y="54" width="6" height="12" fill={p.deep} />
          <rect x="180" y="124" width="6" height="12" fill={p.deep} />
        </svg>
      );

    /* ── Black & White / Classic: ionic column ── */
    case 'marble-column':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Capital */}
          <rect x="60" y="36" width="80" height="10" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          {/* Volutes (scrolls) */}
          <circle cx="68" cy="46" r="6" fill="none" stroke={p.ink} strokeWidth="0.8" />
          <circle cx="132" cy="46" r="6" fill="none" stroke={p.ink} strokeWidth="0.8" />
          {/* Echinus */}
          <rect x="68" y="46" width="64" height="6" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          {/* Shaft with flutes */}
          <rect x="74" y="52" width="52" height="124" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          {[78, 86, 94, 102, 110, 118].map((x) => (
            <line key={x} x1={x} y1="52" x2={x} y2="176" stroke={p.ink} strokeWidth="0.6" opacity="0.65" />
          ))}
          {/* Base */}
          <rect x="64" y="176" width="72" height="8" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          <rect x="58" y="184" width="84" height="6" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          {/* Veining */}
          <path d="M88 80 Q 92 100, 86 130 Q 90 160, 88 174" fill="none" stroke={p.deep} strokeWidth="0.5" opacity="0.6" />
        </svg>
      );

    /* ── Gothic Cathedral / Fairytale Castle: stained-glass arch ── */
    case 'stained-glass':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Arch frame */}
          <path d="M50 184 L 50 80 Q 50 30, 100 30 Q 150 30, 150 80 L 150 184 Z"
                fill={p.cream} stroke={p.ink} strokeWidth="1.4" />
          {/* Vertical mullions */}
          <line x1="100" y1="184" x2="100" y2="40" stroke={p.ink} strokeWidth="1.2" />
          {/* Horizontal transoms */}
          <line x1="50" y1="100" x2="150" y2="100" stroke={p.ink} strokeWidth="1.2" />
          <line x1="50" y1="140" x2="150" y2="140" stroke={p.ink} strokeWidth="1.2" />
          {/* Stained-glass quadrants — alternating fills */}
          <rect x="51" y="101" width="48" height="38" fill={p.accent} opacity="0.55" />
          <rect x="101" y="141" width="48" height="42" fill={p.accent} opacity="0.55" />
          <rect x="101" y="101" width="48" height="38" fill={p.deep} opacity="0.45" />
          <rect x="51" y="141" width="48" height="42" fill={p.deep} opacity="0.45" />
          {/* Top arch glass */}
          <path d="M50 80 Q 50 30, 100 30 Q 150 30, 150 80 Z" fill={p.accent} opacity="0.42" />
          {/* Rosette */}
          <circle cx="100" cy="64" r="14" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * 360;
            const rad = (angle * Math.PI) / 180;
            return (
              <line key={i} x1="100" y1="64"
                    x2={100 + Math.cos(rad) * 14}
                    y2={64 + Math.sin(rad) * 14}
                    stroke={p.ink} strokeWidth="0.6" />
            );
          })}
        </svg>
      );

    /* ── Nautical Prep: anchor with rope coil ── */
    case 'anchor-rope':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <g stroke={p.ink} strokeWidth="2.5" fill="none" strokeLinecap="round">
            {/* Anchor stem */}
            <line x1="100" y1="50" x2="100" y2="160" />
            {/* Crossbar */}
            <line x1="76" y1="68" x2="124" y2="68" />
            {/* Bottom curve */}
            <path d="M52 130 Q 52 174, 100 174 Q 148 174, 148 130" />
            {/* Tips */}
            <line x1="52" y1="130" x2="40" y2="118" />
            <line x1="148" y1="130" x2="160" y2="118" />
            {/* Top ring */}
          </g>
          <circle cx="100" cy="42" r="9" fill="none" stroke={p.ink} strokeWidth="2.5" />
          {/* Rope coil through ring */}
          <g stroke={p.accent} strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M68 30 Q 100 18, 132 30" />
            <path d="M68 30 Q 78 38, 84 32" />
            <path d="M132 30 Q 122 38, 116 32" />
          </g>
        </svg>
      );

    /* ── Japandi Zen: bamboo segments with leaves ── */
    case 'bamboo-stem':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Bamboo stalk — vertical with segment lines */}
          <rect x="92" y="20" width="16" height="160" fill={p.deep} opacity="0.92" />
          {/* Segment rings */}
          {[50, 86, 122, 158].map((y) => (
            <g key={y}>
              <rect x="86" y={y - 2} width="28" height="6" fill={p.deep} />
              <line x1="92" y1={y} x2="108" y2={y} stroke={p.cream} strokeWidth="0.6" opacity="0.6" />
            </g>
          ))}
          {/* Leaves — 3 pairs */}
          {[
            { y: 60,  side: -1 },
            { y: 108, side:  1 },
            { y: 144, side: -1 },
          ].map((l, i) => (
            <g key={i}>
              <ellipse cx={100 + l.side * 36} cy={l.y - 8} rx="22" ry="6"
                       fill={p.accent} opacity="0.85"
                       transform={`rotate(${l.side * 28} ${100 + l.side * 36} ${l.y - 8})`} />
              <ellipse cx={100 + l.side * 30} cy={l.y + 6} rx="18" ry="5"
                       fill={p.accent} opacity="0.7"
                       transform={`rotate(${l.side * -10} ${100 + l.side * 30} ${l.y + 6})`} />
            </g>
          ))}
        </svg>
      );

    /* ── Victorian Garden: silhouette cameo ── */
    case 'cameo-oval':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Outer oval frame */}
          <ellipse cx="100" cy="100" rx="62" ry="78" fill={p.cream} stroke={p.accent} strokeWidth="2" />
          {/* Inner oval */}
          <ellipse cx="100" cy="100" rx="52" ry="68" fill={p.accent} opacity="0.45" />
          {/* Silhouette — woman's profile */}
          <path d="M100 56 Q 92 46, 88 56 L 84 78 Q 80 86, 86 92 Q 86 100, 92 106 L 92 128 Q 96 138, 110 138 Q 124 138, 122 124 L 114 112 Q 116 100, 116 90 L 112 80 Q 112 64, 100 56 Z"
                fill={p.deep} opacity="0.95" />
          {/* Hair bun */}
          <circle cx="118" cy="64" r="12" fill={p.deep} opacity="0.95" />
          {/* Decorative cameo edges — 8 dots */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = -90 + (i / 8) * 360;
            const rad = (angle * Math.PI) / 180;
            const cx = 100 + Math.cos(rad) * 70;
            const cy = 100 + Math.sin(rad) * 86;
            return <circle key={i} cx={cx} cy={cy} r="2.5" fill={p.accent} />;
          })}
        </svg>
      );

    /* ── Dark Academia / Old Money: quill + inkpot ── */
    case 'quill-ink':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Inkpot — round bottle */}
          <ellipse cx="60" cy="160" rx="28" ry="6" fill={p.deep} opacity="0.4" />
          <path d="M40 160 Q 40 124, 60 124 Q 80 124, 80 160 Z" fill={p.deep} stroke={p.ink} strokeWidth="0.8" />
          {/* Pot mouth */}
          <ellipse cx="60" cy="124" rx="14" ry="3" fill={p.ink} />
          <rect x="48" y="116" width="24" height="8" fill={p.ink} />
          {/* Quill — long feather angled into pot */}
          <path d="M168 22 Q 96 86, 64 122" fill="none" stroke={p.ink} strokeWidth="1.6" />
          {/* Feather barbs */}
          {Array.from({ length: 22 }).map((_, i) => {
            const t = i / 21;
            const px = 168 * (1 - t) + 64 * t;
            const py = 22 * (1 - t) + 122 * t;
            const dx = -10 + i * 0.4;
            return <line key={i} x1={px} y1={py} x2={px + dx} y2={py - 18 + i * 0.4} stroke={p.accent} strokeWidth="0.8" opacity="0.78" />;
          })}
          {/* Ink dot */}
          <circle cx="78" cy="138" r="2" fill={p.accent} />
        </svg>
      );

    /* ── Classic Elegance / Old Money: laurel half-wreath ── */
    case 'laurel-wreath':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Two arching branches */}
          <path d="M40 160 Q 30 100, 60 50" fill="none" stroke={p.deep} strokeWidth="1.4" />
          <path d="M160 160 Q 170 100, 140 50" fill="none" stroke={p.deep} strokeWidth="1.4" />
          {/* Leaves on left branch */}
          {Array.from({ length: 9 }).map((_, i) => {
            const t = i / 8;
            const px = 40 * (1 - t) * (1 - t) + 2 * 30 * (1 - t) * t + 60 * t * t;
            const py = 160 * (1 - t) * (1 - t) + 2 * 100 * (1 - t) * t + 50 * t * t;
            const ang = 90 + t * 60;
            return (
              <ellipse key={i} cx={px - 8} cy={py} rx="9" ry="3.5"
                       fill={p.deep} opacity="0.85"
                       transform={`rotate(${ang} ${px - 8} ${py})`} />
            );
          })}
          {/* Leaves on right branch */}
          {Array.from({ length: 9 }).map((_, i) => {
            const t = i / 8;
            const px = 160 * (1 - t) * (1 - t) + 2 * 170 * (1 - t) * t + 140 * t * t;
            const py = 160 * (1 - t) * (1 - t) + 2 * 100 * (1 - t) * t + 50 * t * t;
            const ang = 90 - t * 60;
            return (
              <ellipse key={i} cx={px + 8} cy={py} rx="9" ry="3.5"
                       fill={p.deep} opacity="0.85"
                       transform={`rotate(${ang} ${px + 8} ${py})`} />
            );
          })}
          {/* Tied ribbon at base */}
          <path d="M82 160 Q 100 168, 118 160 L 124 178 Q 100 184, 76 178 Z"
                fill={p.accent} opacity="0.92" />
        </svg>
      );

    /* ── Fairytale Castle: turret with pennant ── */
    case 'castle-turret':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Turret body */}
          <rect x="76" y="74" width="48" height="110" fill={p.cream} stroke={p.ink} strokeWidth="1" />
          {/* Crenellations */}
          {[76, 88, 100, 112, 124].map((x) => (
            <rect key={x} x={x - 4} y="68" width="8" height="10" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          ))}
          {/* Window slits */}
          <rect x="92" y="100" width="6" height="14" fill={p.ink} />
          <rect x="102" y="100" width="6" height="14" fill={p.ink} />
          <rect x="92" y="132" width="6" height="14" fill={p.ink} />
          <rect x="102" y="132" width="6" height="14" fill={p.ink} />
          {/* Conical roof */}
          <path d="M64 78 L 100 26 L 136 78 Z" fill={p.accent} stroke={p.ink} strokeWidth="1" />
          {/* Pennant */}
          <line x1="100" y1="26" x2="100" y2="14" stroke={p.ink} strokeWidth="1" />
          <path d="M100 16 L 124 22 L 100 28 Z" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
          {/* Door */}
          <path d="M88 184 Q 88 168, 100 168 Q 112 168, 112 184 Z" fill={p.deep} />
        </svg>
      );

    /* ── Last Weekend / Warm Threshold: vintage suitcase ── */
    case 'suitcase':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Body */}
          <rect x="36" y="76" width="128" height="92" rx="6" fill={p.deep} stroke={p.ink} strokeWidth="1" />
          {/* Top trim */}
          <rect x="36" y="100" width="128" height="3" fill={p.cream} opacity="0.45" />
          <rect x="36" y="148" width="128" height="3" fill={p.cream} opacity="0.45" />
          {/* Handle */}
          <path d="M86 76 L 86 60 Q 86 52, 100 52 Q 114 52, 114 60 L 114 76" fill="none" stroke={p.ink} strokeWidth="2.4" />
          {/* Latches */}
          <rect x="58" y="92" width="14" height="8" fill={p.accent} stroke={p.ink} strokeWidth="0.6" />
          <rect x="128" y="92" width="14" height="8" fill={p.accent} stroke={p.ink} strokeWidth="0.6" />
          {/* Travel labels (stickers) */}
          <rect x="60" y="116" width="34" height="22" fill={p.cream} stroke={p.ink} strokeWidth="0.6" transform="rotate(-6 77 127)" />
          <rect x="100" y="124" width="38" height="20" fill={p.accent} stroke={p.ink} strokeWidth="0.6" transform="rotate(8 119 134)" />
          {/* Legs */}
          <rect x="46" y="168" width="14" height="6" fill={p.ink} />
          <rect x="140" y="168" width="14" height="6" fill={p.ink} />
        </svg>
      );

    /* ── Bridal Shower / Brunch: stacked champagne tower ── */
    case 'champagne-tower':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Top coupe */}
          <g>
            <ellipse cx="100" cy="38" rx="20" ry="5" fill="none" stroke={p.accent} strokeWidth="1.4" />
            <path d="M80 38 Q 100 60, 120 38" fill={p.accent} opacity="0.18" stroke={p.accent} strokeWidth="1.2" />
            <line x1="100" y1="58" x2="100" y2="80" stroke={p.accent} strokeWidth="1.2" />
          </g>
          {/* Middle row — 2 coupes */}
          {[60, 140].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx} cy="92" rx="20" ry="5" fill="none" stroke={p.accent} strokeWidth="1.4" />
              <path d={`M${cx - 20} 92 Q ${cx} 114, ${cx + 20} 92`} fill={p.accent} opacity="0.18" stroke={p.accent} strokeWidth="1.2" />
              <line x1={cx} y1="112" x2={cx} y2="134" stroke={p.accent} strokeWidth="1.2" />
            </g>
          ))}
          {/* Bottom row — 3 coupes */}
          {[36, 100, 164].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx} cy="146" rx="20" ry="5" fill="none" stroke={p.accent} strokeWidth="1.4" />
              <path d={`M${cx - 20} 146 Q ${cx} 168, ${cx + 20} 146`} fill={p.accent} opacity="0.18" stroke={p.accent} strokeWidth="1.2" />
              <line x1={cx} y1="166" x2={cx} y2="186" stroke={p.accent} strokeWidth="1.2" />
              <ellipse cx={cx} cy="188" rx="10" ry="2" fill="none" stroke={p.accent} strokeWidth="1.2" />
            </g>
          ))}
          {/* Pouring sparkle (drops between top + mid) */}
          <circle cx="80" cy="78" r="1.4" fill={p.accent} opacity="0.85" />
          <circle cx="120" cy="80" r="1.4" fill={p.accent} opacity="0.85" />
          <circle cx="100" cy="74" r="1.6" fill={p.accent} opacity="0.95" />
        </svg>
      );

    /* ── Rehearsal Dinner: plate + cutlery ── */
    case 'place-setting':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Charger plate */}
          <circle cx="100" cy="108" r="60" fill="none" stroke={p.accent} strokeWidth="2" />
          <circle cx="100" cy="108" r="50" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          {/* Inner plate */}
          <circle cx="100" cy="108" r="34" fill="none" stroke={p.ink} strokeWidth="0.6" opacity="0.65" />
          {/* Fork (left) */}
          <g stroke={p.ink} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <line x1="40" y1="60" x2="40" y2="180" />
            <line x1="34" y1="60" x2="34" y2="80" />
            <line x1="46" y1="60" x2="46" y2="80" />
            <line x1="40" y1="60" x2="40" y2="80" />
          </g>
          {/* Knife (right) */}
          <g>
            <line x1="160" y1="60" x2="160" y2="180" stroke={p.ink} strokeWidth="1.2" />
            <path d="M156 60 Q 158 50, 164 60 L 164 120 L 156 120 Z" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
          </g>
          {/* Napkin fold visible in plate */}
          <path d="M88 108 L 100 96 L 112 108 L 100 120 Z" fill={p.accent} opacity="0.6" stroke={p.ink} strokeWidth="0.5" />
        </svg>
      );

    /* ── Vow Renewal (Saying It Again): time capsule ── */
    case 'time-capsule':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Box body */}
          <rect x="40" y="80" width="120" height="100" rx="6" fill={p.deep} stroke={p.ink} strokeWidth="1.2" />
          {/* Rivets */}
          {[
            [50, 90], [150, 90], [50, 170], [150, 170],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2.5" fill={p.accent} />
          ))}
          {/* Lid hinge */}
          <line x1="40" y1="80" x2="160" y2="80" stroke={p.accent} strokeWidth="3" />
          <rect x="48" y="76" width="6" height="6" fill={p.accent} />
          <rect x="146" y="76" width="6" height="6" fill={p.accent} />
          {/* Padlock with date plate */}
          <g transform="translate(100 130)">
            <rect x="-22" y="-6" width="44" height="36" rx="4" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
            <path d="M-12 -6 L -12 -18 Q -12 -28, 0 -28 Q 12 -28, 12 -18 L 12 -6"
                  fill="none" stroke={p.accent} strokeWidth="3" />
            <text x="0" y="14" fontFamily="serif" fontSize="10" textAnchor="middle" fill={p.ink}>EST.</text>
          </g>
        </svg>
      );

    /* ── Come Meet the Baby / Sip & See: vintage rattle ── */
    case 'baby-rattle':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Rattle ball */}
          <circle cx="100" cy="74" r="38" fill={p.accent} opacity="0.92" stroke={p.ink} strokeWidth="0.8" />
          {/* Polka dots */}
          {[
            [86, 60, 4], [110, 56, 5], [120, 84, 4], [82, 90, 4], [102, 82, 3],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={p.cream} opacity="0.85" />
          ))}
          {/* Handle */}
          <rect x="94" y="112" width="12" height="60" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          {/* Handle ring */}
          <circle cx="100" cy="180" r="14" fill="none" stroke={p.accent} strokeWidth="3.5" />
          {/* Bow on top */}
          <path d="M88 36 Q 96 28, 100 36 Q 104 28, 112 36 L 100 46 Z" fill={p.deep} opacity="0.95" />
        </svg>
      );

    /* ── Baby Shower (stand-alone): classic baby bottle ── */
    case 'baby-bottle':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Nipple */}
          <path d="M88 26 Q 100 14, 112 26 L 112 38 L 88 38 Z" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
          {/* Cap ring */}
          <rect x="80" y="38" width="40" height="10" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
          {/* Bottle body */}
          <path d="M80 48 L 80 168 Q 80 184, 100 184 Q 120 184, 120 168 L 120 48 Z"
                fill={p.cream} stroke={p.ink} strokeWidth="1" />
          {/* Measurement marks */}
          {[80, 100, 120, 140, 160].map((y, i) => (
            <g key={y}>
              <line x1="80" y1={y} x2="86" y2={y} stroke={p.ink} strokeWidth="0.6" />
              <text x="92" y={y + 3} fontSize="6" fill={p.deep}>{`${(5 - i) * 2}oz`}</text>
            </g>
          ))}
          {/* Liquid level */}
          <path d="M82 110 L 118 110 L 118 166 Q 118 182, 100 182 Q 82 182, 82 166 Z"
                fill={p.accent} opacity="0.45" />
        </svg>
      );

    /* ── Graduation: mortarboard cap ── */
    case 'mortarboard':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Cap base */}
          <path d="M50 110 Q 50 124, 100 134 Q 150 124, 150 110" fill={p.deep} stroke={p.ink} strokeWidth="0.8" />
          {/* Square top */}
          <path d="M28 96 L 100 78 L 172 96 L 100 114 Z" fill={p.deep} stroke={p.ink} strokeWidth="1" />
          {/* Button */}
          <circle cx="100" cy="98" r="3" fill={p.accent} />
          {/* Tassel cord */}
          <path d="M100 98 Q 132 100, 142 110 L 142 134" fill="none" stroke={p.accent} strokeWidth="1" />
          {/* Tassel head */}
          <rect x="138" y="134" width="8" height="8" fill={p.accent} />
          {/* Tassel strands */}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1={140 + i} y1="142" x2={140 + i} y2="166" stroke={p.accent} strokeWidth="0.7" />
          ))}
          {/* Diploma scroll */}
          <g transform="translate(58 150)">
            <rect x="0" y="0" width="60" height="24" rx="3" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
            <line x1="8" y1="8" x2="52" y2="8" stroke={p.deep} strokeWidth="0.5" />
            <line x1="8" y1="14" x2="44" y2="14" stroke={p.deep} strokeWidth="0.5" />
            {/* Ribbon */}
            <circle cx="50" cy="12" r="6" fill={p.accent} />
          </g>
        </svg>
      );

    /* ── Retirement: pocket watch ── */
    case 'retirement-clock':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Chain */}
          <path d="M100 18 Q 60 28, 80 50" fill="none" stroke={p.accent} strokeWidth="1.4" />
          {[
            [98, 22], [88, 30], [80, 40], [78, 50],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2" fill="none" stroke={p.accent} strokeWidth="1" />
          ))}
          {/* Crown */}
          <rect x="92" y="48" width="16" height="10" fill={p.accent} stroke={p.ink} strokeWidth="0.6" />
          {/* Watch case */}
          <circle cx="100" cy="120" r="62" fill={p.accent} stroke={p.ink} strokeWidth="1.4" />
          <circle cx="100" cy="120" r="54" fill={p.cream} stroke={p.ink} strokeWidth="0.8" />
          {/* Hour markers */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 360;
            const rad = (angle * Math.PI) / 180;
            const x1 = 100 + Math.cos(rad) * 46;
            const y1 = 120 + Math.sin(rad) * 46;
            const x2 = 100 + Math.cos(rad) * 50;
            const y2 = 120 + Math.sin(rad) * 50;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={p.ink} strokeWidth="1" />;
          })}
          {/* Hands — minute pointing to 11, hour pointing to 4 */}
          <line x1="100" y1="120" x2="76" y2="84" stroke={p.ink} strokeWidth="2" strokeLinecap="round" />
          <line x1="100" y1="120" x2="124" y2="142" stroke={p.ink} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="100" cy="120" r="3" fill={p.deep} />
        </svg>
      );

    /* ── Memorial: 3 lit votive candles ── */
    case 'candle-vigil':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Three votive candles */}
          {[
            { cx: 50,  h: 56 },
            { cx: 100, h: 72 },
            { cx: 150, h: 56 },
          ].map((c, i) => (
            <g key={i}>
              {/* Flame */}
              <path d={`M${c.cx} ${178 - c.h - 24} Q ${c.cx - 6} ${178 - c.h - 14}, ${c.cx} ${178 - c.h - 4} Q ${c.cx + 6} ${178 - c.h - 14}, ${c.cx} ${178 - c.h - 24} Z`}
                    fill={p.accent} opacity="0.95" />
              <path d={`M${c.cx} ${178 - c.h - 18} Q ${c.cx - 3} ${178 - c.h - 12}, ${c.cx} ${178 - c.h - 6} Q ${c.cx + 3} ${178 - c.h - 12}, ${c.cx} ${178 - c.h - 18} Z`}
                    fill={p.cream} opacity="0.7" />
              {/* Wick */}
              <line x1={c.cx} y1={178 - c.h - 4} x2={c.cx} y2={178 - c.h + 4} stroke={p.ink} strokeWidth="1" />
              {/* Candle body — short votive */}
              <rect x={c.cx - 14} y={178 - c.h + 4} width="28" height={c.h - 8} rx="3" fill={p.cream} stroke={p.deep} strokeWidth="0.8" />
              {/* Wax drip */}
              <path d={`M${c.cx - 8} ${178 - c.h + 8} Q ${c.cx - 10} ${178 - c.h + 18}, ${c.cx - 8} ${178 - c.h + 24}`}
                    fill="none" stroke={p.deep} strokeWidth="0.5" opacity="0.6" />
            </g>
          ))}
          {/* Surface */}
          <line x1="20" y1="178" x2="180" y2="178" stroke={p.ink} strokeWidth="0.8" opacity="0.55" />
          {/* Soft glow */}
          <ellipse cx="100" cy="174" rx="80" ry="6" fill={p.accent} opacity="0.18" />
        </svg>
      );

    /* ── Bar/Bat Mitzvah: open Torah scroll ── */
    case 'torah-scroll':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Left rolled end */}
          <g>
            <line x1="36" y1="40" x2="36" y2="160" stroke={p.deep} strokeWidth="3" />
            <circle cx="36" cy="36" r="6" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
            <circle cx="36" cy="164" r="6" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
            {/* Scroll cylinder */}
            <ellipse cx="36" cy="100" rx="14" ry="60" fill={p.cream} stroke={p.deep} strokeWidth="0.8" />
          </g>
          {/* Right rolled end */}
          <g>
            <line x1="164" y1="40" x2="164" y2="160" stroke={p.deep} strokeWidth="3" />
            <circle cx="164" cy="36" r="6" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
            <circle cx="164" cy="164" r="6" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
            <ellipse cx="164" cy="100" rx="14" ry="60" fill={p.cream} stroke={p.deep} strokeWidth="0.8" />
          </g>
          {/* Open scroll between them */}
          <rect x="50" y="48" width="100" height="104" fill={p.cream} stroke={p.deep} strokeWidth="0.8" />
          {/* Hebrew-style text lines (decorative) */}
          {[64, 76, 88, 100, 112, 124, 136].map((y) => (
            <line key={y} x1="60" y1={y} x2="140" y2={y} stroke={p.ink} strokeWidth="0.6" opacity="0.65" />
          ))}
          {/* Star of David */}
          <g transform="translate(100 96)" stroke={p.accent} strokeWidth="0.6" fill="none">
            <path d="M 0 -10 L 9 6 L -9 6 Z" />
            <path d="M 0 10 L 9 -6 L -9 -6 Z" />
          </g>
        </svg>
      );

    /* ── Baptism / First Communion: scallop shell with droplet ── */
    case 'baptism-shell':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Scallop shell — fan of ridges */}
          <g>
            <path d="M40 130 Q 100 14, 160 130 Q 100 156, 40 130 Z" fill={p.cream} stroke={p.accent} strokeWidth="1.4" />
            {/* Ridges */}
            {[-50, -30, -10, 10, 30, 50].map((dx) => (
              <line key={dx} x1={100 + dx * 0.6} y1="40" x2={100 + dx} y2="130"
                    stroke={p.accent} strokeWidth="0.8" opacity="0.78" />
            ))}
            {/* Hinge dot */}
            <circle cx="100" cy="14" r="4" fill={p.accent} />
          </g>
          {/* Three water droplets falling */}
          {[
            { cx: 78,  cy: 158 },
            { cx: 100, cy: 168 },
            { cx: 122, cy: 158 },
          ].map((d, i) => (
            <path key={i} d={`M${d.cx} ${d.cy - 12} Q ${d.cx - 5} ${d.cy - 4}, ${d.cx} ${d.cy + 4} Q ${d.cx + 5} ${d.cy - 4}, ${d.cx} ${d.cy - 12} Z`}
                  fill={p.accent} opacity="0.92" />
          ))}
          {/* Surface ripple */}
          <ellipse cx="100" cy="186" rx="36" ry="3" fill="none" stroke={p.accent} strokeWidth="0.8" opacity="0.5" />
        </svg>
      );

    /* ── Quinceañera (Fifteen And...): tiara ── */
    case 'tiara':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Base band */}
          <path d="M30 130 Q 100 110, 170 130" fill="none" stroke={p.accent} strokeWidth="2.4" />
          <path d="M30 134 Q 100 114, 170 134" fill="none" stroke={p.accent} strokeWidth="0.8" opacity="0.55" />
          {/* Centre point */}
          <path d="M100 110 L 92 78 L 100 56 L 108 78 Z" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
          <circle cx="100" cy="68" r="4" fill={p.accent} stroke={p.ink} strokeWidth="0.6" />
          <circle cx="100" cy="68" r="1.4" fill={p.cream} />
          {/* Side peaks */}
          <path d="M70 122 L 64 96 L 70 76 L 78 96 Z" fill={p.accent} opacity="0.92" stroke={p.ink} strokeWidth="0.6" />
          <path d="M130 122 L 136 96 L 130 76 L 122 96 Z" fill={p.accent} opacity="0.92" stroke={p.ink} strokeWidth="0.6" />
          {/* Outer peaks */}
          <path d="M44 126 L 40 110 L 44 96 L 50 110 Z" fill={p.accent} opacity="0.78" stroke={p.ink} strokeWidth="0.5" />
          <path d="M156 126 L 160 110 L 156 96 L 150 110 Z" fill={p.accent} opacity="0.78" stroke={p.ink} strokeWidth="0.5" />
          {/* Gem dots along the band */}
          {[60, 80, 100, 120, 140].map((cx) => (
            <circle key={cx} cx={cx} cy="128" r="2.5" fill={p.cream} stroke={p.ink} strokeWidth="0.4" />
          ))}
        </svg>
      );

    /* ── Housewarming: ring with two house keys ── */
    case 'house-key-ring':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Key ring */}
          <circle cx="100" cy="50" r="22" fill="none" stroke={p.accent} strokeWidth="3.2" />
          {/* Key 1 (left, hanging) */}
          <g transform="translate(78 70) rotate(-22)">
            <rect x="-3" y="0" width="6" height="80" fill={p.accent} />
            <rect x="-3" y="60" width="14" height="4" fill={p.accent} />
            <rect x="-3" y="68" width="10" height="4" fill={p.accent} />
            {/* Bow — house shape */}
            <path d="M-18 -22 L 0 -36 L 18 -22 L 18 0 L -18 0 Z" fill={p.accent} stroke={p.ink} strokeWidth="0.8" />
            {/* Window */}
            <rect x="-7" y="-16" width="14" height="14" fill={p.cream} stroke={p.ink} strokeWidth="0.6" />
            <line x1="0" y1="-16" x2="0" y2="-2" stroke={p.ink} strokeWidth="0.6" />
            <line x1="-7" y1="-9" x2="7" y2="-9" stroke={p.ink} strokeWidth="0.6" />
          </g>
          {/* Key 2 (right, hanging) */}
          <g transform="translate(124 70) rotate(18)">
            <rect x="-3" y="0" width="6" height="76" fill={p.deep} />
            <rect x="-3" y="56" width="12" height="4" fill={p.deep} />
            <rect x="-3" y="64" width="9" height="4" fill={p.deep} />
            {/* Round bow */}
            <circle cx="0" cy="-16" r="14" fill={p.deep} stroke={p.ink} strokeWidth="0.8" />
            <circle cx="0" cy="-16" r="6" fill={p.cream} />
          </g>
        </svg>
      );

    /* ── Gender Reveal: 3 balloons cluster ── */
    case 'balloon-cluster':
      return (
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {/* Strings tied at bottom */}
          <g stroke={p.ink} strokeWidth="0.8" fill="none">
            <path d="M58 80 Q 90 130, 100 168" />
            <path d="M100 60 Q 102 120, 100 168" />
            <path d="M142 80 Q 110 130, 100 168" />
          </g>
          {/* Ribbon bow at base */}
          <path d="M88 168 Q 100 178, 112 168 L 110 184 Q 100 188, 90 184 Z" fill={p.deep} opacity="0.92" />
          {/* Three balloons */}
          <ellipse cx="58" cy="64" rx="22" ry="26" fill={p.accent} opacity="0.92" />
          <ellipse cx="100" cy="44" rx="22" ry="26" fill={p.cream} stroke={p.accent} strokeWidth="0.8" />
          <ellipse cx="142" cy="64" rx="22" ry="26" fill={p.deep} opacity="0.92" />
          {/* Balloon highlights */}
          <ellipse cx="50" cy="56" rx="5" ry="8" fill={p.cream} opacity="0.5" />
          <ellipse cx="92" cy="36" rx="5" ry="8" fill={p.accent} opacity="0.4" />
          <ellipse cx="134" cy="56" rx="5" ry="8" fill={p.cream} opacity="0.4" />
          {/* Knots */}
          {[58, 100, 142].map((cx, i) => (
            <path key={i} d={`M${cx - 3} ${i === 1 ? 66 : 86} L ${cx + 3} ${i === 1 ? 66 : 86} L ${cx} ${i === 1 ? 70 : 90} Z`}
                  fill={i === 0 ? p.accent : i === 1 ? p.deep : p.deep} />
          ))}
          {/* Question mark on the cream balloon */}
          <text x="100" y="50" fontFamily="serif" fontSize="20" textAnchor="middle" fill={p.accent} fontWeight="bold">?</text>
        </svg>
      );

    default:
      return null;
  }
}
