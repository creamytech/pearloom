// ─────────────────────────────────────────────────────────────
// Pearloom / lib/notifications/feed.test.ts
//
// Focused coverage for the collaborative-split source added to the
// notification feed (20260706_group_split.sql): a new group expense
// on a bachelor/ette / reunion site becomes a bell item. Also pins
// the per-source isolation contract — a missing `expenses` table on
// an older deployment must drop that source, never the whole feed.
//
// The mock is a thenable query chain: every builder method returns
// the chain, `await chain` resolves to { data: rows }, and
// .maybeSingle() resolves to the first row. Unlisted tables resolve
// empty, so only the split source produces items here.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchNotificationFeed } from './feed';

function makeSupabase(
  byTable: Record<string, unknown[]>,
  throwTables: Set<string> = new Set(),
): SupabaseClient {
  return {
    from(table: string) {
      const rows = byTable[table] ?? [];
      const fail = throwTables.has(table);
      const chain: Record<string, unknown> = {};
      const methods = ['select', 'eq', 'neq', 'not', 'gte', 'lte', 'is', 'or', 'order', 'limit', 'in'];
      for (const m of methods) chain[m] = () => chain;
      // Lazy so an un-awaited reject never becomes an unhandled rejection.
      chain.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        (fail
          ? Promise.reject(new Error(`missing:${table}`))
          : Promise.resolve({ data: rows, error: null })
        ).then(res, rej);
      chain.maybeSingle = () =>
        fail
          ? Promise.reject(new Error(`missing:${table}`))
          : Promise.resolve({ data: rows[0] ?? null, error: null });
      chain.single = chain.maybeSingle;
      return chain;
    },
  } as unknown as SupabaseClient;
}

const SITE = '11111111-2222-4333-8444-555555555555';
const SINCE = '2026-07-01T00:00:00.000Z';

describe('fetchNotificationFeed — split expenses', () => {
  it('surfaces a new shared expense as a split feed item with the payer first name', async () => {
    const sb = makeSupabase({
      expenses: [
        {
          id: 'e1',
          description: 'Dinner',
          amount_cents: 24000,
          payer_id: 'p1',
          created_at: '2026-07-05T12:00:00.000Z',
        },
      ],
      participants: [{ id: 'p1', display_name: 'Ben Carter' }],
    });

    const items = await fetchNotificationFeed(sb, SITE, SINCE);
    const split = items.find((i) => i.kind === 'split');
    expect(split).toBeDefined();
    expect(split!.id).toBe('split-e1');
    expect(split!.label).toBe('New shared expense: Dinner · $240 by Ben');
    expect(split!.href).toBe('/dashboard/budget');
    expect(split!.category).toBe('gifts');
    // Stored row → its own created_at is the deterministic fire moment.
    expect(split!.createdAt).toBe('2026-07-05T12:00:00.000Z');
  });

  it('falls back to a name-less label when the payer is unknown', async () => {
    const sb = makeSupabase({
      expenses: [
        { id: 'e2', description: 'Cabin', amount_cents: 150000, payer_id: null, created_at: '2026-07-05T09:00:00.000Z' },
      ],
    });
    const items = await fetchNotificationFeed(sb, SITE, SINCE);
    const split = items.find((i) => i.kind === 'split');
    expect(split).toBeDefined();
    expect(split!.label).toBe('New shared expense: Cabin · $1,500');
  });

  it('drops the split source (not the whole feed) when the expenses table is missing', async () => {
    const sb = makeSupabase({}, new Set(['expenses']));
    const items = await fetchNotificationFeed(sb, SITE, SINCE);
    expect(Array.isArray(items)).toBe(true);
    expect(items.find((i) => i.kind === 'split')).toBeUndefined();
  });
});
