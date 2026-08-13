// ─────────────────────────────────────────────────────────────
// Pearloom / api/cron/weekly-digest/route.ts
//
// Weekly host digest — the retention email. Scheduled weekly
// (Vercel Cron or external scheduler). For every published site
// with a reachable host, computes the last 7 days of guest
// activity (RSVPs, guestbook notes, photos, mailing addresses)
// and sends a themed "The loom this week" email. Hosts with an
// all-quiet week get nothing — silence is the feature.
//
// Auth: CRON_SECRET via Authorization: Bearer <secret>
//       (same gate as api/cron/email).
//
// RSVP timestamp: guests.responded_at — it's stamped by
// POST /api/rsvp on every submission and is the same column the
// dashboard notification bell + pending-ids route key off.
// created_at marks list import, not the reply, so it would
// over-count; updated_at doesn't exist on guests. Pairing
// .gte('responded_at', since) with a status filter keeps the
// count defensive (pending rows can't sneak in).
//
// Idempotency: one send per (site, ISO week) recorded in
// anniversary_email_log with channel 'weekly-digest' and
// year = isoYear * 100 + isoWeek (e.g. 202624). The table's
// unique (site_id, year, channel) constraint makes the insert
// the lock — no migration needed. Slightly creative use of the
// `year` column, documented here on purpose.
//
// Opt-out: site_email_prefs channel 'product' (the prefs table's
// CHECK constraint allows anniversary | milestone | product; the
// digest is product mail, so it honors that switch).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import { buildWeeklyDigestEmail, emailThemeFromSuite } from '@/lib/email-sequences';
import { buildSiteUrl } from '@/lib/site-urls';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Hard cap on sends per run so a big deployment can't blow the
 *  cron budget — the next weekly run picks up whoever was cut off
 *  (their idempotency row was never written). */
const MAX_SENDS = 200;

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** ISO-8601 week key, e.g. 202624 for 2026-W24. */
function isoWeekKey(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Shift to the Thursday of this week — ISO weeks belong to the
  // year that contains their Thursday.
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const isoYear = t.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return isoYear * 100 + week;
}

interface SiteRow {
  id: string;
  subdomain: string;
  creator_email: string | null;
  ai_manifest: StoryManifest | null;
  site_config: { creator_email?: string; names?: [string, string]; coupleNames?: [string, string] } | null;
}

/** Count rows defensively — a missing table / blocked RLS on one
 *  source reads as 0 instead of failing the whole site. */
async function safeCount(q: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number> {
  try {
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function run(req: NextRequest): Promise<NextResponse> {
  // ── CRON_SECRET gate (same as api/cron/email) ──────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[weekly-digest] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Graceful env degradation ───────────────────────────────
  const sb = getSupabase();
  if (!sb) {
    console.warn('[weekly-digest] Supabase env vars missing — skipping run');
    return NextResponse.json({ ok: true, skipped: 'not configured' });
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('[weekly-digest] RESEND_API_KEY missing — skipping run');
    return NextResponse.json({ ok: true, skipped: 'not configured' });
  }
  const resend = new Resend(resendKey);
  const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com').replace(/\/$/, '');

  const now = new Date();
  const since = new Date(now.getTime() - WINDOW_MS).toISOString();
  const weekKey = isoWeekKey(now);

  // ── Enumerate published sites with a reachable host ────────
  const { data, error } = await sb
    .from('sites')
    .select('id, subdomain, creator_email, ai_manifest, site_config')
    .eq('published', true);
  if (error) {
    console.error('[weekly-digest] sites query failed:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const row of (data ?? []) as SiteRow[]) {
    if (sent >= MAX_SENDS) { skipped++; continue; }
    try {
      const recipient = row.creator_email ?? row.site_config?.creator_email ?? null;
      if (!recipient) { skipped++; continue; }

      // Idempotency — one digest per site per ISO week.
      const { data: existing } = await sb
        .from('anniversary_email_log')
        .select('id')
        .eq('site_id', row.id)
        .eq('year', weekKey)
        .eq('channel', 'weekly-digest')
        .maybeSingle();
      if (existing) { skipped++; continue; }

      // Opt-out (product channel).
      const { data: prefs } = await sb
        .from('site_email_prefs')
        .select('opted_out_at')
        .eq('site_id', row.id)
        .eq('channel', 'product')
        .maybeSingle();
      if ((prefs as { opted_out_at?: string } | null)?.opted_out_at) { skipped++; continue; }

      // ── The week's stats ─────────────────────────────────
      const [attending, declined, pendingTotal, newGuestbook, newPhotos, addressesCollected] =
        await Promise.all([
          safeCount(sb.from('guests').select('id', { count: 'exact', head: true })
            .eq('site_id', row.id).eq('status', 'attending').gte('responded_at', since)),
          safeCount(sb.from('guests').select('id', { count: 'exact', head: true })
            .eq('site_id', row.id).eq('status', 'declined').gte('responded_at', since)),
          safeCount(sb.from('guests').select('id', { count: 'exact', head: true })
            .eq('site_id', row.id).is('responded_at', null)),
          safeCount(sb.from('guestbook').select('id', { count: 'exact', head: true })
            .eq('site_id', row.id).gte('created_at', since)),
          safeCount(sb.from('guest_photos').select('id', { count: 'exact', head: true })
            .eq('site_id', row.id).gte('created_at', since)),
          safeCount(sb.from('guests').select('id', { count: 'exact', head: true })
            .eq('site_id', row.id).gte('address_collected_at', since)),
        ]);

      // All-quiet week → no email. pendingTotal is a standing
      // count, not weekly movement, so it doesn't keep a dead
      // week alive on its own.
      if (attending + declined + newGuestbook + newPhotos + addressesCollected === 0) {
        skipped++;
        continue;
      }

      // ── Theme + names from the Suite contract ────────────
      const manifest = (row.ai_manifest ?? {}) as StoryManifest;
      const looseNames = (manifest as unknown as { names?: [string, string] }).names;
      const namesPair = (looseNames ?? row.site_config?.coupleNames ?? row.site_config?.names ?? ['', '']) as [string, string];
      const filtered = namesPair.filter(Boolean);
      const names = filtered.length >= 2 ? `${filtered[0]} & ${filtered[1]}` : (filtered[0] ?? 'Your celebration');
      const suite = suiteThemeFromManifest(manifest, namesPair);
      const themeColors = emailThemeFromSuite(suite);
      const siteUrl = buildSiteUrl(row.subdomain, '', baseUrl, suite.occasion);

      const { subject, html } = buildWeeklyDigestEmail({
        names,
        siteUrl,
        dashboardBase: baseUrl,
        stats: {
          newRsvps: { attending, declined },
          pendingTotal,
          newGuestbook,
          newPhotos,
          addressesCollected: addressesCollected > 0 ? addressesCollected : undefined,
        },
        themeColors,
      });

      await resend.emails.send({
        from: fromEmail,
        to: recipient,
        subject,
        html,
        tags: [
          { name: 'channel', value: 'weekly-digest' },
          { name: 'site_id', value: row.id },
          { name: 'week', value: String(weekKey) },
        ],
      });

      // Write the idempotency row only after a successful send so
      // a failed send retries next run.
      await sb.from('anniversary_email_log').insert({
        site_id: row.id,
        year: weekKey,
        channel: 'weekly-digest',
      });

      sent++;
    } catch (err) {
      // One bad site must not kill the run.
      console.error(
        `[weekly-digest] site ${row.subdomain} failed:`,
        err instanceof Error ? err.message : err,
      );
      skipped++;
    }
  }

  console.log(`[weekly-digest] Done — sent: ${sent}, skipped: ${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}

export async function GET(req: NextRequest) {
  try {
    return await run(req);
  } catch (err) {
    console.error('[weekly-digest] route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await run(req);
  } catch (err) {
    console.error('[weekly-digest] route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
