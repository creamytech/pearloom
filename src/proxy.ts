// ─────────────────────────────────────────────────────────────
// Pearloom / src/proxy.ts  (Next.js 16 Proxy — formerly middleware)
//
// 1. Security headers on ALL responses
// 2. Subdomain routing: {slug}.pearloom.com  →  /sites/{slug}
//
// Root domain is resolved from NEXT_PUBLIC_ROOT_DOMAIN or
// NEXT_PUBLIC_SITE_URL so this works on any deployment.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAllOccasionIds } from '@/lib/event-os/event-types';

// ── Security headers ────────────────────────────────────────

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://maps.google.com https://www.google.com https://open.spotify.com https://player.vimeo.com https://www.youtube.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src 'self' https://maps.google.com https://www.google.com https://open.spotify.com https://player.vimeo.com https://www.youtube.com https://js.stripe.com",
  "connect-src 'self' https: wss:",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Apply security headers to the given response.
 * Skips X-Frame-Options on /preview routes (they render in iframes).
 */
function applySecurityHeaders(response: NextResponse, pathname: string): void {
  response.headers.set('Content-Security-Policy', CSP_HEADER);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // Allow same-origin iframing for editor preview & builder. Published sites
  // and dashboard pages use SAMEORIGIN so the v8 Builder iframe can load
  // `/sites/{slug}` and `/dev/site` from inside `/editor/{slug}`.
  if (!pathname.startsWith('/preview')) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }

  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }
}

// ── Subdomain routing helpers ───────────────────────────────

// Derive the root domain from env vars at request time.
// e.g. NEXT_PUBLIC_SITE_URL="https://pearloom.com" → "pearloom.com"
function getRootDomain(): string {
  const explicit = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (explicit) return explicit.replace(/^www\./, '').toLowerCase();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      return new URL(siteUrl).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      // fall through
    }
  }
  return 'pearloom.com'; // safe default
}

// ── Occasion-based canonical URLs ───────────────────────────
//
// Published sites now live at `/{occasion}/{slug}` (Zola-style).
// For example: pearloom.com/wedding/scott, pearloom.com/birthday/ana.
//
// We keep the internal route tree rooted at `/sites/{slug}` and
// simply REWRITE (not redirect) from the occasion-prefixed URL
// so the browser bar shows the pretty path while the existing
// SiteRenderer logic at /sites/[domain] does the actual work.
//
// The legacy `/sites/{slug}` URL is preserved as a permanent
// fallback for already-shared links.
// Occasion allowlist for the URL rewrite. Sourced from the
// EVENT_TYPES registry (imported at top) so adding a new event
// type anywhere auto-propagates here — no manual sync.
const OCCASION_SEGMENTS = new Set<string>(getAllOccasionIds());

// ── Proxy entry point ───────────────────────────────────────

// Routes that require authentication. Migrated from
// (shell)/layout.tsx so the layout can drop force-dynamic and
// children can be statically prerendered — eliminates the SSR
// roundtrip per tab swap that was reading as a "fade".
const AUTH_REQUIRED_PREFIXES = [
  '/dashboard',
  '/templates',
  '/vendors',
];

export async function proxy(req: NextRequest) {
  const rawHost = req.headers.get('host') || '';
  const hostname = rawHost.toLowerCase();
  const pathname = req.nextUrl.pathname;

  // ── Auth gate for shell routes ─────────────────────────────
  // Runs as a middleware-style check before any rewrite logic.
  // Redirects unauthenticated users to /login with a `next` param
  // so they bounce back after sign-in. Only runs for prefixes
  // listed in AUTH_REQUIRED_PREFIXES so public routes stay open.
  if (AUTH_REQUIRED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    try {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (!token?.email) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      // If auth check fails for any reason, fall through to normal
      // handling rather than blocking the request — the layout's
      // own auth check (still in place during transition) will
      // catch it.
    }
  }

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

  // Helper: create a NextResponse.next() with security headers applied.
  function next(): NextResponse {
    const res = NextResponse.next();
    applySecurityHeaders(res, pathname);
    return res;
  }

  // Helper: create a NextResponse.rewrite() with security headers applied.
  function rewrite(destination: URL): NextResponse {
    const res = NextResponse.rewrite(destination);
    applySecurityHeaders(res, pathname);
    return res;
  }

  // ── Occasion-based URL rewrite ─────────────────────────────
  // `/wedding/scott` → `/sites/scott` (URL bar stays on the pretty path).
  // Only rewrites when the first segment is a known occasion so we
  // don't collide with /dashboard, /editor, /api, /preview, etc.
  {
    const occMatch = pathname.match(/^\/([^/]+)\/([^/]+)(\/.*)?$/);
    if (occMatch && OCCASION_SEGMENTS.has(occMatch[1])) {
      const slug = occMatch[2];
      const rest = occMatch[3] ?? '';
      const dest = `/sites/${slug}${rest}${searchParams ? `?${searchParams}` : ''}`;
      return rewrite(new URL(dest, req.url));
    }
  }

  // ── Localhost dev: rewrite subdomain.localhost:PORT → treat as subdomain.rootDomain ──
  const localhostMatch = hostname.match(/^(.+)\.localhost(:\d+)?$/);
  if (localhostMatch) {
    const subdomain = localhostMatch[1];
    // Don't rewrite _next internals or API routes
    if (path.startsWith('/_next') || path.startsWith('/api') || path.startsWith('/sites')) {
      return next();
    }
    return rewrite(new URL(`/sites/${subdomain}${path}`, req.url));
  }

  // ── Vercel preview deployments: path-based routing already works, skip subdomain logic ──
  if (hostname.includes('.vercel.app')) {
    return next();
  }

  const rootDomain = getRootDomain();
  // Strip port for comparison
  const cleanHost = hostname.replace(/:\d+$/, '');

  // Pass through the apex domain and www — these serve the main app
  if (cleanHost === rootDomain || cleanHost === `www.${rootDomain}`) {
    return next();
  }

  // Only act on *.rootDomain subdomains
  if (!cleanHost.endsWith(`.${rootDomain}`)) {
    return next();
  }

  const subdomain = cleanHost.slice(0, cleanHost.length - rootDomain.length - 1);

  // Skip internal/static paths even on subdomain hosts
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/') ||
    path.startsWith('/sites/') ||
    path === '/favicon.ico' ||
    path === '/robots.txt' ||
    path === '/sitemap.xml'
  ) {
    return next();
  }

  // Rewrite to /sites/{subdomain}{path}
  const rewritePath = path === '/' ? `/sites/${subdomain}` : `/sites/${subdomain}${path}`;
  return rewrite(new URL(rewritePath, req.url));
}

// ── Route matcher ───────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
