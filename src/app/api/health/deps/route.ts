// ─────────────────────────────────────────────────────────────
// GET /api/health/deps — the dependency health probe (W.12).
//
// One owner-readable answer to "is this deployment actually
// wired?": database reachable, the once-phantom tables present
// (NEW-USER-REVAMP H5 — user_plans didn't exist in prod while two
// webhooks granted purchases into it), and which optional keys are
// configured. Session-gated; reports presence/booleans only, never
// values.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const REQUIRED_TABLES = [
  'sites', 'guests', 'people', 'user_plans', 'section_analytics',
  'site_invites', 'guestbook_messages', 'account_credentials',
] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const env = {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL
      && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    resend: Boolean(process.env.RESEND_API_KEY),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    r2: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
  };

  const tables: Record<string, boolean> = {};
  let dbReachable = false;
  if (env.supabase) {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    );
    for (const t of REQUIRED_TABLES) {
      const { error } = await sb.from(t).select('*', { head: true, count: 'exact' }).limit(0);
      tables[t] = !error;
      if (!error) dbReachable = true;
    }
  }

  const missingTables = REQUIRED_TABLES.filter((t) => !tables[t]);
  const ok = dbReachable && missingTables.length === 0;

  return NextResponse.json({
    ok,
    dbReachable,
    tables,
    missingTables,
    env,
    checkedAt: new Date().toISOString(),
  }, { status: ok ? 200 : 503 });
}
