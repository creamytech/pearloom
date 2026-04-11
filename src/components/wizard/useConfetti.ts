'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/useConfetti.ts
//
// Lightweight confetti burst — no external library. Renders a
// handful of SVG "petal" shapes that fly outward with physics
// and fade. Themed by the active palette so each burst feels
// like a celebration specific to the user's site.
//
// Usage:
//   const fire = useConfetti();
//   <button onClick={(e) => fire(e, { colors: ['#E84393', '#F8C000'] })}>
//     Pick palette
//   </button>
//
// The hook returns a function that renders a burst at the
// pointer position of a mouse/pointer event. On touch devices
// it falls back to the center of the target element.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef } from 'react';

export interface ConfettiOptions {
  /** 3-6 hex colors used for the pieces. Defaults to olive mist. */
  colors?: string[];
  /** Number of pieces per burst. Default 18. */
  count?: number;
  /** Spread radius in pixels. Default 140. */
  spread?: number;
  /** Total lifetime of the burst in ms. Default 1100. */
  lifetimeMs?: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotate: number;
  vr: number;
  color: string;
  size: number;
  shape: 'circle' | 'rect' | 'petal';
}

const DEFAULT_COLORS = ['#A3B18A', '#D4A574', '#E8C39C', '#C4A96A'];

const CONTAINER_ID = 'pear-confetti-layer';

function ensureContainer(): HTMLDivElement {
  let el = document.getElementById(CONTAINER_ID) as HTMLDivElement | null;
  if (el) return el;
  el = document.createElement('div');
  el.id = CONTAINER_ID;
  el.style.cssText = [
    'position:fixed',
    'inset:0',
    'pointer-events:none',
    'z-index:9999',
    'overflow:hidden',
  ].join(';');
  document.body.appendChild(el);
  return el;
}

function randomPiece(x: number, y: number, color: string, spread: number): ConfettiPiece {
  const angle = Math.random() * Math.PI * 2;
  const speed = 3 + Math.random() * 6;
  const shapes: ConfettiPiece['shape'][] = ['circle', 'rect', 'petal'];
  return {
    x,
    y,
    vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.6),
    vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.6) - 2 - Math.random() * 2,
    rotate: Math.random() * 360,
    vr: (Math.random() - 0.5) * 14,
    color,
    size: 6 + Math.random() * 10,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    // Spread stays in scope so the fire fn can scale radius
    ...{ _spread: spread },
  } as ConfettiPiece;
}

function renderPieceElement(p: ConfettiPiece): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:absolute',
    `left:${p.x}px`,
    `top:${p.y}px`,
    `width:${p.size}px`,
    `height:${p.size}px`,
    'pointer-events:none',
    `background:${p.shape === 'petal' ? 'transparent' : p.color}`,
    `border-radius:${p.shape === 'circle' ? '50%' : p.shape === 'petal' ? '50% 50% 50% 0' : '2px'}`,
    `transform:rotate(${p.rotate}deg)`,
    'will-change:transform,opacity',
  ].join(';');
  if (p.shape === 'petal') {
    el.style.background = p.color;
  }
  return el;
}

export function useConfetti() {
  // Track active pieces so we can clean up if the component unmounts
  // mid-burst. Not strictly necessary since the container lives on
  // document.body, but avoids leaking references if the hook's host
  // gets torn down during an animation.
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const fire = useCallback(
    (
      eventOrElement: React.MouseEvent | HTMLElement | { x: number; y: number },
      options: ConfettiOptions = {},
    ) => {
      if (typeof window === 'undefined') return;

      const {
        colors = DEFAULT_COLORS,
        count = 18,
        spread = 140,
        lifetimeMs = 1100,
      } = options;

      // Figure out the origin point
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;

      if ('clientX' in eventOrElement && 'clientY' in eventOrElement) {
        x = eventOrElement.clientX;
        y = eventOrElement.clientY;
      } else if (eventOrElement instanceof HTMLElement) {
        const rect = eventOrElement.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else if ('x' in eventOrElement && 'y' in eventOrElement) {
        x = eventOrElement.x;
        y = eventOrElement.y;
      }

      const container = ensureContainer();
      const pieces: Array<{ p: ConfettiPiece; el: HTMLDivElement }> = [];

      for (let i = 0; i < count; i++) {
        const color = colors[i % colors.length];
        const p = randomPiece(x, y, color, spread);
        const el = renderPieceElement(p);
        container.appendChild(el);
        pieces.push({ p, el });
      }

      const startedAt = performance.now();
      const gravity = 0.35;
      const drag = 0.985;

      const tick = (t: number) => {
        const elapsed = t - startedAt;
        const progress = elapsed / lifetimeMs;
        if (progress >= 1) {
          pieces.forEach(({ el }) => el.remove());
          rafRef.current = null;
          return;
        }

        const fade = 1 - progress;
        pieces.forEach(({ p, el }) => {
          p.vx *= drag;
          p.vy = p.vy * drag + gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.rotate += p.vr;
          el.style.left = `${p.x}px`;
          el.style.top = `${p.y}px`;
          el.style.transform = `rotate(${p.rotate}deg)`;
          el.style.opacity = String(fade);
        });

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  return fire;
}
