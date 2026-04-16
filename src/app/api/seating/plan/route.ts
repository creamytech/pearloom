// ─────────────────────────────────────────────────────────────
// Pearloom / api/seating/plan/route.ts
//
// Claude-powered seating planner that uses the Event OS
// relationship graph. Emits an assignment plan scored on:
//   - maximize sum of closeness for co-seated guests
//   - never exceed table capacity
//   - balance both sides across tables
//   - respect dietary / accessibility proximity when stated
//
// Output is a DRAFT — the host reviews before the old
// /api/seating/optimize endpoint commits to `seats`.
//
// POST { siteId } → { plan: { tables: [{ label, guestIds[] }] }, notes }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { generateJson, cached } from '@/lib/claude';
import { listGuests, listRelationships } from '@/lib/event-os/db';
import { sanitizeSeatingPlan } from '@/lib/event-os/seating-sanitize';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

interface TableRow {
  id: string;
  label: string;
  capacity: number;
  shape: string;
}

interface PlannedTable {
  label: string;
  guestIds: string[];
  rationale: string;
}

interface PlanOutput {
  tables: PlannedTable[];
  unseatedGuestIds: string[];
  notes: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { siteId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const siteId = body.siteId;
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  // Ownership check
  const { data: site } = await sb()
    .from('sites')
    .select('id, subdomain, site_config')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const client = sb();
  const { data: tablesData } = await client
    .from('seating_tables')
    .select('id, label, capacity, shape')
    .eq('site_id', site.subdomain)
    .order('label', { ascending: true });
  const tables = (tablesData ?? []) as TableRow[];
  if (tables.length === 0) {
    return NextResponse.json({ error: 'Add tables first' }, { status: 400 });
  }

  const guests = await listGuests(siteId);
  if (guests.length === 0) {
    return NextResponse.json({ error: 'No guests' }, { status: 400 });
  }

  const edges = await listRelationships(siteId);

  const totalCapacity = tables.reduce((s, t) => s + t.capacity, 0);

  const guestDigest = guests.map((g) => ({
    id: g.id,
    name: g.display_name,
    side: g.side,
    relationship: g.relationship_to_host,
    dietary: g.dietary,
    accessibility: g.accessibility,
    plusOneOf: g.is_plus_one_of,
  }));

  const edgeDigest = edges.slice(0, 200).map((e) => ({
    from: e.from_guest_id,
    to: e.to_guest_id,
    kind: e.kind,
    closeness: e.closeness,
  }));

  try {
    const plan = await generateJson<PlanOutput>({
      tier: 'sonnet',
      temperature: 0.3,
      maxTokens: 3000,
      system: cached(
        `You are Pearloom's seating planner. You produce seat assignments that maximize table-level closeness while respecting constraints. Every plus_one must share a table with their host. Never exceed capacity. Prefer putting together people whose relationship_graph closeness is 4+.`,
        '1h'
      ) as unknown as string,
      messages: [
        {
          role: 'user',
          content: `TABLES (total capacity = ${totalCapacity}):
${JSON.stringify(tables.map((t) => ({ label: t.label, capacity: t.capacity, shape: t.shape })))}

GUESTS (${guests.length}):
${JSON.stringify(guestDigest)}

RELATIONSHIP GRAPH (closeness 1-5):
${JSON.stringify(edgeDigest)}

Produce:
- tables[]: for each table, the list of guestIds to seat there + a one-sentence rationale
- unseatedGuestIds[]: any guests you couldn't place
- notes: short string summarizing the key tradeoffs you made

Hard rules:
- No table may exceed its capacity
- Every plus_one must sit at the same table as their host (is_plus_one_of)
- Every guest appears in at most one table's guestIds`,
        },
      ],
      schemaName: 'emit_seating_plan',
      schema: {
        type: 'object',
        properties: {
          tables: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                guestIds: { type: 'array', items: { type: 'string' } },
                rationale: { type: 'string' },
              },
              required: ['label', 'guestIds', 'rationale'],
            },
          },
          unseatedGuestIds: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
        required: ['tables', 'unseatedGuestIds', 'notes'],
      },
    });

    // Validation pass — trim over-capacity tables and compute quality score
    const { tables: sanitizedTables, unseatedGuestIds, stats } = sanitizeSeatingPlan({
      planTables: plan.tables,
      planUnseated: plan.unseatedGuestIds,
      tables: tables.map((t) => ({ label: t.label, capacity: t.capacity })),
      edges: edges.map((e) => ({
        from_guest_id: e.from_guest_id,
        to_guest_id: e.to_guest_id,
        closeness: e.closeness,
      })),
    });

    return NextResponse.json({
      plan: { tables: sanitizedTables, unseatedGuestIds, notes: plan.notes },
      stats: {
        ...stats,
        total: guests.length,
      },
    });
  } catch (err) {
    console.error('[seating/plan] failed', err);
    return NextResponse.json(
      { error: 'Planner failed', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}
