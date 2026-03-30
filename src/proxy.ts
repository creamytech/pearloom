// ─────────────────────────────────────────────────────────────
// Pearloom / src/proxy.ts  (Next.js 16 Proxy — formerly middleware)
// Subdomain routing: {slug}.pearloom.com  →  /sites/{slug}
//
// Root domain is resolved from NEXT_PUBLIC_ROOT_DOMAIN or
// NEXT_PUBLIC_SITE_URL so this works on any deployment.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function proxy(req: NextRequest) {
  const rawHost = req.headers.get('host') || '';
  let hostname = rawHost.toLowerCase();

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${req.nextUrl.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

  // ── Localhost dev: rewrite subdomain.localhost:PORT → treat as subdomain.rootDomain ──
  const localhostMatch = hostname.match(/^(.+)\.localhost(:\d+)?$/);
  if (localhostMatch) {
    const subdomain = localhostMatch[1];
    // Don't rewrite _next internals or API routes
    if (path.startsWith('/_next') || path.startsWith('/api') || path.startsWith('/sites')) {
      return NextResponse.next();
    }
    return NextResponse.rewrite(new URL(`/sites/${subdomain}${path}`, req.url));
  }

  // ── Vercel preview deployments: path-based routing already works, skip subdomain logic ──
  if (hostname.includes('.vercel.app')) {
    return NextResponse.next();
  }

  const rootDomain = getRootDomain();
  // Strip port for comparison
  const cleanHost = hostname.replace(/:\d+$/, '');

  // Pass through the apex domain and www — these serve the main app
  if (cleanHost === rootDomain || cleanHost === `www.${rootDomain}`) {
    return NextResponse.next();
  }

  // Only act on *.rootDomain subdomains
  if (!cleanHost.endsWith(`.${rootDomain}`)) {
    return NextResponse.next();
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
    return NextResponse.next();
  }

  // Rewrite to /sites/{subdomain}{path}
  const rewritePath = path === '/' ? `/sites/${subdomain}` : `/sites/${subdomain}${path}`;
  return NextResponse.rewrite(new URL(rewritePath, req.url));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
};
