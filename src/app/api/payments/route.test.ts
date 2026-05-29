// ─────────────────────────────────────────────────────────────
// Pearloom / api/payments/route.test.ts
//
// Phase 2.7 of AUDIT-2026-05-29.md — payments. The dashboard's
// PaymentsPanel reads this route to show "who bought what" with
// totals. Two regression traps:
//   1. The tally MUST exclude non-paid rows. If a pending/failed
//      row leaks into the gross/net, the host's "we've raised X"
//      number is wrong.
//   2. The ownership gate MUST be case-insensitive (matches the
//      rest of the route surface — IdP casing drift otherwise
//      403s the legitimate owner from their own ledger).
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    const verbs = ['select', 'eq', 'order', 'maybeSingle'];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        if (verb === 'maybeSingle') {
          const q = queues[`${table}.maybeSingle`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
          );
        }
        if (verb === 'order') {
          // payments list — terminal on .order().
          const q = queues[`${table}.order`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? [], error: null },
          );
        }
        return chain;
      };
    }
    return chain;
  }

  const supabaseMock = {
    from: (table: string) => makeChain(table),
  };

  const sessionMock: { value: unknown } = {
    value: { user: { email: 'owner@example.test' } },
  };

  return {
    queues,
    calls,
    supabaseMock,
    sessionMock,
    queue(key: string, value: unknown, isError?: boolean) {
      queues[key] = queues[key] || [];
      queues[key].push({ value, isError });
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

import { GET } from './route';
import { NextRequest } from 'next/server';

function getReq(siteId?: string): NextRequest {
  const url = siteId
    ? `http://localhost/api/payments?siteId=${siteId}`
    : 'http://localhost/api/payments';
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/payments', () => {
  beforeEach(() => {
    h.reset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await GET(getReq('s1'));
    expect(res.status).toBe(401);
  });

  it('400 when siteId missing', async () => {
    const res = await GET(getReq(undefined));
    expect(res.status).toBe(400);
  });

  it('200 with empty payments + zero totals when Supabase env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await GET(getReq('s1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      payments: [],
      totals: { gross: 0, net: 0, fee: 0, count: 0 },
    });
  });

  it('403 when caller does not own the site', async () => {
    h.queue('sites.maybeSingle', { creator_email: 'someone-else@example.test' });
    const res = await GET(getReq('s1'));
    expect(res.status).toBe(403);

    // Ownership failure MUST short-circuit before the payments
    // select — otherwise data fans out to whoever can guess a uuid.
    expect(h.calls.find((c) => c.table === 'payments')).toBeUndefined();
  });

  it('owner check is case-insensitive (IdP casing drift)', async () => {
    h.sessionMock.value = { user: { email: 'Owner@Example.TEST' } };
    h.queue('sites.maybeSingle', { creator_email: 'owner@example.test' });
    h.queue('payments.order', []);
    const res = await GET(getReq('s1'));
    expect(res.status).toBe(200);
  });

  it('returns null-creator-email site as 403 (defense against missing column)', async () => {
    h.queue('sites.maybeSingle', { creator_email: null });
    const res = await GET(getReq('s1'));
    expect(res.status).toBe(403);
  });

  it('200 with mapped rows + correct totals (only paid rows tallied)', async () => {
    h.queue('sites.maybeSingle', { creator_email: 'owner@example.test' });
    h.queue('payments.order', [
      // PAID — counts toward totals.
      {
        id: 'p1',
        payer_email: 'a@example.test',
        payer_name: 'Alice',
        amount_cents: 5000,
        currency: 'usd',
        pearloom_fee_cents: 250,
        net_amount_cents: 4750,
        payment_type: 'registry',
        registry_item_id: 'item-1',
        status: 'paid',
        message: 'Congrats',
        created_at: '2026-05-10T10:00:00Z',
      },
      // PAID — counts.
      {
        id: 'p2',
        payer_email: 'b@example.test',
        payer_name: null,
        amount_cents: 10000,
        currency: 'usd',
        pearloom_fee_cents: 500,
        net_amount_cents: 9500,
        payment_type: 'cash_gift',
        registry_item_id: null,
        status: 'paid',
        message: null,
        created_at: '2026-05-09T10:00:00Z',
      },
      // PENDING — must be excluded from totals.
      {
        id: 'p3',
        payer_email: 'c@example.test',
        payer_name: null,
        amount_cents: 9999999,
        currency: 'usd',
        pearloom_fee_cents: 0,
        net_amount_cents: 9999999,
        payment_type: 'registry',
        registry_item_id: 'item-2',
        status: 'pending',
        message: null,
        created_at: '2026-05-08T10:00:00Z',
      },
      // REFUNDED — must be excluded.
      {
        id: 'p4',
        payer_email: 'd@example.test',
        payer_name: 'Dan',
        amount_cents: 2000,
        currency: 'usd',
        pearloom_fee_cents: 100,
        net_amount_cents: 1900,
        payment_type: 'tip',
        registry_item_id: null,
        status: 'refunded',
        message: null,
        created_at: '2026-05-07T10:00:00Z',
      },
      // FAILED — must be excluded.
      {
        id: 'p5',
        payer_email: 'e@example.test',
        payer_name: null,
        amount_cents: 3000,
        currency: 'usd',
        pearloom_fee_cents: 150,
        net_amount_cents: 2850,
        payment_type: 'registry',
        registry_item_id: 'item-3',
        status: 'failed',
        message: null,
        created_at: '2026-05-06T10:00:00Z',
      },
    ]);

    const res = await GET(getReq('s1'));
    expect(res.status).toBe(200);
    const json = await res.json();

    // Every row mapped through (snake → camel), regardless of status.
    expect(json.payments).toHaveLength(5);
    const p1 = json.payments[0];
    expect(p1).toMatchObject({
      id: 'p1',
      payerEmail: 'a@example.test',
      payerName: 'Alice',
      amountCents: 5000,
      pearloomFeeCents: 250,
      netAmountCents: 4750,
      paymentType: 'registry',
      registryItemId: 'item-1',
      status: 'paid',
      message: 'Congrats',
    });

    // CRITICAL: tally only paid rows (p1 + p2).
    expect(json.totals).toEqual({
      gross: 5000 + 10000,
      net: 4750 + 9500,
      fee: 250 + 500,
      count: 2,
    });
  });

  it('falls back netAmountCents to amount_cents when the column is null (legacy rows)', async () => {
    h.queue('sites.maybeSingle', { creator_email: 'owner@example.test' });
    h.queue('payments.order', [
      {
        id: 'legacy-1',
        payer_email: 'old@example.test',
        amount_cents: 7500,
        currency: 'usd',
        pearloom_fee_cents: null,
        net_amount_cents: null,  // legacy row pre-2026 migration
        payment_type: 'tip',
        status: 'paid',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    const res = await GET(getReq('s1'));
    const json = await res.json();
    expect(json.payments[0].netAmountCents).toBe(7500);
    expect(json.payments[0].pearloomFeeCents).toBe(0);
    expect(json.totals.gross).toBe(7500);
    expect(json.totals.net).toBe(7500);
    expect(json.totals.fee).toBe(0);
  });

  it('200 with empty list when the payments select fails (graceful)', async () => {
    h.queue('sites.maybeSingle', { creator_email: 'owner@example.test' });
    h.queue('payments.order', { code: '42P01', message: 'no table' }, true);
    const res = await GET(getReq('s1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toEqual([]);
    expect(json.totals).toEqual({ gross: 0, net: 0, fee: 0, count: 0 });
  });
});
