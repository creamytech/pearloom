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
import { lookup } from 'node:dns/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { isPrivateHost, isPrivateIp, parseProductPage } from '@/lib/product-page';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const CANT_READ = 'Couldn’t read that page — add it by hand.';

/** Validate scheme + hostname, then resolve DNS and reject any
 *  private/reserved address. Returns the parsed URL or null. */
async function vetUrl(raw: string): Promise<URL | null> {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (isPrivateHost(url.hostname)) return null;
  try {
    const addrs = await lookup(url.hostname, { all: true, verbatim: true });
    if (addrs.length === 0) return null;
    if (addrs.some((a) => isPrivateIp(a.address))) return null;
  } catch {
    return null; // unresolvable → don't fetch
  }
  return url;
}

/** Fetch with manual redirects (re-vetting every hop), a shared
 *  deadline, and a byte-capped body read. */
async function fetchCapped(startUrl: URL): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let url = startUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(url.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.8',
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        res.body?.cancel().catch(() => {});
        if (!loc || hop === MAX_REDIRECTS) return null;
        let nextUrl: URL;
        try { nextUrl = new URL(loc, url); } catch { return null; }
        const vetted = await vetUrl(nextUrl.toString());
        if (!vetted) return null;
        url = vetted;
        continue;
      }

      if (!res.ok || !res.body) return null;
      const ct = (res.headers.get('content-type') ?? '').toLowerCase();
      if (ct && !ct.includes('html') && !ct.includes('xml')) {
        res.body.cancel().catch(() => {});
        return null;
      }

      // Byte-capped streaming read.
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          if (received > MAX_BYTES) {
            chunks.push(value.subarray(0, value.byteLength - (received - MAX_BYTES)));
            await reader.cancel().catch(() => {});
            break;
          }
          chunks.push(value);
        }
      }
      const merged = new Uint8Array(Math.min(received, MAX_BYTES));
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.byteLength; }
      return new TextDecoder('utf-8', { fatal: false }).decode(merged);
    }
    return null;
  } catch {
    return null; // abort / network / TLS — all read as "couldn't read"
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`registry-from-url:${session.user.email.toLowerCase()}`, { max: 10, windowMs: 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many reads too fast — give it a minute.' }, { status: 429 });
    }

    let body: { url?: string } = {};
    try { body = await req.json(); } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
    }
    const raw = (body.url ?? '').trim();
    if (!raw || raw.length > 2000) {
      return NextResponse.json({ ok: false, error: CANT_READ }, { status: 400 });
    }

    const url = await vetUrl(raw);
    if (!url) return NextResponse.json({ ok: false, error: CANT_READ }, { status: 400 });

    const html = await fetchCapped(url);
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
