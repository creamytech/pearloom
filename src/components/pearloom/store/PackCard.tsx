'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/PackCard.tsx
//
// One pack tile in the Theme Gallery grid. Renders a live themed
// vignette (via PackPreview), a New badge, name + collection +
// swatches, and one primary action: "Apply". Design is free
// (EDITOR-CALM-PLAN E.1) — no price, no tier, no ownership,
// no cart.
//
// Whole card is clickable to open QuickLook; the Apply button
// stops propagation so clicking it doesn't also open the modal.
//
// "Apply" context resolution
// ──────────────────────────
// The card itself is context-agnostic — it just calls onApply
// when the CTA is clicked. The owner of the card decides what
// "apply" means:
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
import { collectionName } from './utils';
import { foilTextStyle, PAPER_GRAIN } from '@/components/brand/pressed';

interface PackCardProps {
  pack: Pack;
  idx: number;
  onOpen: (pack: Pack) => void;
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

export function PackCard({ pack, idx, onOpen, onApply, applyLabel }: PackCardProps) {
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
        // Shadow is owned by .pl-store-card (base float + hover deepen)
        // in pearloom.css — an inline box-shadow here would override the
        // :hover swap and the cards would never lift their shadow.
        transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease',
      }}
    >
      {/* Live themed preview — a SWATCH: rests slightly un-inked and
          "inks in" to full saturation when the card is handled
          (.pl-store-swatch rules in pearloom.css). */}
      <div className="pl-store-swatch" style={{ position: 'relative' }}>
        <PackPreview pack={pack} nameIdx={idx} />

        {/* Badge cluster top-left */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          {pack.badges.new && (
            <span style={pillStyle('var(--peach-2, #EAB286)', '#5A2E12')}>New</span>
          )}
        </div>

        {/* Hover hint overlay — purely visual; the whole card is clickable. */}
        <div className="pl-store-card-hover-veil" aria-hidden="true">
          <span>Quick look</span>
        </div>
      </div>

      {/* The deckle — the mount's paper TEARS over the swatch's
          bottom edge, so the card reads as a mounted sample, not a
          web thumbnail. Irregular by hand; stretches to any width. */}
      <svg
        aria-hidden
        viewBox="0 0 320 7"
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: 7, marginTop: -7, position: 'relative', zIndex: 1 }}
      >
        <path
          d="M0 7 L0 3.4 L14 4.8 L27 1.9 L43 4.2 L58 2.6 L74 5.1 L91 2.2 L108 4.6 L125 1.7 L142 4 L160 2.8 L177 5 L194 2 L211 4.4 L228 1.8 L246 4.7 L263 2.4 L281 4.9 L299 2.1 L312 4.3 L320 3 L320 7 Z"
          fill="var(--card, #FBF7EE)"
        />
      </svg>

      {/* Card body — the mount, on laid paper. */}
      <div
        style={{
          padding: '9px 15px 15px',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
          flex: 1,
          backgroundImage: PAPER_GRAIN,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                fontSize: 17,
                fontWeight: 600,
                lineHeight: 1.1,
                /* Foil-stamped name — the swatch card's one flourish. */
                ...foilTextStyle(),
              }}
            >
              {pack.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)', marginTop: 1 }}>
              {collectionName(pack.collection)}
            </div>
          </div>
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
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: 'auto',
            paddingTop: 4,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply(pack);
            }}
            style={{
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
              background: 'var(--ink, #0E0D0B)',
              color: 'var(--cream, #F5EFE2)',
            }}
          >
            {applyLabel ?? 'Apply'} <Icon name="arrow-right" size={12} color="var(--cream, #F5EFE2)" />
          </button>
        </div>
      </div>
    </div>
  );
}
