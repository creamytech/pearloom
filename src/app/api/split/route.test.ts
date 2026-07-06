// ─────────────────────────────────────────────────────────────
// Pearloom / api/split/route.test.ts — the keystone's API contract.
//
// Pins the auth model + the honesty rule that make the split ledger
// safe to expose:
//   • owner (session) can READ the full state and WRITE.
//   • a valid guest (passport token for THIS site) can add an expense.
//   • an anonymous caller (no session, no token) is rejected 401.
//   • shares are computed SERVER-SIDE — a client-sent `shares` field is
//     ignored and the stored/returned split is the computed one.
//   • the GET response's settle-up balances to zero.
//
// Supabase is a hoisted, per-table queue mock (the rsvp/gift-pledges
// pattern); the split MATH (src/lib/budget/split.ts) runs for real so
// the settle-up assertion is meaningful.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    session: null as null | { user: { email: string } },
    guest: null as null | {
      siteId: string;
      guestRowId: string | null;
      personId: string | null;
      name: string;
      email: string | null;
    },
    personId: null as string | null,
    rateAllowed: true,
    queues: {} as Record<string, Array<{ data?: unknown; error?: unknown }>>,
    calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  };

  function resolveNext(table: string) {
    const q = state.queues[table];
    const next = q && q.length ? q.shift()! : { data: null, error: null };
    return Promise.resolve({ data: next.data ?? null, error: next.error ?? null });
  }

  function chain(table: string) {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'ilike', 'is', 'limit']) {
      c[m] = (...args: unknown[]) => {
        state.calls.push({ table, method: m, args });
        return c;
      };
    }
    c.single = (...args: unknown[]) => {
      state.calls.push({ table, method: 'single', args });
      return resolveNext(table);
    };
    c.maybeSingle = (...args: unknown[]) => {
      state.calls.push({ table, method: 'maybeSingle', args });
      return resolveNext(table);
    };
    // Thenable → `await from(t).select().eq().order()` (list) and
    // `await from(t).insert(rows)` / `.delete().eq()` resolve here.
    c.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
      resolveNext(table).then(onF, onR);
    return c;
  }

  return {
    state,
    supabase: { from: (t: string) => chain(t) },
    queue(table: string, data: unknown, error: unknown = null) {
      (state.queues[table] ||= []).push({ data, error });
    },
    reset() {
      state.session = null;
      state.guest = null;
      state.personId = null;
      state.rateAllowed = true;
      state.queues = {};
      state.calls = [];
    },
  };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: () => h.supabase }));
vi.mock('next-auth', () => ({ getServerSession: () => Promise.resolve(h.state.session) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: h.state.rateAllowed, remaining: 1, resetAt: 0 }),
  getClientIp: () => '1.2.3.4',
}));
vi.mock('@/lib/people', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/people')>();
  return {
    ...actual,
    resolveGuestToken: () => Promise.resolve(h.state.guest),
    resolvePersonId: () => Promise.resolve(h.state.personId),
  };
});

import { GET } from './route';
import { POST as PARTICIPANTS_POST } from './participants/route';
import { POST as EXPENSES_POST } from './expenses/route';
import { NextRequest } from 'next/server';

// Real-looking uuids (payer/participant/expense ids must pass UUID_RX).
const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';
const P3 = '33333333-3333-4333-8333-333333333333';
const EXP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const SITE_ROW = {
  id: 'site-1',
  subdomain: 'demo',
  creator_email: 'host@example.test',
  site_config: {},
};

function getReq(qs: string): NextRequest {
  return new NextRequest(`http://localhost/api/split?${qs}`);
}
function postReq(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function asOwner() {
  h.state.session = { user: { email: 'host@example.test' } };
}
function asGuest() {
  h.state.session = null;
  h.state.guest = { siteId: 'site-1', guestRowId: 'g1', personId: 'person-g', name: 'Guest', email: 'guest@example.test' };
}

/** Queue the three GET reads: a 3-person even split of $90. */
function queueEvenNinetySplit() {
  h.queue('sites', SITE_ROW);
  h.queue('participants', [
    { id: P1, site_id: 'site-1', person_id: 'person-a', display_name: 'Ana', email: 'ana@example.test', created_at: 't1' },
    { id: P2, site_id: 'site-1', person_id: null, display_name: 'Bo', email: null, created_at: 't2' },
    { id: P3, site_id: 'site-1', person_id: null, display_name: 'Cy', email: null, created_at: 't3' },
  ]);
  h.queue('expenses', [
    {
      id: EXP, site_id: 'site-1', payer_id: P1, description: 'Villa', amount_cents: 9000,
      currency: 'usd', split_mode: 'even', spent_on: null, created_by_email: 'host@example.test', created_at: 't4',
    },
  ]);
  h.queue('expense_shares', [
    { id: 's1', expense_id: EXP, participant_id: P1, share_cents: 3000, weight: null },
    { id: 's2', expense_id: EXP, participant_id: P2, share_cents: 3000, weight: null },
    { id: 's3', expense_id: EXP, participant_id: P3, share_cents: 3000, weight: null },
  ]);
}

beforeEach(() => {
  h.reset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

describe('GET /api/split — read the full split state', () => {
  it('owner reads participants, expenses (with shares), balances + a settle-up that zeroes out', async () => {
    asOwner();
    queueEvenNinetySplit();

    const res = await GET(getReq('siteId=demo'));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.participants).toHaveLength(3);
    expect(json.participants[0]).toMatchObject({ id: P1, displayName: 'Ana', personId: 'person-a' });

    // Shares mapped snake→camel and grouped by expense.
    expect(json.expenses).toHaveLength(1);
    expect(json.expenses[0].shares).toEqual({ [P1]: 3000, [P2]: 3000, [P3]: 3000 });
    expect(json.expenses[0].amountCents).toBe(9000);

    // Derived balances: payer +6000, others −3000 each; sums to zero.
    expect(json.balances).toEqual({ [P1]: 6000, [P2]: -3000, [P3]: -3000 });
    const sum = Object.values(json.balances as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);

    // Settle-up: everyone pays the one creditor, totalling their credit.
    expect(json.settleUp.length).toBeGreaterThan(0);
    expect(json.settleUp.every((t: { toId: string }) => t.toId === P1)).toBe(true);
    const settled = json.settleUp.reduce((a: number, t: { amountCents: number }) => a + t.amountCents, 0);
    expect(settled).toBe(6000);
  });

  it('a valid guest of the site can read', async () => {
    asGuest();
    queueEvenNinetySplit();
    const res = await GET(getReq('siteId=demo&token=tok'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.participants).toHaveLength(3);
  });

  it('rejects an anonymous caller (no session, no token) with 401', async () => {
    h.state.session = null;
    h.state.guest = null;
    h.queue('sites', SITE_ROW); // site resolves; auth still fails.
    const res = await GET(getReq('siteId=demo'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('a non-owner session with no token is Forbidden (403), not leaked', async () => {
    h.state.session = { user: { email: 'stranger@example.test' } };
    h.state.guest = null;
    h.queue('sites', SITE_ROW);
    const res = await GET(getReq('siteId=demo'));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/split/participants — owner can write', () => {
  it('owner creates a name-only participant', async () => {
    asOwner();
    h.queue('sites', SITE_ROW);
    h.queue('participants', {
      id: P2, site_id: 'site-1', person_id: null, display_name: 'Dana', email: null, created_at: 't',
    });

    const res = await PARTICIPANTS_POST(postReq('/api/split/participants', { siteId: 'demo', displayName: 'Dana' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.participant).toMatchObject({ id: P2, displayName: 'Dana' });

    const insert = h.state.calls.find((c) => c.table === 'participants' && c.method === 'insert');
    expect((insert!.args[0] as Record<string, unknown>).display_name).toBe('Dana');
  });

  it('requires a display name', async () => {
    asOwner();
    h.queue('sites', SITE_ROW);
    const res = await PARTICIPANTS_POST(postReq('/api/split/participants', { siteId: 'demo', displayName: '   ' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/split/expenses — guest write + server-side shares', () => {
  it('a valid guest can add an expense; shares are computed server-side and a client `shares` field is ignored', async () => {
    asGuest();
    h.queue('sites', SITE_ROW);
    // Member check: all three ids belong to the site.
    h.queue('participants', [{ id: P1 }, { id: P2 }, { id: P3 }]);
    // The inserted expense row echoed back.
    h.queue('expenses', {
      id: EXP, site_id: 'site-1', payer_id: P1, description: 'Villa', amount_cents: 9000,
      currency: 'usd', split_mode: 'even', spent_on: null, created_by_email: 'guest@example.test', created_at: 't',
    });

    const res = await EXPENSES_POST(
      postReq('/api/split/expenses', {
        siteId: 'demo',
        token: 'tok',
        payerId: P1,
        description: 'Villa',
        amountCents: 9000,
        mode: 'even',
        participantIds: [P1, P2, P3],
        // Malicious/naive client-sent shares — MUST be ignored.
        shares: { [P1]: 9000 },
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);

    // The returned shares are the SERVER's even split, not the client's.
    expect(json.expense.shares).toEqual({ [P1]: 3000, [P2]: 3000, [P3]: 3000 });

    // And the rows actually inserted sum to the amount, evenly.
    const insert = h.state.calls.find((c) => c.table === 'expense_shares' && c.method === 'insert');
    const rows = insert!.args[0] as Array<{ participant_id: string; share_cents: number }>;
    expect(rows).toHaveLength(3);
    expect(rows.reduce((a, r) => a + r.share_cents, 0)).toBe(9000);
    expect(rows.every((r) => r.share_cents === 3000)).toBe(true);

    // created_by_email stamped from the guest.
    const expInsert = h.state.calls.find((c) => c.table === 'expenses' && c.method === 'insert');
    expect((expInsert!.args[0] as Record<string, unknown>).created_by_email).toBe('guest@example.test');
    // The client `shares` field never reached the DB payload.
    expect((expInsert!.args[0] as Record<string, unknown>).shares).toBeUndefined();
  });

  it('rejects an anonymous caller with 401 and writes nothing', async () => {
    h.state.session = null;
    h.state.guest = null;
    h.queue('sites', SITE_ROW);
    const res = await EXPENSES_POST(
      postReq('/api/split/expenses', {
        siteId: 'demo', payerId: P1, description: 'x', amountCents: 100, mode: 'even', participantIds: [P1],
      }),
    );
    expect(res.status).toBe(401);
    expect(h.state.calls.some((c) => c.table === 'expenses' && c.method === 'insert')).toBe(false);
  });

  it('rejects a payer that is not a participant of the site (400)', async () => {
    asOwner();
    h.queue('sites', SITE_ROW);
    // Member check returns only P2, P3 — the payer P1 is not on the split.
    h.queue('participants', [{ id: P2 }, { id: P3 }]);
    const res = await EXPENSES_POST(
      postReq('/api/split/expenses', {
        siteId: 'demo', payerId: P1, description: 'x', amountCents: 500, mode: 'even', participantIds: [P1, P2, P3],
      }),
    );
    expect(res.status).toBe(400);
    expect(h.state.calls.some((c) => c.table === 'expenses' && c.method === 'insert')).toBe(false);
  });

  it('never records a $0 expense', async () => {
    asOwner();
    h.queue('sites', SITE_ROW);
    const res = await EXPENSES_POST(
      postReq('/api/split/expenses', {
        siteId: 'demo', payerId: P1, description: 'freebie', amountCents: 0, mode: 'even', participantIds: [P1, P2],
      }),
    );
    expect(res.status).toBe(400);
  });
});
