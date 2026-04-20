// ─────────────────────────────────────────────────────────────
// Pearloom / api/event-os/toasts/moderation/route.ts
// Host-only view of toast-slot claims across every toastSignup
// block on a site. Also supports DELETE to clear a claim
// (host reassigns / voids).
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
  if (!supabase) return NextResponse.json({ ok: true, claims: [] });
  if (!(await userOwnsSite(supabase, siteId, session.user.email))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('toast_signups')
    .select('id, block_id, slot_index, claimed_by, created_at')
    .eq('site_id', siteId)
    .order('block_id', { ascending: true })
    .order('slot_index', { ascending: true });

  if (error) {
    console.error('[toasts/moderation] select failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not load claims.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    claims: (data ?? []).map((row) => ({
      id: row.id,
      blockId: row.block_id,
      slotIndex: row.slot_index,
      claimedBy: row.claimed_by,
      at: row.created_at,
    })),
  });
}

// DELETE ?id=… — host voids a claim so the slot reopens.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, stored: false });

  const { data: row, error: fetchErr } = await supabase
    .from('toast_signups')
    .select('site_id')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr || !row) {
    return NextResponse.json({ ok: false, error: 'Claim not found.' }, { status: 404 });
  }
  if (!(await userOwnsSite(supabase, row.site_id as string, session.user.email))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('toast_signups').delete().eq('id', id);
  if (error) {
    console.error('[toasts/moderation] delete failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not void claim.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, stored: true });
}
