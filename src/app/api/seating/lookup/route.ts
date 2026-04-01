// ─────────────────────────────────────────────────────────────
// Pearloom / api/seating/lookup/route.ts
// Public "Find My Seat" endpoint — no auth required
// POST { subdomain, name } → { found, table, seat } or { found: false }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // Rate limit: 20 req/min per IP
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`seating-lookup:${ip}`, { max: 20, windowMs: 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    );
  }

  let body: { subdomain?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { subdomain, name } = body;
  if (!subdomain || !name || typeof subdomain !== 'string' || typeof name !== 'string') {
    return NextResponse.json({ error: 'subdomain and name are required' }, { status: 400 });
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return NextResponse.json({ error: 'name must not be empty' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 1. Get site by subdomain → creator_email (userId)
  const { data: siteRow, error: siteErr } = await supabase
    .from('sites')
    .select('site_config')
    .eq('subdomain', subdomain)
    .single();

  if (siteErr || !siteRow) {
    return NextResponse.json({ found: false });
  }

  const creatorEmail = (siteRow.site_config as Record<string, unknown>)?.creator_email as
    | string
    | undefined;
  if (!creatorEmail) {
    return NextResponse.json({ found: false });
  }

  // 2. Get all seating_tables for this user
  const { data: tables, error: tablesErr } = await supabase
    .from('seating_tables')
    .select('id, label, shape, notes')
    .eq('user_id', creatorEmail);

  if (tablesErr || !tables || tables.length === 0) {
    return NextResponse.json({ found: false });
  }

  const tableIds = tables.map((t: Record<string, unknown>) => t.id as string);

  // 3. Try direct name match on rsvps — find rsvp by name ilike, then find occupied seat
  const firstWord = trimmedName.split(/\s+/)[0];

  const { data: rsvpMatches } = await supabase
    .from('rsvps')
    .select('id, name, site_id')
    .or(`name.ilike.%${trimmedName}%,name.ilike.%${firstWord}%`);

  if (rsvpMatches && rsvpMatches.length > 0) {
    for (const rsvp of rsvpMatches as Array<{ id: string; name: string; site_id: string }>) {
      // Find a seat where guest_id matches this rsvp id and table is owned by this user
      const { data: matchedSeats } = await supabase
        .from('seats')
        .select('id, table_id, seat_number, meal_preference')
        .eq('guest_id', rsvp.id)
        .in('table_id', tableIds);

      if (matchedSeats && matchedSeats.length > 0) {
        const seat = matchedSeats[0] as {
          id: string;
          table_id: string;
          seat_number: number;
          meal_preference: string | null;
        };
        const table = tables.find(
          (t: Record<string, unknown>) => t.id === seat.table_id,
        ) as { id: string; label: string; shape: string; notes?: string } | undefined;

        if (table) {
          return NextResponse.json({
            found: true,
            table: {
              label: table.label,
              shape: table.shape,
              notes: table.notes ?? null,
            },
            seat: {
              seatNumber: seat.seat_number,
              mealPreference: seat.meal_preference ?? null,
            },
          });
        }
      }
    }
  }

  // 4. Fallback: scan all occupied seats and match via rsvp lookup per guest_id
  const { data: occupiedSeats } = await supabase
    .from('seats')
    .select('id, table_id, seat_number, meal_preference, guest_id')
    .in('table_id', tableIds)
    .not('guest_id', 'is', null);

  if (occupiedSeats && occupiedSeats.length > 0) {
    const guestIds = [
      ...new Set(
        (occupiedSeats as Array<{ guest_id: string }>).map((s) => s.guest_id),
      ),
    ];

    const { data: rsvpRows } = await supabase
      .from('rsvps')
      .select('id, name')
      .in('id', guestIds)
      .or(`name.ilike.%${trimmedName}%,name.ilike.%${firstWord}%`);

    if (rsvpRows && rsvpRows.length > 0) {
      const matchedRsvpId = (rsvpRows[0] as { id: string; name: string }).id;
      const seat = (
        occupiedSeats as Array<{
          id: string;
          table_id: string;
          seat_number: number;
          meal_preference: string | null;
          guest_id: string;
        }>
      ).find((s) => s.guest_id === matchedRsvpId);

      if (seat) {
        const table = tables.find(
          (t: Record<string, unknown>) => t.id === seat.table_id,
        ) as { id: string; label: string; shape: string; notes?: string } | undefined;

        if (table) {
          return NextResponse.json({
            found: true,
            table: {
              label: table.label,
              shape: table.shape,
              notes: table.notes ?? null,
            },
            seat: {
              seatNumber: seat.seat_number,
              mealPreference: seat.meal_preference ?? null,
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ found: false });
}
