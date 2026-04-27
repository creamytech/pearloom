// ─────────────────────────────────────────────────────────────
// Pearloom / api/guest-passport/[token]/subscribe — Web Push
// subscription registration. Stores the browser's endpoint +
// keys in guest_push_subscriptions so the host can broadcast
// day-of pings ("ceremony starting in 10 min") to every
// subscribed guest at once.
//
// Public endpoint — token is the only auth. The token itself
// is the bearer of access; if it leaks, the worst case is a
// stranger receives day-of pings, which is benign.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface PushSubscription {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
  const client = sb();
  if (!client) return NextResponse.json({ error: 'Storage not configured.' }, { status: 503 });

  let body: { subscription?: PushSubscription };
  try { body = (await req.json()) as { subscription?: PushSubscription }; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'Subscription is missing endpoint or keys.' }, { status: 400 });
  }

  const { data: guest } = await client
    .from('pearloom_guests')
    .select('id, site_id')
    .eq('guest_token', token)
    .maybeSingle();
  if (!guest) {
    return NextResponse.json({ error: 'Token not recognised.' }, { status: 404 });
  }

  const { error } = await client
    .from('guest_push_subscriptions')
    .upsert({
      guest_id: guest.id,
      guest_token: token,
      site_id: guest.site_id,
      endpoint: sub.endpoint,
      p256dh_key: sub.keys.p256dh,
      auth_key: sub.keys.auth,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
  if (error) {
    console.error('[guest-push subscribe] upsert failed:', error);
    return NextResponse.json({ error: 'Could not save subscription.' }, { status: 500 });
  }

  // Mark companion state so dashboards can show "X guests subscribed."
  await client.from('guest_companion_state').upsert({
    guest_token: token,
    push_enabled: true,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'guest_token' });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const client = sb();
  if (!client) return NextResponse.json({ ok: true });
  await client.from('guest_push_subscriptions').delete().eq('guest_token', token);
  await client.from('guest_companion_state').upsert({
    guest_token: token,
    push_enabled: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'guest_token' });
  return NextResponse.json({ ok: true });
}
