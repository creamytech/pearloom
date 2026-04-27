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
  const email = session.user.email;
  const siteId = req.nextUrl.searchParams.get('siteId');
  const subdomain = req.nextUrl.searchParams.get('subdomain');
  if (!siteId && !subdomain) {
    return NextResponse.json({ error: 'siteId or subdomain required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: site } = await supabase
    .from('sites')
    .select('id, creator_email')
    .eq(siteId ? 'id' : 'subdomain', (siteId || subdomain) as string)
    .maybeSingle();
  if (!site) return NextResponse.json({ role: null });

  if ((site.creator_email as string) === email) {
    return NextResponse.json({ role: 'owner', siteId: site.id });
  }

  const { data: cohost } = await supabase
    .from('cohosts')
    .select('role')
    .eq('site_id', site.id as string)
    .eq('email', email)
    .maybeSingle();

  if (!cohost) return NextResponse.json({ role: null, siteId: site.id });
  return NextResponse.json({ role: cohost.role as string, siteId: site.id });
}
