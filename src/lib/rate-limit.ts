// ─────────────────────────────────────────────────────────────
// Pearloom / lib/rate-limit.ts
// In-memory sliding-window rate limiter for API routes.
// Works on serverless (Vercel) with per-instance memory.
// For production at scale, swap to Redis/Vercel KV.
// ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Max requests allowed within the window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (e.g. IP address or user email).
 * Returns whether the request is allowed and how many requests remain.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  cleanup(config.windowMs);

  const entry = store.get(key) || { timestamps: [] };
  const cutoff = now - config.windowMs;
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);

  if (entry.timestamps.length >= config.max) {
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestInWindow + config.windowMs,
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    allowed: true,
    remaining: config.max - entry.timestamps.length,
    resetAt: now + config.windowMs,
  };
}

/**
 * Extract client IP from a Next.js request.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

/** Pre-configured rate limits for common endpoints */
export const RATE_LIMITS = {
  /** AI generation — expensive, 5 per hour per user */
  aiGenerate: { max: 5, windowMs: 60 * 60 * 1000 },
  /** AI blocks — moderate, 20 per hour per user */
  aiBlocks: { max: 20, windowMs: 60 * 60 * 1000 },
  /** RSVP submissions — 10 per minute per IP */
  rsvp: { max: 10, windowMs: 60 * 1000 },
  /** Guestbook — 5 per minute per IP */
  guestbook: { max: 5, windowMs: 60 * 1000 },
  /** AI rewrite — 30 per hour per user */
  aiRewrite: { max: 30, windowMs: 60 * 60 * 1000 },
  /** Site health analysis — 10 per hour per user */
  siteHealth: { max: 10, windowMs: 60 * 60 * 1000 },
  /** Data export — 10 per hour per user (GDPR compliance) */
  dataExport: { max: 10, windowMs: 60 * 60 * 1000 },
  /** AI hotel finder — 15 per hour per user */
  aiHotels: { max: 15, windowMs: 60 * 60 * 1000 },
  /** AI meal generation — 15 per hour per user */
  aiMeals: { max: 15, windowMs: 60 * 60 * 1000 },
} as const;
