// ─────────────────────────────────────────────────────────────
// Pearloom / api/vendors/click/route.ts
//
// Records a host tap of a directory vendor's booking / website link
// — the lead event the directory (20260428_vendor_directory.sql)
// promised but never wrote. Money-free: this is a log, not a payment.
//
// The directory is public, so a session is optional; when the caller
// is a signed-in host we attach their email + the site they were
// working from for later "which vendors do my hosts click?" insight.
// Fire-and-forget from the client — a failed beacon must never block
// the outbound link.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`vendor-click:${ip}`, { max: 60, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: { vendorId?: string; siteId?: string; target?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const vendorId = typeof body.vendorId === 'string' ? body.vendorId : '';
  if (!UUID_RX.test(vendorId)) {
    return NextResponse.json({ ok: false, error: 'vendorId required' }, { status: 400 });
  }
  const target = body.target === 'booking' || body.target === 'website' ? body.target : null;
  const siteId = typeof body.siteId === 'string' ? body.siteId.slice(0, 200) : null;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, stored: false });

  // Best-effort session context — the directory is public, so this is
  // never a gate.
  let email: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    email = session?.user?.email?.toLowerCase().trim() ?? null;
  } catch {
    /* anonymous is fine */
  }

  const { error } = await sb.from('vendor_clicks').insert({ vendor_id: vendorId, site_id: siteId, email, target });
  if (error) {
    console.error('[vendors/click] insert failed:', error.message);
    return NextResponse.json({ ok: true, stored: false });
  }
  return NextResponse.json({ ok: true, stored: true });
}
