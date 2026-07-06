// ─────────────────────────────────────────────────────────────
// Pearloom / api/cron/notification-digest — "The loom today".
//
// Once a day (vercel.json cron), for every site: derive the last
// 24h of guest activity from lib/notifications/feed.ts (the same
// derivation the bell uses), filter to the categories whose
// email_mode is 'digest' in the owner's prefs, and send ONE
// branded summary email. Sites with nothing to say send nothing.
//
// Idempotency: notification_log channel='digest',
// dedupe_key='digest:{siteId}:{yyyy-mm-dd}' — a retried cron run
// can't double-send.
//
// Protected by CRON_SECRET (Authorization: Bearer <secret>),
// matching /api/cron/email.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchNotificationFeed } from '@/lib/notifications/feed';
import { getNotificationPrefs } from '@/lib/notifications/prefs';
import { buildDailyDigestEmail } from '@/lib/email/brand-emails';
import { emailThemeFromSuite } from '@/lib/email-sequences';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface SiteRow {
  id: string;
  subdomain: string;
  creator_email: string | null;
  ai_manifest: { names?: [string, string] } | null;
  site_config: { creator_email?: string; names?: [string, string] } | null;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/notification-digest] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'Pearloom <noreply@pearloom.com>';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const { data: sites } = await sb
    .from('sites')
    .select('id, subdomain, creator_email, ai_manifest, site_config')
    .limit(500);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const site of (sites ?? []) as SiteRow[]) {
    try {
      const ownerEmail = (site.creator_email ?? site.site_config?.creator_email ?? '').toLowerCase().trim();
      if (!ownerEmail) { skipped++; continue; }

      const items = await fetchNotificationFeed(sb, site.id, since);
      if (items.length === 0) { skipped++; continue; }

      // Per-category prefs — digest carries only digest-mode
      // categories. Instant ones already landed as alerts; 'off'
      // means off.
      const prefs = await getNotificationPrefs(sb, ownerEmail);
      const digestItems = items.filter((i) => prefs[i.category]?.emailMode === 'digest');
      if (digestItems.length === 0) { skipped++; continue; }

      // One per site per day.
      const { data: claimed, error: claimErr } = await sb
        .from('notification_log')
        .upsert(
          {
            channel: 'digest',
            dedupe_key: `digest:${site.id}:${today}`,
            site_id: site.id,
            recipient_email: ownerEmail,
            category: 'digest',
          },
          { onConflict: 'channel,dedupe_key', ignoreDuplicates: true },
        )
        .select('id');
      if (claimErr || !claimed || claimed.length === 0) { skipped++; continue; }

      if (!resendKey) { sent++; continue; } // dry-run: claim made, no key

      const names = (site.ai_manifest?.names ?? site.site_config?.names ?? []).filter(Boolean);
      const coupleDisplay = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? site.subdomain);
      const counts = [
        { n: digestItems.filter((i) => i.category === 'replies').length, noun: 'replies' },
        { n: digestItems.filter((i) => i.category === 'declines').length, noun: 'regrets' },
        // Vendor payment reminders + shared split expenses ride the
        // 'gifts' (money) category but aren't claims — count each
        // under its own noun so "gifts claimed" stays truthful.
        { n: digestItems.filter((i) => i.category === 'gifts' && i.kind !== 'vendor' && i.kind !== 'split').length, noun: 'gifts claimed' },
        { n: digestItems.filter((i) => i.kind === 'vendor').length, noun: 'vendor payments coming due' },
        { n: digestItems.filter((i) => i.kind === 'split').length, noun: 'shared expenses added' },
        { n: digestItems.filter((i) => i.category === 'content').length, noun: 'notes & photos' },
      ];
      const theme = site.ai_manifest
        ? emailThemeFromSuite(suiteThemeFromManifest(site.ai_manifest as unknown as StoryManifest))
        : undefined;
      const { subject, html } = buildDailyDigestEmail({
        coupleDisplay,
        siteLabel: coupleDisplay,
        items: digestItems,
        counts,
        dashboardUrl: `${baseUrl}/dashboard`,
        theme,
      });

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: [ownerEmail],
          subject,
          html,
          tags: [
            { name: 'channel', value: 'daily-digest' },
            { name: 'site_id', value: site.id },
          ],
        }),
      });
      if (!res.ok) {
        errors.push(`${site.subdomain}: resend ${res.status}`);
        continue;
      }
      sent++;
    } catch (err) {
      errors.push(`${site.subdomain}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors: errors.slice(0, 10) });
}
