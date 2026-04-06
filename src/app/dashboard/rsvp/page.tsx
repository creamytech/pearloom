// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/rsvp/page.tsx
// RSVP Guest Dashboard — server component, auth-guarded
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'RSVP Dashboard | Pearloom',
  description: 'View and manage your guest RSVPs.',
};
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RsvpDashboard } from '@/components/dashboard/RsvpDashboard';

interface RsvpStats {
  attending: number;
  confirmed: number;
  declined: number;
  pending: number;
  total: number;
}

interface Guest {
  id: string;
  name: string;
  email?: string;
  status: 'attending' | 'declined' | 'pending';
  plusOne: boolean;
  plusOneName?: string;
  mealPreference?: string;
  dietaryRestrictions?: string;
  message?: string;
  respondedAt?: string;
}

async function fetchRsvpData(siteId: string): Promise<{ stats: RsvpStats; guests: Guest[] }> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const [statsRes, guestsRes] = await Promise.allSettled([
    fetch(`${baseUrl}/api/rsvp-stats?siteId=${siteId}`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/guests?siteId=${siteId}`, { cache: 'no-store' }),
  ]);

  const stats: RsvpStats =
    statsRes.status === 'fulfilled' && statsRes.value.ok
      ? await statsRes.value.json()
      : { attending: 0, confirmed: 0, declined: 0, pending: 0, total: 0 };

  const guestsData =
    guestsRes.status === 'fulfilled' && guestsRes.value.ok
      ? await guestsRes.value.json()
      : { guests: [] };

  return { stats, guests: guestsData.guests || [] };
}

export default async function RsvpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/login');
  }

  const params = await searchParams;
  const siteId = params.siteId || '';

  // If no siteId, try fetching the user's first site
  let resolvedSiteId = siteId;
  if (!resolvedSiteId) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const sitesRes = await fetch(`${baseUrl}/api/sites`, { cache: 'no-store' });
      if (sitesRes.ok) {
        const sitesData = await sitesRes.json();
        resolvedSiteId = sitesData.sites?.[0]?.id || '';
      }
    } catch {
      // fall through with empty siteId
    }
  }

  const { stats, guests } = resolvedSiteId
    ? await fetchRsvpData(resolvedSiteId)
    : {
        stats: { attending: 0, confirmed: 0, declined: 0, pending: 0, total: 0 },
        guests: [],
      };

  return (
    <RsvpDashboard
      siteId={resolvedSiteId}
      initialStats={stats}
      initialGuests={guests}
      userEmail={session.user.email}
    />
  );
}
