// The public showcase site — a real, fully-rendered Pearloom site
// (Elena & Theo's Santorini wedding) served in production.
// Marketing's "Read a real site" and "See act … in motion" CTAs
// land here. Previously redirected to /dev/site, which 404s in
// production — the demo path was dead on the live site.
//
// DemoClient wraps the published-site shell with "Try the loom" —
// a floating panel of the real look dials (motif / placement /
// divider / pattern / texture / intensity sliders) so visitors
// can restyle the demo live and see how a woven site actually
// works. The manifest exercises every core section + the optional
// countdown / map / music blocks — see src/lib/demo-manifest.ts.

import DemoClient from './DemoClient';

export const dynamic = 'force-dynamic';

export default function DemoSite() {
  return <DemoClient />;
}
