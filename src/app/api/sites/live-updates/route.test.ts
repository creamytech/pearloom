// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/live-updates/route.test.ts
//
// Phase 2.5 of AUDIT-2026-05-29.md — day-of broadcast is one of
// the six "money flows" with zero regression coverage. Live updates
// ship today with email fan-out, a 3/24h cap, and per-guest CTA
// links resolved from guest_token — all gated on owner-of-site.
// A regression in any of those could spam guest inboxes, leak
// names across sites, or silently drop the cap.
//
// This file pins the route's full POST contract + the GET path's
// graceful-degradation behavior. The mock pattern extends the
// chainable used in co-host/route.test.ts with .gte() (for the
// cap window query), .not() (for the "email IS NOT NULL" filter),
// and head-only count selects.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean; count?: number };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    // Verbs the live-updates route actually uses, plus the
    // terminal `not()` for "email IS NOT NULL".
    const verbs = ['select', 'eq', 'gte', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'not'];
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
          // GET list path — terminal on `.limit(N)`.
          const q = queues[`${table}.limit`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? [], error: null },
          );
        }
        if (verb === 'gte') {
          // Cap window query — `.select(... head: true).eq().gte()`
          // resolves with { count } from the head-mode select.
          const q = queues[`${table}.gte`]?.shift();
          return Promise.resolve({ count: q?.count ?? 0, error: null });
        }
        if (verb === 'not') {
          // Attending-guests query — `.select().eq().eq().not()`.
          const q = queues[`${table}.not`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? [], error: null },
          );
        }
        if (verb === 'insert') {
          // live_updates insert is chained `.insert([...]).select().single()`.
          // Stash the inserted row so the next single() resolves with it.
          const inserted = (args[0] as unknown[])[0] as Record<string, unknown>;
          const q = queues[`${table}.insert`]?.shift();
          if (q?.isError) {
            // Make subsequent .select().single() return the error.
            queues[`${table}.single`] = queues[`${table}.single`] || [];
            queues[`${table}.single`].unshift({ value: q.value, isError: true });
          } else {
            queues[`${table}.single`] = queues[`${table}.single`] || [];
            queues[`${table}.single`].unshift({
              value: q?.value ?? { id: 'lu-1', ...inserted, created_at: new Date().toISOString() },
            });
          }
          return chain;
        }
        if (verb === 'update') {
          // update(...).eq(...) — return a thenable chain so .eq
          // resolves the await.
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

  const sessionMock: { value: unknown } = { value: { user: { email: 'owner@example.test' } } };

  return {
    queues,
    calls,
    supabaseMock,
    sessionMock,
    resendSendMock: vi.fn(async () => ({ error: null })) as Mock,
    queue(key: string, value: unknown, opts: { isError?: boolean; count?: number } = {}) {
      queues[key] = queues[key] || [];
      queues[key].push({ value, isError: opts.isError, count: opts.count });
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

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: h.resendSendMock };
  },
}));

import { POST, GET } from './route';
import { NextRequest } from 'next/server';

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/sites/live-updates', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}
function getReq(subdomain?: string): NextRequest {
  const url = subdomain
    ? `http://localhost/api/sites/live-updates?subdomain=${subdomain}`
    : 'http://localhost/api/sites/live-updates';
  return new NextRequest(url, { method: 'GET' });
}

describe('POST /api/sites/live-updates — validation + ownership', () => {
  beforeEach(() => {
    h.reset();
    h.resendSendMock.mockClear();
    h.resendSendMock.mockImplementation(async () => ({ error: null }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.RESEND_API_KEY = 'test-resend';
    process.env.EMAIL_FROM = 'noreply@pearloom.test';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pearloom.test';
  });

  it('401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await POST(postReq({ subdomain: 'demo', message: 'hi' }));
    expect(res.status).toBe(401);
  });

  it('400 on invalid JSON body', async () => {
    const res = await POST(postReq('not-json'));
    expect(res.status).toBe(400);
  });

  it('400 when subdomain missing', async () => {
    const res = await POST(postReq({ message: 'hi' }));
    expect(res.status).toBe(400);
  });

  it('400 when message is empty or whitespace-only', async () => {
    const r1 = await POST(postReq({ subdomain: 'demo', message: '' }));
    expect(r1.status).toBe(400);
    const r2 = await POST(postReq({ subdomain: 'demo', message: '   ' }));
    expect(r2.status).toBe(400);
  });

  it('400 when message exceeds 500 characters', async () => {
    const res = await POST(postReq({ subdomain: 'demo', message: 'x'.repeat(501) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too long/i);
  });

  it('404 when the site is not found', async () => {
    h.queue('sites.single', { message: 'No rows', code: 'PGRST116' }, { isError: true });
    const res = await POST(postReq({ subdomain: 'missing', message: 'hi' }));
    expect(res.status).toBe(404);
  });

  it('403 when caller does not own the site', async () => {
    h.queue('sites.single', { creator_email: 'someone-else@example.test' });
    const res = await POST(postReq({ subdomain: 'demo', message: 'hi' }));
    expect(res.status).toBe(403);
  });

  it('owner check is case-insensitive', async () => {
    h.sessionMock.value = { user: { email: 'Owner@Example.TEST' } };
    h.queue('sites.single', { creator_email: 'owner@example.test' });
    // Insert succeeds, no email broadcast.
    h.queue('live_updates.insert', null);
    const res = await POST(postReq({ subdomain: 'demo', message: 'hi' }));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/sites/live-updates — happy path + type sanitization', () => {
  beforeEach(() => {
    h.reset();
    h.resendSendMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('200 inserts the update + trims message + defaults invalid type to "misc"', async () => {
    h.queue('sites.single', { creator_email: 'owner@example.test' });
    h.queue('live_updates.insert', null);
    const res = await POST(postReq({
      subdomain: 'demo',
      message: '   The first dance is now!   ',
      type: 'definitely-not-a-real-type',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Inserted payload: trimmed message + sanitized type.
    const ins = h.calls.find((c) => c.table === 'live_updates' && c.method === 'insert');
    const inserted = (ins!.args[0] as unknown[])[0] as Record<string, unknown>;
    expect(inserted.message).toBe('The first dance is now!');
    expect(inserted.type).toBe('misc');
    expect(inserted.subdomain).toBe('demo');
  });

  it('preserves valid types (ceremony / reception / cocktail / misc)', async () => {
    for (const type of ['ceremony', 'reception', 'cocktail', 'misc'] as const) {
      h.reset();
      h.queue('sites.single', { creator_email: 'owner@example.test' });
      h.queue('live_updates.insert', null);
      const res = await POST(postReq({ subdomain: 'demo', message: 'x', type }));
      expect(res.status).toBe(200);
      const ins = h.calls.find((c) => c.table === 'live_updates' && c.method === 'insert');
      const inserted = (ins!.args[0] as unknown[])[0] as Record<string, unknown>;
      expect(inserted.type).toBe(type);
    }
  });

  it('returns 500 with the Supabase error message on insert failure', async () => {
    h.queue('sites.single', { creator_email: 'owner@example.test' });
    h.queue('live_updates.insert', { message: 'unique_violation' }, { isError: true });
    const res = await POST(postReq({ subdomain: 'demo', message: 'hi' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('unique_violation');
  });
});

describe('POST /api/sites/live-updates — email broadcast', () => {
  beforeEach(() => {
    h.reset();
    h.resendSendMock.mockClear();
    h.resendSendMock.mockImplementation(async () => ({ error: null }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.RESEND_API_KEY = 'test-resend';
    process.env.EMAIL_FROM = 'noreply@pearloom.test';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pearloom.test';
  });

  it('enforces 3-per-24h cap — returns emailLimited:true when cap reached', async () => {
    h.queue('sites.single', { creator_email: 'owner@example.test' });
    h.queue('live_updates.insert', { id: 'lu-99', message: 'Late update', type: 'misc' });
    // Cap query: 3 emails already sent in the last 24h.
    h.queue('live_updates.gte', null, { count: 3 });

    const res = await POST(postReq({ subdomain: 'demo', message: 'Late update', email: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.emailedTo).toBe(0);
    expect(json.emailLimited).toBe(true);

    // CRITICAL: capped path must NOT fire Resend and must NOT
    // stamp email_broadcast_at (otherwise the cap window slides
    // forward and the host gets a smaller send window next time).
    expect(h.resendSendMock).not.toHaveBeenCalled();
    const stamps = h.calls.filter((c) => c.table === 'live_updates' && c.method === 'update');
    expect(stamps).toHaveLength(0);
  });

  it('stamps the audit row + count=0 when there are no attending recipients', async () => {
    h.queue('sites.single', { creator_email: 'owner@example.test' });
    h.queue('live_updates.insert', { id: 'lu-1', message: 'hi', type: 'misc' });
    h.queue('live_updates.gte', null, { count: 0 });
    // Site row for fan-out + empty guest list.
    h.queue('sites.maybeSingle', { id: 'site-1', ai_manifest: { names: ['Alice', 'Bob'] } });
    h.queue('guests.not', []);

    const res = await POST(postReq({ subdomain: 'demo', message: 'hi', email: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.emailedTo).toBe(0);
    expect(json.emailLimited).toBeFalsy();

    // No Resend, but the stamp DID fire — without it the cap would
    // never tick and a runaway loop could spam.
    expect(h.resendSendMock).not.toHaveBeenCalled();
    const stamp = h.calls.find((c) => c.table === 'live_updates' && c.method === 'update');
    expect(stamp).toBeDefined();
    const payload = stamp!.args[0] as Record<string, unknown>;
    expect(payload.email_recipient_count).toBe(0);
    expect(typeof payload.email_broadcast_at).toBe('string');
  });

  it('happy path: sends to attending guests with email, stamps audit row with sent count', async () => {
    h.queue('sites.single', { creator_email: 'owner@example.test' });
    h.queue('live_updates.insert', { id: 'lu-42', message: 'Cocktails!', type: 'cocktail' });
    h.queue('live_updates.gte', null, { count: 1 });  // under cap
    h.queue('sites.maybeSingle', { id: 'site-1', ai_manifest: { names: ['Emma', 'James'] } });
    h.queue('guests.not', [
      { id: 'g1', name: 'Alice', email: 'a@example.test', status: 'attending', guest_token: 'tok-a' },
      { id: 'g2', name: 'Bob',   email: 'b@example.test', status: 'attending', guest_token: null },
    ]);

    const res = await POST(postReq({ subdomain: 'demo', message: 'Cocktails!', type: 'cocktail', email: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.emailedTo).toBe(2);

    expect(h.resendSendMock).toHaveBeenCalledTimes(2);
    const sends = h.resendSendMock.mock.calls.map((c) => c[0] as {
      to: string;
      subject: string;
      html: string;
      tags: Array<{ name: string; value: string }>;
    });
    expect(sends.map((s) => s.to).sort()).toEqual(['a@example.test', 'b@example.test']);
    // Subject is keyed on couple name.
    expect(sends[0].subject).toMatch(/Emma & James/);

    // Per-guest CTA: guest with a token → /g/<token>, guest without →
    // /sites/<subdomain>. This is the regression that would silently
    // strip personalization from broadcasts.
    const aSend = sends.find((s) => s.to === 'a@example.test')!;
    expect(aSend.html).toMatch(/\/g\/tok-a/);
    const bSend = sends.find((s) => s.to === 'b@example.test')!;
    expect(bSend.html).toMatch(/\/sites\/demo/);

    // Resend tags include live_update_id so the webhook can
    // attribute opens / bounces back to the right post.
    const aTags = aSend.tags.reduce<Record<string, string>>((acc, t) => { acc[t.name] = t.value; return acc; }, {});
    expect(aTags.channel).toBe('broadcast');
    expect(aTags.live_update_id).toBe('lu-42');
    expect(aTags.guest_id).toBe('g1');

    // Audit stamp.
    const stamp = h.calls.find((c) => c.table === 'live_updates' && c.method === 'update');
    expect(stamp).toBeDefined();
    expect((stamp!.args[0] as { email_recipient_count: number }).email_recipient_count).toBe(2);
  });

  it('no email field on the request body = no email work at all (cap, recipients, send)', async () => {
    h.queue('sites.single', { creator_email: 'owner@example.test' });
    h.queue('live_updates.insert', null);
    const res = await POST(postReq({ subdomain: 'demo', message: 'silent post' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).not.toHaveProperty('emailedTo');
    expect(json).not.toHaveProperty('emailLimited');

    // Confirm we never touched the cap query, the guests table, or
    // Resend on the no-email path.
    expect(h.calls.find((c) => c.table === 'guests')).toBeUndefined();
    expect(h.calls.find((c) => c.method === 'gte')).toBeUndefined();
    expect(h.resendSendMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/sites/live-updates', () => {
  beforeEach(() => {
    h.reset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('400 when subdomain missing', async () => {
    const res = await GET(getReq(undefined));
    expect(res.status).toBe(400);
  });

  it('200 returns the update list', async () => {
    h.queue('live_updates.limit', [
      { id: 'lu-1', message: 'first', type: 'misc', created_at: '2026-06-01', photo_url: null, email_broadcast_at: null, email_recipient_count: null },
    ]);
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updates).toHaveLength(1);
    expect(json.updates[0].id).toBe('lu-1');
  });

  it('graceful: PGRST205 missing-table returns empty list + _error=unconfigured', async () => {
    h.queue('live_updates.limit', { code: 'PGRST205', message: 'not found' }, { isError: true });
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updates).toEqual([]);
    expect(json._error).toBe('unconfigured');
  });

  it('graceful: other DB errors return empty list with the error message', async () => {
    h.queue('live_updates.limit', { code: 'XYZ', message: 'something broke' }, { isError: true });
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updates).toEqual([]);
    expect(json._error).toBe('something broke');
  });

  it('200 with empty list when Supabase env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    const res = await GET(getReq('demo'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updates).toEqual([]);
  });
});
