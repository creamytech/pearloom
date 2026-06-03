/* eslint-disable no-restricted-syntax */
/* hydrateManifestForRedesign
   ---------------------------------------------------------------
   The new redesign canvas reads a wider field set than older
   StoryManifest records carry. This module backfills the new
   fields from the canonical schema so a site generated before
   the redesign existed still renders meaningful content in the
   new canvas — instead of falling through to the prototype's
   sample copy ("Casa Chorro", "olive grove ceremony", etc.).

   Idempotent: passing a manifest that already has the new fields
   returns it unchanged (we only set when the target is missing).
   Safe: never mutates the input — every set goes on a shallow
   clone. */

import type { StoryManifest, Chapter } from '@/types';
import { normalizeOccasion } from '@/lib/site-urls';
import { THEMES } from '../site/themes';
import { recommendEdition } from '@/lib/site-editions/resolve';

/* Canonical accent colours per redesign theme, used to map an old
   manifest's theme.colors.accent to the nearest themeId. Pulled
   from THEMES on import so it stays in sync if a theme palette
   changes. */
const THEME_ACCENTS: Array<{ id: string; accent: string }> = THEMES.map((t) => ({
  id: t.id,
  /* Each theme's vars.accent is `oklch(...)` or `#...`. We compare
     hex when both sides are hex; otherwise pick the first theme
     as a stable fallback. */
  accent: (t.vars?.accent as string) ?? '',
}));

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function colourDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function nearestThemeId(accent?: string): string | null {
  if (!accent) return null;
  const target = hexToRgb(accent);
  if (!target) return null;
  let best: { id: string; d: number } | null = null;
  for (const { id, accent: themeAccent } of THEME_ACCENTS) {
    const rgb = hexToRgb(themeAccent);
    if (!rgb) continue;
    const d = colourDistance(target, rgb);
    if (!best || d < best.d) best = { id, d };
  }
  return best?.id ?? null;
}

/* Build a default `detailsCards` triple from canonical logistics
   so the Details section renders the host's actual data instead
   of "Garden formal / Ages 10+ / Your presence is enough". */
function buildDetailsCards(logistics?: {
  dressCode?: string;
  parking?: string;
  accessibility?: string;
  childPolicy?: string;
  gifts?: string;
}): Array<[string, string]> | null {
  if (!logistics) return null;
  const cards: Array<[string, string]> = [];
  if (logistics.dressCode) cards.push(['Dress code', logistics.dressCode]);
  if (logistics.childPolicy) cards.push(['Kids welcome', logistics.childPolicy]);
  if (logistics.parking) cards.push(['Parking', logistics.parking]);
  if (logistics.accessibility) cards.push(['Accessibility', logistics.accessibility]);
  if (logistics.gifts) cards.push(['Gifts', logistics.gifts]);
  return cards.length > 0 ? cards.slice(0, 3) : null;
}

function pickStoryBody(chapters?: Chapter[], poetry?: { story?: string; ourStory?: string }): string | null {
  /* Prefer the first chapter's description — that's what the
     dashboard's Story panel writes to (Chapter.description per
     src/types.ts). Fall back to a poetry/ourStory field for very
     old manifests written before the chapters refactor. */
  const first = chapters?.[0];
  if (first?.description && first.description.trim().length > 0) return first.description.trim();
  if (first?.subtitle && first.subtitle.trim().length > 0) return first.subtitle.trim();
  if (poetry?.story) return poetry.story;
  if (poetry?.ourStory) return poetry.ourStory;
  return null;
}

function pickStoryHeadline(chapters?: Chapter[]): string | null {
  return chapters?.[0]?.title ?? null;
}

function pickTagline(poetry?: { heroTagline?: string; preCeremony?: string; subtitle?: string }): string | null {
  if (!poetry) return null;
  return poetry.heroTagline ?? poetry.subtitle ?? poetry.preCeremony ?? null;
}

interface RedesignFields {
  themeId?: string;
  kitId?: string;
  edition?: string;
  siteLayout?: string;
  density?: string;
  textureIntensity?: number;
  motifsEnabled?: boolean;
  storySection?: { headline?: string; body?: string; chips?: string[] };
  detailsCards?: Array<[string, string]>;
  tagline?: string;
  layouts?: Record<string, string>;
  voiceOverride?: string;
}

export function hydrateManifestForRedesign(input: StoryManifest): StoryManifest {
  const m = input as unknown as Record<string, unknown> & RedesignFields;
  /* Shallow clone — never mutate caller. */
  const out: Record<string, unknown> & RedesignFields = { ...m };

  /* 1. themeId — nearest match from theme.colors.accent. */
  if (!out.themeId) {
    const accent = ((m as unknown as { theme?: { colors?: { accent?: string } } }).theme?.colors?.accent) ?? undefined;
    const matched = nearestThemeId(accent);
    if (matched) out.themeId = matched;
  }

  /* 2. edition — recommend from occasion when none set. */
  if (!out.edition) {
    const occ = normalizeOccasion((m as unknown as { occasion?: string }).occasion);
    try {
      /* recommendEdition takes (occasion, voice). We only have
         occasion here; voice would require importing EVENT_TYPES,
         which is fine but the occasion match alone already covers
         most cases. */
      out.edition = recommendEdition(occ, undefined);
    } catch {
      out.edition = 'almanac';
    }
  }

  /* 3. siteLayout / density / textureIntensity / kitId / motifs —
     stable defaults so the canvas never reads `undefined`. */
  if (!out.siteLayout) out.siteLayout = 'stacked';
  if (!out.density) out.density = 'comfortable';
  if (typeof out.textureIntensity !== 'number') out.textureIntensity = 1;
  if (typeof out.motifsEnabled !== 'boolean') out.motifsEnabled = true;
  if (!out.kitId) out.kitId = 'classic';

  /* 4. storySection — fill headline + body from chapters[0]. */
  if (!out.storySection || (!out.storySection.headline && !out.storySection.body)) {
    const headline = pickStoryHeadline((m as unknown as { chapters?: Chapter[] }).chapters);
    const body = pickStoryBody(
      (m as unknown as { chapters?: Chapter[] }).chapters,
      (m as unknown as { poetry?: { story?: string; ourStory?: string } }).poetry,
    );
    if (headline || body) {
      out.storySection = {
        ...(out.storySection ?? {}),
        ...(headline ? { headline } : {}),
        ...(body ? { body } : {}),
      };
    }
  }

  /* 5. detailsCards — built from canonical logistics. */
  if (!Array.isArray(out.detailsCards) || out.detailsCards.length === 0) {
    const cards = buildDetailsCards(
      (m as unknown as { logistics?: { dressCode?: string; parking?: string; accessibility?: string; childPolicy?: string; gifts?: string } }).logistics,
    );
    if (cards) out.detailsCards = cards;
  }

  /* 6. tagline — from poetry.heroTagline. */
  if (!out.tagline) {
    const t = pickTagline((m as unknown as { poetry?: { heroTagline?: string; preCeremony?: string; subtitle?: string } }).poetry);
    if (t) out.tagline = t;
  }

  return out as unknown as StoryManifest;
}
