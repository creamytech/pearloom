// ─────────────────────────────────────────────────────────────
// /api/webhooks/resend — receives email lifecycle events from
// Resend and updates the matching public.guests rows so the
// dashboard funnel shows real delivered / opened / clicked /
// bounced state.
//
// Event shape (from Resend's webhook docs):
//   {
//     "type": "email.delivered" | "email.opened" | "email.clicked"
//           | "email.bounced"   | "email.complained" | …,
//     "created_at": "2024-…",
//     "data": {
//       "email_id": "<resend message id>",
//       "to": ["guest@example.com"],
//       "tags": [{ "name": "site_id", "value": "<uuid|slug>" },
//                { "name": "guest_id", "value": "<uuid>" }]
//     }
//   }
//
// The matcher prefers a `guest_id` tag (set by our send paths
// when we know which guest the email is for). Falls back to
// (site_id + lowercased to-address) when only the site is tagged.
// Without either tag we ignore the event — better silent than
// updating the wrong row.
//
// Signature verification uses RESEND_WEBHOOK_SECRET when set
// (Svix-style HMAC). When unset, the route accepts unsigned
// requests so dev environments work — production should always
// configure the secret.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[] | string;
    tags?: Array<{ name?: string; value?: string }>;
  };
}

/** Maps Resend event types → guest-row column. Events outside
 *  this map are ignored (we don't track sent here — that's set
 *  on the send path itself). */
const EVENT_COLUMNS: Record<string, string> = {
  'email.delivered': 'email_delivered_at',
  'email.opened':    'email_opened_at',
  'email.clicked':   'email_clicked_at',
  'email.bounced':   'email_bounced_at',
  'email.complained':'email_bounced_at', // treat as a bounce
};

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  // Svix-style signature header: "v1,<base64sig> v1,<base64sig>"
  // We accept either base64 OR hex HMAC-SHA256 of the raw body.
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return header.includes(expected) || header.toLowerCase().includes(expectedHex);
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (secret) {
    const sig = req.headers.get('svix-signature') ?? req.headers.get('resend-signature');
    if (!verifySignature(rawBody, sig, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const column = EVENT_COLUMNS[event.type];
  if (!column) {
    // Unknown / uninteresting event — return 200 so Resend stops
    // retrying instead of treating it as a failure.
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const sb = getSupabase();
  if (!sb) {
    // Storage not configured — ack so Resend doesn't retry.
    return NextResponse.json({ ok: true, note: 'Storage not configured' });
  }

  const tagMap: Record<string, string> = {};
  for (const t of event.data?.tags ?? []) {
    if (t.name && t.value) tagMap[t.name] = t.value;
  }
  const guestId = tagMap.guest_id;
  const siteId = tagMap.site_id; // either UUID or subdomain
  const toRaw = Array.isArray(event.data?.to) ? event.data.to[0] : event.data?.to;
  const toAddr = typeof toRaw === 'string' ? toRaw.toLowerCase().trim() : null;

  const ts = event.created_at || new Date().toISOString();

  // Match strategy: guest_id wins, else (site_id + email).
  if (guestId) {
    await sb
      .from('guests')
      .update({ [column]: ts })
      .eq('id', guestId);
    return NextResponse.json({ ok: true, matchedBy: 'guest_id' });
  }

  if (siteId && toAddr) {
    // Resolve siteId: accept UUID or subdomain.
    const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let siteUuid = UUID_RX.test(siteId) ? siteId : null;
    if (!siteUuid) {
      const { data: site } = await sb
        .from('sites')
        .select('id')
        .eq('subdomain', siteId)
        .maybeSingle();
      siteUuid = (site as { id?: string } | null)?.id ?? null;
    }
    if (!siteUuid) {
      return NextResponse.json({ ok: true, note: 'Site not found' });
    }
    await sb
      .from('guests')
      .update({ [column]: ts })
      .eq('site_id', siteUuid)
      .eq('email', toAddr);
    return NextResponse.json({ ok: true, matchedBy: 'site_email' });
  }

  // No tags AND no usable to-address — best we can do is ack.
  return NextResponse.json({ ok: true, note: 'No match available' });
}
