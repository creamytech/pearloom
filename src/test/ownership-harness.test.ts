// ─────────────────────────────────────────────────────────────
// Ownership harness — wrong-owner → never 2xx, no session → 401.
//
// The systematic gate check the audit + all three external reviews
// asked for: one parameterized suite that probes mutating routes
// with (a) no session and (b) a session for a user who does NOT
// own the target site, and asserts the route refuses BEFORE any
// write. It does not test happy paths — each route's own test file
// does that; this file exists so a route can't silently lose its
// owner gate.
//
// Mock model: the shared thenable-chain Supabase mock (the
// vendors/book pattern). Every `sites` lookup resolves to a row
// owned by owner@example.test; the probing session is either null
// or stranger@example.test. Any 2xx under those conditions is a
// leak. Writes are also recorded — a refusing route must not have
// inserted/updated/deleted anything on the way out.
//
// Adding a mutating route? Add a case. Removing a case needs the
// same justification as removing a test.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const OWNER = 'owner@example.test';
const STRANGER = 'stranger@example.test';
const SITE_ID = '22222222-2222-4222-8222-222222222222';
const PERSON_ID = '33333333-3333-4333-8333-333333333333';

const h = vi.hoisted(() => {
  const OWNER = 'owner@example.test';
  const state: { session: { user: { email: string } } | null } = {
    session: null,
  };
  const writes: { table: string; method: string }[] = [];

  // A universally-thenable chain: any verb keeps chaining; awaiting
  // anywhere resolves. `sites` single-row lookups resolve to the
  // owner's row (so ownership comparisons run against a REAL owner
  // that isn't the caller); everything else resolves empty.
  function makeChain(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {};
    const verbs = [
      'select', 'eq', 'neq', 'in', 'is', 'ilike', 'order', 'limit', 'range',
      'insert', 'update', 'upsert', 'delete', 'gte', 'lte', 'or', 'not',
    ];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        if (verb === 'insert' || verb === 'update' || verb === 'upsert' || verb === 'delete') {
          writes.push({ table, method: verb });
        }
        void args;
        return chain;
      };
    }
    const siteRow = {
      id: '22222222-2222-4222-8222-222222222222',
      subdomain: 'owner-site',
      creator_email: OWNER,
      user_id: 'owner-user',
      site_config: { creator_email: OWNER },
      ai_manifest: { occasion: 'wedding' },
      occasion: 'wedding',
      configOccasion: null,
    };
    chain.maybeSingle = () =>
      Promise.resolve({ data: table === 'sites' ? siteRow : null, error: null });
    chain.single = () =>
      Promise.resolve({
        data: table === 'sites' ? siteRow : null,
        error: table === 'sites' ? null : { message: 'no row' },
      });
    chain.then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) =>
      Promise.resolve({
        data: table === 'sites' ? [siteRow] : [],
        error: null,
        count: 0,
      }).then(resolve, reject);
    return chain;
  }

  return {
    state,
    writes,
    supabaseMock: { from: (table: string) => makeChain(table) },
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => h.supabaseMock,
}));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => h.state.session),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 999 }),
  getClientIp: () => '127.0.0.1',
}));
// Email side-effects must never fire from a probe.
vi.mock('@/lib/email/guest-invite', () => ({
  sendGuestInviteEmail: vi.fn(async () => {}),
}));

// ─── The case table ──────────────────────────────────────────

interface RouteCase {
  name: string;
  /** Dynamic import of the route module. */
  load: () => Promise<Record<string, unknown>>;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  body: unknown;
}

const CASES: RouteCase[] = [
  {
    name: 'POST /api/guests (add a guest)',
    load: () => import('@/app/api/guests/route'),
    method: 'POST',
    url: `http://localhost/api/guests`,
    body: { siteId: SITE_ID, name: 'Probe', email: 'probe@x.test' },
  },
  {
    name: 'POST /api/guests/from-person (circle weave-in)',
    load: () => import('@/app/api/guests/from-person/route'),
    method: 'POST',
    url: `http://localhost/api/guests/from-person`,
    body: { siteId: SITE_ID, personId: PERSON_ID },
  },
  {
    name: 'POST /api/guests/import (CSV import)',
    load: () => import('@/app/api/guests/import/route'),
    method: 'POST',
    url: `http://localhost/api/guests/import`,
    body: { siteId: SITE_ID, csv: 'name,email\nProbe,probe@x.test' },
  },
  {
    name: 'POST /api/sites/budget/lines (money write)',
    load: () => import('@/app/api/sites/budget/lines/route'),
    method: 'POST',
    url: `http://localhost/api/sites/budget/lines`,
    body: { siteId: SITE_ID, label: 'Probe', planned_cents: 100 },
  },
  {
    name: 'POST /api/vendors/book (vendor write)',
    load: () => import('@/app/api/vendors/book/route'),
    method: 'POST',
    url: `http://localhost/api/vendors/book`,
    body: { siteId: SITE_ID, name: 'Probe Vendor' },
  },
  {
    name: 'POST /api/sites/live-updates (day-of broadcast)',
    load: () => import('@/app/api/sites/live-updates/route'),
    method: 'POST',
    url: `http://localhost/api/sites/live-updates`,
    body: { siteId: SITE_ID, message: 'probe' },
  },
  {
    name: 'POST /api/messages/host (host message)',
    load: () => import('@/app/api/messages/host/route'),
    method: 'POST',
    url: `http://localhost/api/messages/host`,
    body: { siteId: SITE_ID, thread: 'party', body: 'probe' },
  },
  {
    name: 'POST /api/split/seed (split seeding)',
    load: () => import('@/app/api/split/seed/route'),
    method: 'POST',
    url: `http://localhost/api/split/seed`,
    body: { siteId: SITE_ID },
  },
  {
    name: 'POST /api/seating (seating write)',
    load: () => import('@/app/api/seating/route'),
    method: 'POST',
    url: `http://localhost/api/seating`,
    body: { siteId: SITE_ID, tables: [] },
  },
  {
    name: 'PATCH /api/celebrations (celebration link)',
    load: () => import('@/app/api/celebrations/route'),
    method: 'PATCH',
    url: `http://localhost/api/celebrations`,
    body: { siteId: SITE_ID, name: 'Probe' },
  },
  {
    name: 'POST /api/guests/nudge (bulk email send)',
    load: () => import('@/app/api/guests/nudge/route'),
    method: 'POST',
    url: `http://localhost/api/guests/nudge`,
    body: { siteId: SITE_ID, guestIds: ['g1'], bodyText: 'probe' },
  },
  {
    name: 'POST /api/sites/co-host (co-host grant)',
    load: () => import('@/app/api/sites/co-host/route'),
    method: 'POST',
    url: `http://localhost/api/sites/co-host`,
    body: { siteId: SITE_ID, email: 'newcohost@x.test' },
  },
];

function makeReq(c: RouteCase): NextRequest {
  // NextRequest is constructed lazily so the mocked modules are in
  // place first.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require('next/server') as typeof import('next/server');
  return new NextRequest(c.url, {
    method: c.method,
    body: JSON.stringify(c.body),
    headers: { 'content-type': 'application/json' },
  });
}

async function probe(c: RouteCase): Promise<number> {
  const mod = await c.load();
  const handler = mod[c.method] as ((req: NextRequest) => Promise<Response>) | undefined;
  if (!handler) throw new Error(`${c.name}: route exports no ${c.method}`);
  const res = await handler(makeReq(c));
  return res.status;
}

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stub.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'stub-service-key');
});

beforeEach(() => {
  h.state.session = null;
  h.writes.length = 0;
});

describe.each(CASES)('$name', (c) => {
  it('refuses with 401 when there is no session', async () => {
    h.state.session = null;
    const status = await probe(c);
    expect(status, `${c.name} must 401 anonymously, got ${status}`).toBe(401);
    expect(
      h.writes.filter((w) => w.method !== 'select'),
      `${c.name} wrote to the DB while refusing an anonymous caller`,
    ).toEqual([]);
  });

  it("refuses a signed-in STRANGER (never 2xx, no writes)", async () => {
    h.state.session = { user: { email: STRANGER } };
    const status = await probe(c);
    expect(
      status,
      `${c.name} returned ${status} for a non-owner — ownership gate missing or bypassed`,
    ).toBeGreaterThanOrEqual(400);
    expect(status, `${c.name}: expected a 4xx refusal, not a server error`).toBeLessThan(500);
    expect(
      h.writes,
      `${c.name} wrote to the DB while refusing a stranger`,
    ).toEqual([]);
  });
});

// Sanity: the harness itself can tell owner from stranger — the
// owner probe must get PAST the ownership gate (i.e. fail later or
// succeed, but never 401/403). Run on one representative route so a
// broken mock can't green-light the whole suite.
describe('harness sanity', () => {
  it('the owner is not refused by the gate (guests route)', async () => {
    h.state.session = { user: { email: OWNER } };
    const c = CASES[0];
    const status = await probe(c);
    expect([401, 403]).not.toContain(status);
  });
});
