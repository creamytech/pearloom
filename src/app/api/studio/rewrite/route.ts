// ─────────────────────────────────────────────────────────────
// /api/studio/rewrite
//
// POST { siteSlug, type, fieldId, currentText, hint } →
// { rewritten: string }
//
// Pear rewrites a single Copy field on a stationery card. Hint
// is one of the Studio's canned nudges ("A different angle on
// the same idea", "Trim it to half the length", …) or a free-
// form host string. Output is a single line; the Studio writes
// it into manifest.studio.copyOverrides[type][fieldId].
//
// Owner-checked. Rate-limited per host (24/hour) — rewrites are
// cheap but easy to spam.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { GEMINI_LITE } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { max: 24, windowMs: 60 * 60 * 1000 };

const FIELD_LABEL: Record<string, string> = {
  eyebrow: 'eyebrow line (small caps, above the names)',
  line2:   'body line (between the names and the date)',
  line4:   'place line (single line beneath the date)',
  cta:     'footer / CTA line (smallest text, bottom of card)',
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface RewriteBody {
  siteSlug?: string;
  type?: 'std' | 'invite' | 'thanks';
  fieldId?: string;
  currentText?: string;
  hint?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = checkRateLimit(`studio-rewrite:${session.user.email}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many rewrites — give it a minute.' }, { status: 429 });
  }

  let body: RewriteBody = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const slug = body.siteSlug?.trim();
  const type = body.type;
  const fieldId = body.fieldId?.trim();
  const currentText = (body.currentText ?? '').trim();
  const hint = (body.hint ?? '').trim();
  if (!slug || !type || !fieldId) {
    return NextResponse.json({ error: 'siteSlug, type, fieldId required' }, { status: 400 });
  }
  if (!FIELD_LABEL[fieldId]) {
    return NextResponse.json({ error: 'Unknown fieldId' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  // Resolve slug + ownership.
  const { data: site } = await sb
    .from('sites')
    .select('id, ai_manifest, site_config, creator_email')
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
    return NextResponse.json({ error: 'AI rewrite not configured on this server.' }, { status: 503 });
  }

  const labelByType: Record<typeof type, string> = {
    std: 'save-the-date',
    invite: 'invitation',
    thanks: 'thank-you',
  };

  const manifest = (site as { ai_manifest?: Record<string, unknown> }).ai_manifest ?? {};
  const m = manifest as { occasion?: string; vibeString?: string };

  const prompt = `You are Pear, the Pearloom design director, rewriting one line of stationery copy.

Card: ${labelByType[type]}
Field: ${FIELD_LABEL[fieldId]}
Current text: ${currentText || '(empty)'}
Direction: ${hint || '(no specific hint — just make it sing)'}

Vibe: ${m.vibeString || '(not set)'}

Return ONE single line of text — no quotes, no markdown, no explanation. Match the card's register: stationery is concise, warm, never breathless. Aim for the same length as the original ± 30%. If the field is the eyebrow, ALL CAPS is OK. Otherwise sentence case.`;

  const r = await fetch(`${GEMINI_LITE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 80 },
    }),
  });
  if (!r.ok) {
    return NextResponse.json({ error: `Pear's offline (model ${r.status})` }, { status: 502 });
  }
  const data = (await r.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  // Strip stray quotes / markdown / trailing punctuation noise.
  const rewritten = raw
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/^\*+|\*+$/g, '')
    .split(/\r?\n/)[0]
    .trim();

  if (!rewritten) {
    return NextResponse.json({ error: 'Pear came up empty — try a different hint.' }, { status: 502 });
  }

  return NextResponse.json({ rewritten });
}
