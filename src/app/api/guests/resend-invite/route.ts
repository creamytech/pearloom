// ─────────────────────────────────────────────────────────────
// POST /api/guests/resend-invite  { siteId, guestId }
//
// Re-sends a single guest their personal invite (the same branded
// email + ?g= link as adding them does). Owner-gated. Mints a
// guest token if the row somehow lacks one. Stamps email_sent_at.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { guestTokenColumns } from '@/lib/guest-tokens';
import { buildSiteUrl } from '@/lib/site-urls';
import { buildGuestInviteEmail } from '@/lib/email/brand-emails';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { siteId?: string; guestId?: string };
  try {
    body = (await req.json()) as { siteId?: string; guestId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const siteId = body.siteId?.trim();
  const guestId = body.guestId?.trim();
  if (!siteId || !guestId) {
    return NextResponse.json({ error: 'siteId and guestId required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, sent: false });

  // Owner gate + site display data.
  const { data: site } = await supabase
    .from('sites')
    .select('id, subdomain, creator_email, site_config, ai_manifest')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const cfg = (site.site_config as { creator_email?: string; names?: [string, string]; occasion?: string } | null) ?? {};
  const ownerEmail = String((site as { creator_email?: string }).creator_email ?? cfg.creator_email ?? '').toLowerCase().trim();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // The guest — must belong to this site, must have an email.
  const { data: guest } = await supabase
    .from('guests')
    .select('id, name, email, guest_token')
    .eq('site_id', siteId)
    .eq('id', guestId)
    .maybeSingle();
  if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
  if (!guest.email) {
    return NextResponse.json({ error: 'That guest has no email on file.' }, { status: 400 });
  }

  // Ensure a personal token exists.
  let token = (guest as { guest_token?: string }).guest_token;
  if (!token) {
    const cols = guestTokenColumns();
    await supabase.from('guests').update(cols).eq('id', guestId);
    token = cols.guest_token;
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true, sent: false });
  }

  const occasion = (site.ai_manifest as { occasion?: string } | null)?.occasion ?? cfg.occasion;
  const names = (cfg.names ?? []).filter(Boolean);
  const coupleDisplay = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'Our celebration');
  const base = buildSiteUrl(String(site.subdomain), '', undefined, occasion);
  const personalUrl = `${base}?g=${encodeURIComponent(token)}`;

  try {
    const { subject, html } = buildGuestInviteEmail({
      guestName: String(guest.name ?? ''),
      coupleDisplay,
      personalUrl,
    });
    const { Resend } = await import('resend');
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: `${coupleDisplay} <invites@pearloom.com>`,
      to: String(guest.email),
      subject,
      html,
      text: htmlToText(html),
      headers: listUnsubHeaders(),
      tags: [{ name: 'channel', value: 'guest-invite' }, { name: 'site_id', value: String(siteId) }],
    });
    await supabase.from('guests').update({ email_sent_at: new Date().toISOString() }).eq('id', guestId);
    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error('[guests/resend-invite] send failed:', err);
    return NextResponse.json({ error: 'Could not resend the invite.' }, { status: 500 });
  }
}
