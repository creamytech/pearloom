// ─────────────────────────────────────────────────────────────
// Pearloom / lib/error-tracking.ts
// Lightweight error tracking infrastructure.
// Works standalone with structured console logging; designed
// for easy Sentry integration when SENTRY_DSN is configured.
// ─────────────────────────────────────────────────────────────

type ErrorLevel = 'info' | 'warn' | 'error';

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
 * If `process.env.SENTRY_DSN` is set, this is the integration point
 * where `Sentry.captureException(error, { extra: context })` should
 * be called after initializing the Sentry SDK.
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

  // TODO: When SENTRY_DSN is configured, forward to Sentry here.
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context });
  // }
}

/**
 * Capture an arbitrary message at a given severity level.
 *
 * If `process.env.SENTRY_DSN` is set, this is the integration point
 * where `Sentry.captureMessage(message, level)` should be called.
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

  // TODO: When SENTRY_DSN is configured, forward to Sentry here.
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureMessage(message, level);
  // }
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
