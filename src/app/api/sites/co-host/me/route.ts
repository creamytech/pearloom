// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/co-host/me/route.ts
//
// Returns the current viewer's role for the given site.
// Responses: { role: 'owner' | 'editor' | 'guest-manager' |
// 'viewer' | null }. Used by the editor to gate publish /
// delete / billing / settings actions.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveViewerRole } from '@/lib/cohost-access';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ role: null });
  }
  // Normalise once — IdP casing variance, see /api/sites/[domain].
  const email = session.user.email.toLowerCase().trim();
  const siteId = req.nextUrl.searchParams.get('siteId');
  const subdomain = req.nextUrl.searchParams.get('subdomain');
  if (!siteId && !subdomain) {
    return NextResponse.json({ error: 'siteId or subdomain required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const access = await resolveViewerRole(supabase, { siteId, subdomain }, email);
  if (!access.siteId) return NextResponse.json({ role: null });
  return NextResponse.json({ role: access.role, siteId: access.siteId });
}
