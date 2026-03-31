'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/vibe/CelebrationOverlay.tsx
// Tasteful, occasion-specific micro-animations on page load.
// Fires once, fades after ~4s, uses the site's own accent colors.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useCallback } from 'react';

type Occasion = 'wedding' | 'engagement' | 'anniversary' | 'birthday' | 'story';

interface Particle {
  id: number;
  x: number;       // % from left
  y: number;       // starting Y (above viewport)
  size: number;     // px
  drift: number;    // horizontal drift per frame
  speed: number;    // fall speed
  rotation: number; // degrees
  rotSpeed: number; // rotation speed
  opacity: number;
  color: string;
  shape: 'circle' | 'heart' | 'star' | 'confetti' | 'petal';
  delay: number;    // seconds before appearing
}

interface CelebrationOverlayProps {
  occasion?: Occasion;
  accentColor?: string;
  accentColor2?: string;
  disabled?: boolean;
}

const SHAPES: Record<Occasion, Particle['shape'][]> = {
  birthday:    ['confetti', 'confetti', 'confetti', 'star', 'circle'],
  wedding:     ['petal', 'petal', 'heart', 'petal', 'circle'],
  engagement:  ['heart', 'heart', 'star', 'heart', 'circle'],
  anniversary: ['star', 'star', 'circle', 'star', 'star'],
  story:       ['circle', 'petal', 'circle', 'star', 'circle'],
};

const PARTICLE_COUNT: Record<Occasion, number> = {
  birthday: 35,
  wedding: 20,
  engagement: 25,
  anniversary: 18,
  story: 12,
};

function generateParticles(occasion: Occasion, accent: string, accent2: string): Particle[] {
  const count = PARTICLE_COUNT[occasion] || 20;
  const shapes = SHAPES[occasion] || SHAPES.story;
  const colors = [accent, accent2, `${accent}88`, `${accent2}88`, '#FFFFFF44'];

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 30,
    size: occasion === 'birthday' ? 6 + Math.random() * 8 : 4 + Math.random() * 6,
    drift: (Math.random() - 0.5) * 0.3,
    speed: 0.15 + Math.random() * 0.25,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 3,
    opacity: 0.15 + Math.random() * 0.25,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    delay: Math.random() * 1.5,
  }));
}

function renderShape(shape: Particle['shape'], size: number, color: string): string {
  switch (shape) {
    case 'heart':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    case 'star':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>`;
    case 'petal':
      return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="${color}" xmlns="http://www.w3.org/2000/svg"><ellipse cx="10" cy="10" rx="4" ry="8" transform="rotate(20 10 10)"/></svg>`;
    case 'confetti':
      return `<svg width="${size}" height="${size * 0.4}" viewBox="0 0 10 4" fill="${color}" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="4" rx="1"/></svg>`;
    case 'circle':
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 10 10" fill="${color}" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4"/></svg>`;
  }
}

export function CelebrationOverlay({
  occasion = 'wedding',
  accentColor = '#A3B18A',
  accentColor2 = '#D6C6A8',
  disabled = false,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(!disabled);
  const [opacity, setOpacity] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const startRef = useRef(0);

  const DURATION = 4500; // ms total
  const FADE_START = 3000; // ms when fade begins

  const animate = useCallback((timestamp: number) => {
    if (!startRef.current) startRef.current = timestamp;
    const elapsed = timestamp - startRef.current;

    if (elapsed > DURATION) {
      setVisible(false);
      return;
    }

    // Fade out in last 1.5s
    if (elapsed > FADE_START) {
      setOpacity(1 - (elapsed - FADE_START) / (DURATION - FADE_START));
    }

    const container = canvasRef.current;
    if (!container) return;

    const children = container.children;
    particlesRef.current.forEach((p, i) => {
      if (elapsed < p.delay * 1000) return;

      p.y += p.speed;
      p.x += p.drift;
      p.rotation += p.rotSpeed;

      const el = children[i] as HTMLElement | undefined;
      if (el) {
        el.style.transform = `translate(${p.x}vw, ${p.y}vh) rotate(${p.rotation}deg)`;
        el.style.opacity = String(p.opacity * opacity);
      }
    });

    frameRef.current = requestAnimationFrame(animate);
  }, [opacity]);

  useEffect(() => {
    if (disabled || !visible) return;
    particlesRef.current = generateParticles(occasion, accentColor, accentColor2);
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [occasion, accentColor, accentColor2, disabled, visible, animate]);

  if (!visible || disabled) return null;

  return (
    <div
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 45,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity,
        transition: 'opacity 0.3s ease',
      }}
    >
      {particlesRef.current.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${p.x}vw, ${p.y}vh) rotate(${p.rotation}deg)`,
            opacity: 0,
            willChange: 'transform, opacity',
          }}
          dangerouslySetInnerHTML={{ __html: renderShape(p.shape, p.size, p.color) }}
        />
      ))}
    </div>
  );
}
