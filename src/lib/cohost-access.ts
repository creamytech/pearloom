// ─────────────────────────────────────────────────────────────
// Pearloom / lib/cohost-access.ts
//
// ONE source of truth for "who is this viewer to this site".
//
// Ownership history: creator_email originally lived inside
// site_config JSONB; migration 20260415 added a top-level
// sites.creator_email column and backfilled it ONCE, but the app's
// write paths kept writing only the JSON — so any site created
// after the backfill has a NULL column. Several routes read only
// the column and 403'd the legitimate owner (the co-host mint
// route was completely unusable on new sites). Every ownership
// check now goes through ownerEmailOf(), which reads the column
// with a JSON fallback, and db.ts writes BOTH on every save so
// the column converges over time.
//
// Roles: 'owner' (creator) > cohost row ('editor' |
// 'guest-manager' | 'viewer') > null. Capability map:
//   owner          — everything
//   editor         — open editor, edit, save (NOT publish/delete)
//   guest-manager  — open editor (guest tools), save guest data
//   viewer         — open editor in preview, no saves
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

export type CoHostRole = 'editor' | 'guest-manager' | 'viewer';
export type ViewerRole = 'owner' | CoHostRole;

/** Canonical owner email — top-level column first, site_config
 *  JSON fallback. Always lowercased + trimmed ('' when orphan). */
export function ownerEmailOf(row: {
  creator_email?: unknown;
  site_config?: unknown;
} | null | undefined): string {
  if (!row) return '';
  const top = typeof row.creator_email === 'string' ? row.creator_email : '';
  const cfg = (row.site_config as Record<string, unknown> | null | undefined)?.creator_email;
  const json = typeof cfg === 'string' ? cfg : '';
  return (top || json).toLowerCase().trim();
}

export interface ResolvedAccess {
  role: ViewerRole | null;
  siteId: string | null;
  subdomain: string | null;
  ownerEmail: string;
}

/** Resolve the viewer's role for a site by id OR subdomain. */
export async function resolveViewerRole(
  supabase: SupabaseClient,
  by: { siteId?: string | null; subdomain?: string | null },
  email: string,
): Promise<ResolvedAccess> {
  const caller = email.toLowerCase().trim();
  const none: ResolvedAccess = { role: null, siteId: null, subdomain: null, ownerEmail: '' };
  if (!by.siteId && !by.subdomain) return none;

  const { data: site } = await supabase
    .from('sites')
    .select('id, subdomain, creator_email, site_config')
    .eq(by.siteId ? 'id' : 'subdomain', (by.siteId || by.subdomain) as string)
    .maybeSingle();
  if (!site) return none;

  const ownerEmail = ownerEmailOf(site);
  const base = {
    siteId: site.id as string,
    subdomain: (site.subdomain as string) ?? null,
    ownerEmail,
  };
  if (ownerEmail && ownerEmail === caller) return { ...base, role: 'owner' };

  const { data: cohost } = await supabase
    .from('cohosts')
    .select('role')
    .eq('site_id', site.id as string)
    .eq('email', caller)
    .maybeSingle();
  const role = (cohost?.role as CoHostRole | undefined) ?? null;
  return { ...base, role };
}

/** Roles allowed to write site content (manifest saves). */
export function canEditSite(role: ViewerRole | null): boolean {
  return role === 'owner' || role === 'editor';
}

/** Roles allowed to open the editor at all. Viewers get a
 *  preview-locked editor; guest-managers get the guest tools. */
export function canOpenEditor(role: ViewerRole | null): boolean {
  return role !== null;
}
