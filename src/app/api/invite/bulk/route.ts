// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/bulk/route.ts
// POST — send editorial invitation emails to a list of guests.
//
// Body:
//   siteId, subdomain, coupleNames?, occasion?, message?,
//   events?: Array<{ name, date, time?, venue?, address? }>
//   rsvpDeadline?: string
//   guests: Array<{ id?, name, email }>
//
// When `guests[].id` is present, mints (or re-uses) a per-guest
// invite token in `invite_tokens` so the CTA links to /i/[token]
// and the guest's name is pre-filled on the RSVP form. Otherwise
// falls back to a generic /rsvp link.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildSiteUrl } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

interface BulkGuest {
  id?: string;
  name: string;
  email: string;
}

interface BulkEventSummary {
  name: string;
  date?: string;
  time?: string;
  venue?: string;
  address?: string;
}

interface BulkInviteRequest {
  siteId: string;
  subdomain: string;
  coupleNames?: string[];
  guests: BulkGuest[];
  message?: string;
  occasion?: string;
  events?: BulkEventSummary[];
  rsvpDeadline?: string;
}

// ── HTML helpers ─────────────────────────────────────────────
const esc = (s: string) =>
  s.replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] || c),
  );

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

function formatDateLong(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return null;
    const diff = d.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// ── Editorial email template ─────────────────────────────────
function buildEmailHtml(opts: {
  guestName: string;
  coupleDisplay: string;
  ctaUrl: string;
  siteUrl: string;
  message: string;
  events: BulkEventSummary[];
  rsvpDeadline?: string;
  occasionLabel: string;
}): string {
  const {
    guestName,
    coupleDisplay,
    ctaUrl,
    siteUrl,
    message,
    events,
    rsvpDeadline,
    occasionLabel,
  } = opts;

  const [firstName, ...rest] = coupleDisplay.split(' & ');
  const secondName = rest.join(' & ');

  const daysLeft = daysUntil(rsvpDeadline);
  const urgent = daysLeft !== null && daysLeft >= 0 && daysLeft < 21;
  const deadlineLine = rsvpDeadline
    ? urgent
      ? `Kindly respond by ${esc(formatDateLong(rsvpDeadline))} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`
      : `Kindly respond by ${esc(formatDateLong(rsvpDeadline))}`
    : 'Kindly respond';

  const eventRows = events
    .slice(0, 4)
    .map((e) => {
      const dateLine = [formatDateLong(e.date), e.time].filter(Boolean).join(' · ');
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(184,147,90,0.22);">
            <div style="font-family:'Geist Mono','JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#B8935A;margin-bottom:4px;">${esc(e.name)}</div>
            ${dateLine ? `<div style="font-family:'Fraunces',Georgia,serif;font-style:italic;font-size:15px;color:#18181B;">${esc(dateLine)}</div>` : ''}
            ${e.venue ? `<div style="font-size:12px;color:#6F6557;margin-top:2px;">${esc(e.venue)}${e.address ? ` · ${esc(e.address)}` : ''}</div>` : ''}
          </td>
        </tr>`;
    })
    .join('');

  const urgencyBadge = urgent
    ? `<div style="margin:20px auto 0;display:inline-block;padding:6px 14px;background:rgba(139,45,45,0.08);border:1px solid rgba(139,45,45,0.3);border-radius:2px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8B2D2D;">Response Requested</div>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(`You are invited — ${coupleDisplay}`)}</title>
</head>
<body style="margin:0;padding:0;background:#F0ECE3;font-family:'Geist','Helvetica Neue',Arial,sans-serif;color:#18181B;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F0ECE3;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;width:100%;">

        <!-- Masthead -->
        <tr>
          <td align="center" style="padding-bottom:22px;">
            <table cellpadding="0" cellspacing="0" role="presentation"><tr>
              <td style="width:18px;height:1px;background:#B8935A;"></td>
              <td style="padding:0 10px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6F6557;">Invitation · No. 01</td>
              <td style="width:18px;height:1px;background:#B8935A;"></td>
            </tr></table>
          </td>
        </tr>

        <!-- Paper card -->
        <tr>
          <td style="background:#FAF7F2;border:1px solid rgba(184,147,90,0.35);padding:48px 40px;text-align:center;">
            <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6F6557;margin-bottom:24px;">
              Together with their families
            </div>

            <h1 style="margin:0;padding:0;font-family:'Fraunces','Playfair Display',Georgia,serif;font-style:italic;font-weight:400;font-size:42px;line-height:1.05;color:#18181B;letter-spacing:-0.01em;">
              ${esc(firstName)}
            </h1>
            <div style="font-family:'Fraunces',Georgia,serif;font-style:italic;color:#B8935A;font-size:18px;margin:6px 0;">&amp;</div>
            <h1 style="margin:0;padding:0;font-family:'Fraunces','Playfair Display',Georgia,serif;font-style:italic;font-weight:400;font-size:42px;line-height:1.05;color:#18181B;letter-spacing:-0.01em;">
              ${esc(secondName || firstName)}
            </h1>

            <div style="margin:24px 0 20px;">
              <span style="display:inline-block;width:32px;height:1px;background:#B8935A;vertical-align:middle;"></span>
            </div>

            <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6F6557;">
              Request the honour of your company at their ${esc(occasionLabel)}
            </div>
          </td>
        </tr>

        <!-- Guest salutation + message -->
        <tr>
          <td style="background:#FAF7F2;border-left:1px solid rgba(184,147,90,0.35);border-right:1px solid rgba(184,147,90,0.35);padding:0 40px 28px;text-align:center;">
            ${guestName ? `<p style="margin:0 0 12px;font-family:'Fraunces',Georgia,serif;font-style:italic;font-size:18px;color:#3A332C;">Dear ${esc(guestName)},</p>` : ''}
            <p style="margin:0;font-size:14px;line-height:1.7;color:#3A332C;">
              ${esc(message)}
            </p>
          </td>
        </tr>

        ${
          events.length > 0
            ? `
        <!-- Event itinerary -->
        <tr>
          <td style="background:#FAF7F2;border-left:1px solid rgba(184,147,90,0.35);border-right:1px solid rgba(184,147,90,0.35);padding:0 40px 20px;">
            <div style="text-align:center;margin-bottom:10px;">
              <span style="display:inline-block;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6F6557;background:#FAF7F2;padding:0 12px;position:relative;top:7px;">The Itinerary</span>
              <div style="height:1px;background:rgba(184,147,90,0.28);"></div>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              ${eventRows}
            </table>
          </td>
        </tr>`
            : ''
        }

        <!-- CTA -->
        <tr>
          <td style="background:#FAF7F2;border-left:1px solid rgba(184,147,90,0.35);border-right:1px solid rgba(184,147,90,0.35);border-bottom:1px solid rgba(184,147,90,0.35);padding:20px 40px 44px;text-align:center;">
            <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#B8935A;margin-bottom:18px;">
              ${deadlineLine}
            </div>
            <a href="${esc(ctaUrl)}"
               style="display:inline-block;padding:16px 36px;background:#18181B;color:#FAF7F2;text-decoration:none;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:4px;text-transform:uppercase;border-radius:2px;">
              Open Invitation &amp; RSVP
            </a>
            ${urgencyBadge}
            <div style="margin-top:24px;font-size:12px;color:#6F6557;">
              or visit <a href="${esc(siteUrl)}" style="color:#B8935A;text-decoration:none;">${esc(siteUrl.replace(/^https?:\/\//, ''))}</a>
            </div>
          </td>
        </tr>

        <!-- Colophon -->
        <tr>
          <td align="center" style="padding:20px 0 0;">
            <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#6F6557;">
              Set in Fraunces &amp; Geist · Sent with Pearloom
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`.trim();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateCheck = checkRateLimit(`bulk-invite:${session.user.email}`, {
    max: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 3 bulk sends per hour.' },
      { status: 429 },
    );
  }

  let body: BulkInviteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const {
    siteId,
    subdomain,
    coupleNames = [],
    guests,
    message,
    occasion,
    events = [],
    rsvpDeadline,
  } = body;
  if (!siteId || !subdomain || !Array.isArray(guests) || guests.length === 0) {
    return NextResponse.json(
      { error: 'siteId, subdomain, and guests[] required' },
      { status: 400 },
    );
  }

  const validGuests = guests.filter(
    (g) => g.name && g.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email),
  );
  if (validGuests.length === 0) {
    return NextResponse.json({ error: 'No valid guest emails found' }, { status: 400 });
  }
  const toSend = validGuests.slice(0, 500);

  const coupleDisplay = coupleNames.filter(Boolean).join(' & ') || 'The Couple';
  const siteUrl = buildSiteUrl(subdomain, '', undefined, occasion);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
  const occasionLabel =
    occasion === 'wedding'
      ? 'wedding'
      : occasion === 'engagement'
        ? 'engagement party'
        : occasion === 'anniversary'
          ? 'anniversary celebration'
          : occasion === 'birthday'
            ? 'birthday celebration'
            : 'celebration';
  const defaultMessage =
    message?.trim() ||
    'With full hearts, we are delighted to share this moment with you. Every detail of the day has been shaped with the people we love in mind — and you are very much among them.';

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({
      sent: toSend.length,
      failed: 0,
      note: 'No RESEND_API_KEY configured — emails not sent (dev mode)',
    });
  }

  // Mint per-guest tokens for guests that have an id.
  let tokensByGuestId = new Map<string, string>();
  const guestsNeedingTokens = toSend.filter((g) => !!g.id).map((g) => g.id as string);
  if (guestsNeedingTokens.length > 0) {
    try {
      const supabase = getSupabase();
      // Look up any existing tokens first.
      const { data: existing } = await supabase
        .from('invite_tokens')
        .select('token, guest_id')
        .eq('site_id', siteId)
        .in('guest_id', guestsNeedingTokens);
      for (const row of existing || []) {
        tokensByGuestId.set(row.guest_id as string, row.token as string);
      }
      // Mint tokens for any guests still missing one.
      const missing = guestsNeedingTokens.filter((gid) => !tokensByGuestId.has(gid));
      if (missing.length > 0) {
        const rows = missing.map((gid) => ({
          token: crypto.randomUUID(),
          guest_id: gid,
          site_id: siteId,
          created_at: new Date().toISOString(),
        }));
        const { error: insertErr } = await supabase
          .from('invite_tokens')
          .upsert(rows, { onConflict: 'guest_id,site_id' });
        if (!insertErr) {
          for (const row of rows) tokensByGuestId.set(row.guest_id, row.token);
        } else {
          console.error('[invite/bulk] token mint error:', insertErr);
        }
      }
    } catch (err) {
      console.error('[invite/bulk] token lookup failed, falling back to /rsvp:', err);
      tokensByGuestId = new Map();
    }
  }

  let sent = 0;
  let failed = 0;

  const BATCH = 10;
  for (let i = 0; i < toSend.length; i += BATCH) {
    const batch = toSend.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (guest) => {
        const token = guest.id ? tokensByGuestId.get(guest.id) : undefined;
        const ctaUrl = token ? `${baseUrl}/i/${token}` : `${siteUrl}/rsvp`;

        const html = buildEmailHtml({
          guestName: guest.name,
          coupleDisplay,
          ctaUrl,
          siteUrl,
          message: defaultMessage,
          events,
          rsvpDeadline,
          occasionLabel,
        });

        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${coupleDisplay} <invites@pearloom.com>`,
              to: [guest.email],
              subject: `You are invited — ${coupleDisplay}`,
              html,
            }),
          });
          if (res.ok) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }),
    );
  }

  return NextResponse.json({ sent, failed, total: toSend.length });
}
