// ─────────────────────────────────────────────────────────────
// /api/registry-items/from-url
//
// Add-by-URL for the registry's Items manager. The host pastes a
// product link; we fetch the page SERVER-SIDE and return
// best-effort { title, imageUrl, price, store } to prefill the
// add-item form. Nothing is saved here — the host edits, then
// saves through the existing /api/registry-items POST.
//
// Guardrails (this route fetches arbitrary URLs on behalf of a
// signed-in host):
//   • auth required + per-user rate limit (10/min)
//   • http(s) only; hostname must not be localhost / private /
//     reserved — checked BOTH as a literal and after DNS lookup,
//     and re-checked on every redirect hop (max 3)
//   • 10s total timeout, 512KB body cap, realistic browser UA
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseProductPage } from '@/lib/product-page';
import { safeFetchText, vetUrl } from '@/lib/safe-fetch';

export const dynamic = 'force-dynamic';


const CANT_READ = 'Couldn’t read that page. Add it by hand.';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`registry-from-url:${session.user.email.toLowerCase()}`, { max: 10, windowMs: 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many reads too fast. Give it a minute.' }, { status: 429 });
    }

    let body: { url?: string } = {};
    try { body = await req.json(); } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
    }
    const raw = (body.url ?? '').trim();
    if (!raw || raw.length > 2000) {
      return NextResponse.json({ ok: false, error: CANT_READ }, { status: 400 });
    }

    // vetUrl first so an unfetchable/private target reads as a 400
    // (bad input) rather than a 422 (we tried and couldn't parse).
    const url = await vetUrl(raw);
    if (!url) return NextResponse.json({ ok: false, error: CANT_READ }, { status: 400 });

    const html = await safeFetchText(url.toString());
    if (!html) return NextResponse.json({ ok: false, error: CANT_READ }, { status: 422 });

    const meta = parseProductPage(html, url.toString());
    if (!meta.title && !meta.imageUrl && meta.price == null) {
      return NextResponse.json({ ok: false, error: CANT_READ }, { status: 422 });
    }

    return NextResponse.json({ ok: true, ...meta });
  } catch (err) {
    console.error('[registry-items/from-url] unhandled:', err);
    return NextResponse.json({ ok: false, error: CANT_READ }, { status: 500 });
  }
}
