// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/seating/route.ts
//
// PATCH — owner-only, atomic save of the seating plan to the site
// manifest (manifest.seatingPlan). The seating arranger is a
// dashboard surface, not the editor, so it patches this ONE field
// and never touches the rest of the manifest (no race with the
// editor's full-manifest autosave). Mirrors /api/sites/rsvp-access.
//
//   seatingPlan = {
//     tables:      [{ id, name, capacity, group? }],
//     assignments: { [guestId]: tableId },
//   }
//
// Works for every occasion — tables + assignments carry no
// wedding-specific shape.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Defensive caps so a bad client can't bloat the manifest.
const MAX_TABLES = 300;
const MAX_ASSIGNMENTS = 5000;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  group?: string;
}

interface PatchBody {
  siteId?: string;
  seatingPlan?: {
    tables?: unknown;
    assignments?: unknown;
  };
}

/** Sanitize the incoming plan into a known shape — never trust the
 *  client's object verbatim into the manifest. */
function cleanPlan(raw: PatchBody['seatingPlan']): { tables: Table[]; assignments: Record<string, string> } | null {
  if (!raw || typeof raw !== 'object') return null;
  const rawTables = Array.isArray(raw.tables) ? raw.tables : [];
  if (rawTables.length > MAX_TABLES) return null;
  const tables: Table[] = [];
  for (const t of rawTables) {
    if (!t || typeof t !== 'object') continue;
    const o = t as Record<string, unknown>;
    const id = String(o.id ?? '').slice(0, 64);
    if (!id) continue;
    tables.push({
      id,
      name: String(o.name ?? '').slice(0, 80),
      capacity: Math.max(1, Math.min(200, Number(o.capacity) || 1)),
      ...(typeof o.group === 'string' ? { group: o.group.slice(0, 40) } : {}),
    });
  }
  const assignments: Record<string, string> = {};
  const rawAssign = raw.assignments;
  if (rawAssign && typeof rawAssign === 'object') {
    const entries = Object.entries(rawAssign as Record<string, unknown>);
    if (entries.length > MAX_ASSIGNMENTS) return null;
    for (const [guestId, tableId] of entries) {
      if (typeof tableId === 'string' && tableId) {
        assignments[guestId.slice(0, 64)] = tableId.slice(0, 64);
      }
    }
  }
  return { tables, assignments };
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
  const plan = cleanPlan(body.seatingPlan);
  if (!plan) {
    return NextResponse.json({ ok: false, error: 'Invalid seatingPlan' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const lookup = supabase.from('sites').select('subdomain, ai_manifest, site_config');
  const { data: site, error: fetchErr } = await (UUID_RX.test(siteId)
    ? lookup.eq('id', siteId)
    : lookup.eq('subdomain', siteId)
  ).maybeSingle();
  if (fetchErr || !site) {
    return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });
  }

  // Case-insensitive owner check — matches /api/sites/rsvp-access.
  const cfg = site.site_config as { creator_email?: string } | null;
  const ownerEmail = String(cfg?.creator_email ?? '').toLowerCase().trim();
  const sessionEmail = session.user.email.toLowerCase().trim();
  if (!ownerEmail || ownerEmail !== sessionEmail) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const manifest = (site.ai_manifest as Record<string, unknown>) ?? {};
  const updatedManifest = { ...manifest, seatingPlan: plan };

  const { error: updateErr } = await supabase
    .from('sites')
    .update({ ai_manifest: updatedManifest })
    .eq('subdomain', site.subdomain);

  if (updateErr) {
    console.error('[sites/seating] update failed:', updateErr);
    return NextResponse.json({ ok: false, error: 'Could not save seating.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
