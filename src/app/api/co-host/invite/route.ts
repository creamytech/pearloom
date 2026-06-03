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
import { buildSiteUrl } from '@/lib/site-urls';
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
    const allowed = await checkRateLimit(`cohost:${session.user.email}`, { max: 6, windowMs: 3600_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many co-host invites recently. Try again in an hour.' }, { status: 429 });
    }

    const body = await req.json() as { siteSlug?: string; email?: string };
    if (!body.siteSlug || !body.email) {
      return NextResponse.json({ error: 'siteSlug and email required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'That doesn’t look like an email.' }, { status: 400 });
    }

    const supabase = getSupabase();
    type SiteRow = { id: string; subdomain: string; site_config?: { creator_email?: string; coupleNames?: [string, string]; occasion?: string } | null; creator_email?: string };
    const { data: siteRow } = await supabase
      .from('sites')
      .select('id, subdomain, site_config, creator_email')
      .eq('subdomain', body.siteSlug)
      .maybeSingle() as { data: SiteRow | null };
    if (!siteRow) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    const ownerEmail = (siteRow.creator_email ?? siteRow.site_config?.creator_email ?? '').toLowerCase();
    if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    /* Mint the invite token. cohost_invites table is created
       lazily — if it doesn't exist we degrade to a session-only
       success so dev/staging don't break the UI. */
    const token = crypto.randomBytes(24).toString('hex');
    try {
      await supabase.from('cohost_invites').insert({
        token,
        site_id: siteRow.id,
        invited_email: body.email.toLowerCase(),
        invited_by: session.user.email.toLowerCase(),
        role: 'editor',
        accepted_at: null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[co-host] cohost_invites insert failed (table may not exist yet):', err);
      /* Fall through — still try to send the email so the host
         sees the right UX in dev. */
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ ok: true, note: 'No RESEND_API_KEY — dev mode, email not actually sent.' });
    }

    const [a, b] = siteRow.site_config?.coupleNames ?? ['', ''];
    const coupleDisplay = a && b ? `${a} & ${b}` : (a || b || 'the site');
    const acceptUrl = buildSiteUrl(siteRow.subdomain, `/co-host/accept?token=${token}`);

    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#F5EFE2;">
<div style="max-width:520px;margin:0 auto;padding:32px 24px;font-family:Georgia,serif;color:#0E0D0B;">
  <div style="font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#A75D32;margin-bottom:12px;">
    You're invited to co-host
  </div>
  <h1 style="font-size:24px;line-height:1.2;margin:0 0 14px;">${coupleDisplay} would like your help with their site.</h1>
  <p style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#3A332C;margin:0 0 24px;">
    Click below to accept and you'll be able to edit alongside them. The invite expires in 7 days.
  </p>
  <a href="${acceptUrl}" style="display:inline-block;background:#0E0D0B;color:#F5EFE2;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:13px;">
    Accept the invite
  </a>
</div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${coupleDisplay} <invites@pearloom.com>`,
        to: [body.email],
        subject: `${coupleDisplay} invited you to co-host`,
        html,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Couldn’t send the invite email.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[co-host/invite] failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
