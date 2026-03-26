// ─────────────────────────────────────────────────────────────
// everglow / api/site/route.ts — Site config endpoint
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/db';

export async function GET() {
  const config = await getSiteConfig();
  return NextResponse.json({ config });
}
