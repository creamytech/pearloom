import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test env.ts which reads process.env at module level.
// Use dynamic imports so we can manipulate process.env before importing.

// validateEnv() checks `typeof window !== 'undefined'` to skip on client.
// In jsdom, window is defined, so we need to remove it for server-side tests.
function withoutWindow<T>(fn: () => T): T {
  const origWindow = globalThis.window;
  // @ts-expect-error - temporarily remove window for server-side simulation
  delete globalThis.window;
  try {
    return fn();
  } finally {
    globalThis.window = origWindow;
  }
}

describe('env object', () => {
  it('exports an env object with expected keys', async () => {
    const { env } = await import('./env');

    // Core Supabase keys
    expect(env).toHaveProperty('SUPABASE_URL');
    expect(env).toHaveProperty('SUPABASE_ANON_KEY');
    expect(env).toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');

    // Auth keys
    expect(env).toHaveProperty('GOOGLE_CLIENT_ID');
    expect(env).toHaveProperty('GOOGLE_CLIENT_SECRET');
    expect(env).toHaveProperty('NEXTAUTH_SECRET');
    expect(env).toHaveProperty('NEXTAUTH_URL');

    // AI keys
    expect(env).toHaveProperty('GOOGLE_AI_KEY');
    expect(env).toHaveProperty('GEMINI_API_KEY');

    // Billing keys
    expect(env).toHaveProperty('STRIPE_SECRET_KEY');
    expect(env).toHaveProperty('STRIPE_WEBHOOK_SECRET');
    expect(env).toHaveProperty('STRIPE_PRO_PRICE_ID');

    // Email
    expect(env).toHaveProperty('RESEND_API_KEY');

    // Storage
    expect(env).toHaveProperty('CLOUDFLARE_ACCOUNT_ID');
    expect(env).toHaveProperty('R2_ACCESS_KEY_ID');
    expect(env).toHaveProperty('R2_SECRET_ACCESS_KEY');
    expect(env).toHaveProperty('R2_BUCKET_NAME');
    expect(env).toHaveProperty('R2_PUBLIC_URL');

    // App
    expect(env).toHaveProperty('SITE_URL');
  });

  it('SITE_URL defaults to localhost when not set', async () => {
    const { env } = await import('./env');
    // When NEXT_PUBLIC_SITE_URL is not set, it should default to localhost
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      expect(env.SITE_URL).toBe('http://localhost:3000');
    }
  });

  it('env values are strings (not undefined)', async () => {
    const { env } = await import('./env');

    // All values should be strings (optional vars default to '')
    for (const [key, value] of Object.entries(env)) {
      expect(typeof value).toBe('string');
    }
  });
});

describe('validateEnv', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Ensure we're not in build phase or client side
    delete process.env.NEXT_PHASE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does not throw (only warns)', async () => {
    const { validateEnv } = await import('./env');

    // Should not throw even with missing vars
    expect(() => withoutWindow(() => validateEnv())).not.toThrow();
  });

  it('warns about missing required variables', async () => {
    const { validateEnv } = await import('./env');

    // Clear all required vars
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;
    delete process.env.GOOGLE_AI_KEY;
    delete process.env.GEMINI_API_KEY;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    withoutWindow(() => validateEnv());

    // Should have warned about missing vars
    expect(warnSpy).toHaveBeenCalled();
    const warnCall = warnSpy.mock.calls.flat().join(' ');
    expect(warnCall).toContain('Missing required environment variables');

    warnSpy.mockRestore();
  });

  it('does not warn about required vars when all are set', async () => {
    const { validateEnv } = await import('./env');

    // Set all required vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.GOOGLE_AI_KEY = 'test-ai-key';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    withoutWindow(() => validateEnv());

    // Should not warn about "Missing required" (may still warn about optional vars)
    const requiredWarns = warnSpy.mock.calls
      .map(args => args.join(' '))
      .filter(msg => msg.includes('Missing required'));
    expect(requiredWarns.length).toBe(0);

    warnSpy.mockRestore();
  });

  it('skips validation during production build phase', async () => {
    const { validateEnv } = await import('./env');

    process.env.NEXT_PHASE = 'phase-production-build';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    withoutWindow(() => validateEnv());

    // Should not produce any warnings during build
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('skips validation on client side (when window is defined)', async () => {
    const { validateEnv } = await import('./env');

    // Clear required vars to provoke warnings
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.GOOGLE_AI_KEY;
    delete process.env.GEMINI_API_KEY;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Call WITHOUT removing window -- should skip and produce no warnings
    validateEnv();

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('warns about optional variables with their consequences', async () => {
    const { validateEnv } = await import('./env');

    // Ensure optional vars are not set
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.RESEND_API_KEY;

    // Set required vars so we get past the required check
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.GOOGLE_AI_KEY = 'test-ai-key';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    withoutWindow(() => validateEnv());

    const allWarnings = warnSpy.mock.calls.map(args => args.join(' ')).join('\n');

    // Should warn about Stripe
    expect(allWarnings).toContain('STRIPE_SECRET_KEY');
    // Should warn about Resend
    expect(allWarnings).toContain('RESEND_API_KEY');

    warnSpy.mockRestore();
  });

  it('requires at least one AI key (GOOGLE_AI_KEY or GEMINI_API_KEY)', async () => {
    const { validateEnv } = await import('./env');

    // Set other required vars but no AI key
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    delete process.env.GOOGLE_AI_KEY;
    delete process.env.GEMINI_API_KEY;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    withoutWindow(() => validateEnv());

    const allWarnings = warnSpy.mock.calls.map(args => args.join(' ')).join('\n');
    expect(allWarnings).toContain('GOOGLE_AI_KEY or GEMINI_API_KEY');

    warnSpy.mockRestore();
  });

  it('does not flag AI key when GEMINI_API_KEY is set (alternative)', async () => {
    const { validateEnv } = await import('./env');

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    delete process.env.GOOGLE_AI_KEY;
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    withoutWindow(() => validateEnv());

    const requiredWarns = warnSpy.mock.calls
      .map(args => args.join(' '))
      .filter(msg => msg.includes('Missing required'));
    expect(requiredWarns.length).toBe(0);

    warnSpy.mockRestore();
  });
});
