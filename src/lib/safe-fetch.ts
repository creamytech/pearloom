// ─────────────────────────────────────────────────────────────
// Pearloom / lib/safe-fetch.ts
//
// The ONE server-side fetcher for URLs a USER supplied.
//
// Any endpoint that takes a URL from a request body and fetches it
// is an SSRF surface: without guards a caller can point us at
// 169.254.169.254, at 127.0.0.1, or at an internal host, and read
// the response through our own server. This module is the single
// hardened implementation — extracted from the registry
// add-by-URL route so the doorway (and anything after it) reuses
// it instead of re-deriving security-critical code.
//
// The guarantees:
//   • Scheme allowlist — http/https only (no file:, gopher:, data:).
//   • Hostname rejection BEFORE any DNS work (localhost, .local,
//     bare IPs in private ranges…).
//   • DNS resolution, then rejection of every private/reserved
//     address — this is what stops a public hostname that resolves
//     to an internal IP (DNS rebinding's first half).
//   • Manual redirects, each hop RE-VETTED — a public URL that
//     302s to 127.0.0.1 must not be followed.
//   • A shared deadline across all hops, and a byte-capped
//     streaming read, so a slow or endless body can't hold a
//     worker or exhaust memory.
//   • Content-type filtering.
//
// Everything fails CLOSED and returns null: callers can only say
// "couldn't read that", never leak a reason that would confirm an
// internal host exists.
// ─────────────────────────────────────────────────────────────

import { lookup } from 'node:dns/promises';
import { isPrivateHost, isPrivateIp } from '@/lib/product-page';

export interface SafeFetchOptions {
  /** Hard cap on bytes read from the body. Default 512 KB. */
  maxBytes?: number;
  /** Shared deadline across every redirect hop. Default 10s. */
  timeoutMs?: number;
  /** Redirect hops to follow, each re-vetted. Default 3. */
  maxRedirects?: number;
  /** Substrings a response's content-type may contain. A response
   *  whose type matches none is discarded. Default: html/xml. */
  acceptTypes?: readonly string[];
  /** Accept header sent upstream. */
  accept?: string;
}

const DEFAULTS = {
  maxBytes: 512 * 1024,
  timeoutMs: 10_000,
  maxRedirects: 3,
  acceptTypes: ['html', 'xml'] as const,
  accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
};

/* A real browser UA — many sites serve a stub or a 403 to unknown
   agents, and we're reading pages the user themselves can see. */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Validate scheme + hostname, then resolve DNS and reject any
 * private/reserved address. Returns the parsed URL or null.
 *
 * Exported so callers can vet a URL without fetching it (e.g. to
 * reject early with a friendly message).
 */
export async function vetUrl(raw: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
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

/**
 * Fetch a user-supplied URL's text safely. Returns null on ANY
 * failure — bad URL, private target, redirect to a private target,
 * wrong content-type, timeout, network error, TLS error.
 */
export async function safeFetchText(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<string | null> {
  const maxBytes = options.maxBytes ?? DEFAULTS.maxBytes;
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;
  const maxRedirects = options.maxRedirects ?? DEFAULTS.maxRedirects;
  const acceptTypes = options.acceptTypes ?? DEFAULTS.acceptTypes;
  const accept = options.accept ?? DEFAULTS.accept;

  const start = await vetUrl(rawUrl);
  if (!start) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let url = start;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const res = await fetch(url.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': UA,
          Accept: accept,
          'Accept-Language': 'en-US,en;q=0.8',
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        res.body?.cancel().catch(() => {});
        if (!loc || hop === maxRedirects) return null;
        let nextUrl: URL;
        try {
          nextUrl = new URL(loc, url);
        } catch {
          return null;
        }
        // RE-VET every hop: a public URL that redirects to an
        // internal address must not be followed.
        const vetted = await vetUrl(nextUrl.toString());
        if (!vetted) return null;
        url = vetted;
        continue;
      }

      if (!res.ok || !res.body) return null;
      const ct = (res.headers.get('content-type') ?? '').toLowerCase();
      if (ct && !acceptTypes.some((t) => ct.includes(t))) {
        res.body.cancel().catch(() => {});
        return null;
      }

      // Byte-capped streaming read — stop the moment we're over.
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          if (received > maxBytes) {
            chunks.push(value.subarray(0, value.byteLength - (received - maxBytes)));
            await reader.cancel().catch(() => {});
            break;
          }
          chunks.push(value);
        }
      }
      const merged = new Uint8Array(Math.min(received, maxBytes));
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.byteLength;
      }
      return new TextDecoder('utf-8', { fatal: false }).decode(merged);
    }
    return null;
  } catch {
    return null; // abort / network / TLS — all read as "couldn't read"
  } finally {
    clearTimeout(timer);
  }
}
