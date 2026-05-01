import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ─────────────────────────────────────────────────────────────
// GET /api/library/iconify/svg?ref=<set:name>&color=<hex>
// Fetch a single SVG from Iconify's CDN. Strict ref validation
// because the ref is a path segment and we don't want anyone
// using us to proxy arbitrary URLs. Same allowlist of prefixes
// as the search route — anything outside it gets rejected.
// ─────────────────────────────────────────────────────────────

const ALLOWED_PREFIXES = new Set([
  'ph', 'ph-duotone', 'ph-fill', 'ph-bold',
  'lucide', 'tabler', 'mdi-light',
  'fluent-emoji', 'twemoji',
]);

const REF_RE = /^[a-z0-9-]+:[a-z0-9-]+$/i;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`iconify-svg:${ip}`, { max: 120, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down a tick' }, { status: 429 });
  }

  const url = new URL(req.url);
  const ref = (url.searchParams.get('ref') ?? '').trim();
  if (!ref || !REF_RE.test(ref)) {
    return NextResponse.json({ error: 'Invalid ref' }, { status: 400 });
  }
  const [prefix, name] = ref.split(':');
  if (!prefix || !name || !ALLOWED_PREFIXES.has(prefix)) {
    return NextResponse.json({ error: 'Set not allowed' }, { status: 400 });
  }

  // Optional color override. Iconify supports `color` as a query
  // parameter — when set the path becomes `currentColor → hex`.
  const colorRaw = url.searchParams.get('color') ?? '';
  const color = /^#?[0-9a-f]{3,8}$/i.test(colorRaw) ? colorRaw.replace(/^#/, '') : null;

  const cdn = new URL(`https://api.iconify.design/${prefix}/${name}.svg`);
  if (color) cdn.searchParams.set('color', `%23${color}`);

  try {
    const res = await fetch(cdn.toString(), {
      // Per-ref SVGs are immutable on Iconify's CDN. Cache for 1
      // day on our edge so repeat lookups are zero-cost.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }
    const svg = await res.text();
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
