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

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { StoryManifest } from '@/types';
import { ThemedSite } from '../redesign/ThemedSite';
import { applyWizardLook } from '@/lib/site-look/wizard-look';
import type { LookRecipe } from '@/lib/site-look/look-recipes';
import { Icon } from '../motifs';
import type { StructurePicks } from './wizard-structure';

export interface FittingPicks extends StructurePicks {
  texture?: string;
  motifLayout?: string;
  density?: string;
  /** Phone menu variant (manifest.layouts.navMobile) — what a
   *  phone host actually SEES; the desktop nav pick is invisible
   *  on a phone preview. */
  navMobile?: string;
  /** Whole-page feel (manifest.edition) — the coordinated layout
   *  set: hero default, divider rhythm, section openers. */
  edition?: string;
}

export interface PaletteChoice {
  id: string;
  name: string;
  colors: string[];
  /** Paired mark — the ornament Pear's palette advisor matched to
   *  this palette ("paired mark · champagne"). Rides smart
   *  palettes only; presets carry none. */
  motif?: string;
  motifLayout?: string;
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
  { id: 'glass', label: 'Glass' },
];

const NAVS = [
  { id: 'centered', label: 'Centered' },
  { id: 'split', label: 'Split' },
  { id: 'serif-block', label: 'Serif block' },
  { id: 'minimal-text', label: 'Minimal' },
  { id: 'iconic', label: 'Iconic' },
];

/* The PHONE menu — what a phone host actually sees (the desktop
   nav options above change nothing on a phone preview). */
const NAVS_MOBILE = [
  { id: 'slide-in', label: 'Side drawer' },
  { id: 'overlay', label: 'Full screen' },
  { id: 'bottom-sheet', label: 'Bottom sheet' },
  { id: 'pill', label: 'Floating pill' },
];

const HEROES = [
  { id: 'centered', label: 'Centered' },
  { id: 'split', label: 'Photo beside' },
  { id: 'fullbleed', label: 'Full photo' },
  { id: 'typographic', label: 'Big type' },
  { id: 'postcard', label: 'Postcard' },
  { id: 'minimal', label: 'Minimal' },
];

/* Whole-page feel — the Editions (coordinated layout sets). */
const FEELS = [
  { id: 'almanac', label: 'Storybook' },
  { id: 'cinema', label: 'Cinematic' },
  { id: 'postcard-box', label: 'Postcards' },
  { id: 'linen-folder', label: 'Formal' },
  { id: 'quiet', label: 'Quiet' },
];

const MOTIFS = [
  { id: 'scattered', label: 'Scattered' },
  { id: 'corners', label: 'Corners' },
  { id: 'margins', label: 'Margins' },
  { id: 'dividers', label: 'Dividers' },
  { id: 'crest', label: 'Crest' },
  { id: 'none', label: 'Off' },
];

const DENSITIES = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'spacious', label: 'Spacious' },
];

const MODES = [
  { id: 'scroll', label: 'One page' },
  { id: 'multi-page', label: 'Separate pages' },
];

/* Rail labels are PLAIN words — "Colors", "Menu", "Spacing" — per
   the terminology rule (BRAND §7): a host shouldn't need to learn
   our nouns to dress their site. The metaphor lives in prose. */
type Rail = 'palette' | 'feel' | 'texture' | 'kit' | 'nav' | 'hero' | 'motif' | 'density' | 'reads';
const RAILS: Array<{ id: Rail; label: string }> = [
  { id: 'palette', label: 'Colors' },
  { id: 'feel', label: 'Feel' },
  { id: 'texture', label: 'Paper' },
  { id: 'kit', label: 'Cards' },
  { id: 'nav', label: 'Menu' },
  { id: 'hero', label: 'Opening' },
  { id: 'motif', label: 'Decor' },
  { id: 'density', label: 'Spacing' },
  { id: 'reads', label: 'Pages' },
];

/* Where each rail's change LANDS on the site — the preview scrolls
   there and flashes a ring so the host sees what they just
   re-pressed. Palette/paper change everything → flash the hero. */
const RAIL_TARGET: Record<Rail, string> = {
  palette: 'hero',
  feel: 'hero',
  texture: 'hero',
  kit: 'schedule',
  nav: 'hero',
  hero: 'hero',
  motif: 'story',
  density: 'details',
  reads: 'hero',
};

export function buildFittingManifest(opts: {
  occasion: string;
  paletteColors?: string[];
  coverPhoto?: string;
  galleryImages?: string[];
  recipe?: LookRecipe | null;
  /** The palette's paired mark + placement — generation stamps
   *  these via applyWizardLook, so the preview must too or the
   *  paired mark the host was promised never shows up here. */
  suggestedMotif?: string;
  suggestedMotifLayout?: string;
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
    motifKind: opts.suggestedMotif,
    motifLayout: opts.suggestedMotifLayout,
  }) as unknown as Record<string, unknown>;
  if (opts.recipe) {
    dressed.kitId = opts.recipe.kitId;
    dressed.texture = opts.recipe.texture;
    dressed.textureIntensity = opts.recipe.textureIntensity;
    /* The paired placement (stamped above when valid) survives the
       recipe — same precedence as generation, where no recipe
       overrides it. */
    if (dressed.motifLayout !== opts.suggestedMotifLayout) dressed.motifLayout = opts.recipe.motifLayout;
    dressed.density = opts.recipe.density;
  }
  if (opts.picks.kitId) dressed.kitId = opts.picks.kitId;
  if (opts.picks.texture) dressed.texture = opts.picks.texture;
  if (opts.picks.motifLayout) dressed.motifLayout = opts.picks.motifLayout;
  if (opts.picks.density) dressed.density = opts.picks.density;
  if (opts.picks.siteMode) dressed.siteMode = opts.picks.siteMode;
  if (opts.picks.edition) dressed.edition = opts.picks.edition;
  const layouts: Record<string, string> = {};
  if (opts.picks.navVariant) layouts.nav = opts.picks.navVariant;
  if (opts.picks.navMobile) layouts.navMobile = opts.picks.navMobile;
  if (opts.picks.heroVariant) layouts.hero = opts.picks.heroVariant;
  if (Object.keys(layouts).length > 0) dressed.layouts = layouts;
  return dressed as unknown as StoryManifest;
}

function RailChip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
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
}

function PaletteSwatch({ on, palette, onClick }: { on: boolean; palette: PaletteChoice; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        padding: '8px 10px 7px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
        border: on ? '1.5px solid var(--ink)' : '1.5px solid transparent',
        background: on ? 'color-mix(in srgb, var(--cream, #F5EFE2) 85%, transparent)' : 'transparent',
        flexShrink: 0,
      }}
    >
      <span style={{ display: 'inline-flex', gap: 3 }}>
        {palette.colors.slice(0, 4).map((hex, i) => (
          <span key={i} style={{ width: 16, height: 16, borderRadius: 999, background: hex, border: '1px solid rgba(14,13,11,0.12)' }} />
        ))}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{palette.name}</span>
    </button>
  );
}

/* Frosted chrome — the ONE place glass belongs (floating over the
   host's live site). Theme-correct: mixes from --cream so light
   mode frosts warm paper and dark mode frosts midnight. */
const GLASS: CSSProperties = {
  background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
  backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
  WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
  border: '1px solid var(--pl-glass-border)',
  boxShadow: 'var(--pl-glass-shadow-lg)',
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
  const siteScrollRef = useRef<HTMLDivElement | null>(null);
  /* Phone viewport → the Menu rail edits the PHONE menu
     (layouts.navMobile); on desktop it edits the desktop bar.
     You pick the menu you can see. Lazy init: the room only
     mounts client-side, and rotating mid-fit is not a case worth
     a resize listener. */
  const [phoneView] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 760);
  /* The full-site re-press is the heaviest render in the product;
     marking it a transition keeps the tap responsive on phones —
     the chip answers instantly, the press follows a beat later
     (with a soft dim so the beat reads as work, not jank). */
  const [isPending, startTransition] = useTransition();

  /* SHOW THE CHANGE — after a pick, scroll the preview to the
     section that change lands on and flash a ring around it, so
     the host always sees what they just re-pressed (a kit pick
     changes schedule rows three screens down; without this it
     reads as "nothing happened"). */
  const flashTarget = useCallback((sectionId: string) => {
    requestAnimationFrame(() => {
      const root = siteScrollRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(`#${sectionId}`) ?? root.querySelector<HTMLElement>('#hero');
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: sectionId === 'hero' ? 'start' : 'center' });
      el.style.transition = 'box-shadow 240ms ease';
      el.style.boxShadow = 'inset 0 0 0 3px var(--pl-gold, #C19A4B)';
      window.setTimeout(() => { el.style.boxShadow = 'inset 0 0 0 0 transparent'; }, 900);
    });
  }, []);
  const pickAndShow = useCallback((railId: Rail, next: Partial<FittingPicks>) => {
    startTransition(() => {
      onChange(next);
    });
    flashTarget(RAIL_TARGET[railId]);
  }, [onChange, flashTarget]);

  const activePalette = palettes.find((p) => p.id === activePaletteId) ?? palettes[0];
  const galleryKey = (galleryImages ?? []).join('|');
  const paletteKey = (activePalette?.colors ?? []).join('|');
  const manifest = useMemo(
    () => buildFittingManifest({
      occasion,
      paletteColors: activePalette?.colors,
      coverPhoto,
      galleryImages,
      recipe,
      suggestedMotif: activePalette?.motif,
      suggestedMotifLayout: activePalette?.motifLayout,
      picks,
    }),
    /* Primitive deps — the parent recreates `picks` + the gallery
       array every render, which made this rebuild (and the whole
       site re-render) on every parent render. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [occasion, paletteKey, coverPhoto, galleryKey, recipe,
     activePalette?.motif, activePalette?.motifLayout,
     picks.siteMode, picks.kitId, picks.texture, picks.navVariant,
     picks.navMobile, picks.heroVariant, picks.motifLayout,
     picks.density, picks.edition],
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

  /* SSR guard for the portal — the room only opens client-side. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The fitting room — try looks on your live site"
      style={{
        /* Portaled to <body>: the wizard root's containing-block
           quirk made this 'fixed' behave like absolute (the room
           parked at the page top and the host had to scroll up to
           find it — phone screenshot, 2026-06-12). From <body>,
           fixed always means the visual viewport. */
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--cream, #F5EFE2)',
        /* 320ms curtain — the room used to snap over the wizard in
           one frame. On the fixed root itself so the fade never
           creates a containing block above it. */
        animation: 'pl8-content-fade-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        /* Flex column with the dock IN FLOW — iOS Safari's dynamic
           toolbar makes fixed-bottom elements unreliable (the dock
           vanished under it on iPhone, 2026-06-12). In-flow + 100dvh
           means the rails are ALWAYS visible above the toolbar. */
        height: '100dvh',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* THE SITE — fills the space above the dock, scrollable, real. */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div
          ref={siteScrollRef}
          style={{
            position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            opacity: isPending ? 0.55 : 1,
            transition: 'opacity 160ms var(--pl-ease-out, ease)',
          }}
        >
          <ThemedSite manifest={manifest} names={names} demoCopy />
        </div>

        {/* TOP GLASS BAR — title + done. */}
        <div
          style={{
            ...GLASS,
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, borderRadius: 999,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '7px 8px 7px 16px',
            maxWidth: 'calc(100% - 70px)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-display, Fraunces, serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            The fitting room
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

        {/* Corner close. */}
        <button
          type="button"
          aria-label="Close the fitting room"
          onClick={onClose}
          style={{
            ...GLASS,
            position: 'absolute', top: 12, right: 12, zIndex: 11,
            width: 38, height: 38, borderRadius: 999,
            display: 'grid', placeItems: 'center', cursor: 'pointer',
            color: 'var(--ink-soft)',
          }}
        >
          <Icon name="close" size={15} />
        </button>

        {/* Scroll cue — riding the seam just above the dock so the
            host knows the site continues below the hero. */}
        <div
          aria-hidden
          style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            padding: '5px 13px', borderRadius: 999,
            background: 'var(--pl-glass-light)',
              backgroundImage: 'var(--pl-glass-sheen)',
            backdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
            WebkitBackdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
            border: '1px solid var(--pl-glass-border)',
            fontSize: 10.5, fontWeight: 600, color: 'var(--ink-soft)',
            pointerEvents: 'none', whiteSpace: 'nowrap',
          }}
        >
          scroll — the whole site is here
        </div>
      </div>

      {/* THE DOCK — in normal flow, can't be hidden by browser
          chrome. Rail tabs + the active rail's strip. */}
      <div
        style={{
          ...GLASS,
          borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
          borderRadius: 0,
          padding: '9px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
          display: 'flex', flexDirection: 'column', gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
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
          {rail === 'palette' && palettes.map((p) => (
            <PaletteSwatch key={p.id} on={p.id === activePaletteId} palette={p} onClick={() => { onPalettePick(p); flashTarget(RAIL_TARGET.palette); }} />
          ))}
          {rail === 'texture' && (
            <>
              <RailChip on={picks.texture === undefined} label="Pear decides" onClick={() => pickAndShow('texture', { texture: undefined })} />
              {TEXTURES.map((t) => (
                <RailChip key={t.id} on={picks.texture === t.id} label={t.label} onClick={() => pickAndShow('texture', { texture: t.id })} />
              ))}
            </>
          )}
          {rail === 'kit' && (
            <>
              <RailChip on={picks.kitId === undefined} label="Pear decides" onClick={() => pickAndShow('kit', { kitId: undefined })} />
              {KITS.map((t) => (
                <RailChip key={t.id} on={picks.kitId === t.id} label={t.label} onClick={() => pickAndShow('kit', { kitId: t.id })} />
              ))}
            </>
          )}
          {rail === 'nav' && (phoneView ? (
            <>
              <RailChip on={picks.navMobile === undefined} label="Pear decides" onClick={() => pickAndShow('nav', { navMobile: undefined })} />
              {NAVS_MOBILE.map((t) => (
                <RailChip key={t.id} on={picks.navMobile === t.id} label={t.label} onClick={() => pickAndShow('nav', { navMobile: t.id })} />
              ))}
            </>
          ) : (
            <>
              <RailChip on={picks.navVariant === undefined} label="Pear decides" onClick={() => pickAndShow('nav', { navVariant: undefined })} />
              {NAVS.map((t) => (
                <RailChip key={t.id} on={picks.navVariant === t.id} label={t.label} onClick={() => pickAndShow('nav', { navVariant: t.id })} />
              ))}
            </>
          ))}
          {rail === 'feel' && (
            <>
              <RailChip on={picks.edition === undefined} label="Pear decides" onClick={() => pickAndShow('feel', { edition: undefined })} />
              {FEELS.map((t) => (
                <RailChip key={t.id} on={picks.edition === t.id} label={t.label} onClick={() => pickAndShow('feel', { edition: t.id })} />
              ))}
            </>
          )}
          {rail === 'hero' && (
            <>
              <RailChip on={picks.heroVariant === undefined} label="Pear decides" onClick={() => pickAndShow('hero', { heroVariant: undefined })} />
              {HEROES.map((t) => (
                <RailChip key={t.id} on={picks.heroVariant === t.id} label={t.label} onClick={() => pickAndShow('hero', { heroVariant: t.id })} />
              ))}
            </>
          )}
          {rail === 'motif' && (
            <>
              <RailChip on={picks.motifLayout === undefined} label="Pear decides" onClick={() => pickAndShow('motif', { motifLayout: undefined })} />
              {MOTIFS.map((t) => (
                <RailChip key={t.id} on={picks.motifLayout === t.id} label={t.label} onClick={() => pickAndShow('motif', { motifLayout: t.id })} />
              ))}
            </>
          )}
          {rail === 'density' && (
            <>
              <RailChip on={picks.density === undefined} label="Pear decides" onClick={() => pickAndShow('density', { density: undefined })} />
              {DENSITIES.map((t) => (
                <RailChip key={t.id} on={picks.density === t.id} label={t.label} onClick={() => pickAndShow('density', { density: t.id })} />
              ))}
            </>
          )}
          {rail === 'reads' && (
            <>
              <RailChip on={picks.siteMode === undefined} label="Pear decides" onClick={() => pickAndShow('reads', { siteMode: undefined })} />
              {MODES.map((t) => (
                <RailChip key={t.id} on={picks.siteMode === t.id} label={t.label} onClick={() => pickAndShow('reads', { siteMode: t.id as 'scroll' | 'multi-page' })} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
