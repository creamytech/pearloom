'use client';

import React from 'react';

interface ProgressArcProps {
  /** Progress value from 0 to 100 */
  value: number;
  /** Diameter in pixels (default 48) */
  size?: number;
  /** Stroke color (default olive) */
  color?: string;
  /** Track (background) color */
  trackColor?: string;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Optional label in center */
  children?: React.ReactNode;
}

/**
 * Circular SVG progress indicator with smooth CSS transition.
 * Uses stroke-dasharray/dashoffset for the arc.
 */
export function ProgressArc({
  value,
  size = 48,
  color = 'var(--pl-olive, #A3B18A)',
  trackColor = 'rgba(163,177,138,0.15)',
  strokeWidth = 3,
  children,
}: ProgressArcProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
      {children && (
        <div style={{ position: 'relative', zIndex: 1, lineHeight: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}
