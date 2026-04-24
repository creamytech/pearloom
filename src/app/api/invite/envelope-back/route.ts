import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { renderEnvelopeBack } from '@/lib/invite-engine/render';
import type { InviteContext, PaletteHex } from '@/lib/invite-engine/designer-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

interface Body {
  siteSlug: string;
  names: string;
  date: string;
  palette: PaletteHex;
  motif?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const rate = checkRateLimit(`invite-envelope:${session.user.email}:${getClientIp(req)}`, { max: 8, windowMs: 10 * 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  if (!body.siteSlug || !body.names || !body.date || !body.palette) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const ctx: InviteContext = {
    names: body.names,
    date: body.date,
    occasionLabel: 'celebration',
    palette: body.palette,
    hasPortrait: false,
  };

  try {
    const result = await renderEnvelopeBack({ ctx, motif: body.motif, siteSlug: body.siteSlug });
    if (!result) return NextResponse.json({ error: 'Renderer returned nothing.' }, { status: 502 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[invite/envelope-back] failed:', err);
    return NextResponse.json({ error: 'Renderer is busy.' }, { status: 502 });
  }
}
