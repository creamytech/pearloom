'use client';

import React from 'react';

export interface IllustrationProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function WeddingRingsIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="24" cy="32" r="12" />
      <circle cx="40" cy="32" r="12" />
      <path d="M32,23.1 A12,12 0 0,1 32,40.9" />
      <path d="M32,23.1 A12,12 0 0,0 32,40.9" />
    </svg>
  );
}

export function DiamondRingIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M32,48 C32,48 20,36 20,36" />
      <path d="M32,48 C32,48 44,36 44,36" />
      <ellipse cx="32" cy="44" rx="8" ry="4" />
      <polygon points="32,18 38,24 35,32 29,32 26,24" />
      <polyline points="26,24 32,18 38,24" />
      <line x1="26" y1="24" x2="38" y2="24" />
    </svg>
  );
}

export function RoseIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="32" cy="28" r="7" />
      <path d="M25,28 Q20,18 27,14 Q32,12 32,18" />
      <path d="M39,28 Q44,18 37,14 Q32,12 32,18" />
      <path d="M32,21 Q32,14 38,12 Q44,14 42,22" />
      <path d="M25,28 Q16,24 16,32 Q18,40 28,36" />
      <path d="M39,28 Q48,24 48,32 Q46,40 36,36" />
      <path d="M28,35 Q26,44 32,46 Q38,44 36,35" />
      <line x1="32" y1="46" x2="32" y2="58" />
      <path d="M32,52 Q24,50 22,44" />
      <path d="M32,54 Q40,52 42,46" />
    </svg>
  );
}

export function PeonyIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="32" cy="28" r="8" />
      <path d="M32,20 Q28,12 20,14 Q18,22 26,24" />
      <path d="M32,20 Q36,12 44,14 Q46,22 38,24" />
      <path d="M24,24 Q14,22 14,32 Q16,40 26,38" />
      <path d="M40,24 Q50,22 50,32 Q48,40 38,38" />
      <path d="M26,36 Q22,46 30,48 Q36,46 36,38" />
      <path d="M38,36 Q42,46 34,48" />
      <path d="M32,36 Q32,46 36,48" />
      <path d="M28,20 Q26,14 20,14" />
      <path d="M36,20 Q38,14 44,14" />
      <line x1="32" y1="48" x2="32" y2="60" />
    </svg>
  );
}

export function EucalyptusIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M32,58 Q28,44 24,30 Q22,22 26,16" />
      <ellipse cx="22" cy="26" rx="7" ry="5" transform="rotate(-30,22,26)" />
      <ellipse cx="20" cy="36" rx="7" ry="5" transform="rotate(-20,20,36)" />
      <ellipse cx="22" cy="46" rx="7" ry="5" transform="rotate(-10,22,46)" />
      <ellipse cx="36" cy="22" rx="7" ry="5" transform="rotate(30,36,22)" />
      <ellipse cx="38" cy="32" rx="7" ry="5" transform="rotate(20,38,32)" />
      <ellipse cx="36" cy="42" rx="7" ry="5" transform="rotate(10,36,42)" />
    </svg>
  );
}

export function OliveBranchIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12,52 Q24,36 40,16" />
      <ellipse cx="20" cy="40" rx="5" ry="3" transform="rotate(-45,20,40)" />
      <ellipse cx="28" cy="30" rx="5" ry="3" transform="rotate(-45,28,30)" />
      <ellipse cx="36" cy="22" rx="5" ry="3" transform="rotate(-45,36,22)" />
      <circle cx="17" cy="44" r="3" />
      <circle cx="25" cy="34" r="3" />
      <circle cx="33" cy="26" r="3" />
      <ellipse cx="24" cy="44" rx="5" ry="3" transform="rotate(-20,24,44)" />
      <ellipse cx="32" cy="34" rx="5" ry="3" transform="rotate(-70,32,34)" />
    </svg>
  );
}

export function ButterflyIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M32,20 Q20,8 10,14 Q6,22 14,28 Q22,32 32,32" />
      <path d="M32,20 Q44,8 54,14 Q58,22 50,28 Q42,32 32,32" />
      <path d="M32,32 Q20,34 16,42 Q14,50 24,48 Q30,46 32,40" />
      <path d="M32,32 Q44,34 48,42 Q50,50 40,48 Q34,46 32,40" />
      <path d="M32,16 Q30,24 32,32 Q34,40 32,48" />
      <path d="M30,18 Q28,22 30,26" />
      <path d="M34,18 Q36,22 34,26" />
    </svg>
  );
}

export function DoveIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M10,38 Q18,28 30,30 Q40,30 50,24" />
      <path d="M50,24 Q44,20 38,22 Q30,24 26,32" />
      <path d="M26,32 Q24,38 30,40 Q36,40 40,36" />
      <path d="M40,36 Q48,32 50,24" />
      <path d="M10,38 Q16,42 26,38" />
      <path d="M50,24 Q54,16 46,14" />
      <path d="M46,14 Q42,18 44,22" />
      <circle cx="47" cy="22" r="1.5" />
      <path d="M50,24 Q58,30 52,36" />
    </svg>
  );
}

export function CrescentMoonIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M38,12 Q24,16 22,30 Q20,44 34,50 Q20,52 12,42 Q6,30 14,20 Q22,10 38,12 Z" />
      <line x1="44" y1="16" x2="46" y2="14" />
      <line x1="50" y1="24" x2="53" y2="22" />
      <line x1="48" y1="32" x2="52" y2="32" />
      <circle cx="45" cy="15" r="1.5" />
      <circle cx="51" cy="23" r="1" />
      <circle cx="50" cy="33" r="1.2" />
    </svg>
  );
}

export function SunRaysIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="32" cy="32" r="10" />
      <line x1="32" y1="8" x2="32" y2="16" />
      <line x1="32" y1="48" x2="32" y2="56" />
      <line x1="8" y1="32" x2="16" y2="32" />
      <line x1="48" y1="32" x2="56" y2="32" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
      <line x1="43" y1="43" x2="48.5" y2="48.5" />
      <line x1="48.5" y1="15.5" x2="43" y2="21" />
      <line x1="21" y1="43" x2="15.5" y2="48.5" />
    </svg>
  );
}

export function ShootingStarIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polygon points="44,14 46,20 52,20 47,24 49,30 44,26 39,30 41,24 36,20 42,20" />
      <line x1="36" y1="22" x2="12" y2="46" />
      <line x1="36" y1="22" x2="8" y2="48" strokeWidth="0.8" />
      <line x1="36" y1="22" x2="14" y2="50" strokeWidth="0.5" />
    </svg>
  );
}

export function ChampagneGlassesIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M22,12 L18,36 L28,36" />
      <line x1="25" y1="36" x2="25" y2="52" />
      <line x1="20" y1="52" x2="30" y2="52" />
      <path d="M42,12 L46,36 L36,36" />
      <line x1="39" y1="36" x2="39" y2="52" />
      <line x1="34" y1="52" x2="44" y2="52" />
      <path d="M22,12 L42,12" />
      <path d="M26,18 Q32,14 38,18" />
      <circle cx="24" cy="20" r="1" />
      <circle cx="40" cy="22" r="1" />
      <circle cx="32" cy="16" r="1" />
    </svg>
  );
}

export function WeddingCakeIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="22" y="14" width="20" height="12" rx="1" />
      <rect x="16" y="26" width="32" height="12" rx="1" />
      <rect x="10" y="38" width="44" height="14" rx="1" />
      <path d="M28,14 Q32,8 36,14" />
      <circle cx="32" cy="10" r="2" />
      <path d="M22,20 Q26,18 30,20 Q34,22 38,20 Q42,18 42,20" />
      <path d="M16,32 Q20,30 24,32 Q28,34 32,32 Q36,30 40,32 Q44,34 48,32" />
    </svg>
  );
}

export function RibbonBowIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M32,32 Q22,24 12,28 Q10,36 20,36 Q26,36 32,32" />
      <path d="M32,32 Q42,24 52,28 Q54,36 44,36 Q38,36 32,32" />
      <path d="M32,32 Q22,40 16,48" />
      <path d="M32,32 Q42,40 48,48" />
      <circle cx="32" cy="32" r="3" />
    </svg>
  );
}

export function HeartWreathIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M32,48 Q16,38 14,26 Q12,16 20,14 Q26,12 32,20 Q38,12 44,14 Q52,16 50,26 Q48,38 32,48 Z" />
      <ellipse cx="20" cy="20" rx="4" ry="2.5" transform="rotate(-45,20,20)" />
      <ellipse cx="15" cy="30" rx="4" ry="2.5" transform="rotate(-10,15,30)" />
      <ellipse cx="18" cy="40" rx="4" ry="2.5" transform="rotate(30,18,40)" />
      <ellipse cx="44" cy="20" rx="4" ry="2.5" transform="rotate(45,44,20)" />
      <ellipse cx="49" cy="30" rx="4" ry="2.5" transform="rotate(10,49,30)" />
      <ellipse cx="46" cy="40" rx="4" ry="2.5" transform="rotate(-30,46,40)" />
    </svg>
  );
}

export function CompassRoseIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polygon points="32,10 35,28 32,30 29,28" />
      <polygon points="32,54 35,36 32,34 29,36" />
      <polygon points="10,32 28,29 30,32 28,35" />
      <polygon points="54,32 36,29 34,32 36,35" />
      <polygon points="32,16 34,27 32,28 30,27" transform="rotate(45,32,32)" />
      <polygon points="32,16 34,27 32,28 30,27" transform="rotate(135,32,32)" />
      <polygon points="32,16 34,27 32,28 30,27" transform="rotate(225,32,32)" />
      <polygon points="32,16 34,27 32,28 30,27" transform="rotate(315,32,32)" />
      <circle cx="32" cy="32" r="4" />
    </svg>
  );
}

export function MapPinHeartIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M32,56 Q20,42 18,30 Q16,18 24,14 Q32,10 40,14 Q48,18 46,30 Q44,42 32,56 Z" />
      <path d="M32,32 Q26,26 26,30 Q26,34 32,38 Q38,34 38,30 Q38,26 32,32 Z" />
    </svg>
  );
}

export function VintageKeyIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="22" cy="22" r="10" />
      <circle cx="22" cy="22" r="5" />
      <line x1="29" y1="29" x2="50" y2="50" />
      <line x1="44" y1="44" x2="44" y2="50" />
      <line x1="50" y1="44" x2="50" y2="50" />
      <line x1="44" y1="50" x2="50" y2="50" />
    </svg>
  );
}

export function LanternIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="32" y1="6" x2="32" y2="14" />
      <path d="M24,14 Q20,14 20,18 L20,46 Q20,50 24,50 L40,50 Q44,50 44,46 L44,18 Q44,14 40,14 Z" />
      <rect x="20" y="14" width="24" height="4" rx="1" />
      <rect x="20" y="46" width="24" height="4" rx="1" />
      <line x1="26" y1="18" x2="26" y2="46" />
      <line x1="32" y1="18" x2="32" y2="46" />
      <line x1="38" y1="18" x2="38" y2="46" />
      <path d="M32,30 Q30,26 32,24 Q34,26 32,30" />
    </svg>
  );
}

export function EnvelopeWaxSealIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="8" y="16" width="48" height="34" rx="2" />
      <path d="M8,16 L32,36 L56,16" />
      <path d="M8,50 L24,34" />
      <path d="M56,50 L40,34" />
      <circle cx="32" cy="42" r="7" />
      <path d="M32,38 Q30,40 32,42 Q34,44 32,46" />
      <path d="M28,42 Q30,40 32,42 Q34,40 36,42" />
    </svg>
  );
}

export function InfinityKnotIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M32,32 Q26,22 18,22 Q10,22 10,30 Q10,38 18,38 Q26,38 32,32 Q38,26 46,26 Q54,26 54,34 Q54,42 46,42 Q38,42 32,32" />
      <path d="M18,26 Q14,28 14,32" strokeWidth="0.8" />
      <path d="M46,38 Q50,36 50,32" strokeWidth="0.8" />
    </svg>
  );
}

export function FeatherIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M20,52 Q32,32 44,12" />
      <path d="M44,12 Q52,16 48,26 Q44,36 32,42 Q24,46 20,52" />
      <path d="M28,46 Q36,36 42,20" strokeWidth="0.8" />
      <path d="M28,46 Q24,40 26,32" strokeWidth="0.8" />
      <path d="M30,44 Q38,34 42,22" strokeWidth="0.8" />
      <path d="M30,44 Q34,38 36,28" strokeWidth="0.8" />
      <path d="M24,48 Q32,38 40,24" strokeWidth="0.8" />
    </svg>
  );
}

export function DragonFlyIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <ellipse cx="32" cy="32" rx="3" ry="14" />
      <path d="M32,24 Q20,14 12,20 Q14,30 28,28" />
      <path d="M32,24 Q44,14 52,20 Q50,30 36,28" />
      <path d="M32,32 Q20,30 12,36 Q14,44 28,40" />
      <path d="M32,32 Q44,30 52,36 Q50,44 36,40" />
      <circle cx="32" cy="20" r="2.5" />
    </svg>
  );
}

export function MushroomIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M22,36 Q16,36 12,28 Q10,18 20,14 Q26,12 32,14 Q38,12 44,14 Q54,18 52,28 Q48,36 42,36 Z" />
      <rect x="26" y="36" width="12" height="16" rx="2" />
      <path d="M22,36 Q24,44 26,52" />
      <path d="M42,36 Q40,44 38,52" />
      <circle cx="26" cy="22" r="3" />
      <circle cx="38" cy="20" r="2" />
      <circle cx="32" cy="26" r="2.5" />
    </svg>
  );
}

export function BeeIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <ellipse cx="32" cy="36" rx="10" ry="14" />
      <line x1="22" y1="30" x2="42" y2="30" />
      <line x1="22" y1="36" x2="42" y2="36" />
      <line x1="22" y1="42" x2="42" y2="42" />
      <path d="M32,22 Q26,16 22,18 Q20,24 26,26" />
      <path d="M32,22 Q38,16 42,18 Q44,24 38,26" />
      <circle cx="32" cy="20" r="6" />
      <circle cx="30" cy="18" r="1" />
      <circle cx="34" cy="18" r="1" />
      <path d="M29,22 Q32,24 35,22" />
      <line x1="28" y1="14" x2="26" y2="10" />
      <line x1="36" y1="14" x2="38" y2="10" />
    </svg>
  );
}

export function LavenderIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="32" y1="58" x2="32" y2="30" />
      <line x1="24" y1="58" x2="24" y2="34" />
      <line x1="40" y1="58" x2="40" y2="34" />
      <path d="M32,30 Q30,22 32,14 Q34,22 32,30" />
      <path d="M32,24 Q28,20 32,14" strokeWidth="0.8" />
      <path d="M32,24 Q36,20 32,14" strokeWidth="0.8" />
      <path d="M24,34 Q22,28 24,22 Q26,28 24,34" />
      <path d="M40,34 Q38,28 40,22 Q42,28 40,34" />
      <path d="M32,52 Q26,50 24,50" />
      <path d="M32,52 Q38,50 40,50" />
    </svg>
  );
}

export function WishingWellIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="14" y="34" width="36" height="20" rx="2" />
      <path d="M14,34 Q32,28 50,34" />
      <line x1="18" y1="10" x2="18" y2="34" />
      <line x1="46" y1="10" x2="46" y2="34" />
      <path d="M14,12 Q32,6 50,12" />
      <line x1="14" y1="12" x2="14" y2="14" />
      <line x1="50" y1="12" x2="50" y2="14" />
      <path d="M32,12 L32,28" strokeDasharray="2 2" />
      <rect x="28" y="26" width="8" height="6" rx="1" />
      <line x1="20" y1="38" x2="20" y2="54" />
      <line x1="28" y1="38" x2="28" y2="54" />
      <line x1="36" y1="38" x2="36" y2="54" />
      <line x1="44" y1="38" x2="44" y2="54" />
    </svg>
  );
}

export function HourglassIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="18" y="8" width="28" height="6" rx="2" />
      <rect x="18" y="50" width="28" height="6" rx="2" />
      <path d="M18,14 Q24,24 32,32 Q40,24 46,14" />
      <path d="M18,50 Q24,42 32,32 Q40,42 46,50" />
      <path d="M26,18 Q32,26 38,18" strokeWidth="0.8" />
      <path d="M26,46 Q28,40 30,42 Q32,44 32,38" strokeWidth="0.8" />
    </svg>
  );
}

export function CandleFlameIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="24" y="36" width="16" height="22" rx="2" />
      <line x1="28" y1="36" x2="28" y2="58" />
      <line x1="32" y1="36" x2="32" y2="58" />
      <line x1="36" y1="36" x2="36" y2="58" />
      <line x1="32" y1="36" x2="32" y2="30" />
      <path d="M32,30 Q26,22 28,16 Q30,10 32,8 Q34,10 36,16 Q38,22 32,30 Z" />
      <path d="M32,26 Q29,22 30,18 Q31,15 32,14" strokeWidth="0.8" />
    </svg>
  );
}

export function StarConstellationIllustration({ size = 48, color = 'currentColor', style }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="32" cy="16" r="2.5" />
      <circle cx="48" cy="26" r="2" />
      <circle cx="42" cy="44" r="2.5" />
      <circle cx="22" cy="44" r="2" />
      <circle cx="16" cy="26" r="2" />
      <line x1="32" y1="16" x2="48" y2="26" strokeWidth="0.8" />
      <line x1="48" y1="26" x2="42" y2="44" strokeWidth="0.8" />
      <line x1="42" y1="44" x2="22" y2="44" strokeWidth="0.8" />
      <line x1="22" y1="44" x2="16" y2="26" strokeWidth="0.8" />
      <line x1="16" y1="26" x2="32" y2="16" strokeWidth="0.8" />
    </svg>
  );
}
