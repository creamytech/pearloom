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

/** Master kill switch. Default ON; set NEXT_PUBLIC_FIRST_PRESSING=0
 *  to ship dark (Wave 1) or to disable the pass entirely. With no
 *  ANTHROPIC_API_KEY the route already returns {} regardless, so the
 *  flag ON + key absent path is byte-identical to today's wizard. */
export const FIRST_PRESSING_ENABLED =
  (process.env.NEXT_PUBLIC_FIRST_PRESSING ?? '1') !== '0';

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
