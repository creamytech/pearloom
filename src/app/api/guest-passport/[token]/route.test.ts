// ─────────────────────────────────────────────────────────────
// Pearloom / api/guest-passport/[token]/route.test.ts
//
// Phase 2.8 of AUDIT-2026-05-29.md — guest portal token flow.
// /api/guest-passport/[token] is the data hub for /g/[token]:
// resolves a guest's identity, then joins to their memory prompt,
// whisper, time capsule, songs, and seatmate intro.
//
// Public endpoint (no auth — gate is the unguessable token).
// Regression traps:
//   • A renamed table (one of five joined) cascading into a 500
//     when it should degrade to null on that field
//   • Token validation that drops "long enough but wrong" tokens
//     silently
//   • Site lookup failure breaking the response instead of
//     returning the guest data with an empty-site fallback
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    const verbs = ['select', 'eq', 'order', 'limit', 'maybeSingle'];
    for (const verb of verbs) {
      chain[verb] = (...args: unknown[]) => {
        calls.push({ table, method: verb, args });
        if (verb === 'maybeSingle') {
          const q = queues[`${table}.maybeSingle`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? null, error: null },
          );
        }
        // .select().eq().order() — songs list, terminal on .order()
        if (verb === 'order' && table === 'song_requests') {
          const q = queues[`${table}.order`]?.shift();
          return Promise.resolve(
            q?.isError ? { data: null, error: q.value } : { data: q?.value ?? [], error: null },
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
    getSiteConfigMock: vi.fn(async () => null) as Mock,
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

vi.mock('@/lib/db', () => ({
  getSiteConfig: h.getSiteConfigMock,
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

function getReq(): NextRequest {
  return new NextRequest('http://localhost/api/guest-passport/T', { method: 'GET' });
}

function callGet(token: string) {
  return GET(getReq(), { params: Promise.resolve({ token }) });
}

describe('GET /api/guest-passport/[token]', () => {
  beforeEach(() => {
    h.reset();
    h.getSiteConfigMock.mockReset();
    h.getSiteConfigMock.mockImplementation(async () => null);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('400 when token is shorter than 8 chars', async () => {
    const res = await callGet('short');
    expect(res.status).toBe(400);
  });

  it('400 when token is missing entirely', async () => {
    const res = await callGet('');
    expect(res.status).toBe(400);
  });

  it('503 when Supabase env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await callGet('valid-token-xyz');
    expect(res.status).toBe(503);
  });

  it('404 when no guest matches the token', async () => {
    h.queue('pearloom_guests.maybeSingle', null);
    const res = await callGet('valid-token-xyz');
    expect(res.status).toBe(404);
  });

  it('404 when the guest lookup errors', async () => {
    h.queue('pearloom_guests.maybeSingle', { message: 'rls denied' }, true);
    const res = await callGet('valid-token-xyz');
    expect(res.status).toBe(404);
  });

  it('200 with all five joins populated, mapped to camelCase', async () => {
    h.queue('pearloom_guests.maybeSingle', {
      id: 'guest-1',
      guest_token: 'valid-token-xyz',
      site_id: 'emma-and-james',
      display_name: 'Alice',
      email: 'alice@example.test',
      phone: '+15551234567',
      home_city: 'Brooklyn',
      relationship_to_host: 'bride-college-friend',
      pronouns: 'she/her',
      dietary: ['vegetarian'],
      accessibility: [],
      language: 'en',
      side: 'bride',
      notes: 'allergic to peanuts',
    });
    h.getSiteConfigMock.mockImplementationOnce(async () => ({
      slug: 'emma-and-james',
      names: ['Emma', 'James'],
      manifest: { occasion: 'wedding' },
    }));
    h.queue('memory_prompts.maybeSingle', {
      id: 'mp-1',
      prompt: 'A favorite memory of Emma & James?',
      response: 'The trip to Sonoma',
      responded_at: '2026-05-01T00:00:00Z',
      created_at: '2026-04-01T00:00:00Z',
    });
    h.queue('whispers.maybeSingle', {
      id: 'w-1',
      body: 'Thinking of you',
      created_at: '2026-04-15T00:00:00Z',
      is_private: true,
    });
    h.queue('time_capsule.maybeSingle', {
      id: 'tc-1',
      body: 'For your 5th anniversary',
      reveal_years: 5,
      reveal_on: '2031-06-12',
      revealed: false,
      created_at: '2026-04-20T00:00:00Z',
    });
    h.queue('song_requests.order', [
      { id: 's-1', song_title: 'Dancing Queen', artist: 'ABBA', spotify_url: null, note: null, created_at: '2026-04-22T00:00:00Z' },
      { id: 's-2', song_title: 'Lovesong', artist: 'The Cure', spotify_url: 'sp:1', note: 'For the slow dance', created_at: '2026-04-22T00:01:00Z' },
    ]);
    h.queue('seatmate_intros.maybeSingle', {
      table_label: 'Table 7',
      intro: 'You sat near them at the engagement party',
      seatmates: ['Bob', 'Carla'],
    });

    const res = await callGet('valid-token-xyz');
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.guest).toMatchObject({
      id: 'guest-1',
      token: 'valid-token-xyz',
      name: 'Alice',
      email: 'alice@example.test',
      homeCity: 'Brooklyn',
      relationshipToHost: 'bride-college-friend',
      pronouns: 'she/her',
      dietary: ['vegetarian'],
      side: 'bride',
    });
    expect(json.site).toEqual({
      domain: 'emma-and-james',
      names: ['Emma', 'James'],
      manifest: { occasion: 'wedding' },
    });
    expect(json.memoryPrompt).toEqual({
      id: 'mp-1',
      prompt: 'A favorite memory of Emma & James?',
      response: 'The trip to Sonoma',
      respondedAt: '2026-05-01T00:00:00Z',
    });
    expect(json.whisper).toMatchObject({ id: 'w-1' });
    expect(json.timeCapsule).toMatchObject({ id: 'tc-1', reveal_years: 5 });
    expect(json.songs).toHaveLength(2);
    expect(json.seatIntro?.table_label).toBe('Table 7');
  });

  it('200 with null joins when guest has no prompt/whisper/capsule/seatmate yet', async () => {
    h.queue('pearloom_guests.maybeSingle', {
      id: 'guest-2',
      guest_token: 'valid-token-xyz',
      site_id: 'demo',
      display_name: 'Bob',
      email: null,
      dietary: null,
      accessibility: null,
    });
    h.getSiteConfigMock.mockImplementationOnce(async () => null);
    h.queue('memory_prompts.maybeSingle', null);
    h.queue('whispers.maybeSingle', null);
    h.queue('time_capsule.maybeSingle', null);
    h.queue('song_requests.order', []);
    h.queue('seatmate_intros.maybeSingle', null);

    const res = await callGet('valid-token-xyz');
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.memoryPrompt).toBeNull();
    expect(json.whisper).toBeNull();
    expect(json.timeCapsule).toBeNull();
    expect(json.songs).toEqual([]);
    expect(json.seatIntro).toBeNull();
    // Defaults for nullable arrays — clients pass these to .map().
    expect(json.guest.dietary).toEqual([]);
    expect(json.guest.accessibility).toEqual([]);
    expect(json.guest.language).toBe('en');
  });

  it('falls back to empty-site shape when getSiteConfig fails', async () => {
    h.queue('pearloom_guests.maybeSingle', {
      id: 'guest-3',
      guest_token: 'valid-token-xyz',
      site_id: 'unconfigured-site',
      display_name: 'Carla',
    });
    h.getSiteConfigMock.mockImplementationOnce(async () => {
      throw new Error('Supabase down');
    });
    h.queue('memory_prompts.maybeSingle', null);
    h.queue('whispers.maybeSingle', null);
    h.queue('time_capsule.maybeSingle', null);
    h.queue('song_requests.order', []);
    h.queue('seatmate_intros.maybeSingle', null);

    const res = await callGet('valid-token-xyz');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.site).toEqual({ domain: 'unconfigured-site', names: [], manifest: null });
  });
});
