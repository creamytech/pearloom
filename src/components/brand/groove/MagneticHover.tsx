'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/MagneticHover.tsx
//
// Thin wrapper that attaches the magnetic-pointer effect to
// any child (usually a SquishyButton or a logo). Keeps the
// hook behind a drop-in component for JSX readability.
// ─────────────────────────────────────────────────────────────

import { useRef, type ReactNode } from 'react';
import { useMagneticPointer } from './useMagneticPointer';

interface MagneticHoverProps {
  children: ReactNode;
  strength?: number;
  radius?: number;
  maxOffset?: number;
  /** Extra class on the wrapper for positioning. */
  className?: string;
}

export function MagneticHover({
  children,
  strength = 0.3,
  radius = 120,
  maxOffset = 20,
  className,
}: MagneticHoverProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useMagneticPointer(ref, { strength, radius, maxOffset });
  return (
    <span
      ref={ref}
      className={className}
      style={{ display: 'inline-block', willChange: 'transform' }}
    >
      {children}
    </span>
  );
}
