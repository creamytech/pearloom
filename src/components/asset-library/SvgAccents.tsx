'use client';

import React from 'react';

export interface AccentProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function DotRowAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={style}>
      <circle cx="4" cy="20" r="2" fill={color} stroke="none" />
      <circle cx="12" cy="20" r="2" fill={color} stroke="none" />
      <circle cx="20" cy="20" r="2" fill={color} stroke="none" />
      <circle cx="28" cy="20" r="2" fill={color} stroke="none" />
      <circle cx="36" cy="20" r="2" fill={color} stroke="none" />
    </svg>
  );
}

export function DiamondRowAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polygon points="8,20 11,17 14,20 11,23" />
      <polygon points="18,20 21,17 24,20 21,23" />
      <polygon points="28,20 31,17 34,20 31,23" />
    </svg>
  );
}

export function StarClusterAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polygon points="12,10 13.2,13.6 17,13.6 14,15.8 15.2,19.4 12,17.2 8.8,19.4 10,15.8 7,13.6 10.8,13.6" />
      <polygon points="28,8 29,11 32,11 29.5,12.8 30.5,15.8 28,14 25.5,15.8 26.5,12.8 24,11 27,11" />
      <polygon points="10,28 11,31 14,31 11.5,32.8 12.5,35.8 10,34 7.5,35.8 8.5,32.8 6,31 9,31" />
      <polygon points="30,26 31,29 34,29 31.5,30.8 32.5,33.8 30,32 27.5,33.8 28.5,30.8 26,29 29,29" />
    </svg>
  );
}

export function PetalScatterAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <ellipse cx="10" cy="12" rx="3" ry="5" transform="rotate(-30,10,12)" />
      <ellipse cx="28" cy="10" rx="3" ry="5" transform="rotate(20,28,10)" />
      <ellipse cx="20" cy="22" rx="3" ry="5" transform="rotate(0,20,22)" />
      <ellipse cx="8" cy="30" rx="3" ry="5" transform="rotate(40,8,30)" />
      <ellipse cx="32" cy="30" rx="3" ry="5" transform="rotate(-20,32,30)" />
    </svg>
  );
}

export function LeafPairAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M20,32 Q10,24 12,14 Q16,10 20,14" />
      <path d="M20,14 Q20,24 20,32" />
      <path d="M20,32 Q30,24 28,14 Q24,10 20,14" />
    </svg>
  );
}

export function CrosshatchAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" style={style}>
      <line x1="10" y1="14" x2="30" y2="26" />
      <line x1="10" y1="20" x2="30" y2="20" />
      <line x1="10" y1="26" x2="30" y2="14" />
      <line x1="14" y1="10" x2="26" y2="30" />
      <line x1="26" y1="10" x2="14" y2="30" />
    </svg>
  );
}

export function CircleTrioAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={style}>
      <circle cx="16" cy="22" r="8" />
      <circle cx="24" cy="22" r="8" />
      <circle cx="20" cy="16" r="8" />
    </svg>
  );
}

export function CornerFloralsAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M36,4 Q28,10 20,20" />
      <path d="M36,4 Q36,14 28,20" />
      <ellipse cx="30" cy="10" rx="4" ry="2.5" transform="rotate(-45,30,10)" />
      <ellipse cx="36" cy="16" rx="4" ry="2.5" transform="rotate(-10,36,16)" />
      <ellipse cx="26" cy="16" rx="4" ry="2.5" transform="rotate(-70,26,16)" />
      <circle cx="32" cy="6" r="2" />
    </svg>
  );
}

export function DashDotLineAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={style}>
      <line x1="4" y1="20" x2="10" y2="20" />
      <circle cx="14" cy="20" r="1.5" fill={color} stroke="none" />
      <line x1="18" y1="20" x2="24" y2="20" />
      <circle cx="28" cy="20" r="1.5" fill={color} stroke="none" />
      <line x1="32" y1="20" x2="38" y2="20" />
    </svg>
  );
}

export function WaveLineAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={style}>
      <path d="M4,20 Q10,14 16,20 Q22,26 28,20 Q34,14 38,18" />
    </svg>
  );
}

export function SparkleAccent({ size = 24, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={style}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

export function HeartTinyAccent({ size = 24, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12,19 Q6,14 5,9 Q4,5 7,4 Q9.5,3 12,7 Q14.5,3 17,4 Q20,5 19,9 Q18,14 12,19 Z" />
    </svg>
  );
}

export function InfinitySmallAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={style}>
      <path d="M20,20 Q16,14 11,14 Q6,14 6,20 Q6,26 11,26 Q16,26 20,20 Q24,14 29,14 Q34,14 34,20 Q34,26 29,26 Q24,26 20,20" />
    </svg>
  );
}

export function PearlStrandAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" style={style}>
      <circle cx="8" cy="24" r="3" />
      <circle cx="14" cy="18" r="3" />
      <circle cx="20" cy="16" r="3" />
      <circle cx="26" cy="18" r="3" />
      <circle cx="32" cy="24" r="3" />
      <path d="M8,24 Q14,18 20,16 Q26,18 32,24" fill="none" strokeWidth="0.8" />
    </svg>
  );
}

export function DoubleLineAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={style}>
      <line x1="4" y1="17" x2="36" y2="17" />
      <line x1="4" y1="23" x2="36" y2="23" />
    </svg>
  );
}

export function FleurDeLisAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M20,6 Q16,10 16,16 Q16,22 20,24 Q24,22 24,16 Q24,10 20,6 Z" />
      <path d="M20,24 Q14,20 10,22 Q8,26 12,28 Q16,28 20,24" />
      <path d="M20,24 Q26,20 30,22 Q32,26 28,28 Q24,28 20,24" />
      <path d="M14,28 Q16,32 20,34 Q24,32 26,28" />
      <line x1="20" y1="24" x2="20" y2="34" />
    </svg>
  );
}

export function CrescentSmallAccent({ size = 24, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M15,5 Q9,7 8,12 Q7,17 13,19 Q8,20 5,16 Q2,11 6,7 Q9,4 15,5 Z" />
    </svg>
  );
}

export function BranchTipAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="20" y1="34" x2="20" y2="14" />
      <ellipse cx="14" cy="20" rx="6" ry="3.5" transform="rotate(-30,14,20)" />
      <ellipse cx="26" cy="20" rx="6" ry="3.5" transform="rotate(30,26,20)" />
      <ellipse cx="20" cy="14" rx="4" ry="2.5" />
    </svg>
  );
}

export function StarburstSmallAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={style}>
      <line x1="20" y1="6" x2="20" y2="34" />
      <line x1="6" y1="20" x2="34" y2="20" />
      <line x1="9.7" y1="9.7" x2="30.3" y2="30.3" />
      <line x1="30.3" y1="9.7" x2="9.7" y2="30.3" />
      <line x1="6" y1="14" x2="20" y2="20" />
      <line x1="34" y1="14" x2="20" y2="20" />
      <line x1="6" y1="26" x2="20" y2="20" />
      <line x1="34" y1="26" x2="20" y2="20" />
    </svg>
  );
}

export function RibbonEndAccent({ size = 40, color = 'currentColor', style }: AccentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M6,14 L26,14 Q34,14 34,20 Q34,26 26,26 L6,26" />
      <path d="M6,14 Q10,20 6,26" />
      <path d="M20,14 Q22,20 20,26" strokeWidth="0.8" />
    </svg>
  );
}
