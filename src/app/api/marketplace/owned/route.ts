// ─────────────────────────────────────────────────────────────
// Pearloom / api/marketplace/owned/route.ts
// Returns all marketplace item IDs owned by the current user.
// GET /api/marketplace/owned
// Returns: { ownedItems: string[] }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getUserPurchases } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    // 2. Rate limit — 60 reads per minute per user
    const rateCheck = checkRateLimit(`marketplace-owned:${userEmail}`, {
      max: 60,
      windowMs: 60 * 1000,
    });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    // 3. Fetch owned items
    const ownedItems = await getUserPurchases(userEmail);

    return NextResponse.json({ ownedItems });
  } catch (err: unknown) {
    console.error('[Marketplace] Owned items error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
