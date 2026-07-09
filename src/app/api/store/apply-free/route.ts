// ──────────────────────────────────────────────────────────────
// POST /api/store/apply-free
//
// Body: { packId: string }
//
// Free-tier packs don't go through Stripe — they're owned
// implicitly by every signed-in user (see FREE_PACK_IDS in
// theme-store/packs.ts). This route exists for the rare case
// where we want to write a real row for a free pack — for
// example, to stamp `purchased_at` so the dashboard can show
// "added 2 days ago" instead of "free tier".
//
// In practice useEntitlements() folds free packs in regardless,
// so calling this is optional. Returns 200 either way.
//
// Auth-gate; refuses to write rows for non-free packs (those
// MUST go through Stripe Checkout).
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getPackById } from '@/lib/theme-store/packs';
import { addEntitlement, userOwnsPack } from '@/lib/theme-store/entitlements';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'Sign in to apply packs.' }, { status: 401 });
    }

    const limit = checkRateLimit(`store-apply-free:${userEmail}`, {
      max: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const packId: unknown = body?.packId;
    if (typeof packId !== 'string' || !packId.trim()) {
      return NextResponse.json({ error: 'packId is required' }, { status: 400 });
    }

    const pack = getPackById(packId);
    if (!pack) {
      return NextResponse.json({ error: 'Unknown pack.' }, { status: 404 });
    }
    if (pack.tier !== 'free') {
      return NextResponse.json(
        { error: 'Paid packs must go through checkout.' },
        { status: 400 },
      );
    }

    // Free packs are implicitly owned. If the user already has a
    // row (or implicit ownership), short-circuit success — no DB
    // write needed.
    const alreadyOwned = await userOwnsPack(userEmail, packId);
    if (alreadyOwned) {
      return NextResponse.json({ ok: true, packId, alreadyOwned: true });
    }

    // Stamp a synthetic session id so addEntitlement's upsert key
    // stays unique without colliding with real Stripe rows.
    const syntheticSessionId = `free:${userEmail}:${packId}`;
    await addEntitlement(userEmail, packId, syntheticSessionId, 0);

    return NextResponse.json({ ok: true, packId });
  } catch (err) {
    console.error('[api/store/apply-free] error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
