'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/CurvedText.tsx
//
// Text that flows along an SVG path — built on the native
// <textPath> element. Four built-in curves (arc / wave /
// circle / spiral) plus an escape hatch for any path you
// supply.
//
// Use sparingly. Curved text is a *moment* — a headline over
// the closing pear, a section label riding a wave, a badge
// orbiting an image. Never curve text you actually need to
// read quickly (body copy, form labels, nav).
//
// Accessibility: rendered as real text inside <text>, so
// screen readers and search engines see the label normally.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export type CurvedTextVariant = 'arc' | 'wave' | 'circle' | 'spiral';

interface CurvedTextProps {
  children: string;
  /** Which curve to flow the text along. */
  variant?: CurvedTextVariant;
  /** Override variant with a raw SVG path `d` attribute. */
  path?: string;
  /** Width of the SVG canvas in px. Height is derived. */
  width?: number;
  /** Height override (px). If omitted, variant supplies default. */
  height?: number;
  /** SVG viewBox override. Format: "x y w h". */
  viewBox?: string;
  /** How deep the curve bends. Bigger = wavier. */
  amplitude?: number;
  /** 0–1 where on the path the text starts. */
  startOffset?: number | string;
  /** Fill color — inherits from CSS if omitted. */
  color?: string;
  /** Font family. Default: Fraunces italic for display, else body. */
  fontFamily?: string;
  /** Font size in px. */
  fontSize?: number;
  /** Italic / wonk / style — merged into the SVG text. */
  fontStyle?: 'normal' | 'italic';
  fontWeight?: number;
  letterSpacing?: number | string;
  /** Stroke the path so you can see the curve (debugging). */
  showPath?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

// Built-in curves — each returns [viewBox, path, default height]
function curveFor(
  variant: CurvedTextVariant,
  width: number,
  height: number | undefined,
  amplitude: number,
): { vb: string; d: string; h: number } {
  switch (variant) {
    case 'arc': {
      const h = height ?? Math.max(60, Math.abs(amplitude) + 40);
      const midY = h - 8;
      // Cubic bezier that arcs from bottom-left up through
      // midpoint to bottom-right — reads like a smile / rainbow.
      const d = `M 0 ${midY} Q ${width / 2} ${midY - amplitude * 2} ${width} ${midY}`;
      return { vb: `0 0 ${width} ${h}`, d, h };
    }
    case 'wave': {
      const h = height ?? Math.max(80, amplitude * 2 + 40);
      const midY = h / 2;
      // Two mirrored cubics across the width to form a single S-wave.
      const d =
        `M 0 ${midY} ` +
        `C ${width / 4} ${midY - amplitude}, ${width / 2} ${midY - amplitude}, ${width / 2} ${midY} ` +
        `C ${(width / 4) * 3} ${midY + amplitude}, ${(width / 4) * 3.5} ${midY + amplitude}, ${width} ${midY}`;
      return { vb: `0 0 ${width} ${h}`, d, h };
    }
    case 'circle': {
      // Perfect circle — text rides around it. Height === width.
      const h = height ?? width;
      const r = width / 2 - 8;
      const cx = width / 2;
      const cy = h / 2;
      // Two arcs to close the circle; text baselines outside.
      const d =
        `M ${cx - r} ${cy} ` +
        `A ${r} ${r} 0 1 1 ${cx + r} ${cy} ` +
        `A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
      return { vb: `0 0 ${width} ${h}`, d, h };
    }
    case 'spiral': {
      // Gentle expanding curve — good for drifting labels.
      const h = height ?? Math.max(120, amplitude * 3);
      const d =
        `M 8 ${h - 8} ` +
        `Q ${width / 3} ${h / 2 + amplitude} ${width / 2} ${h / 2} ` +
        `T ${width - 8} 12`;
      return { vb: `0 0 ${width} ${h}`, d, h };
    }
    default: {
      // Fallback straight line.
      const h = height ?? 40;
      return { vb: `0 0 ${width} ${h}`, d: `M 0 ${h / 2} L ${width} ${h / 2}`, h };
    }
  }
}

export function CurvedText({
  children,
  variant = 'arc',
  path,
  width = 520,
  height,
  viewBox,
  amplitude = 36,
  startOffset = '50%',
  color,
  fontFamily,
  fontSize = 22,
  fontStyle = 'normal',
  fontWeight = 600,
  letterSpacing,
  showPath = false,
  className,
  style,
  'aria-label': ariaLabel,
}: CurvedTextProps) {
  const { vb, d, h } = curveFor(variant, width, height, amplitude);
  const effectiveViewBox = viewBox ?? vb;
  const effectivePath = path ?? d;
  const pathId = `pl-curved-${Math.random().toString(36).slice(2, 9)}`;
  const anchor =
    typeof startOffset === 'number'
      ? `${startOffset * 100}%`
      : startOffset;

  // Text-anchor middle so the string centers on the startOffset point.
  // Letter-spacing prop passes through as SVG's `letter-spacing`.
  return (
    <svg
      aria-label={ariaLabel ?? children}
      role="img"
      width={width}
      height={h}
      viewBox={effectiveViewBox}
      className={className}
      style={{
        display: 'block',
        overflow: 'visible',
        ...style,
      }}
    >
      <defs>
        <path id={pathId} d={effectivePath} fill="none" />
      </defs>
      {showPath && (
        <use
          href={`#${pathId}`}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={1}
          fill="none"
        />
      )}
      <text
        fill={color ?? 'currentColor'}
        fontFamily={fontFamily ?? 'inherit'}
        fontSize={fontSize}
        fontStyle={fontStyle}
        fontWeight={fontWeight}
        letterSpacing={letterSpacing as string | number | undefined}
        style={{
          // Enable Fraunces axes when using the display font.
          fontVariationSettings: fontStyle === 'italic' ? '"opsz" 144, "SOFT" 80, "WONK" 1' : undefined,
        }}
      >
        <textPath
          href={`#${pathId}`}
          startOffset={anchor}
          textAnchor="middle"
          method="align"
          spacing="auto"
        >
          {children}
        </textPath>
      </text>
    </svg>
  );
}
