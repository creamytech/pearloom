'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/InlineStylePicker.tsx
//
// Floating glassmorphic mini-picker that appears anchored to the
// Style button in SectionHoverToolbar. Lets the user change font
// pair, full palette, or just the accent color without leaving the
// canvas. "More options →" at the bottom opens the full Design panel
// as an escape hatch for advanced tweaks.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { VibeSkin } from '@/lib/vibe-engine';
import { useEditor } from '@/lib/editor-state';
import { PRESET_THEMES } from './ThemeSwitcher';

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface InlineStylePickerProps {
  anchor: AnchorRect;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// ── Pick a curated subset of the 30 presets ────────────────────
// Font pairs: distinct aesthetic voices (serif, thin, editorial, script, display)
const FONT_SWATCH_NAMES = [
  'Ivory Garden',       // Playfair Display / Inter        — classic serif
  'Midnight Luxe',      // Cormorant Garamond / Raleway    — thin elegant
  'Coastal Breeze',     // DM Serif Display / DM Sans      — modern display
  'Blush Editorial',    // Bodoni Moda / Montserrat        — bold editorial
  'Art Deco Glamour',   // Cinzel / Raleway                — uppercase tracked
];

// Palette swatches: diverse backgrounds (light cream, dark, blue, forest, blush, amber)
const PALETTE_SWATCH_NAMES = [
  'Ivory Garden',
  'Midnight Luxe',
  'Coastal Breeze',
  'Forest Romance',
  'Blush Editorial',
  'Golden Hour',
];

// Accent row: one accent color per preset (different from palette set so user
// sees variety)
const ACCENT_SWATCH_NAMES = [
  'Ivory Garden',       // #6B8F55 muted green
  'Midnight Luxe',      // #D4AF37 gold
  'Blush Editorial',    // #7A1E3A wine
  'Coastal Breeze',     // #C8A96E camel
  'Art Deco Glamour',   // #C9A84C deco gold
  'Garden Party',       // #E0705A coral
];

const pickPreset = (name: string) =>
  PRESET_THEMES.find((p) => p.name === name);

const POP_WIDTH = 300;
const POP_OFFSET_Y = 8;

export function InlineStylePicker({
  anchor,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: InlineStylePickerProps) {
  const { manifest, actions, dispatch } = useEditor();
  const popRef = useRef<HTMLDivElement>(null);

  // Escape + outside click dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    // Delay outside-click so the opening click doesn't immediately dismiss
    const t = setTimeout(() => window.addEventListener('mousedown', onClick), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
      clearTimeout(t);
    };
  }, [onClose]);

  // ── Manifest update helpers (mirror DesignPanel.updateFonts / handleThemeApply)
  const applyFonts = (fonts: VibeSkin['fonts']) => {
    if (!manifest) return;
    actions.handleDesignChange({
      ...manifest,
      theme: { ...manifest.theme, fonts: { heading: fonts.heading, body: fonts.body } },
      vibeSkin: manifest.vibeSkin
        ? { ...manifest.vibeSkin, fonts: { ...manifest.vibeSkin.fonts, ...fonts } }
        : manifest.vibeSkin,
    });
  };

  const applyPalette = (palette: VibeSkin['palette']) => {
    if (!manifest) return;
    actions.handleDesignChange({
      ...manifest,
      vibeSkin: manifest.vibeSkin
        ? { ...manifest.vibeSkin, palette: { ...manifest.vibeSkin.palette, ...palette } }
        : manifest.vibeSkin,
      theme: {
        ...manifest.theme,
        colors: {
          ...manifest.theme.colors,
          background: palette.background,
          foreground: palette.foreground,
          accent: palette.accent,
          muted: palette.muted,
        },
      },
    });
  };

  const applyAccent = (accent: string) => {
    if (!manifest) return;
    actions.handleDesignChange({
      ...manifest,
      vibeSkin: manifest.vibeSkin
        ? {
            ...manifest.vibeSkin,
            palette: { ...manifest.vibeSkin.palette, accent },
          }
        : manifest.vibeSkin,
      theme: {
        ...manifest.theme,
        colors: { ...manifest.theme.colors, accent },
      },
    });
  };

  const openFullPanel = () => {
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
    onClose();
  };

  // ── Positioning: centered below the anchor, clamped to viewport edges
  const centerX = anchor.left + anchor.width / 2;
  const left = Math.max(8, Math.min(centerX - POP_WIDTH / 2, (typeof window !== 'undefined' ? window.innerWidth : 1920) - POP_WIDTH - 8));
  const top = anchor.top + anchor.height + POP_OFFSET_Y;

  return (
    <motion.div
      ref={popRef}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 480, damping: 32 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={(e) => {
        // Guard: if the mouse is moving to a child of the popover (e.g.
        // onto a swatch button), don't arm the hide timer. Only treat
        // this as a real "leave" when relatedTarget is outside popRef.
        const related = e.relatedTarget as Node | null;
        if (related && popRef.current?.contains(related)) return;
        onMouseLeave?.();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="pl-panel-card"
      style={{
        position: 'fixed',
        top,
        left,
        width: POP_WIDTH,
        maxHeight: '70vh',
        overflowY: 'auto',
        zIndex: 160,
        borderRadius: 14,
        background: 'rgba(24,24,27,0.94)',
        backdropFilter: 'blur(18px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
        color: 'rgba(255,255,255,0.92)',
        padding: '12px 14px 12px',
        fontFamily: 'var(--pl-font-body, inherit)',
      } as React.CSSProperties}
    >
      {/* Fonts */}
      <SectionLabel>Font pair</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {FONT_SWATCH_NAMES.map((name) => {
          const p = pickPreset(name);
          if (!p) return null;
          const active =
            manifest?.vibeSkin?.fonts?.heading === p.fonts.heading &&
            manifest?.vibeSkin?.fonts?.body === p.fonts.body;
          return (
            <button
              key={name}
              type="button"
              onClick={() => applyFonts(p.fonts)}
              title={`Apply ${name} fonts`}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 8,
                background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                border: active
                  ? '1px solid rgba(255,255,255,0.18)'
                  : '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.92)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 120ms ease, border-color 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  fontFamily: `'${p.fonts.heading}', serif`,
                  fontSize: 16,
                  lineHeight: 1.1,
                  letterSpacing: '0.01em',
                  color: 'rgba(255,255,255,0.96)',
                }}
              >
                {p.fonts.heading}
              </span>
              <span
                style={{
                  fontFamily: `'${p.fonts.body}', sans-serif`,
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.55)',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.fonts.body}
              </span>
            </button>
          );
        })}
      </div>

      {/* Palette */}
      <SectionLabel>Color palette</SectionLabel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 6,
          marginBottom: 12,
        }}
      >
        {PALETTE_SWATCH_NAMES.map((name) => {
          const p = pickPreset(name);
          if (!p) return null;
          const active = manifest?.vibeSkin?.palette?.background === p.palette.background
            && manifest?.vibeSkin?.palette?.accent === p.palette.accent;
          const stripes: Array<{ color: string; key: string }> = [
            { key: 'bg', color: p.palette.background },
            { key: 'accent', color: p.palette.accent },
            { key: 'accent2', color: p.palette.accent2 },
            { key: 'ink', color: p.palette.ink },
          ];
          return (
            <button
              key={name}
              type="button"
              onClick={() => applyPalette(p.palette)}
              title={`Apply ${name} palette`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: 6,
                borderRadius: 8,
                background: active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                border: active
                  ? '1px solid rgba(255,255,255,0.22)'
                  : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 120ms ease, border-color 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  height: 16,
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {stripes.map((s) => (
                  <div key={s.key} style={{ flex: 1, background: s.color }} />
                ))}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.8)',
                  letterSpacing: '0.01em',
                  lineHeight: 1.2,
                }}
              >
                {name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Accent */}
      <SectionLabel>Accent color</SectionLabel>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {ACCENT_SWATCH_NAMES.map((name) => {
          const p = pickPreset(name);
          if (!p) return null;
          const active = manifest?.vibeSkin?.palette?.accent === p.palette.accent;
          return (
            <button
              key={name}
              type="button"
              onClick={() => applyAccent(p.palette.accent)}
              title={`${name} accent`}
              aria-label={`${name} accent`}
              style={{
                flex: 1,
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: p.palette.accent,
                border: active
                  ? '2px solid rgba(255,255,255,0.95)'
                  : '2px solid rgba(255,255,255,0.15)',
                boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.25)' : 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'transform 120ms ease, border-color 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1.0)'; }}
            />
          );
        })}
      </div>

      {/* Escape hatch — visually separated from the swatches above with a
          top border and small-caps label so it reads as the "go deeper"
          row rather than just another swatch button. */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          type="button"
          onClick={openFullPanel}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 4,
            width: '100%',
            padding: '6px 8px',
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            textAlign: 'right',
            transition: 'background 120ms ease, color 120ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.95)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
          }}
        >
          <span>More options</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}
