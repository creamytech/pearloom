// ─────────────────────────────────────────────────────────────
// Pearloom / api/registry-link-claims/route.test.ts
//
// The thank-you ledger stamp on link-out claims. Pins the new
// PATCH contract: 401 anon · 400 bad body · 404 unknown claim ·
// 403 non-owner · owner sets/unsets thanked_at.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    session: null as null | { user: { email: string } },
    /** sites .maybeSingle() result. */
    siteRow: null as unknown,
    /** registry_link_claims .maybeSingle() result. */
    claimSingle: null as unknown,
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
    c.eq = (...args: unknown[]) => {
      state.calls.push({ table, method: isUpdate ? 'update.eq' : 'eq', args });
      if (isUpdate) return Promise.resolve({ data: null, error: state.updateError });
      return c;
    };
    c.maybeSingle = () => {
      state.calls.push({ table, method: 'maybeSingle', args: [] });
      return Promise.resolve({
        data: table === 'sites' ? state.siteRow : state.claimSingle,
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
      state.claimSingle = null;
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

import { PATCH } from './route';
import { NextRequest } from 'next/server';

function patchReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/registry-link-claims', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  h.reset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

describe('PATCH /api/registry-link-claims — the thank-you stamp', () => {
  it('401 without a session', async () => {
    const res = await PATCH(patchReq({ id: 'claim-1', thanked: true }));
    expect(res.status).toBe(401);
  });

  it('400 when id or thanked is missing', async () => {
    h.state.session = { user: { email: 'host@example.test' } };
    expect((await PATCH(patchReq({ thanked: true }))).status).toBe(400);
    expect((await PATCH(patchReq({ id: 'claim-1' }))).status).toBe(400);
  });

  it('404 when the claim does not exist', async () => {
    h.state.session = { user: { email: 'host@example.test' } };
    h.state.claimSingle = null;
    const res = await PATCH(patchReq({ id: 'claim-1', thanked: true }));
    expect(res.status).toBe(404);
  });

  it('403 when the caller does not own the site', async () => {
    h.state.session = { user: { email: 'stranger@example.test' } };
    h.state.claimSingle = { site_id: 'site-uuid-1' };
    h.state.siteRow = { creator_email: 'host@example.test' };
    const res = await PATCH(patchReq({ id: 'claim-1', thanked: true }));
    expect(res.status).toBe(403);

    const updates = h.state.calls.filter((c) => c.table === 'registry_link_claims' && c.method === 'update');
    expect(updates).toHaveLength(0);
  });

  it('owner sets thanked_at; thanked:false clears it', async () => {
    h.state.session = { user: { email: 'host@example.test' } };
    h.state.claimSingle = { site_id: 'site-uuid-1' };
    h.state.siteRow = { creator_email: 'host@example.test' };

    const set = await PATCH(patchReq({ id: 'claim-1', thanked: true }));
    expect(set.status).toBe(200);
    const setJson = await set.json();
    expect(setJson.ok).toBe(true);
    expect(typeof setJson.thankedAt).toBe('string');
    const setUpdate = h.state.calls.find((c) => c.table === 'registry_link_claims' && c.method === 'update');
    expect((setUpdate!.args[0] as Record<string, unknown>).thanked_at).toBe(setJson.thankedAt);

    h.state.calls = [];
    const unset = await PATCH(patchReq({ id: 'claim-1', thanked: false }));
    expect(unset.status).toBe(200);
    expect((await unset.json()).thankedAt).toBeNull();
    const unsetUpdate = h.state.calls.find((c) => c.table === 'registry_link_claims' && c.method === 'update');
    expect((unsetUpdate!.args[0] as Record<string, unknown>).thanked_at).toBeNull();
  });
});
