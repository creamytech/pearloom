// ─────────────────────────────────────────────────────────────
// Pearloom / lib/people.ts — persistent guest identity helpers.
//
// A `person` (public.people) is one human across every celebration
// on the platform, keyed by lowercase email. Guests rows link via
// person_id (migration 20260621_people.sql). Everything here is
// FAILURE-TOLERANT by design: identity linkage is a nicety layered
// on top of RSVPs / imports — it must never block or fail them.
//
// Privacy contract (do not loosen without a product decision):
//   • Hosts only learn history from their OWN sites — a host can
//     never see which other hosts' events a guest attended.
//   • Guests see their own full history (it's their data), gated
//     by their passport token.
//   • people.connections_opt_in defaults false; cross-guest
//     visibility is a later, opt-in phase.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

/** Lowercased + trimmed, or null when it doesn't look like an
 *  email at all. The identity merge key. */
export function normalizePersonEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

export interface PersonFacts {
  email: string;
  name?: string | null;
  phone?: string | null;
  dietary?: string | null;
}

/** Upsert a person by email and return their id. Provided facts
 *  refresh the profile (latest-known wins); absent facts never
 *  blank existing ones. Returns null on any failure — callers
 *  treat linkage as fire-and-forget. */
export async function resolvePersonId(
  supabase: SupabaseClient,
  facts: PersonFacts,
): Promise<string | null> {
  const email = normalizePersonEmail(facts.email);
  if (!email) return null;
  try {
    const { data: existing } = await supabase
      .from('people')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing?.id) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (facts.name?.trim()) patch.display_name = facts.name.trim();
      if (facts.phone?.trim()) patch.phone = facts.phone.trim();
      if (facts.dietary?.trim()) patch.dietary = facts.dietary.trim();
      await supabase.from('people').update(patch).eq('id', existing.id);
      return String(existing.id);
    }
    const { data: inserted, error } = await supabase
      .from('people')
      .insert({
        email,
        display_name: facts.name?.trim() || null,
        phone: facts.phone?.trim() || null,
        dietary: facts.dietary?.trim() || null,
      })
      .select('id')
      .single();
    if (error) {
      // Unique-violation race (two RSVPs landing together) — the
      // row exists now; read it back.
      const { data: raced } = await supabase
        .from('people')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      return raced?.id ? String(raced.id) : null;
    }
    return inserted?.id ? String(inserted.id) : null;
  } catch (err) {
    console.warn('[people] resolvePersonId failed (non-fatal):', err);
    return null;
  }
}

/** Resolve + link one guests row. Fire-and-forget from write paths
 *  (`void linkGuestRowToPerson(...)`). */
export async function linkGuestRowToPerson(
  supabase: SupabaseClient,
  guestRowId: string,
  facts: PersonFacts,
): Promise<void> {
  try {
    const personId = await resolvePersonId(supabase, facts);
    if (!personId) return;
    await supabase.from('guests').update({ person_id: personId }).eq('id', guestRowId);
  } catch (err) {
    console.warn('[people] linkGuestRowToPerson failed (non-fatal):', err);
  }
}

export interface PersonEventHistoryRow {
  siteId: string;
  domain: string;
  names: string[];
  occasion: string | null;
  status: string | null;
  respondedAt: string | null;
}

interface HostSiteRow {
  id: string;
  subdomain: string;
  site_config: {
    creator_email?: string;
    names?: [string, string];
    occasion?: string;
    manifest?: { occasion?: string };
  } | null;
}

/** History of one email across the HOST'S OWN sites — the privacy
 *  boundary is the creator_email match; other hosts' events never
 *  surface here. `excludeSiteId` drops the site the host is
 *  currently looking at. */
export async function personHistoryForHost(
  supabase: SupabaseClient,
  opts: { email: string; hostEmail: string; excludeSiteId?: string },
): Promise<{ history: PersonEventHistoryRow[]; dietary: string | null }> {
  const email = normalizePersonEmail(opts.email);
  const hostEmail = (opts.hostEmail ?? '').trim().toLowerCase();
  if (!email || !hostEmail) return { history: [], dietary: null };

  const { data: sites } = await supabase
    .from('sites')
    .select('id, subdomain, site_config')
    .eq('site_config->>creator_email', hostEmail);
  const siteRows = (sites ?? []) as HostSiteRow[];
  const eligible = siteRows.filter((s) => s.id !== opts.excludeSiteId);
  if (eligible.length === 0) return { history: [], dietary: await knownDietary(supabase, email) };

  const { data: guestRows } = await supabase
    .from('guests')
    .select('site_id, status, responded_at, dietary_restrictions')
    .in('site_id', eligible.map((s) => s.id))
    .ilike('email', email); // ilike with no wildcards = case-insensitive equality

  const bySite = new Map(eligible.map((s) => [s.id, s]));
  const history: PersonEventHistoryRow[] = (guestRows ?? []).flatMap((g) => {
    const site = bySite.get(String(g.site_id));
    if (!site) return [];
    const cfg = site.site_config ?? {};
    return [{
      siteId: site.id,
      domain: site.subdomain,
      names: (cfg.names ?? []).filter(Boolean) as string[],
      occasion: cfg.occasion ?? cfg.manifest?.occasion ?? null,
      status: (g.status as string | null) ?? null,
      respondedAt: (g.responded_at as string | null) ?? null,
    }];
  });

  return { history, dietary: await knownDietary(supabase, email) };
}

async function knownDietary(supabase: SupabaseClient, email: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('people')
      .select('dietary')
      .eq('email', email)
      .maybeSingle();
    const d = (data?.dietary as string | null) ?? null;
    return d?.trim() ? d.trim() : null;
  } catch {
    return null;
  }
}
