// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorIcons.tsx
// Inline SVG icons for the editor UI — no emoji, no external deps.
// All icons are 16×16 viewBox, stroke-based, currentColor.
// ─────────────────────────────────────────────────────────────

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 14, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

// ── Effects panel icons ────────────────────────────────────────

export function IconFilmGrain(p: IconProps) {
  return (
    <Icon {...p}>
      {/* Film strip */}
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <rect x="2" y="5.5" width="2" height="2" rx="0.4" fill="currentColor" stroke="none" />
      <rect x="2" y="8.5" width="2" height="2" rx="0.4" fill="currentColor" stroke="none" />
      <rect x="12" y="5.5" width="2" height="2" rx="0.4" fill="currentColor" stroke="none" />
      <rect x="12" y="8.5" width="2" height="2" rx="0.4" fill="currentColor" stroke="none" />
      <line x1="5" y1="3" x2="5" y2="13" />
      <line x1="11" y1="3" x2="11" y2="13" />
    </Icon>
  );
}

export function IconVignette(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.5" opacity="0.4" strokeWidth="2.5" />
    </Icon>
  );
}

export function IconColorTemp(p: IconProps) {
  return (
    <Icon {...p}>
      {/* Thermometer */}
      <path d="M8 2v7.5" />
      <circle cx="8" cy="11" r="2" />
      <path d="M6.5 2h3" strokeWidth="1" />
      {/* Cool left / warm right indicator */}
      <path d="M2 8 L4 7 L4 9 Z" fill="currentColor" stroke="none" />
      <path d="M14 8 L12 7 L12 9 Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconMesh(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="1">
      {/* Mesh gradient blobs */}
      <circle cx="5" cy="5" r="4" opacity="0.5" strokeWidth="0" fill="currentColor" />
      <circle cx="11" cy="5" r="3.5" opacity="0.35" strokeWidth="0" fill="currentColor" />
      <circle cx="8" cy="11" r="4" opacity="0.45" strokeWidth="0" fill="currentColor" />
      <circle cx="11" cy="11" r="3" opacity="0.25" strokeWidth="0" fill="currentColor" />
      <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </Icon>
  );
}

export function IconCursor(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 2l8 8-3.5-.5-2 4-2.5-11.5z" />
    </Icon>
  );
}

export function IconDivider(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M1 8 Q4 5 8 8 Q12 11 15 8" />
      <line x1="1" y1="4" x2="15" y2="4" strokeWidth="1" opacity="0.35" />
      <line x1="1" y1="12" x2="15" y2="12" strokeWidth="1" opacity="0.35" />
    </Icon>
  );
}

export function IconReveal(p: IconProps) {
  return (
    <Icon {...p}>
      {/* Arrow up with motion lines */}
      <path d="M8 13V5" />
      <path d="M5 8l3-3 3 3" />
      <line x1="3" y1="13" x2="5.5" y2="13" strokeWidth="1" opacity="0.5" />
      <line x1="10.5" y1="13" x2="13" y2="13" strokeWidth="1" opacity="0.5" />
    </Icon>
  );
}

export function IconTexture(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="1">
      {/* Paper/linen grain dots */}
      <rect x="1" y="1" width="14" height="14" rx="2" strokeWidth="1.5" />
      <circle cx="4.5" cy="4.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="4.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="4.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// ── Severity icons ─────────────────────────────────────────────

export function IconError(p: IconProps) {
  return (
    <Icon {...p} stroke="currentColor">
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="5" x2="8" y2="8.5" strokeWidth="2" />
      <circle cx="8" cy="11" r="0.8" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconWarn(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M8 2L14.5 13H1.5L8 2z" />
      <line x1="8" y1="6.5" x2="8" y2="9.5" strokeWidth="1.8" />
      <circle cx="8" cy="11.5" r="0.7" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconTip(p: IconProps) {
  return (
    <Icon {...p}>
      {/* Lightbulb */}
      <path d="M8 2a4 4 0 0 1 2.5 7.1c-.3.3-.5.7-.5 1.2V11H6v-.7c0-.5-.2-.9-.5-1.2A4 4 0 0 1 8 2z" />
      <path d="M6.5 13h3" />
      <path d="M7 14.5h2" />
    </Icon>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 8l2 2 3-3.5" />
    </Icon>
  );
}

// ── UI chrome icons ────────────────────────────────────────────

export function IconClose(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="2">
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </Icon>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="2">
      <path d="M4 6l4 4 4-4" />
    </Icon>
  );
}

export function IconChevronUp(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="2">
      <path d="M4 10l4-4 4 4" />
    </Icon>
  );
}

export function IconPalette(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="8" r="6" />
      <circle cx="5.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconSparkle(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="1.5">
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
      <path d="M4.2 4.2l1.4 1.4M10.4 10.4l1.4 1.4M4.2 11.8l1.4-1.4M10.4 5.6l1.4-1.4" />
      <circle cx="8" cy="8" r="2" />
    </Icon>
  );
}

export function IconMeal(p: IconProps) {
  return (
    <Icon {...p}>
      {/* Fork + knife */}
      <path d="M5 2v4a2 2 0 0 0 2 2v6" />
      <path d="M4 2v2.5M6 2v2.5" />
      <path d="M11 2v12" />
      <path d="M9 2c0 2.5 2 3.5 2 4" />
    </Icon>
  );
}

export function IconAccessibility(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="3.5" r="1.5" />
      <path d="M5 7h6" />
      <path d="M8 7v8" />
      <path d="M5.5 15l2.5-4 2.5 4" />
    </Icon>
  );
}

export function IconGlobe(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12" />
      <path d="M8 2c-2 2-2 4-2 6s0 4 2 6" />
      <path d="M8 2c2 2 2 4 2 6s0 4-2 6" />
    </Icon>
  );
}

// ── Cursor shape SVGs (used in CustomCursor picker) ────────────

export function IconCursorNone(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 2l8 8-3.5-.5-2 4-2.5-11.5z" />
    </Icon>
  );
}

export function IconCursorPearl(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="8" r="5" />
      <circle cx="6.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" opacity="0.5" />
    </Icon>
  );
}

export function IconCursorHeart(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M8 13S2 9 2 5.5a3.5 3.5 0 0 1 6-2.5A3.5 3.5 0 0 1 14 5.5C14 9 8 13 8 13z" />
    </Icon>
  );
}

export function IconCursorRing(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="8" r="5" />
      <circle cx="8" cy="8" r="2.5" />
      <path d="M5.5 3.5l1.5 2" strokeWidth="1" />
    </Icon>
  );
}

export function IconCursorPetal(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M8 2C8 2 12 5 12 8C12 11 8 14 8 14C8 14 4 11 4 8C4 5 8 2 8 2Z" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconCursorStar(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M8 2l1.5 4h4l-3.2 2.4 1.2 4L8 10.3 4.5 12.4l1.2-4L2.5 6h4L8 2z" />
    </Icon>
  );
}

// ── Scroll reveal motion icons ─────────────────────────────────

export function IconRevealNone(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="8" r="6" />
      <line x1="5" y1="5" x2="11" y2="11" strokeWidth="2" />
    </Icon>
  );
}

export function IconRevealFade(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="1.5">
      <rect x="3" y="4" width="10" height="8" rx="1" />
      <line x1="3" y1="4" x2="3" y2="12" strokeWidth="3" opacity="0.15" />
      <line x1="13" y1="4" x2="13" y2="12" strokeWidth="3" opacity="0.6" />
    </Icon>
  );
}

export function IconRevealSlideUp(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="7" width="10" height="6" rx="1" />
      <path d="M8 5V1M5.5 3.5L8 1l2.5 2.5" />
    </Icon>
  );
}

export function IconRevealSlideLeft(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="5" y="5" width="8" height="6" rx="1" />
      <path d="M3 8h-2M1 6l2 2-2 2" />
    </Icon>
  );
}

export function IconRevealZoom(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 2V4M8 12v2M2 8h2M12 8h2" />
    </Icon>
  );
}

export function IconRevealBlur(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="1.5">
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="5" opacity="0.3" />
      <circle cx="8" cy="8" r="6.5" opacity="0.1" />
    </Icon>
  );
}

// ── Texture material icons ─────────────────────────────────────

export function IconTexturePaper(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="2" width="10" height="12" rx="1" />
      <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" />
      <line x1="5.5" y1="8" x2="10.5" y2="8" />
      <line x1="5.5" y1="10.5" x2="9" y2="10.5" />
    </Icon>
  );
}

export function IconTextureLinen(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="1">
      <rect x="2" y="2" width="12" height="12" rx="1" strokeWidth="1.5" />
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="10" x2="14" y2="10" />
      <line x1="2" y1="12" x2="14" y2="12" />
      <line x1="4" y1="2" x2="4" y2="14" />
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="12" y1="2" x2="12" y2="14" />
    </Icon>
  );
}

export function IconTextureConcrete(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="1">
      <rect x="2" y="2" width="12" height="12" rx="1" strokeWidth="1.5" />
      <rect x="2" y="2" width="5.5" height="5.5" />
      <rect x="8.5" y="2" width="5.5" height="5.5" />
      <rect x="2" y="8.5" width="5.5" height="5.5" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" />
    </Icon>
  );
}

export function IconTextureVelvet(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M2 6 Q4 2 8 2 Q12 2 14 6" />
      <path d="M2 10 Q4 6 8 6 Q12 6 14 10" />
      <path d="M2 14 Q4 10 8 10 Q12 10 14 14" />
    </Icon>
  );
}

export function IconTextureBokeh(p: IconProps) {
  return (
    <Icon {...p} strokeWidth="1">
      <circle cx="5" cy="5" r="2.5" opacity="0.5" />
      <circle cx="11" cy="5" r="2" opacity="0.4" />
      <circle cx="8" cy="10" r="3" opacity="0.55" />
      <circle cx="3" cy="11" r="1.5" opacity="0.3" />
      <circle cx="13" cy="11" r="1.8" opacity="0.35" />
    </Icon>
  );
}
