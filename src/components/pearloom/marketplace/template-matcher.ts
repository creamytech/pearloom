// ─────────────────────────────────────────────────────────────
// Pearloom / marketplace/template-matcher.ts
//
// Marketplace templates (curated tiles) and SITE_TEMPLATES
// (rich generator payload) historically grew as separate
// registries with different id namespaces. This matcher bridges
// them so:
//   - the preview modal can render with real hero copy / motifs
//     / theme colors
//   - the generate/stream step can apply the right SITE_TEMPLATE
//     when the user picks a marketplace tile
//
// Matching strategy, in order:
//   1. Exact id match (ethereal-garden ↔ ethereal-garden)
//   2. Explicit alias table below
//   3. Nearest-neighbour: same occasion + shared tags
// ─────────────────────────────────────────────────────────────

import { SITE_TEMPLATES, type SiteTemplate } from '@/lib/templates/wedding-templates';
import type { Template } from './templates-data';

// Hand-curated aliases so the most popular marketplace tiles always
// resolve to a rich SITE_TEMPLATE. Extend this list as tiles are added.
// Aliases map marketplace tile ids → SITE_TEMPLATE ids. Critically,
// every occasion-specific tile needs to land on a SITE_TEMPLATE that
// declares the right occasion-specific blocks (itinerary for bachelor
// party, advice wall for bridal shower, etc) — otherwise the modal
// preview renders generic wedding blocks and lies about what the user
// will get.
const ALIASES: Record<string, string> = {
  // Wedding tiles → wedding SITE_TEMPLATEs
  'wildflower-barn': 'ethereal-garden',
  'pearl-district': 'midnight-luxe',
  'cannon-beach': 'coastal-breeze',
  'olive-gold-wedding': 'tuscan-villa',
  'finnish-cottage': 'enchanted-forest',
  // Engagement tiles
  'the-yes': 'blush-bloom',
  'springtime-engagement': 'blush-bloom',
  // Rehearsal-dinner
  'the-rehearsal': 'the-night-before',
  'night-before': 'the-night-before',
  // Welcome / brunch / vow-renewal
  'welcome-weekend': 'warm-threshold',
  'morning-after': 'one-more-round',
  'still-us': 'saying-it-again',
  // Bachelor / bachelorette → carry itinerary/costSplitter/privacyGate
  'big-sur-bach': 'last-weekend-in',
  'nashville-bach': 'last-weekend-in',
  // Bridal shower → carries advice wall
  'garden-shower': 'gentle-gathering',
  // Misc
  'ceremony-70s': 'y2k-reloaded',
};

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[\s,·—–\-_/]+/)
      .filter(Boolean),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

/** Resolve a marketplace tile to the SITE_TEMPLATE that will actually
 *  drive generation. Returns null when we can't find a reasonable match
 *  (the preview modal falls back to the tile's palette-level metadata). */
export function findMatchingSiteTemplate(tile: Template): SiteTemplate | null {
  // 1. Exact id match
  const exact = SITE_TEMPLATES.find((s) => s.id === tile.id);
  if (exact) return exact;

  // 2. Alias table
  const aliased = ALIASES[tile.id];
  if (aliased) {
    const hit = SITE_TEMPLATES.find((s) => s.id === aliased);
    if (hit) return hit;
  }

  // 3. Nearest-neighbour inside the same occasion
  const sameOccasion = SITE_TEMPLATES.filter((s) => s.occasions.includes(tile.occasion));
  if (sameOccasion.length === 0) return null;

  const tileTokens = new Set<string>([
    tile.palette,
    ...tile.vibes.map((v) => v.toLowerCase()),
    ...tokenize(tile.description),
    tile.layout,
  ]);

  let best: SiteTemplate | null = null;
  let bestScore = 0;
  for (const s of sameOccasion) {
    const candidateTokens = new Set<string>([
      ...(s.tags ?? []),
      ...tokenize(s.name),
      ...tokenize(s.tagline),
      ...tokenize(s.vibeString),
      s.layoutFormat ?? '',
    ]);
    const score = overlap(tileTokens, candidateTokens);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }

  return bestScore >= 1 ? best : sameOccasion[0] ?? null;
}

/** Resolve a SITE_TEMPLATE id that the /api/generate/stream route
 *  should apply when the user picks a marketplace tile. */
export function resolveGeneratorTemplateId(tile: Template): string | null {
  return findMatchingSiteTemplate(tile)?.id ?? null;
}
