// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/live-updates/route.ts
// Day-of live updates feed for wedding sites
// ─────────────────────────────────────────────────────────────
//
// Supabase table schema:
// create table live_updates (
//   id uuid default gen_random_uuid() primary key,
//   subdomain text not null,
//   message text not null,
//   photo_url text,
//   type text default 'misc', -- ceremony | reception | cocktail | misc
//   created_at timestamptz default now()
// );
// create index on live_updates (subdomain, created_at desc);

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Resend } from 'resend';
import { buildBroadcastEmail } from '@/lib/email/brand-emails';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';
import { suppressedEmails } from '@/lib/email/suppression';
import { emailThemeFromSuite } from '@/lib/email-sequences';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

// Hard cap on email broadcasts per site per 24h. Three is plenty
// for a real day-of cadence (ceremony / cocktail+dinner /
// send-off) and keeps a typo from spamming guest inboxes.
const EMAIL_BROADCAST_LIMIT_24H = 3;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Supabase-missing responses return an empty list rather than
// demo live-update messages. Real sites only show what hosts posted.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subdomain = searchParams.get('subdomain');

  if (!subdomain) {
    return NextResponse.json({ error: 'Missing subdomain' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ updates: [] });
  }

  try {
    const { data, error } = await supabase
      .from('live_updates')
      .select('id, message, photo_url, type, created_at, email_broadcast_at, email_recipient_count')
      .eq('subdomain', subdomain)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      // PGRST205 = "table not found in schema cache". Means the
      // 20260502_live_updates migration hasn't been applied to this
      // database yet. Degrade silently — the feature is optional and
      // every consumer treats an empty list as "no updates posted".
      const isMissingTable = (error as { code?: string }).code === 'PGRST205';
      if (!isMissingTable) {
        console.error('[live-updates GET] Supabase error:', error);
      }
      return NextResponse.json({ updates: [], _error: isMissingTable ? 'unconfigured' : error.message });
    }

    return NextResponse.json({ updates: data || [] });
  } catch (err) {
    console.error('[live-updates GET] Error:', err);
    return NextResponse.json({ updates: [] });
  }
}

export async function POST(req: NextRequest) {
  // Only authenticated couple can post live updates
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { subdomain?: string; message?: string; photo_url?: string; type?: string; email?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { subdomain, message, photo_url, type, email: emailBroadcast } = body;

  if (!subdomain || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (message.trim().length > 500) {
    return NextResponse.json({ error: 'Message too long (max 500 characters)' }, { status: 400 });
  }

  const validTypes = ['ceremony', 'reception', 'cocktail', 'misc'];
  const updateType = validTypes.includes(type || '') ? type : 'misc';

  const supabase = getSupabase();

  // Verify the session user owns the site
  if (supabase) {
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('subdomain', subdomain)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Case-insensitive owner check — IdP casing variance otherwise
    // 403s the legitimate owner. Matches /api/sites/[domain].
    if (String(site.creator_email ?? '').toLowerCase().trim()
      !== session.user.email.toLowerCase().trim()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (!supabase) {
    return NextResponse.json({
      success: true,
      update: {
        id: `mock-${Date.now()}`,
        subdomain,
        message: message.trim(),
        photo_url: photo_url || null,
        type: updateType,
        created_at: new Date().toISOString(),
      },
      mock: true,
    });
  }

  try {
    const { data, error } = await supabase
      .from('live_updates')
      .insert([
        {
          subdomain,
          message: message.trim(),
          photo_url: photo_url || null,
          type: updateType,
        },
      ])
      .select('id, message, photo_url, type, created_at')
      .single();

    if (error) {
      console.error('[live-updates POST] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optional email fan-out. The host has explicitly ticked
    // "Also email everyone" — we still cap to 3/day so a typo
    // doesn't spam guest inboxes.
    let emailedTo: number | null = null;
    let emailLimited = false;
    if (emailBroadcast) {
      const result = await emailBroadcastToGuests({
        supabase,
        subdomain,
        message: message.trim(),
        liveUpdateId: data.id,
      }).catch((err) => {
        console.error('[live-updates POST] email fan-out failed:', err);
        return { sent: 0, limited: false };
      });
      emailedTo = result.sent;
      emailLimited = result.limited;
    }

    return NextResponse.json({
      success: true,
      update: data,
      ...(emailBroadcast ? { emailedTo, emailLimited } : {}),
    });
  } catch (err) {
    console.error('[live-updates POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Only the authenticated site owner can remove a broadcast.
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const subdomain = searchParams.get('subdomain');
  if (!id || !subdomain) {
    return NextResponse.json({ error: 'Missing id or subdomain' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ success: true, mock: true });

  // Verify ownership of the site the broadcast belongs to.
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('creator_email')
    .eq('subdomain', subdomain)
    .single();
  if (siteError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }
  if (String(site.creator_email ?? '').toLowerCase().trim()
    !== session.user.email.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Scope the delete to the site too, so an id alone can't reach
  // another site's row.
  const { error } = await supabase
    .from('live_updates')
    .delete()
    .eq('id', id)
    .eq('subdomain', subdomain);
  if (error) {
    console.error('[live-updates DELETE] Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// ─────────────────────────────────────────────────────────────
// emailBroadcastToGuests — fan out a live update to every
// attending guest with an email address. Returns the count sent
// and whether the per-site daily cap was hit (in which case we
// skip the send entirely rather than partial).
// ─────────────────────────────────────────────────────────────

interface EmailBroadcastArgs {
  supabase: ReturnType<typeof getSupabase>;
  subdomain: string;
  message: string;
  liveUpdateId: string;
}

async function emailBroadcastToGuests({
  supabase,
  subdomain,
  message,
  liveUpdateId,
}: EmailBroadcastArgs): Promise<{ sent: number; limited: boolean }> {
  if (!supabase) return { sent: 0, limited: false };

  // Check the 24h cap. We only count rows where
  // email_broadcast_at IS NOT NULL — the partial index makes
  // this fast.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from('live_updates')
    .select('id', { count: 'exact', head: true })
    .eq('subdomain', subdomain)
    .gte('email_broadcast_at', since);
  if ((recentCount ?? 0) >= EMAIL_BROADCAST_LIMIT_24H) {
    return { sent: 0, limited: true };
  }

  // Resolve site → recipients. Send only to attending guests with
  // an email — declined / no-email rows skip naturally.
  const { data: site } = await supabase
    .from('sites')
    .select('id, ai_manifest, site_config')
    .eq('subdomain', subdomain)
    .maybeSingle();
  const siteId = (site as { id?: string } | null)?.id;
  if (!siteId) return { sent: 0, limited: false };
  const manifest = (site as { ai_manifest?: { names?: [string, string]; logistics?: { venue?: string } } } | null)?.ai_manifest;
  const names = (manifest?.names ?? (site as { site_config?: { names?: [string, string] } } | null)?.site_config?.names ?? []).filter(Boolean);
  const couple = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'Your hosts');
  /* The broadcast wears the couple's site palette + faces — same
     suite contract as every other guest-facing email. */
  const emailTheme = manifest
    ? emailThemeFromSuite(suiteThemeFromManifest(manifest as unknown as StoryManifest))
    : undefined;

  const { data: rows } = await supabase
    .from('guests')
    .select('id, name, email, status, guest_token')
    .eq('site_id', siteId)
    .eq('status', 'attending')
    .not('email', 'is', null);
  const recipients = ((rows ?? []) as Array<{ id: string; name: string; email: string | null; guest_token: string | null }>)
    .filter((r) => r.email);
  if (recipients.length === 0) {
    // Stamp the broadcast row so the cap still ticks even when
    // there's nobody to send to (prevents accidental spam loops).
    await supabase
      .from('live_updates')
      .update({ email_broadcast_at: new Date().toISOString(), email_recipient_count: 0 })
      .eq('id', liveUpdateId);
    return { sent: 0, limited: false };
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
  const resend = resendKey ? new Resend(resendKey) : null;

  // Skip opted-out / bounced addresses. Fail-open on lookup error.
  const suppressed = await suppressedEmails(supabase, recipients.map((r) => r.email), siteId);

  let sent = 0;
  for (const r of recipients) {
    if (r.email && suppressed.has(r.email.toLowerCase())) continue;
    try {
      const cta = r.guest_token
        ? `${baseUrl}/g/${r.guest_token}`
        : `${baseUrl}/sites/${subdomain}`;
      const { html } = buildBroadcastEmail({ couple, message, ctaUrl: cta, recipientName: r.name, theme: emailTheme });
      if (resend && r.email) {
        await resend.emails.send({
          from: fromEmail,
          to: r.email,
          subject: `${couple} — quick update`,
          html,
          text: htmlToText(html),
          headers: listUnsubHeaders({ email: r.email, siteId, channel: 'broadcast' }),
          tags: [
            { name: 'channel', value: 'broadcast' },
            { name: 'site_id', value: siteId },
            { name: 'guest_id', value: r.id },
            { name: 'live_update_id', value: liveUpdateId },
          ],
        });
        sent += 1;
      }
    } catch (err) {
      console.error('[live-updates POST] Resend send failed for', r.email, err);
    }
  }

  // Stamp the audit fields on the live_updates row so the
  // host-side composer can show "📧 emailed N guests" beside
  // the post.
  await supabase
    .from('live_updates')
    .update({
      email_broadcast_at: new Date().toISOString(),
      email_recipient_count: sent,
    })
    .eq('id', liveUpdateId);

  return { sent, limited: false };
}


