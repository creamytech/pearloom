// ─────────────────────────────────────────────────────────────
// Pearloom / api/co-host/invite/route.ts
// POST — invite someone else to edit this site as a co-host.
// Mints a row in cohost_invites and emails the recipient a magic
// link they can accept.
// Body: { siteSlug, email }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ownerEmailOf } from '@/lib/cohost-access';
import { buildCoHostInviteEmail } from '@/lib/email/brand-emails';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const rate = checkRateLimit(`cohost:${session.user.email}`, { max: 6, windowMs: 3600_000 });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many co-host invites recently. Try again in an hour.' }, { status: 429 });
    }

    const body = await req.json() as { siteSlug?: string; email?: string; phone?: string; role?: string };
    /* Two channels: email (we send the invite) or phone (we mint
       the key and the HOST texts it from their own Messages — no
       SMS provider needed; the link is the credential and accept
       binds to whoever signs in with it). */
    const phoneDigits = (body.phone ?? '').replace(/[^\d+]/g, '');
    const byPhone = phoneDigits.replace(/\D/g, '').length >= 7;
    if (!body.siteSlug || (!body.email && !byPhone)) {
      return NextResponse.json({ error: 'siteSlug and an email or phone number required' }, { status: 400 });
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'That doesn’t look like an email.' }, { status: 400 });
    }
    const role = body.role && ['editor', 'guest-manager', 'viewer'].includes(body.role)
      ? body.role
      : 'editor';

    const supabase = getSupabase();
    type SiteRow = { id: string; subdomain: string; site_config?: { creator_email?: string; coupleNames?: [string, string]; occasion?: string } | null; creator_email?: string };
    const { data: siteRow } = await supabase
      .from('sites')
      .select('id, subdomain, site_config, creator_email')
      .eq('subdomain', body.siteSlug)
      .maybeSingle() as { data: SiteRow | null };
    if (!siteRow) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    const ownerEmail = ownerEmailOf(siteRow);
    if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase().trim()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    /* Mint the invite token. The insert is error-CHECKED — the
       previous version wrote a column that didn't exist and
       ignored the failure, so the email shipped a token that was
       never in the database (every invite was dead on arrival). */
    const token = crypto.randomBytes(24).toString('hex');
    const { error: insertError } = await supabase.from('cohost_invites').insert({
      token,
      site_id: siteRow.id,
      invited_email: body.email ? body.email.toLowerCase() : null,
      /* Phone invites carry a roster-friendly note — last four
         digits only, never the full number. */
      ...(byPhone && !body.email
        ? { note: `Texted to ···${phoneDigits.replace(/\D/g, '').slice(-4)}` }
        : {}),
      invited_by: session.user.email.toLowerCase(),
      role,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (insertError) {
      console.error('[co-host/invite] insert failed:', insertError);
      return NextResponse.json(
        { error: 'Couldn’t create the invite — try again in a moment.' },
        { status: 500 },
      );
    }

    const [a, b] = siteRow.site_config?.coupleNames ?? ['', ''];
    const coupleDisplay = a && b ? `${a} & ${b}` : (a || b || 'the site');
    /* Accept page lives at the APP route /co-host/<token> — the
       previous buildSiteUrl(subdomain, '/co-host/accept?…') form
       produced a published-site sub-path that 404s. */
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
    const acceptUrl = `${baseUrl}/co-host/${token}`;

    /* Phone channel — the host texts the key themselves. No email
       to send; return the link (it's theirs to deliver). */
    if (byPhone && !body.email) {
      return NextResponse.json({ ok: true, acceptUrl, channel: 'sms' });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ ok: true, acceptUrl, note: 'No RESEND_API_KEY — dev mode, email not actually sent.' });
    }

    const { subject, html } = buildCoHostInviteEmail({
      coupleDisplay,
      role,
      acceptUrl,
      invitedBy: session.user.name ?? null,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${coupleDisplay} <invites@pearloom.com>`,
        to: [body.email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Couldn’t send the invite email.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, acceptUrl });
  } catch (err) {
    console.error('[co-host/invite] failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
