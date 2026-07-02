// ─────────────────────────────────────────────────────────────
// Pearloom / api/save-the-date/send/route.ts
// POST — send a lightweight "save the date" email to every guest
// with an email on the site's guest list.
//
// Body:
//   siteSlug: string
//   message?: string       // override copy; defaults to "X & Y are
//                          // getting married — save the date for
//                          // {date}"
//   photoUrl?: string      // optional hero image embedded in card
//   dateDisplay?: string   // free-text date string ("June 2027")
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAppOrigin } from '@/lib/site-urls';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import { emailThemeFromSuite, buildSaveTheDateEmail } from '@/lib/email-sequences';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';
import type { StoryManifest } from '@/types';

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
    const rateKey = `std:${session.user.email}`;
    const allowed = await checkRateLimit(rateKey, { max: 8, windowMs: 3600_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many save-the-date sends recently. Please try again later.' }, { status: 429 });
    }

    const body = await req.json() as {
      siteSlug?: string;
      message?: string;
      photoUrl?: string;
      dateDisplay?: string;
    };
    const { siteSlug } = body;
    if (!siteSlug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });

    const supabase = getSupabase();
    /* Resolve siteSlug → siteId + verify ownership. */
    type SiteRow = {
      id: string; subdomain: string;
      site_config?: {
        creator_email?: string; coupleNames?: [string, string];
        names?: string[]; occasion?: string;
      } | null;
      creator_email?: string;
      ai_manifest?: StoryManifest | null;
    };
    const { data: siteRow } = await supabase
      .from('sites')
      .select('id, subdomain, site_config, creator_email, ai_manifest')
      .eq('subdomain', siteSlug)
      .maybeSingle() as { data: SiteRow | null };
    if (!siteRow) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    const ownerEmail = (siteRow.creator_email ?? siteRow.site_config?.creator_email ?? '').toLowerCase();
    if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const [a, b] = siteRow.site_config?.coupleNames
      ?? (siteRow.site_config?.names as [string, string] | undefined)
      ?? ['', ''];
    const coupleDisplay = a && b ? `${a} & ${b}` : (a || b || 'Save the date');

    // The Suite contract — palette, fonts, monogram all derive from
    // the couple's pack so the email wears the exact site look.
    const suite = suiteThemeFromManifest(
      (siteRow.ai_manifest ?? {}) as StoryManifest,
      [a ?? '', b ?? ''],
    );
    const themeColors = emailThemeFromSuite(suite);

    /* Pull guests with an email. */
    const { data: guestRows } = await supabase
      .from('guests')
      .select('id, name, email')
      .eq('site_id', siteRow.id)
      .not('email', 'is', null);
    const guests = (guestRows ?? []).filter((g) => g.email);

    /* Per-guest passport tokens — one batched lookup so each
       recipient's envelope link personalizes ("Dear Maya") on the
       reveal page. The guests table doesn't carry the token;
       pearloom_guests does, keyed by site + lowercased email. */
    const tokenByEmail = new Map<string, string>();
    try {
      const emails = guests.map((g) => String(g.email).toLowerCase());
      const { data: passportRows } = await supabase
        .from('pearloom_guests')
        .select('email, guest_token')
        .eq('site_id', siteRow.id)
        .in('email', emails);
      for (const row of passportRows ?? []) {
        if (row.email && row.guest_token) tokenByEmail.set(String(row.email).toLowerCase(), String(row.guest_token));
      }
    } catch {
      /* tokens are a nice-to-have — the bare reveal link still works */
    }
    if (guests.length === 0) {
      return NextResponse.json({ sent: 0, note: 'No guests with email addresses.' });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ sent: guests.length, note: 'No RESEND_API_KEY — dev mode, emails not actually sent.' });
    }

    /* The CTA opens the themed reveal page (/std/[siteSlug]) — the
       envelope, seal, and card experience — not the bare site. */
    const revealBase = `${getAppOrigin()}/std/${encodeURIComponent(siteSlug)}`;
    const message = (body.message?.trim()) || `${coupleDisplay} are getting married! Save the date${body.dateDisplay ? ` for ${body.dateDisplay}` : ''}. A formal invitation will follow.`;

    let sent = 0; let failed = 0;
    const BATCH = 10;
    for (let i = 0; i < guests.length; i += BATCH) {
      const batch = guests.slice(i, i + BATCH);
      await Promise.all(batch.map(async (g) => {
        try {
          const { subject, html } = buildSaveTheDateEmail({
            coupleDisplay,
            guestName: g.name as string,
            message,
            dateDisplay: body.dateDisplay,
            venueName: suite.venue ?? undefined,
            photoUrl: body.photoUrl,
            ctaUrl: (() => {
              const tok = tokenByEmail.get(String(g.email).toLowerCase());
              return tok ? `${revealBase}?g=${encodeURIComponent(tok)}` : revealBase;
            })(),
            // Crest only when we genuinely have two initials (or the
            // host set an explicit monogram) — solo events would
            // otherwise crest with the 'B' placeholder initial.
            monogram: (a && b) || siteRow.ai_manifest?.monogram?.initials
              ? { initA: suite.monogram.initA, initB: suite.monogram.initB }
              : undefined,
            themeColors,
          });
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `${coupleDisplay} <invites@pearloom.com>`,
              to: [g.email],
              subject,
              html,
              text: htmlToText(html),
              headers: listUnsubHeaders(),
            }),
          });
          if (res.ok) sent++; else failed++;
        } catch {
          failed++;
        }
      }));
    }

    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error('[save-the-date] send failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
