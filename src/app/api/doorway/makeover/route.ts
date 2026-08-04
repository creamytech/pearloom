// ─────────────────────────────────────────────────────────────
// POST /api/doorway/makeover — "see your site reimagined."
//
// One call for the Makeover surface: read the visitor's existing
// wedding page and return a REAL manifest pressed through the same
// look pipeline the wizard uses, so the preview is the actual
// renderer rather than a mockup.
//
// Composed from parts that already carry their own guarantees:
//   • lib/safe-fetch — the one hardened fetcher for user-supplied
//     URLs (scheme allowlist, private-host + resolved-private-IP
//     rejection, per-hop redirect re-vetting, byte cap, deadline).
//   • lib/doorway/extract — restrained parsing; ambiguous dates are
//     skipped rather than guessed.
//   • lib/doorway/makeover — places ONLY facts that were read. No
//     invented venue, no fabricated schedule.
//
// Anonymous by design (the doorway contract), rate-limited, and it
// WRITES NOTHING: no row, no slug, no draft. The returned manifest
// is marked preview/unpublished and exists only in the response.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { safeFetchText } from '@/lib/safe-fetch';
import { extractDeterministic, htmlToText, htmlTitle } from '@/lib/doorway/extract';
import { buildMakeoverManifest, carriedSentence } from '@/lib/doorway/makeover';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const CANT_READ = 'We couldn’t read that page. Try pasting your details instead.';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Tighter than the extract endpoint: every call here makes an
  // outbound fetch AND builds a manifest.
  if (!checkRateLimit(`makeover:${ip}`, { max: 12, windowMs: 10 * 60_000 }).allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many tries. Give it a minute.' },
      { status: 429 },
    );
  }

  let body: { url?: string; text?: string; lookId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const rawUrl = (body.url ?? '').trim();
  const rawText = (body.text ?? '').trim();
  if (!rawUrl && !rawText) {
    return NextResponse.json(
      { ok: false, error: 'Paste a link to your current site, or your details.' },
      { status: 400 },
    );
  }
  if (rawUrl.length > 2000) {
    return NextResponse.json({ ok: false, error: CANT_READ }, { status: 400 });
  }

  let text = rawText.slice(0, 40_000);
  let title: string | undefined;

  if (rawUrl) {
    const html = await safeFetchText(rawUrl);
    if (!html) return NextResponse.json({ ok: false, error: CANT_READ }, { status: 422 });
    title = htmlTitle(html);
    text = htmlToText(html).slice(0, 40_000);
  }

  const read = extractDeterministic({
    text,
    title,
    nowYear: new Date().getUTCFullYear(),
  });

  const makeover = buildMakeoverManifest({
    prefill: read.prefill,
    lookId: body.lookId,
  });

  return NextResponse.json({
    ok: true,
    // `tooThin` is not an error — the UI asks for a detail or two
    // rather than rendering a shell.
    tooThin: makeover.tooThin,
    carried: makeover.carried,
    carriedSentence: carriedSentence(makeover.carried),
    prefill: read.prefill,
    manifest: makeover.manifest,
  });
}
