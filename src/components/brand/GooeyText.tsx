'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/GooeyText.tsx
//
// The signature Pearloom text-morph moment. Two labels fade
// through a shared SVG <feGaussianBlur> + <feColorMatrix>
// threshold so their glyphs gooey-blend into each other as
// one replaces the next — the way ink spreads on warm paper.
//
// Used at: rotating hero occasion, the "you're invited"
// → "welcome, <name>" moment, the save-the-date reveal.
// ─────────────────────────────────────────────────────────────

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface GooeyTextProps {
  /** The sequence of strings to rotate through. */
  words: string[];
  /** Milliseconds between words. Ignored if `index` is controlled. */
  interval?: number;
  /** Optional controlled index — pass undefined to auto-rotate. */
  index?: number;
  /** Font size in rem or any valid CSS length. */
  fontSize?: string;
  /** Font style — italic for signature moments. */
  italic?: boolean;
  /** Text color (defaults to currentColor). */
  color?: string;
  /** Font family — defaults to Pearloom display token. */
  fontFamily?: string;
  /** Letter-spacing override. */
  letterSpacing?: string;
  /** Gooey intensity (0 = no goo, 1 = very liquid). Default 0.7. */
  intensity?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function GooeyText({
  words,
  interval = 2800,
  index: controlledIndex,
  fontSize = 'clamp(2.8rem, 7vw, 5rem)',
  italic = true,
  color = 'currentColor',
  fontFamily = 'var(--pl-font-display)',
  letterSpacing = '-0.015em',
  intensity = 0.7,
  className,
  style,
}: GooeyTextProps) {
  const reduced = useReducedMotion();
  const filterId = useId();
  const [auto, setAuto] = useState(0);
  const activeIndex = controlledIndex ?? auto;
  const active = words[((activeIndex % words.length) + words.length) % words.length];

  // Auto-rotate unless the caller is controlling the index.
  useEffect(() => {
    if (controlledIndex !== undefined) return;
    if (words.length <= 1) return;
    const t = setInterval(() => setAuto((i) => i + 1), interval);
    return () => clearInterval(t);
  }, [controlledIndex, interval, words.length]);

  // Tune the threshold matrix — higher `intensity` = stickier goo.
  const { stdDeviation, matrix } = useMemo(() => {
    const sd = Math.round(6 + intensity * 10); // 6–16
    const amp = 18 + intensity * 4;            // 18–22
    const off = -(7 + intensity * 2);           // -7 – -9
    return {
      stdDeviation: sd,
      matrix: `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${amp} ${off}`,
    };
  }, [intensity]);

  // Reduced-motion fallback: plain AnimatePresence crossfade, no blur.
  if (reduced) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-block',
          fontFamily,
          fontStyle: italic ? 'italic' : 'normal',
          fontSize,
          letterSpacing,
          color,
          ...style,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={active + activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ display: 'inline-block' }}
          >
            {active}
          </motion.span>
        </AnimatePresence>
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        position: 'relative',
        filter: `url(#${filterId})`,
        fontFamily,
        fontStyle: italic ? 'italic' : 'normal',
        fontSize,
        letterSpacing,
        color,
        lineHeight: 1.05,
        ...style,
      }}
    >
      {/* Inline SVG defining the gooey filter — scoped by unique id. */}
      <svg
        aria-hidden
        width={0}
        height={0}
        style={{ position: 'absolute', pointerEvents: 'none' }}
      >
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={stdDeviation} result="blur" />
            <feColorMatrix in="blur" mode="matrix" values={matrix} result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={active + activeIndex}
          initial={{ opacity: 0, y: '0.3em', scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: '-0.3em', scale: 1.04 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'inline-block', willChange: 'transform, opacity' }}
        >
          {active}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
