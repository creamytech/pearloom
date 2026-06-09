// ─────────────────────────────────────────────────────────────
// GET /api/admin/users?email=<user>
//
// Admin lookup: a user's plan + theme-pack entitlements in one
// shot, for the /admin comp desk. Admin-gated via lib/admin.ts;
// non-admins get 404 (not 403) so the route doesn't advertise
// itself.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getUserPlan } from '@/lib/db';
import { getUserEntitlements } from '@/lib/theme-store/entitlements';
import { FREE_PACK_IDS } from '@/lib/theme-store/packs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const email = (req.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Provide ?email=' }, { status: 400 });
  }

  try {
    const [planRow, entitlements] = await Promise.all([
      getUserPlan(email),
      getUserEntitlements(email),
    ]);

    return NextResponse.json({
      ok: true,
      email,
      plan: planRow?.plan ?? 'free',
      stripeCustomerId: planRow?.stripeCustomerId ?? null,
      // Real purchases + admin grants only — implicit free/plan
      // ownership is noise on the comp desk.
      ownedPackIds: entitlements
        .filter((e) => e.purchasedAt !== null)
        .map((e) => ({ packId: e.packId, purchasedAt: e.purchasedAt, source: e.stripeChargeId ?? null })),
      freePackIds: FREE_PACK_IDS,
    });
  } catch (err) {
    console.error('[admin/users] lookup failed:', err);
    return NextResponse.json({ error: 'Lookup failed — is the database reachable?' }, { status: 500 });
  }
}
