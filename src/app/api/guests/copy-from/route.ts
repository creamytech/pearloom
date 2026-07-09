// ──────────────────────────────────────────────────────────────
// POST /api/guests/copy-from
//
// Copy the guest list from one of the host's OWN sites into
// another — the "start from the wedding's guest list" handoff
// for sibling events (bachelorette, rehearsal dinner, brunch).
// Body:
//   {
//     siteId: string,      // destination site uuid
//     fromSiteId: string,  // source site uuid
//   }
//
// Both sites must belong to the signed-in host. Person-stable
// facts copy (name, email, phone, address, party label, plus-one,
// dietary); event-specific state does NOT (status resets to
// pending, meal choice / song / message stay empty — guests
// answer those per event). Dedupe matches the CSV importer:
// lowercased email, then normalized name.
//
// Returns { ok, inserted, skipped, total }.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getPlanWithLimitsForEmail, planLimitResponseBody, isSiteGriefExempt } from '@/lib/plan-gate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const COPY_FIELDS =
  'name, email, phone, party_label, plus_one, plus_one_name, plus_one_count, ' +
  'mailing_address_line1, mailing_address_line2, city, state, postal_code, country, ' +
  'dietary_restrictions, person_id';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`guests-copy:${session.user.email}`, { max: 10, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many copies. Try again in an hour.' }, { status: 429 });
    }

    let body: { siteId?: string; fromSiteId?: string } = {};
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const siteId = typeof body.siteId === 'string' ? body.siteId : '';
    const fromSiteId = typeof body.fromSiteId === 'string' ? body.fromSiteId : '';
    if (!siteId || !fromSiteId) {
      return NextResponse.json({ error: 'siteId and fromSiteId are required' }, { status: 400 });
    }
    if (siteId === fromSiteId) {
      return NextResponse.json({ error: 'Source and destination are the same site' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    // Ownership — BOTH sites must belong to this host. Case-
    // insensitive, matching /api/guests/import.
    const me = session.user.email.toLowerCase().trim();
    const { data: ownedSites } = await supabase
      .from('sites')
      .select('id, creator_email')
      .in('id', [siteId, fromSiteId]);
    const owned = new Set(
      (ownedSites ?? [])
        .filter((s) => String(s.creator_email ?? '').toLowerCase().trim() === me)
        .map((s) => s.id as string),
    );
    if (!owned.has(siteId) || !owned.has(fromSiteId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Source rows.
    const { data: source, error: sourceErr } = await supabase
      .from('guests')
      .select(COPY_FIELDS)
      .eq('site_id', fromSiteId)
      .limit(2000);
    if (sourceErr) {
      console.error('[api/guests/copy-from] source fetch:', sourceErr.message);
      return NextResponse.json({ error: 'Could not read the source guest list' }, { status: 500 });
    }
    if (!source || source.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, skipped: 0, total: 0 });
    }

    // Dedupe against the destination — same keys as the importer.
    const { data: existing } = await supabase
      .from('guests')
      .select('email, name')
      .eq('site_id', siteId);
    const existingEmails = new Set<string>();
    const existingNames = new Set<string>();
    for (const row of existing || []) {
      const e = (row.email as string | null)?.toLowerCase();
      if (e) existingEmails.add(e);
      const n = (row.name as string | null)?.toLowerCase().replace(/\s+/g, ' ').trim();
      if (n) existingNames.add(n);
    }
    const rows = (source as unknown as Array<Record<string, unknown>>).filter((g) => {
      const e = (g.email as string | null)?.toLowerCase();
      if (e) return !existingEmails.has(e);
      const n = (g.name as string | null)?.toLowerCase().replace(/\s+/g, ' ').trim();
      return n ? !existingNames.has(n) : false;
    });
    const skipped = source.length - rows.length;

    // Plan gate — same contract as the CSV importer.
    const { plan, limits } = await getPlanWithLimitsForEmail(session.user.email);
    const currentGuests = (existing ?? []).length;
    const griefExempt = await isSiteGriefExempt(supabase, siteId);
    if (!griefExempt && Number.isFinite(limits.maxGuests) && currentGuests + rows.length > limits.maxGuests) {
      return NextResponse.json({
        ...planLimitResponseBody('guests', limits.maxGuests, plan),
        allowed: Math.max(0, limits.maxGuests - currentGuests),
      }, { status: 402 });
    }

    const importedAt = new Date().toISOString();
    const batchId = crypto.randomUUID();
    const toInsert = rows.map((g) => ({
      ...g,
      site_id: siteId,
      status: 'pending',
      imported_at: importedAt,
      import_batch_id: batchId,
    }));

    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 200) {
      const chunk = toInsert.slice(i, i + 200);
      const { error } = await supabase.from('guests').insert(chunk);
      if (error) {
        console.error('[api/guests/copy-from] insert chunk error:', error.message);
        return NextResponse.json({
          error: `Copy failed after ${inserted} guests: ${error.message}`,
          inserted,
        }, { status: 500 });
      }
      inserted += chunk.length;
    }

    // person_id rode the copy, but run the linker anyway to catch
    // rows the source never linked. Fire-and-forget.
    void supabase.rpc('link_guests_to_people', { p_site_id: siteId }).then(
      () => {},
      (err: unknown) => console.warn('[api/guests/copy-from] people link failed (non-fatal):', err),
    );

    return NextResponse.json({ ok: true, inserted, skipped, total: source.length });
  } catch (err) {
    console.error('[api/guests/copy-from] unhandled:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
