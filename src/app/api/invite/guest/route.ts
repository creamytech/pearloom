// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/invite/guest/route.ts
// Send per-guest animated stationery emails with unique tokens.
// POST { subdomain, guestIds?: string[], stationeryType?: 'std' | 'invite' | 'thanks' }
//
// stationeryType picks the subject line + email copy. Defaults
// to 'invite' for back-compat. 'std' = save-the-date, 'thanks' =
// thank-you. The CTA always points at /i/<token> so the
// recipient can hit their personalised invite page.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getServerSession } from 'next-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { authOptions } from '@/lib/auth';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';
import { getSiteConfig } from '@/lib/db';
import { getEventType } from '@/lib/event-os/event-types';
import { isSoloSubject } from '@/lib/event-os/solo-occasions';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  /* One send burst per host per minute — a double-clicked "Send to
     N" must not fire N duplicate emails. */
  const rate = checkRateLimit(`studio-send:${session.user.email}`, { max: 3, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'That batch just went out — give it a minute before sending again.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { subdomain, guestIds, stationeryType } = body as {
      subdomain: string;
      guestIds?: string[];
      stationeryType?: 'std' | 'invite' | 'thanks';
    };
    const cardType: 'std' | 'invite' | 'thanks' =
      stationeryType === 'std' || stationeryType === 'thanks' ? stationeryType : 'invite';

    if (!subdomain) {
      return NextResponse.json({ error: 'subdomain is required' }, { status: 400 });
    }

    const siteConfig = await getSiteConfig(subdomain);
    if (!siteConfig) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const supabase = getSupabase();

    // Verify that this user owns the site
    const { data: siteRow } = await supabase
      .from('sites')
      .select('id, site_config')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (!siteRow) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Normalize both sides — saveSiteDraft / publishSite store the
    // creator_email lowercased + trimmed; NextAuth returns the
    // session email in whatever casing the IdP issued at signup.
    // Comparing raw strings rejects the owner whenever those
    // differ ("Foo@Gmail.com" session vs "foo@gmail.com" stored)
    // and surfaces in the Studio as a 403 on Send. Matches the
    // pattern already used in /api/sites/[domain].
    const ownerEmail = String(
      (siteRow.site_config as Record<string, unknown>)?.creator_email ?? '',
    ).toLowerCase().trim();
    const sessionEmail = session.user.email.toLowerCase().trim();
    if (ownerEmail && ownerEmail !== sessionEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId: string = siteRow.id as string;

    // Fetch guests — either the specified IDs or all pending guests
    let guestsQuery = supabase
      .from('guests')
      .select('*')
      .eq('site_id', siteId);

    if (guestIds && guestIds.length > 0) {
      guestsQuery = guestsQuery.in('id', guestIds);
    } else if (cardType === 'std') {
      // Save-the-date: every guest on the list, regardless of
      // RSVP status. The host hasn't asked them anything yet.
      // No status filter.
    } else if (cardType === 'thanks') {
      // Thank-you: only the guests who actually attended. We
      // don't have an explicit "attended" status, so 'attending'
      // (i.e. RSVP'd yes) is the closest proxy.
      guestsQuery = guestsQuery.eq('status', 'attending');
    } else {
      // Invitation default — pending guests only, so we don't
      // re-spam those who've already replied.
      guestsQuery = guestsQuery.eq('status', 'pending');
    }

    const { data: guests, error: guestsError } = await guestsQuery;
    if (guestsError) {
      return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
    }

    if (!guests || guests.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, tokens: [] });
    }

    const manifest = siteConfig.manifest;
    const names = siteConfig.names || ['', ''];
    const occasion = manifest?.occasion || 'wedding';
    /* Occasion routing — the registry label ("Bachelorette party",
       "Memorial / Celebration of life") beats the raw hyphenated id
       in guest-facing copy; solemn occasions swap the celebratory
       lines; solo honorees get one name, never "Eleanor & ". */
    const eventType = getEventType(occasion);
    const occasionLabel = (eventType?.label ?? 'celebration').split(' / ')[0].toLowerCase();
    const solemn = eventType?.voice === 'solemn';
    const solo = isSoloSubject(manifest ?? { occasion });
    const displayNames =
      (solo ? [names[0]] : names)
        .map((n) => String(n ?? '').trim())
        .filter(Boolean)
        .join(' & ') || 'Your hosts';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email is not configured on this server. Add RESEND_API_KEY and try again.' },
        { status: 503 },
      );
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    let sent = 0;
    let failed = 0;
    /* Guests with no email aren't failures — the host needs to
       know to add addresses, not to retry. Counted separately. */
    let noEmail = 0;
    const tokens: string[] = [];

    for (const guest of guests) {
      const guestEmail = (guest as Record<string, unknown>).email as string | undefined;
      if (!guestEmail) {
        noEmail++;
        continue;
      }

      const token = crypto.randomUUID();
      const guestName = (guest as Record<string, unknown>).name as string;

      // Upsert the invite token
      const { error: tokenError } = await supabase.from('invite_tokens').upsert(
        {
          token,
          guest_id: (guest as Record<string, unknown>).id,
          site_id: siteId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'guest_id,site_id' }
      );

      if (tokenError) {
        console.error('[invite/guest] token upsert error:', tokenError);
        failed++;
        continue;
      }

      const inviteUrl = `${baseUrl}/i/${token}`;
      const subject =
        cardType === 'std'    ? `Save the date — ${displayNames}` :
        cardType === 'thanks' ? (solemn ? `With thanks, from the family of ${displayNames}` : `Thank you, from ${displayNames}`) :
        solemn                ? `${(eventType?.label ?? 'Memorial').split(' / ')[0]} for ${displayNames}` :
                                `You're invited to ${displayNames}'s ${occasionLabel}`;
      const eyebrowCopy =
        cardType === 'std'    ? 'Save the date' :
        cardType === 'thanks' ? (solemn ? 'With gratitude' : 'Thank you') :
        solemn                ? 'Join us in remembering' :
                                'You are cordially invited';
      const bodyCopy =
        cardType === 'std'    ? (solemn
          ? `We've set a date to gather and remember together. Open the card for the details and the link to the site.`
          : `We have a date — and a place — and we want you there. Open the card for the details and the link to our site, where everything is unfolding.`) :
        cardType === 'thanks' ? (solemn
          ? `Thank you for standing with us. Open the card for a note from the family.`
          : `Thank you for being there. Every photo on the wall has you in it somewhere. Open the card for the gallery and a note we wrote for you.`) :
        solemn ? `We're gathering to honor a beautiful life. Open the card for the details, and let us know if you can be with us.` :
                                `We have prepared something special just for you.<br/>Open your personal invitation to see all the details<br/>and let us know if you'll be joining us.`;
      const ctaLabel =
        cardType === 'std'    ? 'Open the save-the-date' :
        cardType === 'thanks' ? 'Open your thank-you' :
                                'Open Your Invitation';

      const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0E0B12;font-family:'Georgia',serif;color:#F5F1E8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0E0B12;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="text-align:center;padding-bottom:32px;">
              <div style="display:inline-block;width:48px;height:1px;background:rgba(196,169,106,0.4);vertical-align:middle;margin-right:12px;"></div>
              <span style="color:rgba(196,169,106,0.7);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Pearloom</span>
              <div style="display:inline-block;width:48px;height:1px;background:rgba(196,169,106,0.4);vertical-align:middle;margin-left:12px;"></div>
            </td>
          </tr>
          <tr>
            <td style="background:rgba(163,177,138,0.04);border:1px solid rgba(196,169,106,0.2);border-radius:16px;padding:48px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(196,169,106,0.7);">${esc(eyebrowCopy)}</p>
              <h1 style="margin:0 0 8px;font-size:36px;font-weight:400;color:#F5F1E8;line-height:1.2;">${esc(displayNames)}</h1>
              <p style="margin:0 0 32px;font-size:15px;color:rgba(245,241,232,0.6);letter-spacing:1px;">${
                cardType === 'std'    ? (solemn ? 'in loving memory' : `for the ${esc(occasionLabel)}`) :
                cardType === 'thanks' ? (solemn ? 'with heartfelt thanks' : 'with all our love') :
                solemn                ? 'a gathering to honor a beautiful life' :
                solo                  ? `you're invited to the ${esc(occasionLabel)}` :
                                        `invite you to celebrate their ${esc(occasionLabel)}`
              }</p>

              ${guestName ? `<p style="margin:0 0 32px;font-size:16px;color:rgba(245,241,232,0.8);">Dear <em>${esc(guestName)}</em>,</p>` : ''}

              <p style="margin:0 0 40px;font-size:15px;line-height:1.7;color:rgba(245,241,232,0.7);">${bodyCopy}</p>

              <a href="${esc(inviteUrl)}"
                 style="display:inline-block;padding:16px 40px;background:rgba(196,169,106,0.15);border:1px solid rgba(196,169,106,0.5);border-radius:8px;color:#C4A96A;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;">
                ${esc(ctaLabel)}
              </a>

              <p style="margin:40px 0 0;font-size:12px;color:rgba(245,241,232,0.3);">
                Or copy this link: <span style="color:rgba(196,169,106,0.5);">${esc(inviteUrl)}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding-top:24px;">
              <p style="margin:0;font-size:11px;color:rgba(245,241,232,0.2);">Sent with love via Pearloom · pearloom.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const { error: emailError } = await resend.emails.send({
        from: 'Pearloom <invites@pearloom.com>',
        to: guestEmail,
        subject,
        html,
        text: htmlToText(html),
        headers: listUnsubHeaders(),
        // Tag with site_id + guest_id so the Resend webhook
        // (/api/webhooks/resend) lands delivered/opened events
        // on the right guests row. The dashboard's tracking pips
        // and "X opened" nudge depend on this match.
        tags: [
          { name: 'channel', value: String(cardType ?? 'invite') },
          { name: 'site_id', value: String(siteId) },
          { name: 'guest_id', value: String((guest as Record<string, unknown>).id) },
        ],
      });

      if (emailError) {
        console.error('[invite/guest] Resend error for', guestEmail, emailError);
        failed++;
      } else {
        sent++;
        tokens.push(token);
        // Stamp email_sent_at so the dashboard timeline pip lights
        // up immediately. The webhook will set delivered/opened
        // later as events arrive.
        await supabase
          .from('guests')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', (guest as Record<string, unknown>).id);
      }
    }

    return NextResponse.json({ sent, failed, noEmail, tokens });
  } catch (err) {
    console.error('[invite/guest] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
