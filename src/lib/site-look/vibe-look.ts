/* ─── vibe-look — the Vibe step earns its keep ───────────────────
   Before 2026-07-08 the wizard's vibe chips flowed into exactly one
   field: manifest.vibeString (a label) — picking "Editorial" or
   "Playful" changed NOTHING about the generated site. This module
   is the fix: every vibe maps onto the real look axes the renderer
   reads — edition, kit, density, per-section layout variants, and
   the display type's weight/scale (via themeVars).

   Contract (mirrors the wizard's fill-missing ethic):
   - applyVibeLook NEVER overwrites — it only fills axes the host
     hasn't set (and runs BEFORE the wizard's explicit-pick stamps,
     which overwrite freely — so fitting-room / edition / section
     picks always beat vibes, and vibes beat occasion defaults).
   - First selected vibe is loudest: axes merge in pick order,
     first-write-wins per axis.
   - Ids reference REAL registries (layouts.ts variants, editions,
     kits). If an id here drifts from a registry, the renderer's
     fallback chain absorbs it (unknown variant → default) — but
     keep them in sync; the unit test pins the shapes.
   ────────────────────────────────────────────────────────────── */

import type { StoryManifest } from '@/types';

export interface VibeLook {
  /** site-editions id (read-time defaults bundle) — typed off the
   *  manifest so an id that drifts from the registry fails tsc. */
  edition?: StoryManifest['edition'];
  /** Component kit — same manifest-derived union. */
  kitId?: StoryManifest['kitId'];
  /** Section rhythm: cozy | comfortable | spacious. */
  density?: 'cozy' | 'comfortable' | 'spacious';
  /** Per-section layout variants (layouts.ts ids), fill-missing. */
  layouts?: Record<string, string>;
  /** Fraunces display weight for --t-display-wght (theme default ~520). */
  displayWeight?: number;
  /** Hero scale multiplier for --t-hero-scale (theme default 1). */
  heroScale?: number;
  /** One short phrase for the wizard's live "what this does" line. */
  summary: string;
}

/* One entry per vibe chip in WizardV8's VIBES catalog. */
export const VIBE_LOOKS: Record<string, VibeLook> = {
  romantic: {
    edition: 'almanac',
    layouts: { story: 'letter', gallery: 'polaroid' },
    displayWeight: 440,
    summary: 'a handwritten story · soft type',
  },
  joyful: {
    layouts: { gallery: 'masonry', schedule: 'stepper' },
    heroScale: 1.06,
    summary: 'a lively gallery · bigger names',
  },
  intimate: {
    density: 'cozy',
    layouts: { story: 'letter', rsvp: 'minimal' },
    summary: 'closer spacing · a quiet RSVP',
  },
  playful: {
    edition: 'postcard-box',
    kitId: 'scrapbook',
    layouts: { gallery: 'polaroid', schedule: 'stepper' },
    heroScale: 1.05,
    summary: 'scrapbook cards · polaroid photos',
  },
  quiet: {
    edition: 'quiet',
    kitId: 'minimal',
    density: 'spacious',
    layouts: { hero: 'minimal' },
    summary: 'whitespace · a minimal opening',
  },
  editorial: {
    kitId: 'index',
    layouts: { hero: 'spread', story: 'quote', gallery: 'frames' },
    displayWeight: 560,
    summary: 'an off-axis opening · framed photos',
  },
  groovy: {
    edition: 'postcard-box',
    kitId: 'ticket',
    layouts: { hero: 'postcard', gallery: 'masonry' },
    summary: 'ticket-stub cards · a postcard opening',
  },
  outdoorsy: {
    density: 'comfortable',
    layouts: { travel: 'map', gallery: 'masonry' },
    summary: 'the map up front · an open gallery',
  },
  modern: {
    kitId: 'minimal',
    density: 'spacious',
    layouts: { hero: 'typographic', details: 'list' },
    displayWeight: 600,
    summary: 'big clean type · pared-back cards',
  },
  gentle: {
    edition: 'quiet',
    density: 'spacious',
    layouts: { story: 'letter' },
    displayWeight: 430,
    summary: 'soft type · a letter-form story',
  },
  reflective: {
    edition: 'quiet',
    layouts: { story: 'timeline' },
    summary: 'a chapter-by-chapter story',
  },
  warm: {
    density: 'cozy',
    layouts: { story: 'stacked' },
    displayWeight: 480,
    summary: 'closer spacing · a homely story',
  },
  classic: {
    edition: 'almanac',
    kitId: 'classic',
    layouts: { story: 'sidebyside' },
    summary: 'the bound-book layout',
  },
  traditional: {
    edition: 'linen-folder',
    kitId: 'classic',
    layouts: { schedule: 'numbered' },
    summary: 'formal stationery · a numbered order',
  },
  elegant: {
    edition: 'linen-folder',
    kitId: 'plate',
    density: 'spacious',
    layouts: { hero: 'plate', schedule: 'list' },
    displayWeight: 400,
    summary: 'a poster of your names · airy pages',
  },
  formal: {
    edition: 'linen-folder',
    kitId: 'plate',
    density: 'spacious',
    layouts: { hero: 'split', faq: 'numbered' },
    summary: 'hotel-stationery formality',
  },
  bold: {
    layouts: { hero: 'fullbleed' },
    displayWeight: 680,
    heroScale: 1.12,
    summary: 'heavy type · a full-photo opening',
  },
  retro: {
    kitId: 'ticket',
    layouts: { hero: 'postcard', schedule: 'numbered' },
    summary: 'ticket stubs · a postcard opening',
  },
  whimsical: {
    kitId: 'scrapbook',
    layouts: { gallery: 'polaroid', story: 'zigzag' },
    summary: 'polaroids · a zigzag story',
  },
};

/** The live Vibe-step line: what the current picks will actually do. */
export function vibeLookSummary(vibes: string[]): string {
  const parts = vibes
    .map((v) => VIBE_LOOKS[v]?.summary)
    .filter((s): s is string => Boolean(s));
  return parts.join(' · ');
}

/** Fold the picked vibes into the manifest — fill-missing only, first
 *  vibe loudest. Call AFTER seeding/section picks land their layouts
 *  and BEFORE the wizard's explicit-pick stamps (which overwrite). */
export function applyVibeLook(manifest: StoryManifest, vibes: string[]): StoryManifest {
  if (!vibes.length) return manifest;
  const m = manifest as StoryManifest & {
    density?: string;
    layouts?: Record<string, string>;
    themeVars?: Record<string, string>;
  };
  const next = { ...m, layouts: { ...(m.layouts ?? {}) }, themeVars: { ...(m.themeVars ?? {}) } };
  for (const id of vibes) {
    const look = VIBE_LOOKS[id];
    if (!look) continue;
    if (look.edition && !next.edition) next.edition = look.edition;
    if (look.kitId && !next.kitId) next.kitId = look.kitId;
    if (look.density && !next.density) next.density = look.density;
    if (look.layouts) {
      for (const [section, variant] of Object.entries(look.layouts)) {
        if (!next.layouts[section]) next.layouts[section] = variant;
      }
    }
    if (look.displayWeight && !next.themeVars['--t-display-wght']) {
      next.themeVars['--t-display-wght'] = String(look.displayWeight);
    }
    if (look.heroScale && !next.themeVars['--t-hero-scale']) {
      next.themeVars['--t-hero-scale'] = String(look.heroScale);
    }
  }
  return next as StoryManifest;
}
