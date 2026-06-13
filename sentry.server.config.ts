// ─────────────────────────────────────────────────────────────
// Sentry — server runtime (Node.js)
//
// Loaded by @sentry/nextjs in route handlers, server components,
// middleware, and any Node-runtime API code path.
//
// Activation is gated entirely on SENTRY_DSN being present in the
// environment. Without it, Sentry.init is skipped and every
// Sentry.captureException call (see src/lib/error-tracking.ts) is
// a structured console log only. This keeps dev + preview + any
// unconfigured Pearloom deploy working without a Sentry project.
//
// Sample rates are tuned for a wedding-platform traffic shape:
//   - tracesSampleRate 0.1 — 10% of requests get a transaction
//     trace. Plenty for finding p95 regressions without paying
//     to ingest every single autosave POST.
//   - errors are NOT sampled (default sampleRate = 1.0) — we want
//     every exception, no exceptions.
// ─────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

    // Release tagging — tie each error to the git SHA that shipped it.
    // VERCEL_GIT_COMMIT_SHA is populated automatically on Vercel; falls
    // back to `local-${pid}` on other hosts so issues at least cluster
    // per process instead of merging into one giant bucket.
    release:
      process.env.VERCEL_GIT_COMMIT_SHA
      || process.env.SENTRY_RELEASE
      || (typeof process !== 'undefined' && process.pid ? `local-${process.pid}` : undefined),

    tracesSampleRate: 0.1,

    // Don't enable replay on the server runtime — it's a browser feature.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Strip noise from common dependencies we don't own.
    ignoreErrors: [
      // Vercel cancellation noise — request aborted before handler ran.
      'AbortError',
      'The user aborted a request',
      // NextAuth's expected JWT-expiry path is not a bug.
      'JWTSessionError',
    ],

    // Surface Pearloom-specific tags so the Sentry UI can filter
    // every event by route family / runtime at a glance.
    initialScope: {
      tags: {
        runtime: 'node',
        product: 'pearloom',
      },
    },
  });
}
