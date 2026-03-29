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
export function PearSectionDivider({ color = 'currentColor', opacity = 0.65, className }: ShapeProps) {
  return (
    <svg
      width="100%"
      height="60"
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      fill={color}
      style={{ opacity, display: 'block' }}
      className={className}
      aria-hidden="true"
    >
      {/*
        Softened organic botanical wave — gentler amplitude, pear-inspired curves.
      */}
      <path d="
        M0 30
        C80 44, 160 48, 240 40
        C320 32, 360 20, 480 24
        C600 28, 640 44, 720 42
        C800 40, 840 26, 960 22
        C1080 18, 1120 38, 1240 36
        C1340 34, 1400 40, 1440 38
        L1440 60 L0 60 Z
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
      {/* Single continuous pear silhouette — narrow neck, wide round belly */}
      <path
        d="
          M100 52
          C100 52, 92 54, 87 60
          C80 68, 78 76, 80 86
          C68 90, 58 103, 56 118
          C53 136, 56 158, 68 174
          C80 190, 92 200, 100 202
          C108 200, 120 190, 132 174
          C144 158, 147 136, 144 118
          C142 103, 132 90, 120 86
          C122 76, 120 68, 113 60
          C108 54, 100 52, 100 52
          Z
        "
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stem */}
      <path d="M100 52 C100 44 101 36 100 28" strokeLinecap="round" />
      {/* Leaf */}
      <path d="M100 38 C108 32 122 34 120 42 C113 37 106 37 100 38 Z" fill={color} stroke="none" opacity="0.7" />
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
