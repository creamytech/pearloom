// ─────────────────────────────────────────────────────────────
// The E2E auth-bypass gate — a CI invariant, not a code-review
// assumption.
//
// lib/auth.ts registers a test-only credentials provider (id
// 'e2e') that signs in as E2E_TEST_USER_EMAIL without a real
// password check against the database. It is gated on
// PEARLOOM_E2E === '1' AND NODE_ENV !== 'production', evaluated
// at module load. These tests import the module fresh under each
// env combination and assert the provider list directly:
//
//   - production + flag set     → provider ABSENT  (the invariant)
//   - production + flag unset   → provider absent
//   - non-production + flag set → provider present (proves the
//     assertion above isn't vacuously passing on a dead gate)
//   - non-production + no flag  → provider absent
//
// If someone weakens the gate — drops the NODE_ENV check, inverts
// the flag, hardcodes it on — the first test fails in CI.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type ProviderLike = { id?: string; options?: { id?: string } };

async function providerIdsUnder(env: Record<string, string | undefined>): Promise<string[]> {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) vi.stubEnv(k, '');
    else vi.stubEnv(k, v);
  }
  const { authOptions } = await import('./auth');
  // next-auth v4: a custom provider id lives in options.id; the
  // top-level id is the provider-type default ('credentials').
  return (authOptions.providers as ProviderLike[]).map(
    (p) => p.options?.id ?? p.id ?? '',
  );
}

describe('E2E auth-bypass provider gate', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('NEVER registers the e2e provider when NODE_ENV=production, even with the flag set', async () => {
    const ids = await providerIdsUnder({
      NODE_ENV: 'production',
      PEARLOOM_E2E: '1',
      E2E_TEST_USER_EMAIL: 'e2e@example.com',
      E2E_TEST_USER_PASSWORD: 'hunter2',
    });
    expect(ids).not.toContain('e2e');
  });

  it('does not register the e2e provider in production with the flag unset', async () => {
    const ids = await providerIdsUnder({ NODE_ENV: 'production', PEARLOOM_E2E: undefined });
    expect(ids).not.toContain('e2e');
  });

  it('registers the e2e provider outside production when the flag is set (gate is live, not dead)', async () => {
    const ids = await providerIdsUnder({ NODE_ENV: 'test', PEARLOOM_E2E: '1' });
    expect(ids).toContain('e2e');
  });

  it('does not register the e2e provider outside production without the flag', async () => {
    const ids = await providerIdsUnder({ NODE_ENV: 'development', PEARLOOM_E2E: undefined });
    expect(ids).not.toContain('e2e');
  });

  it('requires the exact flag value "1" — "true"/"yes" do not arm it', async () => {
    for (const v of ['true', 'yes', 'on', '2']) {
      const ids = await providerIdsUnder({ NODE_ENV: 'test', PEARLOOM_E2E: v });
      expect(ids, `PEARLOOM_E2E=${v} must not arm the provider`).not.toContain('e2e');
    }
  });

  it('the real sign-in providers are registered regardless of the gate', async () => {
    const ids = await providerIdsUnder({ NODE_ENV: 'production', PEARLOOM_E2E: undefined });
    expect(ids).toContain('google');
    expect(ids).toContain('google-onetap');
    expect(ids).toContain('credentials');
  });
});
