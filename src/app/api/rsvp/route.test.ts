// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/rsvp/route.test.ts
//
// Phase 2.3 of AUDIT-2026-05-29.md — RSVP submission is one of
// the six "money flows" that had zero regression coverage. /api/rsvp
// is 220 LOC with rate limiting, email validation, an upsert with
// onConflict, preset-RSVP JSON columns, and a fire-and-forget
// notification email. A regression in any of those silently breaks
// every host's RSVP intake on a Friday push.
//
// This file pins down the public contract end-to-end at the route
// layer (faster + more comprehensive than a Playwright e2e for the
// API itself). The form/UX regression test belongs in a future
// e2e/specs/rsvp.spec.ts (Phase 2.8-adjacent) where mocking the
// site renderer is in scope.
//
// Mock pattern mirrors src/app/api/invite/guest/route.test.ts —
// hoisted Supabase chainable + Resend mock + an env-controlled
// rate-limit reset between tests so a 429 in one test doesn't
// leak into the next.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    const verbs = ['from', 'upsert', 'select', 'single'];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        // .upsert(...).select().single() is the terminal chain.
        // single() resolves with { data, error } from the queue.
        if (verb === 'single') {
          const q = queues[`${table}.single`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
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

  return {
    queues,
    calls,
    supabaseMock,
    resendSendMock: vi.fn(async () => ({ error: null })) as Mock,
    queue(key: string, value: unknown, isError?: boolean) {
      queues[key] = queues[key] || [];
      queues[key].push({ value, isError });
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

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: h.resendSendMock };
  },
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

// Per-test unique IP so the in-memory rate limiter doesn't bleed
// state between cases. RATE_LIMITS.rsvp = 10 per 60s — we walk
// over that intentionally in the dedicated rate-limit test.
let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

function makePost(body: unknown, opts: { ip?: string } = {}): NextRequest {
  const ip = opts.ip ?? nextIp();
  return new NextRequest('http://localhost/api/rsvp', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
  });
}

describe('POST /api/rsvp', () => {
  beforeEach(() => {
    h.reset();
    h.resendSendMock.mockClear();
    h.resendSendMock.mockImplementation(async () => ({ error: null }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    // Notification email off by default — turned on only by the
    // dedicated notification test below.
    delete process.env.NOTIFICATION_EMAIL;
    delete process.env.RESEND_API_KEY;
  });

  // ── Validation ────────────────────────────────────────────

  it('returns 400 when siteId is missing', async () => {
    const res = await POST(makePost({ guestName: 'Alice' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/siteId/);
  });

  it('returns 400 when guestName is missing', async () => {
    const res = await POST(makePost({ siteId: 'demo' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/guestName/);
  });

  it('returns 400 on malformed email', async () => {
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      email: 'not-an-email',
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it('accepts a valid email format', async () => {
    h.queue('guests.single', { id: 'g1', name: 'Alice' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      email: 'alice+rsvp@example.test',
      status: 'attending',
    }));
    expect(res.status).toBe(200);
  });

  // ── Happy path ────────────────────────────────────────────

  it('upserts attending RSVP and returns warm confirmation copy', async () => {
    h.queue('guests.single', { id: 'g1', name: 'Alice', status: 'attending' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      email: 'alice@example.test',
      status: 'attending',
      mealPreference: 'vegetarian',
      dietaryRestrictions: 'no nuts',
      songRequest: 'Dancing Queen',
      message: 'Cannot wait!',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.guest).toMatchObject({ id: 'g1' });
    // Microcopy is host-facing — keep it intact (regression-prone).
    expect(json.message).toMatch(/celebrate/i);

    // Upsert payload includes every field the form might send.
    const upsertCall = h.calls.find((c) => c.method === 'upsert');
    expect(upsertCall).toBeDefined();
    const payload = upsertCall!.args[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      site_id: 'demo',
      name: 'Alice',
      email: 'alice@example.test',
      status: 'attending',
      meal_preference: 'vegetarian',
      dietary_restrictions: 'no nuts',
      song_request: 'Dancing Queen',
      message: 'Cannot wait!',
    });

    // onConflict is what enables guests to update their RSVP — if
    // anyone changes this, double-submissions create duplicate rows.
    const upsertOptions = upsertCall!.args[1] as { onConflict?: string };
    expect(upsertOptions.onConflict).toBe('site_id,email');
  });

  it('declined RSVP returns the "you\'ll be missed" message', async () => {
    h.queue('guests.single', { id: 'g1', name: 'Bob', status: 'declined' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Bob',
      email: 'bob@example.test',
      status: 'declined',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/missed/i);
  });

  it('defaults status to "attending" when not provided', async () => {
    h.queue('guests.single', { id: 'g1', name: 'Alice' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
    }));
    expect(res.status).toBe(200);
    const upsertCall = h.calls.find((c) => c.method === 'upsert');
    expect((upsertCall!.args[0] as { status: string }).status).toBe('attending');
  });

  // ── Preset-RSVP (non-wedding) — added in 20260422 migration ──

  it('persists preset + answers JSONB for non-wedding events', async () => {
    h.queue('guests.single', { id: 'g1' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      status: 'attending',
      preset: 'memorial',
      answers: {
        memoryToShare: 'She always wore yellow on Sundays.',
        attendingCeremony: true,
      },
    }));
    expect(res.status).toBe(200);
    const payload = h.calls.find((c) => c.method === 'upsert')!.args[0] as Record<string, unknown>;
    expect(payload.rsvp_preset).toBe('memorial');
    expect(payload.rsvp_answers).toEqual({
      memoryToShare: 'She always wore yellow on Sundays.',
      attendingCeremony: true,
    });
  });

  it('defaults rsvp_answers to {} when answers is missing or non-object', async () => {
    h.queue('guests.single', { id: 'g1' });
    await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      preset: 'bachelor-party',
      // answers omitted
    }));
    const payload = h.calls.find((c) => c.method === 'upsert')!.args[0] as Record<string, unknown>;
    expect(payload.rsvp_answers).toEqual({});
  });

  // ── DB error handling ────────────────────────────────────

  it('returns 503 with a friendly message when the guests table is missing (42P01)', async () => {
    h.queue('guests.single', { code: '42P01', message: 'relation "guests" does not exist' }, true);
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
    }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/not set up/i);
    expect(json.code).toBe('42P01');
  });

  it('returns 500 on a generic upsert error', async () => {
    h.queue('guests.single', { code: '23505', message: 'duplicate key' }, true);
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
    }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/could not save/i);
    expect(json.code).toBe('23505');
  });

  // ── Rate limit ───────────────────────────────────────────

  it('returns 429 after 10 submissions from the same IP within the window', async () => {
    const sharedIp = '198.51.100.7';
    h.queue('guests.single', { id: 'g1' });
    h.queue('guests.single', { id: 'g2' });
    h.queue('guests.single', { id: 'g3' });
    h.queue('guests.single', { id: 'g4' });
    h.queue('guests.single', { id: 'g5' });
    h.queue('guests.single', { id: 'g6' });
    h.queue('guests.single', { id: 'g7' });
    h.queue('guests.single', { id: 'g8' });
    h.queue('guests.single', { id: 'g9' });
    h.queue('guests.single', { id: 'g10' });

    // 10 successes — the configured cap (RATE_LIMITS.rsvp.max).
    for (let i = 0; i < 10; i++) {
      const res = await POST(makePost({
        siteId: 'demo',
        guestName: `Guest ${i}`,
        email: `g${i}@example.test`,
      }, { ip: sharedIp }));
      expect(res.status).toBe(200);
    }

    // 11th from same IP → 429.
    const blocked = await POST(makePost({
      siteId: 'demo',
      guestName: 'Eleventh',
    }, { ip: sharedIp }));
    expect(blocked.status).toBe(429);
    const json = await blocked.json();
    expect(json.error).toMatch(/too many/i);
  });

  // ── Notification email (host-facing, fire-and-forget) ──

  it('fires the host notification email when NOTIFICATION_EMAIL + RESEND_API_KEY are set', async () => {
    process.env.NOTIFICATION_EMAIL = 'host@example.test';
    process.env.RESEND_API_KEY = 'test-resend';
    h.queue('guests.single', { id: 'g1' });

    await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      email: 'alice@example.test',
      status: 'attending',
      mealPreference: 'vegetarian',
    }));
    // Wait a tick — the .send() is fire-and-forget but the route
    // returns before we can `await` the send; the mock still records
    // the call synchronously when it's invoked.
    await new Promise((r) => setImmediate(r));

    expect(h.resendSendMock).toHaveBeenCalledTimes(1);
    const arg = h.resendSendMock.mock.calls[0][0] as { to: string; subject: string };
    expect(arg.to).toBe('host@example.test');
    expect(arg.subject).toMatch(/Alice/);
    expect(arg.subject).toMatch(/coming/i);
  });

  it('does not fire the host notification when env vars are missing', async () => {
    // Both NOTIFICATION_EMAIL and RESEND_API_KEY are unset in beforeEach.
    h.queue('guests.single', { id: 'g1' });

    await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
    }));
    await new Promise((r) => setImmediate(r));

    expect(h.resendSendMock).not.toHaveBeenCalled();
  });
});
