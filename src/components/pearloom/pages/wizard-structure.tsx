'use client';

/* ─────────────────────────────────────────────────────────────
   WizardStructureSection — "Your pressing", live.

   v3 (2026-06-12): the chip rows moved into the fitting room —
   ONE place owns every customization axis (palette, paper, kit,
   nav, hero, motif, density, reads). This section is now the
   live phone preview of the host's exact current press + the
   door into the room. Mounted on BOTH the Palette step and
   Review (it replaced the three unreadable desktop-scaled
   pressings there — "maybe we can just use fitting room
   instead", 2026-06-12).
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { ThemedSite } from '../redesign/ThemedSite';
import { applyWizardLook } from '@/lib/site-look/wizard-look';
import type { LookRecipe } from '@/lib/site-look/look-recipes';
import { Sparkle } from '../motifs';

export interface StructurePicks {
  siteMode?: 'scroll' | 'multi-page';
  kitId?: string;
  texture?: string;
  navVariant?: string;
  heroVariant?: string;
  motifLayout?: string;
  density?: string;
}

const SITE_W = 430; // phone-width render — the device most guests hold

export function WizardStructureSection({
  occasion,
  paletteColors,
  names,
  coverPhoto,
  galleryImages,
  recipe,
  suggestedMotif,
  suggestedMotifLayout,
  picks,
  onChange: _onChange,
  onExpand,
  title = 'The structure',
  blurb = 'This is your site, live — scroll it. Step into the fitting room to try every palette, paper, kit, layout, and motif on it in real time.',
}: {
  occasion: string;
  paletteColors: string[] | undefined;
  names: [string, string];
  coverPhoto?: string;
  galleryImages?: string[];
  /** The chosen look recipe (or Pear's match) — the preview wears
   *  it so structure choices appear on the construction the host
   *  already picked. */
  recipe?: LookRecipe | null;
  /** The paired mark + placement riding the picked smart palette
   *  ("paired mark · champagne") — generation stamps these via
   *  applyWizardLook, so the pressing must wear them too. */
  suggestedMotif?: string;
  suggestedMotifLayout?: string;
  picks: StructurePicks;
  /** Retained for call-site compat — the chip rows moved into the
   *  fitting room, so this section no longer writes picks itself. */
  onChange?: (next: Partial<StructurePicks>) => void;
  /** Opens the full-screen fitting room. */
  onExpand?: () => void;
  /** Header overrides — Review mounts this as "Your pressing". */
  title?: string;
  blurb?: string;
}) {
  /* One real manifest, rebuilt on every pick — the same bridge
     generation uses, so the preview IS the site.

     VALUE-KEYED: the wizard rebuilds paletteColors / galleryImages /
     picks / recipe as fresh literals on every render, so an
     identity-keyed memo re-pressed the entire ThemedSite preview per
     keystroke in the co-host email field. Content keys (the
     use-nav-hooks idsKey pattern) only invalidate on real changes. */
  const paletteKey = (paletteColors ?? []).join('|');
  const galleryKey = (galleryImages ?? []).join('|');
  const picksKey = [picks.siteMode, picks.kitId, picks.texture, picks.navVariant, picks.heroVariant, picks.motifLayout, picks.density]
    .map((x) => x ?? '')
    .join('|');
  const recipeKey = recipe?.id ?? '';
  const manifest = useMemo<StoryManifest>(() => {
    const base = {
      occasion,
      coverPhoto,
      galleryImages,
    } as unknown as StoryManifest;
    const dressed = applyWizardLook(base, {
      selectedPaletteColors: paletteColors,
      occasion,
      motifKind: suggestedMotif,
      motifLayout: suggestedMotifLayout,
    }) as unknown as Record<string, unknown>;
    if (recipe) {
      dressed.kitId = recipe.kitId;
      dressed.texture = recipe.texture;
      dressed.textureIntensity = recipe.textureIntensity;
      /* The paired placement (stamped above when valid) survives
         the recipe — same precedence as generation, where no
         recipe overrides it. */
      if (dressed.motifLayout !== suggestedMotifLayout) dressed.motifLayout = recipe.motifLayout;
      dressed.density = recipe.density;
    }
    if (picks.kitId) dressed.kitId = picks.kitId;
    if (picks.texture) dressed.texture = picks.texture;
    if (picks.motifLayout) dressed.motifLayout = picks.motifLayout;
    if (picks.density) dressed.density = picks.density;
    if (picks.siteMode) dressed.siteMode = picks.siteMode;
    const layouts: Record<string, string> = {};
    if (picks.navVariant) layouts.nav = picks.navVariant;
    if (picks.heroVariant) layouts.hero = picks.heroVariant;
    if (Object.keys(layouts).length > 0) dressed.layouts = layouts;
    return dressed as unknown as StoryManifest;
    // Keyed by CONTENT (paletteKey/galleryKey/picksKey/recipeKey),
    // not the per-render literal identities — see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasion, coverPhoto, paletteKey, galleryKey, picksKey, recipeKey, suggestedMotif, suggestedMotifLayout]);

  /* Same treatment for names — the wizard passes a fresh tuple every
     render, which would defeat the compiler's memo of the ThemedSite
     element below. */
  const nameA = names[0] ?? '';
  const nameB = names[1] ?? '';
  const stableNames = useMemo<[string, string]>(() => [nameA, nameB], [nameA, nameB]);

  /* Defer the live render one frame so the Palette step paints
     instantly (same trick the Review pressings use). */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  /* A gentle settle on re-press so taps visibly DO something even
     when the change is below the fold — the frame re-keys on the
     picks themselves (no state, no effect; the CSS animation
     replays whenever the key changes). */
  const pressKey = `${picks.siteMode ?? ''}|${picks.kitId ?? ''}|${picks.texture ?? ''}|${picks.navVariant ?? ''}|${picks.heroVariant ?? ''}|${picks.motifLayout ?? ''}|${picks.density ?? ''}`;

  const frame: CSSProperties = {
    width: '100%',
    maxWidth: 340,
    height: 420,
    margin: '0 auto',
    borderRadius: 22,
    border: '1px solid var(--line)',
    boxShadow: '0 24px 48px -20px rgba(40,28,12,0.28), inset 0 0 0 5px var(--ink)',
    overflow: 'hidden',
    position: 'relative',
    background: 'var(--cream-2, #FBF7EE)',
    flexShrink: 0,
    /* Containing block for the site's fixed chrome — without it
       the mobile nav drawer escapes the phone frame and opens
       over the wizard page (same fix as PackSitePreview). */
    transform: 'translateZ(0)',
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-olive, #5C6B3F)' }}>
        <Sparkle size={11} color="var(--gold)" /> {title}
      </div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, margin: '4px 0 14px', lineHeight: 1.5 }}>
        {blurb}
      </p>

      <div className="pl8-structure-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px)', justifyContent: 'center', gap: 14 }}>
        {/* THE LIVE PRESSING — a phone in your hands. Scrollable,
            real renderer, zoomed so layout (and therefore scroll)
            stays native. */}
        <div style={frame} key={pressKey} className="pl8-structure-press">
          {ready ? (
            <div style={{ position: 'absolute', inset: 5, borderRadius: 17, overflow: 'hidden' }}>
              <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
                {/* `zoom` (not transform) so the scaled site keeps
                    real layout height — the window scrolls like a
                    phone. Supported in all evergreen browsers. */}
                <div style={{ width: SITE_W, zoom: 330 / SITE_W, containerType: 'inline-size', containerName: 'pl-site' } as CSSProperties}>
                  <ThemedSite manifest={manifest} names={stableNames} forceMobile demoCopy />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--ink-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Pressing…
            </div>
          )}
          {/* Scroll cue — the hero fills the first screen like a
              real phone; without this, the preview reads as "just
              a hero" and the sections below go undiscovered. */}
          <div
            aria-hidden
            style={{
              position: 'absolute', left: 12, bottom: 12, zIndex: 3,
              padding: '4px 11px', borderRadius: 999,
              background: 'var(--pl-glass-light)',
              backgroundImage: 'var(--pl-glass-sheen)',
              backdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
              WebkitBackdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
              border: '1px solid var(--pl-glass-border)',
              fontSize: 10, fontWeight: 600, color: 'var(--ink-soft)',
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}
          >
            scroll ↓
          </div>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              style={{
                position: 'absolute', right: 12, bottom: 12, zIndex: 3,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: 'color-mix(in srgb, var(--cream, #F5EFE2) 76%, transparent)',
                backdropFilter: 'blur(14px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
                boxShadow: '0 10px 26px -10px rgba(14,13,11,0.4)',
                color: 'var(--ink)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              The fitting room ⤢
            </button>
          )}
        </div>

        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="btn btn-primary pl-pearl-accent"
            style={{ width: '100%', maxWidth: 340, margin: '0 auto', justifyContent: 'center', fontFamily: 'inherit' }}
          >
            Step into the fitting room
          </button>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 760px) {
          :global(.pl8-structure-layout) {
            grid-template-columns: 1fr !important;
          }
        }
        :global(.pl8-structure-press) {
          animation: pl8-press-settle 360ms var(--pl-ease-out, ease-out);
        }
        @keyframes pl8-press-settle {
          from { opacity: 0.55; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.pl8-structure-press) { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
