import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|favicon.ico|[\\w-]+\\.\\w+).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // Get hostname of request (e.g. demo.pearloom.app, demo.localhost:3000)
  let hostname = req.headers.get("host")!;

  // Strip localhost specific configs
  if (hostname.includes("localhost")) {
    hostname = hostname.replace(".localhost:3000", ".pearloom.app");
    hostname = hostname.replace("localhost:3000", "pearloom.app");
  }

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  // If the host exactly matches our main domains, render the marketing page / dashboard normally
  if (
    hostname === "pearloom.app" ||
    hostname === "pearloom.com" ||
    hostname === "www.pearloom.com" ||
    hostname === "pearloom.vercel.app" ||
    hostname.endsWith(".vercel.app") // Treat all random Vercel preview deployments as the base App
  ) {
    return NextResponse.next();
  }

  // Define subdomain prefix (e.g. "ben-shauna")
  let currentHost;
  if (hostname.includes(".pearloom.app")) {
    currentHost = hostname.replace(".pearloom.app", "");
  } else if (hostname.includes(".localhost:3000")) {
    currentHost = hostname.replace(".localhost:3000", "");
  } else {
    // Fallback if parsing fails bizarrely
    currentHost = hostname;
  }

  // Render the custom multi-tenant site under /sites/[domain] natively
  return NextResponse.rewrite(new URL(`/sites/${currentHost}${path}`, req.url));
}
