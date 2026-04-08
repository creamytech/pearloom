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
  SUPABASE_ANON_KEY: optional('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: optional('SUPABASE_SERVICE_ROLE_KEY'),

  // Auth
  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),
  NEXTAUTH_SECRET: optional('NEXTAUTH_SECRET'),
  NEXTAUTH_URL: optional('NEXTAUTH_URL'),

  // AI — accept either key name
  GOOGLE_AI_KEY: optional('GOOGLE_AI_KEY'),
  GEMINI_API_KEY: optional('GEMINI_API_KEY'),

  // Billing
  STRIPE_SECRET_KEY: optional('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: optional('STRIPE_WEBHOOK_SECRET'),
  STRIPE_PRO_PRICE_ID: optional('STRIPE_PRO_PRICE_ID'),

  // Email
  RESEND_API_KEY: optional('RESEND_API_KEY'),

  // Storage
  CLOUDFLARE_ACCOUNT_ID: optional('CLOUDFLARE_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: optional('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: optional('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET_NAME: optional('R2_BUCKET_NAME'),
  R2_PUBLIC_URL: optional('NEXT_PUBLIC_R2_PUBLIC_URL'),

  // App
  SITE_URL: optional('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
} as const;

// ─────────────────────────────────────────────────────────────
// validateEnv() — call at module level in layout.tsx so it runs
// once on server startup.  Throws if any required vars are
// missing; logs warnings for optional ones.
// ─────────────────────────────────────────────────────────────
export function validateEnv() {
  // Skip validation during build time (env vars may not be present)
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (typeof window !== 'undefined') return; // Client-side — skip

  // --- Required vars (at least one AI key is needed) ---
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];

  const missing: string[] = [];

  for (const name of requiredVars) {
    if (!process.env[name]) missing.push(name);
  }

  // AI key: require at least one of GOOGLE_AI_KEY or GEMINI_API_KEY
  if (!process.env.GOOGLE_AI_KEY && !process.env.GEMINI_API_KEY) {
    missing.push('GOOGLE_AI_KEY or GEMINI_API_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables:\n` +
        missing.map((v) => `  - ${v}`).join('\n') +
        `\n\nSet these in your .env.local file or deployment environment.`
    );
  }

  // --- Optional vars — warn but don't block startup ---
  const optionalVars: Record<string, string> = {
    STRIPE_SECRET_KEY: 'Stripe payments will be unavailable',
    STRIPE_WEBHOOK_SECRET: 'Stripe webhooks will not be verified',
    RESEND_API_KEY: 'Email sending will be unavailable',
    CLOUDFLARE_ACCOUNT_ID: 'R2 storage will be unavailable',
    R2_ACCESS_KEY_ID: 'R2 storage will be unavailable',
    R2_SECRET_ACCESS_KEY: 'R2 storage will be unavailable',
    R2_BUCKET_NAME: 'R2 storage will be unavailable',
    NEXT_PUBLIC_R2_PUBLIC_URL: 'R2 public URLs will be unavailable',
  };

  for (const [name, consequence] of Object.entries(optionalVars)) {
    if (!process.env[name]) {
      console.warn(`[env] Optional variable ${name} is not set. ${consequence}.`);
    }
  }
}
