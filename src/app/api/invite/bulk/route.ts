// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/bulk/route.ts
// POST — send RSVP invitation emails to a list of guests.
// Body: { siteId, subdomain, guests: [{name, email}], message? }
// Uses Resend. Falls back gracefully if no API key.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildSiteUrl } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

interface BulkInviteRequest {
  siteId: string;
  subdomain: string;
  coupleNames?: string[];
  guests: Array<{ name: string; email: string }>;
  message?: string;
  /** Occasion slug — enables Zola-style URLs in the sent emails. */
  occasion?: string;
}

function buildEmailHtml(
  guestName: string,
  coupleDisplay: string,
  siteUrl: string,
  message: string
): string {
  const safeGuest = guestName.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] || c));
  const safeCouples = coupleDisplay.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] || c));
  const safeMsg = message.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] || c));

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2B2B2B; background: #FAF8F4;">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="display: inline-block; width: 40px; height: 1px; background: #A3B18A; margin-bottom: 16px;"></div>
    <h1 style="font-size: 1.6rem; font-weight: 400; color: #2B2B2B; margin: 0 0 8px; letter-spacing: -0.02em;">
      ${safeCouples}
    </h1>
    <div style="font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: #8A7A4A;">
      Request the pleasure of your company
    </div>
  </div>

  <p style="font-size: 0.95rem; line-height: 1.7; color: #4a4a4a; margin-bottom: 20px;">
    Dear ${safeGuest},
  </p>
  <p style="font-size: 0.95rem; line-height: 1.7; color: #4a4a4a; margin-bottom: 28px;">
    ${safeMsg}
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${siteUrl}/rsvp"
       style="display: inline-block; padding: 14px 36px; background: #A3B18A; color: #fff;
              text-decoration: none; border-radius: 8px; font-size: 0.9rem;
              font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">
      RSVP Now
    </a>
  </div>

  <div style="text-align: center; margin-top: 16px;">
    <a href="${siteUrl}" style="font-size: 0.8rem; color: #8A7A4A; text-decoration: none;">
      View our full wedding website →
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #E0D9CE; margin: 36px 0;">
  <p style="font-size: 0.72rem; color: #999; text-align: center; line-height: 1.6;">
    You received this invitation because ${safeCouples} would love to celebrate with you.<br>
    <a href="${siteUrl}" style="color: #8A7A4A;">Visit website</a>
  </p>
</body>
</html>
`.trim();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 3 bulk sends per hour
  const rateCheck = checkRateLimit(`bulk-invite:${session.user.email}`, { max: 3, windowMs: 60 * 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 3 bulk sends per hour.' }, { status: 429 });
  }

  let body: BulkInviteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { siteId, subdomain, coupleNames = [], guests, message, occasion } = body;
  if (!siteId || !subdomain || !Array.isArray(guests) || guests.length === 0) {
    return NextResponse.json({ error: 'siteId, subdomain, and guests[] required' }, { status: 400 });
  }

  // Validate all guests have email
  const validGuests = guests.filter(g => g.name && g.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email));
  if (validGuests.length === 0) {
    return NextResponse.json({ error: 'No valid guest emails found' }, { status: 400 });
  }
  // Hard cap
  const toSend = validGuests.slice(0, 500);

  const coupleDisplay = coupleNames.filter(Boolean).join(' & ') || 'The Couple';
  const siteUrl = buildSiteUrl(subdomain, '', undefined, occasion);
  const defaultMessage = message?.trim() || `We are delighted to invite you to celebrate our special day. Please visit our website for details and to RSVP.`;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // Simulate success in dev
    return NextResponse.json({
      sent: toSend.length,
      failed: 0,
      note: 'No RESEND_API_KEY configured — emails not sent (dev mode)',
    });
  }

  let sent = 0;
  let failed = 0;

  // Send in batches of 10 to respect rate limits
  const BATCH = 10;
  for (let i = 0; i < toSend.length; i += BATCH) {
    const batch = toSend.slice(i, i + BATCH);
    await Promise.all(batch.map(async (guest) => {
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
            subject: `You're invited — ${coupleDisplay}`,
            html: buildEmailHtml(guest.name, coupleDisplay, siteUrl, defaultMessage),
          }),
        });
        if (res.ok) sent++; else failed++;
      } catch { failed++; }
    }));
  }

  return NextResponse.json({ sent, failed, total: toSend.length });
}
