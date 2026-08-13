// people.ts — identity-merge key + privacy-boundary contracts.
import { describe, expect, it } from 'vitest';
import {
  normalizePersonEmail,
  personHistoryForHost,
  resolveGuestToken,
  familiarFacesForPerson,
} from './people';
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

describe('resolveGuestToken', () => {
  it('rejects junk tokens without touching the database', async () => {
    const explosive = new Proxy({}, {
      get() { throw new Error('must not touch supabase'); },
    }) as unknown as SupabaseClient;
    expect(await resolveGuestToken(explosive, null)).toBeNull();
    expect(await resolveGuestToken(explosive, '')).toBeNull();
    expect(await resolveGuestToken(explosive, 'short')).toBeNull();
    expect(await resolveGuestToken(explosive, 'x'.repeat(81))).toBeNull();
    expect(await resolveGuestToken(explosive, 12345)).toBeNull();
  });
});

describe('familiarFacesForPerson', () => {
  it('enforces the mutual opt-in gate on the people query', async () => {
    const peopleFilters: Array<{ column: string; value: unknown }> = [];
    type Chain = Record<string, unknown>;
    function chain(result: unknown, record?: typeof peopleFilters): Chain {
      const c: Chain = {};
      const self = new Proxy(c, {
        get(_t, prop: string) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void) => resolve(result);
          }
          return (...args: unknown[]) => {
            if (record && (prop === 'eq' || prop === 'in')) {
              record.push({ column: String(args[0]), value: args[1] });
            }
            return self;
          };
        },
      });
      return self;
    }
    let guestsCall = 0;
    const fake = {
      from(table: string) {
        if (table === 'people') {
          return chain({ data: [{ id: 'p2', display_name: 'Maria Alvarez' }] }, peopleFilters);
        }
        guestsCall += 1;
        // 1: my other sites · 2: this site's roster · 3: overlap
        if (guestsCall === 1) return chain({ data: [{ site_id: 's-old' }] });
        if (guestsCall === 2) return chain({ data: [{ person_id: 'p2' }, { person_id: 'p1' }] });
        return chain({ data: [{ person_id: 'p2' }] });
      },
    } as unknown as SupabaseClient;

    const faces = await familiarFacesForPerson(fake, { personId: 'p1', siteId: 's-now' });
    // The candidates' OWN opt-in must be part of the final query …
    expect(peopleFilters).toContainEqual({ column: 'connections_opt_in', value: true });
    // … and only first names ever leave the function.
    expect(faces).toEqual([{ personId: 'p2', firstName: 'Maria' }]);
  });
});
