'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/KineticHeading.tsx
//
// A Fraunces display heading whose variable-font axes
// (opsz, SOFT, WONK) animate as the user scrolls it into
// view. As the reader approaches, the glyphs soften and
// grow into their optical-display size — a small, quiet
// flourish that telegraphs "this product is crafted".
//
// Uses CSS `font-variation-settings` so no extra font files
// are loaded — relies on the variable Fraunces face already
// imported in layout.tsx.
// ─────────────────────────────────────────────────────────────

import { useRef, type ElementType, type ReactNode } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface KineticHeadingProps {
  children: ReactNode;
  as?: ElementType;
  /** Font size (any valid CSS length / clamp). */
  fontSize?: string;
  italic?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Reverse the direction — softer at top, sharper at bottom. */
  reverse?: boolean;
}

export function KineticHeading({
  children,
  as: Tag = 'h1',
  fontSize = 'clamp(3rem, 8vw, 6rem)',
  italic = true,
  className,
  style,
  reverse = false,
}: KineticHeadingProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);

  // Track the heading's position inside the viewport.
  const { scrollYProgress } = useScroll({
    target: ref as React.RefObject<HTMLElement>,
    offset: ['start end', 'end start'],
  });

  // Axis values shift as the heading scrolls through the viewport.
  // Map [0, 0.5, 1] progress to [enter, middle, exit] axis values.
  const opsz = useTransform(scrollYProgress, [0, 0.5, 1], reverse ? [144, 72, 14] : [14, 72, 144]);
  const soft = useTransform(scrollYProgress, [0, 0.5, 1], reverse ? [100, 50, 0] : [0, 50, 100]);
  const wonk = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);

  // Compose the font-variation-settings string from the
  // three motion values so the CSS updates on every frame.
  const variationSettings = useTransform([opsz, soft, wonk], (latest) => {
    const v = latest as number[];
    return `"opsz" ${v[0].toFixed(1)}, "SOFT" ${v[1].toFixed(1)}, "WONK" ${v[2].toFixed(2)}`;
  });

  const MotionTag = motion(Tag);

  // Reduced-motion: static at the middle of the axis range.
  if (reduced) {
    return (
      <Tag
        ref={ref as React.Ref<HTMLElement>}
        className={className}
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontStyle: italic ? 'italic' : 'normal',
          fontSize,
          letterSpacing: '-0.02em',
          lineHeight: 1.02,
          fontVariationSettings: '"opsz" 72, "SOFT" 50, "WONK" 0.5',
          ...style,
        }}
      >
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      ref={ref as React.Ref<HTMLElement>}
      className={className}
      style={{
        fontFamily: 'var(--pl-font-display)',
        fontStyle: italic ? 'italic' : 'normal',
        fontSize,
        letterSpacing: '-0.02em',
        lineHeight: 1.02,
        fontVariationSettings: variationSettings,
        willChange: 'font-variation-settings',
        ...style,
      }}
    >
      {children}
    </MotionTag>
  );
}
