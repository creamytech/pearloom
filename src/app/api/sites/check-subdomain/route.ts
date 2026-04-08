import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`check-subdomain:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ available: false, error: 'Too many requests' }, { status: 429 });
  }

  const subdomain = req.nextUrl.searchParams.get('slug');
  if (!subdomain) return NextResponse.json({ available: false, error: 'No slug provided' });

  const clean = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (clean.length < 2) return NextResponse.json({ available: false, error: 'Too short' });

  const existing = await getSiteConfig(clean).catch(() => null);
  return NextResponse.json({ available: !existing, slug: clean });
}
