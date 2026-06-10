// The public showcase site — a real, fully-rendered Pearloom site
// (Elena & Theo's Santorini wedding) served in production.
// Marketing's "Read a real site" and "See act … in motion" CTAs
// land here. Previously redirected to /dev/site, which 404s in
// production — the demo path was dead on the live site.
// The manifest exercises every core section + the optional
// countdown / map / music blocks — see src/lib/demo-manifest.ts.

import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';
import { DEMO_MANIFEST, DEMO_NAMES } from '@/lib/demo-manifest';

export const dynamic = 'force-dynamic';

export default function DemoSite() {
  return (
    <PublishedSiteShell
      manifest={DEMO_MANIFEST}
      names={DEMO_NAMES}
      siteSlug="demo"
      prettyUrl="pearloom.com/demo"
    />
  );
}
