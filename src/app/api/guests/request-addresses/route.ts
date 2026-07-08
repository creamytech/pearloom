// ─────────────────────────────────────────────────────────────
// /api/guests/request-addresses — host-only bulk send of the
// address-collection link (email audit 2026-07-08: the /a/ page
// existed but NO code path ever emailed it; hosts had to copy
// the link by hand).
//
// POST { siteId } → emails every guest who has an email on file
// but no mailing address yet, with the couple's themed note and
// the one-field /a/{slug} form. Owner-only, rate-limited,
// suppression-checked, dry-run without a Resend key.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { checkRateLimit } from '@/lib/rate-limit';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';
import { suppressedEmails } from '@/lib/email/suppression';
import { emailLayout, button, emailThemeFromSuite } from '@/lib/email-sequences';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { max: 4, windowMs: 60 * 60 * 1000 };
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface SiteRow {
  id: string;
  subdomain: string;
  creator_email: string | null;
  ai_manifest: { names?: [string, string] } | null;
  site_config: { creator_email?: string; names?: [string, string] } | null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = checkRateLimit(`request-addresses:${session.user.email}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many sends — try again in an hour.' }, { status: 429 });
  }

  let body: { siteId?: string } = {};
  try { body = await req.json(); } catch { /* → 400 below */ }
  const siteIdRaw = body.siteId?.trim();
  if (!siteIdRaw) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const select = 'id, subdomain, creator_email, ai_manifest, site_config';
  const siteQuery = UUID_RX.test(siteIdRaw)
    ? sb.from('sites').select(select).eq('id', siteIdRaw)
    : sb.from('sites').select(select).eq('subdomain', siteIdRaw);
  const { data: site } = await siteQuery.maybeSingle<SiteRow>();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.creator_email ?? site.site_config?.creator_email ?? '').toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Everyone with an inbox but no envelope line yet.
  const { data: guestRows } = await sb
    .from('guests')
    .select('id, name, email')
    .eq('site_id', site.id)
    .not('email', 'is', null)
    .is('mailing_address_line1', null)
    .limit(500);
  const recipients = ((guestRows ?? []) as Array<{ id: string; name: string; email: string }>)
    .filter((g) => (g.email ?? '').includes('@'));
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, noneMissing: true });
  }

  const suppressed = await suppressedEmails(sb, recipients.map((r) => r.email), site.id);

  const names = (site.ai_manifest?.names ?? site.site_config?.names ?? []).filter(Boolean);
  const couple = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'Your hosts');
  const theme = site.ai_manifest
    ? emailThemeFromSuite(suiteThemeFromManifest(site.ai_manifest as unknown as StoryManifest))
    : undefined;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
  const shareUrl = `${baseUrl}/a/${site.subdomain}`;
  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey ? new Resend(resendKey) : null;
  const fromAddress = (process.env.EMAIL_FROM || 'noreply@pearloom.com').replace(/^.*</, '').replace(/>.*$/, '');

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of recipients) {
    if (suppressed.has(r.email.toLowerCase())) { skipped++; continue; }
    const first = (r.name ?? '').trim().split(/\s+/)[0];
    const html = emailLayout(`
      <tr><td style="padding:44px 36px 0;text-align:center">
        <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;opacity:0.75">An envelope with your name on it</p>
        <h1 style="font-size:30px;font-weight:400;font-style:italic;margin:0 0 14px;line-height:1.2">${esc(couple)}</h1>
        ${first ? `<p style="font-size:14.5px;margin:0 0 10px">Dear <em>${esc(first)}</em>,</p>` : ''}
        <p style="font-size:15px;line-height:1.7;margin:0">
          We're addressing real envelopes and we'd love one to reach
          you. Share your mailing address — it takes ten seconds, and
          only we see it.
        </p>
      </td></tr>
      <tr><td style="padding:24px 36px 44px;text-align:center">
        ${button('Share your address', shareUrl, theme)}
      </td></tr>
    `, theme);

    try {
      if (resend) {
        await resend.emails.send({
          from: `${couple} <${fromAddress}>`,
          to: r.email,
          subject: `Where should we send yours? — ${couple}`,
          html,
          text: htmlToText(html),
          headers: listUnsubHeaders({ email: r.email, siteId: site.id, channel: 'address-collect' }),
          tags: [
            { name: 'channel', value: 'address-collect' },
            { name: 'site_id', value: site.id },
            { name: 'guest_id', value: r.id },
          ],
        });
      }
      sent++;
    } catch (err) {
      console.warn('[request-addresses] send failed:', err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, failed, missing: recipients.length });
}
