// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/invite/guest/route.test.ts
//
// Confirms the third Studio "Active focus" thread:
//   "Send overlay reaches /api/invite/guest and stamps
//    email_sent_at in the DB."
//
// The Studio e2e specs already cover the frontend → API call
// (see e2e/specs/studio.spec.ts). What they can't cover — because
// they mock the route — is what the route does on its own once a
// real call lands. This file fills that gap with a route-handler
// unit test that pins down:
//   • auth gating (401 / 403)
//   • input validation (400)
//   • site lookup (404)
//   • the email_sent_at stamp on every successful send
//   • the {sent, failed} accounting
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ─── Hoisted mocks (must come before importing the route) ───
//
// vitest's `vi.mock` calls are hoisted to the top of the file
// regardless of where they appear in source. We pull the mocks'
// internal handles out of `vi.hoisted(...)` so individual tests
// can reach in and set return values.

const h = vi.hoisted(() => {
  // Each table call returns a fresh chainable that records
  // the path so we can assert on it. Whichever terminal verb
  // the route invokes (.maybeSingle, .upsert, .update, etc.)
  // resolves with whatever the test queued up via `__queue`.
  type Queued = { value: unknown; isError?: boolean };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    const verbs = ['select', 'eq', 'in', 'update', 'upsert', 'maybeSingle'];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        // Terminal verbs resolve a Promise; non-terminal verbs
        // return the chain so the next verb can be invoked.
        if (verb === 'maybeSingle') {
          const q = queues[`${table}.maybeSingle`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
          );
        }
        if (verb === 'upsert') {
          const q = queues[`${table}.upsert`]?.shift();
          return Promise.resolve(
            q?.isError ? { error: q.value } : { error: null },
          );
        }
        if (verb === 'update') {
          // .update().eq() pattern — return a thenable that the
          // route awaits AND a chain so .eq still works.
          const updateChain = makeChain(table);
          // The .eq after update is what actually awaits.
          (updateChain as { eq: (...a: unknown[]) => Promise<unknown> }).eq = (...a: unknown[]) => {
            calls.push({ table, method: 'update.eq', args: a });
            const q = queues[`${table}.update.eq`]?.shift();
            return Promise.resolve(
              q?.isError ? { error: q.value } : { error: null },
            );
          };
          return updateChain;
        }
        // .select().eq().eq() / .select().eq().in() — the second
        // .eq or .in is the terminal awaited Promise for guests.
        if ((verb === 'eq' || verb === 'in') && table === 'guests') {
          const queueKey = `${table}.list`;
          if (queues[queueKey]?.length) {
            const q = queues[queueKey]!.shift()!;
            // This .eq/.in might still be chained further, so
            // return a thenable chain — Promise.then makes the
            // route's `await` resolve, but extra chained calls
            // are swallowed harmlessly by the chainable.
            const next = makeChain(table);
            (next as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
              Promise.resolve(
                q.isError ? { data: null, error: q.value } : { data: q.value, error: null },
              ).then(resolve);
            return next;
          }
        }
        return chain;
      };
    }
    return chain;
  }

  const supabaseMock = {
    from: (table: string) => makeChain(table),
  };

  const sessionMock: { value: unknown } = { value: { user: { email: 'owner@example.test' } } };
  const siteConfigMock: { value: unknown } = { value: null };

  return {
    queues,
    calls,
    supabaseMock,
    sessionMock,
    siteConfigMock,
    resendSendMock: vi.fn(async () => ({ error: null })) as Mock,
    queue(key: string, value: unknown, isError?: boolean) {
      queues[key] = queues[key] || [];
      queues[key].push({ value, isError });
    },
    reset() {
      Object.keys(queues).forEach((k) => delete queues[k]);
      calls.length = 0;
      sessionMock.value = { user: { email: 'owner@example.test' } };
      siteConfigMock.value = null;
    },
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => h.supabaseMock,
}));

/* The send endpoint rate-limits per session email (3 bursts/min);
   every test here shares owner@example.test, so the real limiter
   would 429 from the fourth test on. Always-allow keeps these
   tests focused on send behavior. */
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true }),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => h.sessionMock.value),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db', () => ({
  getSiteConfig: vi.fn(async () => h.siteConfigMock.value),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: h.resendSendMock };
  },
}));

// ─── Test setup ───

import { POST } from './route';
import { NextRequest } from 'next/server';

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/invite/guest', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/invite/guest', () => {
  beforeEach(() => {
    h.reset();
    h.resendSendMock.mockClear();
    h.resendSendMock.mockImplementation(async () => ({ error: null }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pearloom.test';
  });

  it('returns 401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await POST(makePost({ subdomain: 'demo' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when subdomain is missing', async () => {
    h.siteConfigMock.value = { manifest: {}, names: ['Alice', 'Bob'] };
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 when site is not found in getSiteConfig', async () => {
    h.siteConfigMock.value = null;
    const res = await POST(makePost({ subdomain: 'missing' }));
    expect(res.status).toBe(404);
  });

  it('returns 403 when session email does not match site owner', async () => {
    h.siteConfigMock.value = { manifest: {}, names: ['Alice', 'Bob'] };
    h.queue('sites.maybeSingle', {
      id: 'site-1',
      site_config: { creator_email: 'someone-else@example.test' },
    });
    const res = await POST(makePost({ subdomain: 'demo' }));
    expect(res.status).toBe(403);
  });

  it('matches owner case-insensitively', async () => {
    h.sessionMock.value = { user: { email: 'Owner@Example.TEST' } };
    h.siteConfigMock.value = { manifest: {}, names: ['Alice', 'Bob'] };
    h.queue('sites.maybeSingle', {
      id: 'site-1',
      site_config: { creator_email: 'owner@example.test' },
    });
    h.queue('guests.list', []);
    const res = await POST(makePost({ subdomain: 'demo' }));
    // Owner check passes; empty guest list → {sent:0, failed:0}.
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ sent: 0, failed: 0, tokens: [] });
  });

  it('stamps email_sent_at on guests after successful sends', async () => {
    h.siteConfigMock.value = { manifest: { occasion: 'wedding' }, names: ['Alice', 'Bob'] };
    h.queue('sites.maybeSingle', {
      id: 'site-1',
      site_config: { creator_email: 'owner@example.test' },
    });
    h.queue('guests.list', [
      { id: 'guest-a', name: 'Alice Guest', email: 'a@example.test' },
      { id: 'guest-b', name: 'Bob Guest', email: 'b@example.test' },
    ]);
    // invite_tokens upserts and the post-send updates all succeed.
    h.queue('invite_tokens.upsert', null);
    h.queue('invite_tokens.upsert', null);
    h.queue('guests.update.eq', null);
    h.queue('guests.update.eq', null);

    const res = await POST(makePost({ subdomain: 'demo' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(2);
    expect(json.failed).toBe(0);
    expect(json.tokens).toHaveLength(2);

    // Resend was called once per guest with the right metadata.
    expect(h.resendSendMock).toHaveBeenCalledTimes(2);
    const calls = h.resendSendMock.mock.calls;
    expect(calls[0][0]).toMatchObject({ to: 'a@example.test' });
    expect(calls[1][0]).toMatchObject({ to: 'b@example.test' });

    // Each successful send was followed by an update on the
    // guests row keyed by id, with email_sent_at as an ISO date.
    const updateCalls = h.calls.filter(
      (c) => c.table === 'guests' && c.method === 'update',
    );
    expect(updateCalls).toHaveLength(2);
    for (const u of updateCalls) {
      const payload = u.args[0] as { email_sent_at: string };
      expect(payload).toHaveProperty('email_sent_at');
      // ISO 8601 sanity-check.
      expect(() => new Date(payload.email_sent_at)).not.toThrow();
      expect(Number.isFinite(new Date(payload.email_sent_at).getTime())).toBe(true);
    }
    // And the .eq narrowed each update to the right guest id.
    const updateEqCalls = h.calls.filter(
      (c) => c.table === 'guests' && c.method === 'update.eq',
    );
    expect(updateEqCalls).toHaveLength(2);
    expect(updateEqCalls.map((c) => c.args[1]).sort()).toEqual(['guest-a', 'guest-b']);
  });

  it('does NOT stamp email_sent_at when the Resend send fails', async () => {
    h.siteConfigMock.value = { manifest: { occasion: 'wedding' }, names: ['Alice', 'Bob'] };
    h.queue('sites.maybeSingle', {
      id: 'site-1',
      site_config: { creator_email: 'owner@example.test' },
    });
    h.queue('guests.list', [{ id: 'guest-a', name: 'Alice', email: 'a@example.test' }]);
    h.queue('invite_tokens.upsert', null);
    h.resendSendMock.mockImplementationOnce(async () => ({ error: { message: 'rejected' } }));

    const res = await POST(makePost({ subdomain: 'demo' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(0);
    expect(json.failed).toBe(1);

    // Critical: no update fired, since the email failed.
    const updateCalls = h.calls.filter(
      (c) => c.table === 'guests' && (c.method === 'update' || c.method === 'update.eq'),
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('skips guests with no email and counts them separately (not as failures)', async () => {
    h.siteConfigMock.value = { manifest: {}, names: ['Alice', 'Bob'] };
    h.queue('sites.maybeSingle', {
      id: 'site-1',
      site_config: { creator_email: 'owner@example.test' },
    });
    h.queue('guests.list', [
      { id: 'no-email', name: 'Carlos', email: null, address: '1 St' },
    ]);

    const res = await POST(makePost({ subdomain: 'demo' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(0);
    expect(json.failed).toBe(0);
    expect(json.noEmail).toBe(1);
    // Resend was never called.
    expect(h.resendSendMock).not.toHaveBeenCalled();
  });

  it('uses the std subject line when stationeryType is "std"', async () => {
    h.siteConfigMock.value = { manifest: { occasion: 'wedding' }, names: ['Alice', 'Bob'] };
    h.queue('sites.maybeSingle', {
      id: 'site-1',
      site_config: { creator_email: 'owner@example.test' },
    });
    h.queue('guests.list', [{ id: 'g1', name: 'A', email: 'a@example.test' }]);
    h.queue('invite_tokens.upsert', null);
    h.queue('guests.update.eq', null);

    await POST(makePost({ subdomain: 'demo', stationeryType: 'std' }));
    const sendArg = h.resendSendMock.mock.calls[0][0] as { subject: string; tags: { name: string; value: string }[] };
    expect(sendArg.subject).toMatch(/^Save the date/);
    // The channel tag carries the ACTUAL card type so the Resend
    // webhook + dashboard distinguish save-the-dates from invites.
    expect(sendArg.tags.find((t) => t.name === 'channel')?.value).toBe('std');
  });

  it('returns 503 when RESEND_API_KEY is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    h.siteConfigMock.value = { manifest: {}, names: ['Alice', 'Bob'] };
    h.queue('sites.maybeSingle', {
      id: 'site-1',
      site_config: { creator_email: 'owner@example.test' },
    });
    h.queue('guests.list', [{ id: 'g1', name: 'A', email: 'a@example.test' }]);

    const res = await POST(makePost({ subdomain: 'demo' }));
    expect(res.status).toBe(503);
  });
});
