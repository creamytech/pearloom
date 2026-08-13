// ─────────────────────────────────────────────────────────────
// product-page — pure parsing + SSRF helpers for the registry's
// add-by-URL flow (/api/registry-items/from-url).
//
// parseProductPage is a PURE function (unit-tested in
// product-page.test.ts): raw HTML in → best-effort
// { title, imageUrl, price, store } out. Sources, in order of
// trust:
//   title — og:title → twitter:title → <title>
//   image — og:image:secure_url → og:image → twitter:image
//   store — og:site_name → hostname of the page URL
//   price — meta[property=product:price:amount | og:price:amount]
//           → itemprop="price" → JSON-LD offers.price
//
// isPrivateHost / isPrivateIp guard the server-side fetch against
// SSRF — localhost, RFC-1918, link-local, CGNAT, and their IPv6
// counterparts are all rejected.
// ─────────────────────────────────────────────────────────────

export interface ProductPageMeta {
  title: string | null;
  imageUrl: string | null;
  /** Dollars (or the page's currency unit) as a number — the
   *  editor prefill treats it as USD; the host can correct it. */
  price: number | null;
  store: string | null;
}

/* ── HTML helpers ─────────────────────────────────────────── */

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&#x27;': "'", '&apos;': "'", '&nbsp;': ' ',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&(?:amp|lt|gt|quot|#39|#x27|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, d: string) => {
      const code = parseInt(d, 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    });
}

/** Pull one attribute's value out of a single tag's source. */
function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? '');
}

/** First <meta property|name=KEY content=...> value, either
 *  attribute order. */
function metaContent(html: string, keys: string[]): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  for (const tag of tags) {
    const key = attr(tag, 'property') ?? attr(tag, 'name') ?? attr(tag, 'itemprop');
    if (!key || !wanted.has(key.toLowerCase())) continue;
    const content = attr(tag, 'content');
    if (content && content.trim()) return content.trim();
  }
  return null;
}

function parsePriceString(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).replace(/[$€£,\s]/g, '');
  const m = s.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ── JSON-LD ──────────────────────────────────────────────── */

/** Walk any JSON-LD value looking for the first offers.price
 *  (or a Product's top-level price). Depth-capped — real-world
 *  JSON-LD nests @graph arrays. */
function priceFromJsonLd(value: unknown, depth = 0): number | null {
  if (depth > 6 || value == null) return null;
  if (Array.isArray(value)) {
    for (const v of value) {
      const p = priceFromJsonLd(v, depth + 1);
      if (p != null) return p;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  const offers = obj.offers;
  if (offers != null) {
    const offerList = Array.isArray(offers) ? offers : [offers];
    for (const offer of offerList) {
      if (offer && typeof offer === 'object') {
        const o = offer as Record<string, unknown>;
        const direct = parsePriceString(o.price as string | undefined ?? (typeof o.price === 'number' ? String(o.price) : undefined));
        if (direct != null) return direct;
        const low = parsePriceString(o.lowPrice as string | undefined ?? (typeof o.lowPrice === 'number' ? String(o.lowPrice) : undefined));
        if (low != null) return low;
      }
    }
  }
  const topPrice = obj.price;
  if (typeof topPrice === 'number' || typeof topPrice === 'string') {
    const p = parsePriceString(String(topPrice));
    if (p != null) return p;
  }
  for (const key of ['@graph', 'mainEntity', 'itemListElement', 'item']) {
    if (key in obj) {
      const p = priceFromJsonLd(obj[key], depth + 1);
      if (p != null) return p;
    }
  }
  return null;
}

function jsonLdPrice(html: string): number | null {
  const blocks = html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const inner = block.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
    try {
      const parsed: unknown = JSON.parse(inner.trim());
      const p = priceFromJsonLd(parsed);
      if (p != null) return p;
    } catch { /* malformed JSON-LD is common, skip the block */ }
  }
  return null;
}

/* ── The parser ───────────────────────────────────────────── */

export function parseProductPage(html: string, pageUrl?: string): ProductPageMeta {
  // Title — og:title → twitter:title → <title>.
  let title = metaContent(html, ['og:title', 'twitter:title']);
  if (!title) {
    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t) title = decodeEntities(t[1]).replace(/\s+/g, ' ').trim() || null;
  }
  if (title) title = title.slice(0, 200);

  // Image — secure og:image wins; resolve relative against the page.
  let imageUrl = metaContent(html, ['og:image:secure_url', 'og:image', 'twitter:image']);
  if (imageUrl && pageUrl) {
    try { imageUrl = new URL(imageUrl, pageUrl).toString(); } catch { imageUrl = null; }
  }
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) imageUrl = null;

  // Store — og:site_name → page hostname.
  let store = metaContent(html, ['og:site_name']);
  if (!store && pageUrl) {
    try { store = new URL(pageUrl).hostname.replace(/^www\./, ''); } catch { /* keep null */ }
  }
  if (store) store = store.slice(0, 80);

  // Price — product meta → itemprop → JSON-LD.
  let price = parsePriceString(metaContent(html, ['product:price:amount', 'og:price:amount']));
  if (price == null) {
    // itemprop="price" on ANY tag — content attr first, else a
    // meta-style value.
    const tags = html.match(/<[a-z][^>]*\bitemprop\s*=\s*["']price["'][^>]*>/gi) ?? [];
    for (const tag of tags) {
      const p = parsePriceString(attr(tag, 'content'));
      if (p != null) { price = p; break; }
    }
  }
  if (price == null) price = jsonLdPrice(html);

  return { title: title || null, imageUrl: imageUrl || null, price, store: store || null };
}

/* ── SSRF guards ──────────────────────────────────────────── */

/** Is this a private / reserved IP literal? Covers IPv4 loopback,
 *  RFC-1918, link-local, CGNAT, 0.0.0.0, and IPv6 loopback /
 *  unique-local / link-local (+ v4-mapped forms). */
export function isPrivateIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  // v4-mapped IPv6 → check the embedded v4.
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIp(mapped[1]);
  if (v.includes(':')) {
    // IPv6.
    if (v === '::' || v === '::1') return true;
    if (v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true; // fe80::/10
    if (v.startsWith('fc') || v.startsWith('fd')) return true; // fc00::/7
    return false;
  }
  const parts = v.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;        // CGNAT
  if (a === 169 && b === 254) return true;                  // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;         // RFC-1918
  if (a === 192 && b === 168) return true;                  // RFC-1918
  if (a === 198 && (b === 18 || b === 19)) return true;     // benchmarking
  return false;
}

/** Is this hostname obviously private (before DNS)? Localhost
 *  names, .local/.internal suffixes, and raw private IPs. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local') || h.endsWith('.internal')) return true;
  return isPrivateIp(h);
}
