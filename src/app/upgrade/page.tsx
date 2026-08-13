// ─────────────────────────────────────────────────────────────
// Pearloom / app/upgrade/page.tsx
//
// THE ONE UPGRADE DOOR (M.2 — NEW-USER-REVAMP L37). Before this
// route, no upgrade affordance actually reached the till: the
// landing's "Choose Pass" dropped the plan intent into /wizard/new,
// and the 402s' upgradeUrl pointed at /dashboard?upgrade=true —
// a query param nothing read. Now every money door lands here:
// the landing cards (?plan=), the 402 bodies (?from=<feature>),
// and anything else that wants to sell an upgrade.
//
// Signed-out visitors go through /login with this page (intent
// included) as the return path — plan intent survives auth.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import {
  getPlanWithLimitsForEmail,
  canonicalPlan,
  planMarketingLabel,
} from '@/lib/plan-gate';
import { UpgradeClient } from './UpgradeClient';

export const metadata: Metadata = {
  title: 'Upgrade · Pearloom',
  description:
    'One-time plans — the Pass for the whole weekend, the Keepsake for every limit removed. Never a subscription.',
};

export const dynamic = 'force-dynamic';

/** The 402 bodies send ?from=<feature> (plan-gate's
 *  planLimitResponseBody). One sentence naming the limit the host
 *  just met, in their plan's real numbers — never a generic nag. */
function fromLineFor(
  from: string | undefined,
  label: string,
  limits: { maxSites: number; maxGuests: number; maxPhotos: number; maxCoHosts: number },
): string | null {
  switch (from) {
    case 'sites':
      return `Your ${label} plan includes ${limits.maxSites} sites, and all ${limits.maxSites} are in use — the next celebration needs more room.`;
    case 'guests':
      return `Your ${label} plan includes up to ${limits.maxGuests} guests per celebration, and your list has reached it.`;
    case 'photos':
      return `Your ${label} plan includes ${limits.maxPhotos} photos, and your gallery has reached it.`;
    case 'co-hosts':
      return `Your ${label} plan includes ${limits.maxCoHosts} co-host${limits.maxCoHosts === 1 ? '' : 's'} — the next invitation needs more seats.`;
    default:
      return null;
  }
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; from?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    // Carry the intent through the door, not into the void — the
    // login page returns the host here with ?plan/?from intact.
    const qs = new URLSearchParams();
    if (params.plan) qs.set('plan', params.plan);
    if (params.from) qs.set('from', params.from);
    const query = qs.toString();
    const target = query ? `/upgrade?${query}` : '/upgrade';
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  const { plan, limits } = await getPlanWithLimitsForEmail(session.user.email);
  const currentPlan = canonicalPlan(plan);
  const label = planMarketingLabel(plan);

  const intent =
    params.plan === 'pass' || params.plan === 'keepsake' ? params.plan : null;
  // A host who already met a limit on THEIR plan gets the sentence
  // in their numbers; someone browsing gets none.
  const fromLine =
    currentPlan === 'premium' ? null : fromLineFor(params.from, label, limits);

  return <UpgradeClient currentPlan={currentPlan} intent={intent} fromLine={fromLine} />;
}
