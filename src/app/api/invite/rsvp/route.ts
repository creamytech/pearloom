// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/rsvp/route.ts
// GET ?token=… — guest-scoped RSVP lookup for the invite page.
// Resolves the invite_token → guest_id → matching guests row so
// the guest-facing form can hydrate itself (or switch into
// "view / edit my response" mode) on page load.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { data: tokenRow } = await supabase
      .from('invite_tokens')
      .select('guest_id, site_id')
      .eq('token', token)
      .maybeSingle();

    if (!tokenRow) {
      return NextResponse.json({ error: 'invalid token' }, { status: 404 });
    }

    const { data: guest } = await supabase
      .from('guests')
      .select('*')
      .eq('id', tokenRow.guest_id as string)
      .maybeSingle();

    if (!guest) {
      return NextResponse.json({ guest: null, rsvp: null });
    }

    const responded = !!guest.responded_at && guest.status !== 'pending';

    return NextResponse.json({
      guest: {
        id: guest.id,
        name: guest.name,
        email: guest.email,
      },
      rsvp: responded
        ? {
            status: guest.status,
            email: guest.email,
            plusOne: !!guest.plus_one,
            plusOneName: guest.plus_one_name,
            mealPreference: guest.meal_preference,
            dietaryRestrictions: guest.dietary_restrictions,
            songRequest: guest.song_request,
            message: guest.message,
            selectedEvents: guest.event_ids || [],
            mailingAddress: guest.mailing_address,
            respondedAt: guest.responded_at,
          }
        : null,
    });
  } catch (err) {
    console.error('[invite/rsvp] GET error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
