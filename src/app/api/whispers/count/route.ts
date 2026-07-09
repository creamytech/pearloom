// Lightweight count endpoint for the dashboard sidebar badge.
// Returns the number of delivered-but-unread whispers across all
// of the authenticated user's sites.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ unread: 0 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ unread: 0 });

  // Get this user's site ids so we scope the count properly.
  const { data: sites } = await supabase
    .from('sites')
    .select('id')
    .eq('creator_email', session.user.email);
  const ids = (sites ?? []).map((s) => s.id);
  if (ids.length === 0) return NextResponse.json({ unread: 0 });

  const { count } = await supabase
    .from('whispers')
    .select('id', { count: 'exact', head: true })
    .in('site_id', ids)
    .eq('read_by_host', false)
    .lte('deliver_after', new Date().toISOString());
  return NextResponse.json({ unread: count ?? 0 });
}
