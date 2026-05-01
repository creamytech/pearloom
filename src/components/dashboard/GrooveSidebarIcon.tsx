'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/GrooveSidebarIcon.tsx
//
// Wraps a lucide icon in a framer-motion span that plays a
// groovy spring-based micro-animation on hover. Each icon gets
// a specific "personality" — wobble / bounce / spin / pulse /
// wave / morph — so the sidebar feels alive as the pointer
// glides down it.
//
// Some nav items get a bespoke animated SVG instead of a lucide
// wrapper (the "Sites" grid waves, the "Help" question mark nods
// its tail, etc.) — those render as custom components inside
// this same wrapper for a consistent spring motion.
// ─────────────────────────────────────────────────────────────

import { motion, type Variants } from 'framer-motion';
import type { ComponentType, SVGProps } from 'react';

export type GroovePersonality =
  | 'wobble'   // tilt left-right, for people/groups
  | 'bounce'   // vertical hop, for triggers/actions
  | 'spin'     // rotation, for settings/directors
  | 'pulse'   // scale up-down, for metrics/stats
  | 'wave'    // horizontal shimmy, for messaging
  | 'morph'   // skew + stretch, for gallery/marketplace
  | 'bloom';  // scale with spring, for sparkles

const VARIANTS: Record<GroovePersonality, Variants> = {
  wobble: {
    rest:  { rotate: 0 },
    hover: { rotate: [0, -12, 10, -6, 4, 0], transition: { duration: 0.9, ease: [0.34, 1.56, 0.64, 1] } },
  },
  bounce: {
    rest:  { y: 0 },
    hover: { y: [0, -4, 0, -2, 0], transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } },
  },
  spin: {
    rest:  { rotate: 0 },
    hover: { rotate: 360, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
  },
  pulse: {
    rest:  { scale: 1 },
    hover: { scale: [1, 1.2, 0.95, 1.08, 1], transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } },
  },
  wave: {
    rest:  { x: 0 },
    hover: { x: [0, -3, 3, -2, 2, 0], transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  },
  morph: {
    rest:  { skewY: 0, scaleX: 1 },
    hover: { skewY: [0, -5, 4, 0], scaleX: [1, 1.08, 0.96, 1], transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] } },
  },
  bloom: {
    rest:  { scale: 1, rotate: 0 },
    hover: { scale: [1, 1.15, 1], rotate: [0, 18, -8, 0], transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] } },
  },
};

interface GrooveSidebarIconProps {
  /** The lucide icon component (or any SVG renderer taking `size`). */
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  personality: GroovePersonality;
  size?: number;
  /** Force the hover animation even when parent isn't hovered (active state). */
  alwaysOn?: boolean;
}

export function GrooveSidebarIcon({
  Icon,
  personality,
  size = 16,
  alwaysOn = false,
}: GrooveSidebarIconProps) {
  return (
    <motion.span
      variants={VARIANTS[personality]}
      initial="rest"
      animate={alwaysOn ? 'hover' : 'rest'}
      whileHover="hover"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transformOrigin: 'center',
      }}
    >
      <Icon size={size} />
    </motion.span>
  );
}
