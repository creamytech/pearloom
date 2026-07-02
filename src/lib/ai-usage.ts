// ─────────────────────────────────────────────────────────────
// Pearloom / lib/ai-usage.ts
//
// Lightweight in-process AI usage ledger. Zero infra:
//
//   1. Every recorded call emits ONE structured log line —
//      `[ai-usage] {...json...}` — grep-able and parseable by
//      whatever log drain production has.
//   2. A module-level Map keeps a rolling per-day aggregate
//      (keyed by day + provider + model + route) that
//      GET /api/admin/ai-usage exposes.
//
// IMPORTANT — best-effort on serverless: the aggregate lives in
// this process's memory only. On serverless / multi-instance
// deploys each instance has its own ledger and it resets on cold
// start. The log line is the durable record; the in-memory
// summary is a convenience view of *this* instance's lifetime.
// ─────────────────────────────────────────────────────────────

export type AiProvider = 'claude' | 'gemini' | 'openai';

export interface AiUsageEvent {
  provider: AiProvider;
  /** Model id as reported by the provider (date suffixes OK —
   *  pricing is prefix-matched). */
  model: string;
  /** Optional route attribution (e.g. '/api/pear-chat'). The
   *  shared client chokepoints don't know the calling route, so
   *  this is usually undefined there; callers that do know may
   *  pass it for per-route cost visibility. */
  route?: string;
  inputTokens: number;
  outputTokens: number;
  /** Prompt-cache read tokens (Anthropic cache_read_input_tokens /
   *  Gemini cachedContentTokenCount). */
  cacheReadTokens?: number;
  /** Prompt-cache write tokens (Anthropic cache_creation_input_tokens). */
  cacheWriteTokens?: number;
  /** Wall-clock duration of the call in milliseconds (includes
   *  retries when recorded at a retry-wrapping chokepoint). */
  ms: number;
}

// ── Price table ─────────────────────────────────────────────────
// Per-MTok USD. ESTIMATES — update quarterly against the provider
// pricing pages. Matched by longest model-id prefix so dated ids
// like 'claude-haiku-4-5-20251001' resolve to 'claude-haiku-4-5'.
//
// Cache multipliers (applied to the input rate):
//   cache read  ≈ 0.10× input   (Anthropic ephemeral cache reads)
//   cache write ≈ 1.25× input   (Anthropic 5-minute ephemeral writes)
// Gemini's cached-content discount differs slightly; the 0.10×
// figure is close enough for an estimate.
//
// `perImage` entries are flat per-call estimates for image models
// where token accounting is not the dominant cost.
interface PriceEntry {
  /** Model-id prefix to match. */
  prefix: string;
  /** USD per million input tokens. */
  inPerMTok?: number;
  /** USD per million output tokens. */
  outPerMTok?: number;
  /** Flat USD per call (image models). Overrides token pricing. */
  perImage?: number;
}

const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

const PRICE_TABLE: PriceEntry[] = [
  // ── Anthropic (per platform.claude.com/docs pricing) ──
  { prefix: 'claude-opus-4-8', inPerMTok: 5, outPerMTok: 25 },
  { prefix: 'claude-opus-4-7', inPerMTok: 5, outPerMTok: 25 },
  { prefix: 'claude-sonnet-4-6', inPerMTok: 3, outPerMTok: 15 },
  { prefix: 'claude-haiku-4-5', inPerMTok: 1, outPerMTok: 5 },
  // ── Gemini (figures from ai.google.dev pricing; pro is a
  //    preview model so its figure is a rougher estimate) ──
  { prefix: 'gemini-3.1-pro', inPerMTok: 2, outPerMTok: 12 },
  { prefix: 'gemini-3.5-flash', inPerMTok: 1.5, outPerMTok: 9 },
  { prefix: 'gemini-3.1-flash-lite', inPerMTok: 0.25, outPerMTok: 1.5 },
  // Image preview ("Nano Banana") — flat per-image estimate.
  { prefix: 'gemini-3.1-flash-image', perImage: 0.04 },
  // ── OpenAI image gen (vibe-engine / image-router) ──
  { prefix: 'gpt-image-2', perImage: 0.06 },
];

function priceFor(model: string): PriceEntry | null {
  let best: PriceEntry | null = null;
  for (const entry of PRICE_TABLE) {
    if (model.startsWith(entry.prefix) && (!best || entry.prefix.length > best.prefix.length)) {
      best = entry;
    }
  }
  return best;
}

/** Estimate the USD cost of a single call. Returns null when the
 *  model isn't in the price table (still logged + aggregated with
 *  cost 0 so the gap is visible). */
export function estimateCostUsd(event: AiUsageEvent): number | null {
  const price = priceFor(event.model);
  if (!price) return null;
  if (price.perImage !== undefined) return price.perImage;
  const inRate = price.inPerMTok ?? 0;
  const outRate = price.outPerMTok ?? 0;
  const usd =
    (event.inputTokens * inRate +
      event.outputTokens * outRate +
      (event.cacheReadTokens ?? 0) * inRate * CACHE_READ_MULTIPLIER +
      (event.cacheWriteTokens ?? 0) * inRate * CACHE_WRITE_MULTIPLIER) /
    1_000_000;
  // 6 decimal places — sub-cent precision without float noise.
  return Math.round(usd * 1_000_000) / 1_000_000;
}

// ── In-memory rolling aggregate ─────────────────────────────────

export interface AiUsageBucket {
  day: string; // YYYY-MM-DD (UTC)
  provider: AiProvider;
  model: string;
  route: string; // '(unattributed)' when the chokepoint had no route context
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalMs: number;
  estCostUsd: number;
}

const MAX_DAY_BUCKETS = 7; // rolling window — older days are pruned
const PROCESS_STARTED_AT = new Date().toISOString();

const buckets = new Map<string, AiUsageBucket>();

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function pruneOldDays(): void {
  const days = new Set<string>();
  for (const b of buckets.values()) days.add(b.day);
  if (days.size <= MAX_DAY_BUCKETS) return;
  const sorted = [...days].sort(); // ascending — oldest first
  const drop = new Set(sorted.slice(0, sorted.length - MAX_DAY_BUCKETS));
  for (const [key, b] of buckets) {
    if (drop.has(b.day)) buckets.delete(key);
  }
}

/**
 * Record one AI call. Never throws — observability must not be
 * able to break the request path.
 */
export function recordAiUsage(event: AiUsageEvent): void {
  try {
    const estCostUsd = estimateCostUsd(event);
    const route = event.route ?? '(unattributed)';
    const day = utcDay();

    // 1. The durable record: one grep-able structured log line.
    console.log(
      '[ai-usage]',
      JSON.stringify({
        ts: new Date().toISOString(),
        provider: event.provider,
        model: event.model,
        route,
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
        cacheReadTokens: event.cacheReadTokens ?? 0,
        cacheWriteTokens: event.cacheWriteTokens ?? 0,
        ms: event.ms,
        estCostUsd,
      })
    );

    // 2. The in-memory rolling aggregate (this instance only).
    const key = `${day}|${event.provider}|${event.model}|${route}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        day,
        provider: event.provider,
        model: event.model,
        route,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalMs: 0,
        estCostUsd: 0,
      };
      buckets.set(key, bucket);
      pruneOldDays();
    }
    bucket.calls += 1;
    bucket.inputTokens += event.inputTokens;
    bucket.outputTokens += event.outputTokens;
    bucket.cacheReadTokens += event.cacheReadTokens ?? 0;
    bucket.cacheWriteTokens += event.cacheWriteTokens ?? 0;
    bucket.totalMs += event.ms;
    bucket.estCostUsd = Math.round((bucket.estCostUsd + (estCostUsd ?? 0)) * 1_000_000) / 1_000_000;
  } catch (err) {
    // Last-resort guard — never let accounting break a model call.
    console.error('[ai-usage] record failed:', err);
  }
}

export interface AiUsageSummary {
  /** When this process started — the aggregate covers this
   *  instance's lifetime only (best-effort on serverless). */
  processStartedAt: string;
  generatedAt: string;
  totals: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    estCostUsd: number;
  };
  /** Per day+provider+model+route rows, newest day first. */
  buckets: AiUsageBucket[];
}

/** Snapshot of the in-memory aggregate. */
export function getAiUsageSummary(): AiUsageSummary {
  const rows = [...buckets.values()].sort(
    (a, b) => b.day.localeCompare(a.day) || b.estCostUsd - a.estCostUsd
  );
  const totals = rows.reduce(
    (acc, r) => {
      acc.calls += r.calls;
      acc.inputTokens += r.inputTokens;
      acc.outputTokens += r.outputTokens;
      acc.cacheReadTokens += r.cacheReadTokens;
      acc.cacheWriteTokens += r.cacheWriteTokens;
      acc.estCostUsd = Math.round((acc.estCostUsd + r.estCostUsd) * 1_000_000) / 1_000_000;
      return acc;
    },
    { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, estCostUsd: 0 }
  );
  return {
    processStartedAt: PROCESS_STARTED_AT,
    generatedAt: new Date().toISOString(),
    totals,
    buckets: rows,
  };
}
