'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/vibe/VibeParticles.tsx
// Ambient particle system driven by the couple's vibe.
// Renders floating petals, stars, fireflies, snowflakes, etc.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import type { VibeSkin } from '@/lib/vibe-engine';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  rotation: number; rotationSpeed: number;
  phase: number;  // for sinusoidal drift
  symbol: string;
  color: string;
}

const PARTICLE_CONFIGS: Record<VibeSkin['particle'], {
  symbols: string[];
  colors: string[];
  count: number;
  speed: number;
  drift: number;
  spin: boolean;
}> = {
  petals: {
    symbols: ['✿', '❀', '⚘', '❁', '✾'],
    colors: ['#f9c6c9', '#f7a7b0', '#fce4e4', '#f3d1d8', '#e8b4bc'],
    count: 18, speed: 0.4, drift: 0.8, spin: true,
  },
  stars: {
    symbols: ['✦', '✧', '⋆', '✩', '★'],
    colors: ['#fff9e6', '#ffe98a', '#ffd966', '#fff3b0', '#fffde7'],
    count: 22, speed: 0.2, drift: 0.3, spin: false,
  },
  bubbles: {
    symbols: ['○', '◯', '◦', '⬡', '⬟'],
    colors: ['rgba(184,220,255,0.6)', 'rgba(200,230,255,0.5)', 'rgba(160,210,255,0.4)'],
    count: 16, speed: 0.35, drift: 0.5, spin: false,
  },
  leaves: {
    symbols: ['✿', '❧', '⚘', '✾', '❦'],
    colors: ['#a8d5a2', '#7ec07a', '#b8ddb4', '#90c98c', '#c5e5c0'],
    count: 14, speed: 0.45, drift: 1.1, spin: true,
  },
  confetti: {
    symbols: ['◆', '▲', '●', '■', '★'],
    colors: ['#f9c6c9', '#b8e0ff', '#c3f5a9', '#ffd966', '#ffb3de'],
    count: 24, speed: 0.55, drift: 0.6, spin: true,
  },
  snowflakes: {
    symbols: ['❄', '❅', '❆', '✻', '✼'],
    colors: ['rgba(255,255,255,0.7)', 'rgba(200,230,255,0.6)', 'rgba(220,240,255,0.5)'],
    count: 20, speed: 0.3, drift: 0.6, spin: true,
  },
  fireflies: {
    symbols: ['•', '◦', '∘', '⋅', '·'],
    colors: ['#c8ff8a', '#d4f56e', '#a8ff5c', '#e8ffb0', '#f0ffcc'],
    count: 28, speed: 0.15, drift: 0.4, spin: false,
  },
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

interface VibeParticlesProps {
  particle: VibeSkin['particle'];
  accent?: string;
}

export function VibeParticles({ particle, accent }: VibeParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cfg = PARTICLE_CONFIGS[particle];

    // Resize handler
    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Init particles
    particlesRef.current = Array.from({ length: cfg.count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * cfg.drift,
      vy: -cfg.speed - Math.random() * cfg.speed,
      size: 10 + Math.random() * 14,
      opacity: 0.3 + Math.random() * 0.5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: cfg.spin ? (Math.random() - 0.5) * 0.03 : 0,
      phase: Math.random() * Math.PI * 2,
      symbol: cfg.symbols[Math.floor(Math.random() * cfg.symbols.length)],
      color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
    }));

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of particlesRef.current) {
        // Sinusoidal x drift
        p.x += p.vx + Math.sin(frame * 0.006 + p.phase) * 0.4;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Fade with gentle pulse
        const pulse = Math.sin(frame * 0.015 + p.phase) * 0.08;
        const opacity = Math.min(1, Math.max(0, p.opacity + pulse));

        // Wrap around
        if (p.y < -30) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -30) p.x = canvas.width + 10;
        if (p.x > canvas.width + 30) p.x = -10;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = opacity;
        ctx.font = `${p.size}px serif`;
        ctx.fillStyle = p.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.symbol, 0, 0);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animRef.current);
    };
  }, [particle]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 1,
      }}
    />
  );
}
