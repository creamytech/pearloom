// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/publish/route.test.ts
//
// Phase 2.2 of AUDIT-2026-05-29.md — publish is the moment of
// truth. /api/sites/publish gates on owner-only (so a co-host
// can't push a draft live without consent), runs subdomain
// validation that doubles as URL safety + reserved-namespace
// protection, mirrors photos to permanent storage, generates a
// vibe skin, persists, and mints a preview token. A regression
// in any of those layers either breaks publishing entirely
// (-100% conversion) or silently lets the wrong actor publish.
//
// This test isolates the GATING + VALIDATION + URL surface — the
// pieces that determine whether a publish succeeds and what URL
// it returns. mirrorManifestPhotos is
// mocked to no-ops because they're heavy upstream deps with
// their own contracts. publishSite (the DB writer) is mocked
// per-test so we can cover both success + error paths.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const h = vi.hoisted(() => {
  type Queued = { value: unknown; isError?: boolean };
  const queues: Record<string, Queued[]> = {};
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    const verbs = ['select', 'eq', 'maybeSingle', 'insert', 'update'];
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
          // update().eq() chain — terminal `.then` on the .eq()
          // result for the vibe_tags fire-and-forget.
          const updateChain = makeChain(table);
          (updateChain as { eq: (...a: unknown[]) => Promise<unknown> & { then: unknown } }).eq = (...a: unknown[]) => {
            calls.push({ table, method: 'update.eq', args: a });
            const q = queues[`${table}.update.eq`]?.shift();
            const result = q?.isError ? { error: q.value } : { error: null };
            const p = Promise.resolve(result);
            return p as unknown as Promise<unknown> & { then: unknown };
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

  const sessionMock: { value: unknown } = {
    value: { user: { email: 'owner@example.test' }, accessToken: 'test-access-token' },
  };

  return {
    queues,
    calls,
    supabaseMock,
    sessionMock,
    publishSiteMock: vi.fn(async () => ({ success: true, error: null })) as Mock,
    mirrorManifestPhotosMock: vi.fn(async (m: unknown) => m) as Mock,
    queue(key: string, value: unknown, isError?: boolean) {
      queues[key] = queues[key] || [];
      queues[key].push({ value, isError });
    },
    reset() {
      Object.keys(queues).forEach((k) => delete queues[k]);
      calls.length = 0;
      sessionMock.value = {
        user: { email: 'owner@example.test' },
        accessToken: 'test-access-token',
      };
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

vi.mock('@/lib/db', () => ({
  publishSite: h.publishSiteMock,
}));


vi.mock('@/lib/mirror-photos', () => ({
  mirrorManifestPhotos: h.mirrorManifestPhotosMock,
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

function postReq(body: unknown, host = 'pearloom.test'): NextRequest {
  return new NextRequest('http://localhost/api/sites/publish', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', host },
  });
}

// is short-circuited unless a test explicitly clears it.
const fixtureManifest = {
  occasion: 'wedding',
  vibeString: 'sage + olive',
  chapters: [],
};

describe('POST /api/sites/publish — auth + validation', () => {
  beforeEach(() => {
    h.reset();
    h.publishSiteMock.mockClear();
    h.publishSiteMock.mockImplementation(async () => ({ success: true, error: null }));
    h.mirrorManifestPhotosMock.mockClear();
    h.mirrorManifestPhotosMock.mockImplementation(async (m: unknown) => m);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('401 when no session', async () => {
    h.sessionMock.value = null;
    const res = await POST(postReq({ subdomain: 'demo', manifest: fixtureManifest }));
    expect(res.status).toBe(401);
  });

  it('400 when subdomain missing', async () => {
    const res = await POST(postReq({ manifest: fixtureManifest }));
    expect(res.status).toBe(400);
  });

  it('400 when manifest missing', async () => {
    const res = await POST(postReq({ subdomain: 'demo' }));
    expect(res.status).toBe(400);
  });

  it('400 when cleaned subdomain is shorter than 3 characters', async () => {
    // After cleaning, "ab!" → "ab" (2 chars).
    const res = await POST(postReq({ subdomain: 'ab!', manifest: fixtureManifest }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/at least 3/);
  });

  it('400 when subdomain exceeds 63 characters', async () => {
    const res = await POST(postReq({
      subdomain: 'a'.repeat(64),
      manifest: fixtureManifest,
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too long/);
  });

  it('400 when subdomain starts or ends with a hyphen', async () => {
    const r1 = await POST(postReq({ subdomain: '-leading', manifest: fixtureManifest }));
    expect(r1.status).toBe(400);
    const r2 = await POST(postReq({ subdomain: 'trailing-', manifest: fixtureManifest }));
    expect(r2.status).toBe(400);
  });

  it('400 when subdomain is reserved', async () => {
    for (const reserved of ['api', 'admin', 'www', 'dashboard', 'editor', 'sites']) {
      h.reset();
      const res = await POST(postReq({ subdomain: reserved, manifest: fixtureManifest }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/reserved/i);
    }
  });
});

describe('POST /api/sites/publish — ownership gate', () => {
  beforeEach(() => {
    h.reset();
    h.publishSiteMock.mockClear();
    h.publishSiteMock.mockImplementation(async () => ({ success: true, error: null }));
    h.mirrorManifestPhotosMock.mockClear();
    h.mirrorManifestPhotosMock.mockImplementation(async (m: unknown) => m);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('403 when an existing site has a different creator_email', async () => {
    h.queue('sites.maybeSingle', { creator_email: 'someone-else@example.test' });
    const res = await POST(postReq({
      subdomain: 'taken',
      manifest: fixtureManifest,
      names: ['A', 'B'],
    }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/owner/i);

    // CRITICAL: when ownership fails, publishSite MUST NOT be
    // called — otherwise the persist would happen anyway and the
    // 403 would be a lie.
    expect(h.publishSiteMock).not.toHaveBeenCalled();
  });

  it('owner check is case-insensitive (IdP casing drift)', async () => {
    h.sessionMock.value = {
      user: { email: 'Owner@Example.TEST' },
      accessToken: 'tok',
    };
    h.queue('sites.maybeSingle', { creator_email: 'owner@example.test' });
    const res = await POST(postReq({
      subdomain: 'demo',
      manifest: fixtureManifest,
      names: ['A', 'B'],
    }));
    expect(res.status).toBe(200);
    expect(h.publishSiteMock).toHaveBeenCalledOnce();
  });

  it('200 when subdomain does not yet exist — anyone signed in can claim it', async () => {
    h.queue('sites.maybeSingle', null);
    const res = await POST(postReq({
      subdomain: 'fresh',
      manifest: fixtureManifest,
      names: ['A', 'B'],
    }));
    expect(res.status).toBe(200);
    expect(h.publishSiteMock).toHaveBeenCalledOnce();
  });

  it('skips the ownership check gracefully when Supabase env is missing', async () => {
    // Without env vars we can't query sites; route logs and proceeds.
    // This is intentional (dev/test environments without Supabase).
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await POST(postReq({
      subdomain: 'no-sb',
      manifest: fixtureManifest,
      names: ['A', 'B'],
    }));
    expect(res.status).toBe(200);
    expect(h.publishSiteMock).toHaveBeenCalledOnce();
  });
});

describe('POST /api/sites/publish — happy path + URL', () => {
  beforeEach(() => {
    h.reset();
    h.publishSiteMock.mockClear();
    h.publishSiteMock.mockImplementation(async () => ({ success: true, error: null }));
    h.mirrorManifestPhotosMock.mockClear();
    h.mirrorManifestPhotosMock.mockImplementation(async (m: unknown) => m);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('cleans the subdomain (uppercase + special chars stripped, lowercased)', async () => {
    h.queue('sites.maybeSingle', null);
    const res = await POST(postReq({
      subdomain: 'Emma & James!',
      manifest: fixtureManifest,
      names: ['Emma', 'James'],
    }));
    expect(res.status).toBe(200);
    const callArgs = h.publishSiteMock.mock.calls[0];
    expect(callArgs[1]).toBe('emmajames');  // & and ! stripped, spaces stripped
  });

  it('emits an occasion-prefixed canonical URL', async () => {
    h.queue('sites.maybeSingle', null);
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pearloom.com';
    const res = await POST(postReq({
      subdomain: 'emma-and-james',
      manifest: { ...fixtureManifest, occasion: 'wedding' },
      names: ['Emma', 'James'],
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Path-based URL with the occasion prefix.
    expect(json.url).toMatch(/\/wedding\/emma-and-james/);
  });

  it('defaults occasion to wedding when manifest.occasion is missing', async () => {
    h.queue('sites.maybeSingle', null);
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pearloom.com';
    const res = await POST(postReq({
      subdomain: 'memorial-slug',
      manifest: { ...fixtureManifest, occasion: undefined },
      names: ['', ''],
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toMatch(/\/wedding\//);
  });

  it('routes by occasion when explicitly set (memorial / anniversary)', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pearloom.com';
    // memorial
    h.queue('sites.maybeSingle', null);
    const r1 = await POST(postReq({
      subdomain: 'in-memory',
      manifest: { ...fixtureManifest, occasion: 'memorial' },
      names: ['Grace', ''],
    }));
    const j1 = await r1.json();
    expect(j1.url).toMatch(/\/memorial\/in-memory/);
    // anniversary
    h.reset();
    h.queue('sites.maybeSingle', null);
    const r2 = await POST(postReq({
      subdomain: 'ten-years',
      manifest: { ...fixtureManifest, occasion: 'anniversary' },
      names: ['A', 'B'],
    }));
    const j2 = await r2.json();
    expect(j2.url).toMatch(/\/anniversary\/ten-years/);
  });

  it('mirrors manifest photos when session has an accessToken', async () => {
    h.queue('sites.maybeSingle', null);
    await POST(postReq({
      subdomain: 'with-photos',
      manifest: fixtureManifest,
      names: ['A', 'B'],
    }));
    expect(h.mirrorManifestPhotosMock).toHaveBeenCalledOnce();
    const args = h.mirrorManifestPhotosMock.mock.calls[0];
    expect(args[1]).toBe('test-access-token');
    expect(args[2]).toBe('with-photos');
  });

  it('skips photo mirroring when the session has no accessToken', async () => {
    h.sessionMock.value = { user: { email: 'owner@example.test' } };  // no accessToken
    h.queue('sites.maybeSingle', null);
    await POST(postReq({
      subdomain: 'no-token',
      manifest: fixtureManifest,
      names: ['A', 'B'],
    }));
    expect(h.mirrorManifestPhotosMock).not.toHaveBeenCalled();
    expect(h.publishSiteMock).toHaveBeenCalledOnce();
  });
});

describe('POST /api/sites/publish — error paths', () => {
  beforeEach(() => {
    h.reset();
    h.publishSiteMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('400 when publishSite returns success:false with an error message', async () => {
    h.queue('sites.maybeSingle', null);
    h.publishSiteMock.mockImplementationOnce(async () => ({
      success: false,
      error: 'DB constraint violation',
    }));
    const res = await POST(postReq({
      subdomain: 'demo',
      manifest: fixtureManifest,
      names: ['A', 'B'],
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('DB constraint violation');
  });

  it('400 with generic copy when publishSite returns success:false without an error', async () => {
    h.queue('sites.maybeSingle', null);
    h.publishSiteMock.mockImplementationOnce(async () => ({
      success: false,
      error: null as unknown as string,
    }));
    const res = await POST(postReq({
      subdomain: 'demo',
      manifest: fixtureManifest,
      names: ['A', 'B'],
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Failed to publish');
  });

  it('500 with safe copy when publishSite throws', async () => {
    h.queue('sites.maybeSingle', null);
    h.publishSiteMock.mockImplementationOnce(async () => {
      throw new Error('Database connection lost');
    });
    const res = await POST(postReq({
      subdomain: 'demo',
      manifest: fixtureManifest,
      names: ['A', 'B'],
    }));
    expect(res.status).toBe(500);
    const json = await res.json();
    // The route deliberately returns a generic message — we don't
    // want to leak DB internals to clients.
    expect(json.error).toBe('Internal Server Error');
  });
});
