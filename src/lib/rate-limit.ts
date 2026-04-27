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

// ─── Monthly Pear message counter ──────────────────────────
// Tracks total AI actions per user per calendar month.
// Shares a single counter across all AI endpoints.

const pearMonthlyStore = new Map<string, { count: number; month: string }>();

/** Get the current month key (e.g. "2026-04") */
function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const PEAR_MONTHLY_LIMIT = 15;

export interface PearUsageResult {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  month: string;
}

/**
 * Check and optionally consume a Pear AI usage credit for the given user.
 * All AI endpoints share the same monthly counter.
 * Returns whether the request is allowed and how many remain.
 */
export function checkPearUsage(userEmail: string): PearUsageResult {
  const month = currentMonthKey();
  const key = `pear:${userEmail}`;
  const entry = pearMonthlyStore.get(key);

  // Reset if new month
  if (!entry || entry.month !== month) {
    pearMonthlyStore.set(key, { count: 1, month });
    return { allowed: true, remaining: PEAR_MONTHLY_LIMIT - 1, used: 1, limit: PEAR_MONTHLY_LIMIT, month };
  }

  if (entry.count >= PEAR_MONTHLY_LIMIT) {
    return { allowed: false, remaining: 0, used: entry.count, limit: PEAR_MONTHLY_LIMIT, month };
  }

  entry.count += 1;
  pearMonthlyStore.set(key, entry);
  return { allowed: true, remaining: PEAR_MONTHLY_LIMIT - entry.count, used: entry.count, limit: PEAR_MONTHLY_LIMIT, month };
}

/**
 * Peek at Pear usage without consuming a credit.
 */
export function peekPearUsage(userEmail: string): PearUsageResult {
  const month = currentMonthKey();
  const key = `pear:${userEmail}`;
  const entry = pearMonthlyStore.get(key);

  if (!entry || entry.month !== month) {
    return { allowed: true, remaining: PEAR_MONTHLY_LIMIT, used: 0, limit: PEAR_MONTHLY_LIMIT, month };
  }

  return {
    allowed: entry.count < PEAR_MONTHLY_LIMIT,
    remaining: Math.max(0, PEAR_MONTHLY_LIMIT - entry.count),
    used: entry.count,
    limit: PEAR_MONTHLY_LIMIT,
    month,
  };
}

// ─── Convenience: check Pear usage + plan in one call ───────
// Returns null if allowed (with remaining info), or a Response if blocked.

import { getUserPlan } from '@/lib/db';

export interface PearGateResult {
  isUnlimited: boolean;
  plan: string;
  remaining?: number;
}

/**
 * Check whether a user can make a Pear AI request.
 * Pro/Premium/Atelier/Legacy users are unlimited.
 * Free users are subject to PEAR_MONTHLY_LIMIT per calendar month.
 *
 * Returns `{ blocked: Response }` if the user has exceeded their limit,
 * or `{ gate: PearGateResult }` with remaining info.
 */
export async function checkPearGate(userEmail: string): Promise<
  { blocked: Response; gate?: undefined } | { blocked?: undefined; gate: PearGateResult }
> {
  const planRow = await getUserPlan(userEmail).catch(() => null);
  const plan = (planRow?.plan ?? 'free').toLowerCase();
  const isUnlimited = plan === 'pro' || plan === 'atelier' || plan === 'premium' || plan === 'legacy';

  if (isUnlimited) {
    return { gate: { isUnlimited: true, plan } };
  }

  const usage = checkPearUsage(userEmail);
  if (!usage.allowed) {
    const body = { error: 'limit_reached', remaining: 0, limit: PEAR_MONTHLY_LIMIT, plan: 'free' };
    return {
      blocked: Response.json(body, { status: 429, headers: { 'X-Pear-Remaining': '0' } }),
    };
  }

  return { gate: { isUnlimited: false, plan: 'free', remaining: usage.remaining } };
}

/**
 * Build response headers for Pear usage tracking.
 */
export function pearHeaders(gate: PearGateResult): Record<string, string> {
  return {
    'X-Pear-Remaining': gate.isUnlimited ? 'unlimited' : String(gate.remaining ?? 0),
  };
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
  /** Pear messages — 15 per month for free users (monthly window) */
  pearMessages: { max: PEAR_MONTHLY_LIMIT, windowMs: 30 * 24 * 60 * 60 * 1000 },
} as const;
