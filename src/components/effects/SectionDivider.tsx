'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/SectionDivider.tsx
//
// SVG shape dividers rendered between page sections on the
// public site. Two families live here side by side:
//
//   Classic shapes  — single filled path (wave, arc, torn…)
//                     These get a subtle "breathe" morph when
//                     `animated` is on.
//
//   Decorative      — rich composed pieces with inner animation
//                     (botanical sprigs, petal drift, watercolor
//                     ink bleed, calligraphic flourish, sparkle
//                     trail, stitched ribbon, confetti rain,
//                     constellation). These come alive when the
//                     divider scrolls into view.
//
// Everything respects `prefers-reduced-motion` and automatically
// pauses when the divider is offscreen (IntersectionObserver).
// ─────────────────────────────────────────────────────────────

import { useEffect, useId, useState } from 'react';

type DividerStyle =
  | 'none'
  | 'wave' | 'wave2' | 'diagonal' | 'zigzag' | 'torn' | 'chevron' | 'arc'
  | 'botanical' | 'petals' | 'ink' | 'flourish' | 'sparkle' | 'ribbon' | 'confetti' | 'constellation';

interface SectionDividerProps {
  style: DividerStyle;
  color: string;     // fill/stroke color for the divider decoration
  bgColor?: string;  // background behind the SVG (the previous section's bg)
  height?: number;   // px, 30–200
  flip?: boolean;    // mirror horizontally
  flop?: boolean;    // mirror vertically
  /** Turns on the built-in motion. Defaults to true. Respects
   *  prefers-reduced-motion regardless. */
  animated?: boolean;
}

// ────────────────────────────────────────────────────────────────
// Motion gate: just a JS-level reduced-motion check. All animations
// themselves also respect `@media (prefers-reduced-motion: reduce)`
// in their own CSS — the JS flag is used to disable the SMIL
// <animate> children which can't be controlled by CSS media queries.
// ────────────────────────────────────────────────────────────────
function useMotionGate(enabled: boolean) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return { active: enabled && !reducedMotion };
}

// ────────────────────────────────────────────────────────────────
// Classic shape path generators. Each style optionally has a
// second "morph" path so we can breathe between them via SMIL.
// ────────────────────────────────────────────────────────────────
function shapePaths(style: DividerStyle, w = 1440, h = 80): { a: string; b?: string } {
  switch (style) {
    case 'wave':
      return {
        a: `M0,${h * 0.5} C${w * 0.25},0 ${w * 0.75},${h} ${w},${h * 0.5} L${w},${h} L0,${h} Z`,
        b: `M0,${h * 0.5} C${w * 0.25},${h * 0.15} ${w * 0.75},${h * 0.85} ${w},${h * 0.5} L${w},${h} L0,${h} Z`,
      };
    case 'wave2':
      return {
        a: `M0,${h * 0.65} C${w * 0.15},${h * 0.2} ${w * 0.35},${h} ${w * 0.5},${h * 0.5} C${w * 0.65},0 ${w * 0.85},${h * 0.9} ${w},${h * 0.4} L${w},${h} L0,${h} Z`,
        b: `M0,${h * 0.55} C${w * 0.15},${h * 0.95} ${w * 0.35},${h * 0.1} ${w * 0.5},${h * 0.5} C${w * 0.65},${h * 0.9} ${w * 0.85},${h * 0.15} ${w},${h * 0.6} L${w},${h} L0,${h} Z`,
      };
    case 'diagonal':
      return { a: `M0,0 L${w},${h} L${w},${h} L0,${h} Z` };
    case 'zigzag': {
      const peaks = 8;
      const step = w / peaks;
      let d = `M0,${h} `;
      for (let i = 0; i < peaks; i++) {
        const mid = step * i + step / 2;
        const right = step * (i + 1);
        d += `L${mid},0 L${right},${h} `;
      }
      return { a: d + 'Z' };
    }
    case 'torn': {
      const pts = 20;
      const step = w / pts;
      let d = `M0,${h} `;
      for (let i = 1; i <= pts; i++) {
        const x = step * i;
        const y = i % 3 === 0 ? h * 0.05 : i % 2 === 0 ? h * 0.35 : h * 0.18;
        d += `L${x},${y} `;
      }
      return { a: d + `L${w},${h} Z` };
    }
    case 'chevron': {
      const mid = w / 2;
      return { a: `M0,${h} L${mid},0 L${w},${h} Z` };
    }
    case 'arc':
      return {
        a: `M0,${h} Q${w / 2},-${h * 0.5} ${w},${h} Z`,
        b: `M0,${h} Q${w / 2},-${h * 0.2} ${w},${h} Z`,
      };
    default:
      return { a: '' };
  }
}

// ────────────────────────────────────────────────────────────────
// Shared wrapper for every divider. Handles bgColor, flip, flop,
// overflow clipping, and wires the IntersectionObserver ref.
// ────────────────────────────────────────────────────────────────
function DividerShell({
  height,
  bgColor,
  flip,
  flop,
  children,
}: {
  height: number;
  bgColor?: string;
  flip?: boolean;
  flop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height,
        overflow: 'hidden',
        lineHeight: 0,
        background: bgColor || 'transparent',
        transform: `${flip ? 'scaleX(-1)' : ''} ${flop ? 'scaleY(-1)' : ''}`.trim() || undefined,
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Classic shape renderer. Morphs between path A and B when `active`.
// ────────────────────────────────────────────────────────────────
function ClassicShape({ style, color, height, active }: { style: DividerStyle; color: string; height: number; active: boolean }) {
  const { a, b } = shapePaths(style, 1440, height);
  if (!a) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 1440 ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height }}
    >
      <path d={a} fill={color}>
        {active && b ? (
          <animate
            attributeName="d"
            dur="9s"
            repeatCount="indefinite"
            values={`${a};${b};${a}`}
            calcMode="spline"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
          />
        ) : null}
      </path>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// 1. BOTANICAL — a sprig of leaves + stem, flanked by rules.
//    Leaves fade + grow in staggered when entering view.
// ────────────────────────────────────────────────────────────────
function BotanicalDivider({ color, height, active }: { color: string; height: number; active: boolean }) {
  const cx = 720;
  const cy = height / 2;
  const rawKey = useId();
  const k = rawKey.replace(/[^a-zA-Z0-9]/g, '');
  const leaves = [
    { dx: -70, dy: -4,  rot: -24, scale: 1.0 },
    { dx:  65, dy: -2,  rot:  22, scale: 1.0 },
    { dx: -50, dy:  12, rot: -32, scale: 0.9 },
    { dx:  48, dy:  12, rot:  28, scale: 0.9 },
    { dx: -32, dy:  22, rot: -40, scale: 0.8 },
    { dx:  32, dy:  22, rot:  38, scale: 0.8 },
  ];
  return (
    <>
      <style>{`
        .pl-bot-${k} .pl-bot-leaf {
          transform-box: fill-box;
          transform-origin: 0% 50%;
          opacity: 0;
          transform: scale(0.6);
          animation: pl-bot-in-${k} 900ms cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes pl-bot-in-${k} {
          0%   { opacity: 0;    transform: scale(0.5) rotate(-6deg); }
          70%  { opacity: 0.82; }
          100% { opacity: 0.82; transform: scale(1) rotate(0deg); }
        }
        .pl-bot-${k} .pl-bot-stem,
        .pl-bot-${k} .pl-bot-rule {
          stroke-dasharray: var(--pl-bot-len, 800);
          stroke-dashoffset: var(--pl-bot-len, 800);
          animation: pl-bot-draw-${k} 1100ms cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes pl-bot-draw-${k} { to { stroke-dashoffset: 0; } }

        @media (prefers-reduced-motion: reduce) {
          .pl-bot-${k} .pl-bot-leaf { animation: none; opacity: 0.82; transform: none; }
          .pl-bot-${k} .pl-bot-stem,
          .pl-bot-${k} .pl-bot-rule { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 1440 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height }}
        className={`pl-bot-${k}`}
      >
        {/* Left + right horizontal rules */}
        <line className="pl-bot-rule" x1="40" y1={cy} x2={cx - 120} y2={cy} stroke={color} strokeWidth="1.25" strokeLinecap="round" opacity="0.55" style={{ ['--pl-bot-len' as string]: '900', animationDelay: '0ms' }} />
        <line className="pl-bot-rule" x1={cx + 120} y1={cy} x2="1400" y2={cy} stroke={color} strokeWidth="1.25" strokeLinecap="round" opacity="0.55" style={{ ['--pl-bot-len' as string]: '900', animationDelay: '120ms' }} />
        {/* Central stem */}
        <path
          className="pl-bot-stem"
          d={`M${cx} ${cy - 26} Q${cx + 2} ${cy} ${cx} ${cy + 26}`}
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          style={{ ['--pl-bot-len' as string]: '60', animationDelay: '60ms' }}
        />
        {/* Leaves */}
        {leaves.map((l, i) => {
          const lx = cx + l.dx;
          const ly = cy + l.dy;
          const w = 28 * l.scale;
          const h2 = 10 * l.scale;
          return (
            <g
              key={i}
              className="pl-bot-leaf"
              style={{ animationDelay: `${260 + i * 90}ms`, transformOrigin: `${lx}px ${ly}px` }}
              transform={`rotate(${l.rot} ${lx} ${ly})`}
            >
              <path
                d={`M${lx} ${ly} Q${lx + w * 0.5} ${ly - h2} ${lx + w} ${ly} Q${lx + w * 0.5} ${ly + h2} ${lx} ${ly} Z`}
                fill={color}
                opacity="0.82"
              />
              <line
                x1={lx}
                y1={ly}
                x2={lx + w}
                y2={ly}
                stroke={color}
                strokeWidth="0.75"
                opacity="0.4"
              />
            </g>
          );
        })}
        {/* Center seed/dot */}
        <circle cx={cx} cy={cy - 28} r="2.2" fill={color} opacity="0.85" />
      </svg>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// 2. PETALS — a line of soft teardrop petals drifting across
//    on a slow loop when `active`.
// ────────────────────────────────────────────────────────────────
function PetalsDivider({ color, height, active }: { color: string; height: number; active: boolean }) {
  const rawKey = useId();
  const k = rawKey.replace(/[^a-zA-Z0-9]/g, '');
  const petals = Array.from({ length: 14 }, (_, i) => ({
    x: (i + 0.5) * (1440 / 14),
    y: height / 2 + Math.sin(i * 1.3) * (height * 0.2),
    r: 4 + (i % 3),
    delay: i * 420,
  }));
  return (
    <>
      <style>{`
        /* Default: a static array of petals */
        .pl-petals-${k} .pl-petal { opacity: 0.85; }

        @media (prefers-reduced-motion: no-preference) {
          @keyframes pl-petals-drift-${k} {
            0%   { transform: translate3d(-40px, 0, 0); opacity: 0; }
            15%  { opacity: 0.9; }
            85%  { opacity: 0.9; }
            100% { transform: translate3d(40px, 0, 0); opacity: 0; }
          }
          .pl-petals-${k} .pl-petal {
            transform-origin: center;
            animation: pl-petals-drift-${k} 8s ease-in-out infinite;
            will-change: transform, opacity;
          }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 1440 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height }}
        className={`pl-petals-${k}`}
      >
        {/* base thin rule */}
        <line x1="0" y1={height / 2} x2="1440" y2={height / 2} stroke={color} strokeWidth="1" opacity="0.25" />
        {petals.map((p, i) => (
          <g
            key={i}
            className="pl-petal"
            style={{ animationDelay: `${p.delay}ms`, animationPlayState: active ? 'running' : 'paused' }}
          >
            <ellipse cx={p.x} cy={p.y} rx={p.r * 1.4} ry={p.r} fill={color} opacity="0.75" transform={`rotate(${-20 + (i % 5) * 10} ${p.x} ${p.y})`} />
          </g>
        ))}
      </svg>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// 3. INK — a watercolor/bleeding edge. Uses feTurbulence +
//    feDisplacementMap on a filled wave; the turbulence seed
//    shifts for a subtle living edge.
// ────────────────────────────────────────────────────────────────
function InkDivider({ color, height, active }: { color: string; height: number; active: boolean }) {
  const rawKey = useId();
  const k = rawKey.replace(/[^a-zA-Z0-9]/g, '');
  const filterId = `pl-ink-${k}`;
  const path = `M0,${height * 0.55} C240,${height * 0.3} 480,${height * 0.8} 720,${height * 0.5} C960,${height * 0.2} 1200,${height * 0.75} 1440,${height * 0.5} L1440,${height} L0,${height} Z`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 1440 ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height }}
    >
      <defs>
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="2" seed="3" result="noise">
            {active ? (
              <animate attributeName="baseFrequency" dur="14s" values="0.012 0.04;0.018 0.05;0.012 0.04" repeatCount="indefinite" />
            ) : null}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10">
            {active ? (
              <animate attributeName="scale" dur="10s" values="8;14;8" repeatCount="indefinite" />
            ) : null}
          </feDisplacementMap>
        </filter>
      </defs>
      <path d={path} fill={color} filter={`url(#${filterId})`} />
      {/* secondary darker wash for depth */}
      <path d={path} fill={color} opacity="0.35" transform={`translate(0 -4)`} filter={`url(#${filterId})`} />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// 4. FLOURISH — calligraphic swash centered between two rules.
//    Draws itself in with stroke-dashoffset when active.
// ────────────────────────────────────────────────────────────────
function FlourishDivider({ color, height, active }: { color: string; height: number; active: boolean }) {
  const rawKey = useId();
  const k = rawKey.replace(/[^a-zA-Z0-9]/g, '');
  const cx = 720;
  const cy = height / 2;
  // Hand-tuned swash: three loops that echo each other
  const swash = `M${cx - 150} ${cy}
    C${cx - 110} ${cy - 22}, ${cx - 70} ${cy + 22}, ${cx - 30} ${cy}
    C${cx - 10} ${cy - 14}, ${cx + 10} ${cy - 14}, ${cx + 30} ${cy}
    C${cx + 70} ${cy + 22}, ${cx + 110} ${cy - 22}, ${cx + 150} ${cy}`;
  return (
    <>
      <style>{`
        .pl-flr-${k} .pl-flr-swash {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: pl-flr-draw-${k} 1800ms cubic-bezier(0.65,0,0.35,1) forwards;
        }
        .pl-flr-${k} .pl-flr-rule {
          stroke-dasharray: 700;
          stroke-dashoffset: 700;
          animation: pl-flr-draw-${k} 1200ms cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes pl-flr-draw-${k} { to { stroke-dashoffset: 0; } }
        .pl-flr-${k} .pl-flr-dot {
          opacity: 0;
          animation: pl-flr-dot-${k} 800ms ease-out forwards;
          animation-delay: 1100ms;
        }
        @keyframes pl-flr-dot-${k} { to { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .pl-flr-${k} .pl-flr-swash,
          .pl-flr-${k} .pl-flr-rule { animation: none; stroke-dashoffset: 0; }
          .pl-flr-${k} .pl-flr-dot { animation: none; opacity: 1; }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 1440 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`pl-flr-${k}`}
        style={{ display: 'block', width: '100%', height }}
      >
        <line className="pl-flr-rule" x1="80" y1={cy} x2={cx - 180} y2={cy} stroke={color} strokeWidth="1" opacity="0.5" />
        <line className="pl-flr-rule" x1={cx + 180} y1={cy} x2="1360" y2={cy} stroke={color} strokeWidth="1" opacity="0.5" style={{ animationDelay: '180ms' }} />
        <path
          className="pl-flr-swash"
          d={swash}
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animationDelay: '80ms' }}
        />
        <circle className="pl-flr-dot" cx={cx} cy={cy} r="2.5" fill={color} />
        <circle className="pl-flr-dot" cx={cx - 170} cy={cy} r="1.6" fill={color} style={{ animationDelay: '1300ms' }} />
        <circle className="pl-flr-dot" cx={cx + 170} cy={cy} r="1.6" fill={color} style={{ animationDelay: '1300ms' }} />
      </svg>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// 5. SPARKLE — tiny stars + dots sprinkled along a line, each
//    twinkling with random offsets.
// ────────────────────────────────────────────────────────────────
function SparkleDivider({ color, height, active }: { color: string; height: number; active: boolean }) {
  const rawKey = useId();
  const k = rawKey.replace(/[^a-zA-Z0-9]/g, '');
  const cy = height / 2;
  const sparkles = Array.from({ length: 22 }, (_, i) => {
    // pseudo-random but deterministic
    const t = Math.sin(i * 12.9898) * 43758.5453;
    const rand = t - Math.floor(t);
    return {
      x: 40 + i * (1360 / 22),
      y: cy + (rand - 0.5) * (height * 0.5),
      size: 1.2 + rand * 2.8,
      isStar: i % 3 === 0,
      delay: (rand * 3000) | 0,
    };
  });
  return (
    <>
      <style>{`
        /* Default: static visible sparkles */
        .pl-spk-${k} .pl-spk { opacity: 0.85; }

        @media (prefers-reduced-motion: no-preference) {
          @keyframes pl-spk-${k} {
            0%, 100% { opacity: 0.15; transform: scale(0.7); }
            50%      { opacity: 1;    transform: scale(1.15); }
          }
          .pl-spk-${k} .pl-spk {
            transform-box: fill-box;
            transform-origin: center;
            animation: pl-spk-${k} 2.6s ease-in-out infinite;
          }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 1440 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`pl-spk-${k}`}
        style={{ display: 'block', width: '100%', height }}
      >
        <line x1="0" y1={cy} x2="1440" y2={cy} stroke={color} strokeWidth="0.75" opacity="0.2" />
        {sparkles.map((s, i) => (
          <g
            key={i}
            className="pl-spk"
            style={{ animationDelay: `${s.delay}ms`, animationPlayState: active ? 'running' : 'paused' }}
          >
            {s.isStar ? (
              <path
                d={`M${s.x} ${s.y - s.size * 2} L${s.x + s.size * 0.5} ${s.y - s.size * 0.5} L${s.x + s.size * 2} ${s.y} L${s.x + s.size * 0.5} ${s.y + s.size * 0.5} L${s.x} ${s.y + s.size * 2} L${s.x - s.size * 0.5} ${s.y + s.size * 0.5} L${s.x - s.size * 2} ${s.y} L${s.x - s.size * 0.5} ${s.y - s.size * 0.5} Z`}
                fill={color}
                opacity="0.9"
              />
            ) : (
              <circle cx={s.x} cy={s.y} r={s.size} fill={color} opacity="0.85" />
            )}
          </g>
        ))}
      </svg>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// 6. RIBBON — a stitched dashed thread that flows left to right.
// ────────────────────────────────────────────────────────────────
function RibbonDivider({ color, height, active }: { color: string; height: number; active: boolean }) {
  const rawKey = useId();
  const k = rawKey.replace(/[^a-zA-Z0-9]/g, '');
  const path = `M0 ${height * 0.5} C240 ${height * 0.2} 480 ${height * 0.8} 720 ${height * 0.5} C960 ${height * 0.2} 1200 ${height * 0.8} 1440 ${height * 0.5}`;
  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes pl-rib-${k} { to { stroke-dashoffset: -48; } }
          .pl-rib-${k} .pl-rib-thread {
            animation: pl-rib-${k} 3.2s linear infinite;
          }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 1440 ${height}`}
        preserveAspectRatio="none"
        className={`pl-rib-${k}`}
        style={{ display: 'block', width: '100%', height }}
      >
        {/* soft shadow thread */}
        <path d={path} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.18" />
        {/* stitched thread */}
        <path
          className="pl-rib-thread"
          d={path}
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="10 6"
          style={{ animationPlayState: active ? 'running' : 'paused' }}
        />
      </svg>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// 7. CONFETTI — small squares + triangles raining down, great
//    for birthday/playful vibes.
// ────────────────────────────────────────────────────────────────
function ConfettiDivider({ color, height, active }: { color: string; height: number; active: boolean }) {
  const rawKey = useId();
  const k = rawKey.replace(/[^a-zA-Z0-9]/g, '');
  const bits = Array.from({ length: 26 }, (_, i) => {
    const t = Math.sin(i * 91.33) * 43758.5453;
    const rand = t - Math.floor(t);
    return {
      x: (i + 0.5) * (1440 / 26) + (rand - 0.5) * 20,
      size: 3 + rand * 4,
      shape: i % 3,
      hueShift: (rand - 0.5) * 30,
      delay: (rand * 2800) | 0,
    };
  });
  return (
    <>
      <style>{`
        /* Reduced-motion / paused: confetti is purely decorative
           when raining, so just hide it rather than freeze at the
           top edge looking weird. */
        .pl-conf-${k} .pl-conf { opacity: 0; }

        @media (prefers-reduced-motion: no-preference) {
          @keyframes pl-conf-${k} {
            0%   { transform: translate3d(0, -20px, 0) rotate(0deg);   opacity: 0; }
            15%  { opacity: 1; }
            100% { transform: translate3d(0, ${height + 12}px, 0) rotate(220deg); opacity: 0; }
          }
          .pl-conf-${k} .pl-conf {
            transform-box: fill-box;
            transform-origin: center;
            animation: pl-conf-${k} 3.4s ease-in infinite;
            will-change: transform, opacity;
          }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 1440 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`pl-conf-${k}`}
        style={{ display: 'block', width: '100%', height }}
      >
        {bits.map((b, i) => {
          const common = {
            className: 'pl-conf',
            fill: color,
            opacity: 0.85,
            style: { animationDelay: `${b.delay}ms`, animationPlayState: active ? 'running' : 'paused' as const },
          };
          if (b.shape === 0) {
            return <rect key={i} x={b.x - b.size / 2} y={-b.size} width={b.size} height={b.size * 1.4} {...common} />;
          }
          if (b.shape === 1) {
            return <circle key={i} cx={b.x} cy={0} r={b.size * 0.55} {...common} />;
          }
          return (
            <path
              key={i}
              d={`M${b.x} ${-b.size} L${b.x + b.size} ${b.size * 0.3} L${b.x - b.size} ${b.size * 0.3} Z`}
              {...common}
            />
          );
        })}
      </svg>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// 8. CONSTELLATION — dots connected by thin lines. Lines draw
//    in, dots twinkle.
// ────────────────────────────────────────────────────────────────
function ConstellationDivider({ color, height, active }: { color: string; height: number; active: boolean }) {
  const rawKey = useId();
  const k = rawKey.replace(/[^a-zA-Z0-9]/g, '');
  const nodes = Array.from({ length: 11 }, (_, i) => {
    const t = Math.sin(i * 77.1) * 43758.5453;
    const rand = t - Math.floor(t);
    return {
      x: 80 + i * ((1440 - 160) / 10),
      y: height * 0.35 + rand * (height * 0.4),
      r: 1.8 + (i % 3) * 0.6,
      delay: i * 140,
    };
  });
  return (
    <>
      <style>{`
        .pl-cns-${k} .pl-cns-edge {
          stroke-dasharray: 260;
          stroke-dashoffset: 260;
          animation: pl-cns-draw-${k} 900ms ease-out forwards;
        }
        @keyframes pl-cns-draw-${k} { to { stroke-dashoffset: 0; } }
        @keyframes pl-cns-twinkle-${k} {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 1; }
        }
        .pl-cns-${k} .pl-cns-node {
          transform-box: fill-box;
          transform-origin: center;
          animation: pl-cns-twinkle-${k} 2.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .pl-cns-${k} .pl-cns-edge { animation: none; stroke-dashoffset: 0; }
          .pl-cns-${k} .pl-cns-node { animation: none; opacity: 0.85; }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 1440 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`pl-cns-${k}`}
        style={{ display: 'block', width: '100%', height }}
      >
        {nodes.slice(0, -1).map((n, i) => {
          const n2 = nodes[i + 1];
          return (
            <line
              key={`e${i}`}
              className="pl-cns-edge"
              x1={n.x}
              y1={n.y}
              x2={n2.x}
              y2={n2.y}
              stroke={color}
              strokeWidth="0.75"
              opacity="0.55"
              strokeLinecap="round"
              style={{ animationDelay: `${n.delay}ms` }}
            />
          );
        })}
        {nodes.map((n, i) => (
          <circle
            key={`n${i}`}
            className="pl-cns-node"
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={color}
            style={{ animationDelay: `${n.delay + 200}ms` }}
          />
        ))}
      </svg>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────
export function SectionDivider({
  style,
  color,
  bgColor,
  height = 80,
  flip = false,
  flop = false,
  animated = true,
}: SectionDividerProps) {
  const { active } = useMotionGate(animated);

  if (style === 'none') return null;

  const isClassic =
    style === 'wave' || style === 'wave2' || style === 'diagonal' ||
    style === 'zigzag' || style === 'torn' || style === 'chevron' || style === 'arc';

  let body: React.ReactNode = null;
  if (isClassic) {
    body = <ClassicShape style={style} color={color} height={height} active={active} />;
  } else if (style === 'botanical') {
    body = <BotanicalDivider color={color} height={height} active={active} />;
  } else if (style === 'petals') {
    body = <PetalsDivider color={color} height={height} active={active} />;
  } else if (style === 'ink') {
    body = <InkDivider color={color} height={height} active={active} />;
  } else if (style === 'flourish') {
    body = <FlourishDivider color={color} height={height} active={active} />;
  } else if (style === 'sparkle') {
    body = <SparkleDivider color={color} height={height} active={active} />;
  } else if (style === 'ribbon') {
    body = <RibbonDivider color={color} height={height} active={active} />;
  } else if (style === 'confetti') {
    body = <ConfettiDivider color={color} height={height} active={active} />;
  } else if (style === 'constellation') {
    body = <ConstellationDivider color={color} height={height} active={active} />;
  }

  return (
    <DividerShell height={height} bgColor={bgColor} flip={flip} flop={flop}>
      {body}
    </DividerShell>
  );
}
