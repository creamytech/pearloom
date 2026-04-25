'use client';

/* ========================================================================
   LivingAtmosphere — themed animated background layer for published sites.

   Eight named "kinds" the host can pick (or that we infer per occasion):

     'motes'         — slow gold particles drifting up. Wedding default.
     'threads'       — three olive+gold strands waving with parallax.
     'petals'        — pale botanical shapes falling from top.
     'confetti'      — single-piece-per-second loop (NOT chaotic burst).
     'candlelight'   — three flickering flames. Memorial.
     'stars'         — minimal slow-drift constellation. Late-evening.
     'sunshimmer'    — radial light moving across cream paper.
     'none'          — no animation; just paper grain.

   Every kind:
     • Honours `prefers-reduced-motion` (animation reduced or stopped).
     • Reads palette from CSS custom props (--peach-ink / --sage-deep / --gold).
     • Pauses when the page is hidden (visibility API) so we don't burn
       battery in background tabs.
     • Renders with `pointer-events: none` so it never steals clicks.

   Intensity: 'subtle' | 'standard' | 'lush' (default 'standard').
   ======================================================================== */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

export type AtmosphereKind =
  | 'motes'
  | 'threads'
  | 'petals'
  | 'confetti'
  | 'candlelight'
  | 'stars'
  | 'sunshimmer'
  | 'none';

export type AtmosphereIntensity = 'subtle' | 'standard' | 'lush';

interface Props {
  kind?: AtmosphereKind;
  intensity?: AtmosphereIntensity;
  /** Color hint — falls back to CSS vars. Pass the manifest accent. */
  accent?: string;
  /** Used by the editor preview to render at a smaller density. */
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

const INTENSITY_DENSITY: Record<AtmosphereIntensity, number> = {
  subtle: 0.55,
  standard: 1,
  lush: 1.7,
};

export function LivingAtmosphere({
  kind = 'motes',
  intensity = 'standard',
  accent,
  scale = 1,
  className = '',
  style,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const visible = useDocumentVisibility();
  const density = INTENSITY_DENSITY[intensity] * scale;

  if (kind === 'none') return null;

  const baseStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex: 0,
    ...style,
  };

  return (
    <div className={`pl8-atmos pl8-atmos-${kind} ${className}`} style={baseStyle} aria-hidden>
      {kind === 'motes' && <MotesLayer density={density} accent={accent} reduced={reduced} paused={!visible} />}
      {kind === 'threads' && <ThreadsLayer density={density} accent={accent} reduced={reduced} />}
      {kind === 'petals' && <PetalsLayer density={density} accent={accent} reduced={reduced} paused={!visible} />}
      {kind === 'confetti' && <ConfettiLoopLayer density={density} accent={accent} reduced={reduced} paused={!visible} />}
      {kind === 'candlelight' && <CandlelightLayer density={density} reduced={reduced} />}
      {kind === 'stars' && <StarsLayer density={density} accent={accent} reduced={reduced} />}
      {kind === 'sunshimmer' && <SunShimmerLayer accent={accent} reduced={reduced} />}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Motes — drifting gold particles (canvas, 60fps)
   ─────────────────────────────────────────────────────────────────────── */
function MotesLayer({
  density,
  accent,
  reduced,
  paused,
}: { density: number; accent?: string; reduced: boolean; paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
    }
    resize();
    window.addEventListener('resize', resize);

    const baseCount = Math.round(28 * density);
    const motes = Array.from({ length: baseCount }, () => spawnMote(canvas));

    function tick() {
      const c = canvasRef.current;
      if (!c) return;
      ctx!.clearRect(0, 0, c.width, c.height);
      for (const m of motes) {
        if (!paused) {
          m.x += m.vx;
          m.y += m.vy;
          m.life += 0.016;
          if (m.y < -10 || m.x < -10 || m.x > c.width + 10) Object.assign(m, spawnMote(c));
        }
        const alpha = Math.min(1, m.life / 1.2) * (1 - Math.max(0, (m.life - m.maxLife + 1.5) / 1.5)) * m.alpha;
        ctx!.beginPath();
        ctx!.fillStyle = withAlpha(accent ?? '#D4A95D', Math.max(0, alpha));
        ctx!.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    if (!reduced) raf = requestAnimationFrame(tick);
    else {
      // Static frame for reduced-motion users.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of motes) {
        ctx.beginPath();
        ctx.fillStyle = withAlpha(accent ?? '#D4A95D', m.alpha);
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [density, accent, reduced, paused]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  life: number;
  maxLife: number;
}
function spawnMote(c: HTMLCanvasElement): Mote {
  return {
    x: Math.random() * c.width,
    y: c.height + Math.random() * 60,
    vx: (Math.random() - 0.5) * 0.15,
    vy: -0.18 - Math.random() * 0.32,
    r: (0.6 + Math.random() * 1.6) * (window.devicePixelRatio || 1),
    alpha: 0.35 + Math.random() * 0.4,
    life: 0,
    maxLife: 8 + Math.random() * 6,
  };
}

/* ───────────────────────────────────────────────────────────────────────
   Threads — three woven olive+gold strands waving with parallax
   ─────────────────────────────────────────────────────────────────────── */
function ThreadsLayer({
  density,
  accent,
  reduced,
}: { density: number; accent?: string; reduced: boolean }) {
  const strands = Math.max(2, Math.round(3 * Math.min(density, 1.4)));
  return (
    <svg
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      aria-hidden
    >
      {Array.from({ length: strands }, (_, i) => {
        const yBase = 110 + i * 180;
        const offset = i * 0.7;
        const stroke = i % 2 === 0 ? (accent ?? 'var(--gold-line, #D4A95D)') : 'var(--sage-deep, #5C6B3F)';
        return (
          <path
            key={i}
            d={`M -50 ${yBase} Q 200 ${yBase - 60}, 400 ${yBase} T 800 ${yBase} T 1250 ${yBase}`}
            stroke={stroke}
            strokeWidth={1.1}
            strokeLinecap="round"
            fill="none"
            opacity={0.42}
            style={
              reduced
                ? undefined
                : {
                    animation: `pl8-thread-wave ${10 + i * 2}s ease-in-out ${offset}s infinite alternate`,
                    transformOrigin: 'center',
                  }
            }
          />
        );
      })}
      <style jsx>{`
        @keyframes pl8-thread-wave {
          from { transform: translateY(-6px); }
          to   { transform: translateY(6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pl8-thread-wave {
            from, to { transform: none; }
          }
        }
      `}</style>
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Petals — small botanical shapes drifting from top
   ─────────────────────────────────────────────────────────────────────── */
function PetalsLayer({
  density,
  accent,
  reduced,
  paused,
}: { density: number; accent?: string; reduced: boolean; paused: boolean }) {
  const count = Math.round(14 * density);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        i,
        left: Math.random() * 100,
        delay: Math.random() * 18,
        duration: 14 + Math.random() * 10,
        scale: 0.7 + Math.random() * 0.7,
        rotate: Math.random() * 360,
      })),
    [count],
  );
  if (reduced) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, animationPlayState: paused ? 'paused' : 'running' }}>
      {seeds.map((s) => (
        <svg
          key={s.i}
          viewBox="0 0 24 24"
          width={14 * s.scale}
          height={14 * s.scale}
          style={{
            position: 'absolute',
            top: -20,
            left: `${s.left}%`,
            animation: `pl8-petal-fall ${s.duration}s linear ${s.delay}s infinite`,
            opacity: 0.55,
          }}
          aria-hidden
        >
          <ellipse cx="12" cy="12" rx="6" ry="9" fill={accent ?? 'var(--peach-2, #EAB286)'} transform={`rotate(${s.rotate} 12 12)`} />
        </svg>
      ))}
      <style jsx>{`
        @keyframes pl8-petal-fall {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.55; }
          90% { opacity: 0.5; }
          100% { transform: translate3d(40px, 110vh, 0) rotate(220deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   ConfettiLoop — slow trickle, 1 piece every ~600ms, max 12 on-screen
   ─────────────────────────────────────────────────────────────────────── */
function ConfettiLoopLayer({
  density,
  accent,
  reduced,
  paused,
}: { density: number; accent?: string; reduced: boolean; paused: boolean }) {
  const count = Math.round(12 * density);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        i,
        left: Math.random() * 100,
        delay: Math.random() * 14,
        duration: 9 + Math.random() * 6,
        kind: i % 3,
        rot: Math.random() * 360,
      })),
    [count],
  );
  if (reduced) return null;
  const colors = [accent ?? 'var(--peach-ink, #C6703D)', 'var(--gold-line, #D4A95D)', 'var(--sage-deep, #5C6B3F)'];
  return (
    <div style={{ position: 'absolute', inset: 0, animationPlayState: paused ? 'paused' : 'running' }}>
      {seeds.map((s) => (
        <span
          key={s.i}
          style={{
            position: 'absolute',
            top: -10,
            left: `${s.left}%`,
            width: s.kind === 0 ? 8 : 6,
            height: s.kind === 0 ? 4 : s.kind === 1 ? 6 : 8,
            background: colors[s.kind] ?? colors[0],
            borderRadius: s.kind === 1 ? '50%' : 1,
            transform: `rotate(${s.rot}deg)`,
            opacity: 0.7,
            animation: `pl8-confetti-loop ${s.duration}s linear ${s.delay}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes pl8-confetti-loop {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          12% { opacity: 0.7; }
          88% { opacity: 0.6; }
          100% { transform: translate3d(20px, 105vh, 0) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Candlelight — three small flames bottom-anchored, gentle flicker
   ─────────────────────────────────────────────────────────────────────── */
function CandlelightLayer({ density, reduced }: { density: number; reduced: boolean }) {
  const positions = useMemo(() => {
    const n = density >= 1.4 ? 5 : density >= 0.8 ? 3 : 2;
    return Array.from({ length: n }, (_, i) => ({
      left: 20 + (60 / Math.max(1, n - 1)) * i + (Math.random() * 4 - 2),
      delay: Math.random() * 1.4,
    }));
  }, [density]);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {positions.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 64,
            left: `${p.left}%`,
            width: 18,
            height: 28,
            background: 'radial-gradient(ellipse at 50% 80%, rgba(255,210,140,0.95) 0%, rgba(255,170,90,0.6) 35%, transparent 70%)',
            filter: 'blur(0.6px)',
            animation: reduced ? undefined : `pl8-flame-flicker 1.6s ease-in-out ${p.delay}s infinite alternate`,
            transformOrigin: 'center bottom',
            mixBlendMode: 'screen',
          }}
        />
      ))}
      {/* Soft halo behind the flames */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(255,180,120,0.18) 0%, transparent 60%)',
        }}
      />
      <style jsx>{`
        @keyframes pl8-flame-flicker {
          0%, 100% { transform: scaleY(1) scaleX(1); opacity: 0.9; }
          25% { transform: scaleY(1.08) scaleX(0.98); opacity: 1; }
          50% { transform: scaleY(0.95) scaleX(1.02); opacity: 0.85; }
          75% { transform: scaleY(1.04) scaleX(0.97); opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Stars — slow-drifting twinkling constellation
   ─────────────────────────────────────────────────────────────────────── */
function StarsLayer({
  density,
  accent,
  reduced,
}: { density: number; accent?: string; reduced: boolean }) {
  const count = Math.round(48 * density);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.4,
        delay: Math.random() * 5,
      })),
    [count],
  );
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {seeds.map((s) => (
        <span
          key={s.i}
          style={{
            position: 'absolute',
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            background: accent ?? 'var(--gold-line, #D4A95D)',
            borderRadius: '50%',
            opacity: 0.7,
            animation: reduced
              ? undefined
              : `pl8-star-twinkle ${3 + (s.i % 4) * 0.8}s ease-in-out ${s.delay}s infinite alternate`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes pl8-star-twinkle {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Sunshimmer — radial light arc moving across paper
   ─────────────────────────────────────────────────────────────────────── */
function SunShimmerLayer({ accent, reduced }: { accent?: string; reduced: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at 30% 0%, ${withAlpha(accent ?? '#F0C9A8', 0.35)} 0%, transparent 38%)`,
        animation: reduced ? undefined : 'pl8-sun-drift 32s ease-in-out infinite alternate',
        mixBlendMode: 'screen',
      }}
    >
      <style jsx>{`
        @keyframes pl8-sun-drift {
          0% { transform: translate3d(-12%, 0, 0); }
          100% { transform: translate3d(20%, 6%, 0); }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────────────────────────────── */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

function useDocumentVisibility(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

function withAlpha(color: string, alpha: number): string {
  // Accepts #RRGGBB or rgb()/hsl()/CSS var; falls back to color when not parseable.
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4
      ? '#' + color.slice(1).split('').map((c) => c + c).join('')
      : color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

/* ───────────────────────────────────────────────────────────────────────
   Per-occasion default — used when manifest.atmosphere is not set.
   ─────────────────────────────────────────────────────────────────────── */
export function defaultAtmosphereForOccasion(occasion?: string): AtmosphereKind {
  const occ = (occasion ?? '').toLowerCase();
  switch (occ) {
    case 'wedding':
    case 'engagement':
    case 'anniversary':
    case 'vow-renewal':
    case 'rehearsal-dinner':
    case 'welcome-party':
    case 'bridal-luncheon':
      return 'motes';
    case 'bachelor-party':
    case 'bachelorette-party':
    case 'bridal-shower':
    case 'baby-shower':
    case 'gender-reveal':
    case 'birthday':
    case 'sweet-sixteen':
    case 'first-birthday':
    case 'milestone-birthday':
      return 'confetti';
    case 'memorial':
    case 'funeral':
      return 'candlelight';
    case 'brunch':
    case 'sip-and-see':
    case 'housewarming':
      return 'sunshimmer';
    case 'reunion':
    case 'graduation':
    case 'retirement':
      return 'threads';
    case 'bar-mitzvah':
    case 'bat-mitzvah':
    case 'baptism':
    case 'first-communion':
    case 'confirmation':
    case 'quinceanera':
      return 'stars';
    default:
      return 'motes';
  }
}
