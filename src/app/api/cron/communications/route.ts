// ─────────────────────────────────────────────────────────────
// Pearloom / api/cron/communications — the Smart Send Cadence
// dispatcher. The missing half of scheduled_communications:
// hosts have been able to approve + schedule cadence phases
// (save-the-date → invitation → RSVP reminder → day-before →
// thank-you) since 20260602; this cron actually ships them.
//
// Every run: rows WHERE status='scheduled' AND scheduled_at <=
// now(). For each, resolve the site + audience, fan out the
// host-approved copy via the branded cadence email (in the
// couple's site palette), tag sends for the Resend webhook, and
// flip the row to sent/failed with counts.
//
// Channel support today: email. 'mail' (print) and 'sms' are
// recorded as skipped in status_detail until their adapters
// exist; 'push' piggybacks on guest_push_subscriptions later.
//
// Protected by CRON_SECRET (Authorization: Bearer <secret>).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildCadenceEmail } from '@/lib/email/brand-emails';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';
import { suppressedEmails } from '@/lib/email/suppression';
import { emailThemeFromSuite } from '@/lib/email-sequences';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import { buildSiteUrl } from '@/lib/site-urls';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_RECIPIENTS = 500;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface CommRow {
  id: string;
  site_id: string;            // the slug (api/cadence writes siteSlug here)
  owner_email: string;
  phase_id: string;
  label: string;
  channels: string[];
  audience: string | null;
  subject: string | null;
  body: string | null;
}

interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  status: string | null;
  responded_at: string | null;
  guest_token: string | null;
}

function audienceFilter(guests: GuestRow[], audience: string | null): GuestRow[] {
  switch (audience) {
    case 'pending-rsvp': return guests.filter((g) => !g.responded_at);
    case 'attending':    return guests.filter((g) => g.status === 'attending');
    case 'declined':     return guests.filter((g) => g.status === 'declined');
    default:             return guests;
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/communications] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || 'noreply@pearloom.com';
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com').replace(/\/$/, '');

  const { data: due } = await sb
    .from('scheduled_communications')
    .select('id, site_id, owner_email, phase_id, label, channels, audience, subject, body')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(20);

  let dispatched = 0;
  const results: Array<{ id: string; status: string; sent?: number }> = [];

  for (const row of (due ?? []) as CommRow[]) {
    try {
      // Claim the row first — a parallel cron run skips it. The
      // eq('status','scheduled') guard makes the flip atomic.
      const { data: claimed } = await sb
        .from('scheduled_communications')
        .update({ status: 'sending', updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('status', 'scheduled')
        .select('id');
      if (!claimed || claimed.length === 0) continue;

      if (!row.channels.includes('email')) {
        await sb.from('scheduled_communications').update({
          status: 'sent',
          status_detail: `skipped: channels [${row.channels.join(', ')}] have no adapter yet`,
          sent_at: new Date().toISOString(),
          sent_count: 0,
          updated_at: new Date().toISOString(),
        }).eq('id', row.id);
        results.push({ id: row.id, status: 'skipped-no-email-channel' });
        continue;
      }

      // Resolve the site (cadence stores the slug) + theme + couple.
      const { data: site } = await sb
        .from('sites')
        .select('id, subdomain, ai_manifest, site_config')
        .eq('subdomain', row.site_id)
        .maybeSingle();
      if (!site) {
        await sb.from('scheduled_communications').update({
          status: 'failed', status_detail: 'site not found', updated_at: new Date().toISOString(),
        }).eq('id', row.id);
        results.push({ id: row.id, status: 'failed-no-site' });
        continue;
      }
      const manifest = (site as { ai_manifest?: StoryManifest | null }).ai_manifest ?? null;
      const cfgNames = ((site as { site_config?: { names?: [string, string] } }).site_config?.names ?? []) as string[];
      const names = ((manifest as unknown as { names?: string[] } | null)?.names ?? cfgNames).filter(Boolean);
      const couple = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'Your hosts');
      const occasion = (manifest as unknown as { occasion?: string } | null)?.occasion;
      const siteUrl = buildSiteUrl((site as { subdomain: string }).subdomain, '', undefined, occasion);
      const theme = manifest ? emailThemeFromSuite(suiteThemeFromManifest(manifest)) : undefined;

      // Audience.
      const { data: guestRows } = await sb
        .from('guests')
        .select('id, name, email, status, responded_at, guest_token')
        .eq('site_id', (site as { id: string }).id)
        .limit(MAX_RECIPIENTS);
      const recipients = audienceFilter((guestRows ?? []) as GuestRow[], row.audience)
        .filter((g) => g.email);

      // Drop opted-out / bounced addresses. Fail-open on lookup error.
      const suppressed = await suppressedEmails(sb, recipients.map((g) => g.email), (site as { id: string }).id);

      if (recipients.length === 0) {
        await sb.from('scheduled_communications').update({
          status: 'sent',
          status_detail: 'no recipients matched the audience',
          sent_at: new Date().toISOString(),
          sent_count: 0,
          updated_at: new Date().toISOString(),
        }).eq('id', row.id);
        results.push({ id: row.id, status: 'sent-empty' });
        continue;
      }

      const subject = row.subject?.trim() || `${row.label} — ${couple}`;
      const bodyText = row.body?.trim()
        || `A note from ${couple} — everything you need for the day is on the site.`;
      const ctaLabel = row.audience === 'pending-rsvp' ? 'Reply on the site' : 'Open the site';

      let sent = 0;
      let failed = 0;
      let skipped = 0;
      for (const g of recipients) {
        if (g.email && suppressed.has(g.email.toLowerCase())) { skipped++; continue; }
        try {
          const cta = g.guest_token ? `${baseUrl}/g/${g.guest_token}` : siteUrl;
          const { html } = buildCadenceEmail({ couple, body: bodyText, ctaLabel, ctaUrl: cta, theme });
          if (resendKey && g.email) {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: `${couple} <${fromAddress.replace(/^.*</, '').replace(/>.*$/, '')}>`,
                to: [g.email],
                subject,
                html,
                text: htmlToText(html),
                headers: listUnsubHeaders({ email: g.email, siteId: (site as { id: string }).id, channel: 'cadence' }),
                tags: [
                  { name: 'channel', value: 'cadence' },
                  { name: 'phase_id', value: row.phase_id },
                  { name: 'site_id', value: (site as { id: string }).id },
                  { name: 'guest_id', value: g.id },
                ],
              }),
            });
            if (!res.ok) { failed++; continue; }
          }
          // Stamp email_sent_at so the guest-list funnel pips light up.
          await sb.from('guests')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('id', g.id);
          sent++;
        } catch {
          failed++;
        }
      }

      await sb.from('scheduled_communications').update({
        status: failed > 0 && sent === 0 ? 'failed' : 'sent',
        status_detail: resendKey
          ? [
              failed > 0 ? `${failed} of ${recipients.length} failed` : null,
              skipped > 0 ? `${skipped} suppressed` : null,
            ].filter(Boolean).join(' · ') || null
          : 'dry-run: RESEND_API_KEY not set',
        sent_at: new Date().toISOString(),
        sent_count: sent,
        failure_count: failed,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id);

      dispatched++;
      results.push({ id: row.id, status: 'sent', sent });
    } catch (err) {
      await sb.from('scheduled_communications').update({
        status: 'failed',
        status_detail: err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300),
        updated_at: new Date().toISOString(),
      }).eq('id', row.id);
      results.push({ id: row.id, status: 'failed' });
    }
  }

  return NextResponse.json({ ok: true, dispatched, results });
}
