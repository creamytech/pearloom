// ─────────────────────────────────────────────────────────────
// Pearloom / lib/ai-budget.test.ts
//
// Pins the enforcement contract for the per-account daily AI cap:
//   • overBudget only blocks on a CONFIRMED over-cap read
//   • overBudget FAILS OPEN on missing config / read error / throw
//   • chargeAi issues the atomic increment RPC and swallows failure
//   • centsForUsage floors at 1 so every charged call moves the meter
//   • budgetKey falls back to ip: for anonymous callers
//
// The Supabase client is mocked so no network is touched.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  maybeSingle: { data: null as unknown, error: null as unknown },
  maybeSingleThrows: false,
  rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
  rpcResult: { error: null as unknown },
}));

vi.mock('@supabase/supabase-js', () => {
  type Builder = {
    select: () => Builder;
    eq: () => Builder;
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  };
  const makeBuilder = (): Builder => {
    const b: Builder = {
      select: () => b,
      eq: () => b,
      maybeSingle: async () => {
        if (h.maybeSingleThrows) throw new Error('boom');
        return h.maybeSingle;
      },
    };
    return b;
  };
  return {
    createClient: () => ({
      from: () => makeBuilder(),
      rpc: async (name: string, args: Record<string, unknown>) => {
        h.rpcCalls.push({ name, args });
        return h.rpcResult;
      },
    }),
  };
});

import {
  overBudget,
  chargeAi,
  centsForUsage,
  budgetKey,
  approxTokens,
  AI_DAILY_CAP_CENTS,
} from './ai-budget';

beforeEach(() => {
  h.maybeSingle = { data: null, error: null };
  h.maybeSingleThrows = false;
  h.rpcCalls.length = 0;
  h.rpcResult = { error: null };
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-key';
  delete process.env.AI_DAILY_CAP_CENTS;
});

describe('AI_DAILY_CAP_CENTS', () => {
  it('defaults to $5.00 (500 cents)', () => {
    expect(AI_DAILY_CAP_CENTS).toBe(500);
  });
});

describe('budgetKey', () => {
  it('uses the lowercased account email when present', () => {
    expect(budgetKey('Host@Example.COM', '1.2.3.4')).toBe('host@example.com');
  });
  it('falls back to an ip: key for anonymous callers', () => {
    expect(budgetKey(null, '1.2.3.4')).toBe('ip:1.2.3.4');
    expect(budgetKey('', '5.6.7.8')).toBe('ip:5.6.7.8');
  });
  it('never collapses to an empty key', () => {
    expect(budgetKey(undefined, '')).toBe('ip:unknown');
  });
});

describe('centsForUsage', () => {
  it('floors at 1 cent so a cheap / un-priced call still moves the meter', () => {
    // Unknown model → estimateCostUsd null → still 1 cent.
    expect(centsForUsage({ provider: 'gemini', model: 'no-such-model', inputTokens: 10, outputTokens: 10, ms: 0 })).toBe(1);
    // Tiny real cost rounds UP to 1.
    expect(centsForUsage({ provider: 'gemini', model: 'gemini-3.1-flash-lite-preview', inputTokens: 100, outputTokens: 100, ms: 0 })).toBe(1);
  });
  it('scales with a real, expensive call', () => {
    // Opus output at $25/MTok: 1,000,000 tokens = $25.00 = 2500 cents.
    const cents = centsForUsage({ provider: 'claude', model: 'claude-opus-4-8', inputTokens: 0, outputTokens: 1_000_000, ms: 0 });
    expect(cents).toBe(2500);
  });
});

describe('approxTokens', () => {
  it('estimates ~4 chars per token', () => {
    expect(approxTokens('12345678')).toBe(2);
    expect(approxTokens('')).toBe(0);
  });
});

describe('overBudget', () => {
  it('returns false when today spend is under the cap', async () => {
    h.maybeSingle = { data: { cents: 100 }, error: null };
    expect(await overBudget('host@example.com')).toBe(false);
  });

  it('returns true only when today spend has reached the cap', async () => {
    h.maybeSingle = { data: { cents: AI_DAILY_CAP_CENTS }, error: null };
    expect(await overBudget('host@example.com')).toBe(true);
    h.maybeSingle = { data: { cents: AI_DAILY_CAP_CENTS + 50 }, error: null };
    expect(await overBudget('host@example.com')).toBe(true);
  });

  it('fails OPEN when there is no row yet (data null)', async () => {
    h.maybeSingle = { data: null, error: null };
    expect(await overBudget('host@example.com')).toBe(false);
  });

  it('fails OPEN on a read error (never blocks a legit request on a DB blip)', async () => {
    h.maybeSingle = { data: { cents: 99999 }, error: { message: 'db down' } };
    expect(await overBudget('host@example.com')).toBe(false);
  });

  it('fails OPEN when the query throws', async () => {
    h.maybeSingleThrows = true;
    expect(await overBudget('host@example.com')).toBe(false);
  });

  it('fails OPEN when Supabase is not configured', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Even with cents way over the cap in the mock, no client → allow.
    h.maybeSingle = { data: { cents: 99999 }, error: null };
    expect(await overBudget('host@example.com')).toBe(false);
  });
});

describe('chargeAi', () => {
  it('issues the atomic increment RPC with the right args', async () => {
    await chargeAi('host@example.com', 7);
    expect(h.rpcCalls).toHaveLength(1);
    expect(h.rpcCalls[0].name).toBe('increment_ai_spend');
    expect(h.rpcCalls[0].args.p_email).toBe('host@example.com');
    expect(h.rpcCalls[0].args.p_cents).toBe(7);
    // Day is today's UTC date, YYYY-MM-DD.
    expect(h.rpcCalls[0].args.p_day).toBe(new Date().toISOString().slice(0, 10));
  });

  it('rounds fractional cents', async () => {
    await chargeAi('host@example.com', 2.6);
    expect(h.rpcCalls[0].args.p_cents).toBe(3);
  });

  it('is a no-op for zero / negative / non-finite charges', async () => {
    await chargeAi('host@example.com', 0);
    await chargeAi('host@example.com', -5);
    await chargeAi('host@example.com', Number.NaN);
    expect(h.rpcCalls).toHaveLength(0);
  });

  it('never throws when the RPC returns an error', async () => {
    h.rpcResult = { error: { message: 'rpc failed' } };
    await expect(chargeAi('host@example.com', 5)).resolves.toBeUndefined();
  });

  it('is a no-op (no throw) when Supabase is not configured', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(chargeAi('host@example.com', 5)).resolves.toBeUndefined();
    expect(h.rpcCalls).toHaveLength(0);
  });
});
