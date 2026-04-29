// ─────────────────────────────────────────────────────────────
// /api/studio/draft
//
// POST { siteSlug, type, count? } → { drafts: StudioDraft[] }
//
// Pear drafts N (default 3) stationery directions for the active
// stationery type (Save the date / Invitation / Thank-you), each
// pinning a palette + layout + motif + tone label. Output is a
// pure JSON shape the Studio merges over the built-in defaults.
//
// Owner-checked. Rate-limited per host (12/hour) — drafts are
// cheap but not free.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { GEMINI_FLASH } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { max: 12, windowMs: 60 * 60 * 1000 };

const PALETTE_IDS = ['lavender', 'sage', 'peach', 'cream', 'twilight', 'rose'];
const LAYOUT_IDS = ['classic', 'asym', 'photo', 'script', 'minimal'];
const MOTIF_IDS = ['none', 'stamp', 'leaves', 'tape', 'monogram', 'wax', 'doodle'];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface DraftBody {
  siteSlug?: string;
  type?: 'std' | 'invite' | 'thanks';
  count?: number;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = checkRateLimit(`studio-draft:${session.user.email}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many drafts — try again in an hour.' }, { status: 429 });
  }

  let body: DraftBody = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const slug = body.siteSlug?.trim();
  const type = body.type;
  const count = Math.max(1, Math.min(5, Number(body.count ?? 3)));
  if (!slug || !type) return NextResponse.json({ error: 'siteSlug and type required' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  // Resolve slug + ownership.
  const { data: site } = await sb
    .from('sites')
    .select('id, ai_manifest, site_config, creator_email, names')
    .eq('subdomain', slug)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = ((site as { creator_email?: string }).creator_email
    ?? (site as { site_config?: { creator_email?: string } }).site_config?.creator_email
    ?? '').toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // Graceful fall-back: ship the deterministic shuffled defaults
    // so the UI still updates even when the model is offline.
    return NextResponse.json({ drafts: shuffleDefaults(type, count) });
  }

  const manifest = (site as { ai_manifest?: Record<string, unknown> }).ai_manifest ?? {};
  const m = manifest as {
    occasion?: string;
    vibeString?: string;
    poetry?: { heroTagline?: string };
    logistics?: { venue?: string };
    theme?: { colors?: { accent?: string } };
  };
  const occasion = m.occasion ?? 'wedding';
  const vibe = m.vibeString ?? '';
  const tagline = m.poetry?.heroTagline ?? '';
  const venue = m.logistics?.venue ?? '';

  const labelByType: Record<typeof type, string> = {
    std: 'save-the-date',
    invite: 'invitation',
    thanks: 'thank-you',
  };

  const prompt = `You are Pear, the Pearloom design director. Draft ${count} distinct stationery directions for a ${labelByType[type]} card.

Context:
- Occasion: ${occasion}
- Vibe (host's words): "${vibe || '(not set)'}"
- Hero tagline: "${tagline || '(not set)'}"
- Venue: ${venue || '(not set)'}

For each direction return:
- id: a short kebab-case id (e.g. 'editorial', 'garden', 'modern', 'photo', 'script', 'minimal'); make them distinct
- name: 1–2 word display name (e.g. "Editorial", "En plein air", "Letterpress")
- tone: short hyphen-separated style note (e.g. "serif · centered · stamp")
- accent: one of [${PALETTE_IDS.join(', ')}]
- layout: one of [${LAYOUT_IDS.join(', ')}]
- motif: one of [${MOTIF_IDS.join(', ')}]

Return ONLY a single JSON object: { "drafts": [ {...}, {...}, ... ] }
No prose, no markdown fences, just the JSON.`;

  const r = await fetch(`${GEMINI_FLASH}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!r.ok) {
    return NextResponse.json({ drafts: shuffleDefaults(type, count) });
  }
  const data = (await r.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  let parsed: { drafts?: unknown } = {};
  try { parsed = JSON.parse(raw); } catch { /* fall through */ }

  const drafts = (Array.isArray(parsed.drafts) ? parsed.drafts : [])
    .map((d) => normaliseDraft(d as Record<string, unknown>))
    .filter((d): d is { id: string; name: string; tone: string; accent: string; layout: string; motif: string } => d != null)
    .slice(0, count);

  if (drafts.length === 0) {
    return NextResponse.json({ drafts: shuffleDefaults(type, count) });
  }

  return NextResponse.json({ drafts });
}

function normaliseDraft(d: Record<string, unknown>): { id: string; name: string; tone: string; accent: string; layout: string; motif: string } | null {
  const id = typeof d.id === 'string' ? d.id : '';
  const name = typeof d.name === 'string' ? d.name : '';
  const tone = typeof d.tone === 'string' ? d.tone : '';
  let accent = typeof d.accent === 'string' ? d.accent : 'lavender';
  let layout = typeof d.layout === 'string' ? d.layout : 'classic';
  let motif = typeof d.motif === 'string' ? d.motif : 'stamp';
  if (!PALETTE_IDS.includes(accent)) accent = 'lavender';
  if (!LAYOUT_IDS.includes(layout)) layout = 'classic';
  if (!MOTIF_IDS.includes(motif)) motif = 'stamp';
  if (!id || !name || !tone) return null;
  return { id, name, tone, accent, layout, motif };
}

const DEFAULT_BANK: Record<'std' | 'invite' | 'thanks', Array<{ id: string; name: string; tone: string; accent: string; layout: string; motif: string }>> = {
  std: [
    { id: 'editorial', name: 'Editorial', tone: 'serif · centered · stamp', accent: 'lavender', layout: 'classic', motif: 'stamp' },
    { id: 'garden',    name: 'Garden',    tone: 'olive · vines · soft',     accent: 'sage',     layout: 'asym',    motif: 'leaves' },
    { id: 'polaroid',  name: 'Polaroid',  tone: 'photo-led · warm',         accent: 'peach',    layout: 'photo',   motif: 'tape' },
  ],
  invite: [
    { id: 'editorial', name: 'Letterpress',  tone: 'classic · centered',      accent: 'cream',    layout: 'classic', motif: 'monogram' },
    { id: 'garden',    name: 'En plein air', tone: 'natural · pressed leaves', accent: 'sage',     layout: 'asym',    motif: 'leaves' },
    { id: 'modern',    name: 'Modern',       tone: 'sans · asymmetric',        accent: 'lavender', layout: 'asym',    motif: 'stamp' },
  ],
  thanks: [
    { id: 'photo',   name: 'Photo card',  tone: 'big photo · short note', accent: 'peach',    layout: 'photo',   motif: 'tape' },
    { id: 'script',  name: 'Handwritten', tone: 'script · personal',       accent: 'cream',    layout: 'script',  motif: 'wax' },
    { id: 'minimal', name: 'Minimal',     tone: 'sans · two lines',         accent: 'lavender', layout: 'minimal', motif: 'monogram' },
  ],
};

function shuffleDefaults(type: 'std' | 'invite' | 'thanks', count: number) {
  const bank = DEFAULT_BANK[type];
  const out = [...bank];
  // Light variation so successive "Draft another" calls don't
  // return the exact same set.
  const swapAccents = ['rose', 'twilight', 'sage', 'peach'];
  return out.slice(0, count).map((d, i) => ({
    ...d,
    accent: i === 0 ? d.accent : swapAccents[(Date.now() + i) % swapAccents.length],
  }));
}
