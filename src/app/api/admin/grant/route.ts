// ─────────────────────────────────────────────────────────────
// POST /api/admin/grant
//
// The comp desk's write path. Admin-gated (lib/admin.ts; 404
// for everyone else). Actions:
//
//   { email, action: 'set-plan',   plan: 'free'|'pro'|'premium' }
//   { email, action: 'grant-pack', packId }
//   { email, action: 'grant-all-packs' }
//
// Plan grants write public.user_plans via updateUserPlan with
// null Stripe ids — the billing webhook only ever overwrites a
// row when a REAL subscription event arrives, so a comped plan
// survives until either an admin changes it or the user buys.
//
// Pack grants reuse addEntitlement with a synthetic charge id
// of the form `admin:<admin-email>:<timestamp>` — auditable in
// the theme_pack_purchases table, idempotent per grant call,
// and rendered as "source" in the admin lookup.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { updateUserPlan, getUserPlan } from '@/lib/db';
import { addEntitlement } from '@/lib/theme-store/entitlements';
import { PACKS, getPackById } from '@/lib/theme-store/packs';

export const dynamic = 'force-dynamic';

// Canonical plan ids accepted on the wire. Aliases map onto the
// canonical names plan-gate.ts ranks ('free' | 'pro' | 'premium').
const PLAN_ALIAS: Record<string, 'free' | 'pro' | 'premium'> = {
  free: 'free',
  journal: 'free',
  pro: 'pro',
  atelier: 'pro',
  premium: 'premium',
  legacy: 'premium',
};

interface GrantBody {
  email?: string;
  action?: 'set-plan' | 'grant-pack' | 'grant-all-packs';
  plan?: string;
  packId?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const adminEmail = session?.user?.email;
  if (!isAdmin(adminEmail)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: GrantBody;
  try {
    body = (await req.json()) as GrantBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Provide a user email' }, { status: 400 });
  }

  try {
    switch (body.action) {
      case 'set-plan': {
        const plan = PLAN_ALIAS[(body.plan ?? '').toLowerCase()];
        if (!plan) {
          return NextResponse.json(
            { error: "plan must be one of free/journal, pro/atelier, premium/legacy" },
            { status: 400 },
          );
        }
        // Preserve any real Stripe linkage the row already carries —
        // a comp on top of a paying customer shouldn't orphan their
        // subscription ids.
        const existing = await getUserPlan(email);
        await updateUserPlan(email, {
          plan,
          stripeCustomerId: existing?.stripeCustomerId ?? null,
          stripeSubscriptionId: existing?.stripeSubscriptionId ?? null,
        });
        console.log(`[admin/grant] ${adminEmail} set plan=${plan} for ${email}`);
        return NextResponse.json({ ok: true, email, plan });
      }

      case 'grant-pack': {
        const pack = body.packId ? getPackById(body.packId) : undefined;
        if (!pack) {
          return NextResponse.json({ error: `Unknown packId "${body.packId ?? ''}"` }, { status: 400 });
        }
        await addEntitlement(email, pack.id, `admin:${adminEmail}:${Date.now()}`, 0);
        console.log(`[admin/grant] ${adminEmail} granted pack=${pack.id} to ${email}`);
        return NextResponse.json({ ok: true, email, packId: pack.id });
      }

      case 'grant-all-packs': {
        const paid = PACKS.filter((p) => p.tier !== 'free');
        const stamp = Date.now();
        for (const pack of paid) {
          // Sequential on purpose — 60-odd upserts, and Supabase
          // connection limits beat a marginal latency win.
          await addEntitlement(email, pack.id, `admin:${adminEmail}:${stamp}:${pack.id}`, 0);
        }
        console.log(`[admin/grant] ${adminEmail} granted ALL ${paid.length} paid packs to ${email}`);
        return NextResponse.json({ ok: true, email, granted: paid.length });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[admin/grant] failed:', err);
    return NextResponse.json({ error: 'Grant failed — is the database reachable?' }, { status: 500 });
  }
}
