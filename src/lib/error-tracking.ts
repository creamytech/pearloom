// ─────────────────────────────────────────────────────────────
// Pearloom / lib/error-tracking.ts
//
// Lightweight error-tracking facade. Every consumer (route
// handlers, server components, client utilities) imports
// captureException / captureMessage from here so we have ONE
// place to swap the upstream sink without touching every call site.
//
// Behavior:
//   • Always writes a structured console log + keeps a 50-entry
//     in-memory ring buffer for /api/admin/recent-errors and
//     similar dashboards.
//   • When SENTRY_DSN is configured (server) or
//     NEXT_PUBLIC_SENTRY_DSN (client), forwards to Sentry via
//     the @sentry/nextjs SDK. Wiring (Phase 3.2 of AUDIT-2026-05-29)
//     lives in sentry.{server,client,edge}.config.ts at the repo
//     root — those files gate Sentry.init on the same DSN env vars,
//     so this forwarding becomes a no-op without configuration.
//
// Avoiding the import-cost in unconfigured deploys:
//   The @sentry/nextjs SDK is large. We don't import it at the
//   top of this file because that would force every page to pull
//   it down even when SENTRY_DSN is empty. Instead we lazy-import
//   the first time forwarding actually runs, and cache the
//   instance for subsequent calls.
// ─────────────────────────────────────────────────────────────

type ErrorLevel = 'info' | 'warn' | 'error';

// Map our log levels to Sentry's severity levels — they're close
// but not identical. Sentry accepts 'fatal' too, but we don't
// emit it from this facade.
const SENTRY_LEVEL: Record<ErrorLevel, 'info' | 'warning' | 'error'> = {
  info: 'info',
  warn: 'warning',
  error: 'error',
};

function sentryDsnConfigured(): boolean {
  // Server runtime: SENTRY_DSN. Client runtime: NEXT_PUBLIC_SENTRY_DSN.
  // Either being present means @sentry/nextjs init ran at startup.
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

// Cached Sentry module promise — initialized on first use so
// unconfigured deploys never pay the import cost.
type SentryModule = typeof import('@sentry/nextjs');
let sentryPromise: Promise<SentryModule | null> | null = null;

async function loadSentry(): Promise<SentryModule | null> {
  if (!sentryDsnConfigured()) return null;
  if (sentryPromise) return sentryPromise;
  sentryPromise = import('@sentry/nextjs').catch((err) => {
    // If the SDK fails to load (network glitch, packaging bug),
    // don't crash the host call — just degrade to console-only.
    console.warn('[error-tracking] @sentry/nextjs lazy-load failed:', err);
    return null;
  });
  return sentryPromise;
}

function forwardException(error: unknown, context?: Record<string, unknown>): void {
  // Fire-and-forget — never block the caller on Sentry I/O.
  void loadSentry().then((sentry) => {
    if (!sentry) return;
    sentry.captureException(error, context ? { extra: context } : undefined);
  });
}

function forwardMessage(
  message: string,
  level: ErrorLevel,
  context?: Record<string, unknown>,
): void {
  void loadSentry().then((sentry) => {
    if (!sentry) return;
    sentry.captureMessage(message, {
      level: SENTRY_LEVEL[level],
      ...(context ? { extra: context } : {}),
    });
  });
}

interface TrackedError {
  timestamp: string;
  level: ErrorLevel;
  message: string;
  context?: Record<string, unknown>;
}

// ── Circular buffer ────────────────────────────────────────────

const BUFFER_SIZE = 50;
const errorBuffer: TrackedError[] = [];
let bufferIndex = 0;
let totalInserted = 0;

function pushToBuffer(entry: TrackedError): void {
  if (totalInserted < BUFFER_SIZE) {
    errorBuffer.push(entry);
  } else {
    errorBuffer[bufferIndex] = entry;
  }
  bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
  totalInserted++;
}

// ── Structured log helper ──────────────────────────────────────

function structuredLog(
  level: ErrorLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  const line = `[Pearloom Error] ${timestamp} ${level} ${message}${contextStr}`;

  switch (level) {
    case 'info':
      console.info(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
  }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Capture an exception and record it in the error buffer.
 *
 * Forwards to Sentry when SENTRY_DSN (server) / NEXT_PUBLIC_SENTRY_DSN
 * (client) is configured — see sentry.{server,client,edge}.config.ts.
 * The forward is lazy + fire-and-forget; we never block the caller.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const message =
    error instanceof Error ? error.message : String(error);

  structuredLog('error', message, context);

  pushToBuffer({
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    context,
  });

  forwardException(error, context);
}

/**
 * Capture an arbitrary message at a given severity level.
 *
 * Forwards to Sentry when configured (see captureException).
 */
export function captureMessage(
  message: string,
  level: ErrorLevel = 'info',
  context?: Record<string, unknown>,
): void {
  structuredLog(level, message, context);

  pushToBuffer({
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  });

  forwardMessage(message, level, context);
}

/**
 * Return the most recent tracked errors (up to 50), newest first.
 */
export function getRecentErrors(): TrackedError[] {
  // Return a copy sorted newest-first
  return [...errorBuffer].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/**
 * Count errors recorded within the last `windowMs` milliseconds.
 * Defaults to 5 minutes.
 */
export function countRecentErrors(windowMs: number = 5 * 60 * 1000): number {
  const cutoff = Date.now() - windowMs;
  return errorBuffer.filter(
    (e) => e.level === 'error' && new Date(e.timestamp).getTime() >= cutoff,
  ).length;
}

/**
 * Wrap an async function with automatic error tracking.
 * Useful for API route handlers that want catch-all error capture.
 *
 * @example
 * ```ts
 * const data = await withErrorTracking(
 *   () => fetchExternalService(),
 *   { route: '/api/example' },
 * );
 * ```
 */
export async function withErrorTracking<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    captureException(error, context);
    throw error;
  }
}
