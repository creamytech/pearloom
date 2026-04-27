// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/scene
//
// Couple-in-scene renderer. Takes a persistent couple avatar
// (uploaded to r2://couples/{coupleId}/avatar.png) and places
// the same two characters in a new scene — "cutting the cake",
// "at the altar", "on a boat". Used for event hero blocks so
// every event shows illustrations of the couple doing the
// thing the event is actually about.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { renderScene } from '@/lib/invite-engine/render';
import type { PaletteHex } from '@/lib/invite-engine/designer-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Body {
  siteSlug: string;
  sceneDescription: string;
  palette: PaletteHex;
  /** base64 of the couple avatar — fetch and forward from the R2
   *  URL on the client, or inline if small enough. */
  avatar: { base64: string; mimeType: string };
  /** Optional second image (e.g. a venue photo) to help ground
   *  the scene. */
  extraContext?: { base64: string; mimeType: string };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const rate = checkRateLimit(`invite-scene:${session.user.email}:${getClientIp(req)}`, { max: 10, windowMs: 5 * 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: 'Too many scene renders.' }, { status: 429 });

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  if (!body.siteSlug || !body.sceneDescription || !body.palette || !body.avatar) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  try {
    const result = await renderScene({
      sceneDescription: body.sceneDescription,
      palette: body.palette,
      siteSlug: body.siteSlug,
      avatar: body.avatar,
      extraContext: body.extraContext,
    });
    if (!result) return NextResponse.json({ error: 'Renderer returned nothing.' }, { status: 502 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[invite/scene] failed:', err);
    return NextResponse.json({ error: 'Renderer is busy.' }, { status: 502 });
  }
}
