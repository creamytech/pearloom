'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/CustomCursor.tsx
// Replaces the OS cursor with a custom SVG shape that follows
// the pointer with a smooth spring-like lag.
// Only renders on non-touch devices (pointer: fine).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

type CursorShape = 'none' | 'pearl' | 'heart' | 'ring' | 'petal' | 'star';

interface CustomCursorProps {
  shape: CursorShape;
  accentColor?: string;
}

function CursorSVG({ shape, color }: { shape: CursorShape; color: string }) {
  switch (shape) {
    case 'pearl':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" fill={color} opacity="0.9" />
          <circle cx="9" cy="9" r="2.5" fill="white" opacity="0.45" />
          <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="0.8" opacity="0.3" />
        </svg>
      );
    case 'heart':
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M14 23s-9-6.2-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.8-9 12-9 12z"
            fill={color}
            opacity="0.9"
            stroke="white"
            strokeWidth="0.5"
            strokeOpacity="0.4"
          />
        </svg>
      );
    case 'ring':
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="8" stroke={color} strokeWidth="3" opacity="0.9" />
          <circle cx="13" cy="13" r="3" fill={color} opacity="0.6" />
          {/* Diamond on top */}
          <polygon points="13,1 15,5 13,9 11,5" fill={color} opacity="0.95" />
        </svg>
      );
    case 'petal':
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <ellipse cx="13" cy="8" rx="4" ry="7" fill={color} opacity="0.75" transform="rotate(0 13 13)" />
          <ellipse cx="13" cy="8" rx="4" ry="7" fill={color} opacity="0.65" transform="rotate(72 13 13)" />
          <ellipse cx="13" cy="8" rx="4" ry="7" fill={color} opacity="0.65" transform="rotate(144 13 13)" />
          <ellipse cx="13" cy="8" rx="4" ry="7" fill={color} opacity="0.65" transform="rotate(216 13 13)" />
          <ellipse cx="13" cy="8" rx="4" ry="7" fill={color} opacity="0.65" transform="rotate(288 13 13)" />
          <circle cx="13" cy="13" r="2.5" fill="white" opacity="0.8" />
        </svg>
      );
    case 'star':
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <polygon
            points="14,2 16.5,10.5 25,10.5 18.5,15.5 21,24 14,19 7,24 9.5,15.5 3,10.5 11.5,10.5"
            fill={color}
            opacity="0.9"
            stroke="white"
            strokeWidth="0.5"
            strokeOpacity="0.4"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function CustomCursor({ shape, accentColor = '#5C6B3F' }: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -100, y: -100 });
  const smoothRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    if (shape === 'none') return;

    // Only activate on fine pointer (non-touch) devices
    if (!window.matchMedia('(pointer: fine)').matches) return;

    // Hide default cursor on entire page
    const style = document.createElement('style');
    style.id = 'pl-custom-cursor-style';
    style.textContent = '*, *::before, *::after { cursor: none !important; }';
    document.head.appendChild(style);

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };

    const onDown = () => setClicking(true);
    const onUp = () => setClicking(false);
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    // Spring-lerp the cursor position on rAF
    const LERP_FACTOR = 0.18;
    const TRAIL_LERP = 0.09;

    const tick = () => {
      smoothRef.current.x += (posRef.current.x - smoothRef.current.x) * LERP_FACTOR;
      smoothRef.current.y += (posRef.current.y - smoothRef.current.y) * LERP_FACTOR;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${smoothRef.current.x - 14}px, ${smoothRef.current.y - 14}px)`;
      }

      if (trailRef.current) {
        const tx = smoothRef.current.x + (posRef.current.x - smoothRef.current.x) * TRAIL_LERP;
        const ty = smoothRef.current.y + (posRef.current.y - smoothRef.current.y) * TRAIL_LERP;
        trailRef.current.style.transform = `translate(${tx - 4}px, ${ty - 4}px)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(rafRef.current);
      document.getElementById('pl-custom-cursor-style')?.remove();
    };
  }, [shape, visible]);

  if (shape === 'none') return null;

  return (
    <>
      {/* Main cursor shape */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 99999,
          pointerEvents: 'none',
          opacity: visible ? 1 : 0,
          transform: `scale(${clicking ? 0.8 : 1})`,
          transition: 'opacity 0.2s, transform 0.1s',
          willChange: 'transform',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))',
        }}
      >
        <CursorSVG shape={shape} color={accentColor} />
      </div>

      {/* Trailing dot */}
      <div
        ref={trailRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 99998,
          pointerEvents: 'none',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: accentColor,
          opacity: visible ? 0.35 : 0,
          transition: 'opacity var(--pl-dur-fast)',
          willChange: 'transform',
        }}
      />
    </>
  );
}
