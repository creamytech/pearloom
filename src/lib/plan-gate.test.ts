// ─────────────────────────────────────────────────────────────
// plan-gate — the entitlement choke point.
//
// Pins: tier ranking + canonical aliases, PLAN_LIMITS shape, the
// grief exemption, and checkGuestCapacity — the ONE gate every
// host-initiated guest writer calls (/api/guests, /import,
// /copy-from, /from-person). If a test here fails, a billing gate
// or the published "grief deserves no paywall" promise broke.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// getUserPlan reaches Supabase — stub it per-test.
vi.mock('@/lib/db', () => ({
  getUserPlan: vi.fn(),
}));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import {
  getLimitsForPlan,
  PLAN_LIMITS,
  isPlanSufficient,
  canonicalPlan,
  planMarketingLabel,
  isGriefExempt,
  planLimitResponseBody,
  checkGuestCapacity,
  checkCoHostCapacity,
} from './plan-gate';
import { getUserPlan } from '@/lib/db';

const mockGetUserPlan = vi.mocked(getUserPlan);

/** Derived, never hardcoded — the ladder's numbers are a product
 *  decision that moves; the CONTRACT these tests defend does not. */
const FREE_GUESTS = PLAN_LIMITS.FREE.maxGuests;

// ─── A minimal fake Supabase client for the two queries the gate
//     runs: the sites occasion lookup + the guests head-count. ───

function fakeDb(opts: {
  occasion?: string | null;
  guestCount?: number | null;
  coHostCount?: number | null;
  countError?: boolean;
  siteLookupThrows?: boolean;
}) {
  return {
    from(table: string) {
      if (table === 'sites') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (opts.siteLookupThrows) throw new Error('db down');
                return { data: { occasion: opts.occasion ?? null, configOccasion: null } };
              },
            }),
          }),
        };
      }
      if (table === 'cohosts') {
        return {
          select: () => ({
            eq: async () => ({
              count: opts.countError ? null : (opts.coHostCount ?? 0),
              error: opts.countError ? new Error('count failed') : null,
            }),
          }),
        };
      }
      // guests head-count
      return {
        select: () => ({
          eq: async () => ({
            count: opts.countError ? null : (opts.guestCount ?? 0),
            error: opts.countError ? new Error('count failed') : null,
          }),
        }),
      };
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Pure helpers ────────────────────────────────────────────

describe('plan resolution', () => {
  it('maps every alias to its canonical tier + limits', () => {
    expect(getLimitsForPlan('journal')).toBe(PLAN_LIMITS.FREE);
    expect(getLimitsForPlan('free')).toBe(PLAN_LIMITS.FREE);
    expect(getLimitsForPlan('atelier')).toBe(PLAN_LIMITS.PRO);
    expect(getLimitsForPlan('pro')).toBe(PLAN_LIMITS.PRO);
    expect(getLimitsForPlan('legacy')).toBe(PLAN_LIMITS.PREMIUM);
    expect(getLimitsForPlan('premium')).toBe(PLAN_LIMITS.PREMIUM);
    // Unknown strings NEVER grant more than free.
    expect(getLimitsForPlan('vip')).toBe(PLAN_LIMITS.FREE);
    expect(getLimitsForPlan('')).toBe(PLAN_LIMITS.FREE);
  });

  it('ranks tiers: free < pro < premium, aliases equal', () => {
    expect(isPlanSufficient('atelier', 'pro')).toBe(true);
    expect(isPlanSufficient('journal', 'pro')).toBe(false);
    expect(isPlanSufficient('legacy', 'atelier')).toBe(true);
    expect(isPlanSufficient('pro', 'premium')).toBe(false);
    // Unknown plan is free-rank; unknown requirement is free-rank.
    expect(isPlanSufficient('mystery', 'pro')).toBe(false);
    expect(isPlanSufficient('free', 'mystery')).toBe(true);
  });

  it('marketing labels follow the pricing-page vocabulary', () => {
    expect(planMarketingLabel('free')).toBe('Page');
    expect(planMarketingLabel('pro')).toBe('Pass');
    expect(planMarketingLabel('premium')).toBe('Keepsake');
    // New marketing aliases resolve…
    expect(planMarketingLabel('page')).toBe('Page');
    expect(planMarketingLabel('pass')).toBe('Pass');
    expect(planMarketingLabel('keepsake')).toBe('Keepsake');
    // …and so do the RETIRED ones still sitting in older user_plans
    // rows — an existing paying account must never read as free.
    expect(planMarketingLabel('journal')).toBe('Page');
    expect(planMarketingLabel('atelier')).toBe('Pass');
    expect(planMarketingLabel('legacy')).toBe('Keepsake');
    expect(canonicalPlan('atelier')).toBe('pro');
    expect(canonicalPlan('pass')).toBe('pro');
    expect(canonicalPlan('keepsake')).toBe('premium');
  });

  it('the 402 body carries the machine-readable PLAN_LIMIT code', () => {
    const body = planLimitResponseBody('guests', 50, 'free');
    expect(body.code).toBe('PLAN_LIMIT');
    expect(body.limit).toBe(50);
    expect(body.currentPlan).toBe('free');
    expect(body.upgradeUrl).toContain('upgrade');
  });
});

describe('grief exemption', () => {
  it('covers memorial + funeral, case/space-insensitively, and nothing else', () => {
    expect(isGriefExempt('memorial')).toBe(true);
    expect(isGriefExempt('funeral')).toBe(true);
    expect(isGriefExempt(' Memorial ')).toBe(true);
    expect(isGriefExempt('wedding')).toBe(false);
    expect(isGriefExempt('anniversary')).toBe(false);
    expect(isGriefExempt(null)).toBe(false);
    expect(isGriefExempt(undefined)).toBe(false);
    expect(isGriefExempt('')).toBe(false);
  });
});

// ─── checkGuestCapacity — the choke point ────────────────────

describe('checkGuestCapacity', () => {
  it('rejects with 402 + allowed when the add would exceed the cap', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    const db = fakeDb({ occasion: 'wedding', guestCount: FREE_GUESTS });
    const res = await checkGuestCapacity(db, 'host@x.com', 'site-1', 1);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(402);
      expect(res.body.code).toBe('PLAN_LIMIT');
      expect(res.body.allowed).toBe(0);
    }
  });

  it('allows when under the cap', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    const db = fakeDb({ occasion: 'wedding', guestCount: FREE_GUESTS - 1 });
    expect((await checkGuestCapacity(db, 'host@x.com', 'site-1', 1)).ok).toBe(true);
  });

  it('rejects a batch that would cross the cap, reporting the remaining room', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    const db = fakeDb({ occasion: 'wedding' });
    const res = await checkGuestCapacity(db, 'host@x.com', 'site-1', 20, {
      currentCount: FREE_GUESTS - 10,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.body.allowed).toBe(10);
  });

  it('uses the caller-supplied currentCount without querying', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    // countError would fail the query path — currentCount must win.
    const db = fakeDb({ occasion: 'wedding', countError: true });
    const res = await checkGuestCapacity(db, 'host@x.com', 'site-1', 1, { currentCount: FREE_GUESTS });
    expect(res.ok).toBe(false);
  });

  it('NEVER caps a memorial or funeral site (the published promise)', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    for (const occasion of ['memorial', 'funeral']) {
      const db = fakeDb({ occasion, guestCount: 10_000 });
      expect((await checkGuestCapacity(db, 'host@x.com', 'site-1', 500)).ok).toBe(true);
    }
  });

  it('unlimited plans are never capped', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'legacy' } as never);
    const db = fakeDb({ occasion: 'wedding', guestCount: 100_000 });
    expect((await checkGuestCapacity(db, 'host@x.com', 'site-1', 1)).ok).toBe(true);
  });

  it('fails OPEN when the count query errors', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    const db = fakeDb({ occasion: 'wedding', countError: true });
    expect((await checkGuestCapacity(db, 'host@x.com', 'site-1', 1)).ok).toBe(true);
  });

  it('a plan-lookup failure downgrades to FREE limits, never to unlimited', async () => {
    // getUserPlan rejecting inside getPlanWithLimitsForEmail resolves
    // the plan to 'free' (it catches internally) — the capacity math
    // still runs with free caps. A DB outage must not open a billing
    // hole; the count-query fail-open above keeps saves resilient.
    mockGetUserPlan.mockRejectedValue(new Error('supabase unreachable'));
    const db = fakeDb({ occasion: 'wedding', guestCount: 999 });
    const res = await checkGuestCapacity(db, 'host@x.com', 'site-1', 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.body.currentPlan).toBe('free');
  });
});

// ─── Co-host capacity ────────────────────────────────────────
//
// This gate went live on 2026-08-05 with explicit owner sign-off,
// and the promise attached to it is the thing these tests defend:
// TURNING ON A GATE MUST NOT EVICT ANYONE. A celebration already
// being run by three people keeps all three. Only the NEXT
// invitation is refused.

const FREE_COHOSTS = PLAN_LIMITS.FREE.maxCoHosts;

describe('checkCoHostCapacity', () => {
  it('lets a free host invite their partner — the common case', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    const r = await checkCoHostCapacity(fakeDb({ coHostCount: 0 }), 'a@b.com', 'site-1');
    expect(r.ok).toBe(true);
  });

  it('refuses the one past the limit, with a 402 and plain words', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    const r = await checkCoHostCapacity(fakeDb({ coHostCount: FREE_COHOSTS }), 'a@b.com', 'site-1');
    expect(r.ok).toBe(false);
    expect(r.status).toBe(402);
    expect(String(r.body?.error)).toMatch(/co-host/i);
    expect(String(r.body?.error)).not.toMatch(/limit for your plan \(/);  // the generic copy is overridden
  });

  it('NEVER evicts: a site already over the limit keeps everyone', async () => {
    // The check is consulted only when ADDING. Being over the limit
    // refuses the next invite and does nothing to the people already
    // helping run the celebration.
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    const r = await checkCoHostCapacity(fakeDb({ coHostCount: 5 }), 'a@b.com', 'site-1');
    expect(r.ok).toBe(false);
    expect(r.status).toBe(402);
    // No removal instruction of any kind in the response.
    expect(JSON.stringify(r.body ?? {})).not.toMatch(/remove|revoke|delete/i);
  });

  it('never limits a paid plan', async () => {
    for (const plan of ['pro', 'pass', 'premium', 'keepsake', 'atelier', 'legacy']) {
      mockGetUserPlan.mockResolvedValue({ plan } as never);
      const r = await checkCoHostCapacity(fakeDb({ coHostCount: 99 }), 'a@b.com', 'site-1');
      expect(r.ok, plan).toBe(true);
    }
  });

  it('never limits a memorial — the grief promise outranks the ladder', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    for (const occasion of ['memorial', 'funeral']) {
      const r = await checkCoHostCapacity(
        fakeDb({ occasion, coHostCount: 99 }), 'a@b.com', 'site-1',
      );
      expect(r.ok, occasion).toBe(true);
    }
  });

  it('FAILS OPEN when the count errors — never block inviting a partner', async () => {
    mockGetUserPlan.mockResolvedValue({ plan: 'free' } as never);
    const r = await checkCoHostCapacity(fakeDb({ countError: true }), 'a@b.com', 'site-1');
    expect(r.ok).toBe(true);
  });

  it('treats an unreachable plan lookup as FREE, not as unlimited', async () => {
    // Documenting real, pre-existing behaviour rather than the one I
    // assumed: getPlanWithLimitsForEmail deliberately defaults to
    // FREE on any lookup error, shared with the guest gate. So an
    // outage degrades a paid host to free LIMITS — an inconvenience
    // — instead of handing everyone unlimited entitlements. The
    // fail-open path above covers the case that actually matters:
    // the COUNT failing, where we can't tell how many exist.
    mockGetUserPlan.mockRejectedValue(new Error('db down'));
    const r = await checkCoHostCapacity(fakeDb({ coHostCount: 99 }), 'a@b.com', 'site-1');
    expect(r.ok).toBe(false);
    expect(r.status).toBe(402);
  });

  it('still lets a first co-host through during a plan-lookup outage', async () => {
    // The degradation must not block the common case: a host adding
    // their partner while our plan table is unreachable.
    mockGetUserPlan.mockRejectedValue(new Error('db down'));
    const r = await checkCoHostCapacity(fakeDb({ coHostCount: 0 }), 'a@b.com', 'site-1');
    expect(r.ok).toBe(true);
  });
});
