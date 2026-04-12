'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelChip.tsx
// Canonical selector/chip component for editor panels. Replaces
// the 4+ different active/inactive formulas currently in use:
//   • ChapterPanel moods
//   • EventsPanel event-type pills
//   • StoryPanel style tiles
//   • DesignPanel logo icon picker (the "good" baseline)
//
// PanelChip delegates visuals to panel-tokens.panelChip so the
// selected-state formula lives in one place for the whole editor.
// ─────────────────────────────────────────────────────────────

import type { ReactNode, CSSProperties, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { panelChip, panelText, panelWeight } from './panel-tokens';

export interface PanelChipProps {
  /** Whether this chip is currently selected. */
  active?: boolean;
  /** Click handler. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Chip content — usually a label, optionally an icon. */
  children: ReactNode;
  /**
   * Optional accent color override. When provided, the active state
   * uses this color for the border + tinted background instead of
   * the default olive. Used by EventsPanel to show per-event-type
   * colors while keeping the chrome consistent.
   */
  accentColor?: string;
  /** Visual variant. Default "pill" (100px radius). */
  variant?: 'pill' | 'tile';
  /** "sm" (compact) or "md" (default) height. */
  size?: 'sm' | 'md';
  /** Optional trailing meta text / description. */
  hint?: string;
  /** Disable the chip. */
  disabled?: boolean;
  /** aria-label override. */
  ariaLabel?: string;
  /** Additional inline styles to merge onto the root. */
  style?: CSSProperties;
  /** Stretch to fill its grid cell. Default true. */
  fullWidth?: boolean;
}

export function PanelChip({
  active = false,
  onClick,
  children,
  accentColor,
  variant = 'pill',
  size = 'md',
  hint,
  disabled = false,
  ariaLabel,
  style,
  fullWidth = true,
}: PanelChipProps) {
  const base = active ? panelChip.active : panelChip.inactive;

  const border = active
    ? accentColor
      ? `2px solid ${accentColor}`
      : base.border
    : base.border;

  const background = active
    ? accentColor
      ? toSoftBackground(accentColor)
      : base.background
    : base.background;

  const color = active
    ? accentColor
      ? toDeepText(accentColor)
      : base.color
    : '#3F3F46';

  const radius = variant === 'pill' ? '100px' : panelChip.radius;
  const padding = size === 'sm' ? '6px 12px' : '8px 14px';
  const fontSize = size === 'sm' ? panelText.meta : panelText.chip;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      whileHover={disabled ? undefined : { y: -1, scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{
        width: fullWidth ? '100%' : 'auto',
        border,
        background,
        color,
        borderRadius: radius,
        padding,
        fontSize,
        fontWeight: active ? panelWeight.bold : panelWeight.semibold,
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: hint ? 'column' : 'row',
        alignItems: hint ? 'flex-start' : 'center',
        gap: hint ? '2px' : '6px',
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: panelChip.transition,
        ...style,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
        }}
      >
        {children}
      </span>
      {hint && (
        <span
          style={{
            fontSize: panelText.meta,
            fontWeight: panelWeight.regular,
            lineHeight: 1.3,
            opacity: active ? 0.85 : 0.65,
          }}
        >
          {hint}
        </span>
      )}
    </motion.button>
  );
}

/**
 * Convenience grid wrapper: lays chips out in a responsive grid so
 * every panel's picker UI has the same spacing + alignment.
 */
export function PanelChipGroup({
  children,
  columns = 'auto',
  gap = '8px',
}: {
  children: ReactNode;
  /** 'auto' (fill), or a fixed column count 1–4. */
  columns?: 'auto' | 1 | 2 | 3 | 4;
  /** Gap between chips. */
  gap?: string;
}) {
  const gridTemplateColumns =
    columns === 'auto'
      ? 'repeat(auto-fill, minmax(120px, 1fr))'
      : `repeat(${columns}, minmax(0, 1fr))`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns,
        gap,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

// ── Color helpers ─────────────────────────────────────────────

/**
 * Convert a hex accent to a very soft translucent background that
 * matches the default `rgba(24,24,27,0.06)` formula used in the
 * baseline chip style.
 */
function toSoftBackground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgba(24,24,27,0.06)';
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.12)`;
}

/**
 * Convert a hex accent to a slightly darkened / deepened version
 * suitable for text inside the tinted background. For now we just
 * return the input — tokens clamp to the CSS var in the default
 * path, so this branch only runs when an accent color override is
 * supplied (e.g. EventsPanel event-type colors) where the accent
 * is already dark enough to read.
 */
function toDeepText(hex: string): string {
  return hex;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}
