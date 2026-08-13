// ─────────────────────────────────────────────────────────────
// Pearloom / lib/first-pressing/client.ts
//
// draftFirstPressing — the thin client helper the wizard's
// handleFinish calls during the generate moment. POSTs the seeded
// manifest to /api/wizard/draft under a hard latency ceiling and
// returns the DraftResult (merged fill-only by mergeDraft).
//
// STRICTLY ADDITIVE. Any failure — abort/timeout, network error,
// non-2xx (unconfigured, gated, rate-limited, 500), malformed JSON —
// resolves to `{}` so the caller falls through to today's seeded
// manifest. The site ALWAYS generates. See FIRST-PRESSING-PLAN §6.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { DraftResult } from './schema';

/** Master switch. Default OFF — First Pressing puts a real (paid,
 *  ~$0.02) Claude call on the wizard's critical generation path, so
 *  it stays dark until an operator deliberately turns it on:
 *  set NEXT_PUBLIC_FIRST_PRESSING=1 (and provide ANTHROPIC_API_KEY).
 *  Recommended: enable in staging, do one real wizard→editor run to
 *  confirm the drafted content + reveal feel right, THEN enable in
 *  prod. With the flag off (or ON but the key absent — the route
 *  returns {} regardless) the wizard is byte-identical to today. */
export const FIRST_PRESSING_ENABLED =
  process.env.NEXT_PUBLIC_FIRST_PRESSING === '1';

/** Hard latency ceiling (ms). The press floor covers the perceived
 *  time; this caps the real wait so the moment never drags past
 *  ~10–12s total. */
export const DEFAULT_DRAFT_BUDGET_MS = 9000;

export async function draftFirstPressing(
  manifest: StoryManifest,
  opts: { budgetMs?: number; signal?: AbortSignal } = {},
): Promise<DraftResult> {
  const budgetMs = opts.budgetMs ?? DEFAULT_DRAFT_BUDGET_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);

  // Chain an externally-provided signal (belt-and-braces) so a caller
  // that aborts its own flow also aborts the draft.
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch('/api/wizard/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest }),
      signal: controller.signal,
    });
    if (!res.ok) return {};
    const data = (await res.json().catch(() => null)) as { drafted?: DraftResult } | null;
    const drafted = data?.drafted;
    return drafted && typeof drafted === 'object' ? drafted : {};
  } catch {
    // abort / timeout / network — fall through to the seeded manifest
    return {};
  } finally {
    clearTimeout(timer);
  }
}
