// ─────────────────────────────────────────────────────────────
// Pearloom / api/guest-photos/moderate/route.ts
// Couple-only endpoint to approve or reject guest photos.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { moderateGuestPhoto } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json() as { photoId?: string; action?: string };
    const { photoId, action } = body;

    if (!photoId) {
      return NextResponse.json({ error: 'photoId is required' }, { status: 400 });
    }
    if (action !== 'approved' && action !== 'rejected') {
      return NextResponse.json({ error: 'action must be "approved" or "rejected"' }, { status: 400 });
    }

    await moderateGuestPhoto(photoId, action);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[guest-photos/moderate] Unexpected error:', err);
    return NextResponse.json({ error: 'Moderation failed' }, { status: 500 });
  }
}
