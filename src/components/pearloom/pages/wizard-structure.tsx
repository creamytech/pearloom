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

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { ThemedSite } from '../redesign/ThemedSite';
import { applyWizardLook } from '@/lib/site-look/wizard-look';
import { applyVibeLook } from '@/lib/site-look/vibe-look';
import { applySectionPicks, type SectionPicks } from '@/lib/event-os/wizard-sections';
import { seedSectionsFromWizard, type DayPicks } from '@/lib/wizard-seed';
import type { LookRecipe } from '@/lib/site-look/look-recipes';
import { Sparkle } from '../motifs';
import { DEBOSS_SHEET } from '@/components/brand/pressed';

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
  sectionPicks,
  vibes,
  stage = false,
  proof = false,
  eventDate,
  location,
  seedPicks,
  onPressSeal,
  pressing = false,
  onChange: _onChange,
  onExpand,
  title = 'The structure',
  blurb = 'This is your site, live, scroll it. Step into the fitting room to try every palette, paper, kit, layout, and motif on it in real time.',
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
  /** The Sections-step chooser's selection — so the live pressing
   *  drops a section the host set aside and shows one they added.
   *  undefined = host skipped the step (renderer core defaults). */
  sectionPicks?: SectionPicks;
  /** The Vibe-step picks — generation folds these into the look
   *  (applyVibeLook), so the pressing must wear them too. */
  vibes?: string[];
  /** STAGE mode (RADICAL §D, the inversion): the pressing renders as
   *  a full-width desktop-scale sheet — the proof — instead of the
   *  phone. Review mounts it so. */
  stage?: boolean;
  /** Review mount only — the pressing is framed as "the exact site
   *  Pear will press", so it renders in ThemedSite's proof mode
   *  (real content + drafting slats, never demo copy). */
  proof?: boolean;
  /** The host's real facts + Day-step picks — the proof carries the
   *  same content the press will (seedSectionsFromWizard, identical
   *  to handleFinish), so a picked schedule/hotels/FAQ render REAL
   *  instead of slatting. */
  eventDate?: string;
  location?: string;
  seedPicks?: DayPicks;
  /** Stage-only: mounts the floating wax seal ("Press it") over the
   *  sheet; fires the wizard's finish. */
  onPressSeal?: () => void;
  /** Disables the seal while the press runs. */
  pressing?: boolean;
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
  const sectionPicksKey = sectionPicks
    ? `${[...sectionPicks.on].sort().join(',')}~${Object.entries(sectionPicks.layouts).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(',')}`
    : '';
  const vibesKey = (vibes ?? []).join('|');
  const seedKey = seedPicks ? JSON.stringify(seedPicks) : '';
  const manifest = useMemo<StoryManifest>(() => {
    const base = {
      occasion,
      coverPhoto,
      galleryImages,
      /* The host's real date + location — the proof hero states the
         facts they gave, exactly as the press will. */
      ...(eventDate || location
        ? { logistics: { ...(eventDate ? { date: eventDate } : {}), ...(location ? { place: location } : {}) } }
        : {}),
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
    // The Sections-step chooser (blockOrder / hiddenSections /
    // per-section layouts) — a section set aside there is absent
    // here; one added appears. Applied BEFORE the nav/hero picks so
    // the fitting-room hero wins over the chooser's hero variant
    // (same precedence as handleFinish).
    let out = dressed as unknown as StoryManifest;
    // Day-step picks seed the proof exactly as handleFinish seeds
    // the press (seed FIRST, then section picks — same precedence).
    if (seedPicks) out = seedSectionsFromWizard(out, seedPicks);
    if (sectionPicks) out = applySectionPicks(out, occasion, sectionPicks);
    // Vibes fold in exactly where handleFinish folds them — after
    // section picks, before the explicit nav/hero stamps — so the
    // pressing IS the site the press will produce.
    if (vibes?.length) out = applyVibeLook(out, vibes);
    const outLoose = out as unknown as Record<string, unknown>;
    const navHero: Record<string, string> = {};
    if (picks.navVariant) navHero.nav = picks.navVariant;
    if (picks.heroVariant) navHero.hero = picks.heroVariant;
    if (Object.keys(navHero).length > 0) {
      outLoose.layouts = { ...((outLoose.layouts as Record<string, string> | undefined) ?? {}), ...navHero };
    }
    return out;
    // Keyed by CONTENT (paletteKey/galleryKey/picksKey/recipeKey/
    // sectionPicksKey/vibesKey), not the per-render literal identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasion, coverPhoto, paletteKey, galleryKey, picksKey, recipeKey, sectionPicksKey, vibesKey, suggestedMotif, suggestedMotifLayout, eventDate, location, seedKey]);

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
  const pressKey = `${picks.siteMode ?? ''}|${picks.kitId ?? ''}|${picks.texture ?? ''}|${picks.navVariant ?? ''}|${picks.heroVariant ?? ''}|${picks.motifLayout ?? ''}|${picks.density ?? ''}|${vibesKey}`;

  /* STAGE mode measures its own width so the desktop-scale site
     (rendered at STAGE_W) zooms to fit exactly — no horizontal
     crop, real scroll. */
  const STAGE_W = 1180;
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  useEffect(() => {
    if (!stage) return;
    const node = stageRef.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setStageWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    });
    ro.observe(node);
    return () => ro.disconnect();
    /* pressKey in the deps ON PURPOSE: the stage div re-keys on
       every look pick (the re-press animation), which REMOUNTS the
       node — an observer bound only on [stage] keeps watching the
       orphaned old node and the new one never reports a width
       (the blank-pressing bug after a fitting-room visit). */
  }, [stage, pressKey]);

  const sealAccent = paletteColors?.[1] || 'var(--pl-olive, #5C6B3F)';
  const sealInitials = `${(names[0] ?? '').trim().charAt(0) || 'A'}${(names[1] ?? '').trim() ? '·' + names[1].trim().charAt(0) : ''}`.toUpperCase();

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

      <div className="pl8-structure-layout" style={{ display: 'grid', gridTemplateColumns: stage ? 'minmax(0, 1fr)' : 'minmax(0, 340px)', justifyContent: 'center', gap: 14 }}>
        {/* THE LIVE PRESSING. Phone mode: a phone in your hands.
            STAGE mode (Review): the proof — a full-width pressed
            sheet holding the desktop-scale site, seal floating over
            it. Both scrollable, real renderer, zoomed so layout
            (and therefore scroll) stays native. */}
        <div
          ref={stage ? stageRef : undefined}
          style={stage ? {
            width: '100%',
            height: 'clamp(520px, 64vh, 720px)',
            borderRadius: 18,
            border: '1px solid var(--line-soft, var(--line))',
            boxShadow: DEBOSS_SHEET,
            overflow: 'hidden',
            position: 'relative',
            background: 'var(--card, #FBF7EE)',
            transform: 'translateZ(0)',
          } : frame}
          key={pressKey}
          className="pl8-structure-press"
        >
          {ready ? (
            <div style={{ position: 'absolute', inset: stage ? 0 : 5, borderRadius: stage ? 18 : 17, overflow: 'hidden' }}>
              <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
                {/* `zoom` (not transform) so the scaled site keeps
                    real layout height — the window scrolls like a
                    phone. Supported in all evergreen browsers. */}
                {stage ? (
                  /* Never render NOTHING while the width settles —
                     an unmeasured beat renders at natural scale and
                     corrects the moment the observer reports (the
                     stage previously blanked whenever the width
                     read 0). */
                  <div style={{ width: STAGE_W, zoom: (stageWidth > 0 ? stageWidth : STAGE_W) / STAGE_W, containerType: 'inline-size', containerName: 'pl-site' } as CSSProperties}>
                    <ThemedSite manifest={manifest} names={stableNames} demoCopy={!proof} proof={proof} />
                  </div>
                ) : (
                  <div style={{ width: SITE_W, zoom: 330 / SITE_W, containerType: 'inline-size', containerName: 'pl-site' } as CSSProperties}>
                    <ThemedSite manifest={manifest} names={stableNames} forceMobile demoCopy={!proof} proof={proof} />
                  </div>
                )}
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
          {/* THE SEAL — stage-only. Finishing isn't a form submit;
              it's pressing the seal onto the proof. Floats bottom-
              center over the sheet in the site's own accent wax. */}
          {stage && onPressSeal && (
            <div style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <button
                type="button"
                onClick={onPressSeal}
                disabled={pressing}
                aria-label="Press the seal, build my site"
                className="pl-tap"
                style={{
                  width: 88, height: 88, borderRadius: '50%',
                  border: 'none', cursor: pressing ? 'wait' : 'pointer',
                  transform: 'rotate(-6deg)',
                  background: `radial-gradient(circle at 32% 28%, color-mix(in srgb, ${sealAccent} 72%, #fff) 0%, ${sealAccent} 46%, color-mix(in srgb, ${sealAccent} 72%, #000) 100%)`,
                  boxShadow: '0 10px 26px -8px rgba(0,0,0,0.45), inset 0 -2px 5px rgba(0,0,0,0.24), inset 0 2px 4px rgba(255,255,255,0.3)',
                  color: 'var(--cream, #F5EFE2)',
                  fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                  fontStyle: 'italic',
                  fontSize: 26,
                  lineHeight: 1,
                  opacity: pressing ? 0.7 : 1,
                }}
              >
                {sealInitials}
              </button>
              <span
                style={{
                  padding: '4px 12px', borderRadius: 999,
                  background: 'color-mix(in srgb, var(--cream, #F5EFE2) 82%, transparent)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                }}
              >
                {pressing ? 'Pressing…' : 'Press it'}
              </span>
            </div>
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
