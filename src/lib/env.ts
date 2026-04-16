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

  // AI — Gemini is used for image/SVG art; Claude for story + agents.
  GOOGLE_AI_KEY: optional('GOOGLE_AI_KEY'),
  GEMINI_API_KEY: optional('GEMINI_API_KEY'),
  ANTHROPIC_API_KEY: optional('ANTHROPIC_API_KEY'),

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

  // Voice (post-event film)
  ELEVENLABS_API_KEY: optional('ELEVENLABS_API_KEY'),
  ELEVENLABS_VOICE_ID: optional('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM'),

  // External film render worker (receives a webhook when a job
  // enters the 'rendering' stage). If absent, the film completes
  // with a storyboard artifact only — Stage 4 is a no-op.
  FILM_RENDERER_WEBHOOK_URL: optional('FILM_RENDERER_WEBHOOK_URL'),
  FILM_RENDERER_WEBHOOK_SECRET: optional('FILM_RENDERER_WEBHOOK_SECRET'),

  // Cron auth
  CRON_SECRET: optional('CRON_SECRET'),
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

  // AI keys: Gemini for art (required); Claude for story/agents (strongly recommended)
  if (!process.env.GOOGLE_AI_KEY && !process.env.GEMINI_API_KEY) {
    missing.push('GOOGLE_AI_KEY or GEMINI_API_KEY (needed for AI art generation)');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      '[env] ANTHROPIC_API_KEY is not set — Claude story generation, Pear chat, and the Event Director will fall back to Gemini.'
    );
  }

  if (missing.length > 0) {
    // Warn instead of throw — don't crash the app in dev/preview
    console.warn(
      `\n⚠️  [Pearloom] Missing required environment variables:\n` +
        missing.map((v) => `  - ${v}`).join('\n') +
        `\n\n  Set these in your .env.local file or deployment environment.\n` +
        `  Some features will be unavailable.\n`
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
