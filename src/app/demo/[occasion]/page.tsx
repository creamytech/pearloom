// The demo orchard (PERSONA-PLAN S9) — one seeded, published-
// quality world per persona occasion at /demo/{occasion}, for
// testers, moderated sessions, and the landing's occasion doors.
// The wedding demo lives at /demo (Elena & Theo); /demo/wedding
// redirects there. Unknown occasions 404.

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';
import { occasionDemoFor } from '@/lib/demo-occasions';
import { getEventType } from '@/lib/event-os/event-types';

export const dynamic = 'force-dynamic';

/* Per-occasion titles — these pages ARE the long-tail landing
   surfaces ("birthday website example", "quinceañera site"). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ occasion: string }>;
}): Promise<Metadata> {
  const { occasion } = await params;
  const demo = occasionDemoFor(occasion);
  if (!demo) return {};
  const label = (getEventType(occasion)?.label ?? occasion).split(' / ')[0].toLowerCase();
  return {
    title: `A ${label} site, fully woven · Pearloom demo`,
    description: `Walk through a real Pearloom ${label} site — the arrival, the story, the schedule, the RSVP — exactly as guests would see it.`,
    alternates: { canonical: `/demo/${occasion}` },
  };
}

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
