// ─────────────────────────────────────────────────────────────
// celebrations/roster — the shared roster's read AND write halves.
//
// What matters here is not the happy path (one insert) but the
// guards, because this endpoint is the container's most dangerous
// surface: it reads across events and writes across events.
//
//   • The SHEDDING GUARD, both halves: a private event's guests
//     never enter the union (read), and a private event is never a
//     write-back target (write).
//   • Ownership: a target outside the caller's celebration 403s the
//     whole request rather than silently skipping.
//   • The capacity gate can't be routed around by writing through
//     the container.
//   • Dedupe, and honest per-target partial results.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const OWNER = 'owner@example.test';

const h = vi.hoisted(() => {
  const state = {
    session: { user: { email: 'owner@example.test' } } as { user: { email: string } } | null,
    sites: [] as Array<Record<string, unknown>>,
    guestsBySite: {} as Record<string, Array<{ id: string; name: string | null; email: string | null; status: string | null }>>,
    inserts: [] as Array<{ site_id: string; name: string; email: string | null }>,
    capacityOk: true,
  };

  function chain(table: string) {
    const filters: Record<string, unknown> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: Record<string, any> = {};
    let pendingInsert: Record<string, unknown> | null = null;

    const rowsFor = () => {
      if (table === 'sites') return state.sites;
      const siteId = String(filters.site_id ?? '');
      let rows = state.guestsBySite[siteId] ?? [];
      if (filters.email != null) {
        rows = rows.filter((g) => (g.email ?? '').toLowerCase() === String(filters.email).toLowerCase());
      }
      if (filters.name != null) {
        rows = rows.filter((g) => (g.name ?? '').toLowerCase() === String(filters.name).toLowerCase());
      }
      if (filters.status != null) rows = rows.filter((g) => g.status === filters.status);
      return rows;
    };

    for (const verb of ['select', 'order', 'limit']) {
      c[verb] = () => c;
    }
    c.eq = (col: string, v: unknown) => { filters[col] = v; return c; };
    c.ilike = (col: string, v: unknown) => { filters[col] = v; return c; };
    c.insert = (row: Record<string, unknown>) => {
      pendingInsert = row;
      state.inserts.push({
        site_id: String(row.site_id),
        name: String(row.name),
        email: (row.email as string | null) ?? null,
      });
      return c;
    };
    c.update = () => c;
    c.maybeSingle = async () => ({ data: rowsFor()[0] ?? null, error: null });
    c.single = async () => {
      if (pendingInsert) return { data: { id: `new-${state.inserts.length}` }, error: null };
      return { data: rowsFor()[0] ?? null, error: rowsFor()[0] ? null : { message: 'no row' } };
    };
    c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve({ data: rowsFor(), error: null, count: rowsFor().length }).then(res, rej);
    return c;
  }

  return { state, supabaseMock: { from: (t: string) => chain(t) } };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: () => h.supabaseMock }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn(async () => h.state.session) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true }),
  getClientIp: () => '127.0.0.1',
}));
vi.mock('@/lib/people', () => ({ linkGuestRowToPerson: vi.fn(async () => {}) }));
vi.mock('@/lib/plan-gate', () => ({
  checkGuestCapacity: vi.fn(async () => (h.state.capacityOk
    ? { ok: true }
    : { ok: false, status: 402, body: { error: 'Guest limit reached', code: 'PLAN_LIMIT', allowed: 0 } })),
}));

import { GET, POST } from './route';
import { NextRequest } from 'next/server';

const CELEB = 'celeb-weekend-1';

function site(subdomain: string, occasion: string, extra: Record<string, unknown> = {}) {
  return {
    id: `id-${subdomain}`,
    subdomain,
    ai_manifest: {
      occasion,
      celebration: { id: CELEB, ...(extra.celebration as object ?? {}) },
      names: ['Emma', 'James'],
    },
  };
}

function postReq(body: unknown) {
  return new NextRequest('http://localhost/api/celebrations/roster', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stub.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'stub');
  h.state.session = { user: { email: OWNER } };
  h.state.capacityOk = true;
  h.state.inserts = [];
  h.state.sites = [
    site('emma-james', 'wedding'),
    site('emma-bach', 'bachelorette-party'),
    site('the-brunch', 'brunch'),
  ];
  h.state.guestsBySite = {
    'id-emma-james': [{ id: 'g1', name: 'Aunt Prue', email: 'prue@x.test', status: 'attending' }],
    'id-emma-bach': [{ id: 'g2', name: 'Secret Sam', email: 'sam@x.test', status: 'attending' }],
    'id-the-brunch': [],
  };
});

// ─── Read half ───────────────────────────────────────────────

describe('GET — the shedding guard (read half)', () => {
  it('never lets a private event contribute guests to the union', async () => {
    const res = await GET(
      new NextRequest(`http://localhost/api/celebrations/roster?celebrationId=${CELEB}`),
    );
    const json = await res.json() as {
      roster: Array<{ firstName: string; events: string[] }>;
      events: Array<{ subdomain: string; scope: string; privateReason?: string }>;
    };

    const names = json.roster.map((g) => g.firstName);
    expect(names).toContain('Aunt');       // from the shared wedding
    expect(names).not.toContain('Secret'); // the bachelorette guest must NOT appear
    // …and no roster entry may even reference the private event.
    expect(json.roster.some((g) => g.events.includes('emma-bach'))).toBe(false);
  });

  it('still reports the private event with its scope + a reason', async () => {
    const res = await GET(
      new NextRequest(`http://localhost/api/celebrations/roster?celebrationId=${CELEB}`),
    );
    const json = await res.json() as {
      events: Array<{ subdomain: string; scope: string; privateReason?: string }>;
    };
    const bach = json.events.find((e) => e.subdomain === 'emma-bach');
    expect(bach?.scope).toBe('private');
    expect(bach?.privateReason).toBeTruthy();
    const wedding = json.events.find((e) => e.subdomain === 'emma-james');
    expect(wedding?.scope).toBe('shared');
    expect(wedding?.privateReason).toBeUndefined();
  });

  it('401s without a session', async () => {
    h.state.session = null;
    const res = await GET(new NextRequest('http://localhost/api/celebrations/roster?celebrationId=x'));
    expect(res.status).toBe(401);
  });
});

// ─── Write half ──────────────────────────────────────────────

describe('POST — the shedding guard (write half)', () => {
  it('REFUSES to write a guest into a private event, and writes nothing for it', async () => {
    const res = await POST(postReq({
      celebrationId: CELEB,
      person: { name: 'Aunt Prue', email: 'prue@x.test' },
      targets: ['emma-bach'],
    }));
    const json = await res.json() as { results: Array<{ subdomain: string; outcome: string; reason?: string }> };
    expect(json.results[0].outcome).toBe('private');
    expect(json.results[0].reason).toBeTruthy();
    expect(h.state.inserts).toEqual([]);
  });

  it('writes to shared targets while refusing the private one in the same request', async () => {
    const res = await POST(postReq({
      celebrationId: CELEB,
      person: { name: 'Aunt Prue', email: 'prue@x.test' },
      targets: ['the-brunch', 'emma-bach'],
    }));
    const json = await res.json() as { results: Array<{ subdomain: string; outcome: string }> };
    const byDomain = Object.fromEntries(json.results.map((r) => [r.subdomain, r.outcome]));
    expect(byDomain['the-brunch']).toBe('added');
    expect(byDomain['emma-bach']).toBe('private');
    // Exactly one insert, and it went to the shared event.
    expect(h.state.inserts).toHaveLength(1);
    expect(h.state.inserts[0].site_id).toBe('id-the-brunch');
  });
});

describe('POST — ownership and validation', () => {
  it('401s without a session', async () => {
    h.state.session = null;
    const res = await POST(postReq({ celebrationId: CELEB, person: { name: 'X' }, targets: ['the-brunch'] }));
    expect(res.status).toBe(401);
  });

  it('403s the WHOLE request when a target is not in the caller\'s celebration', async () => {
    const res = await POST(postReq({
      celebrationId: CELEB,
      person: { name: 'Aunt Prue' },
      targets: ['the-brunch', 'someone-elses-site'],
    }));
    expect(res.status).toBe(403);
    // Nothing partial — the legitimate target must not be written either.
    expect(h.state.inserts).toEqual([]);
  });

  it('400s on missing person or targets', async () => {
    expect((await POST(postReq({ celebrationId: CELEB, targets: ['the-brunch'] }))).status).toBe(400);
    expect((await POST(postReq({ celebrationId: CELEB, person: { name: 'X' }, targets: [] }))).status).toBe(400);
    expect((await POST(postReq({ person: { name: 'X' }, targets: ['the-brunch'] }))).status).toBe(400);
  });
});

describe('POST — dedupe and capacity', () => {
  it('reports already-there instead of duplicating a guest', async () => {
    const res = await POST(postReq({
      celebrationId: CELEB,
      person: { name: 'Aunt Prue', email: 'prue@x.test' },
      targets: ['emma-james'],
    }));
    const json = await res.json() as { results: Array<{ outcome: string }> };
    expect(json.results[0].outcome).toBe('already-there');
    expect(h.state.inserts).toEqual([]);
  });

  it('cannot route around the guest cap', async () => {
    h.state.capacityOk = false;
    const res = await POST(postReq({
      celebrationId: CELEB,
      person: { name: 'New Person', email: 'new@x.test' },
      targets: ['the-brunch'],
    }));
    const json = await res.json() as { results: Array<{ outcome: string; reason?: string }> };
    expect(json.results[0].outcome).toBe('over-limit');
    expect(json.results[0].reason).toBeTruthy();
    expect(h.state.inserts).toEqual([]);
  });
});
