'use client';

// ─────────────────────────────────────────────────────────────
// ErrorTelemetry — invisible client-error capture (PERSONA-PLAN
// S8, the glass box). Tester crashes used to vanish; now the
// first few errors per pageview reach the product_events spine
// as 'client_error' rows (message + source + route, never PII,
// never user content).
//
// Bounded hard: max 5 reports per mount, deduped by message, and
// the beacon itself is fire-and-forget (a failing telemetry POST
// can never cascade). Mounted once in the root layout.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/beacon';

const MAX_REPORTS = 5;

export function ErrorTelemetry() {
  useEffect(() => {
    let sent = 0;
    const seen = new Set<string>();
    const report = (kind: string, message: unknown, source?: unknown) => {
      try {
        if (sent >= MAX_REPORTS) return;
        const msg = String(message ?? '').trim().slice(0, 300);
        if (!msg || seen.has(msg)) return;
        seen.add(msg);
        sent += 1;
        trackEvent('client_error', {
          kind,
          message: msg,
          source: String(source ?? '').slice(0, 140),
          route: window.location.pathname,
        });
      } catch { /* telemetry never throws */ }
    };
    const onError = (e: ErrorEvent) => report('error', e.message, e.filename);
    const onReject = (e: PromiseRejectionEvent) =>
      report('unhandledrejection', e.reason instanceof Error ? e.reason.message : e.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
    };
  }, []);
  return null;
}
