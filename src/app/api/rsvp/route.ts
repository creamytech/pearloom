import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildHostRsvpNotificationEmail } from '@/lib/email/brand-emails';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { linkGuestRowToPerson, resolvePersonId, normalizePersonEmail } from '@/lib/people';
import { isGroupSplitOccasion } from '@/lib/event-os/event-types';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// POST /api/rsvp — submit a guest RSVP from the public site
export async function POST(req: NextRequest) {
  // Rate limit by IP — prevent RSVP spam
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`rsvp:${ip}`, RATE_LIMITS.rsvp);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const {
      siteId,
      guestName,
      email,
      status,
      plusOne,
      plusOneName,
      mealPreference,
      dietaryRestrictions,
      songRequest,
      message,
      selectedEvents,
      mailingAddress,
      // New: non-wedding RSVP form sends these
      preset,
      answers,
      // Personal guest-link token (?g=) — lets invited guests pass
      // the guest-list gate even before their email is typed.
      guestToken,
      // "Found you" — the guest picked themselves from the
      // /api/rsvp/lookup typeahead. Their reply UPDATES that row
      // instead of upserting a duplicate, and counts as invited.
      guestId,
    } = body;

    if (!siteId || !guestName) {
      return NextResponse.json({ error: 'siteId and guestName required' }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const supabase = getSupabase();

    // ── Resolve the site ONCE (uuid or slug) ──────────────────
    // Callers send either the site uuid or the public slug
    // (PublishedSiteShell hands its modal the domain). The upsert
    // needs the real uuid for the site_id FK, and the invitation
    // gate needs the manifest — one lookup serves both.
    const RSVP_UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const siteQuery = supabase.from('sites').select('id, ai_manifest');
    const { data: siteRow } = await (RSVP_UUID_RX.test(String(siteId))
      ? siteQuery.eq('id', siteId)
      : siteQuery.eq('subdomain', siteId)
    ).maybeSingle();
    if (!siteRow) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
    const resolvedSiteId = String(siteRow.id);

    // ── "Found you" row match — verified against THIS site so a
    //    forged id can't touch another celebration's rows. ──────
    let matchedGuestRowId: string | null = null;
    if (typeof guestId === 'string' && RSVP_UUID_RX.test(guestId)) {
      const { data: byId } = await supabase
        .from('guests')
        .select('id')
        .eq('site_id', resolvedSiteId)
        .eq('id', guestId)
        .maybeSingle();
      if (byId) matchedGuestRowId = String(byId.id);
    }

    // ── Personal-link match — a guest who arrived via their ?g=
    //    link reuses that exact row (no duplicate) and counts as
    //    invited. Resolves via either token column (guest_token or
    //    the legacy passport_token). Verified against THIS site.
    if (!matchedGuestRowId && typeof guestToken === 'string' && guestToken.trim()) {
      const tok = guestToken.trim();
      let { data: byToken } = await supabase
        .from('guests')
        .select('id')
        .eq('site_id', resolvedSiteId)
        .eq('guest_token', tok)
        .maybeSingle();
      if (!byToken) {
        ({ data: byToken } = await supabase
          .from('guests')
          .select('id')
          .eq('site_id', resolvedSiteId)
          .eq('passport_token', tok)
          .maybeSingle());
      }
      if (byToken) matchedGuestRowId = String(byToken.id);
    }

    // ── Invitation-only gate (manifest.rsvpConfig.guestListOnly) ──
    // When the host flips it on, only people already ON the guest
    // list may reply: matched by name pick / personal link (both
    // fold into matchedGuestRowId above) or by an email already on
    // the list. Anyone else gets a warm 403 — not a row on the list.
    const gateCfg = (siteRow.ai_manifest as { rsvpConfig?: { guestListOnly?: boolean } } | null)?.rsvpConfig;
    if (gateCfg?.guestListOnly) {
      let invited = matchedGuestRowId !== null;
      if (!invited && email) {
        const { data: byEmail } = await supabase
          .from('guests')
          .select('id')
          .eq('site_id', resolvedSiteId)
          .ilike('email', String(email).trim())
          .limit(1);
        invited = !!byEmail && byEmail.length > 0;
      }
      if (!invited) {
        return NextResponse.json(
          {
            error: 'This celebration is replying by invitation. Please find and pick your name on the guest list. If you can’t find it, reach out to your hosts.',
            guestListOnly: true,
          },
          { status: 403 },
        );
      }
    }

    // The reply payload — shared by both write paths below.
    const replyFields = {
      name: guestName,
      status: status || 'attending',
      plus_one: plusOne || false,
      plus_one_name: plusOne ? plusOneName : null,
      meal_preference: mealPreference || null,
      dietary_restrictions: dietaryRestrictions || null,
      song_request: songRequest || null,
      message: message || null,
      selected_events: selectedEvents || [],
      mailing_address: mailingAddress || null,
      // Preset-driven RSVP columns (20260422_rsvp_preset_answers.sql)
      rsvp_preset: preset || null,
      rsvp_answers: answers && typeof answers === 'object' ? answers : {},
      responded_at: new Date().toISOString(),
    };

    // "Found you" path — UPDATE the matched row. The guest's
    // stored email survives unless they typed a new one, so the
    // host's list never gains a duplicate or loses an address.
    // Otherwise: upsert by email+siteId so guests can update
    // their RSVP on re-submit.
    const { data, error } = matchedGuestRowId
      ? await supabase
          .from('guests')
          .update({
            ...replyFields,
            ...(email ? { email } : {}),
          })
          .eq('id', matchedGuestRowId)
          .select()
          .single()
      : await supabase
          .from('guests')
          .upsert(
            {
              ...replyFields,
              site_id: resolvedSiteId,
              email: email || null,
              created_at: new Date().toISOString(),
            },
            {
              onConflict: 'site_id,email',
              ignoreDuplicates: false,
            }
          )
          .select()
          .single();

    if (error) {
      console.error('[RSVP] Upsert failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        siteId,
        guestName,
      });
      // Surface a clear error to the client so the guest knows their RSVP did not save.
      // Postgres 42P01 = undefined_table — help operators diagnose missing schema quickly.
      const isMissingTable = error.code === '42P01';
      return NextResponse.json(
        {
          error: isMissingTable
            ? 'RSVP storage is not set up yet. Please contact the site owner.'
            : 'We could not save your RSVP. Please try again in a moment.',
          code: error.code || null,
        },
        { status: isMissingTable ? 503 : 500 }
      );
    }

    // Always log new RSVP responses
    console.log('[RSVP] New response from:', guestName, '| Status:', status, '| Site:', siteId);

    // Persistent guest identity — link this RSVP to the person
    // record keyed by email (people table, migration 20260621).
    // Fire-and-forget: identity is a nicety, never blocks an RSVP.
    if (email && (data as { id?: string })?.id) {
      void linkGuestRowToPerson(supabase, String((data as { id: string }).id), {
        email: String(email),
        name: String(guestName),
        dietary: dietaryRestrictions ? String(dietaryRestrictions) : null,
      });
    }

    // Activation instrumentation (Pillar 20): a site's FIRST
    // attending RSVP is true activation — the two-sided loop
    // closing. Deduped on a prior product_events row so re-submits
    // by the same first guest don't re-fire. Fire-and-forget and
    // fully swallowed: a telemetry miss never touches the reply.
    // (The product_events query also fails the block CLOSED before
    // 20260706 is applied — analytics isn't live until the table
    // exists, which is fine.)
    const effectiveStatus = status || 'attending';
    if (effectiveStatus === 'attending' && !error && data) {
      void (async () => {
        try {
          const { data: prior, error: priorErr } = await supabase
            .from('product_events')
            .select('id')
            .eq('event', 'first_rsvp_received')
            .eq('site_id', resolvedSiteId)
            .limit(1);
          if (priorErr || (prior && prior.length > 0)) return;
          const { data: ownerRow } = await supabase
            .from('sites')
            .select('creator_email')
            .eq('id', resolvedSiteId)
            .maybeSingle();
          const { recordProductEvent } = await import('@/lib/analytics/product-events');
          await recordProductEvent('first_rsvp_received', {
            email: (ownerRow as { creator_email?: string } | null)?.creator_email ?? null,
            siteId: resolvedSiteId,
          });
        } catch {
          /* telemetry only — never affects the reply */
        }
      })();
    }

    // Collaborative split — seed a participant (GRAND-PLAN Phase 1).
    // An attending RSVP to a GROUP-SPLIT-shaped event (bachelor/ette,
    // reunion — occasion carried on the manifest) adds this guest to
    // the split roster (public.participants), so the host never has
    // to re-key everyone by hand to start sharing costs. Anchored to
    // their person identity when an email is present, and deduped on
    // the (site_id, person_id) unique index so a repeat RSVP never
    // doubles them; a guest with no email still gets a name-only
    // participant. Fire-and-forget and FULLY SWALLOWED — this must
    // NEVER block, delay, or fail an RSVP (the RSVP path is sacred).
    // Follow-up: this is roster membership only; pre-creating an
    // "expected share" needs a target expense and is out of scope.
    if (
      effectiveStatus === 'attending' && !error && data &&
      isGroupSplitOccasion((siteRow.ai_manifest as { occasion?: string } | null)?.occasion)
    ) {
      void (async () => {
        try {
          const displayName = String(guestName).trim().slice(0, 80);
          if (!displayName) return;
          const normEmail = normalizePersonEmail(email);
          const personId = normEmail
            ? await resolvePersonId(supabase, { email: normEmail, name: displayName })
            : null;
          if (personId) {
            // Already on the roster for this site → no duplicate.
            const { data: existing } = await supabase
              .from('participants')
              .select('id')
              .eq('site_id', resolvedSiteId)
              .eq('person_id', personId)
              .maybeSingle();
            if (existing) return;
          }
          await supabase.from('participants').insert({
            site_id: resolvedSiteId,
            person_id: personId,
            display_name: displayName,
            email: normEmail,
          });
        } catch (err) {
          // Unique-index race or a missing table pre-migration —
          // the roster is a nicety, never the reply.
          console.warn('[RSVP] split participant seed failed (non-fatal):', err);
        }
      })();
    }

    // Song answer → the song_requests table, so RSVP-form picks
    // land in the same queue the Music dashboard and the site's
    // guest playlist read (they used to die on the guest row —
    // half of what hosts collected never reached the queue).
    // Fire-and-forget: a queue hiccup never blocks the RSVP.
    if (songRequest && String(songRequest).trim()) {
      void (async () => {
        try {
          await supabase.from('song_requests').insert({
            site_id: resolvedSiteId,
            guest_name: guestName,
            song_title: String(songRequest).trim().slice(0, 120),
            note: 'From the RSVP form',
          });
        } catch (err) {
          console.warn('[RSVP] song_requests insert failed:', err);
        }
      })();
    }

    // Notify the site owner per their notification prefs.
    // Declines default to an instant email (they change plans);
    // yeses default to the daily digest so a happy day never
    // floods an inbox. Fire-and-forget — never blocks the RSVP.
    void (async () => {
      try {
        const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const q = supabase.from('sites').select('id, subdomain, creator_email, site_config');
        const { data: site } = await (UUID_RX.test(String(siteId))
          ? q.eq('id', siteId)
          : q.eq('subdomain', siteId)
        ).maybeSingle();
        if (!site) return;
        const cfg = (site as { site_config?: { creator_email?: string; names?: [string, string] } }).site_config;
        const ownerEmail = String((site as { creator_email?: string }).creator_email ?? cfg?.creator_email ?? '');
        if (!ownerEmail) return;
        const names = (cfg?.names ?? []).filter(Boolean);
        const siteLabel = names.join(' & ') || ((site as { subdomain?: string }).subdomain ?? String(siteId));
        const declined = status === 'declined';
        const { notifyHost } = await import('@/lib/notifications/notify');
        await notifyHost(supabase, {
          siteId: String((site as { id?: string }).id ?? siteId),
          siteLabel,
          ownerEmail,
          category: declined ? 'declines' : 'replies',
          title: declined
            ? `${String(guestName)} can’t make it`
            : `${String(guestName)} is woven in`,
          body: message ? String(message).slice(0, 200) : undefined,
          href: '/dashboard/rsvp',
          dedupeKey: `rsvp:${(data as { id?: string })?.id ?? `${siteId}:${guestName}`}:${status}`,
        });
      } catch (err) {
        console.warn('[RSVP] owner notify failed (non-fatal):', err);
      }
    })();

    // Non-blocking notification via Resend — fire and forget
    const notifEmail = process.env.NOTIFICATION_EMAIL;
    const resendKey = process.env.RESEND_API_KEY;
    if (notifEmail && resendKey) {
      const resend = new Resend(resendKey);
      const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
      const rows: Array<{ label: string; value: string }> = [
        { label: 'Guest', value: String(guestName) },
        { label: 'Status', value: String(status) },
        ...(email ? [{ label: 'Email', value: String(email) }] : []),
        ...(plusOne ? [{ label: 'Plus one', value: String(plusOneName || 'Yes') }] : []),
        ...(mealPreference ? [{ label: 'Meal', value: String(mealPreference) }] : []),
        ...(songRequest ? [{ label: 'Song request', value: String(songRequest) }] : []),
        ...(message ? [{ label: 'Message', value: String(message) }] : []),
      ];
      const notif = buildHostRsvpNotificationEmail({
        guestName: String(guestName).slice(0, 100),
        attending: status === 'attending',
        siteLabel: String(siteId).slice(0, 60),
        rows,
        dashboardUrl: `${baseUrl}/dashboard/rsvps`,
      });
      resend.emails.send({
        from: fromEmail,
        to: notifEmail,
        subject: notif.subject,
        html: notif.html,
      }).catch((e: unknown) => console.error('[RSVP] Resend error:', e));
    }

    // Non-blocking: send AI-personalized confirmation email to the guest
    if (email && resendKey) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
      fetch(`${baseUrl}/api/rsvp-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          guestName: String(guestName),
          guestEmail: String(email),
          status: String(status),
          events: selectedEvents,
        }),
      }).catch((e: unknown) => console.error('[RSVP] Confirmation email error:', e));
    }

    return NextResponse.json({
      success: true,
      guest: data,
      message: status === 'attending'
        ? "We can't wait to celebrate with you!"
        : "Thank you for letting us know. You'll be missed!",
    });
  } catch (err) {
    console.error('RSVP route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/rsvp?siteId=xxx — read RSVPs (used in dashboard)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const supabase = getSupabase();

    // Verify the session user owns the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('id', siteId)
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

    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('site_id', siteId)
      .order('responded_at', { ascending: false });

    if (error) {
      console.error('[RSVP] GET query error:', error);
      return NextResponse.json({ error: 'Failed to load guests', guests: [] }, { status: 500 });
    }
    return NextResponse.json({ guests: data || [] });
  } catch (err) {
    console.error('[RSVP] GET error:', err);
    return NextResponse.json({ error: 'Internal server error', guests: [] }, { status: 500 });
  }
}
