// ─────────────────────────────────────────────────────────────
// Pearloom / api/event-os/votes/route.ts
//
// Server-side tally for activityVote blocks. voter_key is a
// per-browser stable id (localStorage) so one guest = one vote
// but no auth required. Unique index on (site, block, voter_key)
// makes the upsert race-safe.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── GET ?siteId=…&blockId=…&voterKey=… → tallies + my vote ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId')?.trim();
  const blockId = searchParams.get('blockId')?.trim();
  const voterKey = searchParams.get('voterKey')?.trim();
  if (!siteId || !blockId) {
    return NextResponse.json({ ok: false, error: 'siteId and blockId required' }, { status: 400 });
  }
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, tallies: {}, myVote: null });

  const { data, error } = await supabase
    .from('activity_votes')
    .select('option_id, voter_key')
    .eq('site_id', siteId)
    .eq('block_id', blockId);

  if (error) {
    console.error('[event-os/votes] select failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not load votes.' }, { status: 500 });
  }

  const tallies: Record<string, number> = {};
  let myVote: string | null = null;
  for (const row of data ?? []) {
    tallies[row.option_id] = (tallies[row.option_id] ?? 0) + 1;
    if (voterKey && row.voter_key === voterKey) myVote = row.option_id;
  }
  return NextResponse.json({ ok: true, tallies, myVote });
}

// ── POST { siteId, blockId, voterKey, optionId|null } ───────
// Null optionId clears the vote (retract).
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`vote:${ip}`, { max: 30, windowMs: 5 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many vote changes. Slow down.' }, { status: 429 });
  }

  let body: { siteId?: string; blockId?: string; voterKey?: string; optionId?: string | null } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }
  const siteId = (body.siteId ?? '').trim();
  const blockId = (body.blockId ?? '').trim();
  const voterKey = (body.voterKey ?? '').trim();
  const optionId = body.optionId === null ? null : (body.optionId ?? '').trim();

  if (!siteId || !blockId || !voterKey) {
    return NextResponse.json({ ok: false, error: 'siteId, blockId, voterKey required' }, { status: 400 });
  }
  if (voterKey.length > 128) {
    return NextResponse.json({ ok: false, error: 'voterKey too long.' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, stored: false });

  // Retract
  if (!optionId) {
    const { error } = await supabase
      .from('activity_votes')
      .delete()
      .eq('site_id', siteId)
      .eq('block_id', blockId)
      .eq('voter_key', voterKey);
    if (error) {
      console.error('[event-os/votes] delete failed:', error);
      return NextResponse.json({ ok: false, error: 'Could not retract vote.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, stored: true, retracted: true });
  }

  // Upsert (one vote per voter per block)
  const { error } = await supabase
    .from('activity_votes')
    .upsert(
      { site_id: siteId, block_id: blockId, voter_key: voterKey, option_id: optionId },
      { onConflict: 'site_id,block_id,voter_key' },
    );

  if (error) {
    console.error('[event-os/votes] upsert failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not save vote.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
