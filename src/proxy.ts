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

// ── Security headers ────────────────────────────────────────

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://maps.google.com https://www.google.com https://open.spotify.com https://player.vimeo.com https://www.youtube.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src https://maps.google.com https://www.google.com https://open.spotify.com https://player.vimeo.com https://www.youtube.com https://js.stripe.com",
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

  // Skip X-Frame-Options for /preview routes — they render inside iframes
  if (!pathname.startsWith('/preview')) {
    response.headers.set('X-Frame-Options', 'DENY');
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

// ── Proxy entry point ───────────────────────────────────────

export function proxy(req: NextRequest) {
  const rawHost = req.headers.get('host') || '';
  const hostname = rawHost.toLowerCase();
  const pathname = req.nextUrl.pathname;

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
