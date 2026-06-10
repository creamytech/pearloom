// ─────────────────────────────────────────────────────────────
// Pearloom / api/cron/anniversary/route.ts
//
// Daily cron: finds sites whose event anniversary lands today and
// emails the host a "today, N years ago" recap with a link to
// /sites/{slug}/recap. Reaching out to RSVP-yes guests is a
// future ship — the host is the first touchpoint.
//
// Auth: CRON_SECRET via Authorization: Bearer <secret>.
// Idempotent: anniversary_email_log gates one send per (site, year).
// Opt-out: site_email_prefs.channel='anniversary' suppresses.
// Suppressed occasions: memorial / funeral.
// Milestone years only: 1, 5, 10, 15, 20, 25, 30, 40, 50.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildAnniversaryEmail } from '@/lib/email/brand-emails';
import { emailThemeFromSuite } from '@/lib/email-sequences';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const ANNIVERSARY_YEARS = new Set([1, 5, 10, 15, 20, 25, 30, 40, 50]);
const SUPPRESSED_OCCASIONS = new Set(['memorial', 'funeral']);

interface SiteRow {
  id: string;
  subdomain: string;
  creator_email: string | null;
  ai_manifest: {
    occasion?: string;
    logistics?: { date?: string };
    names?: [string, string];
  } | null;
  site_config: { creator_email?: string; names?: [string, string] } | null;
}

function isSameMonthDay(iso: string, today: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ') || auth.slice(7) !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, reason: 'no_supabase' });

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
  const resend = resendKey ? new Resend(resendKey) : null;

  const { data, error } = await sb
    .from('sites')
    .select('id, subdomain, creator_email, ai_manifest, site_config')
    .eq('published', true);
  if (error) {
    console.warn('[cron/anniversary]', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const today = new Date();
  let sent = 0;
  let skipped = 0;
  const matches: Array<{ subdomain: string; yearsAgo: number; status: string }> = [];

  for (const row of (data ?? []) as SiteRow[]) {
    try {
      const eventDate = row.ai_manifest?.logistics?.date;
      if (!eventDate || !isSameMonthDay(eventDate, today)) { skipped++; continue; }
      const yearsAgo = today.getFullYear() - new Date(eventDate).getFullYear();
      if (yearsAgo < 1 || !ANNIVERSARY_YEARS.has(yearsAgo)) { skipped++; continue; }

      const occasion = row.ai_manifest?.occasion;
      if (occasion && SUPPRESSED_OCCASIONS.has(occasion)) {
        matches.push({ subdomain: row.subdomain, yearsAgo, status: 'suppressed-occasion' });
        skipped++;
        continue;
      }

      const recipient = row.creator_email ?? row.site_config?.creator_email ?? null;
      if (!recipient) { skipped++; continue; }

      // Idempotency: skip if already sent for this year.
      const { data: existing } = await sb
        .from('anniversary_email_log')
        .select('id')
        .eq('site_id', row.id)
        .eq('year', yearsAgo)
        .eq('channel', 'anniversary')
        .maybeSingle();
      if (existing) {
        matches.push({ subdomain: row.subdomain, yearsAgo, status: 'already-sent' });
        skipped++;
        continue;
      }

      // Honor opt-out.
      const { data: prefs } = await sb
        .from('site_email_prefs')
        .select('opted_out_at')
        .eq('site_id', row.id)
        .eq('channel', 'anniversary')
        .maybeSingle();
      if ((prefs as { opted_out_at?: string } | null)?.opted_out_at) {
        matches.push({ subdomain: row.subdomain, yearsAgo, status: 'opted-out' });
        skipped++;
        continue;
      }

      const names = (row.ai_manifest?.names ?? row.site_config?.names ?? []).filter(Boolean);
      const couple = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'You');
      const recapUrl = `${baseUrl}/sites/${row.subdomain}/recap`;
      const unsubUrl = `${baseUrl}/api/email-prefs?site=${encodeURIComponent(row.id)}&channel=anniversary&action=opt-out`;

      if (!resend) {
        // Dry-run when no Resend key — log the match but don't try
        // to send. Still write the idempotency row so a real send
        // doesn't fire later for the same year.
        await sb.from('anniversary_email_log').insert({ site_id: row.id, year: yearsAgo, channel: 'anniversary' });
        matches.push({ subdomain: row.subdomain, yearsAgo, status: 'dry-run' });
        sent++;
        continue;
      }

      /* Anniversary note wears the couple's own site palette. */
      const emailTheme = row.ai_manifest
        ? emailThemeFromSuite(suiteThemeFromManifest(row.ai_manifest as unknown as StoryManifest))
        : undefined;
      const anniversaryEmail = buildAnniversaryEmail({ couple, yearsAgo, recapUrl, unsubUrl, theme: emailTheme });
      await resend.emails.send({
        from: fromEmail,
        to: recipient,
        subject: anniversaryEmail.subject,
        html: anniversaryEmail.html,
        tags: [
          { name: 'channel', value: 'anniversary' },
          { name: 'site_id', value: row.id },
          { name: 'year',    value: String(yearsAgo) },
        ],
      });

      await sb.from('anniversary_email_log').insert({ site_id: row.id, year: yearsAgo, channel: 'anniversary' });
      matches.push({ subdomain: row.subdomain, yearsAgo, status: 'sent' });
      sent++;
    } catch (err) {
      matches.push({
        subdomain: row.subdomain,
        yearsAgo: 0,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, matches });
}


