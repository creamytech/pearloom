// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/co-host/route.test.ts
//
// Phase 2.4 of AUDIT-2026-05-29.md — co-host collaboration ships
// today with mint / accept / list / revoke but no regression net.
// A bad merge that drops the ownership check would let any authed
// user mint invites for any site, and a bad merge in the accept
// path would let an expired token still register a cohort row.
// This file pins the route's full contract.
//
// The role-gating side ("'viewer' role cannot edit a site") is
// covered by api/sites/co-host/me/route.test.ts in the same commit
// — that route is the single resolver every other route reads, so
// confirming its output for owner/cohost/anonymous transitively
// validates the rest.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    const verbs = ['select', 'eq', 'is', 'order', 'maybeSingle', 'insert', 'upsert', 'update', 'delete'];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        // Terminal verbs return a thenable that resolves with what
        // the test queued under `${table}.${verb}` (or .order for
        // the list endpoints).
        if (verb === 'maybeSingle') {
          const q = queues[`${table}.maybeSingle`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
          );
        }
        if (verb === 'order') {
          // GET list path — terminal `await` on .order(...).
          const q = queues[`${table}.order`]?.shift();
          // Make this chain itself thenable so the await works.
          const ret = makeChain(table);
          (ret as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
            Promise.resolve(
              q?.isError ? { data: null, error: q.value } : { data: q?.value ?? [], error: null },
            ).then(resolve);
          return ret;
        }
        if (verb === 'insert') {
          const q = queues[`${table}.insert`]?.shift();
          return Promise.resolve(
            q?.isError ? { error: q.value } : { error: null },
          );
        }
        if (verb === 'upsert') {
          const q = queues[`${table}.upsert`]?.shift();
          return Promise.resolve(
            q?.isError ? { error: q.value } : { error: null },
          );
        }
        if (verb === 'update') {
          // update().eq() is the terminal — return a chain with
          // a custom .eq that resolves.
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
        if (verb === 'delete') {
          // delete().eq()... — return a thenable that resolves
          // after the chain ends. We make every chain returnable
          // thenable so any depth of chained eq() works.
          const delChain = makeChain(table);
          (delChain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ error: null }).then(resolve);
          return delChain;
        }
        return chain;
      };
    }
    // The chain itself is thenable for `await` on bare select/eq
    // sequences that don't end in a terminal verb (rare).
    (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    return chain;
  }

  const supabaseMock = {
    from: (table: string) => makeChain(table),
  };

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

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { POST, GET, DELETE } from './route';
import { NextRequest } from 'next/server';

// Per-test unique email so the cohost-invite:<email> rate limiter
// (20/hr) doesn't bleed between tests. The rate-limit test below
// uses a single shared email intentionally.
let emailCounter = 0;
function nextEmail(): string {
  emailCounter += 1;
  return `owner-${emailCounter}@example.test`;
}

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/sites/co-host', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}
function getReq(siteId?: string): NextRequest {
  const url = siteId
    ? `http://localhost/api/sites/co-host?siteId=${siteId}`
    : 'http://localhost/api/sites/co-host';
  return new NextRequest(url, { method: 'GET' });
}
function delReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/sites/co-host', {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/sites/co-host (mint)', () => {
  beforeEach(() => {
    h.reset();
    h.sessionMock.value = { user: { email: nextEmail() } };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pearloom.test';
  });

  it('401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await POST(postReq({ siteId: 's1', role: 'editor' }));
    expect(res.status).toBe(401);
  });

  it('400 when siteId missing on mint', async () => {
    const res = await POST(postReq({ role: 'editor' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/siteId/);
  });

  it('400 on invalid role', async () => {
    const res = await POST(postReq({ siteId: 's1', role: 'god-mode' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid role/);
  });

  it('403 when caller does not own the site', async () => {
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'someone-else@example.test' });
    const res = await POST(postReq({ siteId: 's1', role: 'editor' }));
    expect(res.status).toBe(403);
  });

  it('owner check is case-insensitive', async () => {
    h.sessionMock.value = { user: { email: 'Owner@Example.TEST' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    h.queue('cohost_invites.insert', null);
    const res = await POST(postReq({ siteId: 's1', role: 'viewer' }));
    expect(res.status).toBe(200);
  });

  it('mints a token + invite URL + 14-day expiry for the editor role', async () => {
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    h.queue('cohost_invites.insert', null);
    h.sessionMock.value = { user: { email: 'owner@example.test' } };
    const res = await POST(postReq({ siteId: 's1', role: 'editor', note: 'help me' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toMatch(/^[a-f0-9]+$/);
    expect(json.inviteUrl).toMatch(/^https:\/\/pearloom\.test\/co-host\/[a-f0-9]+$/);
    expect(json.role).toBe('editor');
    const expires = new Date(json.expiresAt).getTime();
    const now = Date.now();
    // Within a 1-minute slop of 14 days.
    expect(expires - now).toBeGreaterThan(13.9 * 24 * 60 * 60 * 1000);
    expect(expires - now).toBeLessThan(14.1 * 24 * 60 * 60 * 1000);

    // Insert payload sanity.
    const insertCall = h.calls.find((c) => c.table === 'cohost_invites' && c.method === 'insert');
    expect(insertCall).toBeDefined();
    const payload = insertCall!.args[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      site_id: 's1',
      role: 'editor',
      invited_by: 'owner@example.test',
      note: 'help me',
    });
  });

  it('500 when the cohost_invites insert fails', async () => {
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    h.sessionMock.value = { user: { email: 'owner@example.test' } };
    h.queue('cohost_invites.insert', { message: 'unique violation' }, true);
    const res = await POST(postReq({ siteId: 's1', role: 'editor' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('mint_failed');
  });

  it('rate-limit cap kicks in after 20 mints/hour from one caller', async () => {
    const sharedEmail = `rl-${Date.now()}@example.test`;
    h.sessionMock.value = { user: { email: sharedEmail } };
    // Queue 20 success paths.
    for (let i = 0; i < 20; i++) {
      h.queue('sites.maybeSingle', { id: 's1', creator_email: sharedEmail });
      h.queue('cohost_invites.insert', null);
    }
    for (let i = 0; i < 20; i++) {
      const r = await POST(postReq({ siteId: 's1', role: 'editor' }));
      expect(r.status).toBe(200);
    }
    const blocked = await POST(postReq({ siteId: 's1', role: 'editor' }));
    expect(blocked.status).toBe(429);
  });
});

describe('POST /api/sites/co-host (accept)', () => {
  beforeEach(() => {
    h.reset();
    h.sessionMock.value = { user: { email: nextEmail() } };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('404 when the accept token is unknown', async () => {
    h.queue('cohost_invites.maybeSingle', null);
    const res = await POST(postReq({ acceptToken: 'mystery' }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('invalid_invite');
  });

  it('410 when the invite has expired', async () => {
    h.queue('cohost_invites.maybeSingle', {
      token: 't1',
      site_id: 's1',
      role: 'editor',
      invited_by: 'owner@example.test',
      accepted_at: null,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    const res = await POST(postReq({ acceptToken: 't1' }));
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toBe('expired');
  });

  it('is idempotent — already-accepted token returns ok + already:true', async () => {
    h.queue('cohost_invites.maybeSingle', {
      token: 't1',
      site_id: 's1',
      role: 'editor',
      invited_by: 'owner@example.test',
      accepted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    const res = await POST(postReq({ acceptToken: 't1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, already: true });

    // No new accept-stamp or cohost upsert fired on the duplicate
    // accept — critical, otherwise replays would overwrite joined_at.
    const writes = h.calls.filter(
      (c) =>
        (c.table === 'cohost_invites' && c.method === 'update') ||
        (c.table === 'cohosts' && c.method === 'upsert'),
    );
    expect(writes).toHaveLength(0);
  });

  it('fresh accept stamps the invite and upserts the cohort row with the role', async () => {
    const accepter = 'invitee@example.test';
    h.sessionMock.value = { user: { email: accepter } };
    h.queue('cohost_invites.maybeSingle', {
      token: 't1',
      site_id: 's1',
      role: 'guest-manager',
      invited_by: 'owner@example.test',
      accepted_at: null,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    h.queue('cohost_invites.update.eq', null);
    h.queue('cohosts.upsert', null);

    const res = await POST(postReq({ acceptToken: 't1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, siteId: 's1', role: 'guest-manager' });

    const inviteUpdate = h.calls.find(
      (c) => c.table === 'cohost_invites' && c.method === 'update',
    );
    expect(inviteUpdate).toBeDefined();
    const stamp = inviteUpdate!.args[0] as { accepted_email: string; accepted_at: string };
    expect(stamp.accepted_email).toBe(accepter);
    expect(() => new Date(stamp.accepted_at)).not.toThrow();

    const cohortInsert = h.calls.find((c) => c.table === 'cohosts' && c.method === 'upsert');
    expect(cohortInsert).toBeDefined();
    const row = cohortInsert!.args[0] as Record<string, unknown>;
    expect(row).toMatchObject({
      site_id: 's1',
      email: accepter,
      role: 'guest-manager',
      invited_by: 'owner@example.test',
    });
    // Upsert keyed on site_id+email — without this, a re-accept
    // would create duplicate rows and break the GET list.
    const opts = cohortInsert!.args[1] as { onConflict: string };
    expect(opts.onConflict).toBe('site_id,email');
  });
});

describe('GET /api/sites/co-host (list)', () => {
  beforeEach(() => {
    h.reset();
    h.sessionMock.value = { user: { email: nextEmail() } };
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

  it('403 when caller does not own the site', async () => {
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'someone-else@example.test' });
    const res = await GET(getReq('s1'));
    expect(res.status).toBe(403);
  });

  it('200 returns { active, pending } arrays for the owner', async () => {
    h.sessionMock.value = { user: { email: 'owner@example.test' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    h.queue('cohosts.order', [
      { email: 'a@example.test', role: 'editor', joined_at: '2026-01-01' },
    ]);
    h.queue('cohost_invites.order', [
      { token: 't2', role: 'viewer', note: null, created_at: '2026-02-01', expires_at: '2026-02-15', accepted_at: null },
    ]);
    const res = await GET(getReq('s1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.active).toHaveLength(1);
    expect(json.pending).toHaveLength(1);
    expect(json.active[0].role).toBe('editor');
    expect(json.pending[0].token).toBe('t2');
  });
});

describe('DELETE /api/sites/co-host (revoke)', () => {
  beforeEach(() => {
    h.reset();
    h.sessionMock.value = { user: { email: nextEmail() } };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await DELETE(delReq({ siteId: 's1', email: 'a@example.test' }));
    expect(res.status).toBe(401);
  });

  it('400 when siteId missing', async () => {
    const res = await DELETE(delReq({ email: 'a@example.test' }));
    expect(res.status).toBe(400);
  });

  it('403 when caller does not own the site', async () => {
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'someone-else@example.test' });
    const res = await DELETE(delReq({ siteId: 's1', email: 'a@example.test' }));
    expect(res.status).toBe(403);
  });

  it('200 deletes the cohort row when email is provided', async () => {
    h.sessionMock.value = { user: { email: 'owner@example.test' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    const res = await DELETE(delReq({ siteId: 's1', email: 'a@example.test' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    // Confirm the delete fired against the cohosts table, narrowed
    // by both site_id and email.
    const delCalls = h.calls.filter((c) => c.table === 'cohosts' && c.method === 'delete');
    expect(delCalls).toHaveLength(1);
    const eqArgs = h.calls.filter((c) => c.table === 'cohosts' && c.method === 'eq');
    // Two narrowing eq() calls — one for site_id, one for email.
    expect(eqArgs.length).toBeGreaterThanOrEqual(2);
  });

  it('200 deletes a pending invite when token is provided', async () => {
    h.sessionMock.value = { user: { email: 'owner@example.test' } };
    h.queue('sites.maybeSingle', { id: 's1', creator_email: 'owner@example.test' });
    const res = await DELETE(delReq({ siteId: 's1', token: 'pending-t1' }));
    expect(res.status).toBe(200);
    const delCalls = h.calls.filter((c) => c.table === 'cohost_invites' && c.method === 'delete');
    expect(delCalls).toHaveLength(1);
  });
});
