// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/invite/guest/route.ts
// Send per-guest animated stationery emails with unique tokens.
// POST { subdomain, guestIds?: string[], stationeryType?: 'std' | 'invite' | 'thanks' }
//
// stationeryType picks the subject line + email copy. Defaults
// to 'invite' for back-compat. 'std' = save-the-date, 'thanks' =
// thank-you. The CTA points at the PUBLISHED SITE with the
// guest's ?g= passport token — the site-themed Sealed Arrival
// addresses them by name (ATELIER-PLAN INV.2; the /i/ world is
// retired and 301s here).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getServerSession } from 'next-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { authOptions } from '@/lib/auth';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';
import { suppressedEmails } from '@/lib/email/suppression';
import { getSiteConfig } from '@/lib/db';
import { getEventType } from '@/lib/event-os/event-types';
import { isSoloSubject } from '@/lib/event-os/solo-occasions';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import { emailThemeFromSuite, buildStationeryEmail } from '@/lib/email-sequences';
import { buildSiteUrl } from '@/lib/site-urls';
import { guestTokenColumns } from '@/lib/guest-tokens';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  /* One send burst per host per minute — a double-clicked "Send to
     N" must not fire N duplicate emails. */
  const rate = checkRateLimit(`studio-send:${session.user.email}`, { max: 3, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'That batch just went out — give it a minute before sending again.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { subdomain, guestIds, stationeryType } = body as {
      subdomain: string;
      guestIds?: string[];
      stationeryType?: 'std' | 'invite' | 'thanks';
    };
    const cardType: 'std' | 'invite' | 'thanks' =
      stationeryType === 'std' || stationeryType === 'thanks' ? stationeryType : 'invite';

    if (!subdomain) {
      return NextResponse.json({ error: 'subdomain is required' }, { status: 400 });
    }

    const siteConfig = await getSiteConfig(subdomain);
    if (!siteConfig) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const supabase = getSupabase();

    // Verify that this user owns the site
    const { data: siteRow } = await supabase
      .from('sites')
      .select('id, site_config')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (!siteRow) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Normalize both sides — saveSiteDraft / publishSite store the
    // creator_email lowercased + trimmed; NextAuth returns the
    // session email in whatever casing the IdP issued at signup.
    // Comparing raw strings rejects the owner whenever those
    // differ ("Foo@Gmail.com" session vs "foo@gmail.com" stored)
    // and surfaces in the Studio as a 403 on Send. Matches the
    // pattern already used in /api/sites/[domain].
    const ownerEmail = String(
      (siteRow.site_config as Record<string, unknown>)?.creator_email ?? '',
    ).toLowerCase().trim();
    const sessionEmail = session.user.email.toLowerCase().trim();
    if (ownerEmail && ownerEmail !== sessionEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteId: string = siteRow.id as string;

    // Fetch guests — either the specified IDs or all pending guests
    let guestsQuery = supabase
      .from('guests')
      .select('*')
      .eq('site_id', siteId);

    if (guestIds && guestIds.length > 0) {
      guestsQuery = guestsQuery.in('id', guestIds);
    } else if (cardType === 'std') {
      // Save-the-date: every guest on the list, regardless of
      // RSVP status. The host hasn't asked them anything yet.
      // No status filter.
    } else if (cardType === 'thanks') {
      // Thank-you: only the guests who actually attended. We
      // don't have an explicit "attended" status, so 'attending'
      // (i.e. RSVP'd yes) is the closest proxy.
      guestsQuery = guestsQuery.eq('status', 'attending');
    } else {
      // Invitation default — pending guests only, so we don't
      // re-spam those who've already replied.
      guestsQuery = guestsQuery.eq('status', 'pending');
    }

    const { data: guests, error: guestsError } = await guestsQuery;
    if (guestsError) {
      return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
    }

    if (!guests || guests.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, tokens: [] });
    }

    const manifest = siteConfig.manifest;
    const names = siteConfig.names || ['', ''];
    const occasion = manifest?.occasion || 'wedding';
    /* Occasion routing — the registry label ("Bachelorette party",
       "Memorial / Celebration of life") beats the raw hyphenated id
       in guest-facing copy; solemn occasions swap the celebratory
       lines; solo honorees get one name, never "Eleanor & ". */
    const eventType = getEventType(occasion);
    const occasionLabel = (eventType?.label ?? 'celebration').split(' / ')[0].toLowerCase();
    const solemn = eventType?.voice === 'solemn';
    const solo = isSoloSubject(manifest ?? { occasion });
    const displayNames =
      (solo ? [names[0]] : names)
        .map((n) => String(n ?? '').trim())
        .filter(Boolean)
        .join(' & ') || 'Your hosts';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';

    /* The couple's own theme — the SAME SuiteTheme contract the
       site, OG cards, and save-the-date email derive from. The
       old hand-rolled near-black template ignored it entirely
       (ATELIER-PLAN INV.1). */
    const suite = suiteThemeFromManifest(
      (manifest ?? { occasion }) as StoryManifest,
      [String(names[0] ?? ''), String(names[1] ?? '')],
    );
    const themeColors = emailThemeFromSuite(suite);
    const coverPhoto = String(manifest?.coverPhoto ?? '').trim();
    const photoUrl = coverPhoto.startsWith('https://') ? coverPhoto : undefined;
    const eventDateRaw = manifest?.logistics?.date;
    const parsedDate = eventDateRaw ? new Date(`${eventDateRaw}T00:00:00`) : null;
    const dateDisplay = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : undefined;
    const venueName = String(manifest?.logistics?.venue ?? '').trim() || undefined;
    const initA = String(names[0] ?? '').trim().charAt(0).toUpperCase();
    const initB = solo ? '' : String(names[1] ?? '').trim().charAt(0).toUpperCase();
    const monogram = initA ? { initA, initB } : undefined;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email is not configured on this server. Add RESEND_API_KEY and try again.' },
        { status: 503 },
      );
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    /* Skip anyone who opted out (one-click List-Unsubscribe) or whose
       address hard-bounced. Fail-open: a lookup hiccup returns an
       empty set, never blocking the whole send. */
    const suppressed = await suppressedEmails(
      supabase,
      guests.map((g) => (g as Record<string, unknown>).email as string | undefined),
      siteId,
    );

    let sent = 0;
    let failed = 0;
    /* Guests with no email aren't failures — the host needs to
       know to add addresses, not to retry. Counted separately. */
    let noEmail = 0;
    let skipped = 0;
    const tokens: string[] = [];

    for (const guest of guests) {
      const guestEmail = (guest as Record<string, unknown>).email as string | undefined;
      if (!guestEmail) {
        noEmail++;
        continue;
      }
      if (suppressed.has(guestEmail.toLowerCase())) {
        skipped++;
        continue;
      }

      const guestName = (guest as Record<string, unknown>).name as string;

      /* The invite link is the published site ITSELF, carrying the
         guest's passport token — every guest lands in the site-
         themed Sealed Arrival, addressed to them (ATELIER-PLAN
         INV.2). The parallel /i/ invite world is retired; old /i/
         links 301 here. Rows that predate token minting get one. */
      let passportToken = String(
        (guest as Record<string, unknown>).passport_token
        ?? (guest as Record<string, unknown>).guest_token
        ?? '',
      ).trim() || null;
      if (!passportToken) {
        const cols = guestTokenColumns();
        const { error: mintErr } = await supabase
          .from('guests')
          .update(cols)
          .eq('id', (guest as Record<string, unknown>).id);
        if (!mintErr) passportToken = cols.passport_token;
      }
      const publishedUrl = buildSiteUrl(subdomain, '', baseUrl, occasion);
      const inviteUrl = passportToken
        ? `${publishedUrl}?g=${encodeURIComponent(passportToken)}`
        : publishedUrl;
      const token = passportToken ?? '';
      /* One themed email system (emailLayout + SuiteTheme) — the
         copy per cardType/solemn/solo lives in buildStationeryEmail
         so every stationery send shares one voice + one look. */
      const { subject, html } = buildStationeryEmail({
        cardType,
        coupleDisplay: displayNames,
        occasionLabel,
        occasionTitle: (eventType?.label ?? 'Memorial').split(' / ')[0],
        solemn,
        solo,
        guestName: guestName || undefined,
        ctaUrl: inviteUrl,
        dateDisplay,
        venueName,
        photoUrl,
        monogram,
        themeColors,
      });

      const { error: emailError } = await resend.emails.send({
        from: `${displayNames} <invites@pearloom.com>`,
        to: guestEmail,
        subject,
        html,
        text: htmlToText(html),
        headers: listUnsubHeaders({ email: guestEmail, siteId, channel: cardType }),
        // Tag with site_id + guest_id so the Resend webhook
        // (/api/webhooks/resend) lands delivered/opened events
        // on the right guests row. The dashboard's tracking pips
        // and "X opened" nudge depend on this match.
        tags: [
          { name: 'channel', value: String(cardType ?? 'invite') },
          { name: 'site_id', value: String(siteId) },
          { name: 'guest_id', value: String((guest as Record<string, unknown>).id) },
        ],
      });

      if (emailError) {
        console.error('[invite/guest] Resend error for', guestEmail, emailError);
        failed++;
      } else {
        sent++;
        tokens.push(token);
        // Stamp email_sent_at so the dashboard timeline pip lights
        // up immediately. The webhook will set delivered/opened
        // later as events arrive.
        await supabase
          .from('guests')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', (guest as Record<string, unknown>).id);
      }
    }

    return NextResponse.json({ sent, failed, noEmail, tokens, ...(skipped > 0 ? { skipped } : {}) });
  } catch (err) {
    console.error('[invite/guest] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
