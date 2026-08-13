// ─────────────────────────────────────────────────────────────
// /api/email-prefs
//
// Manages site-level opt-out for product / retention emails. The
// only public-facing GET is the unsubscribe link in retention
// emails; that's intentionally a GET (one-tap from email is the
// expected UX even though it has a side-effect — the link itself
// is the credential).
//
// Schema:  site_email_prefs  (site_id, channel, opted_out_at)
// Channels: 'anniversary' | 'milestone' | 'product'
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const ALLOWED_CHANNELS = new Set(['anniversary', 'milestone', 'product']);

// GET — invoked from the unsubscribe link in retention emails.
// Sets opted_out_at = now() and renders a small confirmation page.
// CAN-SPAM expects this to be honored within 10 days; we honor
// it on tap.
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('site');
  const channel = req.nextUrl.searchParams.get('channel');
  const action = req.nextUrl.searchParams.get('action') ?? 'opt-out';

  if (!siteId || !channel || !ALLOWED_CHANNELS.has(channel)) {
    return new NextResponse(htmlPage('Invalid unsubscribe link', 'The link looks malformed. Try clicking it again from the email.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 400,
    });
  }

  const sb = getSupabase();
  if (!sb) {
    return new NextResponse(htmlPage("We couldn't reach the database", 'Try again in a few minutes.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 503,
    });
  }

  if (action === 'opt-in') {
    await sb
      .from('site_email_prefs')
      .upsert({ site_id: siteId, channel, opted_out_at: null }, { onConflict: 'site_id,channel' });
    return new NextResponse(htmlPage('Got it.', `You'll get ${humanChannel(channel)} emails again.`), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  await sb
    .from('site_email_prefs')
    .upsert({ site_id: siteId, channel, opted_out_at: new Date().toISOString() }, { onConflict: 'site_id,channel' });

  const undoUrl = `/api/email-prefs?site=${encodeURIComponent(siteId)}&channel=${encodeURIComponent(channel)}&action=opt-in`;
  return new NextResponse(
    htmlPage(
      'Stopped.',
      `You won't get any more ${humanChannel(channel)} emails from Pearloom.`,
      `<p style="margin-top: 18px; font-size: 13px;"><a href="${undoUrl}">Undo</a></p>`,
    ),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

function humanChannel(c: string): string {
  if (c === 'anniversary') return 'anniversary';
  if (c === 'milestone') return 'milestone';
  return 'product update';
}

function htmlPage(title: string, body: string, extra = ''): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${title} · Pearloom</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #FBF7EE; color: #0E0D0B; max-width: 520px; margin: 64px auto; padding: 0 24px; line-height: 1.55; }
  h1 { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-weight: 500; font-size: 36px; margin: 0 0 12px; }
  p { font-size: 15px; color: #3A332C; margin: 0; }
  a { color: #C6703D; }
</style>
</head><body>
  <h1>${title}</h1>
  <p>${body}</p>
  ${extra}
</body></html>`;
}
