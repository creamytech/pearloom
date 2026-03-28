'use client';
import React from 'react';

interface ShapeProps {
  color?: string;
  opacity?: number;
  className?: string;
}

/**
 * A gentle organic wave path evoking pear curves — used as a section break.
 * viewBox="0 0 1440 80"
 */
export function PearSectionDivider({ color = 'currentColor', opacity = 1, className }: ShapeProps) {
  return (
    <svg
      width="100%"
      height="80"
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      fill={color}
      style={{ opacity, display: 'block' }}
      className={className}
      aria-hidden="true"
    >
      {/*
        Organic botanical wave — wider rounded bulges on one side (like the full bottom of a pear)
        and tighter curves on the other (like the shoulder), not a symmetric sine wave.
      */}
      <path d="
        M0 40
        C60 55, 130 65, 200 55
        C280 44, 310 28, 400 32
        C490 36, 520 60, 600 58
        C680 56, 710 34, 800 30
        C890 26, 940 52, 1020 56
        C1100 60, 1130 38, 1220 36
        C1300 34, 1360 50, 1440 48
        L1440 80 L0 80 Z
      " />
    </svg>
  );
}

/**
 * Ghost watermark of a large pear outline — very faint, used as decorative background on cards/sections.
 * viewBox="0 0 200 260"
 */
export function PearBackground({ color = 'currentColor', opacity = 0.06, className, size = 200 }: ShapeProps & { size?: number }) {
  const h = size * (260 / 200);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 200 260"
      fill="none"
      stroke={color}
      strokeWidth="2"
      style={{ opacity, display: 'block' }}
      className={className}
      aria-hidden="true"
    >
      {/* Single clean pear silhouette path */}
      <path
        d="
          M100 60
          C95 60, 90 58, 88 55
          C84 48, 86 38, 92 32
          C96 28, 100 26, 100 26
          C100 26, 104 28, 108 32
          C114 38, 116 48, 112 55
          C110 58, 105 60, 100 60 Z

          M100 60
          C75 60, 55 75, 45 95
          C35 115, 35 140, 42 160
          C52 188, 74 210, 100 214
          C126 210, 148 188, 158 160
          C165 140, 165 115, 155 95
          C145 75, 125 60, 100 60 Z
        "
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A scattered arrangement of 5-7 small pear silhouettes at various sizes and rotations — like a pattern tile.
 * viewBox="0 0 120 120"
 */
export function PearDotCluster({ color = 'currentColor', opacity = 1, className }: ShapeProps) {
  // Each pear: transform for position, rotation, scale
  // Pear base path centered at origin, top to bottom ~0 to -30, width ~-8 to 8
  const pearPath = "M0 -14 C-3 -14 -5.5 -12 -6.5 -9.5 C-8 -6 -7.5 -1 -6 3 C-4 8.5 -2 11 0 12 C2 11 4 8.5 6 3 C7.5 -1 8 -6 6.5 -9.5 C5.5 -12 3 -14 0 -14 Z M0 -14 C-0.5 -18 0.5 -21.5 0.2 -24 C-0.5 -21 0.5 -17.5 0 -14 Z";

  const pears = [
    { tx: 20, ty: 25, rot: -15, scale: 1.1 },
    { tx: 55, ty: 18, rot: 10, scale: 0.75 },
    { tx: 90, ty: 30, rot: -5, scale: 1.2 },
    { tx: 15, ty: 72, rot: 20, scale: 0.85 },
    { tx: 60, ty: 68, rot: -25, scale: 1.0 },
    { tx: 100, ty: 78, rot: 8, scale: 0.7 },
    { tx: 38, ty: 100, rot: -10, scale: 0.9 },
  ];

  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill={color}
      stroke="none"
      style={{ opacity, display: 'block' }}
      className={className}
      aria-hidden="true"
    >
      {pears.map((p, i) => (
        <g key={i} transform={`translate(${p.tx}, ${p.ty}) rotate(${p.rot}) scale(${p.scale})`}>
          <path d={pearPath} />
        </g>
      ))}
    </svg>
  );
}
