// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/cron/email/route.ts
// Cron endpoint for processing scheduled emails.
//
// Called by Vercel Cron or an external scheduler (e.g. every
// 5 minutes). Checks the `scheduled_emails` table for due
// emails, sends them via Resend, and marks them as sent.
//
// Protected by CRON_SECRET env var — the request must include
// an Authorization header with `Bearer <CRON_SECRET>`.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { processScheduledEmails } from '@/lib/email-sequences';

export const dynamic = 'force-dynamic';

// Vercel cron timeout is 10s on Hobby, 60s on Pro — keep it reasonable
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    // Authenticate via CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[cron/email] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron/email] Processing scheduled emails...');

    const result = await processScheduledEmails();

    console.log(
      `[cron/email] Done — processed: ${result.processed}, sent: ${result.sent}, failed: ${result.failed}`
    );

    if (result.errors.length > 0) {
      console.warn('[cron/email] Errors:', result.errors);
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[cron/email] Route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
