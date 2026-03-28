import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/db';

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get('slug');
  if (!subdomain) return NextResponse.json({ available: false, error: 'No slug provided' });

  const clean = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (clean.length < 2) return NextResponse.json({ available: false, error: 'Too short' });

  const existing = await getSiteConfig(clean).catch(() => null);
  return NextResponse.json({ available: !existing, slug: clean });
}
