// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/guest-passport/route.ts
//
// GET /api/sites/guest-passport?siteSlug=&token=
//   → returns the personalized info for a guest who arrived via
//     their passport link: { guest: { name, table, meal, dietary } }
//
// Public (no auth) since the guest token IS the auth — but we
// only return the guest's own row, never the full list.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteSlug = searchParams.get('siteSlug');
  const token = searchParams.get('token');
  if (!siteSlug || !token) return NextResponse.json({ error: 'siteSlug + token required' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ guest: null });

  // Resolve the site row to get its id.
  const { data: site } = await sb
    .from('sites')
    .select('id')
    .eq('subdomain', siteSlug)
    .maybeSingle();
  if (!site) return NextResponse.json({ guest: null });

  // A personal link's `?g=<token>` may resolve via either column:
  // guest_token (minted on add/import, used by the RSVP gate +
  // dashboard links) or passport_token (minted by the plus-one /
  // invite flow). New rows carry the same value in both; we check
  // passport_token first, then fall back to guest_token, so any
  // link style addresses the envelope.
  const cols = 'name, table_name, meal_preference, dietary_restrictions, attending';
  let { data: guest } = await sb
    .from('guests')
    .select(cols)
    .eq('site_id', site.id)
    .eq('passport_token', token)
    .maybeSingle();
  if (!guest) {
    ({ data: guest } = await sb
      .from('guests')
      .select(cols)
      .eq('site_id', site.id)
      .eq('guest_token', token)
      .maybeSingle());
  }

  if (!guest) return NextResponse.json({ guest: null });

  return NextResponse.json({
    guest: {
      name: guest.name,
      table: guest.table_name ?? null,
      meal: guest.meal_preference ?? null,
      dietary: guest.dietary_restrictions ?? null,
      attending: guest.attending ?? null,
    },
  });
}
