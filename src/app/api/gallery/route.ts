// ─────────────────────────────────────────────────────────────
// everglow / api/gallery/route.ts — Guest photo gallery
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Supabase Migration in progress' }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: 'Supabase Migration in progress' }, { status: 501 });
}
