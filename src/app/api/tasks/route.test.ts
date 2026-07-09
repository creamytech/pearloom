// ─────────────────────────────────────────────────────────────
// Pearloom / api/tasks/route.test.ts
//
// event_tasks is role-gated CRUD built on the existing co-host
// access model (resolveViewerRole). The regressions worth pinning:
// (a) the gate — an owner can CRUD, a viewer is read-only (403 on
// write), and someone with NO role on the site (wrong owner, not a
// co-host) is 403 on read and write; (b) an editor / guest-manager
// CAN write (they're the "team"); (c) field sanitization on write
// (title required, assignee lowercased-or-null, status/date
// validated); (d) the camelCase view the client consumes;
// (e) PATCH toggles status in place.
//
// Mock harness follows sites/budget/lines/route.test.ts, with
// `.order()` kept in the chain (GET orders three times) so an
// awaited query resolves from the table's `.await` queue. The
// resolveViewerRole path adds a `cohosts` table lookup, driven by
// the same queue mechanism (`cohosts.maybeSingle`).
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean; count?: number };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {};
    const verbs = ['select', 'eq', 'order', 'insert', 'update', 'delete', 'maybeSingle', 'single'];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        if (verb === 'maybeSingle' || verb === 'single') {
          const q = queues[`${table}.${verb}`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
          );
        }
        return chain;
      };
    }
    // Awaiting the chain mid-verb (GET's ordered list, the count
    // query, DELETE) lands here.
    chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      const q = queues[`${table}.await`]?.shift();
      const result = q?.isError
        ? { data: null, error: q.value, count: null }
        : { data: q?.value ?? null, error: null, count: q?.count ?? 0 };
      return Promise.resolve(result).then(resolve, reject);
    };
    return chain;
  }

  const supabaseMock = { from: (table: string) => makeChain(table) };
  const sessionMock: { value: unknown } = { value: { user: { email: 'owner@example.test' } } };

  return {
    queues,
    calls,
    supabaseMock,
    sessionMock,
    queue(key: string, value: unknown, opts: { isError?: boolean; count?: number } = {}) {
      queues[key] = queues[key] || [];
      queues[key].push({ value, isError: opts.isError, count: opts.count });
    },
    reset() {
      Object.keys(queues).forEach((k) => delete queues[k]);
      calls.length = 0;
      sessionMock.value = { user: { email: 'owner@example.test' } };
    },
  };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: () => h.supabaseMock }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn(async () => h.sessionMock.value) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { GET, POST, PATCH, DELETE } from './route';
import { NextRequest } from 'next/server';

// resolveViewerRole selects id, subdomain, creator_email, site_config.
const OWNER_SITE = { id: 'site-1', subdomain: 'demo', creator_email: 'owner@example.test', site_config: null };
const OTHER_SITE = { id: 'site-1', subdomain: 'demo', creator_email: 'someone-else@example.test', site_config: null };
const TASK_UUID = '22222222-2222-4222-8222-222222222222';

const ROW = {
  id: TASK_UUID,
  site_id: 'site-1',
  title: 'Book the florist',
  detail: 'Call Rosewood',
  assignee_email: 'moh@example.test',
  status: 'open',
  due_on: '2026-08-01',
  created_by: 'owner@example.test',
  sort_index: 0,
  created_at: '2026-07-06T00:00:00.000Z',
  updated_at: '2026-07-06T00:00:00.000Z',
};

function jsonReq(method: string, body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/tasks', {
    method,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}
function getReq(siteId?: string): NextRequest {
  const url = siteId ? `http://localhost/api/tasks?siteId=${siteId}` : 'http://localhost/api/tasks';
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  h.reset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

describe('GET /api/tasks — gate + list', () => {
  it('401 when no session', async () => {
    h.sessionMock.value = null;
    expect((await GET(getReq('demo'))).status).toBe(401);
  });

  it('400 when siteId missing', async () => {
    expect((await GET(getReq())).status).toBe(400);
  });

  it('404 when the site is not found', async () => {
    h.queue('sites.maybeSingle', null);
    expect((await GET(getReq('missing'))).status).toBe(404);
  });

  it('403 when the caller has no role on the site (wrong owner, not a co-host)', async () => {
    h.queue('sites.maybeSingle', OTHER_SITE);
    h.queue('cohosts.maybeSingle', null);
    expect((await GET(getReq('demo'))).status).toBe(403);
  });

  it('200 — owner reads the board in the camelCase view with canWrite', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('event_tasks.await', [ROW]);
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.canWrite).toBe(true);
    expect(json.role).toBe('owner');
    expect(json.tasks).toHaveLength(1);
    expect(json.tasks[0]).toMatchObject({
      id: TASK_UUID,
      siteId: 'site-1',
      title: 'Book the florist',
      assigneeEmail: 'moh@example.test',
      status: 'open',
      dueOn: '2026-08-01',
    });
    const eq = h.calls.find((c) => c.table === 'event_tasks' && c.method === 'eq');
    expect(eq!.args).toEqual(['site_id', 'site-1']);
  });

  it('200 — a viewer co-host reads but canWrite is false', async () => {
    h.queue('sites.maybeSingle', OTHER_SITE);
    h.queue('cohosts.maybeSingle', { role: 'viewer' });
    h.queue('event_tasks.await', [ROW]);
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.role).toBe('viewer');
    expect(json.canWrite).toBe(false);
  });
});

describe('POST /api/tasks — role gate + sanitization', () => {
  it('403 — a viewer co-host cannot write', async () => {
    h.queue('sites.maybeSingle', OTHER_SITE);
    h.queue('cohosts.maybeSingle', { role: 'viewer' });
    const res = await POST(jsonReq('POST', { siteId: 'demo', task: { title: 'Order the cake' } }));
    expect(res.status).toBe(403);
    // No write should have been attempted.
    expect(h.calls.some((c) => c.table === 'event_tasks' && c.method === 'insert')).toBe(false);
  });

  it('403 — someone with no role on the site cannot write', async () => {
    h.queue('sites.maybeSingle', OTHER_SITE);
    h.queue('cohosts.maybeSingle', null);
    const res = await POST(jsonReq('POST', { siteId: 'demo', task: { title: 'Order the cake' } }));
    expect(res.status).toBe(403);
  });

  it('400 when the task has no title', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    const res = await POST(jsonReq('POST', { siteId: 'demo', task: { detail: 'no title' } }));
    expect(res.status).toBe(400);
  });

  it('201 — owner inserts a sanitized task keyed to the resolved site id', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('event_tasks.await', null, { count: 0 }); // per-site cap query
    h.queue('event_tasks.single', ROW);
    const res = await POST(jsonReq('POST', {
      siteId: 'demo',
      task: {
        title: '  Book the florist  ',
        detail: '  Call Rosewood  ',
        assigneeEmail: 'MOH@Example.TEST', // lowercased
        status: 'nonsense',                // invalid → open
        dueOn: 'not-a-date',               // invalid → null
      },
    }));
    expect(res.status).toBe(201);
    const ins = h.calls.find((c) => c.table === 'event_tasks' && c.method === 'insert');
    const payload = ins!.args[0] as Record<string, unknown>;
    expect(payload.site_id).toBe('site-1');
    expect(payload.title).toBe('Book the florist');
    expect(payload.detail).toBe('Call Rosewood');
    expect(payload.assignee_email).toBe('moh@example.test');
    expect(payload.status).toBe('open');
    expect(payload.due_on).toBeNull();
    expect(payload.created_by).toBe('owner@example.test');
  });

  it('201 — an editor co-host (the team) can add a task', async () => {
    h.queue('sites.maybeSingle', OTHER_SITE);
    h.queue('cohosts.maybeSingle', { role: 'editor' });
    h.queue('event_tasks.await', null, { count: 3 });
    h.queue('event_tasks.single', ROW);
    const res = await POST(jsonReq('POST', { siteId: 'demo', task: { title: 'Confirm the venue' } }));
    expect(res.status).toBe(201);
    expect(h.calls.some((c) => c.table === 'event_tasks' && c.method === 'insert')).toBe(true);
  });

  it('updates a task in place when an id is supplied', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('event_tasks.maybeSingle', { ...ROW, title: 'Book the florist (deposit paid)' });
    const res = await POST(jsonReq('POST', {
      siteId: 'demo',
      task: { id: TASK_UUID, title: 'Book the florist (deposit paid)' },
    }));
    expect(res.status).toBe(200);
    const eqs = h.calls.filter((c) => c.table === 'event_tasks' && c.method === 'eq').map((c) => c.args);
    expect(eqs).toContainEqual(['id', TASK_UUID]);
    expect(eqs).toContainEqual(['site_id', 'site-1']);
  });
});

describe('PATCH /api/tasks — toggle + reassign', () => {
  it('403 — a viewer cannot toggle', async () => {
    h.queue('sites.maybeSingle', OTHER_SITE);
    h.queue('cohosts.maybeSingle', { role: 'viewer' });
    const res = await PATCH(jsonReq('PATCH', { siteId: 'demo', id: TASK_UUID, status: 'done' }));
    expect(res.status).toBe(403);
  });

  it('200 — owner toggles status open → done in place', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('event_tasks.maybeSingle', { ...ROW, status: 'done' });
    const res = await PATCH(jsonReq('PATCH', { siteId: 'demo', id: TASK_UUID, status: 'done' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.status).toBe('done');
    const upd = h.calls.find((c) => c.table === 'event_tasks' && c.method === 'update');
    expect((upd!.args[0] as Record<string, unknown>).status).toBe('done');
  });

  it('400 when neither status nor assigneeEmail is supplied', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    const res = await PATCH(jsonReq('PATCH', { siteId: 'demo', id: TASK_UUID }));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tasks', () => {
  it('400 when id is not a uuid', async () => {
    expect((await DELETE(getReq('demo'))).status).toBe(400);
  });

  it('403 — a viewer cannot delete', async () => {
    h.queue('sites.maybeSingle', OTHER_SITE);
    h.queue('cohosts.maybeSingle', { role: 'viewer' });
    const res = await DELETE(new NextRequest(
      `http://localhost/api/tasks?siteId=demo&id=${TASK_UUID}`,
      { method: 'DELETE' },
    ));
    expect(res.status).toBe(403);
  });

  it('200 — owner deletes scoped to the site', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('event_tasks.await', null);
    const res = await DELETE(new NextRequest(
      `http://localhost/api/tasks?siteId=demo&id=${TASK_UUID}`,
      { method: 'DELETE' },
    ));
    expect(res.status).toBe(200);
    const eqs = h.calls.filter((c) => c.table === 'event_tasks' && c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['id', TASK_UUID], ['site_id', 'site-1']]);
  });
});
