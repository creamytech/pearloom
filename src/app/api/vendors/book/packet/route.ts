// ─────────────────────────────────────────────────────────────
// Pearloom / api/vendors/book/packet/route.ts
//
// Mint a vendor's call-sheet token.
//
//   POST /api/vendors/book/packet { siteId, id } — owner only
//     → { ok: true, token }
//
// Idempotent: a vendor row carries at most one packet_token —
// if one is already set it's returned as-is, so "Call sheet →"
// in the Vendor Book can be tapped forever and the vendor's link
// never rots. Tokens are crypto-random 24-char base64url
// (randomBytes(18) — the /api/rsvp/plus-one recipe). The public
// reader is GET /api/vendor-packet/[token] + the /vp/[token] page.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { gate, UUID_RX } from '../gate';

export const dynamic = 'force-dynamic';

const mintToken = () => randomBytes(18).toString('base64url'); // 24 chars

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!UUID_RX.test(id)) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

  const g = await gate(typeof body.siteId === 'string' ? body.siteId : null, true);
  if (!g.ok) return g.res;

  // site_id filter scopes the read to the gated site — a vendor id
  // from someone else's book can never match.
  const { data: vendor, error } = await g.supabase
    .from('site_vendors')
    .select('id, packet_token')
    .eq('id', id)
    .eq('site_id', g.siteId)
    .maybeSingle();

  if (error) {
    console.error('[vendors/book/packet] lookup failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not mint the call sheet.' }, { status: 500 });
  }
  if (!vendor) {
    return NextResponse.json({ ok: false, error: 'Vendor not found' }, { status: 404 });
  }

  const existing = (vendor as { packet_token?: string | null }).packet_token;
  if (existing) {
    return NextResponse.json({ ok: true, token: existing });
  }

  // Two attempts cover the astronomically unlikely unique-index
  // collision on a fresh 144-bit token.
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = mintToken();
    const { data: updated, error: updateError } = await g.supabase
      .from('site_vendors')
      .update({ packet_token: token })
      .eq('id', id)
      .eq('site_id', g.siteId)
      .is('packet_token', null) // never clobber a concurrent mint
      .select('packet_token')
      .maybeSingle();

    if (updateError) {
      if (attempt === 0) continue; // collision → retry once
      console.error('[vendors/book/packet] mint failed:', updateError.message);
      return NextResponse.json({ ok: false, error: 'Could not mint the call sheet.' }, { status: 500 });
    }
    if (updated?.packet_token) {
      return NextResponse.json({ ok: true, token: updated.packet_token }, { status: 201 });
    }
    // No row updated → someone else minted between our read and
    // write. Re-read and return theirs (still idempotent).
    const { data: reread } = await g.supabase
      .from('site_vendors')
      .select('packet_token')
      .eq('id', id)
      .eq('site_id', g.siteId)
      .maybeSingle();
    const raced = (reread as { packet_token?: string | null } | null)?.packet_token;
    if (raced) return NextResponse.json({ ok: true, token: raced });
  }

  console.error('[vendors/book/packet] mint exhausted retries');
  return NextResponse.json({ ok: false, error: 'Could not mint the call sheet.' }, { status: 500 });
}
