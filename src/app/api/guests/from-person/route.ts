// ─────────────────────────────────────────────────────────────
// Pearloom / api/guests/from-person — weave in from your circle
// (SOCIAL-PLAN S3, the retention loop). A host adds a circle member
// to an event's GUEST LIST by person id — no retyped address, and
// the email itself never crosses the wire to the UI (the id is the
// anchor; the server resolves the facts). Generalizes the split
// picker's from-person primitive to the universal guest concept.
//
//   POST { siteId, personId }
//     → creates (or returns) the guests row for that person,
//       deduped on (site_id, person_id) then case-insensitive
//       email. Owner-gated: only the site owner's session may add.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { guestTokenColumns } from '@/lib/guest-tokens';
import { sendGuestInviteEmail } from '@/lib/email/guest-invite';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface PostBody {
  siteId?: string;
  personId?: string;
  /** Email them their personal invite on add (same sender as the
   *  Add Guest dialog — lib/email/guest-invite). */
  sendInvite?: boolean;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`guests:fp:${ip}`, { max: 60, windowMs: 5 * 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
  const personId = typeof body.personId === 'string' ? body.personId.trim() : '';
  if (!siteId || !UUID_RX.test(personId)) {
    return NextResponse.json({ ok: false, error: 'siteId and personId required' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Not configured' }, { status: 503 });

  const session = await getServerSession(authOptions);
  const callerEmail = session?.user?.email?.toLowerCase().trim();
  if (!callerEmail) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  // Owner gate — the guests route's own pattern.
  const { data: site } = await sb
    .from('sites')
    .select('id, site_config, creator_email')
    .eq('id', siteId)
    .maybeSingle();
  const ownerEmail = ((site as { creator_email?: string; site_config?: { creator_email?: string } } | null)?.creator_email
    ?? (site as { site_config?: { creator_email?: string } } | null)?.site_config?.creator_email
    ?? '').toLowerCase();
  if (!site || !ownerEmail || ownerEmail !== callerEmail) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  // The person's facts — resolved server-side from the id, never
  // trusted from the client.
  const { data: person } = await sb
    .from('people')
    .select('id, display_name, email')
    .eq('id', personId)
    .maybeSingle();
  if (!person?.email) {
    return NextResponse.json({ ok: false, error: 'Person not found' }, { status: 404 });
  }
  const name = String(person.display_name ?? '').trim() || 'A guest';
  const email = String(person.email).toLowerCase();

  // Dedup — by linked person first, then case-insensitive email
  // (older rows may predate the person link).
  const [{ data: byPerson }, { data: byEmail }] = await Promise.all([
    sb.from('guests').select('id, name').eq('site_id', siteId).eq('person_id', personId).maybeSingle(),
    sb.from('guests').select('id, name').eq('site_id', siteId).ilike('email', email).maybeSingle(),
  ]);
  const existing = byPerson ?? byEmail;
  if (existing) {
    return NextResponse.json({ ok: true, added: false, guest: { id: String(existing.id), name: String(existing.name ?? name) } });
  }

  const { data, error } = await sb
    .from('guests')
    .insert({
      site_id: siteId,
      name,
      email,
      status: 'pending',
      person_id: personId,
      ...guestTokenColumns(),
      created_at: new Date().toISOString(),
    })
    .select('id, name, guest_token')
    .single();
  if (error || !data) {
    console.error('[guests/from-person] insert failed:', error?.message);
    return NextResponse.json({ ok: false, error: 'Could not add the guest.' }, { status: 500 });
  }
  // The weave-in sends the SAME personal invite the Add Guest dialog
  // does (the walk found circle adds silently skipped it). Opt-out
  // via sendInvite:false; fire-and-forget, never blocks the add.
  if (body.sendInvite !== false) {
    void sendGuestInviteEmail(sb, {
      siteId,
      guestId: String(data.id),
      guestName: name,
      guestEmail: email,
      guestToken: (data as { guest_token?: string }).guest_token ?? null,
    });
  }
  return NextResponse.json({ ok: true, added: true, guest: { id: String(data.id), name: String(data.name ?? name) } }, { status: 201 });
}
