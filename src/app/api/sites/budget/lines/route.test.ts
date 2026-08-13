// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/budget/lines/route.test.ts
//
// The budget_lines ledger is owner-gated CRUD over host-entered
// cents — the regressions worth pinning are (a) the ownership gate
// (a stranger reading another host's costs would be a real leak),
// (b) cents/kind/source sanitization on write, (c) the camelCase
// view the client consumes, and (d) the vendor upsert-in-place
// (a repeat "Add to budget" must UPDATE the linked line, not
// duplicate it).
//
// Mock harness follows vendors/book/route.test.ts, with `.order()`
// kept in the chain (this route orders twice) so an awaited query
// resolves from the table's `.await` queue.
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

import { GET, POST, DELETE } from './route';
import { NextRequest } from 'next/server';

const OWNER_SITE = { id: 'site-1', site_config: { creator_email: 'owner@example.test' }, creator_email: null };
const LINE_UUID = '22222222-2222-4222-8222-222222222222';
const VENDOR_UUID = '11111111-1111-4111-8111-111111111111';

const ROW = {
  id: LINE_UUID,
  site_id: 'site-1',
  celebration_id: null,
  scope: 'site',
  category: 'Catering',
  label: 'Rosewood',
  kind: 'expense',
  planned_cents: 500000,
  committed_cents: 480000,
  paid_cents: 240000,
  source_kind: 'manual',
  source_id: null,
  sort_index: 0,
};

function jsonReq(method: string, body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/sites/budget/lines', {
    method,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}
function getReq(siteId?: string): NextRequest {
  const url = siteId
    ? `http://localhost/api/sites/budget/lines?siteId=${siteId}`
    : 'http://localhost/api/sites/budget/lines';
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  h.reset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

describe('GET /api/sites/budget/lines — gate + list', () => {
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

  it('403 when caller does not own the site', async () => {
    h.queue('sites.maybeSingle', { id: 'site-1', site_config: { creator_email: 'someone-else@example.test' } });
    expect((await GET(getReq('demo'))).status).toBe(403);
  });

  it('200 returns the ledger in the camelCase view', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('budget_lines.await', [ROW]);
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.lines).toHaveLength(1);
    expect(json.lines[0]).toMatchObject({
      id: LINE_UUID,
      siteId: 'site-1',
      category: 'Catering',
      label: 'Rosewood',
      kind: 'expense',
      plannedCents: 500000,
      committedCents: 480000,
      paidCents: 240000,
      sourceKind: 'manual',
    });
    const eq = h.calls.find((c) => c.table === 'budget_lines' && c.method === 'eq');
    expect(eq!.args).toEqual(['site_id', 'site-1']);
  });
});

describe('POST /api/sites/budget/lines — upsert + sanitization', () => {
  it('400 on invalid JSON', async () => {
    expect((await POST(jsonReq('POST', 'not-json'))).status).toBe(400);
  });

  it('400 when the line has no category', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    const res = await POST(jsonReq('POST', { siteId: 'demo', line: { kind: 'expense' } }));
    expect(res.status).toBe(400);
  });

  it('201 inserts a sanitized manual line keyed to the resolved site id', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('budget_lines.await', null, { count: 0 }); // per-site cap query
    h.queue('budget_lines.single', ROW);
    const res = await POST(jsonReq('POST', {
      siteId: 'demo',
      line: {
        category: '  Catering  ',
        kind: 'nonsense',        // invalid → expense
        plannedCents: 500000.4,  // rounded
        committedCents: -5,      // negative → null
        paidCents: '',           // empty → null
        sourceKind: 'bogus',     // invalid → null
        sourceId: 'not-a-uuid',  // → null
      },
    }));
    expect(res.status).toBe(201);
    const ins = h.calls.find((c) => c.table === 'budget_lines' && c.method === 'insert');
    const payload = ins!.args[0] as Record<string, unknown>;
    expect(payload.site_id).toBe('site-1');
    expect(payload.category).toBe('Catering');
    expect(payload.kind).toBe('expense');
    expect(payload.planned_cents).toBe(500000);
    expect(payload.committed_cents).toBeNull();
    expect(payload.paid_cents).toBeNull();
    expect(payload.source_kind).toBeNull();
    expect(payload.source_id).toBeNull();
  });

  it('updates a manual line in place when an id is supplied', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('budget_lines.maybeSingle', { ...ROW, paid_cents: 480000 });
    const res = await POST(jsonReq('POST', {
      siteId: 'demo',
      line: { id: LINE_UUID, category: 'Catering', kind: 'expense', paidCents: 480000 },
    }));
    expect(res.status).toBe(200);
    const upd = h.calls.find((c) => c.table === 'budget_lines' && c.method === 'update');
    expect(upd).toBeTruthy();
    const eqs = h.calls.filter((c) => c.table === 'budget_lines' && c.method === 'eq').map((c) => c.args);
    expect(eqs).toContainEqual(['id', LINE_UUID]);
    expect(eqs).toContainEqual(['site_id', 'site-1']);
  });

  it('404 when the manual line to update is not in this site', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('budget_lines.maybeSingle', null);
    const res = await POST(jsonReq('POST', {
      siteId: 'demo',
      line: { id: LINE_UUID, category: 'Catering' },
    }));
    expect(res.status).toBe(404);
  });

  it('vendor line UPDATES in place when one already links that vendor', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('budget_lines.maybeSingle', { id: LINE_UUID }); // existing vendor line
    h.queue('budget_lines.single', { ...ROW, source_kind: 'vendor', source_id: VENDOR_UUID });
    const res = await POST(jsonReq('POST', {
      siteId: 'demo',
      line: { category: 'Florist', kind: 'expense', committedCents: 120000, sourceKind: 'vendor', sourceId: VENDOR_UUID },
    }));
    expect(res.status).toBe(200);
    // The existing line was updated, no insert fired.
    expect(h.calls.some((c) => c.table === 'budget_lines' && c.method === 'update')).toBe(true);
    expect(h.calls.some((c) => c.table === 'budget_lines' && c.method === 'insert')).toBe(false);
  });

  it('vendor line INSERTS when no line links that vendor yet', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('budget_lines.maybeSingle', null);           // no existing vendor line
    h.queue('budget_lines.await', null, { count: 3 });   // cap query
    h.queue('budget_lines.single', { ...ROW, source_kind: 'vendor', source_id: VENDOR_UUID });
    const res = await POST(jsonReq('POST', {
      siteId: 'demo',
      line: { category: 'Florist', kind: 'expense', committedCents: 120000, sourceKind: 'vendor', sourceId: VENDOR_UUID },
    }));
    expect(res.status).toBe(201);
    const ins = h.calls.find((c) => c.table === 'budget_lines' && c.method === 'insert');
    const payload = ins!.args[0] as Record<string, unknown>;
    expect(payload.source_kind).toBe('vendor');
    expect(payload.source_id).toBe(VENDOR_UUID);
    expect(payload.committed_cents).toBe(120000);
  });
});

describe('DELETE /api/sites/budget/lines', () => {
  it('400 when id is not a uuid', async () => {
    expect((await DELETE(getReq('demo'))).status).toBe(400);
  });

  it('200 deletes scoped to the site', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('budget_lines.await', null);
    const res = await DELETE(new NextRequest(
      `http://localhost/api/sites/budget/lines?siteId=demo&id=${LINE_UUID}`,
      { method: 'DELETE' },
    ));
    expect(res.status).toBe(200);
    const eqs = h.calls.filter((c) => c.table === 'budget_lines' && c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['id', LINE_UUID], ['site_id', 'site-1']]);
  });
});
