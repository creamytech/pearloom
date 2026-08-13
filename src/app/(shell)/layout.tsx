// ─────────────────────────────────────────────────────────────
// Pearloom / app/(shell)/layout.tsx
//
// Shared shell for the dashboard, templates, and vendors routes.
// Renders the DashSidebar + main wrapper PERSISTENTLY across all
// child route navigations — when you click between tabs, only the
// inner content re-renders. The sidebar stays mounted, no flash.
//
// Auth is now enforced in src/proxy.ts (middleware) so this layout
// can render statically. That eliminates the per-tab SSR roundtrip
// that was reading as a 'fade' — pages now serve from prerendered
// HTML and hydrate client-side instantly.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import type { Metadata } from 'next';

/* The dashboard is private — robots.ts already disallows the crawl;
   this meta noindex is the belt-and-braces for any externally
   linked URL a crawler reaches anyway. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listSitesForEmail } from '@/lib/sites-list';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { SitesHydrator } from '@/components/marketing/design/dash/SitesHydrator';
import type { ApiSiteRow } from '@/components/marketing/design/dash/hooks';

// Opt every (shell) route out of static prerendering. The sidebar
// site picker uses useSearchParams() internally; without dynamic
// rendering, Next 16 requires a Suspense boundary on every page
// that descendants might call useSearchParams from. Marking the
// layout dynamic is the single switch that keeps the picker
// working everywhere without per-page boundaries.
export const dynamic = 'force-dynamic';

export default async function ShellLayout({ children }: { children: ReactNode }) {
  // Server-side seed: run the SAME sites query the client would fire
  // after hydration and hand it to the cache hydrator, so the host's
  // event is in the very first paint ("5 seconds to show my event",
  // 2026-07-08). Layouts render once per hard load — tab navigation
  // inside the shell never re-runs this. Best-effort: any failure
  // just falls back to the old client-side fetch.
  let seed: ApiSiteRow[] | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      seed = (await listSitesForEmail(session.user.email)) as unknown as ApiSiteRow[];
    }
  } catch (err) {
    console.warn('[shell] sites seed failed (falling back to client fetch):', err);
  }
  return (
    <ShellPersistentLayout>
      {/* Seed on success — including the genuinely-empty list (new
          accounts skip the client refetch too). null = query failed;
          no hydrator, the client fetch path retries. */}
      {seed !== null && <SitesHydrator sites={seed} />}
      {children}
    </ShellPersistentLayout>
  );
}
