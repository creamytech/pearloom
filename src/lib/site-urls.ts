// ─────────────────────────────────────────────────────────────
// Pearloom / lib/site-urls.ts
//
// Single source of truth for building URLs to published sites.
//
// We publish on path-based URLs (`pearloom.com/sites/<slug>`)
// instead of subdomain-based (`<slug>.pearloom.com`) because:
//
//   1. One cookie jar / one analytics property
//   2. Cleaner link previews for non-technical guests
//   3. No wildcard DNS or SSL complexity
//   4. Custom domains map 1:1 to the path form
//
// The proxy in src/proxy.ts keeps rewriting legacy
// `<slug>.pearloom.com` → `/sites/<slug>` so old bookmarked
// links still work. But every NEW URL we print, share, copy,
// or embed in an email should go through these helpers.
// ─────────────────────────────────────────────────────────────

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

/**
 * Build the canonical public URL for a published site.
 *
 * @param slug     The site's slug (previously the "subdomain" field).
 * @param path     Optional path underneath the site (e.g. "/rsvp", "/photos").
 * @param origin   Optional explicit origin override (for email templates
 *                 that must emit absolute URLs from server-side code).
 */
export function buildSiteUrl(slug: string, path = '', origin?: string): string {
  const base = origin ?? getAppOrigin();
  const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${base}/sites/${cleanSlug}${cleanPath}`;
}

/**
 * Build the path (no origin) to a published site. Useful for Next.js
 * <Link>, router.push(), and places where a relative URL is preferred.
 */
export function buildSitePath(slug: string, path = ''): string {
  const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `/sites/${cleanSlug}${cleanPath}`;
}

/**
 * Pretty host+path string for display only (no scheme). Example:
 *   "pearloom.com/sites/jordan-alex"
 * Use this in "Your site is live at …" UI, copy buttons, etc.
 */
export function formatSiteDisplayUrl(slug: string, path = ''): string {
  const origin = getAppOrigin();
  let host = origin.replace(/^https?:\/\//, '');
  host = host.replace(/\/$/, '');
  const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${host}/sites/${cleanSlug}${cleanPath}`;
}
