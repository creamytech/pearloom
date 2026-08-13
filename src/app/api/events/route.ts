// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/events/route.ts
//
// The client funnel beacon (GRAND-PLAN Pillar 20). Client-side
// funnel steps — welcome/wizard drop-off, landing → signup — POST
// here; the server attaches the signed-in email when present
// (anonymous IS allowed: landing → signup happens pre-auth) and
// forwards to the product_events spine.
//
//   POST { event: string, siteId?, props? } → { ok: true }
//
// Deliberately tiny: a telemetry beacon must never make the
// client's fetch look like a failure, so it accepts and forwards
// fire-and-forget.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { recordProductEvent } from '@/lib/analytics/product-events';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Rate limit by IP — a beacon endpoint is a spam magnet. Generous
  // (60/min) so a real step-by-step funnel is never dropped.
  const ip = getClientIp(req);
  const rl = checkRateLimit(`events:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: { event?: unknown; siteId?: unknown; props?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const event = typeof body.event === 'string' ? body.event.trim() : '';
  if (!event) {
    return NextResponse.json({ error: 'event required' }, { status: 400 });
  }

  // Attach the signed-in email when present — anonymous is allowed
  // (landing → signup fires before an account exists).
  let email: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    email = session?.user?.email ?? null;
  } catch {
    /* anonymous beacon — fine */
  }

  const siteId = typeof body.siteId === 'string' ? body.siteId.slice(0, 200) : null;
  const props =
    body.props && typeof body.props === 'object' && !Array.isArray(body.props)
      ? (body.props as Record<string, unknown>)
      : null;

  void recordProductEvent(event, { email, siteId, props });
  return NextResponse.json({ ok: true });
}
