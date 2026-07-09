// ─────────────────────────────────────────────────────────────
// Pearloom / lib/sites-list.ts — the ONE "list this host's sites"
// query, extracted from /api/sites GET so it can run in two places:
//
//   1. /api/sites GET            — the client refresh path
//   2. (shell)/layout.tsx (RSC)  — the server-side seed that puts
//      the host's sites in the very first dashboard paint instead
//      of after a hydrate → session → fetch round trip (the
//      "5 seconds to show my event" report, 2026-07-08).
//
// Owned sites and co-host rows are fetched IN PARALLEL (they were
// sequential in the route — one whole round trip of latency for
// every dashboard load). The legacy mixed-case fallback and the
// filter-mismatch probe only fire when the indexed query returns
// nothing, exactly as before.
//
// Failure contract: never throws. Returns null on hard failure
// (missing env, query error) and [] only when the queries genuinely
// found no sites — so the SSR seed can distinguish "new account"
// (seed the empty list, skip the client refetch) from "database
// hiccup" (don't seed; let the client retry).
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface ListedSite {
  id: string;
  domain: string;
  occasion: string | null;
  manifest: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  published: boolean;
  names: unknown[];
  coHostRole?: string;
}

const SELECT_COLUMNS = 'id, subdomain, ai_manifest, site_config, created_at, updated_at';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface SiteRow {
  id: string;
  subdomain: string;
  ai_manifest: Record<string, unknown> | null;
  site_config: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

function mapRow(site: SiteRow, coHostRole?: string): ListedSite {
  const manifest = site.ai_manifest;
  const config = site.site_config;
  return {
    id: site.id,
    domain: site.subdomain,
    // manifest.occasion (canonical) → site_config.occasion (legacy).
    occasion: (manifest?.occasion as string | undefined)
      ?? (config?.occasion as string | undefined)
      ?? null,
    manifest,
    created_at: site.created_at,
    updated_at: site.updated_at,
    // Derived from manifest.published — the sites table carries no
    // `published` column in current deployments (42703 otherwise).
    published: Boolean(manifest?.published),
    names: Array.isArray(config?.names) ? (config.names as unknown[]) : ['', ''],
    ...(coHostRole ? { coHostRole } : {}),
  };
}

/** List every site the host owns or co-hosts, newest-touched first.
 *  Never throws; null = hard failure, [] = genuinely no sites. */
export async function listSitesForEmail(email: string): Promise<ListedSite[] | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[sites-list] Supabase not configured — returning empty list');
    return null;
  }
  const sessionEmail = email.toLowerCase().trim();

  try {
    // Owned sites (indexed creator_email eq) + co-host rows, in
    // parallel — these are independent.
    const [initial, cohostRes] = await Promise.all([
      supabase
        .from('sites')
        .select(SELECT_COLUMNS)
        .eq('creator_email', sessionEmail)
        .order('updated_at', { ascending: false, nullsFirst: false }),
      supabase
        .from('cohosts')
        .select('site_id, role')
        .eq('email', sessionEmail)
        .limit(50),
    ]);

    let data = initial.data as SiteRow[] | null;
    const error = initial.error;

    // Legacy backstop: pre-normalisation rows can carry mixed-case
    // creator_email and miss the exact eq. Case-insensitive match on
    // the same indexed column; only when the exact match is empty.
    if (!error && (!data || data.length === 0)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('sites')
        .select(SELECT_COLUMNS)
        .ilike('creator_email', sessionEmail)
        .order('updated_at', { ascending: false, nullsFirst: false });
      if (!legacyError) data = legacyData as SiteRow[] | null;
    }

    console.log(`[sites-list] email=${sessionEmail} count=${data?.length ?? 0}`);

    // Diagnostic safety net (see /api/sites history): if the SQL
    // filter finds nothing but the JSON extraction matches, log the
    // mismatch and fall back to the JS-side filter.
    if (!data || data.length === 0) {
      try {
        const { data: probe } = await supabase
          .from('sites')
          .select('id, subdomain, site_config')
          .limit(8);
        const probeRows = (probe ?? []) as Array<Pick<SiteRow, 'id' | 'subdomain' | 'site_config'>>;
        const matches = probeRows.filter(
          (r) => String(r.site_config?.creator_email ?? '').toLowerCase() === sessionEmail,
        );
        if (matches.length > 0) {
          console.warn(
            `[sites-list] FILTER MISMATCH, ${matches.length} site(s) match in JS but not in SQL. Subdomains:`,
            matches.map((m) => m.subdomain).join(','),
          );
          const { data: allRows } = await supabase
            .from('sites')
            .select(SELECT_COLUMNS)
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(200);
          const filtered = ((allRows ?? []) as SiteRow[]).filter(
            (r) => String(r.site_config?.creator_email ?? '').toLowerCase().trim() === sessionEmail,
          );
          if (filtered.length > 0) data = filtered;
        }
      } catch (probeErr) {
        console.warn('[sites-list] probe failed (non-fatal):', probeErr);
      }
    }

    if (error && (!data || data.length === 0)) {
      console.error('[sites-list] database error:', error);
      return null;
    }

    const mapped = (data ?? []).map((row) => mapRow(row));

    // Co-host sites — appended after owned rows with the role marker.
    try {
      const ownedIds = new Set(mapped.map((s) => s.id));
      const sharedRows = (cohostRes.data ?? []).filter(
        (r) => !ownedIds.has(r.site_id as string),
      );
      if (sharedRows.length > 0) {
        const roleById = new Map(sharedRows.map((r) => [r.site_id as string, r.role as string]));
        const { data: sharedSites } = await supabase
          .from('sites')
          .select(SELECT_COLUMNS)
          .in('id', [...roleById.keys()]);
        for (const site of (sharedSites ?? []) as SiteRow[]) {
          mapped.push(mapRow(site, roleById.get(site.id)));
        }
      }
    } catch (cohostErr) {
      console.warn('[sites-list] co-host lookup failed (non-fatal):', cohostErr);
    }

    return mapped;
  } catch (err) {
    console.error('[sites-list] failed:', err);
    return null;
  }
}
