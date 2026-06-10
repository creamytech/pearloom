'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/QuickLookModal.tsx
//
// Centered "Quick Look" modal for a single theme pack. Mirrors
// the prototype's QuickLook (store.jsx ~line 119): full-bleed
// pack hero on the left, pack metadata + "what's included" +
// CTAs on the right.
//
// The right-pane CTAs are state-aware:
//   - owned       → "Apply to my site"
//   - free pack   → "Get it free"
//   - in cart     → "Added to cart" (disabled)
//   - otherwise   → "Add to cart · $N"
//
// Closes on:
//   - Esc
//   - backdrop click
//   - × button
//
// Schedule sample (right pane bottom) ports the prototype's
// "themed schedule rows in the pack's kit" — for the MVP we
// render a simple kit-labelled schedule list themed by the
// pack's CSS-var bag so a host can sense how the kit reads
// when applied to real content. The full KSchedule per-kit
// renderers are tracked under CLAUDE-PRODUCT.md Phase 4.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../motifs';
import { useIsMobile } from '../redesign/use-nav-hooks';
import { PackPreview } from './PackPreview';
import { useCart } from './CartProvider';
import {
  collectionName,
  fontName,
  kitLabel,
  priceLabel,
  tierLabel,
} from './utils';
import type { Pack, Tier, Includes } from '@/lib/theme-store/packs';

interface QuickLookModalProps {
  /** The pack currently being looked at, or null when closed. */
  pack: Pack | null;
  /** Set of pack ids the viewing user owns. */
  ownedIds?: ReadonlySet<string>;
  onClose: () => void;
  /**
   * "Apply to my site" handler — invoked for owned packs.
   * Receives the pack so the host can stash {id, vars, kit}
   * in localStorage and redirect to the editor.
   */
  onApply?: (pack: Pack) => void;
  /**
   * "Get it free" handler for $0 packs — typically writes a
   * synthetic entitlement and re-opens the modal in "owned"
   * state.
   */
  onGetFree?: (pack: Pack) => void;
}

const TIER_BADGE: Record<Tier, { bg: string; fg: string }> = {
  free: { bg: '#E0DDC9', fg: '#363F22' },
  premium: { bg: '#E8DEEE', fg: '#4A3F5C' },
  signature: { bg: '#231F33', fg: '#E5D6A8' },
};

function TierBadge({ tier }: { tier: Tier }) {
  const t = TIER_BADGE[tier];
  return (
    <span
      style={{
        padding: '3px 9px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {tierLabel(tier)}
    </span>
  );
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
    title: () => 'Component kit',
    subtitle: (p) => `${kitLabel(p.kit)} styling`,
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
    title: () => 'Motifs & dividers',
    subtitle: (p) =>
      p.motif === 'none'
        ? 'Clean, no motifs'
        : `${p.motif[0].toUpperCase() + p.motif.slice(1)} artwork`,
  },
};

/** Schedule sample — three lines themed by the pack's vars. */
function SchedulePreview({ pack }: { pack: Pack }) {
  const rows = [
    { t: '3:30', m: 'pm', l: 'Ceremony', s: 'Clifftop terrace' },
    { t: '5:00', m: 'pm', l: 'Cocktails', s: 'Sea view' },
    { t: '7:30', m: 'pm', l: 'Dinner & dancing', s: 'Until late' },
  ];
  // Inherit pack's CSS vars by spreading themeRef on the wrapper.
  return (
    <div
      style={{
        ...(pack.themeRef as Record<string, string>),
        background: 'var(--t-paper)',
        color: 'var(--t-ink)',
        padding: '20px 18px',
        fontFamily: 'var(--t-body)',
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: pack.themeRef['--t-eyebrow-ls'] ?? '0.18em',
          textTransform: 'uppercase',
          color: 'var(--t-accent-ink)',
          textAlign: 'center',
          marginBottom: 14,
        }}
      >
        Schedule · {kitLabel(pack.kit)} kit
      </div>
      <div style={{ maxWidth: 480, marginInline: 'auto' }}>
        {rows.map((r, i) => (
          <div
            key={r.l}
            style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr auto',
              gap: 14,
              alignItems: 'baseline',
              padding: '12px 0',
              borderBottom: i < rows.length - 1 ? '1px solid var(--t-line-soft)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--t-display)',
                fontSize: 20,
                color: 'var(--t-accent-ink)',
              }}
            >
              {r.t}
              <span style={{ fontSize: 11, marginLeft: 2, color: 'var(--t-ink-muted)' }}>
                {r.m}
              </span>
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.l}</div>
              <div style={{ fontSize: 12, color: 'var(--t-ink-muted)', marginTop: 2 }}>{r.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuickLookModal({
  pack,
  ownedIds,
  onClose,
  onApply,
  onGetFree,
}: QuickLookModalProps) {
  const { addToCart, hasItem } = useCart();
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

  const owned = useMemo(() => {
    if (!pack || !ownedIds) return false;
    return ownedIds.has(pack.id);
  }, [pack, ownedIds]);

  const inCart = pack ? hasItem(pack.id) : false;

  const handleAdd = useCallback(() => {
    if (!pack) return;
    addToCart(pack);
  }, [pack, addToCart]);

  if (!pack || !portalTarget) return null;

  const modal = (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${pack.name} — quick look`}
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
              width: 32,
              height: 32,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(251,247,238,0.92)',
              border: '1px solid var(--pl-divider, #D8CFB8)',
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
          <div
            style={{
              borderRadius: 'var(--pl-radius-xl, 1rem)',
              overflow: 'hidden',
              border: '1px solid var(--pl-divider, #D8CFB8)',
            }}
          >
            <PackPreview pack={pack} height={250} rich />
          </div>
          <div
            style={{
              borderRadius: 'var(--pl-radius-xl, 1rem)',
              overflow: 'hidden',
              border: '1px solid var(--pl-divider, #D8CFB8)',
            }}
          >
            <SchedulePreview pack={pack} />
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
              <TierBadge tier={pack.tier} />
              {pack.badges.best && (
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'var(--pl-olive-deep, #363F22)',
                    color: 'var(--pl-cream, #F5EFE2)',
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                  }}
                >
                  ★ Bestseller
                </span>
              )}
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
            <span aria-hidden>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="star" size={12} color="var(--pl-gold, #B8935A)" />
              <strong style={{ color: 'var(--pl-ink, #0E0D0B)' }}>{pack.rating.toFixed(1)}</strong>
            </span>
            <span aria-hidden>·</span>
            <span>{pack.sales} sold</span>
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

          {/* Footer CTAs */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--pl-divider, #D8CFB8)',
              // Narrow screens: let the CTA drop under the price
              // instead of squeezing both.
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontFamily: 'var(--pl-font-display, Fraunces), serif',
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {priceLabel(pack.priceCents)}
              </span>
              {/* Plan-grant hint — the store's quiet upsell. Premium
                  packs come with Atelier; signature with Legacy.
                  (Grants enforced server-side in entitlements.ts.) */}
              {!owned && pack.tier !== 'free' && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    color: 'var(--pl-olive, #5C6B3F)',
                  }}
                >
                  {pack.tier === 'premium'
                    ? 'Included with the Atelier plan'
                    : 'Included with the Legacy plan'}
                </span>
              )}
            </span>
            {owned ? (
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
            ) : pack.priceCents === 0 ? (
              <button
                onClick={() => onGetFree?.(pack)}
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
                Get it free
              </button>
            ) : inCart ? (
              <button
                onClick={onClose}
                disabled
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '11px 18px',
                  borderRadius: 'var(--pl-radius-full, 100px)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'default',
                  border: '1px solid var(--pl-divider, #D8CFB8)',
                  background: 'var(--pl-cream-deep, #EBE3D2)',
                  color: 'var(--pl-ink, #0E0D0B)',
                }}
              >
                <Icon name="check" size={15} />
                Added to cart
              </button>
            ) : (
              <button
                onClick={handleAdd}
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
                <Icon name="cart" size={15} />
                Add to cart · {priceLabel(pack.priceCents)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalTarget);
}
