import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ─────────────────────────────────────────────────────────────
// POST /api/community/marks/[id]/use
//
// Increments the mark's downloads counter and returns its URL.
// Called when a host applies a community mark to their site
// (drag onto canvas, "Use this" button in LibraryPanelV2).
// No auth required — guests browsing the public marketplace
// could still use marks once we expose it. For now, the call
// just bumps the counter without identity.
// ─────────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const ip = getClientIp(req);
  const rl = checkRateLimit(`community-use:${ip}`, { max: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down a tick' }, { status: 429 });
  }

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: 'Community library not configured' }, { status: 503 });

  const { data: mark, error } = await sb
    .from('community_marks')
    .select('id, asset_url, kind, state, withdrawn_at, downloads')
    .eq('id', id)
    .single();
  if (error || !mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }
  if (mark.state !== 'approved' || mark.withdrawn_at) {
    return NextResponse.json({ error: 'Mark not available' }, { status: 410 });
  }

  // Bump downloads counter. Race-y but acceptable — we're not
  // metering anything here, just signaling popularity.
  await sb
    .from('community_marks')
    .update({ downloads: (mark.downloads ?? 0) + 1 })
    .eq('id', id);

  return NextResponse.json({
    url: mark.asset_url,
    kind: mark.kind,
  });
}
