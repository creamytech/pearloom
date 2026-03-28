// ─────────────────────────────────────────────────────────────
// Pearloom / components/icons/EditorIcons.tsx
// Custom SVG icon library for the site editor
// ─────────────────────────────────────────────────────────────

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

const base = (size: number, color: string, style?: React.CSSProperties, children: React.ReactNode = null) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke={color}
    strokeWidth={1.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    aria-hidden="true"
  >
    {children}
  </svg>
);

// ── Navigation Tab Icons ────────────────────────────────────────

/** Stack of 3 bars (wide, medium, narrow) — page sections/layout */
export function SectionsIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      <line x1="2" y1="4.5" x2="14" y2="4.5" />
      <line x1="2" y1="8" x2="11" y2="8" />
      <line x1="2" y1="11.5" x2="8" y2="11.5" />
    </>
  );
}

/** Open book with small heart above and curved page lines */
export function StoryIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Book spine */}
      <line x1="8" y1="5" x2="8" y2="13" />
      {/* Left page */}
      <path d="M8 5 C8 5 5 4.5 2.5 5.5 L2.5 13 C2.5 13 5 12 8 13" />
      {/* Right page */}
      <path d="M8 5 C8 5 11 4.5 13.5 5.5 L13.5 13 C13.5 13 11 12 8 13" />
      {/* Small heart above */}
      <path d="M7 2.8 C7 2.3 7.4 2 8 2.5 C8.6 2 9 2.3 9 2.8 C9 3.4 8 4 8 4 C8 4 7 3.4 7 2.8 Z" strokeWidth={0.9} />
    </>
  );
}

/** Calendar with small star/sparkle on it */
export function EventsIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Calendar body */}
      <rect x="2" y="3.5" width="12" height="10" rx="1.5" />
      {/* Header line */}
      <line x1="2" y1="6.5" x2="14" y2="6.5" />
      {/* Date pegs */}
      <line x1="5.5" y1="2" x2="5.5" y2="5" />
      <line x1="10.5" y1="2" x2="10.5" y2="5" />
      {/* Small sparkle/star center */}
      <line x1="8" y1="9" x2="8" y2="11" />
      <line x1="7" y1="10" x2="9" y2="10" />
      <line x1="7.3" y1="9.3" x2="8.7" y2="10.7" />
      <line x1="8.7" y1="9.3" x2="7.3" y2="10.7" />
    </>
  );
}

/** Paintbrush diagonal with small diamond at tip and curved stroke */
export function DesignIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Brush handle */}
      <line x1="11" y1="2" x2="5.5" y2="7.5" />
      {/* Ferrule */}
      <rect x="9.3" y="3.7" width="2.5" height="1.5" rx="0.3" transform="rotate(-45 9.3 3.7)" strokeWidth={1} />
      {/* Bristle tip */}
      <path d="M4.5 8.5 C3.5 9.5 3 10.5 3.5 11 C4 11.5 5 11 6 10 Z" />
      {/* Small diamond at far end */}
      <path d="M11.5 1.5 L12.5 2.5 L11.5 3.5 L10.5 2.5 Z" strokeWidth={1} />
      {/* Curved painted stroke */}
      <path d="M6.5 9.5 Q9 11 11 13" strokeWidth={1} />
    </>
  );
}

/** Tag/label shape with lines for text and decorative crest */
export function DetailsIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Tag body */}
      <path d="M3 3.5 L3 12 Q3 13 4 13 L12 13 Q13 13 13 12 L13 5 L11 3.5 Z" />
      {/* Fold corner */}
      <path d="M11 3.5 L11 5 L13 5" strokeWidth={0.9} />
      {/* Text lines */}
      <line x1="5" y1="7" x2="11" y2="7" />
      <line x1="5" y1="9" x2="11" y2="9" />
      <line x1="5" y1="11" x2="8.5" y2="11" />
      {/* Small crest at top */}
      <path d="M6.5 3.5 Q8 2.5 9.5 3.5" strokeWidth={0.9} />
    </>
  );
}

/** Constellation of 4 dots connected by lines with center sparkle — AI blocks */
export function AIBlocksIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Connecting lines */}
      <line x1="4" y1="4" x2="12" y2="4" strokeWidth={0.8} />
      <line x1="4" y1="4" x2="8" y2="12" strokeWidth={0.8} />
      <line x1="12" y1="4" x2="8" y2="12" strokeWidth={0.8} />
      <line x1="4" y1="4" x2="3" y2="11" strokeWidth={0.8} />
      <line x1="3" y1="11" x2="8" y2="12" strokeWidth={0.8} />
      {/* Dots */}
      <circle cx="4" cy="4" r="1.1" fill={color} stroke="none" />
      <circle cx="12" cy="4" r="1.1" fill={color} stroke="none" />
      <circle cx="8" cy="12" r="1.1" fill={color} stroke="none" />
      <circle cx="3" cy="11" r="1.1" fill={color} stroke="none" />
      {/* Center sparkle */}
      <line x1="8" y1="6.5" x2="8" y2="9" strokeWidth={0.9} />
      <line x1="6.75" y1="7.75" x2="9.25" y2="7.75" strokeWidth={0.9} />
    </>
  );
}

/** Speech bubble with 3 horizontal bars and small waveform below */
export function VoiceIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Speech bubble */}
      <path d="M2 3 Q2 2 3 2 L13 2 Q14 2 14 3 L14 9 Q14 10 13 10 L5 10 L2.5 12.5 L2.5 10 Q2 10 2 9 Z" />
      {/* Lines inside bubble */}
      <line x1="4.5" y1="5" x2="11.5" y2="5" />
      <line x1="4.5" y1="7" x2="11.5" y2="7" />
      {/* Waveform below */}
      <path d="M3 14 L4 13 L5 14.5 L6 13.5 L7 14.5 L8 13 L9 14.5 L10 13.5 L11 14.5 L12 14 L13 14" strokeWidth={0.9} />
    </>
  );
}

// ── Block Catalogue Icons ───────────────────────────────────────

/** Full-width hero block with two name lines and horizon */
export function BlockHeroIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Rectangle */}
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
      {/* Horizon / mountain */}
      <path d="M1.5 10 L5 7 L7.5 9 L10 6.5 L14.5 10" strokeWidth={0.9} />
      {/* Name lines centered */}
      <line x1="5" y1="12" x2="11" y2="12" />
      <line x1="6" y1="13.2" x2="10" y2="13.2" strokeWidth={0.1} />
    </>
  );
}

/** Vertical timeline: line with 3 dots and horizontal lines extending right */
export function BlockStoryIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Vertical spine */}
      <line x1="5" y1="2.5" x2="5" y2="13.5" />
      {/* Dots */}
      <circle cx="5" cy="4.5" r="1.2" fill={color} stroke="none" />
      <circle cx="5" cy="8" r="1.2" fill={color} stroke="none" />
      <circle cx="5" cy="11.5" r="1.2" fill={color} stroke="none" />
      {/* Horizontal lines */}
      <line x1="7" y1="4.5" x2="14" y2="4.5" />
      <line x1="7" y1="8" x2="13" y2="8" />
      <line x1="7" y1="11.5" x2="14" y2="11.5" />
    </>
  );
}

/** Two overlapping calendar pages, slightly offset */
export function BlockEventIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Back calendar */}
      <rect x="4" y="3" width="9" height="9" rx="1" strokeWidth={0.9} />
      <line x1="4" y1="5.5" x2="13" y2="5.5" strokeWidth={0.9} />
      {/* Front calendar */}
      <rect x="2" y="4.5" width="9" height="9" rx="1" />
      <line x1="2" y1="7" x2="11" y2="7" />
      {/* Date pegs */}
      <line x1="5" y1="3" x2="5" y2="5" />
      <line x1="10" y1="3" x2="10" y2="5" />
      {/* Date grid dots */}
      <circle cx="5.5" cy="9.5" r="0.7" fill={color} stroke="none" />
      <circle cx="7.5" cy="9.5" r="0.7" fill={color} stroke="none" />
      <circle cx="9.5" cy="9.5" r="0.7" fill={color} stroke="none" />
    </>
  );
}

/** Circle with clock hands at ~11:58 and small dots around edge like watch bezel */
export function BlockCountdownIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Clock face */}
      <circle cx="8" cy="8" r="6" />
      {/* Minute hand (pointing ~11:58, nearly at 12) */}
      <line x1="8" y1="8" x2="7.5" y2="3" strokeWidth={1.4} />
      {/* Hour hand (pointing ~11) */}
      <line x1="8" y1="8" x2="4.5" y2="4.5" />
      {/* Bezel dots at 12, 3, 6, 9 */}
      <circle cx="8" cy="2.8" r="0.5" fill={color} stroke="none" />
      <circle cx="13.2" cy="8" r="0.5" fill={color} stroke="none" />
      <circle cx="8" cy="13.2" r="0.5" fill={color} stroke="none" />
      <circle cx="2.8" cy="8" r="0.5" fill={color} stroke="none" />
    </>
  );
}

/** Envelope with small heart seal on flap and checkmark emerging from top */
export function BlockRsvpIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Envelope body */}
      <rect x="2" y="5" width="12" height="9" rx="1" />
      {/* Flap */}
      <path d="M2 5 L8 10 L14 5" />
      {/* Heart seal on flap */}
      <path d="M7.3 7.2 C7.3 6.8 7.6 6.6 8 7 C8.4 6.6 8.7 6.8 8.7 7.2 C8.7 7.7 8 8.2 8 8.2 C8 8.2 7.3 7.7 7.3 7.2 Z" strokeWidth={0.9} />
      {/* Checkmark emerging from top */}
      <path d="M6 3.5 L7.5 5 L10.5 2" strokeWidth={1.3} />
    </>
  );
}

/** Gift box with ribbon from top, slight angle for depth */
export function BlockRegistryIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Box body */}
      <rect x="2" y="7" width="12" height="7" rx="0.8" />
      {/* Lid */}
      <rect x="1.5" y="5" width="13" height="2.5" rx="0.8" />
      {/* Vertical ribbon */}
      <line x1="8" y1="5" x2="8" y2="14" />
      {/* Horizontal ribbon on lid */}
      <line x1="1.5" y1="6.25" x2="14.5" y2="6.25" />
      {/* Bow left loop */}
      <path d="M8 5 C6.5 3.5 4.5 3.5 5 4.5 C5.5 5.5 7 5 8 5" />
      {/* Bow right loop */}
      <path d="M8 5 C9.5 3.5 11.5 3.5 11 4.5 C10.5 5.5 9 5 8 5" />
    </>
  );
}

/** Small airplane above curved horizon with location marker */
export function BlockTravelIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Airplane body */}
      <path d="M3 7.5 L8 5 L13 7.5 L11 7.5 L8 6.5 L5 7.5 Z" />
      {/* Airplane tail */}
      <path d="M5 7.5 L4.5 9 L8 8 L11.5 9 L11 7.5" />
      {/* Horizon curve */}
      <path d="M1.5 12 Q8 10 14.5 12" />
      {/* Location pin */}
      <circle cx="8" cy="13.5" r="0.7" fill={color} stroke="none" />
      <path d="M8 13.5 L8 15" strokeWidth={0.1} />
    </>
  );
}

/** Speech bubble with stylized "?" made of two curved strokes */
export function BlockFaqIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Speech bubble */}
      <path d="M2 2 Q2 1 3 1 L13 1 Q14 1 14 2 L14 10 Q14 11 13 11 L5 11 L2.5 13.5 L2.5 11 Q2 11 2 10 Z" />
      {/* Question mark top curve */}
      <path d="M6.5 4.5 C6.5 3.2 9.5 3.2 9.5 5.5 C9.5 6.5 8 7 8 8" strokeWidth={1.3} />
      {/* Question mark dot */}
      <circle cx="8" cy="9.5" r="0.7" fill={color} stroke="none" />
    </>
  );
}

/** Polaroid-style photo frame with mountain + sun inside */
export function BlockPhotosIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Polaroid frame */}
      <rect x="2" y="1.5" width="12" height="13" rx="1" />
      {/* Photo area */}
      <rect x="3.5" y="3" width="9" height="7.5" rx="0.5" />
      {/* Mountain inside */}
      <path d="M3.5 10.5 L6.5 7 L8.5 9 L10.5 6.5 L12.5 10.5" strokeWidth={0.9} />
      {/* Sun */}
      <circle cx="11" cy="5" r="1" strokeWidth={0.9} />
      {/* Space at bottom = polaroid white area */}
      <line x1="5" y1="12.5" x2="11" y2="12.5" strokeWidth={0.7} />
    </>
  );
}

/** Open book/journal with pen drawing a heart on right page */
export function BlockGuestbookIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Book spine */}
      <line x1="8" y1="3" x2="8" y2="14" />
      {/* Left cover */}
      <path d="M8 3 C8 3 5 2.5 2.5 3.5 L2.5 14 C2.5 14 5 13 8 14" />
      {/* Right cover */}
      <path d="M8 3 C8 3 11 2.5 13.5 3.5 L13.5 14 C13.5 14 11 13 8 14" />
      {/* Left page lines */}
      <line x1="3.5" y1="6" x2="7" y2="6" strokeWidth={0.8} />
      <line x1="3.5" y1="8" x2="7" y2="8" strokeWidth={0.8} />
      {/* Pen on right page */}
      <path d="M10 12 L12.5 6.5 L13 7 L10.5 12.5 Z" strokeWidth={0.9} />
      {/* Heart drawn on right page */}
      <path d="M9 8.5 C9 8 9.4 7.8 9.9 8.2 C10.4 7.8 10.8 8 10.8 8.5 C10.8 9 9.9 9.7 9.9 9.7 C9.9 9.7 9 9 9 8.5 Z" strokeWidth={0.9} />
    </>
  );
}

/** Stylized map with fold crease, location pin, and dotted route */
export function BlockMapIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Map body */}
      <path d="M2 3.5 L5.5 2 L10.5 4 L14 2.5 L14 13 L10.5 14.5 L5.5 12.5 L2 14 Z" />
      {/* Fold crease */}
      <line x1="5.5" y1="2" x2="5.5" y2="12.5" strokeWidth={0.8} />
      <line x1="10.5" y1="4" x2="10.5" y2="14.5" strokeWidth={0.8} />
      {/* Location pin */}
      <path d="M8 10 C7 10 6.5 9.2 6.5 8.5 C6.5 7.5 7.2 7 8 7 C8.8 7 9.5 7.5 9.5 8.5 C9.5 9.2 9 10 8 10 Z" />
      <line x1="8" y1="10" x2="8" y2="11.5" />
      {/* Dotted route */}
      <line x1="3.5" y1="11" x2="5" y2="10" strokeDasharray="0.8 1" strokeWidth={0.9} />
      <line x1="11" y1="6.5" x2="12.5" y2="5.5" strokeDasharray="0.8 1" strokeWidth={0.9} />
    </>
  );
}

/** Two large opening quotation marks (curled comma shapes) */
export function BlockQuoteIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Left quote */}
      <path d="M3 7 C3 5 4.5 4 5.5 4 C4.5 5 4.5 6 5 7 C5.5 8 5 9 4 9 C3.5 9 3 8.5 3 7 Z" />
      <path d="M4.8 9 C4.8 9.8 4.2 10.5 3.5 10.5" strokeWidth={0.9} />
      {/* Right quote */}
      <path d="M8.5 7 C8.5 5 10 4 11 4 C10 5 10 6 10.5 7 C11 8 10.5 9 9.5 9 C9 9 8.5 8.5 8.5 7 Z" />
      <path d="M10.3 9 C10.3 9.8 9.7 10.5 9 10.5" strokeWidth={0.9} />
    </>
  );
}

/** Play triangle inside rounded rectangle with film strip at bottom */
export function BlockVideoIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Screen */}
      <rect x="1.5" y="2" width="13" height="10" rx="1.5" />
      {/* Play triangle */}
      <path d="M6.5 5 L6.5 9 L11 7 Z" fill={color} strokeWidth={0.5} />
      {/* Film strip at bottom */}
      <rect x="1.5" y="12" width="13" height="2" rx="0.5" strokeWidth={0.8} />
      <line x1="4" y1="12" x2="4" y2="14" strokeWidth={0.8} />
      <line x1="7" y1="12" x2="7" y2="14" strokeWidth={0.8} />
      <line x1="10" y1="12" x2="10" y2="14" strokeWidth={0.8} />
      <line x1="13" y1="12" x2="13" y2="14" strokeWidth={0.8} />
    </>
  );
}

/** Horizontal line with diamond center and tick marks */
export function BlockDividerIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Left segment */}
      <line x1="1.5" y1="8" x2="6" y2="8" />
      {/* Diamond */}
      <path d="M8 6 L10 8 L8 10 L6 8 Z" />
      {/* Right segment */}
      <line x1="10" y1="8" x2="14.5" y2="8" />
      {/* Tick marks */}
      <line x1="3.5" y1="6.5" x2="3.5" y2="9.5" strokeWidth={0.8} />
      <line x1="12.5" y1="6.5" x2="12.5" y2="9.5" strokeWidth={0.8} />
    </>
  );
}

/** Four horizontal lines of text with last line shorter */
export function BlockTextIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="2" y1="10" x2="14" y2="10" />
      <line x1="2" y1="13" x2="9" y2="13" />
    </>
  );
}

// ── Utility Icons ───────────────────────────────────────────────

/** 6 dots in 2x3 grid — drag handle */
export function GripIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      <circle cx="5.5" cy="4.5" r="1" fill={color} stroke="none" />
      <circle cx="10.5" cy="4.5" r="1" fill={color} stroke="none" />
      <circle cx="5.5" cy="8" r="1" fill={color} stroke="none" />
      <circle cx="10.5" cy="8" r="1" fill={color} stroke="none" />
      <circle cx="5.5" cy="11.5" r="1" fill={color} stroke="none" />
      <circle cx="10.5" cy="11.5" r="1" fill={color} stroke="none" />
    </>
  );
}

/** Checkmark inside subtle circle — Saved state */
export function SavedIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      <circle cx="8" cy="8" r="5.5" strokeWidth={0.9} />
      <path d="M5.5 8 L7.2 9.8 L10.5 6.2" strokeWidth={1.3} />
    </>
  );
}

/** Small filled circle — Unsaved state */
export function UnsavedIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      <circle cx="8" cy="8" r="4" fill={color} stroke="none" />
    </>
  );
}

/** Globe with small upward arrow from top */
export function PublishIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Globe */}
      <circle cx="8" cy="9" r="5.5" />
      <line x1="2.5" y1="9" x2="13.5" y2="9" strokeWidth={0.9} />
      <path d="M8 3.5 C6.5 5.5 6.5 12.5 8 14.5 C9.5 12.5 9.5 5.5 8 3.5" strokeWidth={0.9} />
      {/* Upward arrow from top */}
      <line x1="8" y1="1" x2="8" y2="4" strokeWidth={1.3} />
      <path d="M6.2 2.5 L8 1 L9.8 2.5" strokeWidth={1.3} />
    </>
  );
}

/** Eye with small sparkle in iris */
export function PreviewIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Eye outline */}
      <path d="M1.5 8 C3 5 5.2 3.5 8 3.5 C10.8 3.5 13 5 14.5 8 C13 11 10.8 12.5 8 12.5 C5.2 12.5 3 11 1.5 8 Z" />
      {/* Iris */}
      <circle cx="8" cy="8" r="2.3" />
      {/* Sparkle in iris */}
      <line x1="8" y1="6.8" x2="8" y2="9.2" strokeWidth={0.7} />
      <line x1="6.8" y1="8" x2="9.2" y2="8" strokeWidth={0.7} />
    </>
  );
}

/** Left-pointing arrow with vertical bar on left edge */
export function ExitIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Vertical bar */}
      <line x1="2.5" y1="3" x2="2.5" y2="13" strokeWidth={1.4} />
      {/* Arrow shaft */}
      <line x1="5" y1="8" x2="13.5" y2="8" />
      {/* Arrow head */}
      <path d="M8 5 L5 8 L8 11" />
    </>
  );
}

/** Curved counter-clockwise arrow */
export function UndoIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Curved arc */}
      <path d="M4 10 A5 5 0 1 1 12 10" strokeWidth={1.3} />
      {/* Arrowhead at start */}
      <path d="M4 10 L2 8 L4 6" strokeWidth={1.3} />
    </>
  );
}

/** Curved clockwise arrow */
export function RedoIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Curved arc */}
      <path d="M12 10 A5 5 0 1 0 4 10" strokeWidth={1.3} />
      {/* Arrowhead at end */}
      <path d="M12 10 L14 8 L12 6" strokeWidth={1.3} />
    </>
  );
}

/** Rounded square with stylized command symbol inside */
export function CommandIcon({ size = 16, color = 'currentColor', style }: IconProps) {
  return base(size, color, style,
    <>
      {/* Outer rounded square */}
      <rect x="2" y="2" width="12" height="12" rx="3" />
      {/* Command symbol — four corners */}
      <path d="M6 8 L6 6.5 A1.5 1.5 0 0 1 7.5 5 A1.5 1.5 0 0 1 9 6.5 L9 9.5 A1.5 1.5 0 0 0 10.5 11 A1.5 1.5 0 0 0 12 9.5 A1.5 1.5 0 0 0 10.5 8 L5.5 8 A1.5 1.5 0 0 0 4 9.5 A1.5 1.5 0 0 0 5.5 11 A1.5 1.5 0 0 0 7 9.5 L7 6.5" strokeWidth={1} />
    </>
  );
}
