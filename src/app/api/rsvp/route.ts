// ─────────────────────────────────────────────────────────────
// everglow / api/rsvp/route.ts — RSVP endpoint
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Supabase Migration in progress' }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: 'Supabase Migration in progress' }, { status: 501 });
}
