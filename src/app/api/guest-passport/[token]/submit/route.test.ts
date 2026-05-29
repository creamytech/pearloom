// ─────────────────────────────────────────────────────────────
// Pearloom / api/guest-passport/[token]/submit/route.test.ts
//
// Phase 2.8 (continued). The submit endpoint handles four kinds
// of guest-authored content (memory / whisper / capsule / song),
// each gated only by the unguessable token. A regression in any
// kind's validator could either let an unbounded blob through to
// the DB or reject legitimate text — both visible to guests.
//
// Critical to pin:
//   • Token + rate-limit at the door (10/min/token)
//   • Each kind's length cap (memory 3000, whisper 1500, capsule 2000)
//   • capsule's years coerced to [1, 50] integer
//   • whisper's deliver_after stamped (so the honeymoon-drip works)
//   • memory updates the most-recent prompt (no double-write)
//   • Insert payload carries guest_id + site_id (FK integrity)
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    const verbs = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'insert', 'update'];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        if (verb === 'maybeSingle') {
          const q = queues[`${table}.maybeSingle`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
          );
        }
        if (verb === 'insert') {
          const q = queues[`${table}.insert`]?.shift();
          return Promise.resolve(
            q?.isError ? { error: q.value } : { error: null },
          );
        }
        if (verb === 'update') {
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

  const supabaseMock = { from: (table: string) => makeChain(table) };

  return {
    queues,
    calls,
    supabaseMock,
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

import { POST } from './route';
import { NextRequest } from 'next/server';

// Per-test unique token so the per-token rate limiter (10/min)
// doesn't bleed between cases. The rate-limit test uses a single
// shared token intentionally.
let tokenCounter = 0;
function nextToken(): string {
  tokenCounter += 1;
  return `tok-${tokenCounter}-aaaaaaaa`;
}

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/guest-passport/T/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function callPost(token: string, body: unknown) {
  return POST(postReq(body), { params: Promise.resolve({ token }) });
}

const guestRow = (overrides: Partial<{ id: string; site_id: string; display_name: string }> = {}) => ({
  id: overrides.id ?? 'guest-1',
  site_id: overrides.site_id ?? 'demo',
  display_name: overrides.display_name ?? 'Alice',
});

describe('POST /api/guest-passport/[token]/submit — door', () => {
  beforeEach(() => {
    h.reset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('400 when token < 8 chars', async () => {
    const res = await callPost('short', { kind: 'memory', response: 'x' });
    expect(res.status).toBe(400);
  });

  it('503 when Supabase env missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await callPost(nextToken(), { kind: 'memory', response: 'x' });
    expect(res.status).toBe(503);
  });

  it('404 when guest token does not match a row', async () => {
    h.queue('pearloom_guests.maybeSingle', null);
    const res = await callPost(nextToken(), { kind: 'whisper', body: 'x' });
    expect(res.status).toBe(404);
  });

  it('400 on invalid JSON body', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const res = await POST(
      new NextRequest('http://localhost/api/guest-passport/T/submit', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ token: nextToken() }) },
    );
    expect(res.status).toBe(400);
  });

  it('400 on unknown kind', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const res = await callPost(nextToken(), { kind: 'mystery' });
    expect(res.status).toBe(400);
  });

  it('rate-limit: 11th submission within the window returns 429', async () => {
    const tok = `rl-${Date.now()}-aaaaaaaa`;
    // Queue 10 guest lookups + 10 song inserts (song is simplest).
    for (let i = 0; i < 10; i++) {
      h.queue('pearloom_guests.maybeSingle', guestRow());
      h.queue('song_requests.insert', null);
    }
    for (let i = 0; i < 10; i++) {
      const r = await callPost(tok, { kind: 'song', title: `Song ${i}` });
      expect(r.status).toBe(200);
    }
    const blocked = await callPost(tok, { kind: 'song', title: 'Eleventh' });
    expect(blocked.status).toBe(429);
  });
});

describe('POST /api/guest-passport/[token]/submit — memory', () => {
  beforeEach(() => {
    h.reset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('400 when response is empty or whitespace', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const r1 = await callPost(nextToken(), { kind: 'memory', response: '' });
    expect(r1.status).toBe(400);
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const r2 = await callPost(nextToken(), { kind: 'memory', response: '   ' });
    expect(r2.status).toBe(400);
  });

  it('400 when response exceeds 3000 chars', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const res = await callPost(nextToken(), { kind: 'memory', response: 'x'.repeat(3001) });
    expect(res.status).toBe(400);
  });

  it('404 when no memory prompt exists for the guest', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    h.queue('memory_prompts.maybeSingle', null);
    const res = await callPost(nextToken(), { kind: 'memory', response: 'A nice memory' });
    expect(res.status).toBe(404);
    // No update fired.
    expect(h.calls.find((c) => c.table === 'memory_prompts' && c.method === 'update')).toBeUndefined();
  });

  it('200 updates the most-recent prompt with response + responded_at', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    h.queue('memory_prompts.maybeSingle', { id: 'mp-7' });
    h.queue('memory_prompts.update.eq', null);
    const res = await callPost(nextToken(), { kind: 'memory', response: '  The Sonoma trip  ' });
    expect(res.status).toBe(200);

    const update = h.calls.find((c) => c.table === 'memory_prompts' && c.method === 'update');
    expect(update).toBeDefined();
    const payload = update!.args[0] as { response: string; responded_at: string };
    // Trim applied.
    expect(payload.response).toBe('The Sonoma trip');
    expect(typeof payload.responded_at).toBe('string');
    // Narrowed to the right prompt id.
    const eq = h.calls.find((c) => c.table === 'memory_prompts' && c.method === 'update.eq');
    expect(eq?.args).toEqual(['id', 'mp-7']);
  });
});

describe('POST /api/guest-passport/[token]/submit — whisper', () => {
  beforeEach(() => {
    h.reset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('400 on empty body', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const res = await callPost(nextToken(), { kind: 'whisper', body: '' });
    expect(res.status).toBe(400);
  });

  it('400 on >1500 chars', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const res = await callPost(nextToken(), { kind: 'whisper', body: 'x'.repeat(1501) });
    expect(res.status).toBe(400);
  });

  it('200 inserts whisper with site_id + guest_id + is_private + deliver_after stamp', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow({ id: 'g-1', site_id: 'site-7' }));
    h.queue('whispers.insert', null);
    const res = await callPost(nextToken(), { kind: 'whisper', body: 'Thinking of you' });
    expect(res.status).toBe(200);

    const ins = h.calls.find((c) => c.table === 'whispers' && c.method === 'insert');
    expect(ins).toBeDefined();
    const payload = ins!.args[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      site_id: 'site-7',
      guest_id: 'g-1',
      guest_name: 'Alice',
      body: 'Thinking of you',
      is_private: true,
    });
    // deliver_after is the honeymoon-drip delay (next 14 days +
    // random hours). Must parse as a valid future ISO date.
    expect(typeof payload.deliver_after).toBe('string');
    const delivery = new Date(payload.deliver_after as string).getTime();
    expect(Number.isFinite(delivery)).toBe(true);
    expect(delivery).toBeGreaterThanOrEqual(Date.now() - 1000);  // not in the past
  });
});

describe('POST /api/guest-passport/[token]/submit — capsule', () => {
  beforeEach(() => {
    h.reset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('400 on empty body', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const res = await callPost(nextToken(), { kind: 'capsule', body: '', years: 5 });
    expect(res.status).toBe(400);
  });

  it('400 on >2000 chars', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const res = await callPost(nextToken(), {
      kind: 'capsule',
      body: 'x'.repeat(2001),
      years: 1,
    });
    expect(res.status).toBe(400);
  });

  it('clamps years to [1, 50] integer', async () => {
    // years=0 → coerced to 1
    h.queue('pearloom_guests.maybeSingle', guestRow());
    h.queue('time_capsule.insert', null);
    await callPost(nextToken(), { kind: 'capsule', body: 'note', years: 0 });
    let ins = h.calls.find((c) => c.table === 'time_capsule' && c.method === 'insert');
    expect((ins!.args[0] as { reveal_years: number }).reveal_years).toBe(1);

    // years=999 → coerced to 50
    h.reset();
    h.queue('pearloom_guests.maybeSingle', guestRow());
    h.queue('time_capsule.insert', null);
    await callPost(nextToken(), { kind: 'capsule', body: 'note', years: 999 });
    ins = h.calls.find((c) => c.table === 'time_capsule' && c.method === 'insert');
    expect((ins!.args[0] as { reveal_years: number }).reveal_years).toBe(50);

    // years=7.6 → rounded to 8
    h.reset();
    h.queue('pearloom_guests.maybeSingle', guestRow());
    h.queue('time_capsule.insert', null);
    await callPost(nextToken(), { kind: 'capsule', body: 'note', years: 7.6 });
    ins = h.calls.find((c) => c.table === 'time_capsule' && c.method === 'insert');
    expect((ins!.args[0] as { reveal_years: number }).reveal_years).toBe(8);
  });

  it('computes reveal_on as today + years (YYYY-MM-DD shape)', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    h.queue('time_capsule.insert', null);
    await callPost(nextToken(), { kind: 'capsule', body: 'note', years: 5 });
    const ins = h.calls.find((c) => c.table === 'time_capsule' && c.method === 'insert');
    const payload = ins!.args[0] as { reveal_on: string };
    expect(payload.reveal_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const reveal = new Date(payload.reveal_on);
    const target = new Date();
    target.setFullYear(target.getFullYear() + 5);
    // Same year-month at minimum.
    expect(reveal.getFullYear()).toBe(target.getFullYear());
  });
});

describe('POST /api/guest-passport/[token]/submit — song', () => {
  beforeEach(() => {
    h.reset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('400 when title missing', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    const res = await callPost(nextToken(), { kind: 'song', title: '' });
    expect(res.status).toBe(400);
  });

  it('200 inserts song with all optional fields nullable', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow({ id: 'g-1', site_id: 'site-7' }));
    h.queue('song_requests.insert', null);
    const res = await callPost(nextToken(), {
      kind: 'song',
      title: '  Dancing Queen  ',
      artist: 'ABBA',
      spotify: 'https://open.spotify.com/track/xxx',
      note: 'For the reception',
    });
    expect(res.status).toBe(200);
    const ins = h.calls.find((c) => c.table === 'song_requests' && c.method === 'insert');
    expect(ins).toBeDefined();
    expect(ins!.args[0]).toMatchObject({
      site_id: 'site-7',
      guest_id: 'g-1',
      guest_name: 'Alice',
      song_title: 'Dancing Queen',
      artist: 'ABBA',
      spotify_url: 'https://open.spotify.com/track/xxx',
      note: 'For the reception',
    });
  });

  it('200 with title only — empty optionals coerced to null (not "")', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    h.queue('song_requests.insert', null);
    const res = await callPost(nextToken(), { kind: 'song', title: 'Lonesome Road' });
    expect(res.status).toBe(200);
    const ins = h.calls.find((c) => c.table === 'song_requests' && c.method === 'insert');
    const payload = ins!.args[0] as Record<string, unknown>;
    expect(payload.artist).toBeNull();
    expect(payload.spotify_url).toBeNull();
    expect(payload.note).toBeNull();
  });

  it('500 surfaces a Supabase insert error', async () => {
    h.queue('pearloom_guests.maybeSingle', guestRow());
    h.queue('song_requests.insert', { message: 'rls denied' }, true);
    const res = await callPost(nextToken(), { kind: 'song', title: 'x' });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('rls denied');
  });
});
