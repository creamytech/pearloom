// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/budget/lines/route.ts — the money spine
// (GRAND-PLAN Phase 0).
//
// Owner-gated CRUD over the budget_lines table (see
// 20260706_budget_lines.sql): the RICH, cents-precise ledger with
// planned ↔ committed ↔ paid, expense/income, and a REAL vendor
// link (source_kind='vendor', source_id = site_vendors.id).
//
// This is a SEPARATE store from /api/sites/budget (which writes the
// cockpit's back-of-napkin manifest.budget = [{cat,used,cap}] in
// dollars). The two never sync — the cockpit reads the table
// rollup when rows exist, else the legacy array.
//
//   GET    ?siteId=<uuid|subdomain>   — list (owner only)
//   POST   { siteId, line }           — upsert ONE line (owner only)
//   DELETE ?siteId=&id=               — delete one line (owner only)
//
// Ownership = case-insensitive site_config.creator_email /
// creator_email (the /api/sites/budget pattern). Every money field
// is host-entered cents — this is a ledger, never a payment
// surface, and null cost stays null (never a recorded $0).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import type {
  BudgetLine,
  BudgetLineInput,
  BudgetKind,
  BudgetSourceKind,
} from '@/lib/budget/lines';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// $10M ceiling — comfortably above any real event budget line.
const MAX_CENTS = 1_000_000_000;
const MAX_LEN = 80;
const MAX_LINES_PER_SITE = 200;
const KINDS: BudgetKind[] = ['expense', 'income'];
const SOURCE_KINDS: BudgetSourceKind[] = ['manual', 'vendor', 'expense', 'pledge'];

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── The budget_lines row (DB snake_case) ──────────────────────

interface BudgetLineRow {
  id: string;
  site_id: string;
  celebration_id: string | null;
  scope: 'site' | 'celebration';
  category: string;
  label: string | null;
  kind: BudgetKind;
  planned_cents: number | null;
  committed_cents: number | null;
  paid_cents: number | null;
  source_kind: BudgetSourceKind | null;
  source_id: string | null;
  sort_index: number;
}

/** DB snake_case → the camelCase BudgetLine the client consumes. */
function view(row: BudgetLineRow): BudgetLine {
  return {
    id: row.id,
    siteId: row.site_id,
    celebrationId: row.celebration_id,
    scope: row.scope,
    category: row.category,
    label: row.label,
    kind: row.kind,
    plannedCents: row.planned_cents,
    committedCents: row.committed_cents,
    paidCents: row.paid_cents,
    sourceKind: row.source_kind,
    sourceId: row.source_id,
    sortIndex: row.sort_index,
  };
}

// ── Field sanitizers ──────────────────────────────────────────

function text(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

/** Explicit empties stay null — Number(null) is 0, which would turn
 *  "not entered" into a recorded $0. Otherwise clamp to a sane,
 *  non-negative integer cent count. */
function cents(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(MAX_CENTS, Math.round(n));
}

function sortIndex(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100_000, Math.round(n));
}

// ── Owner gate (the /api/sites/budget pattern + a rate limit) ──

type Gate =
  | { ok: true; email: string; supabase: SupabaseClient; siteId: string }
  | { ok: false; res: NextResponse };

async function gate(rawSiteId: string | null | undefined, write: boolean): Promise<Gate> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const rate = checkRateLimit(`budget-lines:${write ? 'w' : 'r'}:${email}`, {
    max: write ? 40 : 120,
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
    return { ok: false, res: NextResponse.json({ ok: true, stored: false, lines: [] }) };
  }

  const lookup = supabase.from('sites').select('id, site_config, creator_email');
  const { data: site, error } = await (UUID_RX.test(siteId)
    ? lookup.eq('id', siteId)
    : lookup.eq('subdomain', siteId)
  ).maybeSingle();
  if (error || !site) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 }) };
  }

  // Case-insensitive owner check — IdP casing variance (see /api/toasts).
  const cfg = site.site_config as { creator_email?: string } | null;
  const ownerEmail = String(site.creator_email ?? cfg?.creator_email ?? '').toLowerCase().trim();
  if (!ownerEmail || ownerEmail !== email) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) };
  }

  // budget_lines.site_id stores the site's canonical uuid.
  return { ok: true, email, supabase, siteId: String(site.id) };
}

// ── GET: list the ledger ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const g = await gate(req.nextUrl.searchParams.get('siteId'), false);
  if (!g.ok) return g.res;

  const { data, error } = await g.supabase
    .from('budget_lines')
    .select('*')
    .eq('site_id', g.siteId)
    .order('sort_index', { ascending: true })
    .order('category', { ascending: true });

  if (error) {
    console.error('[sites/budget/lines] GET failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not load the budget.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lines: ((data ?? []) as BudgetLineRow[]).map(view) });
}

// ── POST: upsert one line ─────────────────────────────────────

interface PostBody {
  siteId?: string;
  line?: (BudgetLineInput & { id?: string; scope?: 'site' | 'celebration' }) | unknown;
}

export async function POST(req: NextRequest) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const g = await gate(typeof body.siteId === 'string' ? body.siteId : null, true);
  if (!g.ok) return g.res;

  const raw = body.line;
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ ok: false, error: 'line required' }, { status: 400 });
  }
  const line = raw as Record<string, unknown>;

  const category = text(line.category, MAX_LEN);
  if (!category) {
    return NextResponse.json({ ok: false, error: 'A category is required' }, { status: 400 });
  }

  const kind: BudgetKind = KINDS.includes(line.kind as BudgetKind) ? (line.kind as BudgetKind) : 'expense';
  const sourceKind: BudgetSourceKind | null = SOURCE_KINDS.includes(line.sourceKind as BudgetSourceKind)
    ? (line.sourceKind as BudgetSourceKind)
    : null;
  const sourceId =
    typeof line.sourceId === 'string' && UUID_RX.test(line.sourceId) ? line.sourceId : null;
  const celebrationId =
    typeof line.celebrationId === 'string' && UUID_RX.test(line.celebrationId) ? line.celebrationId : null;
  const scope: 'site' | 'celebration' = line.scope === 'celebration' ? 'celebration' : 'site';
  const lineId = typeof line.id === 'string' && UUID_RX.test(line.id) ? line.id : null;

  // The mutable fields of a line — shared by insert + update.
  const cols = {
    category,
    label: text(line.label, MAX_LEN),
    kind,
    planned_cents: cents(line.plannedCents),
    committed_cents: cents(line.committedCents),
    paid_cents: cents(line.paidCents),
    source_kind: sourceKind,
    source_id: sourceId,
    sort_index: sortIndex(line.sortIndex),
    scope,
    celebration_id: celebrationId,
    updated_at: new Date().toISOString(),
  };

  const isVendor = sourceKind === 'vendor' && !!sourceId;

  // ── Vendor-linked line: upsert on the (site_id, source_id) unique
  //    index — a repeat "Add to budget" UPDATES in place, never
  //    duplicates. Select-then-write (the partial unique index isn't
  //    an ON CONFLICT arbiter PostgREST can infer). ──
  if (isVendor) {
    const { data: existing, error: findErr } = await g.supabase
      .from('budget_lines')
      .select('id')
      .eq('site_id', g.siteId)
      .eq('source_kind', 'vendor')
      .eq('source_id', sourceId)
      .maybeSingle();
    if (findErr) {
      console.error('[sites/budget/lines] vendor lookup failed:', findErr.message);
      return NextResponse.json({ ok: false, error: 'Could not save the line.' }, { status: 500 });
    }

    if (existing) {
      const { data, error } = await g.supabase
        .from('budget_lines')
        .update(cols)
        .eq('id', (existing as { id: string }).id)
        .eq('site_id', g.siteId)
        .select()
        .single();
      if (error || !data) {
        console.error('[sites/budget/lines] vendor update failed:', error?.message);
        return NextResponse.json({ ok: false, error: 'Could not save the line.' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, line: view(data as BudgetLineRow) });
    }
    return insertLine(g.supabase, g.siteId, cols);
  }

  // ── Manual line WITH an id: update in place (scoped to the site). ──
  if (lineId) {
    const { data, error } = await g.supabase
      .from('budget_lines')
      .update(cols)
      .eq('id', lineId)
      .eq('site_id', g.siteId)
      .select()
      .maybeSingle();
    if (error) {
      console.error('[sites/budget/lines] update failed:', error.message);
      return NextResponse.json({ ok: false, error: 'Could not save the line.' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Line not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, line: view(data as BudgetLineRow) });
  }

  // ── New manual line: insert (bounded by a per-site cap). ──
  return insertLine(g.supabase, g.siteId, cols);
}

async function insertLine(
  supabase: SupabaseClient,
  siteId: string,
  cols: Record<string, unknown>,
): Promise<NextResponse> {
  const { count } = await supabase
    .from('budget_lines')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId);
  if ((count ?? 0) >= MAX_LINES_PER_SITE) {
    return NextResponse.json({ ok: false, error: 'The budget is full (200 lines).' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('budget_lines')
    .insert({ site_id: siteId, ...cols })
    .select()
    .single();
  if (error || !data) {
    console.error('[sites/budget/lines] insert failed:', error?.message);
    return NextResponse.json({ ok: false, error: 'Could not add the line.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, line: view(data as BudgetLineRow) }, { status: 201 });
}

// ── DELETE: remove one line ───────────────────────────────────

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!UUID_RX.test(id)) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

  const g = await gate(req.nextUrl.searchParams.get('siteId'), true);
  if (!g.ok) return g.res;

  const { error } = await g.supabase
    .from('budget_lines')
    .delete()
    .eq('id', id)
    .eq('site_id', g.siteId);

  if (error) {
    console.error('[sites/budget/lines] DELETE failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not remove the line.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
