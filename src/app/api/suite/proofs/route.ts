// ─────────────────────────────────────────────────────────────
// POST /api/suite/proofs
//
// Suite Phase 3 (docs/SUITE-STRATEGY.md §3) — "Pear pressed six
// proofs." Body: { siteSlug, type? } → { ok, proofs }.
//
// Loads the site manifest server-side (owner-checked, same shape
// as /api/studio/draft), derives the SuiteTheme, and runs the
// one-call Claude composition pass in lib/suite/proofs.ts. Every
// id in the response is already validated against the real Studio
// / motif / monogram catalogs, so the client applies blind.
//
// Auth: session + checkPearGate (Claude burns tokens).
// Rate: 10 / 5min per user+IP — a sheet is one model call but
//       hosts will mash "press again"; same shape as
//       /api/inline-rewrite.
// Failure: warm 502 — the Studio shows Pear's apology + retry.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, checkPearGate } from '@/lib/rate-limit';
import type { StoryManifest } from '@/types';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import {
  generateProofSheet,
  stylizeStyleForSuite,
  type ProofStationeryType,
} from '@/lib/suite/proofs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WARM_502 =
  'Pear set the type but the press jammed. Give it a beat and press again.';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface ProofsBody {
  siteSlug?: unknown;
  /** 'std' (default) | 'invite' | 'thanks'. */
  type?: unknown;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  // Plan-tier gate — same reasoning as /api/inline-rewrite: this
  // is a Claude call per click; free-tier mashing burns budget.
  const { blocked } = await checkPearGate(session.user.email);
  if (blocked) return blocked;

  const rate = checkRateLimit(`suite-proofs:${session.user.email}:${getClientIp(req)}`, {
    max: 10,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Pear is taking a breath. Try the press again in a minute.' },
      { status: 429 },
    );
  }

  let body: ProofsBody = {};
  try {
    body = (await req.json()) as ProofsBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const siteSlug = typeof body.siteSlug === 'string' ? body.siteSlug.trim() : '';
  if (!siteSlug) {
    return NextResponse.json({ error: 'siteSlug is required' }, { status: 400 });
  }
  const type: ProofStationeryType =
    body.type === 'invite' || body.type === 'thanks' ? body.type : 'std';

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  }

  // Resolve slug + ownership — same pattern as /api/studio/draft.
  const { data: site } = await sb
    .from('sites')
    .select('id, ai_manifest, site_config, creator_email, names')
    .eq('subdomain', siteSlug)
    .maybeSingle();
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }
  // Case-insensitive owner check — IdP casing variance, see /api/sites/[domain].
  const ownerEmail = String(
    (site as { creator_email?: string }).creator_email
    ?? (site as { site_config?: { creator_email?: string } }).site_config?.creator_email
    ?? '',
  ).toLowerCase().trim();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // No composer configured — warm 502, same copy as a press jam.
    return NextResponse.json({ error: WARM_502 }, { status: 502 });
  }

  const manifest = ((site as { ai_manifest?: unknown }).ai_manifest ?? {}) as StoryManifest;
  const rowNames = (site as { names?: unknown }).names;
  const names: [string, string] | undefined =
    Array.isArray(rowNames) && rowNames.length >= 2
      ? [String(rowNames[0] ?? ''), String(rowNames[1] ?? '')]
      : undefined;

  const suite = suiteThemeFromManifest(manifest, names);

  try {
    const proofs = await generateProofSheet({ suite, manifest, type, siteSlug });
    return NextResponse.json({
      ok: true,
      proofs,
      /** The pack-keyed stylize style this suite would press hero
       *  art in — the client surfaces it on the "Add Pear art"
       *  note chip. The proof flow itself NEVER fires the image
       *  model (cost); the host presses art from Photo style. */
      stylizeStyle: stylizeStyleForSuite(suite, manifest.texture),
      hasStylizedArt: Boolean(suite.stylizedArt),
    });
  } catch (err) {
    console.error('[suite/proofs] composition pass failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: WARM_502 }, { status: 502 });
  }
}
