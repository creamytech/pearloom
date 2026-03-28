'use client';
import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Lustrous pearl: perfect circle with a subtle crescent highlight arc inside and tiny radiating dots. */
export function PearlIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Main pearl circle */}
      <circle cx="12" cy="12" r="8" />
      {/* Inner crescent highlight arc */}
      <path d="M9 9 Q10.5 7.5 13.5 8.5" strokeWidth="1" opacity="0.6" />
      {/* Tiny radiating dots */}
      <circle cx="12" cy="3.5" r="0.6" fill={color} stroke="none" />
      <circle cx="19.5" cy="7" r="0.6" fill={color} stroke="none" />
      <circle cx="20.5" cy="15" r="0.6" fill={color} stroke="none" />
      <circle cx="15.5" cy="21" r="0.6" fill={color} stroke="none" />
      <circle cx="8.5" cy="21" r="0.6" fill={color} stroke="none" />
      <circle cx="3.5" cy="15" r="0.6" fill={color} stroke="none" />
      <circle cx="4.5" cy="7" r="0.6" fill={color} stroke="none" />
    </svg>
  );
}

/** BRAND MARK — beautiful organic pear silhouette with stem and small leaf. */
export function PearIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  // Custom aspect ratio: 32x40
  const w = size * (32 / 40);
  const h = size;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 32 40"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Pear body — organic silhouette */}
      <path d="M16 13 C10 13 5 18 5 25 C5 32 9.5 37 16 37 C22.5 37 27 32 27 25 C27 18 22 13 16 13 Z" />
      {/* Stem */}
      <path d="M16 13 C16 10 17.5 7.5 17 5" />
      {/* Small leaf */}
      <path d="M17 8.5 C19 7 22 7.5 21.5 9.5 C20.5 8.5 18.5 8.5 17 8.5 Z" fill={color} stroke="none" opacity="0.7" />
    </svg>
  );
}

/** Two interlocking wedding bands, slightly overlapping, with a tiny 4-pointed star at intersection. */
export function WeddingRingsIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Left ring */}
      <circle cx="9" cy="12" r="5.5" />
      {/* Right ring */}
      <circle cx="15" cy="12" r="5.5" />
      {/* 4-pointed star at intersection */}
      <path d="M12 10.5 L12.45 11.55 L13.5 12 L12.45 12.45 L12 13.5 L11.55 12.45 L10.5 12 L11.55 11.55 Z" fill={color} stroke="none" />
    </svg>
  );
}

/** Floral bouquet: 3 flower heads with ribbon-tied stems. */
export function BouquetIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Center flower head */}
      <circle cx="12" cy="6" r="2.5" />
      <circle cx="12" cy="6" r="1" fill={color} stroke="none" opacity="0.5" />
      {/* Left flower head */}
      <circle cx="7.5" cy="8" r="2" />
      <circle cx="7.5" cy="8" r="0.8" fill={color} stroke="none" opacity="0.5" />
      {/* Right flower head */}
      <circle cx="16.5" cy="8" r="2" />
      <circle cx="16.5" cy="8" r="0.8" fill={color} stroke="none" opacity="0.5" />
      {/* Stems gathering */}
      <path d="M12 8.5 L12 14" />
      <path d="M7.5 10 Q9 13 12 14" />
      <path d="M16.5 10 Q15 13 12 14" />
      {/* Ribbon knot */}
      <path d="M10 14.5 Q12 16 14 14.5" />
      {/* Ribbon tails */}
      <path d="M10 14.5 Q8.5 17 9.5 18.5" />
      <path d="M14 14.5 Q15.5 17 14.5 18.5" />
      {/* Wrapped stems below ribbon */}
      <path d="M11 15 L11 21" />
      <path d="M13 15 L13 21" />
    </svg>
  );
}

/** Wedding ceremony arch with floral garlands. */
export function CeremonyIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Arch pillars */}
      <line x1="4" y1="21" x2="4" y2="9" />
      <line x1="20" y1="21" x2="20" y2="9" />
      {/* Arch top */}
      <path d="M4 9 Q4 3 12 3 Q20 3 20 9" />
      {/* Left garland swag */}
      <path d="M4 9 Q7 12 10 10.5" strokeWidth="1" opacity="0.7" />
      {/* Right garland swag */}
      <path d="M20 9 Q17 12 14 10.5" strokeWidth="1" opacity="0.7" />
      {/* Small flowers on garlands */}
      <circle cx="7" cy="11.5" r="0.8" fill={color} stroke="none" opacity="0.6" />
      <circle cx="17" cy="11.5" r="0.8" fill={color} stroke="none" opacity="0.6" />
      {/* Center pendant */}
      <circle cx="12" cy="10" r="1" fill={color} stroke="none" opacity="0.5" />
    </svg>
  );
}

/** Heart with a small pearl dot at the top-center dip and thin decorative lines. */
export function ElegantHeartIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Heart outline */}
      <path d="M12 20 C12 20 3 14 3 8 C3 5.2 5.2 3 8 3 C9.7 3 11.2 3.85 12 5.1 C12.8 3.85 14.3 3 16 3 C18.8 3 21 5.2 21 8 C21 14 12 20 12 20 Z" />
      {/* Pearl dot at dip */}
      <circle cx="12" cy="5.5" r="1" fill={color} stroke="none" opacity="0.7" />
      {/* Thin decorative lines extending from sides */}
      <line x1="6.5" y1="11.5" x2="4.5" y2="13" strokeWidth="0.8" opacity="0.4" />
      <line x1="17.5" y1="11.5" x2="19.5" y2="13" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

/** Open envelope with a small heart on the flap. */
export function EnvelopeIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Envelope body */}
      <rect x="2" y="7" width="20" height="14" rx="1.5" />
      {/* Open flap left side */}
      <path d="M2 7 L12 4 L22 7" />
      {/* Bottom fold lines */}
      <line x1="2" y1="7" x2="10" y2="14" />
      <line x1="22" y1="7" x2="14" y2="14" />
      {/* Small heart on flap */}
      <path d="M12 10.5 C12 10.5 10.2 8.8 10.2 7.8 C10.2 7.1 10.8 6.5 11.5 6.5 C11.8 6.5 12 6.7 12 6.7 C12 6.7 12.2 6.5 12.5 6.5 C13.2 6.5 13.8 7.1 13.8 7.8 C13.8 8.8 12 10.5 12 10.5 Z" fill={color} stroke="none" opacity="0.7" />
    </svg>
  );
}

/** Two champagne flutes toasting with bubble dots. */
export function ChampagneIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Left flute */}
      <path d="M8 3 L6 11 L9 11 Z" />
      <line x1="7.5" y1="11" x2="7.5" y2="19" />
      <line x1="5.5" y1="19" x2="9.5" y2="19" />
      {/* Right flute (slightly angled to touch) */}
      <path d="M16 3 L18 11 L15 11 Z" />
      <line x1="16.5" y1="11" x2="16.5" y2="19" />
      <line x1="14.5" y1="19" x2="18.5" y2="19" />
      {/* Bubbles left */}
      <circle cx="7" cy="9" r="0.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="8" cy="6.5" r="0.5" fill={color} stroke="none" opacity="0.6" />
      {/* Bubbles right */}
      <circle cx="17" cy="9" r="0.5" fill={color} stroke="none" opacity="0.6" />
      <circle cx="16" cy="6.5" r="0.5" fill={color} stroke="none" opacity="0.6" />
      {/* Clink mark at top */}
      <path d="M11 3.5 L13 3.5" strokeWidth="1" opacity="0.5" />
      <path d="M12 2.5 L12 4.5" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** Teardrop location pin with a small pearl circle inside. */
export function LocationPinIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Teardrop pin body */}
      <path d="M12 2 C8.13 2 5 5.13 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5.13 15.87 2 12 2 Z" />
      {/* Pearl circle inside */}
      <circle cx="12" cy="9" r="2.5" />
      <path d="M10.8 8 Q11.5 7.2 13 7.5" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

/** Wrapped gift box with ribbon and bow on top. */
export function GiftIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Gift box body */}
      <rect x="3" y="11" width="18" height="11" rx="1" />
      {/* Gift box lid */}
      <rect x="2" y="8" width="20" height="3" rx="0.5" />
      {/* Vertical ribbon center */}
      <line x1="12" y1="8" x2="12" y2="22" />
      {/* Horizontal ribbon on lid */}
      <line x1="2" y1="9.5" x2="22" y2="9.5" />
      {/* Bow left loop */}
      <path d="M12 8 Q9 5 8 6.5 Q7 8 12 8" />
      {/* Bow right loop */}
      <path d="M12 8 Q15 5 16 6.5 Q17 8 12 8" />
    </svg>
  );
}

/** Elegant thread/weave pattern: 2-3 sinuous crossing curves evoking a loom weave. */
export function LoomThreadIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Thread 1 — gentle S-curve */}
      <path d="M3 6 Q8 6 10 12 Q12 18 17 18 Q20 18 21 16" />
      {/* Thread 2 — crossing S-curve */}
      <path d="M3 18 Q6 18 8 14 Q10 10 14 8 Q17 6 21 8" />
      {/* Thread 3 — center weave accent */}
      <path d="M3 12 Q8 10 12 12 Q16 14 21 12" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** Calendar with a small heart in the date area. */
export function CalendarHeartIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Calendar outline */}
      <rect x="3" y="4" width="18" height="18" rx="1.5" />
      {/* Header bar */}
      <line x1="3" y1="9" x2="21" y2="9" />
      {/* Date peg tabs */}
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      {/* Small heart in date area */}
      <path d="M12 17.5 C12 17.5 8.5 15 8.5 12.5 C8.5 11.1 9.7 10 11 10 C11.5 10 12 10.3 12 10.3 C12 10.3 12.5 10 13 10 C14.3 10 15.5 11.1 15.5 12.5 C15.5 15 12 17.5 12 17.5 Z" fill={color} stroke="none" opacity="0.65" />
    </svg>
  );
}

/** Decorative divider: thin line · pearl circle · thin line · pearl circle · thin line. */
export function PearlDividerIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  // Custom aspect ratio: 120x20
  const w = size * 6;
  const h = size;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 120 20"
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Left line */}
      <line x1="2" y1="10" x2="40" y2="10" />
      {/* Left pearl */}
      <circle cx="47" cy="10" r="5" />
      <path d="M44.5 8 Q46 6.5 48.5 7" strokeWidth="0.8" opacity="0.5" />
      {/* Center line */}
      <line x1="52" y1="10" x2="68" y2="10" />
      {/* Right pearl */}
      <circle cx="73" cy="10" r="5" />
      <path d="M70.5 8 Q72 6.5 74.5 7" strokeWidth="0.8" opacity="0.5" />
      {/* Right line */}
      <line x1="78" y1="10" x2="118" y2="10" />
    </svg>
  );
}

/** Small sprig with 3-4 simple oval leaves on a curved stem. */
export function LeafSprigIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Main curved stem */}
      <path d="M12 21 Q10 17 11 13 Q12 9 11 5" />
      {/* Leaf 1 — bottom left */}
      <path d="M11 17 Q8 15 7 12 Q9 12 11 14 Z" />
      {/* Leaf 2 — middle right */}
      <path d="M11 13 Q14 11 16 8 Q14 9 12 11 Z" />
      {/* Leaf 3 — upper left */}
      <path d="M11 9 Q8 7 7.5 4.5 Q9.5 5.5 11 7.5 Z" />
      {/* Tiny bud at tip */}
      <circle cx="11" cy="5" r="0.8" fill={color} stroke="none" opacity="0.6" />
    </svg>
  );
}

/** 8-pointed starburst with alternating long and short rays. */
export function StarburstIcon({ size = 24, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Long rays — N, E, S, W */}
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      {/* Long diagonal rays */}
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
      {/* Short accent rays at 22.5° offsets */}
      <line x1="12" y1="5" x2="14.6" y2="7" strokeWidth="0.8" opacity="0.5" />
      <line x1="19" y1="12" x2="17" y2="14.6" strokeWidth="0.8" opacity="0.5" />
      <line x1="12" y1="19" x2="9.4" y2="17" strokeWidth="0.8" opacity="0.5" />
      <line x1="5" y1="12" x2="7" y2="9.4" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}
