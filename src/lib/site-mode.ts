// ─────────────────────────────────────────────────────────────
// Pearloom / lib/site-mode.ts
//
// Canonical layout-mode types + constants. Single source of truth
// for how a Pearloom site is structured at the route level:
//
//   • SiteMode: 'scroll' | 'multi-page'
//       - scroll      → every block on one long home page; nav
//                       links are anchors.
//       - multi-page  → home renders only DEFAULT_HOME_BLOCKS (or
//                       manifest.homePageBlocks); every other
//                       section becomes /{occasion}/{slug}/{block}.
//
//   • SiteBlockKey: the canonical set of block slugs the renderer
//     and route layer agree on.
//
//   • DEFAULT_HOME_BLOCKS: the single fallback used by both the
//     editor (ThemePanel checklist preselects these) and the
//     renderer (uses these when manifest.homePageBlocks is unset).
//
// Both ThemePanel and ThemedSiteRenderer import from here so the two
// can never drift out of agreement.
// ─────────────────────────────────────────────────────────────

export type SiteMode = 'scroll' | 'multi-page';

export type SiteBlockKey =
  | 'story'
  | 'details'
  | 'schedule'
  | 'travel'
  | 'registry'
  | 'gallery'
  | 'faq'
  | 'rsvp';

/** Canonical render order on a scroll-mode home page (also the
 *  fallback when blockOrder isn't set on the manifest). */
export const DEFAULT_BLOCK_ORDER: SiteBlockKey[] = [
  'story',
  'details',
  'schedule',
  'travel',
  'registry',
  'gallery',
  'faq',
  'rsvp',
];

/** Multi-page mode default — the editor checklist preselects these
 *  and the renderer falls back to them when manifest.homePageBlocks
 *  is unset. 'details' is implicitly always on home, so it's not in
 *  this list. */
export const DEFAULT_HOME_BLOCKS: SiteBlockKey[] = ['story', 'gallery'];

/** Sections that get their own dedicated page in multi-page mode.
 *  'details' stays on home — it's a summary strip, not a destination. */
export const MULTI_PAGE_BLOCKS: SiteBlockKey[] = [
  'story',
  'schedule',
  'travel',
  'registry',
  'gallery',
  'faq',
  'rsvp',
];

/** Block → URL slug for sub-pages. Stable identifiers; these are
 *  the public URL surface for multi-page sites. */
export const BLOCK_PAGE_SLUG: Record<SiteBlockKey, string> = {
  story: 'story',
  details: 'details',
  schedule: 'schedule',
  travel: 'travel',
  registry: 'registry',
  gallery: 'gallery',
  faq: 'faq',
  rsvp: 'rsvp',
};

/** Type-narrow read for manifest.siteMode without `as unknown as` casts.
 *  Returns 'multi-page' only when the field is exactly the string
 *  'multi-page'; everything else (unset / unknown / legacy) falls
 *  back to scroll mode. */
export function readSiteMode(manifest: unknown): SiteMode {
  if (
    typeof manifest === 'object'
    && manifest !== null
    && (manifest as { siteMode?: unknown }).siteMode === 'multi-page'
  ) {
    return 'multi-page';
  }
  return 'scroll';
}

/** Type-narrow read for manifest.homePageBlocks. Filters to known
 *  SiteBlockKey values so a stale slug from an older manifest can't
 *  poison the home page. Returns DEFAULT_HOME_BLOCKS when unset. */
export function readHomePageBlocks(manifest: unknown): SiteBlockKey[] {
  const raw = (manifest as { homePageBlocks?: unknown } | null)?.homePageBlocks;
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_HOME_BLOCKS];
  const allowed = new Set<SiteBlockKey>(DEFAULT_BLOCK_ORDER);
  const filtered = raw.filter((k): k is SiteBlockKey => typeof k === 'string' && allowed.has(k as SiteBlockKey));
  return filtered.length > 0 ? filtered : [...DEFAULT_HOME_BLOCKS];
}

/** Returns true when `slug` is a real V8 sub-page key. */
export function isSiteBlockKey(slug: string): slug is SiteBlockKey {
  return (DEFAULT_BLOCK_ORDER as string[]).includes(slug);
}
