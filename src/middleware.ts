import { NextRequest, NextResponse } from 'next/server';

/**
 * Subdomain routing middleware.
 * Rewrites requests to *.pearloom.com subdomains to /sites/[subdomain]
 * so the dynamic route handler can serve the site.
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Only handle production subdomains (not localhost, not the main domain)
  const mainDomains = ['pearloom.com', 'www.pearloom.com', 'localhost', '127.0.0.1'];
  const isMainDomain = mainDomains.some(d => hostname === d || hostname.startsWith(`${d}:`));

  if (isMainDomain) {
    return NextResponse.next();
  }

  // Extract subdomain: "scott-gew8.pearloom.com" → "scott-gew8"
  const subdomain = hostname.split('.')[0];

  // Skip API routes, _next assets, and static files
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.includes('.')  // file extensions (favicon.ico, robots.txt, etc.)
  ) {
    return NextResponse.next();
  }

  // Rewrite to the dynamic site route
  url.pathname = `/sites/${subdomain}${url.pathname === '/' ? '' : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Match all paths except _next, api, and static files
    '/((?!_next|api|static|.*\\..*).*)',
  ],
};
