// ─────────────────────────────────────────────────────────────
// Pearloom / api/gift-pledges/route.test.ts
//
// The honor ledger's R3 contract — group gifts + the thank-you
// ledger. Pins:
//   • public GET: fund-level totals cover UNTIED pledges only;
//     item-tied chip-ins aggregate into items[{itemId,totalCents,
//     count}] — no individual amounts leave the aggregate.
//   • POST: itemId (uuid) rides onto the inserted row.
//   • PATCH (thank-you stamp): 401 anon · 400 bad body ·
//     404 unknown pledge · 403 non-owner · owner sets/unsets
//     thanked_at.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    session: null as null | { user: { email: string } },
    /** sites .maybeSingle() result. */
    siteRow: null as unknown,
    /** gift_pledges list result (select…limit). */
    pledgeRows: [] as unknown[],
    /** gift_pledges .maybeSingle() result (PATCH lookup). */
    pledgeSingle: null as unknown,
    insertError: null as unknown,
    updateError: null as unknown,
    calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  };

  function chain(table: string) {
    let isUpdate = false;
    const c: Record<string, unknown> = {};
    c.select = (...args: unknown[]) => {
      state.calls.push({ table, method: 'select', args });
      return c;
    };
    c.update = (...args: unknown[]) => {
      isUpdate = true;
      state.calls.push({ table, method: 'update', args });
      return c;
    };
    c.insert = (...args: unknown[]) => {
      state.calls.push({ table, method: 'insert', args });
      return Promise.resolve({ error: state.insertError });
    };
    c.eq = (...args: unknown[]) => {
      state.calls.push({ table, method: isUpdate ? 'update.eq' : 'eq', args });
      if (isUpdate) return Promise.resolve({ data: null, error: state.updateError });
      return c;
    };
    c.order = (...args: unknown[]) => {
      state.calls.push({ table, method: 'order', args });
      return c;
    };
    c.limit = (...args: unknown[]) => {
      state.calls.push({ table, method: 'limit', args });
      return Promise.resolve({ data: state.pledgeRows, error: null });
    };
    c.maybeSingle = () => {
      state.calls.push({ table, method: 'maybeSingle', args: [] });
      return Promise.resolve({
        data: table === 'sites' ? state.siteRow : state.pledgeSingle,
        error: null,
      });
    };
    return c;
  }

  return {
    state,
    supabase: { from: (t: string) => chain(t) },
    reset() {
      state.session = null;
      state.siteRow = null;
      state.pledgeRows = [];
      state.pledgeSingle = null;
      state.insertError = null;
      state.updateError = null;
      state.calls = [];
    },
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => h.supabase,
}));

vi.mock('next-auth', () => ({
  getServerSession: () => Promise.resolve(h.state.session),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true }),
  getClientIp: () => '1.2.3.4',
}));

import { GET, POST, PATCH } from './route';
import { NextRequest } from 'next/server';

const ITEM_UUID = '123e4567-e89b-12d3-a456-426614174000';

function getReq(qs: string): NextRequest {
  return new NextRequest(`http://localhost/api/gift-pledges?${qs}`);
}

function bodyReq(method: 'POST' | 'PATCH', body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/gift-pledges', {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  h.reset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

describe('GET /api/gift-pledges?public=1 — fund + per-item aggregates', () => {
  it('splits untied fund pledges from item-tied chip-ins', async () => {
    h.state.siteRow = { id: 'site-uuid-1' };
    h.state.pledgeRows = [
      { item_id: null, guest_name: 'June Marlow', amount_cents: 5000, created_at: '2026-07-01T12:00:00Z' },
      { item_id: 'item-1', guest_name: 'Ana Perez', amount_cents: 20000, created_at: '2026-07-01T11:00:00Z' },
      { item_id: 'item-1', guest_name: 'Bo Kim', amount_cents: 10000, created_at: '2026-07-01T10:00:00Z' },
      { item_id: 'item-2', guest_name: 'Cy Reed', amount_cents: null, created_at: '2026-07-01T09:00:00Z' },
    ];

    const res = await GET(getReq('subdomain=demo&public=1'));
    expect(res.status).toBe(200);
    const json = await res.json();

    // Fund-level aggregate = untied pledges only.
    expect(json.totalCents).toBe(5000);
    expect(json.count).toBe(1);
    expect(json.recent).toHaveLength(1);
    expect(json.recent[0].firstName).toBe('June');

    // Per-item chip-in aggregates — totals only, no names/amounts
    // per guest.
    expect(json.items).toHaveLength(2);
    const item1 = json.items.find((i: { itemId: string }) => i.itemId === 'item-1');
    expect(item1).toEqual({ itemId: 'item-1', totalCents: 30000, count: 2 });
    const item2 = json.items.find((i: { itemId: string }) => i.itemId === 'item-2');
    expect(item2).toEqual({ itemId: 'item-2', totalCents: 0, count: 1 });
  });

  it('returns empty aggregates when the site is unknown', async () => {
    h.state.siteRow = null;
    const res = await GET(getReq('subdomain=ghost&public=1'));
    const json = await res.json();
    expect(json).toEqual({ totalCents: 0, count: 0, recent: [], items: [] });
  });
});

describe('POST /api/gift-pledges — chip-in writes carry itemId', () => {
  it('inserts the pledge with item_id when a valid uuid is sent', async () => {
    h.state.siteRow = { id: 'site-uuid-1' };
    const res = await POST(bodyReq('POST', {
      subdomain: 'demo',
      guestName: 'June Marlow',
      amountCents: 2500,
      note: 'For the long table',
      itemId: ITEM_UUID,
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    const insert = h.state.calls.find((c) => c.table === 'gift_pledges' && c.method === 'insert');
    expect(insert).toBeDefined();
    const row = insert!.args[0] as Record<string, unknown>;
    expect(row.item_id).toBe(ITEM_UUID);
    expect(row.amount_cents).toBe(2500);
    expect(row.guest_name).toBe('June Marlow');
  });

  it('drops a malformed itemId instead of erroring', async () => {
    h.state.siteRow = { id: 'site-uuid-1' };
    const res = await POST(bodyReq('POST', {
      subdomain: 'demo',
      guestName: 'June Marlow',
      itemId: 'not-a-uuid',
    }));
    expect(res.status).toBe(200);
    const insert = h.state.calls.find((c) => c.table === 'gift_pledges' && c.method === 'insert');
    expect((insert!.args[0] as Record<string, unknown>).item_id).toBeNull();
  });
});

describe('PATCH /api/gift-pledges — the thank-you ledger stamp', () => {
  it('401 without a session', async () => {
    const res = await PATCH(bodyReq('PATCH', { id: 'pledge-1', thanked: true }));
    expect(res.status).toBe(401);
  });

  it('400 when thanked is missing', async () => {
    h.state.session = { user: { email: 'host@example.test' } };
    const res = await PATCH(bodyReq('PATCH', { id: 'pledge-1' }));
    expect(res.status).toBe(400);
  });

  it('404 when the pledge does not exist', async () => {
    h.state.session = { user: { email: 'host@example.test' } };
    h.state.pledgeSingle = null;
    const res = await PATCH(bodyReq('PATCH', { id: 'pledge-1', thanked: true }));
    expect(res.status).toBe(404);
  });

  it('403 when the caller does not own the site', async () => {
    h.state.session = { user: { email: 'stranger@example.test' } };
    h.state.pledgeSingle = { site_id: 'site-uuid-1' };
    h.state.siteRow = { creator_email: 'host@example.test' };
    const res = await PATCH(bodyReq('PATCH', { id: 'pledge-1', thanked: true }));
    expect(res.status).toBe(403);

    // No write reached the table.
    const updates = h.state.calls.filter((c) => c.table === 'gift_pledges' && c.method === 'update');
    expect(updates).toHaveLength(0);
  });

  it('owner sets thanked_at; thanked:false clears it', async () => {
    h.state.session = { user: { email: 'Host@Example.Test' } };
    h.state.pledgeSingle = { site_id: 'site-uuid-1' };
    h.state.siteRow = { creator_email: 'host@example.test' };

    const set = await PATCH(bodyReq('PATCH', { id: 'pledge-1', thanked: true }));
    expect(set.status).toBe(200);
    const setJson = await set.json();
    expect(setJson.ok).toBe(true);
    expect(typeof setJson.thankedAt).toBe('string');
    const setUpdate = h.state.calls.find((c) => c.table === 'gift_pledges' && c.method === 'update');
    expect((setUpdate!.args[0] as Record<string, unknown>).thanked_at).toBe(setJson.thankedAt);

    h.state.calls = [];
    const unset = await PATCH(bodyReq('PATCH', { id: 'pledge-1', thanked: false }));
    expect(unset.status).toBe(200);
    const unsetJson = await unset.json();
    expect(unsetJson.thankedAt).toBeNull();
    const unsetUpdate = h.state.calls.find((c) => c.table === 'gift_pledges' && c.method === 'update');
    expect((unsetUpdate!.args[0] as Record<string, unknown>).thanked_at).toBeNull();
  });
});
