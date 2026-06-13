import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlanWithLimitsForEmail, planLimitResponseBody, isSiteGriefExempt } from '@/lib/plan-gate';
import { linkGuestRowToPerson } from '@/lib/people';

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

    const guests = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? null,
      status: row.status || 'pending',
      plusOne: row.plus_one || false,
      plusOneName: row.plus_one_name,
      mealPreference: row.meal_preference,
      dietaryRestrictions: row.dietary_restrictions,
      message: row.message,
      respondedAt: row.responded_at,
      // Lifecycle timestamps for the host's timeline + stale-guest
      // detection. invitedAt is set when the host imports / sends
      // an invite cadence; respondedAt is set on RSVP submit; the
      // email_* timestamps come from the Resend webhook.
      invitedAt: row.invited_at,
      createdAt: row.created_at,
      guestToken: row.guest_token,
      emailSentAt: row.email_sent_at,
      emailDeliveredAt: row.email_delivered_at,
      emailOpenedAt: row.email_opened_at,
      emailClickedAt: row.email_clicked_at,
      emailBouncedAt: row.email_bounced_at,
      eventIds: Array.isArray(row.event_ids) ? row.event_ids : [],
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
    const { siteId: siteIdParam, siteSlug, name, email, plusOne } = body;

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
