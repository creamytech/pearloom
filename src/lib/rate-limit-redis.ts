// ─────────────────────────────────────────────────────────────
// Pearloom / lib/rate-limit-redis.ts
//
// Upstash Redis-backed rate limiter — the multi-region-safe
// counterpart to the in-memory limiter in rate-limit.ts.
//
// Why this exists:
//   The in-memory limiter uses a per-process Map. On a single
//   instance (dev, Vercel preview) that's fine. In multi-region
//   production each region runs its own process, so a caller can
//   exceed the limit by N× by hitting N regions in parallel.
//   Redis is shared state — every region INCRs the same counter.
//
// Algorithm:
//   Fixed-window approximation. Window length = config.windowMs.
//   Bucket key includes floor(now / windowMs) so the counter
//   resets cleanly at each window boundary. Two Redis ops per
//   call: INCR (atomic) + EXPIRE (on first hit only — Upstash
//   ignores EXPIRE on a key that already has a TTL, so we just
//   always send it; cost is the same).
//
//   This is NOT a true sliding window. A caller could burst at
//   the very end of one window and the very start of the next
//   and effectively get 2× the limit briefly. For our threat
//   model (multi-region abuse prevention) that's an acceptable
//   trade for simplicity + cost.
//
// Activation:
//   Detected at module load via UPSTASH_REDIS_REST_URL +
//   UPSTASH_REDIS_REST_TOKEN. If either is missing, isRedisRateLimitEnabled()
//   returns false and callers fall through to the in-memory path.
//
// Public API stays stable:
//   checkRateLimitAsync(key, config) returns the same RateLimitResult
//   shape as the sync in-memory checkRateLimit. Callers can swap
//   one for the other without touching response handling.
// ─────────────────────────────────────────────────────────────

import { Redis } from '@upstash/redis';
import type { RateLimitConfig, RateLimitResult } from './rate-limit';
import { checkRateLimit as checkRateLimitInMemory } from './rate-limit';

// Module-level singleton — re-uses the underlying fetch agent
// across calls. Cheap to construct but no reason to do it every
// request.
let client: Redis | null = null;

/**
 * Returns true when Upstash env vars are set and the Redis
 * limiter should be used. False otherwise — callers fall through
 * to the in-memory limiter.
 */
export function isRedisRateLimitEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getClient(): Redis | null {
  if (!isRedisRateLimitEnabled()) return null;
  if (client) return client;
  client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return client;
}

/** For tests only — drops the cached client so env-var changes are picked up. */
export function _resetRedisClient(): void {
  client = null;
}

/**
 * Fixed-window bucket key. Each window gets its own key so the
 * counter resets cleanly at the boundary and stale keys expire
 * on their own (no GC required).
 */
function bucketKey(key: string, windowMs: number, now: number): string {
  const bucket = Math.floor(now / windowMs);
  return `rl:${key}:${bucket}`;
}

/**
 * Redis-backed rate-limit check. Returns the same RateLimitResult
 * shape as the in-memory limiter.
 *
 * On any Redis error (network, auth, upstream 5xx) we fail OPEN
 * to the in-memory limiter rather than failing closed — losing
 * a few requests to in-memory drift is preferable to taking the
 * endpoint down because Upstash had a hiccup.
 */
export async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const redis = getClient();
  if (!redis) {
    // Should never happen if callers check isRedisRateLimitEnabled
    // first, but defend anyway.
    return checkRateLimitInMemory(key, config);
  }

  const now = Date.now();
  const bucket = bucketKey(key, config.windowMs, now);
  const ttlSeconds = Math.max(1, Math.ceil(config.windowMs / 1000));

  try {
    // INCR is atomic — race-safe across regions.
    const count = await redis.incr(bucket);

    // EXPIRE on every call is cheap and idempotent. Upstash treats
    // subsequent EXPIRE calls as a no-op on a key with an existing
    // TTL when using NX semantics, but the default behavior just
    // refreshes — for a fixed-window bucket the bucket key already
    // encodes the window so refreshing the TTL doesn't shift the
    // window. We set TTL only on the first hit to avoid extending
    // the bucket lifetime past its natural expiry.
    if (count === 1) {
      await redis.expire(bucket, ttlSeconds);
    }

    const allowed = count <= config.max;
    const remaining = Math.max(0, config.max - count);
    // Reset = end of the current window. Fixed-window: window end
    // is (bucket + 1) * windowMs.
    const bucketIndex = Math.floor(now / config.windowMs);
    const resetAt = (bucketIndex + 1) * config.windowMs;

    return { allowed, remaining, resetAt };
  } catch (err) {
    // Fail open to in-memory. Logged so prod alerts can pick this
    // up if it becomes a sustained pattern (likely indicating
    // Upstash misconfiguration or an outage).
    console.warn('[rate-limit-redis] falling through to in-memory:', err);
    return checkRateLimitInMemory(key, config);
  }
}

/**
 * Unified async rate-limit check. Uses Redis when env vars are
 * set, otherwise falls through to the in-memory limiter. Callers
 * only need to await; the routing is transparent.
 *
 * Public signature is intentionally identical to the in-memory
 * checkRateLimit (same input + output) — just async.
 */
export async function checkRateLimitAsync(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  if (isRedisRateLimitEnabled()) {
    return checkRateLimitRedis(key, config);
  }
  return checkRateLimitInMemory(key, config);
}
