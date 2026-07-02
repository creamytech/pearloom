// ─────────────────────────────────────────────────────────────
// Sentry — edge runtime
//
// Loaded by middleware.ts and any route that opts into
// `runtime = 'edge'`. The edge runtime is a stripped-down
// V8 environment — no Node APIs, no fs, no setTimeout/setInterval
// across the request boundary — so we keep this minimal.
//
// Most Pearloom routes run on the Node runtime; this file exists
// so middleware exceptions still reach Sentry.
// ─────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

    release:
      process.env.VERCEL_GIT_COMMIT_SHA
      || process.env.SENTRY_RELEASE,

    tracesSampleRate: 0.1,

    ignoreErrors: [
      'AbortError',
      'The user aborted a request',
    ],

    initialScope: {
      tags: {
        runtime: 'edge',
        product: 'pearloom',
      },
    },
  });
}
