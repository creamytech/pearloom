// ─────────────────────────────────────────────────────────────
// /api/studio/asset
//
// POST { siteSlug, kind, paletteId?, motif?, stationeryType? }
//   → { asset: AssetEntry }
//
// Generates a single bespoke stationery asset (stamp / wax /
// leaf / doodle) via Gemini Image 2 (Nano Banana). Result is
// uploaded to R2 and returned as an AssetEntry the Studio merges
// into manifest.studio.assets.
//
// Owner-checked. Rate-limited per host (10/hour). Falls through
// gracefully when GEMINI_API_KEY isn't configured.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { geminiGenerateImage } from '@/lib/memory-engine/gemini-client';
import { uploadToR2 } from '@/lib/r2';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

type AssetKind = 'stamp' | 'wax' | 'leaf' | 'leaf2' | 'doodle' | 'mono' | 'tape';
type StationeryType = 'std' | 'invite' | 'thanks';

const PALETTE_HINTS: Record<string, string> = {
  lavender: 'soft lavender + olive ink',
  sage:     'olive sage + cream',
  peach:    'apricot peach + warm ink',
  cream:    'cream paper + olive ink',
  twilight: 'deep navy + cream highlights',
  rose:     'dusty rose + olive ink',
};

const PROMPT_BY_KIND: Record<AssetKind, (paletteHint: string, occasionHint: string) => string> = {
  stamp: (palette, occ) => `A small editorial postage stamp illustration on transparent background, in a ${palette} colour palette, suited for a ${occ}. Round-cornered rectangle with serrated edges (postage perforations), one delicate central icon (heart, sparkle, or pear), a short caps phrase like "WITH LOVE" along the top edge, and a faint date arc. Hand-printed letterpress feel, slight ink imperfection, no photo-realism, no people. Output PNG with transparent background, square 1024×1024, centred.`,
  wax: (palette, occ) => `A circular wax seal sticker on transparent background, deep ${palette === 'twilight' ? 'rose' : 'rose'} colour, with subtle highlight + shadow, debossed monogram-style flourish in the centre. Square framing, centred. Hand-pressed analog feel, NOT a 3D render. Output PNG transparent, 1024×1024.`,
  leaf: (palette, occ) => `A delicate botanical line illustration of olive or eucalyptus sprigs, ink + sage greens, on transparent background. Editorial wedding stationery feel for a ${occ}. Centred composition, hand-drawn lineweight, no shading blocks. Output PNG transparent 1024×1024.`,
  leaf2: (palette, occ) => `A pair of pressed-leaf shapes drawn in flat sage green ink on transparent background, suitable for a ${occ}. Editorial, simple, no outline strokes, two leaves overlapping at a slight angle. Output PNG transparent 1024×1024.`,
  doodle: (palette, occ) => `A loose hand-drawn ornament squiggle in ${palette} ink, freehand single-line motion, gentle curves, on transparent background. ${occ} stationery accent. Output PNG transparent 1024×1024.`,
  mono: (palette, occ) => `A monogram glyph in editorial Fraunces italic style, two letters joined with a flourish, ${palette} ink, on transparent background. ${occ} stationery feel. Output PNG transparent 1024×1024.`,
  tape: (palette, occ) => `A short piece of washi tape laid at a slight angle, semi-transparent ${palette === 'peach' ? 'apricot' : palette} colour, soft drop shadow. ${occ} stationery. Output PNG transparent 1024×1024.`,
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface Body {
  siteSlug?: string;
  kind?: AssetKind;
  paletteId?: string;
  motif?: string;
  stationeryType?: StationeryType;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = checkRateLimit(`studio-asset:${session.user.email}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many generations — try again in an hour.' }, { status: 429 });
  }

  let body: Body = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const slug = body.siteSlug?.trim();
  const kind = body.kind ?? 'stamp';
  if (!slug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const { data: site } = await sb
    .from('sites')
    .select('id, ai_manifest, site_config, creator_email')
    .eq('subdomain', slug)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  // Case-insensitive owner check — IdP casing variance, see /api/sites/[domain].
  const ownerEmail = String(
    (site as { creator_email?: string }).creator_email
    ?? (site as { site_config?: { creator_email?: string } }).site_config?.creator_email
    ?? '',
  ).toLowerCase().trim();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini not configured on this server.' }, { status: 503 });
  }

  const manifest = (site as { ai_manifest?: { occasion?: string } }).ai_manifest ?? {};
  const occasion = manifest.occasion ?? 'wedding';
  const paletteHint = PALETTE_HINTS[body.paletteId ?? 'lavender'] ?? PALETTE_HINTS.lavender;

  const buildPrompt = PROMPT_BY_KIND[kind] ?? PROMPT_BY_KIND.stamp;
  const basePrompt = buildPrompt(paletteHint, occasion);
  // Steer the asset's feel by which card it'll land on, and
  // which motif the host's currently using (so a new stamp,
  // say, doesn't fight with their leaves motif).
  const typeHint = body.stationeryType === 'std'    ? ' Anticipatory, future-tense — the host is announcing a future date.'
                : body.stationeryType === 'thanks' ? ' Warm, retrospective — the event has already happened.'
                : body.stationeryType === 'invite' ? ' Formal, RSVP-ready — the centrepiece invitation card.'
                : '';
  const motifHint = body.motif && body.motif !== 'none'
    ? ` Compose so it complements an existing ${body.motif} motif on the same card without overlapping it.`
    : '';
  const prompt = basePrompt + typeHint + motifHint;

  let result;
  try {
    result = await geminiGenerateImage({ apiKey, prompt });
  } catch (err) {
    console.error('[studio/asset] gemini', err);
    return NextResponse.json({ error: 'Generation failed.' }, { status: 502 });
  }
  if (!result?.base64) {
    return NextResponse.json({ error: 'Empty image returned.' }, { status: 502 });
  }

  // Upload PNG to R2.
  const buf = Buffer.from(result.base64, 'base64');
  const key = `studio/assets/${(site as { id: string }).id}/${kind}-${Date.now()}.png`;
  let url: string;
  try {
    url = await uploadToR2(key, buf, result.mimeType || 'image/png');
  } catch (err) {
    console.error('[studio/asset] uploadToR2', err);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 502 });
  }

  // Use a UUID for the id so two AI generations resolved in the
  // same millisecond can't collide on the React key when both
  // land in state.assets.
  return NextResponse.json({
    asset: {
      id: `ai-${crypto.randomUUID()}`,
      kind,
      url,
    },
  });
}
