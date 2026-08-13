// ─────────────────────────────────────────────────────────────
// Pearloom / api/notifications/push — host web-push endpoints.
//
// GET    — { vapidPublicKey } so the client can subscribe
//          (null when push isn't configured on this deployment).
// POST   — { subscription } stores the browser's PushSubscription
//          for the signed-in host.
// DELETE — { endpoint } removes one subscription.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null;
  return NextResponse.json({ vapidPublicKey: key });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const { error } = await sb.from('host_push_subscriptions').upsert({
    endpoint: sub.endpoint,
    user_email: session.user.email.toLowerCase(),
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  }, { onConflict: 'endpoint' });
  if (error) {
    console.error('[notifications/push] subscribe failed:', error);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as { endpoint?: string };
  if (!body.endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true });

  await sb.from('host_push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)
    .eq('user_email', session.user.email.toLowerCase());
  return NextResponse.json({ ok: true });
}
