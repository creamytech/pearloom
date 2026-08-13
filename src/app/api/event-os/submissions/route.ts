// ─────────────────────────────────────────────────────────────
// Pearloom / api/event-os/submissions/route.ts
//
// CRUD for the adviceWall / tribute wall. Append-only on POST;
// GET returns approved submissions scoped to a site + block.
// Hidden state is flipped from the editor dashboard (future).
//
// Rate-limited per IP so guest walls don't turn into spam.
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

// ── GET ?siteId=…&blockId=… ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId')?.trim();
  const blockId = searchParams.get('blockId')?.trim();
  if (!siteId || !blockId) {
    return NextResponse.json({ ok: false, error: 'siteId and blockId required' }, { status: 400 });
  }
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, entries: [] });

  const { data, error } = await supabase
    .from('tribute_submissions')
    .select('author_name, body, created_at')
    .eq('site_id', siteId)
    .eq('block_id', blockId)
    .eq('state', 'approved')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[event-os/submissions] select failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not load submissions.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    entries: (data ?? []).map((row) => ({
      from: row.author_name,
      body: row.body,
      at: row.created_at,
    })),
  });
}

// ── POST { siteId, blockId, from, body } ─────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`tribute:${ip}`, { max: 8, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many posts too fast. Take a breath and try again.' },
      { status: 429 },
    );
  }

  let body: { siteId?: string; blockId?: string; from?: string; body?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }
  const siteId = (body.siteId ?? '').trim();
  const blockId = (body.blockId ?? '').trim();
  const from = (body.from ?? '').trim();
  const bodyText = (body.body ?? '').trim();

  if (!siteId || !blockId) return NextResponse.json({ ok: false, error: 'siteId and blockId required' }, { status: 400 });
  if (from.length < 1 || from.length > 80) return NextResponse.json({ ok: false, error: 'Name must be 1–80 characters.' }, { status: 400 });
  if (bodyText.length < 1 || bodyText.length > 2000) return NextResponse.json({ ok: false, error: 'Message must be 1–2000 characters.' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) {
    console.log('[event-os/submissions] POST (no-db):', { siteId, blockId, from });
    return NextResponse.json({ ok: true, stored: false });
  }

  const { error } = await supabase.from('tribute_submissions').insert({
    site_id: siteId,
    block_id: blockId,
    author_name: from,
    body: bodyText,
  });

  if (error) {
    console.error('[event-os/submissions] insert failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not save submission.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
