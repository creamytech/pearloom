// ─────────────────────────────────────────────────────────────
// Pearloom / api/vendors/book/gate.ts
//
// The Vendor Book's shared owner gate — extracted from route.ts
// so the packet-token minter (./packet/route.ts) reuses the exact
// same session → rate-limit → site-resolution → owner check
// instead of forking it. Route files may only export HTTP
// handlers, hence the sibling module.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';

export const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export type Gate =
  | { ok: true; email: string; supabase: SupabaseClient; siteId: string }
  | { ok: false; res: NextResponse };

/** getServerSession → checkRateLimit → resolve the site (uuid or
 *  subdomain) → case-insensitive owner check against
 *  site_config.creator_email. Returns the site's canonical uuid id
 *  (what site_vendors.site_id stores). */
export async function gate(rawSiteId: string | null | undefined, write: boolean): Promise<Gate> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const rate = checkRateLimit(`vendor-book:${write ? 'w' : 'r'}:${email}`, {
    max: write ? 30 : 120,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 }) };
  }

  const siteId = rawSiteId?.trim();
  if (!siteId) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 }) };
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Env-less deploys degrade softly, matching /api/sites/budget.
    return { ok: false, res: NextResponse.json({ ok: true, stored: false, vendors: [] }) };
  }

  const lookup = supabase.from('sites').select('id, site_config, creator_email');
  const { data: site, error } = await (UUID_RX.test(siteId)
    ? lookup.eq('id', siteId)
    : lookup.eq('subdomain', siteId)
  ).maybeSingle();
  if (error || !site) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 }) };
  }

  // Case-insensitive owner check — IdP casing variance, see /api/toasts.
  const cfg = site.site_config as { creator_email?: string } | null;
  const ownerEmail = String(site.creator_email ?? cfg?.creator_email ?? '').toLowerCase().trim();
  if (!ownerEmail || ownerEmail !== email) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, email, supabase, siteId: String(site.id) };
}
