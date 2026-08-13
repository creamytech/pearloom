// ─────────────────────────────────────────────────────────────
// Sentry — client (browser)
//
// Loaded once on the first client-side render. Activation gated
// on NEXT_PUBLIC_SENTRY_DSN (client-side env requires the public
// prefix; the server config reads SENTRY_DSN — same project, two
// variables, both should be set in prod with the same DSN).
//
// Replay is wired but heavily downsampled: 0% of normal sessions,
// 100% of sessions that hit an error. That gives us a video of
// what the host did right before the bug, without paying for a
// constant stream of mundane editor sessions.
// ─────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV
      || process.env.NODE_ENV
      || 'development',

    release:
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
      || process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    tracesSampleRate: 0.1,

    // Session replay — only when something actually breaks.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        // Privacy: mask every text node + every input. The site
        // editor + RSVP form + guest portal all carry PII. We'd
        // rather see "[masked]" than ship a guest's email to
        // Sentry by accident.
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    ignoreErrors: [
      // Browser noise outside our control.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Browser extensions injecting scripts.
      /chrome-extension:/,
      /moz-extension:/,
      // Cancellation paths during route navigation.
      'AbortError',
    ],

    initialScope: {
      tags: {
        runtime: 'browser',
        product: 'pearloom',
      },
    },
  });
}
