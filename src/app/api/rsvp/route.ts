// ─────────────────────────────────────────────────────────────
// everglow / api/rsvp/route.ts — RSVP endpoint
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getRsvps, addRsvp } from '@/lib/db';
import type { RsvpResponse } from '@/types';

export async function GET() {
  const rsvps = await getRsvps();
  const attending = rsvps.filter((r) => r.status === 'attending').length;
  const declined = rsvps.filter((r) => r.status === 'declined').length;
  const plusOnes = rsvps.filter((r) => r.plusOne && r.status === 'attending').length;

  return NextResponse.json({
    rsvps,
    stats: {
      total: rsvps.length,
      attending,
      declined,
      pending: rsvps.length - attending - declined,
      totalGuests: attending + plusOnes,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestName, email, status, plusOne, plusOneName, mealPreference, dietaryRestrictions, songRequest, message, eventIds } = body;

    if (!guestName || !email || !status) {
      return NextResponse.json({ error: 'name, email, and rsvp status are required.' }, { status: 400 });
    }

    const rsvp: RsvpResponse = {
      id: `rsvp-${Date.now()}`,
      guestName,
      email,
      status,
      plusOne: !!plusOne,
      plusOneName,
      mealPreference,
      dietaryRestrictions,
      songRequest,
      message,
      eventIds: eventIds || [],
      respondedAt: new Date().toISOString(),
    };

    await addRsvp(rsvp);

    return NextResponse.json({ success: true, rsvp });
  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json({ error: 'Failed to submit RSVP.' }, { status: 500 });
  }
}
