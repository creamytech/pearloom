'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/CanvasHeroEditBar.tsx
// Floating inline edit bar for the hero section.
// Opens on an explicit click on the hero (see SiteRenderer).
// Lets the user pick text colour, badge style, countdown style,
// and now also heading + body font — all inline, no side-panel.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Calendar, Hash, Palette, ChevronDown, Check, ExternalLink } from 'lucide-react';
import type { StoryManifest } from '@/types';
import { buildSingleFontUrl } from '@/lib/font-catalog';
import { InlineColorCustomButton } from './InlineColorCustomButton';

interface CanvasHeroEditBarProps {
  rect: DOMRect;
  manifest: StoryManifest;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onStyleChange: (field: string, value: string) => void;
  /** Update both heading + body font at once (writes to theme.fonts). */
  onFontsChange: (heading: string, body: string) => void;
  /** Opens the full Design panel Typography section for power users. */
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
  { value: '#5C6B3F', label: 'Olive'   },
  { value: '#C4A96A', label: 'Gold'    },
];

// Curated inline font picklist — matches PearTextRewrite for consistency.
// Heading fonts lean serif/display; body fonts lean sans.
const HEADING_FONTS = [
  'Playfair Display',
  'Cormorant Garamond',
  'Lora',
  'Libre Baskerville',
  'EB Garamond',
  'Dancing Script',
  'Great Vibes',
  'Pinyon Script',
] as const;

const BODY_FONTS = [
  'Inter',
  'DM Sans',
  'Montserrat',
  'Raleway',
  'Josefin Sans',
  'Lato',
  'Open Sans',
] as const;

const __injectedFontHrefs = new Set<string>();
function ensureFontLoaded(name: string) {
  if (typeof document === 'undefined') return;
  const href = buildSingleFontUrl(name);
  if (__injectedFontHrefs.has(href)) return;
  __injectedFontHrefs.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const PILL_BTN: React.CSSProperties = {
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: 1,
  fontFamily: 'inherit',
  transition: 'all var(--pl-dur-instant)',
};

export function CanvasHeroEditBar({
  rect,
  manifest,
  canvasRef,
  onStyleChange,
  onFontsChange,
  onFontClick,
}: CanvasHeroEditBarProps) {
  const canvasRect = canvasRef.current?.getBoundingClientRect();
  const [fontsOpen, setFontsOpen] = useState(false);
  const fontBtnRef = useRef<HTMLButtonElement>(null);

  // Preload currently-selected fonts so previews in the popover render correctly.
  useEffect(() => {
    HEADING_FONTS.forEach(ensureFontLoaded);
    BODY_FONTS.forEach(ensureFontLoaded);
  }, []);

  if (!canvasRect) return null;

  // Item 47: `rect` is the hero element's full getBoundingClientRect() which
  // spans every wrapped tagline line, so anchoring to rect.bottom/rect.left
  // already accounts for long taglines that push the hero taller.
  const barWidth = 520;
  const barHeightApprox = 44;
  let relBottom = rect.bottom - canvasRect.top - 56;
  const centerX = rect.left - canvasRect.left + rect.width / 2 - barWidth / 2;
  const clampedX = Math.max(8, Math.min(centerX, canvasRect.width - barWidth - 8));

  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportBarBottom = rect.bottom - 56 + barHeightApprox;
  if (viewportBarBottom > viewportH - 8) {
    const delta = viewportBarBottom - (viewportH - 8);
    relBottom = Math.max(8, relBottom - delta);
  }

  const badgeStyle   = manifest.heroBadgeStyle ?? 'pill';
  const cdStyle      = manifest.heroCountdownStyle ?? 'cards';
  const textColor    = manifest.heroTextColorOverride ?? '';
  const headingFont  = manifest.theme?.fonts?.heading ?? 'Playfair Display';
  const bodyFont     = manifest.theme?.fonts?.body ?? 'Inter';

  return (
    <motion.div
      data-pe-hero-editbar="true"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
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
            aria-label={`Select color ${s.label} (${s.value})`}
            aria-pressed={textColor === s.value}
            onClick={() => onStyleChange('heroTextColorOverride', s.value)}
            style={{
              ...PILL_BTN,
              width: '18px',
              height: '18px',
              padding: 0,
              borderRadius: '50%',
              background: s.value,
              border: textColor === s.value ? '2px solid var(--pl-olive)' : '1.5px solid rgba(255,255,255,0.2)',
            }}
          />
        ))}
        {/* Custom-color picker — any hex / HSL. */}
        <InlineColorCustomButton
          value={textColor}
          onChange={(hex) => onStyleChange('heroTextColorOverride', hex)}
          size={18}
          presetActive={!!textColor && COLOR_SWATCHES.some(s => s.value.toLowerCase() === textColor.toLowerCase())}
          title="Custom text color"
        />
        {textColor && (
          <button
            title="Clear color override"
            onClick={() => onStyleChange('heroTextColorOverride', '')}
            style={{ ...PILL_BTN, color: 'rgba(255,255,255,0.4)', background: 'none', padding: '2px 4px', fontSize: '10px' }}
          >
            ✕
          </button>
        )}
      </div>

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
              color: badgeStyle === b.id ? 'var(--pl-olive)' : 'rgba(255,255,255,0.55)',
              border: badgeStyle === b.id ? '1px solid rgba(163,177,138,0.4)' : '1px solid transparent',
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

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
              color: cdStyle === c.id ? 'var(--pl-olive)' : 'rgba(255,255,255,0.55)',
              border: cdStyle === c.id ? '1px solid rgba(163,177,138,0.4)' : '1px solid transparent',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

      {/* ── Font selector (inline popover) ── */}
      <div style={{ position: 'relative' }}>
        <button
          ref={fontBtnRef}
          onClick={() => setFontsOpen(v => !v)}
          title="Change Fonts"
          style={{
            ...PILL_BTN,
            display: 'flex', alignItems: 'center', gap: '4px',
            background: fontsOpen ? 'rgba(163,177,138,0.25)' : 'rgba(255,255,255,0.06)',
            color: fontsOpen ? 'var(--pl-olive)' : 'rgba(255,255,255,0.55)',
            border: fontsOpen ? '1px solid rgba(163,177,138,0.4)' : '1px solid transparent',
          }}
        >
          <Type size={11} />
          Fonts
          <ChevronDown size={10} style={{ transform: fontsOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--pl-dur-instant)' }} />
        </button>

        <AnimatePresence>
          {fontsOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '260px',
                maxHeight: '360px',
                overflowY: 'auto',
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(24,24,27,0.96)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                zIndex: 200,
              }}
            >
              <FontGroup
                label="Heading"
                fonts={HEADING_FONTS as unknown as string[]}
                active={headingFont}
                fallback="serif"
                onSelect={(f) => { ensureFontLoaded(f); onFontsChange(f, bodyFont); }}
              />
              <div style={{ height: '10px' }} />
              <FontGroup
                label="Body"
                fonts={BODY_FONTS as unknown as string[]}
                active={bodyFont}
                fallback="sans-serif"
                onSelect={(f) => { ensureFontLoaded(f); onFontsChange(headingFont, f); }}
              />

              <button
                onClick={() => { setFontsOpen(false); onFontClick(); }}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ExternalLink size={10} />
                More fonts & pairings
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function FontGroup({
  label,
  fonts,
  active,
  fallback,
  onSelect,
}: {
  label: string;
  fonts: string[];
  active: string;
  fallback: string;
  onSelect: (font: string) => void;
}) {
  return (
    <div>
      <div style={{
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: '6px',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {fonts.map(f => {
          const isActive = f === active;
          return (
            <button
              key={f}
              onMouseEnter={() => ensureFontLoaded(f)}
              onClick={() => onSelect(f)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 9px',
                borderRadius: '6px',
                border: isActive ? '1px solid rgba(163,177,138,0.5)' : '1px solid transparent',
                background: isActive ? 'rgba(163,177,138,0.15)' : 'transparent',
                color: isActive ? 'var(--pl-olive)' : 'rgba(255,255,255,0.75)',
                fontFamily: `'${f}', ${fallback}`,
                fontSize: '13px',
                lineHeight: 1.2,
                cursor: 'pointer',
                transition: 'all 0.1s',
                textAlign: 'left',
              }}
              onMouseOver={(e) => { if (!isActive) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)'); }}
              onMouseOut={(e) => { if (!isActive) (e.currentTarget.style.background = 'transparent'); }}
            >
              <span>{f}</span>
              {isActive && <Check size={11} color="var(--pl-olive)" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
