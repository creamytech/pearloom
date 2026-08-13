// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/co-host/me/route.test.ts
//
// Companion to co-host/route.test.ts (Phase 2.4). This route is
// the SINGLE source of truth for "what can this user do on this
// site?" — every gated client surface (editor publish button,
// settings page, billing tab) reads it. If it ever returns the
// wrong role (or null when it shouldn't), the entire role-gating
// system silently fails open.
//
// Cases:
//   • 200 { role: null } when no session (intentional — clients
//     treat this as "not signed in" without surfacing 401 noise)
//   • 400 when neither siteId nor subdomain provided
//   • 200 { role: 'owner' } when caller created the site
//   • Owner check is case-insensitive (IdP casing drift)
//   • 200 { role: <cohort role> } when caller is in cohosts table
//   • 200 { role: null } when caller is signed in but neither owner
//     nor cohort — i.e., they're a random visitor, can't edit
//   • 200 { role: null } when the site doesn't exist
//   • subdomain query path resolves the same way as siteId
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    const verbs = ['select', 'eq', 'maybeSingle'];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        if (verb === 'maybeSingle') {
          const q = queues[`${table}.maybeSingle`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
          );
        }
        return chain;
      };
    }
    return chain;
  }

  const supabaseMock = { from: (table: string) => makeChain(table) };
  const sessionMock: { value: unknown } = { value: { user: { email: 'owner@example.test' } } };

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

function getReq(params: { siteId?: string; subdomain?: string } = {}): NextRequest {
  const url = new URL('http://localhost/api/sites/co-host/me');
  if (params.siteId) url.searchParams.set('siteId', params.siteId);
  if (params.subdomain) url.searchParams.set('subdomain', params.subdomain);
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/sites/co-host/me', () => {
  beforeEach(() => {
    h.reset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('returns { role: null } (200) when there is no session', async () => {
    h.sessionMock.value = null;
    const res = await GET(getReq({ siteId: 's1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ role: null });
  });

  it('400 when neither siteId nor subdomain is provided', async () => {
    const res = await GET(getReq({}));
    expect(res.status).toBe(400);
  });

  it('returns { role: "owner", siteId } when caller created the site', async () => {
    h.sessionMock.value = { user: { email: 'owner@example.test' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    const res = await GET(getReq({ siteId: 's1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ role: 'owner', siteId: 's1' });

    // Critical: when caller is owner we MUST skip the cohosts
    // lookup — otherwise a cohort with role=viewer for the owner
    // (legacy data?) would downgrade them silently.
    const cohostQueries = h.calls.filter((c) => c.table === 'cohosts');
    expect(cohostQueries).toHaveLength(0);
  });

  it('owner check is case-insensitive', async () => {
    h.sessionMock.value = { user: { email: 'Owner@Example.TEST' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    const res = await GET(getReq({ siteId: 's1' }));
    const json = await res.json();
    expect(json.role).toBe('owner');
  });

  it('returns { role: <cohort role> } when caller is in cohosts but not owner', async () => {
    h.sessionMock.value = { user: { email: 'editor@example.test' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    h.queue('cohosts.maybeSingle', { role: 'editor' });
    const res = await GET(getReq({ siteId: 's1' }));
    const json = await res.json();
    expect(json).toEqual({ role: 'editor', siteId: 's1' });
  });

  it('preserves viewer role exactly (no upgrade to editor)', async () => {
    // The regression to prevent: a typo that maps 'viewer' to
    // 'editor' or vice versa would silently grant edit access.
    h.sessionMock.value = { user: { email: 'viewer@example.test' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    h.queue('cohosts.maybeSingle', { role: 'viewer' });
    const res = await GET(getReq({ siteId: 's1' }));
    const json = await res.json();
    expect(json.role).toBe('viewer');
  });

  it('returns { role: null, siteId } when caller is signed in but not a cohort', async () => {
    h.sessionMock.value = { user: { email: 'random@example.test' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    h.queue('cohosts.maybeSingle', null);
    const res = await GET(getReq({ siteId: 's1' }));
    const json = await res.json();
    expect(json).toEqual({ role: null, siteId: 's1' });
  });

  it('returns { role: null } (200) when the site does not exist', async () => {
    h.queue('sites.maybeSingle', null);
    const res = await GET(getReq({ siteId: 'does-not-exist' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ role: null });
  });

  it('resolves by subdomain when siteId is absent', async () => {
    h.sessionMock.value = { user: { email: 'owner@example.test' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    const res = await GET(getReq({ subdomain: 'emma-and-james' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.role).toBe('owner');
    // Confirm the lookup column flipped to 'subdomain'.
    const eq = h.calls.find((c) => c.table === 'sites' && c.method === 'eq');
    expect(eq?.args[0]).toBe('subdomain');
    expect(eq?.args[1]).toBe('emma-and-james');
  });
});
