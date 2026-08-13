import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ─────────────────────────────────────────────────────────────
// GET /api/library/iconify/search?q=<term>&limit=24
// Proxy to the public Iconify search API. Returns a slim list
// of icon refs (set:name) the client can render via the public
// /api/library/iconify/svg route. We curate which icon SETS are
// surfaced so the editor stays on-brand — Phosphor (multiple
// weights, editorial feel), Lucide (clean line), Tabler (utility),
// and a few hand-picked ornament sets for vintage flourishes.
//
// Iconify itself is free, no API key required, returns JSON. We
// pin a small allowlist of prefixes so the host doesn't get a
// dictionary dump from 200k+ icons across 150+ sets — we want
// 200-ish well-chosen results, not all of them.
// ─────────────────────────────────────────────────────────────

// Allowlist drives which icon sets the search hits. Keep this
// short — adding sets is easy, removing them is the hard part
// because hosts will have already saved icons from the removed
// set into their manifests.
const ALLOWED_PREFIXES = [
  'ph',           // Phosphor — primary editorial icon set
  'ph-duotone',
  'ph-fill',
  'ph-bold',
  'lucide',       // Lucide — secondary line icons
  'tabler',       // Tabler — utility chrome
  'mdi-light',    // Material Design Light — subtle alternates
  'fluent-emoji', // Fluent Emoji — hand-drawn flourishes (curated)
  'twemoji',      // Twemoji
];

// Iconify API search endpoint. Returns:
//   { icons: ["ph:heart", "ph:heart-fill", ...], total: 17, ... }
const ICONIFY_SEARCH = 'https://api.iconify.design/search';

interface IconifyResponse {
  icons?: string[];
  total?: number;
  limit?: number;
  start?: number;
  collections?: Record<string, { name: string; total: number }>;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`iconify-search:${ip}`, { max: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down a tick' }, { status: 429 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) {
    return NextResponse.json({ icons: [], total: 0, source: 'empty-query' });
  }
  if (q.length > 60) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  const requested = Number(url.searchParams.get('limit') ?? '24');
  const limit = Number.isFinite(requested) ? Math.min(48, Math.max(8, requested)) : 24;

  // Iconify's `prefixes` param accepts comma-separated allowlist.
  const params = new URLSearchParams({
    query: q,
    limit: String(limit),
    prefixes: ALLOWED_PREFIXES.join(','),
  });

  try {
    const res = await fetch(`${ICONIFY_SEARCH}?${params.toString()}`, {
      // Iconify CDN responses are immutable per icon ref, but search
      // results vary by query. Cache per (query, limit) for 1h on
      // the edge so we don't hammer the public API on common terms.
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({ icons: [], total: 0, source: 'upstream-error' });
    }
    const data = (await res.json()) as IconifyResponse;
    const icons = Array.isArray(data.icons) ? data.icons : [];
    return NextResponse.json({
      icons,
      total: data.total ?? icons.length,
      source: 'iconify',
    });
  } catch {
    return NextResponse.json({ icons: [], total: 0, source: 'exception' });
  }
}
