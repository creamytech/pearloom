'use client';

/* ─────────────────────────────────────────────────────────────
   WizardStructureSection — "The structure", on the Palette step.

   v2 (2026-06-12): a LIVE preview, not wireframes. One real
   ThemedSite render — the host's names, photos, palette, and
   chosen look — in a scrollable phone-shaped window, re-pressed
   instantly on every tap. The chip rows beneath choose:

     · How it reads — one page vs magazine → manifest.siteMode
     · The component kit — the six construction kits → kitId
     · The nav — five nav variants → manifest.layouts.nav
     · The hero — six hero variants → manifest.layouts.hero

   Every row leads with "Pear decides" (no stamp — the look
   recipe / edition defaults ride). Explicit picks land exactly
   where the editor's Layout tab + Theme panel write them, and
   the preview IS the proof: scroll it and you're scrolling your
   site as it will press.
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
}

const SITE_W = 430; // phone-width render — the device most guests hold

const KIT_TILES = [
  { id: 'classic', label: 'Classic', sub: 'Calm cards' },
  { id: 'ticket', label: 'Ticket', sub: 'Perforated stubs' },
  { id: 'plate', label: 'Plate', sub: 'Triple-inset plates' },
  { id: 'scrapbook', label: 'Scrapbook', sub: 'Tape + tilt' },
  { id: 'index', label: 'Index', sub: 'Ruled rows' },
  { id: 'minimal', label: 'Minimal', sub: 'Hairlines only' },
];

const NAV_TILES = [
  { id: 'centered', label: 'Centered' },
  { id: 'split', label: 'Split' },
  { id: 'serif-block', label: 'Serif block' },
  { id: 'minimal-text', label: 'Minimal' },
  { id: 'iconic', label: 'Iconic' },
];

const HERO_TILES = [
  { id: 'centered', label: 'Centered' },
  { id: 'split', label: 'Split' },
  { id: 'fullbleed', label: 'Full-bleed' },
  { id: 'typographic', label: 'Typographic' },
  { id: 'postcard', label: 'Postcard' },
  { id: 'minimal', label: 'Minimal' },
];

function Chip({ on, label, sub, onClick }: { on: boolean; label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: sub ? '7px 13px 6px' : '8px 14px',
        borderRadius: 999, fontSize: 12.5, fontWeight: 600,
        border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
        background: on ? 'var(--ink)' : 'var(--card)',
        color: on ? 'var(--cream)' : 'var(--ink-soft)',
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2,
        transition: 'background 160ms var(--pl-ease-out, ease), color 160ms var(--pl-ease-out, ease), border-color 160ms var(--pl-ease-out, ease)',
      }}
    >
      <span>{label}</span>
      {sub && <span style={{ fontSize: 9.5, fontWeight: 500, opacity: 0.75 }}>{sub}</span>}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '0 0 7px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  );
}

export function WizardStructureSection({
  occasion,
  paletteColors,
  names,
  coverPhoto,
  galleryImages,
  recipe,
  picks,
  onChange,
  onExpand,
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
  picks: StructurePicks;
  onChange: (next: Partial<StructurePicks>) => void;
  /** Opens the full-screen fitting room. */
  onExpand?: () => void;
}) {
  /* One real manifest, rebuilt on every pick — the same bridge
     generation uses, so the preview IS the site. */
  const manifest = useMemo<StoryManifest>(() => {
    const base = {
      occasion,
      coverPhoto,
      galleryImages,
    } as unknown as StoryManifest;
    const dressed = applyWizardLook(base, {
      selectedPaletteColors: paletteColors,
      occasion,
    }) as unknown as Record<string, unknown>;
    if (recipe) {
      dressed.kitId = recipe.kitId;
      dressed.texture = recipe.texture;
      dressed.textureIntensity = recipe.textureIntensity;
      dressed.motifLayout = recipe.motifLayout;
      dressed.density = recipe.density;
    }
    if (picks.kitId) dressed.kitId = picks.kitId;
    if (picks.texture) dressed.texture = picks.texture;
    const layouts: Record<string, string> = {};
    if (picks.navVariant) layouts.nav = picks.navVariant;
    if (picks.heroVariant) layouts.hero = picks.heroVariant;
    if (Object.keys(layouts).length > 0) dressed.layouts = layouts;
    return dressed as unknown as StoryManifest;
  }, [occasion, paletteColors, coverPhoto, galleryImages, recipe, picks.kitId, picks.texture, picks.navVariant, picks.heroVariant]);

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
  const pressKey = `${picks.siteMode ?? ''}|${picks.kitId ?? ''}|${picks.texture ?? ''}|${picks.navVariant ?? ''}|${picks.heroVariant ?? ''}`;

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
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-olive, #5C6B3F)' }}>
        <Sparkle size={11} color="var(--gold)" /> The structure
      </div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, margin: '4px 0 14px', lineHeight: 1.5 }}>
        This is your site, live — scroll it. Every tap below re-presses it
        so you see exactly what guests will.
      </p>

      <div className="pl8-structure-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) 1fr', gap: 20, alignItems: 'start' }}>
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
                  <ThemedSite manifest={manifest} names={names} forceMobile />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--ink-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Pressing…
            </div>
          )}
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

        {/* THE CHOICES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <Row label="How it reads">
            <Chip on={picks.siteMode === undefined} label="Pear decides" onClick={() => onChange({ siteMode: undefined })} />
            <Chip on={picks.siteMode === 'scroll'} label="One page" sub="Everything in one scroll" onClick={() => onChange({ siteMode: 'scroll' })} />
            <Chip on={picks.siteMode === 'multi-page'} label="Magazine" sub="Each section its own page" onClick={() => onChange({ siteMode: 'multi-page' })} />
          </Row>
          <Row label="The component kit">
            <Chip on={picks.kitId === undefined} label="Pear decides" onClick={() => onChange({ kitId: undefined })} />
            {KIT_TILES.map((t) => (
              <Chip key={t.id} on={picks.kitId === t.id} label={t.label} sub={t.sub} onClick={() => onChange({ kitId: t.id })} />
            ))}
          </Row>
          <Row label="The nav">
            <Chip on={picks.navVariant === undefined} label="Pear decides" onClick={() => onChange({ navVariant: undefined })} />
            {NAV_TILES.map((t) => (
              <Chip key={t.id} on={picks.navVariant === t.id} label={t.label} onClick={() => onChange({ navVariant: t.id })} />
            ))}
          </Row>
          <Row label="The hero">
            <Chip on={picks.heroVariant === undefined} label="Pear decides" onClick={() => onChange({ heroVariant: undefined })} />
            {HERO_TILES.map((t) => (
              <Chip key={t.id} on={picks.heroVariant === t.id} label={t.label} onClick={() => onChange({ heroVariant: t.id })} />
            ))}
          </Row>
        </div>
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
