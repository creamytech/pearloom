// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/layouts
//
// AI layout engine — Claude Sonnet emits N distinct invitation
// layouts in a single call. No image-gen cost; purely structural.
// Returns an array of LayoutSpec objects the client composes
// into live SVG previews via compose.ts.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateInviteLayouts, type InviteVoice } from '@/lib/invite-engine/layouts';
import type { PaletteHex } from '@/lib/invite-engine/designer-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Body {
  count?: number;            // default 30, capped at 40
  palette: PaletteHex;
  voice: InviteVoice;
  occasion: string;
  names: string;
  archetypeId?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const rate = checkRateLimit(`invite-layouts:${session.user.email}:${getClientIp(req)}`, { max: 6, windowMs: 10 * 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: 'Too many layout generations. Try again shortly.' }, { status: 429 });

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  if (!body.palette || !body.voice || !body.occasion || !body.names) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const count = Math.max(6, Math.min(40, body.count ?? 30));

  try {
    const layouts = await generateInviteLayouts({
      count,
      palette: body.palette,
      voice: body.voice,
      occasion: body.occasion,
      names: body.names,
    });
    return NextResponse.json({ ok: true, layouts });
  } catch (err) {
    console.error('[invite/layouts] failed:', err);
    return NextResponse.json({ error: 'Layout engine is busy.' }, { status: 502 });
  }
}
