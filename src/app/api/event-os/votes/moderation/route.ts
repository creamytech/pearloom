// ─────────────────────────────────────────────────────────────
// Pearloom / api/event-os/votes/moderation/route.ts
// Host-only tally view for activity_votes. Returns per-block
// option totals + total voter count across every activityVote
// block on the site.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function userOwnsSite(
  supabase: ReturnType<typeof getSupabase>,
  siteDomain: string,
  userEmail: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('sites')
    .select('site_config')
    .eq('domain', siteDomain)
    .maybeSingle();
  if (error || !data) return false;
  const cfg = data.site_config as { creator_email?: string } | null;
  return !!cfg?.creator_email && cfg.creator_email === userEmail;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId')?.trim();
  if (!siteId) return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, blocks: {} });
  if (!(await userOwnsSite(supabase, siteId, session.user.email))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('activity_votes')
    .select('block_id, option_id, voter_key')
    .eq('site_id', siteId);

  if (error) {
    console.error('[votes/moderation] select failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not load votes.' }, { status: 500 });
  }

  // Group: blocks[blockId] = { tallies: { optionId: count }, voterCount }
  const blocks: Record<string, { tallies: Record<string, number>; voterCount: number }> = {};
  for (const row of data ?? []) {
    const id = row.block_id as string;
    const opt = row.option_id as string;
    if (!blocks[id]) blocks[id] = { tallies: {}, voterCount: 0 };
    blocks[id].tallies[opt] = (blocks[id].tallies[opt] ?? 0) + 1;
    blocks[id].voterCount += 1;
  }

  return NextResponse.json({ ok: true, blocks });
}
