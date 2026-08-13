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
import { createClient } from '@supabase/supabase-js';
import { getUserEntitlements } from '@/lib/theme-store/entitlements';
import { FREE_PACK_IDS } from '@/lib/theme-store/packs';
import { getPlanWithLimitsForEmail, canonicalPlan, planMarketingLabel, isGriefExempt } from '@/lib/plan-gate';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Sites headroom for the signed-in host — the SAME count the
 *  create gate in /api/sites runs at press time (non-grief-exempt
 *  sites on the indexed creator_email column), surfaced up front
 *  so the wizard can say "you're at your plan's limit" at step 1
 *  instead of after all nine steps. Null on any failure — the
 *  client treats null as "don't warn", never as "block". */
async function sitesHeadroom(email: string, maxSites: number) {
  const db = getSupabase();
  if (!db) return null;
  const { data: ownedRows, error } = await db
    .from('sites')
    .select('occasion:ai_manifest->>occasion, configOccasion:site_config->>occasion')
    .eq('creator_email', email);
  if (error || !ownedRows) return null;
  const count = ownedRows.filter((r: { occasion?: string | null; configOccasion?: string | null }) =>
    !isGriefExempt(r.occasion ?? r.configOccasion)).length;
  return {
    count,
    max: Number.isFinite(maxSites) ? maxSites : null,
    atLimit: Number.isFinite(maxSites) && count >= maxSites,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const entitlements = await getUserEntitlements(userEmail);
    const ownedPackIds = Array.from(new Set(entitlements.map((e) => e.packId)));
    const { plan, limits } = await getPlanWithLimitsForEmail(userEmail);
    const sites = await sitesHeadroom(userEmail.toLowerCase().trim(), limits.maxSites);

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
      // Sites headroom (count / max / atLimit) — the wizard reads
      // this at mount so a host at their limit learns BEFORE the
      // nine steps, not at the press. Null when unknowable.
      sites,
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
      planLabel: 'Page',
      sites: null,
      degraded: true,
    });
  }
}
