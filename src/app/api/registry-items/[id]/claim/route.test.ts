// ─────────────────────────────────────────────────────────────
// Pearloom / api/registry-items/[id]/claim/route.test.ts
//
// R1-lite launch-mode contract: when Stripe isn't configured (or
// the caller sends mode:'reserve'), the claim endpoint reserves
// without payment — atomically bumping quantity_claimed with an
// optimistic-concurrency guard, stamping the claimant on the item,
// and writing a registry_item_claims ledger row (payment_id null =
// reservation). This file pins:
//   • 429 on rate limit
//   • payerName required in reserve mode
//   • 404 unknown item / 409 over-claim (pre-check)
//   • Happy path: guarded bump + ledger row + { reserved, buyUrl }
//   • Concurrency: guard matches zero rows → 409, NO ledger row
//   • Legacy payment_status CHECK without 'reserved' → retry
//     without payment_status still reserves
//   • mode:'reserve' skips Stripe even when it's configured
//   • Stripe default path still returns a checkout url
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    /** registry_items .maybeSingle() result. */
    item: null as unknown,
    /** Queued results for update(...).eq().eq().select(). */
    updateResults: [] as Array<{ data: unknown; error: unknown }>,
    /** registry_item_claims .insert() result. */
    insertResult: { error: null } as { error: unknown },
    calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
    hasStripe: false,
    allowed: true,
  };

  function chain(table: string) {
    let isUpdate = false;
    const c: Record<string, unknown> = {};
    c.select = (...args: unknown[]) => {
      state.calls.push({ table, method: isUpdate ? 'update.select' : 'select', args });
      if (isUpdate) {
        const r = state.updateResults.shift() ?? { data: [{ id: 'row' }], error: null };
        return Promise.resolve(r);
      }
      return c;
    };
    c.eq = (...args: unknown[]) => {
      state.calls.push({ table, method: isUpdate ? 'update.eq' : 'eq', args });
      return c;
    };
    c.maybeSingle = () => {
      state.calls.push({ table, method: 'maybeSingle', args: [] });
      return Promise.resolve({ data: state.item, error: null });
    };
    c.update = (...args: unknown[]) => {
      isUpdate = true;
      state.calls.push({ table, method: 'update', args });
      return c;
    };
    c.insert = (...args: unknown[]) => {
      state.calls.push({ table, method: 'insert', args });
      return Promise.resolve(state.insertResult);
    };
    return c;
  }

  return {
    state,
    supabase: { from: (t: string) => chain(t) },
    checkoutMock: vi.fn(async () => ({ url: 'https://checkout.stripe.test/cs_1', id: 'cs_1' })),
    reset() {
      state.item = null;
      state.updateResults = [];
      state.insertResult = { error: null };
      state.calls = [];
      state.hasStripe = false;
      state.allowed = true;
    },
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => h.supabase,
}));

vi.mock('@/lib/stripe/client', () => ({
  hasStripe: () => h.state.hasStripe,
}));

vi.mock('@/lib/stripe/checkout', () => ({
  createCheckoutSession: h.checkoutMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: h.state.allowed }),
  getClientIp: () => '1.2.3.4',
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/registry-items/item-1/claim', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function call(body: unknown) {
  return POST(postReq(body), { params: Promise.resolve({ id: 'item-1' }) });
}

const NATIVE_ITEM = {
  id: 'item-1',
  site_id: 'site-uuid-1',
  source_id: null,
  name: 'The dutch oven',
  description: 'For every soup after.',
  price: 120,
  image_url: null,
  item_url: 'https://www.store.example/dutch-oven',
  quantity: 4,
  quantity_claimed: 1,
  purchased: false,
};

beforeEach(() => {
  h.reset();
  h.checkoutMock.mockClear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

describe('POST /api/registry-items/[id]/claim — reserve mode (no Stripe)', () => {
  it('429 when rate limited', async () => {
    h.state.allowed = false;
    const res = await call({ payerName: 'June Marlow' });
    expect(res.status).toBe(429);
  });

  it('400 when payerName is missing in reserve mode', async () => {
    const res = await call({ message: 'no name attached' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/payerName/);
  });

  it('404 when the item does not exist', async () => {
    h.state.item = null;
    const res = await call({ payerName: 'June Marlow' });
    expect(res.status).toBe(404);
  });

  it('409 when the requested quantity exceeds what is left', async () => {
    h.state.item = { ...NATIVE_ITEM, quantity: 2, quantity_claimed: 2 };
    const res = await call({ payerName: 'June Marlow' });
    expect(res.status).toBe(409);
  });

  it('reserves: guarded bump + ledger row + { reserved, buyUrl }', async () => {
    h.state.item = NATIVE_ITEM;
    h.state.updateResults.push({ data: [{ id: 'item-1' }], error: null });

    const res = await call({ payerName: 'June Marlow', message: 'So happy for you two' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reserved).toBe(true);
    expect(json.buyUrl).toBe('https://www.store.example/dutch-oven');

    // Bump payload: quantity_claimed 1 → 2, claimant stamped,
    // payment_status attempted as 'reserved'.
    const update = h.state.calls.find((c) => c.table === 'registry_items' && c.method === 'update');
    expect(update).toBeDefined();
    const payload = update!.args[0] as Record<string, unknown>;
    expect(payload.quantity_claimed).toBe(2);
    expect(payload.purchased).toBe(false);
    expect(payload.claimed_by_name).toBe('June Marlow');
    expect(payload.claim_note).toBe('So happy for you two');
    expect(payload.payment_status).toBe('reserved');

    // Optimistic-concurrency guard: update filtered on the
    // quantity_claimed value we read (1).
    const guard = h.state.calls.find(
      (c) => c.table === 'registry_items' && c.method === 'update.eq' && c.args[0] === 'quantity_claimed',
    );
    expect(guard).toBeDefined();
    expect(guard!.args[1]).toBe(1);

    // Ledger row: reservation = status pending, payment_id null.
    const insert = h.state.calls.find((c) => c.table === 'registry_item_claims' && c.method === 'insert');
    expect(insert).toBeDefined();
    const row = insert!.args[0] as Record<string, unknown>;
    expect(row.status).toBe('pending');
    expect(row.payment_id).toBeNull();
    expect(row.payer_name).toBe('June Marlow');
    expect(row.quantity).toBe(1);
    expect(row.amount_cents).toBe(12000);

    // No Stripe checkout in reserve mode.
    expect(h.checkoutMock).not.toHaveBeenCalled();
  });

  it('reserving the last unit flips purchased:true', async () => {
    h.state.item = { ...NATIVE_ITEM, quantity: 2, quantity_claimed: 1 };
    h.state.updateResults.push({ data: [{ id: 'item-1' }], error: null });

    const res = await call({ payerName: 'June Marlow' });
    expect(res.status).toBe(200);

    const update = h.state.calls.find((c) => c.table === 'registry_items' && c.method === 'update');
    const payload = update!.args[0] as Record<string, unknown>;
    expect(payload.quantity_claimed).toBe(2);
    expect(payload.purchased).toBe(true);
  });

  it('409 + NO ledger row when a racing reservation wins the guard', async () => {
    h.state.item = NATIVE_ITEM;
    // Guard matches zero rows — someone bumped quantity_claimed
    // between our read and our update.
    h.state.updateResults.push({ data: [], error: null });

    const res = await call({ payerName: 'June Marlow' });
    expect(res.status).toBe(409);

    const inserts = h.state.calls.filter((c) => c.table === 'registry_item_claims' && c.method === 'insert');
    expect(inserts).toHaveLength(0);
  });

  it('legacy payment_status CHECK (23514) → retries without payment_status and still reserves', async () => {
    h.state.item = NATIVE_ITEM;
    h.state.updateResults.push({ data: null, error: { code: '23514', message: 'violates check constraint "registry_items_payment_status_check"' } });
    h.state.updateResults.push({ data: [{ id: 'item-1' }], error: null });

    const res = await call({ payerName: 'June Marlow' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reserved).toBe(true);

    const updates = h.state.calls.filter((c) => c.table === 'registry_items' && c.method === 'update');
    expect(updates).toHaveLength(2);
    expect((updates[0].args[0] as Record<string, unknown>).payment_status).toBe('reserved');
    expect((updates[1].args[0] as Record<string, unknown>).payment_status).toBeUndefined();
    expect((updates[1].args[0] as Record<string, unknown>).quantity_claimed).toBe(2);
  });

  it('rejects claims on external (source_id) items', async () => {
    h.state.item = { ...NATIVE_ITEM, source_id: 'src-1' };
    const res = await call({ payerName: 'June Marlow' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/registry-items/[id]/claim — Stripe configured', () => {
  it('explicit mode:"reserve" skips checkout even when Stripe is configured', async () => {
    h.state.hasStripe = true;
    h.state.item = NATIVE_ITEM;
    h.state.updateResults.push({ data: [{ id: 'item-1' }], error: null });

    const res = await call({ mode: 'reserve', payerName: 'June Marlow' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reserved).toBe(true);
    expect(h.checkoutMock).not.toHaveBeenCalled();
  });

  it('default path still builds a Stripe Checkout session', async () => {
    h.state.hasStripe = true;
    h.state.item = NATIVE_ITEM;

    const res = await call({ payerEmail: 'guest@example.test', payerName: 'Guest', quantity: 1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://checkout.stripe.test/cs_1');
    expect(h.checkoutMock).toHaveBeenCalledTimes(1);

    // The pay path marks the item pending — never 'reserved'.
    const update = h.state.calls.find((c) => c.table === 'registry_items' && c.method === 'update');
    expect((update!.args[0] as Record<string, unknown>).payment_status).toBe('pending');
  });

  it('requires payerEmail on the pay path', async () => {
    h.state.hasStripe = true;
    const res = await call({ payerName: 'Guest' });
    expect(res.status).toBe(400);
  });
});
