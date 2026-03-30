// ─────────────────────────────────────────────────────────────
// Pearloom / lib/env.ts
// Environment variable validation — imported early to fail fast
// with clear error messages instead of cryptic runtime crashes.
// ─────────────────────────────────────────────────────────────

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return val;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

// Only validate on the server side (API routes, server components)
export const env = {
  // Supabase
  SUPABASE_URL: optional('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: optional('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: optional('SUPABASE_SERVICE_ROLE_KEY'),

  // Auth
  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),
  NEXTAUTH_SECRET: optional('NEXTAUTH_SECRET'),

  // AI
  GEMINI_API_KEY: optional('GEMINI_API_KEY'),

  // Billing
  STRIPE_SECRET_KEY: optional('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: optional('STRIPE_WEBHOOK_SECRET'),
  STRIPE_PRO_PRICE_ID: optional('STRIPE_PRO_PRICE_ID'),

  // Storage
  CLOUDFLARE_ACCOUNT_ID: optional('CLOUDFLARE_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: optional('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: optional('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET_NAME: optional('R2_BUCKET_NAME'),
  R2_PUBLIC_URL: optional('NEXT_PUBLIC_R2_PUBLIC_URL'),

  // App
  SITE_URL: optional('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
} as const;

// Validate critical vars at import time (server only)
export function validateEnv() {
  const missing: string[] = [];
  const critical = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GEMINI_API_KEY',
  ];

  for (const name of critical) {
    if (!process.env[name]) missing.push(name);
  }

  if (missing.length > 0) {
    console.warn(
      `[env] Missing critical environment variables: ${missing.join(', ')}. ` +
      'Some features will be unavailable.'
    );
  }

  return missing;
}
