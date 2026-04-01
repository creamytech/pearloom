// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/invite/accept/route.ts
// Accept a coordinator invite via token link (no auth required)
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { acceptSiteInvite } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST — accept invite
// Body: { token: string }
// No auth required (guest accepts via token link)
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json() as { token: string };

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const result = await acceptSiteInvite(token, '');

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      siteId: result.siteId,
      role: result.role,
      subdomain: result.subdomain,
      redirectTo: result.subdomain ? `https://pearloom.com/${result.subdomain}` : 'https://pearloom.com',
    });
  } catch (err) {
    console.error('[invite/accept POST] Error:', err);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
