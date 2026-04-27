// ─────────────────────────────────────────────────────────────
// Pearloom / api/broadcast/push — fan-out a day-of broadcast to
// every subscribed guest of a site.
//
// POST { siteSlug, title, body, url? }
//   • Auth: site owner only.
//   • Persists to announcements (public feed) so guests w/o
//     push subscriptions still see it on the site.
//   • For every guest_push_subscriptions row scoped to the site,
//     attempt a Web Push send. Requires `web-push` package +
//     VAPID keys; degrades to "announcement-only" when either
//     is missing.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { getSiteConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Optional dependency — skipped via try/catch so the build doesn't
// fail when web-push isn't installed yet. Install with `npm install
// web-push` to activate the fan-out.
interface WebPushLib {
  setVapidDetails(subject: string, pub: string, priv: string): void;
  sendNotification(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string): Promise<unknown>;
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

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface Body {
  siteSlug: string;
  title: string;
  body: string;
  url?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!body.siteSlug || !body.title || !body.body) {
    return NextResponse.json({ error: 'siteSlug, title, body are required.' }, { status: 400 });
  }

  const cfg = await getSiteConfig(body.siteSlug);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  const ownerEmail = ((cfg as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }

  const client = sb();
  if (!client) return NextResponse.json({ error: 'Storage not configured.' }, { status: 503 });

  // Always persist as an announcement — that's the in-app surface
  // for guests without push subscriptions.
  await client.from('announcements').insert({
    site_id: body.siteSlug,
    body: `${body.title}: ${body.body}`,
    kind: 'live',
    target_audience: 'all',
    sent_at: new Date().toISOString(),
  }).then(() => {}, (err) => console.warn('[broadcast] announcement insert failed:', err));

  // ── Fan-out to push subscribers (best-effort) ──
  const { data: subs } = await client
    .from('guest_push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key, guest_token')
    .eq('site_id', body.siteSlug);

  let pushSent = 0;
  let pushFailed = 0;
  let pushSkipped = 0;

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hello@pearloom.com';
  if (subs && subs.length > 0 && vapidPublic && vapidPrivate) {
    try {
      // Dynamic import so the route doesn't crash when web-push
      // isn't installed. If it fails to resolve we just skip the
      // push step — announcements still went out.
      // web-push is optional — dynamic import via the type-erased
      // helper so TypeScript doesn't fail when the package isn't
      // installed. Server returns "skipped" until the dep is added.
      const wp = await loadWebPush();
      if (wp) {
        wp.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
        const payload = JSON.stringify({
          title: body.title,
          body: body.body,
          url: body.url ?? `/sites/${body.siteSlug}`,
          tag: `pearloom-${body.siteSlug}`,
        });
        await Promise.all(subs.map(async (s: { id: string; endpoint: string; p256dh_key: string; auth_key: string }) => {
          try {
            await wp.sendNotification({
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh_key, auth: s.auth_key },
            }, payload);
            pushSent += 1;
            await client.from('guest_push_subscriptions').update({
              last_used_at: new Date().toISOString(),
            }).eq('id', s.id);
          } catch (err) {
            pushFailed += 1;
            // 410 / 404 → endpoint is dead, drop it.
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) {
              await client.from('guest_push_subscriptions').delete().eq('id', s.id);
            }
          }
        }));
      } else {
        pushSkipped = subs.length;
      }
    } catch (err) {
      console.warn('[broadcast] push fan-out failed:', err);
      pushSkipped = subs.length;
    }
  } else {
    pushSkipped = subs?.length ?? 0;
  }

  return NextResponse.json({
    ok: true,
    announcementSent: true,
    pushSent,
    pushFailed,
    pushSkipped,
    note: vapidPublic && vapidPrivate ? undefined : 'VAPID keys not configured — push fan-out skipped (announcement still sent).',
  });
}
