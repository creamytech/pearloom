// ─────────────────────────────────────────────────────────────
// Pearloom / lib/site-urls.ts
//
// Single source of truth for building URLs to published sites.
//
// Canonical URLs are now occasion-prefixed (Zola-style):
//
//     pearloom.com/{occasion}/{slug}          e.g. /wedding/scott
//     pearloom.com/{occasion}/{slug}/{page}   e.g. /wedding/scott/rsvp
//
// The proxy in src/proxy.ts rewrites `/{occasion}/{slug}` →
// `/sites/{slug}` internally so the existing route tree keeps
// working unchanged. The legacy `/sites/{slug}` URL is preserved
// for already-shared links.
//
// We publish on path-based URLs (instead of subdomain-based
// `<slug>.pearloom.com`) because:
//
//   1. One cookie jar / one analytics property
//   2. Cleaner link previews for non-technical guests
//   3. No wildcard DNS or SSL complexity
//   4. Custom domains map 1:1 to the path form
// ─────────────────────────────────────────────────────────────

/** Occasions Pearloom supports for URL prefixing.
 *
 * The source of truth for *which* occasions exist is the
 * EVENT_TYPES registry in `src/lib/event-os/event-types.ts` —
 * this union mirrors those ids so TypeScript can narrow correctly
 * across the codebase. Adding a new occasion means:
 *   1. Append it here.
 *   2. Add an entry to EVENT_TYPES.
 *   3. Nothing else — the proxy allowlist, URL helpers, and
 *      wizard all read the registry.
 */
export type SiteOccasion =
  // Currently shipping
  | 'wedding'
  | 'anniversary'
  | 'engagement'
  | 'birthday'
  | 'story'
  // Wedding-arc (planned)
  | 'bachelor-party'
  | 'bachelorette-party'
  | 'bridal-shower'
  | 'bridal-luncheon'
  | 'rehearsal-dinner'
  | 'welcome-party'
  | 'brunch'
  | 'vow-renewal'
  // Family (planned)
  | 'baby-shower'
  | 'gender-reveal'
  | 'sip-and-see'
  | 'housewarming'
  // Milestone (planned)
  | 'first-birthday'
  | 'sweet-sixteen'
  | 'milestone-birthday'
  | 'retirement'
  | 'graduation'
  // Cultural (planned)
  | 'bar-mitzvah'
  | 'bat-mitzvah'
  | 'quinceanera'
  | 'baptism'
  | 'first-communion'
  | 'confirmation'
  // Commemoration (planned)
  | 'memorial'
  | 'funeral'
  | 'reunion';

const ALLOWED_OCCASIONS = new Set<SiteOccasion>([
  // Shipping
  'wedding', 'anniversary', 'engagement', 'birthday', 'story',
  // Wedding arc
  'bachelor-party', 'bachelorette-party', 'bridal-shower',
  'bridal-luncheon', 'rehearsal-dinner', 'welcome-party',
  'brunch', 'vow-renewal',
  // Family
  'baby-shower', 'gender-reveal', 'sip-and-see', 'housewarming',
  // Milestone
  'first-birthday', 'sweet-sixteen', 'milestone-birthday',
  'retirement', 'graduation',
  // Cultural
  'bar-mitzvah', 'bat-mitzvah', 'quinceanera',
  'baptism', 'first-communion', 'confirmation',
  // Commemoration
  'memorial', 'funeral', 'reunion',
]);

/** Normalize an unknown input into a valid occasion slug ("wedding" default). */
export function normalizeOccasion(input: unknown): SiteOccasion {
  if (typeof input === 'string') {
    const lower = input.trim().toLowerCase() as SiteOccasion;
    if (ALLOWED_OCCASIONS.has(lower)) return lower;
  }
  return 'wedding';
}

/** The origin (scheme + host) of the main Pearloom app — no trailing slash. */
export function getAppOrigin(): string {
  // Client-side: prefer the current origin so dev + preview + prod all work.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'https://pearloom.com';
}

function cleanSegment(v: string): string {
  return String(v || '').trim().replace(/^\/+|\/+$/g, '');
}

function cleanSubPath(path: string): string {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Build the canonical public URL for a published site.
 *
 * When `occasion` is provided (directly or via a manifest), the
 * pretty Zola-style URL is emitted: `/{occasion}/{slug}{path}`.
 * When omitted, falls back to the legacy `/sites/{slug}{path}`
 * form — kept for places that don't yet have the manifest handy.
 *
 * @param slug     The site's slug (previously the "subdomain" field).
 * @param path     Optional path underneath the site (e.g. "/rsvp", "/photos").
 * @param origin   Optional explicit origin override (for email templates
 *                 that must emit absolute URLs from server-side code).
 * @param occasion Optional occasion prefix (wedding, birthday, etc.).
 */
export function buildSiteUrl(
  slug: string,
  path: string = '',
  origin?: string,
  occasion?: string,
): string {
  const base = origin ?? getAppOrigin();
  const s = cleanSegment(slug);
  const p = cleanSubPath(path);
  if (occasion) {
    const occ = normalizeOccasion(occasion);
    return `${base}/${occ}/${s}${p}`;
  }
  return `${base}/sites/${s}${p}`;
}

/**
 * Build the path (no origin) to a published site. Useful for Next.js
 * <Link>, router.push(), and places where a relative URL is preferred.
 */
export function buildSitePath(
  slug: string,
  path: string = '',
  occasion?: string,
): string {
  const s = cleanSegment(slug);
  const p = cleanSubPath(path);
  if (occasion) {
    const occ = normalizeOccasion(occasion);
    return `/${occ}/${s}${p}`;
  }
  return `/sites/${s}${p}`;
}

/**
 * Pretty host+path string for display only (no scheme). Example:
 *   "pearloom.com/wedding/jordan-alex"
 * Use this in "Your site is live at …" UI, copy buttons, etc.
 */
export function formatSiteDisplayUrl(
  slug: string,
  path: string = '',
  occasion?: string,
): string {
  const origin = getAppOrigin();
  const host = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const s = cleanSegment(slug);
  const p = cleanSubPath(path);
  if (occasion) {
    const occ = normalizeOccasion(occasion);
    return `${host}/${occ}/${s}${p}`;
  }
  return `${host}/sites/${s}${p}`;
}
