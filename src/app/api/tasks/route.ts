// ─────────────────────────────────────────────────────────────
// Pearloom / api/tasks/route.ts — Team + assignable tasks
// (GRAND-PLAN Phase 3, Pillar 3).
//
// The collaboration home's task board over the event_tasks table
// (see 20260706_event_tasks.sql): a task toward the event, its
// status (open ↔ done), an optional assignee email (drawn from the
// co-host roster), and an optional due date. Built ON the existing
// co-host access model — every gate goes through resolveViewerRole
// (src/lib/cohost-access.ts), not a new access story.
//
// Capability map (the resolveViewerRole roles):
//   owner / editor / guest-manager  — read + write
//   viewer                          — read only
//   no role on the site (stranger)  — 403
//   no session                      — 401
//
//   GET    ?siteId=<uuid|subdomain>   — list tasks (any role)
//   POST   { siteId, task }           — upsert ONE task (write roles)
//   PATCH  { siteId, id, status?, assigneeEmail? }
//                                     — toggle status / reassign (write)
//   DELETE ?siteId=&id=               — delete one task (write roles)
//
// Site resolved by uuid OR subdomain → the canonical uuid, exactly
// like the /api/sites/budget/lines gate. Never touches money.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { resolveViewerRole, type ViewerRole } from '@/lib/cohost-access';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TITLE = 140;
const MAX_DETAIL = 600;
const MAX_TASKS_PER_SITE = 300;
const STATUSES = ['open', 'done'] as const;
type TaskStatus = (typeof STATUSES)[number];

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Roles allowed to write tasks — everyone with editor-or-above
 *  access; viewers are read-only. Mirrors canEditSite's intent but
 *  admits guest-managers (task planning isn't manifest editing). */
function canWrite(role: ViewerRole | null): boolean {
  return role === 'owner' || role === 'editor' || role === 'guest-manager';
}

// ── The event_tasks row (DB snake_case) ───────────────────────

interface EventTaskRow {
  id: string;
  site_id: string;
  title: string;
  detail: string | null;
  assignee_email: string | null;
  status: TaskStatus;
  due_on: string | null;
  created_by: string | null;
  sort_index: number;
  created_at: string;
  updated_at: string;
}

interface EventTaskView {
  id: string;
  siteId: string;
  title: string;
  detail: string | null;
  assigneeEmail: string | null;
  status: TaskStatus;
  dueOn: string | null;
  createdBy: string | null;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
}

/** DB snake_case → the camelCase task the client consumes. */
function view(row: EventTaskRow): EventTaskView {
  return {
    id: row.id,
    siteId: row.site_id,
    title: row.title,
    detail: row.detail,
    assigneeEmail: row.assignee_email,
    status: row.status,
    dueOn: row.due_on,
    createdBy: row.created_by,
    sortIndex: row.sort_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Field sanitizers ──────────────────────────────────────────

function text(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

/** Optional assignee — lowercased and validated, else null (an
 *  explicit '' or a bad address unassigns rather than 400s). */
function emailOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return EMAIL_RX.test(s) ? s : null;
}

/** A real YYYY-MM-DD, else null (an empty string clears the date). */
function dueOn(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!DATE_RX.test(s)) return null;
  return Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? null : s;
}

function status(v: unknown): TaskStatus {
  return v === 'done' ? 'done' : 'open';
}

function sortIndex(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100_000, Math.round(n));
}

// ── The gate (resolveViewerRole + a rate limit) ───────────────

type Gate =
  | { ok: true; email: string; supabase: SupabaseClient; siteId: string; role: ViewerRole }
  | { ok: false; res: NextResponse };

async function gate(rawSiteId: string | null | undefined, write: boolean): Promise<Gate> {
  const session = await getServerSession(authOptions);
  const callerEmail = session?.user?.email?.toLowerCase().trim();
  if (!callerEmail) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const rate = checkRateLimit(`event-tasks:${write ? 'w' : 'r'}:${callerEmail}`, {
    max: write ? 60 : 120,
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
    // Env-less deploys degrade softly, matching /api/sites/budget/lines.
    return { ok: false, res: NextResponse.json({ ok: true, stored: false, tasks: [] }) };
  }

  const access = await resolveViewerRole(
    supabase,
    UUID_RX.test(siteId) ? { siteId } : { subdomain: siteId },
    callerEmail,
  );
  if (!access.siteId) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 }) };
  }
  if (!access.role) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) };
  }
  if (write && !canWrite(access.role)) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) };
  }

  // event_tasks.site_id stores the site's canonical uuid.
  return { ok: true, email: callerEmail, supabase, siteId: access.siteId, role: access.role };
}

// ── GET: list the board ───────────────────────────────────────

export async function GET(req: NextRequest) {
  const g = await gate(req.nextUrl.searchParams.get('siteId'), false);
  if (!g.ok) return g.res;

  const { data, error } = await g.supabase
    .from('event_tasks')
    .select('*')
    .eq('site_id', g.siteId)
    .order('status', { ascending: true }) // 'done' > 'open' — open first
    .order('sort_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[tasks] GET failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not load the tasks.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    role: g.role,
    canWrite: canWrite(g.role),
    tasks: ((data ?? []) as EventTaskRow[]).map(view),
  });
}

// ── POST: upsert one task ─────────────────────────────────────

interface PostBody {
  siteId?: string;
  task?: unknown;
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

  const raw = body.task;
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ ok: false, error: 'task required' }, { status: 400 });
  }
  const t = raw as Record<string, unknown>;

  const title = text(t.title, MAX_TITLE);
  if (!title) {
    return NextResponse.json({ ok: false, error: 'A title is required' }, { status: 400 });
  }

  const taskId = typeof t.id === 'string' && UUID_RX.test(t.id) ? t.id : null;

  // The mutable fields — shared by insert + update.
  const cols = {
    title,
    detail: text(t.detail, MAX_DETAIL),
    assignee_email: emailOrNull(t.assigneeEmail),
    status: status(t.status),
    due_on: dueOn(t.dueOn),
    sort_index: sortIndex(t.sortIndex),
    updated_at: new Date().toISOString(),
  };

  // ── Existing task: update in place (scoped to the site). ──
  if (taskId) {
    const { data, error } = await g.supabase
      .from('event_tasks')
      .update(cols)
      .eq('id', taskId)
      .eq('site_id', g.siteId)
      .select()
      .maybeSingle();
    if (error) {
      console.error('[tasks] update failed:', error.message);
      return NextResponse.json({ ok: false, error: 'Could not save the task.' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, task: view(data as EventTaskRow) });
  }

  // ── New task: insert (bounded by a per-site cap). ──
  const { count } = await g.supabase
    .from('event_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', g.siteId);
  if ((count ?? 0) >= MAX_TASKS_PER_SITE) {
    return NextResponse.json({ ok: false, error: 'The task list is full.' }, { status: 400 });
  }

  const { data, error } = await g.supabase
    .from('event_tasks')
    .insert({ site_id: g.siteId, created_by: g.email, ...cols })
    .select()
    .single();
  if (error || !data) {
    console.error('[tasks] insert failed:', error?.message);
    return NextResponse.json({ ok: false, error: 'Could not add the task.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, task: view(data as EventTaskRow) }, { status: 201 });
}

// ── PATCH: toggle status / reassign one task ──────────────────

interface PatchBody {
  siteId?: string;
  id?: string;
  status?: unknown;
  /** Present (even '' / null) reassigns; omitted leaves it alone. */
  assigneeEmail?: unknown;
}

export async function PATCH(req: NextRequest) {
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const g = await gate(typeof body.siteId === 'string' ? body.siteId : null, true);
  if (!g.ok) return g.res;

  const id = typeof body.id === 'string' && UUID_RX.test(body.id) ? body.id : null;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('status' in body && body.status !== undefined) {
    patch.status = status(body.status);
  }
  if ('assigneeEmail' in body && body.assigneeEmail !== undefined) {
    patch.assignee_email = emailOrNull(body.assigneeEmail);
  }
  // Only updated_at → the caller asked for no real change.
  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await g.supabase
    .from('event_tasks')
    .update(patch)
    .eq('id', id)
    .eq('site_id', g.siteId)
    .select()
    .maybeSingle();
  if (error) {
    console.error('[tasks] PATCH failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not update the task.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, task: view(data as EventTaskRow) });
}

// ── DELETE: remove one task ───────────────────────────────────

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!UUID_RX.test(id)) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

  const g = await gate(req.nextUrl.searchParams.get('siteId'), true);
  if (!g.ok) return g.res;

  const { error } = await g.supabase
    .from('event_tasks')
    .delete()
    .eq('id', id)
    .eq('site_id', g.siteId);

  if (error) {
    console.error('[tasks] DELETE failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not remove the task.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
