// ─────────────────────────────────────────────────────────────
// Pearloom / lib/notifications/push.ts
//
// Host web-push delivery. Mirrors the guest fan-out in
// /api/broadcast/push: optional `web-push` dependency + VAPID
// keys; degrades to a silent no-op when either is missing so
// push can ship dark and light up when the env is configured.
//
// Subscriptions live in host_push_subscriptions (one row per
// browser endpoint). Dead endpoints (404/410 from the push
// service) are pruned on the spot.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

interface WebPushLib {
  setVapidDetails(subject: string, pub: string, priv: string): void;
  sendNotification(
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
  ): Promise<unknown>;
}

async function loadWebPush(): Promise<WebPushLib | null> {
  try {
    const mod = (await import(/* @vite-ignore */ /* webpackIgnore: true */ 'web-push' as string).catch(() => null)) as unknown as { default?: WebPushLib } | null;
    if (!mod) return null;
    return (mod.default ?? (mod as unknown as WebPushLib)) ?? null;
  } catch {
    return null;
  }
}

export interface HostPushPayload {
  title: string;
  body?: string;
  /** Dashboard path the notification opens, e.g. /dashboard/rsvp */
  url?: string;
}

/** Push a notification to every browser this host subscribed.
 *  Never throws; returns the delivered count. */
export async function sendHostPush(
  supabase: SupabaseClient,
  userEmail: string,
  payload: HostPushPayload,
): Promise<number> {
  try {
    const pub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) return 0;
    const webpush = await loadWebPush();
    if (!webpush) return 0;
    webpush.setVapidDetails('mailto:hello@pearloom.com', pub, priv);

    const { data: subs } = await supabase
      .from('host_push_subscriptions')
      .select('endpoint, keys')
      .eq('user_email', userEmail.toLowerCase().trim())
      .limit(10);
    if (!subs || subs.length === 0) return 0;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body ?? '',
      url: payload.url ?? '/dashboard',
    });

    let delivered = 0;
    for (const s of subs as Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body);
        delivered++;
      } catch (err) {
        // 404 / 410 — the browser dropped the subscription; prune it.
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabase.from('host_push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    }
    return delivered;
  } catch {
    return 0;
  }
}
