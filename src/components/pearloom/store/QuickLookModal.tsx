'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/QuickLookModal.tsx
//
// Centered "Quick Look" modal for a single theme pack. Full-bleed
// pack site preview on the left, pack metadata + "what's
// included" + the Apply CTA on the right. Design is free
// (EDITOR-CALM-PLAN E.1) — no price, no tier, no ownership,
// no cart; the one CTA is "Apply to my site".
//
// Closes on:
//   - Esc
//   - backdrop click
//   - × button
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../motifs';
import { useIsMobile } from '../redesign/use-nav-hooks';
import { PackSitePreview } from './PackSitePreview';
import { collectionName, fontName, kitLabel } from './utils';
import { EXCLUSIVE_KITS } from '@/lib/theme-store/packs';
import type { Pack, Includes } from '@/lib/theme-store/packs';

interface QuickLookModalProps {
  /** The pack currently being looked at, or null when closed. */
  pack: Pack | null;
  onClose: () => void;
  /**
   * "Apply to my site" handler. Receives the pack so the host can
   * stash {id, vars, kit} in localStorage and redirect to the
   * editor.
   */
  onApply?: (pack: Pack) => void;
}

// "What's included" → human label + icon name. The pack's
// `includes[]` is derived from the factory (palette + type +
// kit always; texture/pattern/motif when non-'none').
const INCLUDES_META: Record<
  Includes,
  { icon: string; title: (p: Pack) => string; subtitle: (p: Pack) => string }
> = {
  palette: {
    icon: 'palette',
    title: () => 'Curated palette',
    subtitle: (p) => `${p.swatches.length} coordinated colors`,
  },
  type: {
    icon: 'text',
    title: () => 'Type pairing',
    subtitle: (p) =>
      `${fontName(p.themeRef['--t-display'])} + ${fontName(p.themeRef['--t-body'])}`,
  },
  kit: {
    icon: 'layout',
    title: () => 'Card style',
    subtitle: (p) => EXCLUSIVE_KITS.has(p.kit)
      ? `${kitLabel(p.kit)}, only with this pack`
      : `${kitLabel(p.kit)} styling`,
  },
  texture: {
    icon: 'sparkles',
    title: () => 'Material texture',
    subtitle: (p) =>
      p.texture === 'none'
        ? 'Flat matte finish'
        : `${p.texture[0].toUpperCase() + p.texture.slice(1)} texture`,
  },
  pattern: {
    icon: 'grid',
    title: () => 'Surface pattern',
    subtitle: (p) =>
      p.pattern === 'none'
        ? 'Unpatterned'
        : `${p.pattern[0].toUpperCase() + p.pattern.slice(1)} pattern`,
  },
  motifs: {
    icon: 'leaf',
    title: () => 'Decorations & dividers',
    subtitle: (p) =>
      p.motif === 'none'
        ? 'Clean, no motifs'
        : ['chandelier', 'bow', 'sparkler'].includes(p.motif)
          ? `${p.motif[0].toUpperCase() + p.motif.slice(1)} artwork, only with this pack`
          : `${p.motif[0].toUpperCase() + p.motif.slice(1)} artwork`,
  },
};

export function QuickLookModal({
  pack,
  onClose,
  onApply,
}: QuickLookModalProps) {
  // Below ~720px the two-pane layout crushes both panes — stack
  // previews above details instead. SSR-safe matchMedia hook.
  const isNarrow = useIsMobile(720);
  // Track the DOM target for createPortal. Same lazy-init pattern
  // TemplatePreviewModal uses: resolve once on the first client
  // render, null during SSR. Avoids the setState-in-effect cascade.
  const [portalTarget] = useState<HTMLElement | null>(() => {
    return typeof document !== 'undefined' ? document.body : null;
  });
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Esc to close
  useEffect(() => {
    if (!pack) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pack, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!pack) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pack]);

  // Focus the close button on open
  useEffect(() => {
    if (!pack) return;
    closeBtnRef.current?.focus();
  }, [pack]);

  if (!pack || !portalTarget) return null;

  const modal = (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${pack.name}, quick look`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300 /* --z-modal */,
        background: 'rgba(14,13,11,0.5)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: isNarrow ? 12 : 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(940px, 96vw)',
          maxHeight: '92vh',
          overflow: 'auto',
          background: 'var(--pl-cream-card, #FBF7EE)',
          color: 'var(--pl-ink, #0E0D0B)',
          borderRadius: 'var(--pl-radius-2xl, 1.5rem)',
          boxShadow: 'var(--pl-shadow-xl, 0 16px 48px rgba(40,28,12,0.18))',
          display: 'grid',
          // Two panes side-by-side on desktop; stacked (previews
          // above, details below) on phones.
          gridTemplateColumns: isNarrow ? 'minmax(0, 1fr)' : 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
          position: 'relative',
        }}
      >
        {/* Stacked layout puts the details-pane × below the fold —
            pin a close affordance over the previews instead. It
            carries the focus ref so opening the modal doesn't
            auto-scroll past the preview pane. */}
        {isNarrow && (
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 2,
              width: 40,
              height: 40,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              /* Theme-aware glass so the close glyph (ink-soft, which
                 flips cream in dark) doesn't vanish on a fixed cream
                 button over the pack preview. */
              background: 'var(--pl-glass, rgba(251,247,238,0.92))',
              border: '1px solid var(--pl-glass-border, var(--pl-divider, #D8CFB8))',
              cursor: 'pointer',
              color: 'var(--pl-ink-soft, #3A332C)',
            }}
          >
            <Icon name="close" size={15} />
          </button>
        )}
        {/* LEFT — previews */}
        <div
          style={{
            background: 'var(--pl-cream-deep, #EBE3D2)',
            padding: isNarrow ? 16 : 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            minWidth: 0,
          }}
        >
          {/* The WHOLE demo site wearing this pack — scrollable,
              real renderer, the exact applyPackToManifest transform
              Apply runs. Replaces the hero-crop vignette + static
              schedule mock (2026-06-12: "the theme shop should show
              actual full previews"). */}
          <div
            style={{
              borderRadius: 'var(--pl-radius-xl, 1rem)',
              overflow: 'hidden',
              border: '1px solid var(--pl-divider, #D8CFB8)',
            }}
          >
            <PackSitePreview pack={pack} height={520} wide={!isNarrow} />
          </div>
        </div>

        {/* RIGHT — details */}
        <div
          style={{
            padding: isNarrow ? '20px 18px 18px' : '26px 26px 22px',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
              {pack.badges.new && (
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'var(--pl-warning-mist, rgba(161,74,44,0.12))',
                    color: 'var(--pl-warning, #A14A2C)',
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                  }}
                >
                  New
                </span>
              )}
            </div>
            {!isNarrow && (
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--pl-cream-deep, #EBE3D2)',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--pl-ink-soft, #3A332C)',
                  flexShrink: 0,
                }}
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </div>

          <h2
            style={{
              fontFamily: 'var(--pl-font-display, Fraunces), serif',
              fontSize: 32,
              fontWeight: 600,
              margin: '12px 0 4px',
              lineHeight: 1.05,
            }}
          >
            {pack.name}
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--pl-muted, #6F6557)',
              fontSize: 12.5,
              flexWrap: 'wrap',
            }}
          >
            <span>{collectionName(pack.collection)}</span>
          </div>
          <p
            style={{
              fontSize: 14.5,
              color: 'var(--pl-ink-soft, #3A332C)',
              lineHeight: 1.55,
              margin: '14px 0 6px',
            }}
          >
            {pack.blurb}
          </p>

          {/* Swatch row */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              margin: '6px 0 12px',
            }}
            aria-label="Color swatches"
          >
            {pack.swatches.map((c, i) => (
              <span
                key={`${c}-${i}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: c,
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                  display: 'inline-block',
                }}
              />
            ))}
          </div>

          {/* Includes checklist */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 11,
              margin: '4px 0 12px',
            }}
          >
            {pack.includes.map((key) => {
              const meta = INCLUDES_META[key];
              return (
                <div key={key} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'var(--pl-cream-deep, #EBE3D2)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      color: 'var(--pl-ink-soft, #3A332C)',
                    }}
                  >
                    <Icon name={meta.icon} size={15} />
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{meta.title(pack)}</div>
                    <div style={{ fontSize: 12, color: 'var(--pl-muted, #6F6557)' }}>
                      {meta.subtitle(pack)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tags */}
          {pack.tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                margin: '4px 0 16px',
              }}
            >
              {pack.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'var(--pl-cream-deep, #EBE3D2)',
                    fontSize: 11,
                    color: 'var(--pl-ink-soft, #3A332C)',
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Footer CTA */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--pl-divider, #D8CFB8)',
            }}
          >
            <button
              onClick={() => onApply?.(pack)}
              className="pl-pearl-accent"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 18px',
                borderRadius: 'var(--pl-radius-full, 100px)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              Apply to my site
              <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalTarget);
}
