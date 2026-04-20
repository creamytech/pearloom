// ─────────────────────────────────────────────────────────────
// Pearloom / api/event-os/submissions/moderation/route.ts
//
// Host-only moderation endpoints for tribute_submissions.
// Auth: NextAuth session + check that session.user.email owns
// the site (creator_email match). Returns every state (not just
// 'approved') and lets the host flip state between
// approved | hidden | flagged.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

type SubmissionState = 'approved' | 'hidden' | 'flagged';
const VALID_STATES: ReadonlyArray<SubmissionState> = ['approved', 'hidden', 'flagged'];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Returns true if the signed-in user owns the given site
 * (creator_email matches session.user.email). Returns false on
 * any missing data or error so callers fail closed.
 */
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

// ── GET ?siteId=… → all submissions across every block ──────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId')?.trim();
  if (!siteId) {
    return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, entries: [] });

  if (!(await userOwnsSite(supabase, siteId, session.user.email))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('tribute_submissions')
    .select('id, block_id, author_name, body, state, created_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[moderation] select failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not load submissions.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    entries: (data ?? []).map((row) => ({
      id: row.id,
      blockId: row.block_id,
      from: row.author_name,
      body: row.body,
      state: row.state as SubmissionState,
      at: row.created_at,
    })),
  });
}

// ── PATCH { id, state } → flip moderation state ─────────────
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: string; state?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }
  const id = (body.id ?? '').trim();
  const state = (body.state ?? '').trim() as SubmissionState;

  if (!id || !VALID_STATES.includes(state)) {
    return NextResponse.json({ ok: false, error: 'id and valid state required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, stored: false });

  // Verify ownership of the site the submission belongs to.
  const { data: sub, error: fetchErr } = await supabase
    .from('tribute_submissions')
    .select('site_id')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr || !sub) {
    return NextResponse.json({ ok: false, error: 'Submission not found.' }, { status: 404 });
  }
  if (!(await userOwnsSite(supabase, sub.site_id as string, session.user.email))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('tribute_submissions')
    .update({ state })
    .eq('id', id);

  if (error) {
    console.error('[moderation] update failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not update state.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
