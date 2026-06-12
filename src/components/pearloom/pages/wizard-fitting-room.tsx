'use client';

/* ─────────────────────────────────────────────────────────────
   WizardFittingRoom — the full-screen visual experience.

   The structure preview's big sibling: the host's ACTUAL site
   fills the viewport (real ThemedSite render — their names,
   photos, palette), and a floating glass dock along the bottom
   re-presses it in real time as they try on:

     · Palette   · Paper texture   · Component kit
     · Nav       · Hero

   Glass here is deliberate and brand-legal: BRAND.md §9 reserves
   blur surfaces for floating chrome OVER content — and a dock
   floating over the host's own live site is exactly that. The
   site stays paper; the chrome floats like frosted glass above it.

   Every pick writes straight into wizard state (the same fields
   The Structure's chips write), so closing the room keeps
   everything — the fitting room is a bigger window onto the same
   choices, not a separate state machine.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { ThemedSite } from '../redesign/ThemedSite';
import { applyWizardLook } from '@/lib/site-look/wizard-look';
import type { LookRecipe } from '@/lib/site-look/look-recipes';
import { Icon } from '../motifs';
import type { StructurePicks } from './wizard-structure';

export interface FittingPicks extends StructurePicks {
  texture?: string;
}

export interface PaletteChoice {
  id: string;
  name: string;
  colors: string[];
}

const TEXTURES: Array<{ id: string; label: string }> = [
  { id: 'paper', label: 'Paper' },
  { id: 'linen', label: 'Linen' },
  { id: 'cotton', label: 'Cotton' },
  { id: 'kraft', label: 'Kraft' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'velvet', label: 'Velvet' },
  { id: 'marble', label: 'Marble' },
  { id: 'gilded', label: 'Gilded' },
  { id: 'watercolor', label: 'Watercolor' },
];

const KITS = [
  { id: 'classic', label: 'Classic' },
  { id: 'ticket', label: 'Ticket' },
  { id: 'plate', label: 'Plate' },
  { id: 'scrapbook', label: 'Scrapbook' },
  { id: 'index', label: 'Index' },
  { id: 'minimal', label: 'Minimal' },
];

const NAVS = [
  { id: 'centered', label: 'Centered' },
  { id: 'split', label: 'Split' },
  { id: 'serif-block', label: 'Serif block' },
  { id: 'minimal-text', label: 'Minimal' },
  { id: 'iconic', label: 'Iconic' },
];

const HEROES = [
  { id: 'centered', label: 'Centered' },
  { id: 'split', label: 'Split' },
  { id: 'fullbleed', label: 'Full-bleed' },
  { id: 'typographic', label: 'Typographic' },
  { id: 'postcard', label: 'Postcard' },
  { id: 'minimal', label: 'Minimal' },
];

type Rail = 'palette' | 'texture' | 'kit' | 'nav' | 'hero';
const RAILS: Array<{ id: Rail; label: string }> = [
  { id: 'palette', label: 'Palette' },
  { id: 'texture', label: 'Paper' },
  { id: 'kit', label: 'Kit' },
  { id: 'nav', label: 'Nav' },
  { id: 'hero', label: 'Hero' },
];

export function buildFittingManifest(opts: {
  occasion: string;
  paletteColors?: string[];
  coverPhoto?: string;
  galleryImages?: string[];
  recipe?: LookRecipe | null;
  picks: FittingPicks;
}): StoryManifest {
  const base = {
    occasion: opts.occasion,
    coverPhoto: opts.coverPhoto,
    galleryImages: opts.galleryImages,
  } as unknown as StoryManifest;
  const dressed = applyWizardLook(base, {
    selectedPaletteColors: opts.paletteColors,
    occasion: opts.occasion,
  }) as unknown as Record<string, unknown>;
  if (opts.recipe) {
    dressed.kitId = opts.recipe.kitId;
    dressed.texture = opts.recipe.texture;
    dressed.textureIntensity = opts.recipe.textureIntensity;
    dressed.motifLayout = opts.recipe.motifLayout;
    dressed.density = opts.recipe.density;
  }
  if (opts.picks.kitId) dressed.kitId = opts.picks.kitId;
  if (opts.picks.texture) dressed.texture = opts.picks.texture;
  const layouts: Record<string, string> = {};
  if (opts.picks.navVariant) layouts.nav = opts.picks.navVariant;
  if (opts.picks.heroVariant) layouts.hero = opts.picks.heroVariant;
  if (Object.keys(layouts).length > 0) dressed.layouts = layouts;
  return dressed as unknown as StoryManifest;
}

/* Frosted chrome — the ONE place glass belongs (floating over the
   host's live site). Theme-correct: mixes from --cream so light
   mode frosts warm paper and dark mode frosts midnight. */
const GLASS: CSSProperties = {
  background: 'color-mix(in srgb, var(--cream, #F5EFE2) 72%, transparent)',
  backdropFilter: 'blur(18px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
  border: '1px solid color-mix(in srgb, var(--ink, #0E0D0B) 12%, transparent)',
  boxShadow: '0 18px 44px -16px rgba(14,13,11,0.35)',
};

export function WizardFittingRoom({
  occasion,
  names,
  coverPhoto,
  galleryImages,
  recipe,
  palettes,
  activePaletteId,
  onPalettePick,
  picks,
  onChange,
  onClose,
}: {
  occasion: string;
  names: [string, string];
  coverPhoto?: string;
  galleryImages?: string[];
  recipe?: LookRecipe | null;
  /** Every palette the host can wear — their pick first, then
   *  Pear's smart palettes, then the presets. */
  palettes: PaletteChoice[];
  activePaletteId: string;
  onPalettePick: (p: PaletteChoice) => void;
  picks: FittingPicks;
  onChange: (next: Partial<FittingPicks>) => void;
  onClose: () => void;
}) {
  const [rail, setRail] = useState<Rail>('palette');

  const activePalette = palettes.find((p) => p.id === activePaletteId) ?? palettes[0];
  const manifest = useMemo(
    () => buildFittingManifest({
      occasion,
      paletteColors: activePalette?.colors,
      coverPhoto,
      galleryImages,
      recipe,
      picks,
    }),
    [occasion, activePalette, coverPhoto, galleryImages, recipe, picks],
  );

  /* Esc closes; lock body scroll while the room is open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const swatch = (p: PaletteChoice) => {
    const on = p.id === activePaletteId;
    return (
      <button
        key={p.id}
        type="button"
        aria-pressed={on}
        onClick={() => onPalettePick(p)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          padding: '8px 10px 7px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
          border: on ? '1.5px solid var(--ink)' : '1.5px solid transparent',
          background: on ? 'color-mix(in srgb, var(--cream, #F5EFE2) 85%, transparent)' : 'transparent',
          flexShrink: 0,
        }}
      >
        <span style={{ display: 'inline-flex', gap: 3 }}>
          {p.colors.slice(0, 4).map((hex, i) => (
            <span key={i} style={{ width: 16, height: 16, borderRadius: 999, background: hex, border: '1px solid rgba(14,13,11,0.12)' }} />
          ))}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{p.name}</span>
      </button>
    );
  };

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        padding: '9px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
        border: on ? '1.5px solid var(--ink)' : '1.5px solid color-mix(in srgb, var(--ink, #0E0D0B) 18%, transparent)',
        background: on ? 'var(--ink)' : 'transparent',
        color: on ? 'var(--cream)' : 'var(--ink)',
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
        transition: 'background 160ms var(--pl-ease-out, ease), color 160ms var(--pl-ease-out, ease)',
      }}
    >
      {label}
    </button>
  );

  const pearChip = (isUnset: boolean, clear: () => void) =>
    chip(isUnset, 'Pear decides', clear);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The fitting room — try looks on your live site"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--cream, #F5EFE2)' }}
    >
      {/* THE SITE — full bleed, scrollable, real. */}
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <ThemedSite manifest={manifest} names={names} />
        {/* Breathing room so the dock never hides the footer. */}
        <div style={{ height: 180 }} />
      </div>

      {/* TOP GLASS BAR — title + done. */}
      <div
        style={{
          ...GLASS,
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 210, borderRadius: 999,
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '8px 10px 8px 18px',
          maxWidth: 'calc(100vw - 24px)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display, Fraunces, serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
          The fitting room
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }} className="pl8-fitting-hint">
          scroll the site · tap to re-press
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '7px 16px', borderRadius: 999, border: 'none',
            background: 'var(--ink)', color: 'var(--cream)',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          Keep it
        </button>
      </div>

      {/* BOTTOM GLASS DOCK — rail tabs + the active rail's strip. */}
      <div
        style={{
          ...GLASS,
          position: 'fixed',
          left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          zIndex: 210, borderRadius: 20,
          width: 'min(720px, calc(100vw - 20px))',
          padding: '10px 12px 12px',
          display: 'flex', flexDirection: 'column', gap: 9,
        }}
      >
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {RAILS.map((r) => {
            const on = rail === r.id;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={on}
                onClick={() => setRail(r.id)}
                style={{
                  padding: '5px 13px', borderRadius: 999, border: 'none',
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                  background: on ? 'color-mix(in srgb, var(--ink, #0E0D0B) 10%, transparent)' : 'transparent',
                  color: on ? 'var(--ink)' : 'var(--ink-muted)',
                  cursor: 'pointer',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div
          style={{
            display: 'flex', gap: 7, alignItems: 'center',
            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            paddingBottom: 2, scrollbarWidth: 'none',
          }}
        >
          {rail === 'palette' && palettes.map(swatch)}
          {rail === 'texture' && (
            <>
              {pearChip(picks.texture === undefined, () => onChange({ texture: undefined }))}
              {TEXTURES.map((t) => chip(picks.texture === t.id, t.label, () => onChange({ texture: t.id })))}
            </>
          )}
          {rail === 'kit' && (
            <>
              {pearChip(picks.kitId === undefined, () => onChange({ kitId: undefined }))}
              {KITS.map((t) => chip(picks.kitId === t.id, t.label, () => onChange({ kitId: t.id })))}
            </>
          )}
          {rail === 'nav' && (
            <>
              {pearChip(picks.navVariant === undefined, () => onChange({ navVariant: undefined }))}
              {NAVS.map((t) => chip(picks.navVariant === t.id, t.label, () => onChange({ navVariant: t.id })))}
            </>
          )}
          {rail === 'hero' && (
            <>
              {pearChip(picks.heroVariant === undefined, () => onChange({ heroVariant: undefined }))}
              {HEROES.map((t) => chip(picks.heroVariant === t.id, t.label, () => onChange({ heroVariant: t.id })))}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 560px) {
          :global(.pl8-fitting-hint) {
            display: none;
          }
        }
      `}</style>
      {/* Close affordance for screen readers / corner-tappers. */}
      <button
        type="button"
        aria-label="Close the fitting room"
        onClick={onClose}
        style={{
          ...GLASS,
          position: 'fixed', top: 12, right: 12, zIndex: 211,
          width: 38, height: 38, borderRadius: 999,
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          color: 'var(--ink-soft)',
        }}
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
