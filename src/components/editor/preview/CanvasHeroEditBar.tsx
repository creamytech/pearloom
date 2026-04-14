'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/CanvasHeroEditBar.tsx
// Floating inline edit bar for the hero section.
// Appears when the hero is hovered in edit mode; lets the user
// pick text colour, badge style, countdown style, and font
// without leaving the canvas.
// Pattern: same keep-alive timer as CanvasChapterToolbar.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Type, Calendar, Hash, Palette } from 'lucide-react';
import type { StoryManifest } from '@/types';

interface CanvasHeroEditBarProps {
  rect: DOMRect;
  manifest: StoryManifest;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onStyleChange: (field: string, value: string) => void;
  onFontClick: () => void;
}

const BADGE_STYLES: Array<{ id: NonNullable<StoryManifest['heroBadgeStyle']>; label: string }> = [
  { id: 'pill',     label: 'Pill'     },
  { id: 'outlined', label: 'Outlined' },
  { id: 'card',     label: 'Card'     },
  { id: 'minimal',  label: 'Minimal'  },
];

const COUNTDOWN_STYLES: Array<{ id: NonNullable<StoryManifest['heroCountdownStyle']>; label: string }> = [
  { id: 'cards',   label: 'Cards'   },
  { id: 'minimal', label: 'Minimal' },
  { id: 'large',   label: 'Large'   },
];

const COLOR_SWATCHES = [
  { value: '#ffffff', label: 'White'   },
  { value: '#18181B', label: 'Ink'     },
  { value: '#F5F1E8', label: 'Cream'   },
  { value: '#A3B18A', label: 'Olive'   },
  { value: '#C4A96A', label: 'Gold'    },
];

const PILL_BTN: React.CSSProperties = {
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: 1,
  fontFamily: 'inherit',
  transition: 'all 0.12s',
};

export function CanvasHeroEditBar({
  rect,
  manifest,
  canvasRef,
  onStyleChange,
  onFontClick,
}: CanvasHeroEditBarProps) {
  const canvasRect = canvasRef.current?.getBoundingClientRect();
  if (!canvasRect) return null;

  // Position bar horizontally centered at the bottom of the hero rect
  const relBottom = rect.bottom - canvasRect.top - 56; // 56px above bottom edge
  const barWidth = 520;
  const centerX = rect.left - canvasRect.left + rect.width / 2 - barWidth / 2;
  const clampedX = Math.max(8, Math.min(centerX, canvasRect.width - barWidth - 8));

  const badgeStyle = manifest.heroBadgeStyle ?? 'pill';
  const cdStyle    = manifest.heroCountdownStyle ?? 'cards';
  const textColor  = manifest.heroTextColorOverride ?? '';

  const onMouseEnter = () => {
    window.dispatchEvent(new CustomEvent('pearloom-hero-hover-keep'));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onMouseEnter={onMouseEnter}
      style={{
        position: 'absolute',
        bottom: 'auto',
        top: relBottom,
        left: clampedX,
        width: `${barWidth}px`,
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 12px',
        borderRadius: '12px',
        background: 'rgba(24,24,27,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        flexWrap: 'wrap',
        pointerEvents: 'auto',
      } as React.CSSProperties}
    >
      {/* ── Text Color ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Palette size={11} color="rgba(255,255,255,0.5)" />
        {COLOR_SWATCHES.map(s => (
          <button
            key={s.value}
            title={s.label}
            onClick={() => onStyleChange('heroTextColorOverride', s.value)}
            style={{
              ...PILL_BTN,
              width: '18px',
              height: '18px',
              padding: 0,
              borderRadius: '50%',
              background: s.value,
              border: textColor === s.value ? '2px solid #A3B18A' : '1.5px solid rgba(255,255,255,0.2)',
            }}
          />
        ))}
        {textColor && !COLOR_SWATCHES.find(s => s.value === textColor) && (
          <button
            title="Clear color override"
            onClick={() => onStyleChange('heroTextColorOverride', '')}
            style={{ ...PILL_BTN, color: 'rgba(255,255,255,0.4)', background: 'none', padding: '2px 4px', fontSize: '10px' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

      {/* ── Badge Style ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Calendar size={11} color="rgba(255,255,255,0.5)" />
        {BADGE_STYLES.map(b => (
          <button
            key={b.id}
            onClick={() => onStyleChange('heroBadgeStyle', b.id)}
            style={{
              ...PILL_BTN,
              background: badgeStyle === b.id ? 'rgba(163,177,138,0.25)' : 'rgba(255,255,255,0.06)',
              color: badgeStyle === b.id ? '#A3B18A' : 'rgba(255,255,255,0.55)',
              border: badgeStyle === b.id ? '1px solid rgba(163,177,138,0.4)' : '1px solid transparent',
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* ── Divider ── */}
      <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

      {/* ── Countdown Style ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Hash size={11} color="rgba(255,255,255,0.5)" />
        {COUNTDOWN_STYLES.map(c => (
          <button
            key={c.id}
            onClick={() => onStyleChange('heroCountdownStyle', c.id)}
            style={{
              ...PILL_BTN,
              background: cdStyle === c.id ? 'rgba(163,177,138,0.25)' : 'rgba(255,255,255,0.06)',
              color: cdStyle === c.id ? '#A3B18A' : 'rgba(255,255,255,0.55)',
              border: cdStyle === c.id ? '1px solid rgba(163,177,138,0.4)' : '1px solid transparent',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Divider ── */}
      <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

      {/* ── Font button ── */}
      <button
        onClick={onFontClick}
        title="Change Fonts"
        style={{
          ...PILL_BTN,
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.55)',
          border: '1px solid transparent',
        }}
      >
        <Type size={11} />
        Fonts
      </button>
    </motion.div>
  );
}
