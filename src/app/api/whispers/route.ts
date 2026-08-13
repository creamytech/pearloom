// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/whispers/route.ts
//
// GET ?siteId=xxx[&only=ready|all] — host's whisper feed.
// By default returns only whispers whose deliver_after has passed
// (the slow-drip surface). ?only=all returns everything.
//
// PATCH { id, readByHost } — mark a whisper as read.
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
  const only = req.nextUrl.searchParams.get('only') ?? 'ready';

  let q = supabase
    .from('whispers')
    .select('id, guest_id, guest_name, body, created_at, deliver_after, delivered_at, read_by_host')
    .eq('site_id', siteId)
    .order('deliver_after', { ascending: false });

  if (only === 'ready') {
    q = q.lte('deliver_after', new Date().toISOString());
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark delivered timestamps for any ready ones the host is seeing for the first time.
  const unseen = (data ?? []).filter((w) => !w.delivered_at && new Date(w.deliver_after).getTime() <= Date.now());
  if (unseen.length > 0) {
    await supabase
      .from('whispers')
      .update({ delivered_at: new Date().toISOString() })
      .in(
        'id',
        unseen.map((w) => w.id),
      );
  }

  return NextResponse.json({ whispers: data ?? [] });
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
    .from('whispers')
    .update({ read_by_host: Boolean(body?.readByHost ?? true) })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
