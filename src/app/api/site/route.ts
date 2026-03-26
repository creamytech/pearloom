// ─────────────────────────────────────────────────────────────
// everglow / api/site/route.ts — Site config endpoint
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Migrating to Supabase multi-tenant DB...' }, { status: 501 });
}
