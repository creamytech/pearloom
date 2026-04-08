// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/health/route.ts
// Health check endpoint for monitoring and load balancer probes.
// Returns application status, version, uptime, and recent error
// counts — no authentication required.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { countRecentErrors } from '@/lib/error-tracking';

export const dynamic = 'force-dynamic';

const APP_VERSION = process.env.npm_package_version ?? '0.1.0';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: APP_VERSION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    recentErrors: countRecentErrors(),
  });
}
