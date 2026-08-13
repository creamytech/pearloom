// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/passport-capsule/route.ts
//
// Host view of the per-guest anniversary time-capsule notes
// written via the Guest Passport. Different feature from the
// older /api/time-capsule "love letter" endpoint.
//
// GET ?siteId=xxx[&only=revealed|sealed|all] — list capsule notes.
// PATCH { id, revealed: true } — flip revealed state.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const only = req.nextUrl.searchParams.get('only') ?? 'all';

  const today = new Date().toISOString().slice(0, 10);
  let q = supabase
    .from('time_capsule')
    .select('id, guest_id, guest_name, body, reveal_years, reveal_on, revealed, created_at')
    .eq('site_id', siteId)
    .order('reveal_on', { ascending: true });

  if (only === 'revealed') q = q.lte('reveal_on', today);
  if (only === 'sealed') q = q.gt('reveal_on', today);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ capsule: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const body = await req.json().catch(() => null);
  const id: string | null = body?.id ?? null;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('time_capsule')
    .update({ revealed: Boolean(body?.revealed ?? true) })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
