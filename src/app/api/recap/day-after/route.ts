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
}): string {
  const { coupleDisplay, recapUrl, photoCount, messageCount } = opts;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(`${coupleDisplay} · your memory book is ready`)}</title>
</head>
<body style="margin:0;padding:0;background:#F0ECE3;font-family:'Geist','Helvetica Neue',Arial,sans-serif;color:#18181B;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F0ECE3;padding:40px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;width:100%;">
      <tr><td align="center" style="padding-bottom:20px;">
        <table cellpadding="0" cellspacing="0" role="presentation"><tr>
          <td style="width:18px;height:1px;background:#B8935A;"></td>
          <td style="padding:0 10px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6F6557;">Yesterday · a look back</td>
          <td style="width:18px;height:1px;background:#B8935A;"></td>
        </tr></table>
      </td></tr>

      <tr><td style="background:#FAF7F2;border:1px solid rgba(184,147,90,0.35);padding:44px 36px;text-align:center;">
        <h1 style="margin:0 0 8px;font-family:'Fraunces',Georgia,serif;font-style:italic;font-weight:400;font-size:38px;line-height:1.1;color:#18181B;letter-spacing:-0.01em;">
          ${esc(coupleDisplay)}
        </h1>
        <p style="margin:0 0 24px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6F6557;">
          Your memory book is ready
        </p>

        <p style="margin:0 0 20px;font-family:'Fraunces',Georgia,serif;font-style:italic;font-size:17px;line-height:1.55;color:#3A332C;">
          The day is in the rearview. Pearloom has pulled together everything
          your guests shared — photos, messages, and their favourite moments —
          into one scrapbook page.
        </p>

        <div style="display:inline-block;margin:14px 0 24px;padding:14px 20px;background:rgba(184,147,90,0.1);border:1px solid rgba(184,147,90,0.3);border-radius:2px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#3A332C;">
          ${photoCount} photo${photoCount === 1 ? '' : 's'} · ${messageCount} message${messageCount === 1 ? '' : 's'}
        </div>

        <div style="margin:20px 0 8px;">
          <a href="${esc(recapUrl)}"
             style="display:inline-block;padding:15px 32px;background:#18181B;color:#FAF7F2;text-decoration:none;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:4px;text-transform:uppercase;border-radius:2px;">
            Open your memory book →
          </a>
        </div>

        <p style="margin:28px 0 0;font-family:'Fraunces',Georgia,serif;font-style:italic;font-size:14px;color:#6F6557;">
          The page updates itself as more guests upload. Bookmark it —
          you&rsquo;ll want to come back on every anniversary.
        </p>
      </td></tr>

      <tr><td align="center" style="padding:20px 0 0;">
        <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#6F6557;">
          Sent with love · Made with Pearloom
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`.trim();
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

    // Gather counts for the email copy.
    const [galleryCount, guestbookCount] = await Promise.all([
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
    ]);

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
    const html = buildEmailHtml({
      coupleDisplay,
      recapUrl,
      photoCount: galleryCount,
      messageCount: guestbookCount,
    });

    if (resend) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: emails,
          subject: `${coupleDisplay} · your memory book is ready`,
          html,
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
