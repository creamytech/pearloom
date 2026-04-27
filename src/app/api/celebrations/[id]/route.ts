// ─────────────────────────────────────────────────────────────
// Pearloom / api/celebrations/[id] — Memory Vault data feed.
//
// GET /api/celebrations/[id]
//   Returns every published Pearloom site with the same
//   manifest.celebration.id, sorted chronologically by event
//   date. Each entry includes:
//     • domain, occasion, title, kind label
//     • hero / cover photo URL (best effort)
//     • event date + a long human label
//     • a short summary line
//     • 1–3 representative photos
//
// Public — celebration ids are unguessable UUIDs in practice.
// Read-only.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeOccasion } from '@/lib/site-urls';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface VaultEntry {
  domain: string;
  occasion: string;
  title: string;
  kindLabel: string;
  date: string | null;
  dateLabel: string;
  coverUrl: string | null;
  summary: string;
  photos: string[];
  /** /sites/{slug} — relative path the front-end can deeplink to. */
  sitePath: string;
}

const KIND_LABELS: Record<string, string> = {
  wedding: 'Wedding',
  engagement: 'Engagement',
  anniversary: 'Anniversary',
  birthday: 'Birthday',
  'milestone-birthday': 'Milestone birthday',
  'first-birthday': 'First birthday',
  'baby-shower': 'Baby shower',
  'bridal-shower': 'Bridal shower',
  'rehearsal-dinner': 'Rehearsal dinner',
  'welcome-party': 'Welcome party',
  brunch: 'Morning-after brunch',
  'bachelor-party': 'Bachelor weekend',
  'bachelorette-party': 'Bachelorette',
  reunion: 'Reunion',
  retirement: 'Retirement',
  graduation: 'Graduation',
  memorial: 'In loving memory',
  funeral: 'Service',
  housewarming: 'Housewarming',
  'gender-reveal': 'Gender reveal',
  'sip-and-see': 'Sip & see',
  'vow-renewal': 'Vow renewal',
  'bar-mitzvah': 'Bar mitzvah',
  'bat-mitzvah': 'Bat mitzvah',
  quinceanera: 'Quinceañera',
  baptism: 'Baptism',
  'first-communion': 'First Communion',
  confirmation: 'Confirmation',
};

function pickCover(manifest: StoryManifest | null | undefined): string | null {
  if (!manifest) return null;
  const m = manifest as unknown as { coverPhoto?: string };
  if (m.coverPhoto) return m.coverPhoto;
  const firstChapter = manifest.chapters?.[0];
  if (firstChapter) {
    const ch = firstChapter as unknown as { heroImage?: string; images?: Array<{ url?: string }> };
    if (ch.heroImage) return ch.heroImage;
    const firstUrl = ch.images?.find((i) => !!i?.url)?.url;
    if (firstUrl) return firstUrl;
  }
  return null;
}

function pickPhotos(manifest: StoryManifest | null | undefined, max = 3): string[] {
  if (!manifest) return [];
  const out: string[] = [];
  for (const ch of manifest.chapters ?? []) {
    const imgs = ((ch as unknown as { images?: Array<{ url?: string }> }).images ?? []);
    for (const img of imgs) {
      if (img?.url && !out.includes(img.url)) out.push(img.url);
      if (out.length >= max) return out;
    }
  }
  return out;
}

function pickSummary(manifest: StoryManifest | null | undefined): string {
  if (!manifest) return '';
  const m = manifest as unknown as { poetry?: { heroTagline?: string; closingLine?: string }; vibeString?: string };
  return (m.poetry?.heroTagline ?? m.poetry?.closingLine ?? m.vibeString ?? '').slice(0, 220);
}

interface SiteRow {
  subdomain: string;
  ai_manifest: StoryManifest | null;
  site_config: { names?: unknown; manifest?: StoryManifest } | null;
  published: boolean | null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || id.length < 4) {
    return NextResponse.json({ ok: false, error: 'Invalid id.' }, { status: 400 });
  }
  const client = sb();
  if (!client) return NextResponse.json({ ok: true, celebration: null, entries: [] });

  // Fan out — every site with matching celebration id.
  const { data, error } = await client
    .from('sites')
    .select('subdomain, ai_manifest, site_config, published')
    .eq('published', true);
  if (error) {
    console.error('[celebrations/id] failed:', error);
    return NextResponse.json({ ok: false, error: 'Lookup failed.' }, { status: 500 });
  }

  const rows = (data ?? []) as SiteRow[];
  const matching = rows.filter((r) => {
    const m = r.ai_manifest ?? r.site_config?.manifest;
    const c = (m as unknown as { celebration?: { id?: string } } | null)?.celebration;
    return !!c?.id && c.id === id;
  });

  if (matching.length === 0) {
    return NextResponse.json({ ok: true, celebration: null, entries: [] });
  }

  const firstManifest = matching[0].ai_manifest ?? matching[0].site_config?.manifest;
  const celebration = (firstManifest as unknown as { celebration?: { id?: string; name?: string } } | null)?.celebration ?? null;

  const entries: VaultEntry[] = matching.map((r) => {
    const manifest = r.ai_manifest ?? r.site_config?.manifest ?? null;
    const occasionRaw = (manifest as unknown as { occasion?: string } | null)?.occasion;
    const occasion = normalizeOccasion(occasionRaw);
    const date = manifest?.logistics?.date ?? null;
    const dateLabel = date
      ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'Date to come';
    const cfgNames = Array.isArray(r.site_config?.names) ? r.site_config!.names : null;
    const names = (manifest as unknown as { names?: [string, string] } | null)?.names ?? (cfgNames as [string, string] | null) ?? null;
    const title = names?.[1] ? `${names[0]} & ${names[1]}` : names?.[0] ?? r.subdomain;
    const sitePath = occasionRaw ? `/${occasionRaw}/${r.subdomain}` : `/sites/${r.subdomain}`;
    return {
      domain: r.subdomain,
      occasion,
      title,
      kindLabel: KIND_LABELS[occasion] ?? KIND_LABELS[occasionRaw ?? ''] ?? 'Celebration',
      date,
      dateLabel,
      coverUrl: pickCover(manifest),
      summary: pickSummary(manifest),
      photos: pickPhotos(manifest),
      sitePath,
    };
  }).sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return ad - bd;
  });

  return NextResponse.json({ ok: true, celebration, entries });
}
