// POST /api/gate — verify the pre-launch preview password and, on
// success, set the httpOnly cookie the proxy checks. Rate-limited
// per IP to blunt brute-forcing. See src/lib/site-gate.ts.

import { NextResponse } from 'next/server';
import { GATE_COOKIE, GATE_PASSWORD, GATE_TOKEN } from '@/lib/site-gate';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`site-gate:${ip}`, { max: 10, windowMs: 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many tries. Give it a minute.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  const password =
    body && typeof body === 'object' && typeof (body as { password?: unknown }).password === 'string'
      ? (body as { password: string }).password
      : '';

  if (password !== GATE_PASSWORD) {
    console.warn('[gate] failed attempt', { ip });
    return NextResponse.json({ ok: false, error: "That word isn't right." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, GATE_TOKEN, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
