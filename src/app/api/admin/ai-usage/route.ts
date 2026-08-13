// ─────────────────────────────────────────────────────────────
// GET /api/admin/ai-usage
//
// AI cost observability for the house admins: the in-process
// usage ledger from src/lib/ai-usage.ts — per day + provider +
// model + route call counts, token totals, and estimated USD.
//
// NOTE: the summary reflects THIS instance's process lifetime
// only (in-memory, best-effort on serverless / multi-instance
// deploys — see `processStartedAt`). The durable record is the
// `[ai-usage]` structured log line each call emits; grep the
// production logs for the full picture.
//
// Admin-gated via lib/admin.ts; non-admins get 404 (not 403) so
// the route doesn't advertise itself — same pattern as the other
// /api/admin routes.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getAiUsageSummary } from '@/lib/ai-usage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...getAiUsageSummary() });
}
