// ─────────────────────────────────────────────────────────────
// /api/guests/nudge — host-only bulk reminder send.
//
// The dashboard's "X opened, no reply" nudge fires this with a
// guest-id list + a body. We fan out via Resend, tag each
// message with site_id + guest_id so the existing webhook
// (/api/webhooks/resend) lands the open/click on the right row,
// and stamp email_sent_at so the dashboard timeline pip lights
// up immediately.
//
// Owner-only via session + creator_email match. Rate limit
// 6 batches per hour per host (a busy week-of moment is 1-2
// sends; anything more is probably an accident).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildNudgeEmail } from '@/lib/email/brand-emails';
import { emailThemeFromSuite } from '@/lib/email-sequences';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { max: 6, windowMs: 60 * 60 * 1000 };
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  guest_token: string | null;
}

interface SiteRow {
  id: string;
  subdomain: string;
  creator_email: string | null;
  ai_manifest: { names?: [string, string]; logistics?: { date?: string } } | null;
  site_config: { creator_email?: string; names?: [string, string] } | null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = checkRateLimit(`guests-nudge:${session.user.email}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many sends — try again in an hour.' }, { status: 429 });
  }

  let body: { siteId?: string; guestIds?: string[]; bodyText?: string; subject?: string } = {};
  try { body = await req.json(); } catch { /* empty body → 400 */ }
  const siteIdRaw = body.siteId?.trim();
  const guestIds = Array.isArray(body.guestIds) ? body.guestIds.filter((x) => typeof x === 'string') : [];
  const bodyText = (body.bodyText ?? '').trim();
  const subject = (body.subject ?? '').trim();

  if (!siteIdRaw) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  if (guestIds.length === 0) return NextResponse.json({ error: 'guestIds required' }, { status: 400 });
  if (guestIds.length > 200) return NextResponse.json({ error: 'Up to 200 guests per batch' }, { status: 400 });
  if (!bodyText || bodyText.length < 12) return NextResponse.json({ error: 'Body too short' }, { status: 400 });
  if (bodyText.length > 4000) return NextResponse.json({ error: 'Body too long' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';

  // Resolve site + ownership check.
  const siteQuery = UUID_RX.test(siteIdRaw)
    ? sb.from('sites').select('id, subdomain, creator_email, ai_manifest, site_config').eq('id', siteIdRaw)
    : sb.from('sites').select('id, subdomain, creator_email, ai_manifest, site_config').eq('subdomain', siteIdRaw);
  const { data: site } = await siteQuery.maybeSingle<SiteRow>();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.creator_email ?? site.site_config?.creator_email ?? '').toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch the recipient rows. Filter to this site's guests so a
  // bad guestId from another site can't leak through.
  const { data: guestRows } = await sb
    .from('guests')
    .select('id, name, email, guest_token')
    .eq('site_id', site.id)
    .in('id', guestIds);
  const recipients = ((guestRows ?? []) as GuestRow[]).filter((g) => g.email);

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: guestIds.length });
  }

  const names = (site.ai_manifest?.names ?? site.site_config?.names ?? []).filter(Boolean);
  const couple = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'us');
  const subjectLine = subject || `A nudge from ${couple}`;

  /* The nudge wears the couple's site palette + faces — same suite
     contract as the save-the-date and RSVP confirmation emails. */
  const emailTheme = site.ai_manifest
    ? emailThemeFromSuite(suiteThemeFromManifest(site.ai_manifest as unknown as StoryManifest))
    : undefined;

  // Dry-run when no Resend key — still stamp email_sent_at so the
  // dashboard timeline reflects the host's intent.
  const resend = resendKey ? new Resend(resendKey) : null;

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    try {
      // Per-guest deep link to /g/{token} when we have it; falls
      // back to the public site so the recipient can RSVP.
      const cta = r.guest_token
        ? `${baseUrl}/g/${r.guest_token}`
        : `${baseUrl}/sites/${site.subdomain}#rsvp`;
      const { html } = buildNudgeEmail({ couple, bodyText, ctaUrl: cta, recipientName: r.name, theme: emailTheme });

      if (resend && r.email) {
        await resend.emails.send({
          from: fromEmail,
          to: r.email,
          subject: subjectLine,
          html,
          tags: [
            { name: 'channel', value: 'rsvp-nudge' },
            { name: 'site_id', value: site.id },
            { name: 'guest_id', value: r.id },
          ],
        });
      }
      await sb
        .from('guests')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', r.id);
      sent++;
    } catch (e) {
      failed++;
      errors.push(`${r.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, sent, failed, errors: errors.slice(0, 10) });
}


