// ─────────────────────────────────────────────────────────────
// /api/guests/text-invite — host-only bulk SMS invites (Twilio).
//
// Texts each guest their PERSONAL site link (?g=<token> when the
// guest has one). Host-initiated invitation traffic only — the
// host presses the button, we send, we stamp sms_invite_sent_at
// so re-runs skip already-texted guests by default.
//
// Body: {
//   siteId: string,            // uuid or slug
//   guestIds?: string[],       // explicit list; default = every
//                              // guest with a phone and no
//                              // sms_invite_sent_at stamp
//   includeAlreadyTexted?: boolean,
// }
//
// Owner-only. Rate limit 4 batches/hour per host; 100 texts per
// batch. 503 with smsConfigured:false when Twilio env is absent
// so the UI can fall back to the manual sms: links.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { isSmsConfigured, normalizePhone, sendSms } from '@/lib/sms';
import { buildSiteUrl, normalizeOccasion } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { max: 4, windowMs: 60 * 60 * 1000 };
const MAX_BATCH = 100;
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSmsConfigured()) {
    return NextResponse.json(
      { error: 'Text sending isn’t set up on this server yet. Use the per-guest Text invite buttons (they open your own Messages).', smsConfigured: false },
      { status: 503 },
    );
  }
  const rl = checkRateLimit(`guests-sms:${session.user.email}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many text batches. Try again in an hour.' }, { status: 429 });
  }

  let body: { siteId?: string; guestIds?: string[]; includeAlreadyTexted?: boolean } = {};
  try { body = await req.json(); } catch { /* → 400 below */ }
  const siteIdRaw = body.siteId?.trim();
  if (!siteIdRaw) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const explicitIds = Array.isArray(body.guestIds)
    ? body.guestIds.filter((x) => typeof x === 'string' && UUID_RX.test(x))
    : null;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  // Resolve site (uuid or slug) + owner gate.
  const siteQuery = sb.from('sites').select('id, subdomain, creator_email, ai_manifest');
  const { data: site } = await (UUID_RX.test(siteIdRaw)
    ? siteQuery.eq('id', siteIdRaw)
    : siteQuery.eq('subdomain', siteIdRaw)
  ).maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const owner = String(site.creator_email ?? '').toLowerCase().trim();
  if (!owner || owner !== session.user.email.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const manifest = (site.ai_manifest ?? {}) as { names?: string[]; occasion?: string };
  const names = (manifest.names ?? []).filter(Boolean);
  const siteLabel = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] || 'Our celebration');
  const occasion = normalizeOccasion(manifest.occasion);

  // Recipients — explicit list, or every un-texted guest with a phone.
  let q = sb
    .from('guests')
    .select('id, name, phone, guest_token, sms_invite_sent_at')
    .eq('site_id', String(site.id))
    .not('phone', 'is', null);
  if (explicitIds && explicitIds.length > 0) q = q.in('id', explicitIds);
  const { data: guests, error: guestsErr } = await q.limit(500);
  if (guestsErr) {
    console.error('[text-invite] guests fetch:', guestsErr.message);
    return NextResponse.json({ error: 'Couldn’t load the guest list' }, { status: 500 });
  }

  const targets = (guests ?? [])
    .filter((g) => normalizePhone(String(g.phone ?? '')))
    .filter((g) => body.includeAlreadyTexted || explicitIds || !g.sms_invite_sent_at)
    .slice(0, MAX_BATCH);

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, note: 'No guests with phone numbers left to text.' });
  }

  let sent = 0;
  let failed = 0;
  const now = new Date().toISOString();
  for (const g of targets) {
    const personal = buildSiteUrl(String(site.subdomain), '', undefined, occasion)
      + (g.guest_token ? `?g=${encodeURIComponent(String(g.guest_token))}` : '');
    const first = String(g.name ?? '').split(/\s+/)[0] || 'Hi';
    const text = `${first}, you're invited! ${siteLabel}. Everything's here, RSVP included: ${personal}`;
    const res = await sendSms({ to: String(g.phone), body: text });
    if (res.ok) {
      sent += 1;
      await sb.from('guests').update({ sms_invite_sent_at: now }).eq('id', g.id);
    } else {
      failed += 1;
      console.warn('[text-invite] send failed for guest', g.id, res.error);
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: targets.length });
}
