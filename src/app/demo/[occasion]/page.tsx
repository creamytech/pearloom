// The demo orchard (PERSONA-PLAN S9) — one seeded, published-
// quality world per persona occasion at /demo/{occasion}, for
// testers, moderated sessions, and the landing's occasion doors.
// The wedding demo lives at /demo (Elena & Theo); /demo/wedding
// redirects there. Unknown occasions 404.

import { notFound, redirect } from 'next/navigation';
import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';
import { occasionDemoFor } from '@/lib/demo-occasions';

export const dynamic = 'force-dynamic';

export default async function OccasionDemoPage({
  params,
}: {
  params: Promise<{ occasion: string }>;
}) {
  const { occasion } = await params;
  if (occasion === 'wedding') redirect('/demo');
  const demo = occasionDemoFor(occasion);
  if (!demo) notFound();
  return (
    <PublishedSiteShell
      manifest={demo.manifest}
      names={demo.names}
      siteSlug={`demo-${demo.slug}`}
      prettyUrl={`pearloom.com/demo/${demo.slug}`}
    />
  );
}
