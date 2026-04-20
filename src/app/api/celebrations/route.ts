// ─────────────────────────────────────────────────────────────
// Pearloom / api/celebrations/route.ts
// A "celebration" groups sibling Pearloom sites that belong to
// the same real-world life event (a wedding weekend with a
// bachelor party, rehearsal dinner, ceremony, brunch — each a
// separate Pearloom site).
//
// Sites sharing the same `manifest.celebration.id` are siblings.
//
// PATCH — owner-only, atomic update of the celebration field on
//         a single site. Mints an id if `celebration` is set
//         without one.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface PatchBody {
  siteId?: string;                              // domain / subdomain
  celebration?: { id?: string; name?: string } | null;
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

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, stored: false });
  }

  // Owner check — site_config.creator_email must match the session.
  const { data: site, error: fetchErr } = await supabase
    .from('sites')
    .select('subdomain, ai_manifest, site_config')
    .eq('subdomain', siteId)
    .maybeSingle();
  if (fetchErr || !site) {
    return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });
  }
  const cfg = site.site_config as { creator_email?: string } | null;
  if (!cfg?.creator_email || cfg.creator_email !== session.user.email) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  // Compute next celebration value.
  let nextCelebration: { id: string; name: string } | null = null;
  if (body.celebration !== null && body.celebration !== undefined) {
    const rawName = (body.celebration.name ?? '').trim();
    if (!rawName) {
      return NextResponse.json(
        { ok: false, error: 'celebration.name required' },
        { status: 400 },
      );
    }
    const rawId = (body.celebration.id ?? '').trim();
    const id = rawId || crypto.randomUUID();
    nextCelebration = { id, name: rawName.slice(0, 80) };
  }

  // Patch manifest.celebration only — leave everything else untouched.
  const manifest = (site.ai_manifest as Record<string, unknown>) ?? {};
  const updatedManifest = { ...manifest };
  if (nextCelebration) {
    updatedManifest.celebration = nextCelebration;
  } else {
    delete updatedManifest.celebration;
  }

  const { error: updateErr } = await supabase
    .from('sites')
    .update({ ai_manifest: updatedManifest })
    .eq('subdomain', siteId);

  if (updateErr) {
    console.error('[celebrations] update failed:', updateErr);
    return NextResponse.json(
      { ok: false, error: 'Could not update celebration.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    stored: true,
    celebration: nextCelebration,
  });
}
