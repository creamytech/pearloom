// ─────────────────────────────────────────────────────────────
// GET /api/rsvp/lookup?siteId=<slug|uuid>&q=<name fragment>
//
// "Find your invitation" — as a guest types their name on the
// public RSVP form, this returns matching guest-list NAMES so
// they can pick themselves (and their reply lands on their row
// instead of minting a duplicate). Names only — emails, tokens,
// statuses and answers never leave the server; knowing a name is
// on a guest list is the same information the host's paper
// invitations already published.
//
// Public + rate-limited (it serves the guest-facing form). Two
// characters minimum, six matches maximum.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`rsvp-lookup:${ip}`, { max: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down a moment.' }, { status: 429 });
  }

  const siteId = req.nextUrl.searchParams.get('siteId') ?? '';
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (!siteId || q.length < 2 || q.length > 80) {
    return NextResponse.json({ matches: [] });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ matches: [] });

  try {
    const siteQuery = supabase.from('sites').select('id');
    const { data: site } = await (UUID_RX.test(siteId)
      ? siteQuery.eq('id', siteId)
      : siteQuery.eq('subdomain', siteId)
    ).maybeSingle();
    if (!site) return NextResponse.json({ matches: [] });

    // Escape ILIKE wildcards so a guest typing "%" can't broaden
    // the match beyond their own input.
    const safe = q.replace(/[%_\\]/g, (c) => `\\${c}`);
    const { data: rows } = await supabase
      .from('guests')
      .select('id, name, party_label')
      .eq('site_id', String(site.id))
      .ilike('name', `%${safe}%`)
      .order('name')
      .limit(6);

    return NextResponse.json({
      matches: (rows ?? []).map((r) => ({
        id: r.id as string,
        name: (r.name as string) ?? '',
        party: (r.party_label as string | null) ?? null,
      })).filter((m) => m.name),
    });
  } catch (err) {
    console.warn('[api/rsvp/lookup] failed:', err);
    return NextResponse.json({ matches: [] });
  }
}
