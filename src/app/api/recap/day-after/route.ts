// ─────────────────────────────────────────────────────────────
// Pearloom / api/recap/day-after/route.ts
//
// Vercel cron target. Scans every published site whose event
// date was yesterday and fires a one-time 'Your memory book is
// ready' email to the creator (+ every co-host). Pulls live
// counts of gallery photos, guestbook entries, and RSVPs so the
// email feels rich, then links to /sites/{subdomain}/recap.
//
// Idempotent — a `recap_sent_at` column on sites guards against
// double-sending if the cron fires twice. Safe to hit daily.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';
import { emailLayout, button, emailThemeFromSuite, type EmailThemeColors } from '@/lib/email-sequences';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import type { StoryManifest } from '@/types';
import { getApprovedGuestPhotos } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface ManifestShape {
  names?: [string, string];
  events?: Array<{ date?: string }>;
  logistics?: { date?: string };
}

function eventDate(m: ManifestShape | null): string | null {
  if (!m) return null;
  const primary = m.events?.[0]?.date || m.logistics?.date;
  if (!primary) return null;
  return primary.slice(0, 10);
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(opts: {
  coupleDisplay: string;
  recapUrl: string;
  photoCount: number;
  messageCount: number;
  theme?: EmailThemeColors;
}): string {
  /* The day-after recap wears the couple's own theme through the
     shared emailLayout shell — same contract as every other send
     (it used to be a hand-rolled, unthemed one-off). */
  const { coupleDisplay, recapUrl, photoCount, messageCount, theme } = opts;
  const t = theme;
  const counts = `${photoCount} photo${photoCount === 1 ? '' : 's'} · ${messageCount} message${messageCount === 1 ? '' : 's'}`;
  return emailLayout(`
    <tr><td style="padding:44px 36px 0;text-align:center">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;opacity:0.75">Yesterday · a look back</p>
      <h1 style="font-size:34px;font-weight:400;font-style:italic;margin:0 0 8px;line-height:1.15">${esc(coupleDisplay)}</h1>
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 20px;opacity:0.75">Your memory book is ready</p>
      <p style="font-size:15px;line-height:1.7;margin:0 0 18px">
        The day is in the rearview. Pear has gathered everything your
        guests shared — photos, messages, and their favourite moments —
        into one page.
      </p>
      <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px;opacity:0.8">${esc(counts)}</p>
    </td></tr>
    <tr><td style="padding:0 36px 16px;text-align:center">
      ${button('Open your memory book', recapUrl, t)}
    </td></tr>
    <tr><td style="padding:0 36px 40px;text-align:center">
      <p style="font-size:13.5px;font-style:italic;margin:0;opacity:0.8">
        The page keeps weaving as more guests upload — come back on
        every anniversary.
      </p>
    </td></tr>
  `, t);
}

async function runDayAfter(force?: string) {
  const supabase = getSupabase();
  const targetDate = force || yesterdayISO();

  // Pull published sites with a recap not yet sent. We over-select then
  // filter by manifest event date in JS (event date lives in JSON).
  const { data: sites } = await supabase
    .from('sites')
    .select('id, subdomain, site_config, ai_manifest, creator_email, recap_sent_at')
    .eq('published', true)
    .is('recap_sent_at', null);

  if (!sites || sites.length === 0) {
    return { checked: 0, sent: 0, skipped: 0 };
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey ? new Resend(resendKey) : null;
  const fromEmail = process.env.EMAIL_FROM || 'recap@pearloom.com';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';

  let sent = 0;
  let skipped = 0;
  for (const site of sites) {
    const m = site.ai_manifest as ManifestShape | null;
    const ed = eventDate(m);
    if (ed !== targetDate) {
      skipped++;
      continue;
    }
    const siteConfig = (site.site_config as Record<string, unknown>) || {};
    const names = (siteConfig.names as [string, string]) || ['', ''];
    const coupleDisplay = names.filter(Boolean).join(' & ') || 'You';

    // Gather counts for the email copy. gallery_photos is keyed by
    // the sites.id UUID; the guest photo wall (guest_photos) is keyed
    // by subdomain — both feed the recap, so the "N photos" line must
    // count both, otherwise a guest-only wall reads as an empty book.
    // Only APPROVED guest photos count (pending/rejected never
    // surface on the recap the email links to).
    const [galleryCount, guestbookCount, guestPhotos] = await Promise.all([
      supabase
        .from('gallery_photos')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', site.id as string)
        .then((r) => r.count || 0),
      supabase
        .from('guestbook_messages')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', site.id as string)
        .then((r) => r.count || 0),
      getApprovedGuestPhotos(site.subdomain as string),
    ]);
    const photoCount = galleryCount + guestPhotos.length;

    // Recipient list: creator + every co-host with editor / guest-manager role.
    const { data: hosts } = await supabase
      .from('cohosts')
      .select('email, role')
      .eq('site_id', site.id as string);
    const emails = Array.from(
      new Set(
        [
          site.creator_email as string,
          ...((hosts as Array<{ email: string }>) || []).map((h) => h.email),
        ].filter(Boolean),
      ),
    );

    const recapUrl = `${baseUrl}/sites/${site.subdomain}/recap`;
    let recapTheme: EmailThemeColors | undefined;
    try {
      recapTheme = emailThemeFromSuite(
        suiteThemeFromManifest((site.ai_manifest ?? {}) as StoryManifest, [coupleDisplay, '']),
      );
    } catch { /* brand default is a fine fallback */ }
    const html = buildEmailHtml({
      coupleDisplay,
      recapUrl,
      photoCount,
      messageCount: guestbookCount,
      theme: recapTheme,
    });

    if (resend) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: emails,
          subject: `${coupleDisplay} · your memory book is ready`,
          html,
          text: htmlToText(html),
          headers: listUnsubHeaders(),
        });
      } catch (err) {
        console.error('[recap] send failed:', err);
        continue;
      }
    }

    await supabase
      .from('sites')
      .update({ recap_sent_at: new Date().toISOString() })
      .eq('id', site.id as string);
    sent++;
  }

  return { checked: sites.length, sent, skipped };
}

export async function GET(req: NextRequest) {
  // Cron + manual trigger both go here. Protect with a shared secret.
  const auth = req.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const force = req.nextUrl.searchParams.get('date') || undefined;
  const result = await runDayAfter(force ?? undefined);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
