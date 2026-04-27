'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/HeroAtmosphere.tsx
//
// The living backdrop for the landing hero. Four layers, each
// doing a different job, stacked into one absolute-positioned
// slot so the hero's typography reads on top unaffected.
//
// 1. PearshellMesh  — paper-design shader in the cream/rind/pearl
//                     palette; "warm fog" that drifts slowly.
// 2. LoomThreads    — SVG of horizontal threads with a shuttle
//                     dash-offset animation. Literal loom motion
//                     tying the marketing surface to the name.
// 3. PearlHalo      — cursor-tracked radial gradient that
//                     follows the pointer at ~30% strength,
//                     giving the hero a "cursor listens" feel.
// 4. Vignette       — top-bottom feather so the hero edges
//                     soften into the next section's cream.
//
// All layers respect prefers-reduced-motion: mesh freezes,
// threads hold their position, halo falls back to a static
// centered glow.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { MeshGradient as PaperMeshGradient } from '@paper-design/shaders-react';

// Pearshell-derived mesh colours. Tuned so the mesh reads as a
// warm, pearlescent glow — not a rainbow. Four stops per the
// paper-design API; lighter at top, warmer at the base.
const MESH_COLORS = ['#FBF4DC', '#F8F1E6', '#EAD4D6', '#E9D9A8'];

interface HeroAtmosphereProps {
  /** Controls mesh animation speed (0 = frozen). Default 0.12. */
  speed?: number;
  /** Opacity of the mesh layer (0–1). Default 0.55. */
  meshOpacity?: number;
}

export function HeroAtmosphere({ speed = 0.12, meshOpacity = 0.55 }: HeroAtmosphereProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Respect the OS reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Cursor-tracked halo. Uses rAF so we coalesce mousemove into
  // a single layout read per frame — scrolling + moving stays
  // smooth on cheap laptops.
  useEffect(() => {
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    const halo = haloRef.current;
    if (!wrap || !halo) return;

    let pending = false;
    let lastX = 50;
    let lastY = 40;

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      lastX = ((e.clientX - rect.left) / rect.width) * 100;
      lastY = ((e.clientY - rect.top) / rect.height) * 100;
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => {
          halo.style.setProperty('--halo-x', `${lastX}%`);
          halo.style.setProperty('--halo-y', `${lastY}%`);
          pending = false;
        });
      }
    };

    wrap.addEventListener('pointermove', onMove, { passive: true });
    return () => wrap.removeEventListener('pointermove', onMove);
  }, [reducedMotion]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* ── Layer 1: shader mesh ───────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          opacity: meshOpacity,
          mixBlendMode: 'screen',
        }}
      >
        <PaperMeshGradient
          colors={MESH_COLORS}
          speed={reducedMotion ? 0 : speed}
          distortion={0.55}
          swirl={0.28}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* ── Layer 2: loom threads (SVG, CSS-animated) ──────── */}
      <LoomThreads reducedMotion={reducedMotion} />

      {/* ── Layer 3: cursor-tracked pearl halo ─────────────── */}
      <div
        ref={haloRef}
        className="pl-hero-halo"
        style={
          {
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(420px circle at var(--halo-x, 50%) var(--halo-y, 40%), color-mix(in oklab, var(--pl-pearl-c) 42%, transparent), transparent 70%)',
            mixBlendMode: 'plus-lighter',
            transition: reducedMotion ? 'none' : 'background 180ms linear',
            opacity: reducedMotion ? 0.5 : 0.9,
          } as React.CSSProperties
        }
      />

      {/* ── Layer 4: top + bottom feather into the page ────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, color-mix(in oklab, var(--pl-cream) 55%, transparent) 0%, transparent 14%, transparent 82%, color-mix(in oklab, var(--pl-cream) 80%, transparent) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LoomThreads — horizontal SVG strands with a dash-offset
// travel animation. Each thread has a phase offset so the
// shuttle never reads as a uniform sweep.
// ─────────────────────────────────────────────────────────────
function LoomThreads({ reducedMotion }: { reducedMotion: boolean }) {
  // Six threads spaced across the vertical axis. Opacity drops
  // toward the ends so they feather into the page.
  const threads = Array.from({ length: 6 }, (_, i) => {
    const y = 14 + i * 13; // 14 → 79 percent
    const edge = Math.abs(i - 2.5) / 2.5; // 0 = centre, 1 = edge
    const opacity = 0.22 - edge * 0.12;
    const delay = -i * 1.7;
    return { y, opacity, delay };
  });

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <linearGradient id="pl-hero-thread-warp" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--pl-bruise)" stopOpacity="0" />
          <stop offset="35%" stopColor="var(--pl-bruise)" stopOpacity="0.55" />
          <stop offset="65%" stopColor="var(--pl-pearl-c)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--pl-pearl-b)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {threads.map((t, i) => (
        <line
          key={i}
          x1="-5"
          x2="105"
          y1={t.y}
          y2={t.y}
          stroke="url(#pl-hero-thread-warp)"
          strokeWidth="0.22"
          strokeLinecap="round"
          strokeDasharray="0.08 0.04"
          opacity={t.opacity}
          style={{
            animation: reducedMotion
              ? undefined
              : `pl-weave-travel 9.2s linear infinite`,
            animationDelay: `${t.delay}s`,
          }}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {/* A single pearl bead drifting along the middle thread —
          an extra beat of motion that's always visible without
          being busy. */}
      {!reducedMotion && (
        <circle r="0.6" fill="var(--pl-pearl-a)" opacity="0.85">
          <animateMotion
            dur="11s"
            repeatCount="indefinite"
            path="M -5 46 Q 30 44 60 47 T 110 45"
          />
        </circle>
      )}
    </svg>
  );
}
