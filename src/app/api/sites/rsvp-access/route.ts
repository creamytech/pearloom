// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/rsvp-access/route.ts
//
// PATCH — owner-only, atomic toggle of who can reply to a site's
// RSVP. Patches manifest.rsvpConfig.guestListOnly ONLY, leaving
// every other manifest field untouched (so it never races the
// editor's full-manifest autosave). Mirrors the /api/celebrations
// PATCH pattern: service-role client, case-insensitive owner
// check against site_config.creator_email.
//
//   guestListOnly = false → anyone with the link can RSVP (open).
//   guestListOnly = true  → /api/rsvp only accepts submissions
//                           whose email is already on the guest
//                           list (or that arrive via a personal
//                           guest link).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface PatchBody {
  /** Site uuid or subdomain. */
  siteId?: string;
  /** Next value for who-can-reply. */
  guestListOnly?: boolean;
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const siteId = body.siteId?.trim();
  if (!siteId) {
    return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 });
  }
  if (typeof body.guestListOnly !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'guestListOnly must be a boolean' }, { status: 400 });
  }
  const nextValue = body.guestListOnly;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, stored: false });
  }

  // Resolve by uuid or subdomain — the dashboard passes whichever
  // it has on the selected site.
  const lookup = supabase.from('sites').select('subdomain, ai_manifest, site_config');
  const { data: site, error: fetchErr } = await (UUID_RX.test(siteId)
    ? lookup.eq('id', siteId)
    : lookup.eq('subdomain', siteId)
  ).maybeSingle();
  if (fetchErr || !site) {
    return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });
  }

  // Case-insensitive owner check — IdP casing variance otherwise
  // 403s the legitimate owner. Matches /api/celebrations.
  const cfg = site.site_config as { creator_email?: string } | null;
  const ownerEmail = String(cfg?.creator_email ?? '').toLowerCase().trim();
  const sessionEmail = session.user.email.toLowerCase().trim();
  if (!ownerEmail || ownerEmail !== sessionEmail) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  // Patch manifest.rsvpConfig.guestListOnly only — preserve the
  // rest of rsvpConfig (meal options, question toggles) and the
  // rest of the manifest.
  const manifest = (site.ai_manifest as Record<string, unknown>) ?? {};
  const existingConfig = (manifest.rsvpConfig as Record<string, unknown> | undefined) ?? {};
  const updatedManifest = {
    ...manifest,
    rsvpConfig: { ...existingConfig, guestListOnly: nextValue },
  };

  const { error: updateErr } = await supabase
    .from('sites')
    .update({ ai_manifest: updatedManifest })
    .eq('subdomain', site.subdomain);

  if (updateErr) {
    console.error('[sites/rsvp-access] update failed:', updateErr);
    return NextResponse.json(
      { ok: false, error: 'Could not update RSVP access.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, stored: true, guestListOnly: nextValue });
}
