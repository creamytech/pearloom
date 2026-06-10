// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/collab-token/route.ts
//
// GET ?subdomain= — returns the realtime collab channel name for
// a site the caller can access (owner or any cohost role).
//
// The channel name is an HMAC of the slug keyed on NEXTAUTH_SECRET,
// so it is unguessable from the public slug: presence + manifest
// broadcasts ride Supabase Realtime with the anon key, and the
// secret channel name is the access gate (only people who pass
// THIS route's role check ever learn it).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveViewerRole } from '@/lib/cohost-access';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const subdomain = req.nextUrl.searchParams.get('subdomain');
  if (!subdomain) {
    return NextResponse.json({ error: 'subdomain required' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Keyless deploys — collab quietly disabled, editor works solo.
    return NextResponse.json({ channel: null });
  }

  const supabase = createClient(url, key);
  const access = await resolveViewerRole(
    supabase,
    { subdomain },
    session.user.email,
  );
  if (!access.role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const secret = process.env.NEXTAUTH_SECRET || 'pearloom-collab';
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`collab:${subdomain}`)
    .digest('hex')
    .slice(0, 24);

  return NextResponse.json({
    channel: `editor-collab:${sig}`,
    role: access.role,
  });
}
