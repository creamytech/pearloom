'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/PackCard.tsx
//
// One pack tile in the Theme Store grid. Renders a live themed
// vignette (via PackPreview), badges (Bestseller / New / Owned),
// tier pill, name + collection + rating + swatches, and a
// contextual primary action button:
//
//    owned          → "Apply"
//    free + unowned → "Get free"
//    in cart        → "In cart ✓"
//    otherwise      → "Add"
//
// Whole card is clickable to open QuickLook; primary action
// button stops propagation so clicking "Add" doesn't also
// open the modal.
//
// "Apply" context resolution
// ──────────────────────────
// The card itself is context-agnostic — it just calls onApply
// when an owned pack's CTA is clicked. The owner of the card
// decides what "apply" means:
//
//   • In the editor's ThemePanel → onApply mutates the open
//     manifest directly via applyPackToManifest() so the canvas
//     reflects the new theme without leaving the page.
//   • On the standalone /store page → onApply stashes the pack
//     payload in localStorage and either redirects to the editor
//     (when a single site is owned) or opens the "Pick a site"
//     prompt — orchestrated by ThemeStore.tsx, not this card.
// ─────────────────────────────────────────────────────────────

import type { Pack } from '@/lib/theme-store/packs';
import { Icon } from '../motifs';
import { PackPreview } from './PackPreview';
import { collectionName, priceLabel, tierLabel } from './utils';

interface PackCardProps {
  pack: Pack;
  idx: number;
  owned: boolean;
  inCart: boolean;
  onOpen: (pack: Pack) => void;
  onAdd: (pack: Pack) => void;
  onGetFree: (pack: Pack) => void;
  onApply: (pack: Pack) => void;
  /** Optional explicit label override for the apply CTA — lets
   *  the editor mount say "Apply to this site" while the standalone
   *  store keeps the shorter "Apply". */
  applyLabel?: string;
}

function pillStyle(bg: string, fg: string) {
  return {
    padding: '3px 9px',
    borderRadius: 999,
    background: bg,
    color: fg,
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: '0.04em',
  } as const;
}

function TierBadge({ tier }: { tier: Pack['tier'] }) {
  const label = tierLabel(tier);
  const map: Record<Pack['tier'], { bg: string; fg: string }> = {
    free: { bg: 'var(--sage-tint, #E3E6C8)', fg: 'var(--sage-deep, #6d7d3f)' },
    premium: { bg: 'var(--lavender-bg, #E8E0F0)', fg: 'var(--lavender-ink, #6B5A8C)' },
    signature: { bg: '#231F33', fg: '#E5D6A8' },
  };
  const c = map[tier];
  return (
    <span
      style={{
        padding: '3px 9px',
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon name="star" size={12} color="var(--gold, #B8935A)" />
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink, #0E0D0B)' }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function actionBtnBase() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 14px',
    borderRadius: 999,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1), background 180ms ease',
  } as const;
}

export function PackCard({ pack, idx, owned, inCart, onOpen, onAdd, onGetFree, onApply, applyLabel }: PackCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(pack)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(pack);
        }
      }}
      className="pl-store-card"
      style={{
        background: 'var(--card, #FBF7EE)',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(61,74,31,0.04)',
        transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease',
      }}
    >
      {/* Live themed preview */}
      <div style={{ position: 'relative' }}>
        <PackPreview pack={pack} nameIdx={idx} />

        {/* Badge cluster top-left */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          {pack.badges.best && (
            <span style={pillStyle('#3D4A1F', '#F8F1E4')}>★ Bestseller</span>
          )}
          {pack.badges.new && (
            <span style={pillStyle('var(--peach-2, #EAB286)', '#5A2E12')}>New</span>
          )}
        </div>

        {/* Tier badge top-right */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <TierBadge tier={pack.tier} />
        </div>

        {/* Owned pip bottom-right */}
        {owned && (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.92)',
              color: 'var(--sage-deep, #6d7d3f)',
              fontSize: 10.5,
              fontWeight: 800,
            }}
          >
            <Icon name="check" size={11} color="var(--sage-deep, #6d7d3f)" /> Owned
          </div>
        )}

        {/* Hover hint overlay — purely visual; the whole card is clickable. */}
        <div className="pl-store-card-hover-veil" aria-hidden="true">
          <span>Quick look</span>
        </div>
      </div>

      {/* Card body */}
      <div
        style={{
          padding: '13px 15px 15px',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
          flex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--ink, #0E0D0B)',
                lineHeight: 1.1,
              }}
            >
              {pack.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)', marginTop: 1 }}>
              {collectionName(pack.collection)}
            </div>
          </div>
          <Stars rating={pack.rating} />
        </div>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {pack.swatches.slice(0, 4).map((c, i) => (
            <span
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: c,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
              }}
              aria-hidden="true"
            />
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--ink-muted, #6F6557)' }}>
            {pack.sales} sold
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'auto',
            paddingTop: 4,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            {priceLabel(pack.priceCents)}
          </span>
          {owned ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApply(pack);
              }}
              style={{
                ...actionBtnBase(),
                background: 'var(--ink, #0E0D0B)',
                color: 'var(--cream, #F5EFE2)',
              }}
            >
              {applyLabel ?? 'Apply'} <Icon name="arrow-right" size={12} color="var(--cream, #F5EFE2)" />
            </button>
          ) : pack.priceCents === 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGetFree(pack);
              }}
              style={{
                ...actionBtnBase(),
                background: 'var(--sage-tint, #E3E6C8)',
                color: 'var(--sage-deep, #6d7d3f)',
              }}
            >
              Get free
            </button>
          ) : inCart ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen(pack);
              }}
              style={{
                ...actionBtnBase(),
                background: 'var(--cream-2, #FBF7EE)',
                color: 'var(--ink, #0E0D0B)',
                border: '1px solid var(--line, rgba(14,13,11,0.16))',
              }}
            >
              <Icon name="check" size={12} color="var(--ink, #0E0D0B)" /> In cart
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd(pack);
              }}
              style={{
                ...actionBtnBase(),
                background: 'var(--ink, #0E0D0B)',
                color: 'var(--cream, #F5EFE2)',
              }}
            >
              <Icon name="plus" size={12} color="var(--cream, #F5EFE2)" /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
