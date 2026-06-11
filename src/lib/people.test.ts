// people.ts — identity-merge key + privacy-boundary contracts.
import { describe, expect, it } from 'vitest';
import { normalizePersonEmail, personHistoryForHost } from './people';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('normalizePersonEmail', () => {
  it('lowercases and trims — the merge key is canonical', () => {
    expect(normalizePersonEmail('  Maria.Alvarez@Example.COM ')).toBe('maria.alvarez@example.com');
  });

  it('rejects non-emails and non-strings', () => {
    expect(normalizePersonEmail('')).toBeNull();
    expect(normalizePersonEmail('not-an-email')).toBeNull();
    expect(normalizePersonEmail('a@b')).toBeNull();
    expect(normalizePersonEmail(null)).toBeNull();
    expect(normalizePersonEmail(42)).toBeNull();
  });
});

describe('personHistoryForHost', () => {
  it('returns empty without a valid email or host — never queries', async () => {
    const explosive = new Proxy({}, {
      get() { throw new Error('must not touch supabase'); },
    }) as unknown as SupabaseClient;
    expect(await personHistoryForHost(explosive, { email: 'nope', hostEmail: 'host@x.com' }))
      .toEqual({ history: [], dietary: null });
    expect(await personHistoryForHost(explosive, { email: 'a@b.com', hostEmail: '' }))
      .toEqual({ history: [], dietary: null });
  });

  it('only queries sites owned by the host (privacy boundary)', async () => {
    const filters: Array<{ column: string; value: unknown }> = [];
    type Chain = Record<string, unknown>;
    function chain(result: unknown): Chain {
      const c: Chain = {};
      const self = new Proxy(c, {
        get(_t, prop: string) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void) => resolve(result);
          }
          return (...args: unknown[]) => {
            if (prop === 'eq' || prop === 'in' || prop === 'ilike') {
              filters.push({ column: String(args[0]), value: args[1] });
            }
            if (prop === 'maybeSingle') return Promise.resolve(result);
            return self;
          };
        },
      });
      return self;
    }
    const fake = {
      from(table: string) {
        if (table === 'sites') return chain({ data: [] });
        if (table === 'people') return chain({ data: null });
        return chain({ data: [] });
      },
    } as unknown as SupabaseClient;

    await personHistoryForHost(fake, { email: 'Guest@X.com', hostEmail: 'Host@Y.com' });
    expect(filters).toContainEqual({ column: 'site_config->>creator_email', value: 'host@y.com' });
  });
});
