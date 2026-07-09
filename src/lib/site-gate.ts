// ─────────────────────────────────────────────────────────────
// Pearloom / src/lib/site-gate.ts
//
// Pre-launch access wall. The general public sees ONLY the
// marketing landing page (apex "/"). Everything else — login,
// signup, dashboard, wizard, editor, published sites, guest
// passports — sits behind a shared preview password entered once
// at /gate and remembered in an httpOnly cookie.
//
// SERVER-ONLY. Imported by src/proxy.ts and /api/gate. Never import
// this from a client component — it would leak GATE_PASSWORD /
// GATE_TOKEN into the browser bundle.
//
// Lift the wall for launch by setting SITE_GATE_ENABLED=false (or
// change the word with SITE_GATE_PASSWORD).
// ─────────────────────────────────────────────────────────────

/** Cookie that proves the preview password was entered. */
export const GATE_COOKIE = 'pl-gate';

/** The shared preview password. Override in prod via env. */
export const GATE_PASSWORD = process.env.SITE_GATE_PASSWORD ?? 'pearloomtester';

/** Master switch. Set SITE_GATE_ENABLED=false to lift the wall. */
export const GATE_ENABLED = process.env.SITE_GATE_ENABLED !== 'false';

// Deterministic, non-reversible token derived from the password so
// the cookie never stores the plaintext and the proxy can compare
// it synchronously (no async crypto in the hot request path). FNV-1a.
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const GATE_SECRET = process.env.NEXTAUTH_SECRET ?? 'pl-preview-gate';

/** The value the cookie must hold to pass the wall. */
export const GATE_TOKEN = `v1.${fnv1a(`${GATE_PASSWORD}::${GATE_SECRET}`)}`;

// Static asset / metadata routes that must stay reachable so the
// landing page renders and crawlers work. (Image files, _next/static
// and _next/image are already excluded by the proxy matcher.)
const ASSET_PATHS = new Set([
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
]);

/** Paths that must never be gated (framework internals, APIs, assets). */
export function isGateExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/_vercel/') ||
    pathname.startsWith('/api/') ||
    ASSET_PATHS.has(pathname)
  );
}
