// ─────────────────────────────────────────────────────────────
// Pearloom / api/event-os/toasts/route.ts
//
// Toast-slot claims for toastSignup blocks. One claim per
// (site, block, slot_index); unique index makes the race safe.
// Guests claim by name; the host can reassign from the dashboard
// (future).
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

// ── GET ?siteId=…&blockId=… → claims keyed by slot_index ────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId')?.trim();
  const blockId = searchParams.get('blockId')?.trim();
  if (!siteId || !blockId) {
    return NextResponse.json({ ok: false, error: 'siteId and blockId required' }, { status: 400 });
  }
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, claims: {} });

  const { data, error } = await supabase
    .from('toast_signups')
    .select('slot_index, claimed_by')
    .eq('site_id', siteId)
    .eq('block_id', blockId);

  if (error) {
    console.error('[event-os/toasts] select failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not load claims.' }, { status: 500 });
  }

  const claims: Record<number, string> = {};
  for (const row of data ?? []) claims[row.slot_index] = row.claimed_by;
  return NextResponse.json({ ok: true, claims });
}

// ── POST { siteId, blockId, slotIndex, claimedBy } ──────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`toast:${ip}`, { max: 12, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many claims in a row. Try again in a minute.' }, { status: 429 });
  }

  let body: { siteId?: string; blockId?: string; slotIndex?: number; claimedBy?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }
  const siteId = (body.siteId ?? '').trim();
  const blockId = (body.blockId ?? '').trim();
  const slotIndex = Number(body.slotIndex);
  const claimedBy = (body.claimedBy ?? '').trim();

  if (!siteId || !blockId) return NextResponse.json({ ok: false, error: 'siteId and blockId required' }, { status: 400 });
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 100) {
    return NextResponse.json({ ok: false, error: 'slotIndex must be 0–100.' }, { status: 400 });
  }
  if (claimedBy.length < 1 || claimedBy.length > 80) {
    return NextResponse.json({ ok: false, error: 'claimedBy must be 1–80 characters.' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, stored: false });

  const { error } = await supabase
    .from('toast_signups')
    .insert({ site_id: siteId, block_id: blockId, slot_index: slotIndex, claimed_by: claimedBy });

  if (error) {
    // Unique-constraint violation = slot already claimed.
    const msg = error.message?.toLowerCase() ?? '';
    if (error.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
      return NextResponse.json({ ok: false, error: 'Already claimed.', code: 'taken' }, { status: 409 });
    }
    console.error('[event-os/toasts] insert failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not save claim.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
