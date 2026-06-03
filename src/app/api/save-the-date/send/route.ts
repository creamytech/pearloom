// ─────────────────────────────────────────────────────────────
// Pearloom / api/save-the-date/send/route.ts
// POST — send a lightweight "save the date" email to every guest
// with an email on the site's guest list.
//
// Body:
//   siteSlug: string
//   message?: string       // override copy; defaults to "X & Y are
//                          // getting married — save the date for
//                          // {date}"
//   photoUrl?: string      // optional hero image embedded in card
//   dateDisplay?: string   // free-text date string ("June 2027")
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildSiteUrl } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

const esc = (s: string) =>
  s.replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] || c),
  );

function buildHtml(opts: {
  coupleDisplay: string;
  guestName: string;
  message: string;
  dateDisplay?: string;
  photoUrl?: string;
  ctaUrl: string;
}): string {
  const { coupleDisplay, guestName, message, dateDisplay, photoUrl, ctaUrl } = opts;
  /* Cream + sage + peach palette — matches BRAND.md §5. Single
     wide column, ~520px max. The photo (when present) sits above
     the headline; if absent, the headline carries the card. */
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F5EFE2;">
<div style="max-width:540px;margin:0 auto;padding:32px 24px;font-family:Georgia,serif;color:#0E0D0B;text-align:center;">
  ${photoUrl ? `<img src="${esc(photoUrl)}" alt="" style="display:block;width:100%;max-width:480px;border-radius:14px;margin:0 auto 28px;"/>` : ''}
  <div style="font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#A75D32;margin-bottom:12px;">
    Save the date
  </div>
  <div style="font-size:32px;font-weight:700;line-height:1.05;letter-spacing:-0.02em;margin-bottom:14px;">
    ${esc(coupleDisplay)}
  </div>
  ${dateDisplay ? `<div style="font-style:italic;font-size:18px;color:#3A332C;margin-bottom:24px;">${esc(dateDisplay)}</div>` : ''}
  <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#3A332C;margin:0 auto 28px;max-width:420px;text-align:left;">
    ${esc(`${guestName ? guestName + ', ' : ''}${message}`)}
  </div>
  <a href="${esc(ctaUrl)}" style="display:inline-block;background:#0E0D0B;color:#F5EFE2;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:13px;letter-spacing:0.04em;">
    See the site
  </a>
  <div style="margin-top:32px;font-size:11px;color:#6F6557;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    A formal invitation will follow.
  </div>
</div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const rateKey = `std:${session.user.email}`;
    const allowed = await checkRateLimit(rateKey, { max: 8, windowMs: 3600_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many save-the-date sends recently. Please try again later.' }, { status: 429 });
    }

    const body = await req.json() as {
      siteSlug?: string;
      message?: string;
      photoUrl?: string;
      dateDisplay?: string;
    };
    const { siteSlug } = body;
    if (!siteSlug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });

    const supabase = getSupabase();
    /* Resolve siteSlug → siteId + verify ownership. */
    type SiteRow = {
      id: string; subdomain: string;
      site_config?: { creator_email?: string; coupleNames?: [string, string]; occasion?: string } | null;
      creator_email?: string;
    };
    const { data: siteRow } = await supabase
      .from('sites')
      .select('id, subdomain, site_config, creator_email')
      .eq('subdomain', siteSlug)
      .maybeSingle() as { data: SiteRow | null };
    if (!siteRow) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    const ownerEmail = (siteRow.creator_email ?? siteRow.site_config?.creator_email ?? '').toLowerCase();
    if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const [a, b] = siteRow.site_config?.coupleNames ?? ['', ''];
    const coupleDisplay = a && b ? `${a} & ${b}` : (a || b || 'Save the date');
    const occasion = siteRow.site_config?.occasion;

    /* Pull guests with an email. */
    const { data: guestRows } = await supabase
      .from('guests')
      .select('id, name, email')
      .eq('site_id', siteRow.id)
      .not('email', 'is', null);
    const guests = (guestRows ?? []).filter((g) => g.email);
    if (guests.length === 0) {
      return NextResponse.json({ sent: 0, note: 'No guests with email addresses.' });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ sent: guests.length, note: 'No RESEND_API_KEY — dev mode, emails not actually sent.' });
    }

    const siteUrl = buildSiteUrl(siteSlug, '', occasion);
    const message = (body.message?.trim()) || `${coupleDisplay} are getting married! Save the date${body.dateDisplay ? ` for ${body.dateDisplay}` : ''}. A formal invitation will follow.`;

    let sent = 0; let failed = 0;
    const BATCH = 10;
    for (let i = 0; i < guests.length; i += BATCH) {
      const batch = guests.slice(i, i + BATCH);
      await Promise.all(batch.map(async (g) => {
        try {
          const html = buildHtml({
            coupleDisplay,
            guestName: g.name as string,
            message,
            dateDisplay: body.dateDisplay,
            photoUrl: body.photoUrl,
            ctaUrl: siteUrl,
          });
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `${coupleDisplay} <invites@pearloom.com>`,
              to: [g.email],
              subject: `Save the date — ${coupleDisplay}`,
              html,
            }),
          });
          if (res.ok) sent++; else failed++;
        } catch {
          failed++;
        }
      }));
    }

    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error('[save-the-date] send failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
