// ──────────────────────────────────────────────────────────────
// GET /api/store/entitlements
//
// Returns the signed-in user's owned pack ids (real Stripe
// purchases + the catalog's free tier folded in via
// getUserEntitlements).
//
// Shape: { ok: true, packIds: string[] }
//
// useEntitlements() on the client reads this and degrades to
// free-only ownership on 401/404/network, so this route is
// safe to ship before every pack card consumes it.
// ──────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserEntitlements } from '@/lib/theme-store/entitlements';
import { FREE_PACK_IDS } from '@/lib/theme-store/packs';
import { getPlanWithLimitsForEmail, canonicalPlan, planMarketingLabel } from '@/lib/plan-gate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const entitlements = await getUserEntitlements(userEmail);
    const ownedPackIds = Array.from(new Set(entitlements.map((e) => e.packId)));
    const { plan } = await getPlanWithLimitsForEmail(userEmail);

    return NextResponse.json({
      ok: true,
      packIds: ownedPackIds,
      // Surface the free-tier list separately so clients can
      // distinguish implicit ownership from real purchases
      // without re-deriving from the catalog.
      freePackIds: FREE_PACK_IDS,
      // Plan for host-facing chrome (sidebar strip, settings
      // badge). `plan` is canonical (free/pro/premium); the
      // label is the marketed name (Journal/Atelier/Legacy).
      plan: canonicalPlan(plan),
      planLabel: planMarketingLabel(plan),
    });
  } catch (err) {
    console.error('[api/store/entitlements] error:', err);
    // Degrade to free-only so the store stays usable even when
    // the DB is unreachable.
    return NextResponse.json({
      ok: true,
      packIds: FREE_PACK_IDS,
      freePackIds: FREE_PACK_IDS,
      plan: 'free',
      planLabel: 'Journal',
      degraded: true,
    });
  }
}
