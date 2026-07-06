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
  /* Fallbacks when a queue is empty — the route now resolves the
     site row (uuid OR slug) before every upsert, so nearly every
     test needs a sites.maybeSingle answer. The default is an open
     site (no guestListOnly); gate tests queue their own. */
  const defaults: Record<string, unknown> = {
    'sites.maybeSingle': { id: 'demo', ai_manifest: {} },
    // The split participant seed + linkGuestRowToPerson both resolve a
    // person. Default to "no existing person → insert returns an id" so
    // the fire-and-forget identity paths don't depend on queue counting.
    'people.maybeSingle': null,
    'people.single': { id: 'person-1' },
  };

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    // `insert` joined the pass verbs when the split-participant seed
    // landed (participants + people upserts flow through it).
    const passVerbs = ['from', 'upsert', 'update', 'insert', 'select', 'eq', 'ilike', 'in'];
    // Terminal verbs resolve { data, error } from the queue (or the
    // defaults map): .single() ends the upsert chain, .maybeSingle()
    // ends the site/token lookups, .limit() ends the email check.
    const terminalVerbs = ['single', 'maybeSingle', 'limit'];
    for (const verb of passVerbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        return chain;
      };
    }
    for (const verb of terminalVerbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        const key = `${table}.${verb}`;
        const q = queues[key]?.shift()
          ?? (key in defaults ? { value: defaults[key] } : undefined);
        // A queued Error value REJECTS — lets a test prove the split
        // seed's fail-open try/catch swallows a thrown query.
        if (q?.isError && q.value instanceof Error) return Promise.reject(q.value);
        return Promise.resolve(
          q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
        );
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

  it('writes the guests.selected_events column (not event_ids)', async () => {
    // Regression: the route wrote `event_ids`, which doesn't exist on
    // the guests table, so every RSVP 500'd. The real column is
    // `selected_events`.
    h.queue('guests.single', { id: 'g1', name: 'Alice', status: 'attending' });
    await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      email: 'alice@example.test',
      status: 'attending',
      selectedEvents: ['ceremony', 'reception'],
      plusOne: true,
      plusOneName: 'Sam',
    }));
    const payload = h.calls.find((c) => c.method === 'upsert')!.args[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('event_ids');
    expect(payload.selected_events).toEqual(['ceremony', 'reception']);
    expect(payload.plus_one).toBe(true);
    expect(payload.plus_one_name).toBe('Sam');
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

  // ── Invitation-only gate (rsvpConfig.guestListOnly) ──────

  it('403s an unknown email when guestListOnly is on', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { rsvpConfig: { guestListOnly: true } } });
    // guests.limit default → null → email not found on the list.
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Stranger',
      email: 'stranger@example.test',
    }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.guestListOnly).toBe(true);
    expect(json.error).toMatch(/invitation/i);
    // Crucially: NO row was written.
    expect(h.calls.find((c) => c.method === 'upsert')).toBeUndefined();
  });

  it('403s when guestListOnly is on and no email or token was given', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { rsvpConfig: { guestListOnly: true } } });
    const res = await POST(makePost({ siteId: 'demo', guestName: 'Stranger' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/invitation/i);
  });

  it('admits an email that is already on the guest list', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { rsvpConfig: { guestListOnly: true } } });
    h.queue('guests.limit', [{ id: 'g-existing' }]);
    h.queue('guests.single', { id: 'g-existing', name: 'Alice' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      email: 'alice@example.test',
    }));
    expect(res.status).toBe(200);
  });

  it('admits a personal guest-link token', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { rsvpConfig: { guestListOnly: true } } });
    h.queue('guests.maybeSingle', { id: 'g-tok' });
    h.queue('guests.single', { id: 'g-tok', name: 'Alice' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      guestToken: 'tok-abc123',
    }));
    expect(res.status).toBe(200);
  });

  it('resolves a slug siteId to the site uuid before the upsert', async () => {
    h.queue('sites.maybeSingle', { id: '11111111-2222-4333-8444-555555555555', ai_manifest: {} });
    h.queue('guests.single', { id: 'g1' });
    const res = await POST(makePost({ siteId: 'emma-and-james', guestName: 'Alice' }));
    expect(res.status).toBe(200);
    const payload = h.calls.find((c) => c.method === 'upsert')!.args[0] as { site_id: string };
    expect(payload.site_id).toBe('11111111-2222-4333-8444-555555555555');
  });

  it('404s when the site does not exist', async () => {
    h.queue('sites.maybeSingle', null);
    const res = await POST(makePost({ siteId: 'no-such-site', guestName: 'Alice' }));
    expect(res.status).toBe(404);
  });

  // ── "Found you" (guestId from /api/rsvp/lookup) ──────────

  it('UPDATEs the matched guest row instead of upserting a duplicate', async () => {
    // guestId row check resolves to the row…
    h.queue('guests.maybeSingle', { id: '22222222-3333-4444-8555-666666666666' });
    // …and the update chain's .single() returns it.
    h.queue('guests.single', { id: '22222222-3333-4444-8555-666666666666', name: 'Alice' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      guestId: '22222222-3333-4444-8555-666666666666',
      status: 'attending',
    }));
    expect(res.status).toBe(200);
    expect(h.calls.find((c) => c.method === 'update')).toBeDefined();
    expect(h.calls.find((c) => c.method === 'upsert')).toBeUndefined();
    // No email typed → the stored email must not be clobbered.
    const payload = h.calls.find((c) => c.method === 'update')!.args[0] as Record<string, unknown>;
    expect('email' in payload).toBe(false);
  });

  it('a picked guestId passes the invitation-only gate', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { rsvpConfig: { guestListOnly: true } } });
    h.queue('guests.maybeSingle', { id: '22222222-3333-4444-8555-666666666666' });
    h.queue('guests.single', { id: '22222222-3333-4444-8555-666666666666' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      guestId: '22222222-3333-4444-8555-666666666666',
    }));
    expect(res.status).toBe(200);
  });

  it('a forged guestId from another site falls back to upsert (and fails the gate)', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { rsvpConfig: { guestListOnly: true } } });
    // Row check finds nothing for this site.
    h.queue('guests.maybeSingle', null);
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      guestId: '99999999-9999-4999-8999-999999999999',
    }));
    expect(res.status).toBe(403);
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

  // ── Collaborative-split participant seed (fire-and-forget) ──
  // An attending RSVP to a group-split-shaped occasion (bachelor/ette,
  // reunion) auto-adds the guest to the split roster. Must never
  // regress the RSVP: it runs AFTER the response, voided + swallowed.
  // The seed runs post-response, so flush microtasks before asserting.
  const flush = () => new Promise((r) => setImmediate(r));

  it('a bachelor-party RSVP seeds a split participant', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { occasion: 'bachelor-party' } });
    h.queue('guests.single', { id: 'g1', name: 'Ben', status: 'attending' });
    // participants dedup lookup → no existing → insert proceeds.
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Ben',
      email: 'ben@example.test',
      status: 'attending',
    }));
    expect(res.status).toBe(200);
    await flush();

    const insert = h.calls.find((c) => c.table === 'participants' && c.method === 'insert');
    expect(insert).toBeDefined();
    expect(insert!.args[0]).toMatchObject({
      site_id: 'demo',
      person_id: 'person-1',      // resolved from the email
      display_name: 'Ben',
      email: 'ben@example.test',
    });
  });

  it('a name-only bachelor RSVP still seeds a participant (person_id null)', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { occasion: 'reunion' } });
    h.queue('guests.single', { id: 'g1', name: 'Sam', status: 'attending' });
    const res = await POST(makePost({ siteId: 'demo', guestName: 'Sam' }));
    expect(res.status).toBe(200);
    await flush();

    const insert = h.calls.find((c) => c.table === 'participants' && c.method === 'insert');
    expect(insert).toBeDefined();
    expect(insert!.args[0]).toMatchObject({
      site_id: 'demo',
      person_id: null,            // no email → name-only participant
      display_name: 'Sam',
      email: null,
    });
    // No email → no person lookup/dedup was attempted.
    expect(h.calls.find((c) => c.table === 'participants' && c.method === 'maybeSingle')).toBeUndefined();
  });

  it('a wedding RSVP does NOT seed a split participant', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { occasion: 'wedding' } });
    h.queue('guests.single', { id: 'g1', name: 'Alice', status: 'attending' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Alice',
      email: 'alice@example.test',
      status: 'attending',
    }));
    expect(res.status).toBe(200);
    await flush();

    expect(h.calls.find((c) => c.table === 'participants')).toBeUndefined();
  });

  it('a declined bachelor RSVP does NOT seed a participant', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { occasion: 'bachelor-party' } });
    h.queue('guests.single', { id: 'g1', name: 'Ben', status: 'declined' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Ben',
      email: 'ben@example.test',
      status: 'declined',
    }));
    expect(res.status).toBe(200);
    await flush();

    expect(h.calls.find((c) => c.table === 'participants')).toBeUndefined();
  });

  it('a repeat bachelor RSVP does not duplicate the participant', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { occasion: 'bachelor-party' } });
    h.queue('guests.single', { id: 'g1', name: 'Ben', status: 'attending' });
    // The person is already on this site's split roster.
    h.queue('participants.maybeSingle', { id: 'part-existing' });
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Ben',
      email: 'ben@example.test',
      status: 'attending',
    }));
    expect(res.status).toBe(200);
    await flush();

    // Dedup lookup ran, but the insert did NOT.
    expect(h.calls.find((c) => c.table === 'participants' && c.method === 'maybeSingle')).toBeDefined();
    expect(h.calls.find((c) => c.table === 'participants' && c.method === 'insert')).toBeUndefined();
  });

  it('an RSVP still succeeds when the participant seed throws', async () => {
    h.queue('sites.maybeSingle', { id: 'demo', ai_manifest: { occasion: 'bachelor-party' } });
    h.queue('guests.single', { id: 'g1', name: 'Ben', status: 'attending' });
    // The dedup lookup rejects — the seed's try/catch must swallow it
    // and the RSVP response must already have returned 200.
    h.queue('participants.maybeSingle', new Error('boom'), true);
    const res = await POST(makePost({
      siteId: 'demo',
      guestName: 'Ben',
      email: 'ben@example.test',
      status: 'attending',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    // Flushing the swallowed rejection must not throw / crash.
    await expect(flush()).resolves.toBeUndefined();
    // The throw happened before the insert → no participant row written.
    expect(h.calls.find((c) => c.table === 'participants' && c.method === 'insert')).toBeUndefined();
  });
});
