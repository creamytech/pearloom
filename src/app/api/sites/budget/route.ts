// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/sites/budget/route.ts
//
// PATCH — owner-only save of the host-entered budget to the site
// manifest (manifest.budget). The cockpit budget breakdown is the
// only writer. The write is guarded with optimistic concurrency on
// sites.updated_at (bumped by the tg_set_updated_at trigger on every
// update), so an editor full-manifest autosave landing between our
// read and write is detected and retried on the fresh manifest —
// never silently clobbered. (/api/sites/seating predates this guard.)
//
//   budget = [{ cat: string, used: number, cap: number }, …]
//
// All numbers are host-entered (a real plan they keep), so the
// cockpit shows a true figure — never an invented one.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINES = 40;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface BudgetLine { cat: string; used: number; cap: number }
interface PatchBody { siteId?: string; budget?: unknown }

function clean(raw: unknown): BudgetLine[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > MAX_LINES) return null;
  const out: BudgetLine[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const cat = String(o.cat ?? '').slice(0, 80).trim();
    if (!cat) continue;
    const used = Math.max(0, Math.min(1e9, Number(o.used) || 0));
    const cap = Math.max(0, Math.min(1e9, Number(o.cap) || 0));
    out.push({ cat, used, cap });
  }
  return out;
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
  if (!siteId) return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 });
  const budget = clean(body.budget);
  if (!budget) return NextResponse.json({ ok: false, error: 'Invalid budget' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, stored: false });

  const lookup = supabase.from('sites').select('subdomain, ai_manifest, site_config, creator_email, updated_at');
  const { data: site, error: fetchErr } = await (UUID_RX.test(siteId)
    ? lookup.eq('id', siteId)
    : lookup.eq('subdomain', siteId)
  ).maybeSingle();
  if (fetchErr || !site) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

  const cfg = site.site_config as { creator_email?: string } | null;
  const ownerEmail = String(site.creator_email ?? cfg?.creator_email ?? '').toLowerCase().trim();
  const sessionEmail = session.user.email.toLowerCase().trim();
  if (!ownerEmail || ownerEmail !== sessionEmail) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  // Optimistic-concurrency write: only update if updated_at still
  // matches what we read; a miss means another writer (the editor's
  // autosave) landed in between — re-read and retry on ITS manifest
  // so neither write is lost.
  let manifest = (site.ai_manifest as Record<string, unknown>) ?? {};
  let seenUpdatedAt = (site.updated_at as string | null) ?? null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const updatedManifest = { ...manifest, budget };
    let write = supabase
      .from('sites')
      .update({ ai_manifest: updatedManifest })
      .eq('subdomain', site.subdomain);
    write = seenUpdatedAt === null ? write.is('updated_at', null) : write.eq('updated_at', seenUpdatedAt);
    const { data: touched, error: updateErr } = await write.select('subdomain');

    if (updateErr) {
      console.error('[sites/budget] update failed:', updateErr);
      return NextResponse.json({ ok: false, error: 'Could not save budget.' }, { status: 500 });
    }
    if ((touched ?? []).length > 0) {
      return NextResponse.json({ ok: true, stored: true, budget });
    }

    const { data: fresh } = await supabase
      .from('sites')
      .select('ai_manifest, updated_at')
      .eq('subdomain', site.subdomain)
      .maybeSingle();
    if (!fresh) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });
    manifest = (fresh.ai_manifest as Record<string, unknown>) ?? {};
    seenUpdatedAt = (fresh.updated_at as string | null) ?? null;
  }

  console.error('[sites/budget] gave up after 3 optimistic-concurrency retries');
  return NextResponse.json({ ok: false, error: 'The editor saved at the same moment. Try again.' }, { status: 409 });
}
