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
        borderRadius: 'var(--pl-radius-xs)',
        background: 'linear-gradient(180deg, #FDFAF0 0%, #F3EFE7 100%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '2px solid rgba(193,154,75,0.55)',
        borderLeft: '1px solid rgba(193,154,75,0.22)',
        borderRight: '1px solid rgba(193,154,75,0.22)',
        borderBottom: '1px solid rgba(193,154,75,0.22)',
        boxShadow: '0 20px 48px rgba(28,22,10,0.22), 0 2px 10px rgba(28,22,10,0.06)',
        color: '#18181B',
        padding: '14px 16px 14px',
        fontFamily: 'var(--pl-font-body, inherit)',
      } as React.CSSProperties}
    >
      {/* Masthead */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        paddingBottom: 10,
        marginBottom: 12,
        borderBottom: '1px solid rgba(193,154,75,0.28)',
      }}>
        <span style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(193,154,75,0.85)',
        }}>
          Style
        </span>
        <span style={{
          fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
          fontStyle: 'italic',
          fontSize: 18,
          lineHeight: 1.1,
          fontWeight: 400,
          color: '#18181B',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}>
          Dress the page.
        </span>
      </div>
      {/* Fonts */}
      <SectionLabel>Font pair</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {FONT_SWATCH_NAMES.map((name, idx) => {
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
                display: 'grid',
                gridTemplateColumns: '22px 1fr auto',
                alignItems: 'baseline',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 'var(--pl-radius-xs)',
                background: active ? 'rgba(193,154,75,0.12)' : 'rgba(255,252,245,0.55)',
                border: active
                  ? '1px solid rgba(193,154,75,0.65)'
                  : '1px solid rgba(193,154,75,0.18)',
                color: '#18181B',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: active ? '0 0 0 2px rgba(193,154,75,0.14)' : 'none',
                transition: 'background 180ms cubic-bezier(0.22,1,0.36,1), border-color 180ms ease, box-shadow 180ms ease',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(193,154,75,0.08)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,252,245,0.55)';
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  color: active ? 'rgba(193,154,75,0.95)' : 'rgba(193,154,75,0.55)',
                  alignSelf: 'center',
                }}
              >
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontFamily: `'${p.fonts.heading}', serif`,
                  fontStyle: 'italic',
                  fontSize: 16,
                  lineHeight: 1.1,
                  letterSpacing: '0.01em',
                  color: '#18181B',
                }}
              >
                {p.fonts.heading}
              </span>
              <span
                style={{
                  fontFamily: `'${p.fonts.body}', sans-serif`,
                  fontSize: 9.5,
                  color: '#52525B',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.04em',
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
        {PALETTE_SWATCH_NAMES.map((name, idx) => {
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
                gap: 5,
                padding: 7,
                borderRadius: 'var(--pl-radius-xs)',
                background: active ? 'rgba(193,154,75,0.12)' : 'rgba(255,252,245,0.55)',
                border: active
                  ? '1px solid rgba(193,154,75,0.65)'
                  : '1px solid rgba(193,154,75,0.18)',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: active ? '0 0 0 2px rgba(193,154,75,0.14)' : 'none',
                transition: 'background 180ms cubic-bezier(0.22,1,0.36,1), border-color 180ms ease, box-shadow 180ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(193,154,75,0.08)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,252,245,0.55)';
              }}
            >
              <span style={{
                position: 'absolute',
                top: 4,
                right: 6,
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 7.5,
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: active ? 'rgba(193,154,75,0.95)' : 'rgba(193,154,75,0.45)',
              }}>
                № {String(idx + 1).padStart(2, '0')}
              </span>
              <div
                style={{
                  display: 'flex',
                  height: 18,
                  borderRadius: 'var(--pl-radius-xs)',
                  overflow: 'hidden',
                  border: '1px solid rgba(193,154,75,0.18)',
                  marginTop: 10,
                }}
              >
                {stripes.map((s) => (
                  <div key={s.key} style={{ flex: 1, background: s.color }} />
                ))}
              </div>
              <span
                style={{
                  fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                  fontStyle: 'italic',
                  fontSize: 11,
                  fontWeight: 400,
                  color: '#18181B',
                  letterSpacing: '0.005em',
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
                borderRadius: 'var(--pl-radius-xs)',
                background: p.palette.accent,
                border: active
                  ? '1.5px solid #18181B'
                  : '1px solid rgba(193,154,75,0.28)',
                boxShadow: active ? '0 0 0 3px rgba(193,154,75,0.35)' : 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1), box-shadow 180ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            />
          );
        })}
      </div>

      {/* Escape hatch — visually separated from the swatches above with a
          top border and small-caps label so it reads as the "go deeper"
          row rather than just another swatch button. */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid rgba(193,154,75,0.28)',
        }}
      >
        <button
          type="button"
          onClick={openFullPanel}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            width: '100%',
            padding: '9px 12px',
            borderRadius: 'var(--pl-radius-xs)',
            background: 'transparent',
            border: '1px dashed rgba(193,154,75,0.55)',
            color: '#18181B',
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 180ms cubic-bezier(0.22,1,0.36,1), border-color 180ms ease, color 180ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(193,154,75,0.10)';
            e.currentTarget.style.borderColor = 'rgba(193,154,75,0.75)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(193,154,75,0.55)';
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 9,
              letterSpacing: '0.28em',
              color: 'rgba(193,154,75,0.95)',
            }}>
              →
            </span>
            <span>Open Design panel</span>
          </span>
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
        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.26em',
        textTransform: 'uppercase',
        color: 'rgba(193,154,75,0.85)',
        marginBottom: 7,
      }}
    >
      {children}
    </div>
  );
}
