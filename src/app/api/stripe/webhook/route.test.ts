// ─────────────────────────────────────────────────────────────
// Pearloom / api/stripe/webhook/route.test.ts
//
// Phase 2.7 of AUDIT-2026-05-29.md + locks in the Phase 1.3 fix.
//
// The Stripe webhook is the SOURCE OF TRUTH for payment state.
// Phase 1.3 (commit d17293f) fixed a real race: registry_item_claims
// had no stripe_session_id column or idempotency guard, so a
// concurrent retry could insert a duplicate claim and double-bump
// quantity_claimed. Without a regression net, a future refactor
// could silently undo that fix — and we'd only learn from a
// support ticket about a double-claimed gift.
//
// This file pins:
//   • Signature verification (400 on tamper)
//   • Env hygiene (503 when secret missing)
//   • payments idempotency (existing session → update, new → insert)
//   • registry_item_claims idempotency — BOTH paths:
//       (a) pre-check by stripe_session_id finds existing → no-op
//       (b) pre-check empty BUT insert hits 23505 → benign no-op
//   • Quantity bump runs exactly once per Stripe session
//   • Refund handler updates payments + decrements quantity_claimed
//   • payment_intent.payment_failed marks payments failed
//   • Unhandled event types return 200 silently (Stripe stops retrying)
//   • Handler throws → 500 so Stripe retries
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean; count?: number };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    const verbs = ['select', 'eq', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update'];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        if (verb === 'maybeSingle') {
          const q = queues[`${table}.maybeSingle`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
          );
        }
        if (verb === 'single') {
          const q = queues[`${table}.single`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
          );
        }
        if (verb === 'limit') {
          // refund handler: .order().limit(1).maybeSingle() chain
          // — return the chain so maybeSingle terminates.
          return chain;
        }
        if (verb === 'insert') {
          const q = queues[`${table}.insert`]?.shift();
          // payments.insert(...).select('id').single() — pre-stash
          // the single() result with the inserted row's id.
          if (table === 'payments' && !q?.isError) {
            queues['payments.single'] = queues['payments.single'] || [];
            queues['payments.single'].unshift({
              value: { id: (q?.value as { id?: string })?.id ?? 'pay-1' },
            });
          }
          const result = q?.isError ? { error: q.value } : { error: null };
          // Return a thenable chain so BOTH shapes work:
          //   await .insert({...})                             — direct await
          //   await .insert({...}).select('id').single()       — chained
          const insertChain = makeChain(table);
          (insertChain as { then: (resolve: (v: unknown) => unknown) => Promise<unknown> }).then =
            (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
          return insertChain;
        }
        if (verb === 'update') {
          // update().eq() — terminal on .eq().
          const updateChain = makeChain(table);
          (updateChain as { eq: (...a: unknown[]) => Promise<unknown> }).eq = (...a: unknown[]) => {
            calls.push({ table, method: 'update.eq', args: a });
            const q = queues[`${table}.update.eq`]?.shift();
            return Promise.resolve(
              q?.isError ? { error: q.value } : { error: null },
            );
          };
          return updateChain;
        }
        return chain;
      };
    }
    return chain;
  }

  const supabaseMock = {
    from: (table: string) => makeChain(table),
  };

  return {
    queues,
    calls,
    supabaseMock,
    constructEventMock: vi.fn() as Mock,
    queue(key: string, value: unknown, opts: { isError?: boolean; count?: number } = {}) {
      queues[key] = queues[key] || [];
      queues[key].push({ value, isError: opts.isError, count: opts.count });
    },
    reset() {
      Object.keys(queues).forEach((k) => delete queues[k]);
      calls.length = 0;
    },
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => h.supabaseMock,
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: h.constructEventMock },
  }),
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

function postReq(rawBody: string, signature: string | null = 'sig'): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (signature) headers['stripe-signature'] = signature;
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body: rawBody,
    headers,
  });
}

// Helper to build a checkout.session.completed event for registry
// purchases (the path with the most idempotency surface).
function registryCheckoutEvent(overrides: Partial<{
  sessionId: string;
  siteId: string;
  registryItemId: string;
  quantity: string;
  amountTotal: number;
  payerEmail: string;
}> = {}): unknown {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: overrides.sessionId ?? 'cs_test_001',
        amount_total: overrides.amountTotal ?? 5000,
        currency: 'usd',
        customer_email: overrides.payerEmail ?? 'guest@example.test',
        customer_details: { email: overrides.payerEmail ?? 'guest@example.test', name: 'Guest' },
        payment_intent: 'pi_test_001',
        metadata: {
          siteId: overrides.siteId ?? 'site-1',
          paymentType: 'registry',
          registryItemId: overrides.registryItemId ?? 'item-1',
          quantity: overrides.quantity ?? '1',
          payerName: 'Guest Name',
          message: 'Congrats!',
        },
      },
    },
  };
}

describe('POST /api/stripe/webhook — signature + env', () => {
  beforeEach(() => {
    h.reset();
    h.constructEventMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('503 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(postReq('{}'));
    expect(res.status).toBe(503);
  });

  it('400 when stripe-signature header is missing', async () => {
    const res = await POST(postReq('{}', null));
    expect(res.status).toBe(400);
    expect(h.constructEventMock).not.toHaveBeenCalled();
  });

  it('400 when constructEvent throws (tampered or invalid signature)', async () => {
    h.constructEventMock.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });
    const res = await POST(postReq('{}'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/webhook error/i);
  });

  it('200 + persisted:false when Supabase env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    h.constructEventMock.mockReturnValue({ type: 'unknown.event' });
    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.persisted).toBe(false);
  });

  it('200 silently on unhandled event types (Stripe stops retrying)', async () => {
    h.constructEventMock.mockReturnValue({ type: 'invoice.paid', data: { object: {} } });
    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/stripe/webhook — payments idempotency', () => {
  beforeEach(() => {
    h.reset();
    h.constructEventMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('updates an existing payments row (status flip) instead of inserting on retry', async () => {
    h.constructEventMock.mockReturnValue(registryCheckoutEvent());
    // Existing payment row from a prior delivery — status was 'pending'.
    h.queue('payments.maybeSingle', { id: 'pay-existing', status: 'pending' });
    // Registry side effects: claim not yet inserted, item lookup, bump.
    h.queue('registry_item_claims.maybeSingle', null);
    h.queue('registry_item_claims.insert', null);
    h.queue('registry_items.single', { quantity: 4, quantity_claimed: 1 });

    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);

    // No second payments.insert — that would have been a duplicate
    // row + a 23505 in production.
    const payInserts = h.calls.filter((c) => c.table === 'payments' && c.method === 'insert');
    expect(payInserts).toHaveLength(0);

    // Update fired with status='paid'.
    const payUpdate = h.calls.find((c) => c.table === 'payments' && c.method === 'update');
    expect(payUpdate).toBeDefined();
    expect((payUpdate!.args[0] as { status: string }).status).toBe('paid');
  });

  it('inserts a new payments row when no existing session_id found', async () => {
    h.constructEventMock.mockReturnValue(registryCheckoutEvent());
    h.queue('payments.maybeSingle', null);  // no prior delivery
    h.queue('registry_item_claims.maybeSingle', null);
    h.queue('registry_item_claims.insert', null);
    h.queue('registry_items.single', { quantity: 4, quantity_claimed: 1 });

    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);

    const payInserts = h.calls.filter((c) => c.table === 'payments' && c.method === 'insert');
    expect(payInserts).toHaveLength(1);
    const payload = (payInserts[0].args[0] as unknown[])[0] ?? payInserts[0].args[0];
    expect((payload as { stripe_session_id: string }).stripe_session_id).toBe('cs_test_001');
  });
});

describe('POST /api/stripe/webhook — registry_item_claims idempotency (Phase 1.3 regression net)', () => {
  beforeEach(() => {
    h.reset();
    h.constructEventMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('pre-check finds existing claim → no insert, NO quantity bump fires', async () => {
    h.constructEventMock.mockReturnValue(registryCheckoutEvent());
    h.queue('payments.maybeSingle', null);
    // Claim already present from a prior webhook delivery.
    h.queue('registry_item_claims.maybeSingle', { id: 'claim-existing' });

    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);

    // CRITICAL: zero further DB writes on the registry side.
    const claimInserts = h.calls.filter(
      (c) => c.table === 'registry_item_claims' && c.method === 'insert',
    );
    expect(claimInserts).toHaveLength(0);

    // CRITICAL: quantity_claimed update MUST NOT fire — otherwise
    // every retry bumps the counter and the gift double-claims.
    const itemUpdates = h.calls.filter(
      (c) => c.table === 'registry_items' && c.method === 'update',
    );
    expect(itemUpdates).toHaveLength(0);

    // And we did NOT touch registry_items.single (the quantity
    // read) — confirms the early-return ran.
    const itemReads = h.calls.filter(
      (c) => c.table === 'registry_items' && c.method === 'single',
    );
    expect(itemReads).toHaveLength(0);
  });

  it('benign 23505 on insert (concurrent webhook race) → no quantity bump fires', async () => {
    h.constructEventMock.mockReturnValue(registryCheckoutEvent());
    h.queue('payments.maybeSingle', null);
    // Pre-check returns nothing — both webhooks raced past this point.
    h.queue('registry_item_claims.maybeSingle', null);
    // Our insert loses the race — Postgres returns 23505.
    h.queue('registry_item_claims.insert', { code: '23505', message: 'unique violation' }, { isError: true });

    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);

    // No quantity bump — the OTHER webhook's insert already
    // triggered its own bump path.
    const itemUpdates = h.calls.filter(
      (c) => c.table === 'registry_items' && c.method === 'update',
    );
    expect(itemUpdates).toHaveLength(0);
  });

  it('non-23505 insert error throws → 500 so Stripe retries', async () => {
    h.constructEventMock.mockReturnValue(registryCheckoutEvent());
    h.queue('payments.maybeSingle', null);
    h.queue('registry_item_claims.maybeSingle', null);
    h.queue('registry_item_claims.insert', { code: '42P01', message: 'no table' }, { isError: true });

    const res = await POST(postReq('{}'));
    expect(res.status).toBe(500);
  });

  it('fresh insert succeeds → claim row + quantity bump fire exactly once', async () => {
    h.constructEventMock.mockReturnValue(registryCheckoutEvent({ quantity: '2', amountTotal: 8000 }));
    h.queue('payments.maybeSingle', null);
    h.queue('registry_item_claims.maybeSingle', null);
    h.queue('registry_item_claims.insert', null);
    h.queue('registry_items.single', { quantity: 4, quantity_claimed: 1 });

    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);

    // Claim row inserted with stripe_session_id + payment_id linkage.
    const claimInsert = h.calls.find(
      (c) => c.table === 'registry_item_claims' && c.method === 'insert',
    );
    expect(claimInsert).toBeDefined();
    const claimRow = claimInsert!.args[0] as Record<string, unknown>;
    expect(claimRow.stripe_session_id).toBe('cs_test_001');
    expect(claimRow.payment_id).toBe('pay-1');  // from the queued single() id
    expect(claimRow.quantity).toBe(2);

    // Quantity bumped: 1 (existing) + 2 (this claim) = 3. Not yet
    // purchased (3 < 4 total).
    const itemUpdate = h.calls.find(
      (c) => c.table === 'registry_items' && c.method === 'update',
    );
    expect(itemUpdate).toBeDefined();
    const bump = itemUpdate!.args[0] as { quantity_claimed: number; purchased: boolean };
    expect(bump.quantity_claimed).toBe(3);
    expect(bump.purchased).toBe(false);
  });

  it('quantity_claimed reaching total flips purchased:true', async () => {
    h.constructEventMock.mockReturnValue(registryCheckoutEvent({ quantity: '3' }));
    h.queue('payments.maybeSingle', null);
    h.queue('registry_item_claims.maybeSingle', null);
    h.queue('registry_item_claims.insert', null);
    h.queue('registry_items.single', { quantity: 4, quantity_claimed: 1 });

    await POST(postReq('{}'));

    const itemUpdate = h.calls.find(
      (c) => c.table === 'registry_items' && c.method === 'update',
    );
    const bump = itemUpdate!.args[0] as { quantity_claimed: number; purchased: boolean };
    expect(bump.quantity_claimed).toBe(4);
    expect(bump.purchased).toBe(true);
  });
});

describe('POST /api/stripe/webhook — refund + payment_failed', () => {
  beforeEach(() => {
    h.reset();
    h.constructEventMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('charge.refunded marks the payment refunded and decrements registry quantity', async () => {
    h.constructEventMock.mockReturnValue({
      type: 'charge.refunded',
      data: {
        object: { payment_intent: 'pi_refund_1' },
      },
    });
    // Payment lookup finds the original registry payment.
    h.queue('payments.maybeSingle', {
      registry_item_id: 'item-1',
      payment_type: 'registry',
    });
    // The most recent paid claim for that registry item.
    h.queue('registry_item_claims.maybeSingle', { id: 'claim-1', quantity: 2 });
    // Current item quantity_claimed.
    h.queue('registry_items.single', { quantity_claimed: 3 });

    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);

    // Payment status → refunded.
    const payUpdate = h.calls.find(
      (c) => c.table === 'payments' && c.method === 'update',
    );
    expect(payUpdate).toBeDefined();
    expect((payUpdate!.args[0] as { status: string }).status).toBe('refunded');

    // Claim status → refunded.
    const claimUpdate = h.calls.find(
      (c) => c.table === 'registry_item_claims' && c.method === 'update',
    );
    expect(claimUpdate).toBeDefined();
    expect((claimUpdate!.args[0] as { status: string }).status).toBe('refunded');

    // Item quantity_claimed: 3 - 2 = 1, purchased back to false.
    const itemUpdate = h.calls.find(
      (c) => c.table === 'registry_items' && c.method === 'update',
    );
    expect(itemUpdate).toBeDefined();
    const bump = itemUpdate!.args[0] as { quantity_claimed: number; purchased: boolean };
    expect(bump.quantity_claimed).toBe(1);
    expect(bump.purchased).toBe(false);
  });

  it('charge.refunded with no payment_intent is a silent no-op', async () => {
    h.constructEventMock.mockReturnValue({
      type: 'charge.refunded',
      data: { object: { payment_intent: null } },
    });
    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);
    // No payments touched.
    expect(h.calls.filter((c) => c.table === 'payments')).toHaveLength(0);
  });

  it('payment_intent.payment_failed marks payments failed', async () => {
    h.constructEventMock.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_fail_1' } },
    });
    const res = await POST(postReq('{}'));
    expect(res.status).toBe(200);
    const payUpdate = h.calls.find(
      (c) => c.table === 'payments' && c.method === 'update',
    );
    expect(payUpdate).toBeDefined();
    expect((payUpdate!.args[0] as { status: string }).status).toBe('failed');
  });
});
