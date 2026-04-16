export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { DirectorClient } from './DirectorClient';

export const metadata: Metadata = {
  title: 'Event Director | Pearloom',
  description: 'Your AI event planner. Budget, vendors, timeline, checklist — all in one conversation.',
};

export default function DirectorPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  return <DirectorEntry searchParams={searchParams} />;
}

async function DirectorEntry({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const { site } = await searchParams;
  return <DirectorClient siteId={site ?? ''} />;
}
