import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlanWithLimitsForEmail, planLimitResponseBody, isSiteGriefExempt } from '@/lib/plan-gate';
import { linkGuestRowToPerson } from '@/lib/people';
import { guestTokenColumns } from '@/lib/guest-tokens';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// GET /api/guests?siteId=xxx — list all guests for a site.
// Accepts:
//   ?siteId=<uuid>     (legacy)
//   ?site=<uuid>       (new)
//   ?siteSlug=<sub>    (Studio passes this — resolved server-side)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    type SiteRow = { id: string; site_config?: { creator_email?: string } | null; creator_email?: string };
    const siteIdParam = req.nextUrl.searchParams.get('siteId') || req.nextUrl.searchParams.get('site');
    const siteSlug = req.nextUrl.searchParams.get('siteSlug') || req.nextUrl.searchParams.get('subdomain');
    if (!siteIdParam && !siteSlug) {
      return NextResponse.json({ error: 'siteId or siteSlug required' }, { status: 400 });
    }
    const supabase = getSupabase();
    // Look up the site row by either id or slug so we can check
    // ownership before returning anyone's guest list.
    const lookup = siteIdParam
      ? supabase.from('sites').select('id, site_config, creator_email').eq('id', siteIdParam).maybeSingle()
      : supabase.from('sites').select('id, site_config, creator_email').eq('subdomain', siteSlug).maybeSingle();
    const { data: siteRow } = await lookup as { data: SiteRow | null };
    if (!siteRow) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
    const ownerEmail = (siteRow.creator_email
      ?? siteRow.site_config?.creator_email
      ?? '').toLowerCase();
    if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const siteId = siteRow.id;

    const hasAddressOnly = req.nextUrl.searchParams.get('hasAddress') === '1';

    let q = supabase
      .from('guests')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true });
    if (hasAddressOnly) {
      q = q.not('mailing_address_line1', 'is', null);
    }
    const { data, error } = await q;

    if (error) {
      console.error('Guests fetch error:', error);
      return NextResponse.json({ guests: [] });
    }

    // Backfill personal-link tokens for rows that predate token
    // minting, so every guest the host sees has a working ?g= link
    // (envelope + auto-recognition + invitation gate). Owner-gated
    // above; best-effort — a failed update just leaves that one row
    // tokenless and it retries next load. After the first pass this
    // is a no-op filter.
    const needTokens = (data || []).filter((r) => !r.guest_token);
    if (needTokens.length > 0) {
      await Promise.all(
        needTokens.map(async (r) => {
          const cols = guestTokenColumns();
          const { error: upErr } = await supabase.from('guests').update(cols).eq('id', r.id);
          if (!upErr) {
            r.guest_token = cols.guest_token;
            r.passport_token = cols.passport_token;
          }
        }),
      );
    }

    const guests = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? null,
      status: row.status || 'pending',
      plusOne: row.plus_one || false,
      plusOneName: row.plus_one_name,
      // Host's per-guest plus-one grant (20260616 migration).
      plusOneAllowed: row.plus_one_allowed || false,
      mealPreference: row.meal_preference,
      dietaryRestrictions: row.dietary_restrictions,
      message: row.message,
      respondedAt: row.responded_at,
      // Lifecycle timestamps for the host's timeline + stale-guest
      // detection. invitedAt is set when the host imports / sends
      // an invite cadence; respondedAt is set on RSVP submit; the
      // email_* timestamps come from the Resend webhook.
      invitedAt: row.invited_at,
      // RSVP-funnel timestamps (20260628) — feed the Analytics funnel's
      // Opened + Started stages.
      inviteOpenedAt: row.invite_opened_at ?? null,
      replyStartedAt: row.reply_started_at ?? null,
      createdAt: row.created_at,
      guestToken: row.guest_token,
      emailSentAt: row.email_sent_at,
      emailDeliveredAt: row.email_delivered_at,
      emailOpenedAt: row.email_opened_at,
      emailClickedAt: row.email_clicked_at,
      emailBouncedAt: row.email_bounced_at,
      // The column is `selected_events` (not `event_ids`) — reading
      // the wrong name silently emptied per-event headcounts.
      eventIds: Array.isArray(row.selected_events) ? row.selected_events : [],
      mailingAddress: row.mailing_address_line1 ? {
        line1: row.mailing_address_line1,
        line2: row.mailing_address_line2,
        city: row.city,
        state: row.state,
        zip: row.postal_code,
      } : null,
    }));

    return NextResponse.json({ guests });
  } catch (err) {
    console.error('Guests error:', err);
    return NextResponse.json({ guests: [] });
  }
}

// POST /api/guests — add a guest manually
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { siteId: siteIdParam, siteSlug, name, email, plusOne, sendInvite } = body;

    if ((!siteIdParam && !siteSlug) || !name) {
      return NextResponse.json({ error: 'siteId (or siteSlug) and name required' }, { status: 400 });
    }

    const supabase = getSupabase();
    /* Resolve siteSlug to siteId + verify ownership. Same shape as
       the GET handler so the editor can post with siteSlug only. */
    let siteId = siteIdParam as string | undefined;
    if (!siteId) {
      type SiteRow = { id: string; site_config?: { creator_email?: string } | null; creator_email?: string };
      const { data: siteRow } = await supabase
        .from('sites')
        .select('id, site_config, creator_email')
        .eq('subdomain', siteSlug)
        .maybeSingle() as { data: SiteRow | null };
      if (!siteRow) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
      const ownerEmail = (siteRow.creator_email ?? siteRow.site_config?.creator_email ?? '').toLowerCase();
      if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      siteId = siteRow.id;
    }

    // Plan gate — maxGuests from PLAN_LIMITS (@/lib/plan-gate).
    // Counts this site's guest rows; fails OPEN if the count query
    // errors so a gate hiccup never blocks adding a guest.
    // Memorial/funeral sites are exempt (the published "grief
    // deserves no paywall" promise — see plan-gate.ts).
    try {
      const { plan, limits } = await getPlanWithLimitsForEmail(session.user.email);
      if (Number.isFinite(limits.maxGuests) && !(await isSiteGriefExempt(supabase, siteId))) {
        const { count, error: countError } = await supabase
          .from('guests')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', siteId);
        if (!countError && typeof count === 'number' && count >= limits.maxGuests) {
          return NextResponse.json(
            planLimitResponseBody('guests', limits.maxGuests, plan),
            { status: 402 },
          );
        }
      }
    } catch (gateErr) {
      console.warn('Guest plan gate check failed (failing open):', gateErr);
    }

    const { data, error } = await supabase
      .from('guests')
      .insert({
        site_id: siteId,
        name,
        email: email || null,
        status: 'pending',
        plus_one: plusOne || false,
        // Personal-link token (envelope + auto-recognition + gate).
        ...guestTokenColumns(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Guest insert error:', error);
      // Return a graceful fake guest if table doesn't exist
      return NextResponse.json({
        guest: { id: `local-${Date.now()}`, name, email, status: 'pending', plusOne: plusOne || false }
      });
    }

    // Persistent guest identity — fire-and-forget link to the
    // people record (migration 20260621). Never blocks the add.
    if (data?.email) {
      void linkGuestRowToPerson(supabase, String(data.id), {
        email: String(data.email),
        name: String(data.name ?? name),
      });
    }

    // Email them their personal invite — only when the host opted in
    // (the Add Guest dialog's "Email them their invite" toggle) and
    // an email is present. Fire-and-forget, key-gated; never blocks
    // the add. Stamps email_sent_at so the roster shows it went out.
    if (sendInvite && data?.email && process.env.RESEND_API_KEY) {
      void (async () => {
        try {
          const { data: site } = await supabase
            .from('sites')
            .select('subdomain, site_config, ai_manifest')
            .eq('id', siteId)
            .maybeSingle();
          if (!site) return;
          const cfg = (site.site_config as { names?: [string, string]; occasion?: string } | null) ?? {};
          const occasion = (site.ai_manifest as { occasion?: string } | null)?.occasion ?? cfg.occasion;
          const names = (cfg.names ?? []).filter(Boolean);
          const coupleDisplay = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'Our celebration');
          const { buildSiteUrl } = await import('@/lib/site-urls');
          const base = buildSiteUrl(String(site.subdomain), '', undefined, occasion);
          const token = (data as { guest_token?: string }).guest_token;
          const personalUrl = token ? `${base}?g=${encodeURIComponent(token)}` : base;
          const { buildGuestInviteEmail } = await import('@/lib/email/brand-emails');
          const { subject, html } = buildGuestInviteEmail({
            guestName: String(data.name ?? name),
            coupleDisplay,
            personalUrl,
          });
          const { Resend } = await import('resend');
          await new Resend(process.env.RESEND_API_KEY).emails.send({
            from: `${coupleDisplay} <invites@pearloom.com>`,
            to: String(data.email),
            subject,
            html,
            text: htmlToText(html),
            headers: listUnsubHeaders(),
            tags: [{ name: 'channel', value: 'guest-invite' }, { name: 'site_id', value: String(siteId) }],
          });
          await supabase.from('guests').update({ email_sent_at: new Date().toISOString() }).eq('id', data.id);
        } catch (e) {
          console.warn('[api/guests] invite email failed (non-fatal):', e);
        }
      })();
    }

    return NextResponse.json({
      guest: {
        id: data.id, name: data.name, email: data.email,
        status: data.status, plusOne: data.plus_one,
      }
    });
  } catch (err) {
    console.error('Add guest error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH /api/guests — update a single guest's editable fields.
// Currently: { id, plusOneAllowed } — the host's per-guest plus-one
// grant. Owner-gated: the guest must belong to a site this host
// created.
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { id?: string; plusOneAllowed?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { id, plusOneAllowed } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (typeof plusOneAllowed !== 'boolean') {
      return NextResponse.json({ error: 'plusOneAllowed must be a boolean' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Ownership — resolve the guest's site, then confirm the session
    // user created it.
    const { data: guestRow } = await supabase
      .from('guests')
      .select('site_id')
      .eq('id', id)
      .maybeSingle();
    if (!guestRow) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

    const { data: site } = await supabase
      .from('sites')
      .select('creator_email, site_config')
      .eq('id', (guestRow as { site_id: string }).site_id)
      .maybeSingle();
    const owner = String(
      (site as { creator_email?: string; site_config?: { creator_email?: string } } | null)?.creator_email
      ?? (site as { site_config?: { creator_email?: string } } | null)?.site_config?.creator_email
      ?? '',
    ).toLowerCase().trim();
    if (!site || owner !== session.user.email.toLowerCase().trim()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('guests')
      .update({ plus_one_allowed: plusOneAllowed })
      .eq('id', id);
    if (error) {
      console.error('Guest patch error:', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true, plusOneAllowed });
  } catch (err) {
    console.error('Guest patch error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/guests?id=xxx — remove a guest
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getSupabase();
    const { error } = await supabase.from('guests').delete().eq('id', id);

    if (error) {
      console.error('Guest delete error:', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Guest delete error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
