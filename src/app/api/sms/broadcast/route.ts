// ─────────────────────────────────────────────────────────────
// Pearloom / api/sms/broadcast/route.ts
//
// POST /api/sms/broadcast
//   body: { siteId, message, audience?: 'all'|'yes'|'no'|'maybe' }
//   → sends an SMS to every guest of the site whose attending status
//     matches `audience`. Twilio integration when env vars set;
//     graceful no-op + audit log otherwise (dry-run mode).
//
// Why SMS: most guests don't check email. A "Cocktails by the pool"
// nudge needs to land on a phone. We piggyback on the same guests
// table that already powers RSVP.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface Body {
  siteId?: string;
  message?: string;
  audience?: 'all' | 'yes' | 'no' | 'maybe';
}

async function twilioSend(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, error: 'twilio_not_configured' };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { ok: false, error: `twilio ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req);
  const rl = checkRateLimit(`sms-broadcast:${session.user.email}:${ip}`, {
    max: 6,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'SMS broadcast limited to 6/hour.' }, { status: 429 });
  }

  let body: Body = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const message = (body.message ?? '').trim();
  if (!body.siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });
  if (message.length > 320) return NextResponse.json({ error: 'message too long (max 320 chars)' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });

  // Verify the caller owns this site.
  const { data: site } = await sb
    .from('sites')
    .select('site_config')
    .eq('id', body.siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Pull guest phones based on audience filter.
  let q = sb.from('guests').select('id, name, phone, attending').eq('site_id', body.siteId).not('phone', 'is', null);
  if (body.audience && body.audience !== 'all') q = q.eq('attending', body.audience);
  const { data: guests, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipients = (guests ?? [])
    .filter((g) => typeof g.phone === 'string' && g.phone.length > 0)
    .map((g) => ({ id: String(g.id), name: String(g.name ?? ''), phone: String(g.phone) }));
  if (!recipients.length) {
    return NextResponse.json({ ok: true, sent: 0, dryRun: true, note: 'No guests have phone numbers on file.' });
  }

  // Send in serial (max ~50 recipients in practice) so a Twilio rate
  // limit doesn't fan out into 500 errors at once.
  const results: Array<{ guestId: string; ok: boolean; error?: string }> = [];
  for (const r of recipients) {
    const out = await twilioSend(r.phone, message);
    results.push({ guestId: r.id, ok: out.ok, error: out.error });
    if (!out.ok && out.error === 'twilio_not_configured') break;
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const dryRun = failed.some((r) => r.error === 'twilio_not_configured') && sent === 0;

  return NextResponse.json({
    ok: true,
    sent,
    failed: failed.length,
    total: recipients.length,
    dryRun,
    note: dryRun
      ? 'Twilio is not configured; nothing actually sent. Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER to enable.'
      : undefined,
  });
}
