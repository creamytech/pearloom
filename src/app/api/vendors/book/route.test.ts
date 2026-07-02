// ─────────────────────────────────────────────────────────────
// Pearloom / api/vendors/book/route.test.ts
//
// The Vendor Book is owner-gated CRUD over host-entered money
// fields — the regressions worth pinning are (a) the ownership
// gate (a stranger reading another host's vendor costs would be a
// real leak), (b) cents/status/date sanitization on write, and
// (c) the camelCase view mapping the dashboard consumes.
//
// Mock pattern follows sites/live-updates/route.test.ts, with one
// extension: the chain itself is thenable, so queries awaited on
// a non-terminal verb (the POST count query's `.select(head).eq()`
// and DELETE's `.delete().eq().eq()`) resolve from a
// `<table>.await` queue.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
        if (verb === 'maybeSingle' || verb === 'single' || verb === 'order') {
          const q = queues[`${table}.${verb}`]?.shift();
          return Promise.resolve(
            q?.isError
              ? { data: null, error: q.value }
              : { data: q?.value ?? (verb === 'order' ? [] : null), error: null },
          );
        }
        return chain;
      };
    }
    // Awaiting the chain mid-verb (count query, delete) lands here.
    chain.then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) => {
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

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => h.supabaseMock,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => h.sessionMock.value),
}));

vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { GET, POST, PATCH, DELETE } from './route';
import { NextRequest } from 'next/server';

const OWNER_SITE = { id: 'site-1', site_config: { creator_email: 'owner@example.test' }, creator_email: null };
const VENDOR_UUID = '11111111-1111-4111-8111-111111111111';

const ROW = {
  id: VENDOR_UUID,
  site_id: 'site-1',
  name: 'Marigold & Co.',
  category: 'Florist',
  contact_name: 'Sam Reyes',
  email: 'hello@marigold.test',
  phone: '555-0101',
  website: 'https://marigold.test',
  cost_cents: 120000,
  deposit_cents: 30000,
  deposit_due: '2026-08-01',
  balance_due: '2026-09-01',
  deposit_paid: false,
  balance_paid: false,
  status: 'booked',
  arrival_time: '3:00 PM',
  notes: null,
  directory_vendor_id: null,
  created_at: '2026-07-02T00:00:00Z',
};

function jsonReq(method: string, body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/vendors/book', {
    method,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}
function getReq(siteId?: string): NextRequest {
  const url = siteId
    ? `http://localhost/api/vendors/book?siteId=${siteId}`
    : 'http://localhost/api/vendors/book';
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  h.reset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

describe('GET /api/vendors/book — gate + list', () => {
  it('401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(401);
  });

  it('400 when siteId missing', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(400);
  });

  it('404 when the site is not found', async () => {
    h.queue('sites.maybeSingle', null);
    const res = await GET(getReq('missing'));
    expect(res.status).toBe(404);
  });

  it('403 when caller does not own the site', async () => {
    h.queue('sites.maybeSingle', { id: 'site-1', site_config: { creator_email: 'someone-else@example.test' } });
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(403);
  });

  it('owner check is case-insensitive', async () => {
    h.sessionMock.value = { user: { email: 'Owner@Example.TEST' } };
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('site_vendors.order', []);
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(200);
  });

  it('200 returns the book in the camelCase view', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('site_vendors.order', [ROW]);
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.vendors).toHaveLength(1);
    expect(json.vendors[0]).toMatchObject({
      id: VENDOR_UUID,
      name: 'Marigold & Co.',
      costCents: 120000,
      depositCents: 30000,
      depositDue: '2026-08-01',
      depositPaid: false,
      status: 'booked',
      arrivalTime: '3:00 PM',
    });
    // The list query is scoped to the resolved site id.
    const eq = h.calls.find((c) => c.table === 'site_vendors' && c.method === 'eq');
    expect(eq!.args).toEqual(['site_id', 'site-1']);
  });
});

describe('POST /api/vendors/book — create + sanitization', () => {
  it('400 on invalid JSON body', async () => {
    const res = await POST(jsonReq('POST', 'not-json'));
    expect(res.status).toBe(400);
  });

  it('400 when name or category is missing', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    const res = await POST(jsonReq('POST', { siteId: 'demo', name: 'Marigold' }));
    expect(res.status).toBe(400);
  });

  it('201 inserts a sanitized row keyed to the resolved site id', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('site_vendors.await', null, { count: 0 }); // per-site cap query
    h.queue('site_vendors.single', ROW);
    const res = await POST(jsonReq('POST', {
      siteId: 'demo',
      name: '  Marigold & Co.  ',
      category: 'Florist',
      costCents: 120000.4,        // rounded
      depositCents: -5,           // negative → null
      depositDue: 'not-a-date',   // invalid → null
      balanceDue: '2026-09-01',
      status: 'definitely-bogus', // invalid → considering
      directoryVendorId: 'nope',  // non-uuid → null
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.vendor.id).toBe(VENDOR_UUID);

    const ins = h.calls.find((c) => c.table === 'site_vendors' && c.method === 'insert');
    const payload = ins!.args[0] as Record<string, unknown>;
    expect(payload.site_id).toBe('site-1');
    expect(payload.name).toBe('Marigold & Co.');
    expect(payload.cost_cents).toBe(120000);
    expect(payload.deposit_cents).toBeNull();
    expect(payload.deposit_due).toBeNull();
    expect(payload.balance_due).toBe('2026-09-01');
    expect(payload.status).toBe('considering');
    expect(payload.directory_vendor_id).toBeNull();
  });
});

describe('PATCH /api/vendors/book', () => {
  it('400 when id is not a uuid', async () => {
    const res = await PATCH(jsonReq('PATCH', { siteId: 'demo', id: 'nope', name: 'X' }));
    expect(res.status).toBe(400);
  });

  it('404 when the vendor is not in this site’s book', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('site_vendors.maybeSingle', null);
    const res = await PATCH(jsonReq('PATCH', { siteId: 'demo', id: VENDOR_UUID, depositPaid: true }));
    expect(res.status).toBe(404);
  });

  it('clearing a money field stores null, never $0', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('site_vendors.maybeSingle', { ...ROW, cost_cents: null });
    const res = await PATCH(jsonReq('PATCH', { siteId: 'demo', id: VENDOR_UUID, costCents: null }));
    expect(res.status).toBe(200);
    const upd = h.calls.find((c) => c.table === 'site_vendors' && c.method === 'update');
    expect(upd!.args[0]).toEqual({ cost_cents: null });
  });

  it('200 updates only the provided fields', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('site_vendors.maybeSingle', { ...ROW, deposit_paid: true });
    const res = await PATCH(jsonReq('PATCH', { siteId: 'demo', id: VENDOR_UUID, depositPaid: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.vendor.depositPaid).toBe(true);

    const upd = h.calls.find((c) => c.table === 'site_vendors' && c.method === 'update');
    expect(upd!.args[0]).toEqual({ deposit_paid: true });
  });
});

describe('DELETE /api/vendors/book', () => {
  it('400 when id is not a uuid', async () => {
    const res = await DELETE(getReq('demo'));
    expect(res.status).toBe(400);
  });

  it('200 deletes scoped to the site', async () => {
    h.queue('sites.maybeSingle', OWNER_SITE);
    h.queue('site_vendors.await', null);
    const res = await DELETE(new NextRequest(
      `http://localhost/api/vendors/book?siteId=demo&id=${VENDOR_UUID}`,
      { method: 'DELETE' },
    ));
    expect(res.status).toBe(200);

    const eqs = h.calls.filter((c) => c.table === 'site_vendors' && c.method === 'eq');
    expect(eqs.map((c) => c.args)).toEqual([
      ['id', VENDOR_UUID],
      ['site_id', 'site-1'],
    ]);
  });
});
