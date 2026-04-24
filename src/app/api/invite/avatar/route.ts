// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/avatar
//
// Persistent couple avatar — generated ONCE and reused across
// every downstream surface (save-the-date, invite, RSVP
// confirmation, thank-you, anniversary recap). The caller
// supplies the coupleId so we can park the image in a stable
// r2://couples/{coupleId}/avatar-*.png key the rest of the
// product can reference forever.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { renderAvatar } from '@/lib/invite-engine/render';
import type { PaletteHex } from '@/lib/invite-engine/designer-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Body {
  siteSlug: string;
  coupleId: string;
  /** From Pass 1.5 — `coupleProfile.illustrationPrompt`. */
  illustrationPrompt: string;
  palette: PaletteHex;
  portrait?: { base64: string; mimeType: string };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  // Avatars are intentionally tight-budget — one per couple per day.
  const rate = checkRateLimit(`invite-avatar:${session.user.email}`, { max: 3, windowMs: 24 * 60 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'You’ve regenerated the couple avatar a few times today. Try again tomorrow.' }, { status: 429 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  if (!body.siteSlug || !body.coupleId || !body.illustrationPrompt || !body.palette) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  try {
    const result = await renderAvatar({
      illustrationPrompt: body.illustrationPrompt,
      palette: body.palette,
      siteSlug: body.siteSlug,
      coupleId: body.coupleId,
      portrait: body.portrait
        ? { base64: body.portrait.base64, mimeType: body.portrait.mimeType }
        : undefined,
    });
    if (!result) return NextResponse.json({ error: 'Renderer returned nothing.' }, { status: 502 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[invite/avatar] failed:', err);
    return NextResponse.json({ error: 'Renderer is busy.' }, { status: 502 });
  }
}
