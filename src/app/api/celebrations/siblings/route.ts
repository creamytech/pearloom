// ─────────────────────────────────────────────────────────────
// Pearloom / api/celebrations/siblings/route.ts
// Public endpoint — fetch the list of sibling sites that belong
// to the same celebration as the one referenced by `siteId`.
//
// Returns minimal public metadata so a footer strip on the
// published site can render links to the weekend's other events
// without leaking anything the host didn't already publish.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeOccasion } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface SiblingSummary {
  domain: string;
  names: [string, string] | null;
  occasion: string;
  title: string;
}

interface SiteRow {
  subdomain: string;
  ai_manifest: {
    celebration?: { id?: string; name?: string };
    occasion?: string;
    names?: [string, string];
    seoTitle?: string;
  } | null;
  site_config: { names?: unknown } | null;
  published: boolean | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId')?.trim();
  if (!siteId) {
    return NextResponse.json(
      { ok: false, error: 'siteId required' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, celebration: null, siblings: [] });
  }

  // 1. Read the anchor site's celebration id.
  const { data: anchor, error: anchorErr } = await supabase
    .from('sites')
    .select('ai_manifest')
    .eq('subdomain', siteId)
    .maybeSingle();
  if (anchorErr || !anchor) {
    return NextResponse.json({ ok: true, celebration: null, siblings: [] });
  }

  const anchorCeleb = (anchor.ai_manifest as SiteRow['ai_manifest'])?.celebration;
  if (!anchorCeleb?.id || !anchorCeleb.name) {
    return NextResponse.json({ ok: true, celebration: null, siblings: [] });
  }

  // 2. Fetch every published site with the same celebration.id, excluding self.
  const { data: rows, error: siblingErr } = await supabase
    .from('sites')
    .select('subdomain, ai_manifest, site_config, published')
    .eq('published', true)
    .neq('subdomain', siteId);

  if (siblingErr) {
    console.error('[celebrations/siblings] select failed:', siblingErr);
    return NextResponse.json({ ok: true, celebration: anchorCeleb, siblings: [] });
  }

  const siblings: SiblingSummary[] = ((rows ?? []) as SiteRow[])
    .filter((r) => {
      const c = r.ai_manifest?.celebration;
      return !!c?.id && c.id === anchorCeleb.id;
    })
    .map((r) => {
      const m = r.ai_manifest ?? {};
      const cfgNames = Array.isArray(r.site_config?.names) ? r.site_config!.names : null;
      const names = (m.names as [string, string] | undefined)
        ?? (cfgNames as [string, string] | null);
      const occasion = normalizeOccasion(m.occasion);
      const title = (m.seoTitle as string | undefined)
        ?? (names?.[1] ? `${names[0]} & ${names[1]}` : names?.[0] ?? r.subdomain);
      return {
        domain: r.subdomain,
        names: names ?? null,
        occasion,
        title,
      };
    });

  return NextResponse.json({
    ok: true,
    celebration: anchorCeleb,
    siblings,
  });
}
