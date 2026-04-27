// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/invite/guest/route.ts
// Send per-guest animated invitation emails with unique tokens
// POST { subdomain, guestIds?: string[] }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSiteConfig } from '@/lib/db';

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

  try {
    const body = await req.json();
    const { subdomain, guestIds } = body as {
      subdomain: string;
      guestIds?: string[];
    };

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

    const ownerEmail = (siteRow.site_config as Record<string, unknown>)?.creator_email;
    if (ownerEmail !== session.user.email) {
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
    } else {
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
    const occasion = manifest?.occasion || 'celebration';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';

    const resend = new Resend(process.env.RESEND_API_KEY);

    let sent = 0;
    let failed = 0;
    const tokens: string[] = [];

    for (const guest of guests) {
      const guestEmail = (guest as Record<string, unknown>).email as string | undefined;
      if (!guestEmail) {
        failed++;
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
      const coupleNames = `${names[0]} & ${names[1]}`;
      const occasionLabel = occasion === 'wedding' ? 'wedding' : occasion === 'engagement' ? 'engagement' : occasion;
      const subject = `You're invited to ${coupleNames}'s ${occasionLabel}`;

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
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(196,169,106,0.7);">You are cordially invited</p>
              <h1 style="margin:0 0 8px;font-size:36px;font-weight:400;color:#F5F1E8;line-height:1.2;">${esc(coupleNames)}</h1>
              <p style="margin:0 0 32px;font-size:15px;color:rgba(245,241,232,0.6);letter-spacing:1px;">invite you to celebrate their ${esc(occasionLabel)}</p>

              ${guestName ? `<p style="margin:0 0 32px;font-size:16px;color:rgba(245,241,232,0.8);">Dear <em>${esc(guestName)}</em>,</p>` : ''}

              <p style="margin:0 0 40px;font-size:15px;line-height:1.7;color:rgba(245,241,232,0.7);">
                We have prepared something special just for you.<br/>
                Open your personal invitation to see all the details<br/>
                and let us know if you'll be joining us.
              </p>

              <a href="${esc(inviteUrl)}"
                 style="display:inline-block;padding:16px 40px;background:rgba(196,169,106,0.15);border:1px solid rgba(196,169,106,0.5);border-radius:8px;color:#C4A96A;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;">
                Open Your Invitation
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
      });

      if (emailError) {
        console.error('[invite/guest] Resend error for', guestEmail, emailError);
        failed++;
      } else {
        sent++;
        tokens.push(token);
      }
    }

    return NextResponse.json({ sent, failed, tokens });
  } catch (err) {
    console.error('[invite/guest] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
