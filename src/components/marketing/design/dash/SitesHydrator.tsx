'use client';

/* ─── SitesHydrator — SSR seed for the dashboard sites cache ─────
   The (shell) layout runs listSitesForEmail on the server and hands
   the rows here; seeding the module cache during render means every
   useUserSites consumer finds the host's sites at mount — the event
   card paints with the page instead of after a hydrate → session →
   /api/sites round trip. Renders nothing. */

import { seedSitesCache, type ApiSiteRow } from './hooks';

export function SitesHydrator({ sites }: { sites: ApiSiteRow[] }) {
  // Render-time module-cache write, deliberately: it must land
  // before sibling consumers mount. Idempotent — a fresher client
  // cache wins inside seedSitesCache.
  seedSitesCache(sites);
  return null;
}
