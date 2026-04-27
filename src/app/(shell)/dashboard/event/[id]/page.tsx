// ─────────────────────────────────────────────────────────────
// /dashboard/event/[id] — per-site Event HQ (Wave C).
// Server shell that fetches site summary, then mounts the
// client-side EventHQ panel.
// ─────────────────────────────────────────────────────────────


import type { Metadata } from 'next';
import EventPageClient from './EventPageClient';

export const metadata: Metadata = {
  title: 'Event HQ | Pearloom',
  description: 'Calm mission control for your event.',
};

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventPageClient siteId={id} />;
}
