// ─────────────────────────────────────────────────────────────
// Pearloom / lib/celebrations.ts — the Celebration Model
// (GRAND-PLAN Phase 5, foundation).
//
// A "celebration" is the weekend/arc a set of sibling sites belong
// to (a wedding + its bachelor party + rehearsal + brunch). It used
// to live only as a shared string (manifest.celebration.{id,name});
// 20260706_celebrations.sql promotes it to a first-class row keyed by
// that legacy string, with sites.celebration_id as the real FK.
//
// The manifest string stays the WORKING store (a cached projection,
// like manifest.budget), so every existing reader keeps working; these
// helpers keep the table + FK in sync so celebration-scoped features
// (shared roster, unified RSVP, celebration budgets) can resolve. All
// best-effort: a table hiccup never blocks a link — the manifest write
// is the source of truth for the projection.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Upsert the first-class celebration for a manifest celebration id,
 * returning the row's canonical uuid (or null on failure — the caller
 * treats the FK as best-effort). Keyed on legacy_id (the unique
 * manifest.celebration.id string). Refreshes the name; never overwrites
 * the original owner_email on a later link.
 */
export async function syncCelebration(
  sb: SupabaseClient,
  opts: { legacyId: string; name: string; ownerEmail?: string | null },
): Promise<string | null> {
  const legacyId = opts.legacyId.trim();
  if (!legacyId) return null;
  const name = (opts.name || 'Our celebration').trim().slice(0, 80);
  const ownerEmail = opts.ownerEmail?.toLowerCase().trim() || null;
  try {
    const { data: existing } = await sb
      .from('celebrations')
      .select('id')
      .eq('legacy_id', legacyId)
      .maybeSingle();
    if (existing) {
      const id = (existing as { id: string }).id;
      await sb.from('celebrations').update({ name }).eq('id', id);
      return id;
    }
    const { data: inserted, error } = await sb
      .from('celebrations')
      .insert({ legacy_id: legacyId, name, owner_email: ownerEmail })
      .select('id')
      .single();
    if (!error && inserted) return (inserted as { id: string }).id;
    // Lost an insert race on the unique legacy_id — re-read the winner.
    const { data: raced } = await sb
      .from('celebrations')
      .select('id')
      .eq('legacy_id', legacyId)
      .maybeSingle();
    return raced ? (raced as { id: string }).id : null;
  } catch {
    return null;
  }
}

/** Set (or clear) a site's celebration_id FK by subdomain. Best-effort
 *  — manifest.celebration remains the working projection. */
export async function linkSiteCelebration(
  sb: SupabaseClient,
  subdomain: string,
  celebrationId: string | null,
): Promise<void> {
  try {
    await sb.from('sites').update({ celebration_id: celebrationId }).eq('subdomain', subdomain);
  } catch {
    /* the manifest string is authoritative for the projection */
  }
}

export interface CelebrationEventSite {
  subdomain: string;
  occasion: string | null;
  published: boolean;
}

/**
 * Every site in a celebration, resolved by the FK first and falling
 * back to the legacy manifest string so pre-backfill / string-only
 * rows still group. Owner-gated callers only (service role). Used by
 * the celebration roster / unified-headcount readers.
 */
export async function celebrationSites(
  sb: SupabaseClient,
  opts: { celebrationId?: string | null; legacyId?: string | null },
): Promise<CelebrationEventSite[]> {
  const out = new Map<string, CelebrationEventSite>();
  const add = (rows: Array<{ subdomain: string; ai_manifest: unknown; published?: boolean | null }>) => {
    for (const r of rows) {
      const m = (r.ai_manifest as { occasion?: string } | null) ?? null;
      out.set(r.subdomain, {
        subdomain: r.subdomain,
        occasion: m?.occasion ?? null,
        published: r.published === true,
      });
    }
  };
  try {
    if (opts.celebrationId) {
      const { data } = await sb
        .from('sites')
        .select('subdomain, ai_manifest, published')
        .eq('celebration_id', opts.celebrationId);
      if (Array.isArray(data)) add(data as never[]);
    }
    if (opts.legacyId) {
      const { data } = await sb
        .from('sites')
        .select('subdomain, ai_manifest, published')
        .eq('ai_manifest->celebration->>id', opts.legacyId);
      if (Array.isArray(data)) add(data as never[]);
    }
  } catch {
    /* best-effort */
  }
  return [...out.values()];
}
