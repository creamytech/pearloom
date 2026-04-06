'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/mascot.tsx
// Dynamic mascot component — positioned via props
// ─────────────────────────────────────────────────────────────

import { motion, type Variants } from 'framer-motion';
import type { MascotPosition } from '@/types';

interface MascotProps {
  src: string;
  name?: string;
  position?: MascotPosition;
  size?: number;
  className?: string;
}

const animationVariants: Variants = {
  float: {
    y: [0, -12, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  wave: {
    rotate: [0, 14, -8, 14, 0],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  peek: {
    x: [-20, 0],
    opacity: [0, 1],
    transition: { duration: 0.8, ease: 'easeOut' },
  },
  sleep: {
    scale: [1, 1.02, 1],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
};

const positionStyles: Record<MascotPosition, string> = {
  hero: 'absolute bottom-8 right-8 z-10',
  timeline: 'absolute -right-16 top-1/2 -translate-y-1/2 z-10 hidden lg:block',
  footer: 'inline-block mx-2 align-middle',
  loading: 'mx-auto',
  'coming-soon': 'absolute bottom-12 left-1/2 -translate-x-1/2 z-10',
};

export function Mascot({
  src,
  name = 'mascot',
  position = 'footer',
  size = 64,
  className = '',
}: MascotProps) {
  const animationKey = position === 'hero' ? 'float'
    : position === 'coming-soon' ? 'sleep'
    : position === 'loading' ? 'float'
    : 'peek';

  return (
    <motion.img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`${positionStyles[position]} pointer-events-none select-none ${className}`}
      variants={animationVariants}
      animate={animationKey}
      draggable={false}
    />
  );
}
