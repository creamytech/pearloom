// ─────────────────────────────────────────────────────────────
// Pearloom / lib/first-pressing/clear-on-edit.ts
//
// The honesty surface for First Pressing drafts (Waves 3–4).
//
// mergeDraft (merge.ts) records every field it drafted in
// manifest.draftedByPear (a Record<field-path, true>) and, on a
// solemn (memorial/funeral) story write, sets manifest.pearReviewRequired.
// This module is the PURE logic that lets a host make those drafts
// theirs:
//
//   • clearDraftedPath — drop one field-path from draftedByPear when
//     the host edits or clears that field. Recomputes pearReviewRequired
//     (it clears once no drafted story path remains — a host who
//     genuinely edits the drafted words satisfies the solemn gate
//     naturally). NEVER mutates the input.
//   • publishNeedsReview — the solemn publish gate: does this manifest
//     still require an explicit "I've read them" before it can go live?
//   • acknowledgeReview — the "I've read them" action: clears the flag,
//     leaves the badges intact.
//
// All pure + unit-tested (clear-on-edit.test.ts) — the honesty-critical
// logic doesn't depend on a browser or a DB.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

type Loose = Record<string, unknown>;

const SOLEMN_OCCASIONS = new Set(['memorial', 'funeral']);

/**
 * A drafted field-path that counts as story/obituary/tribute content —
 * the highest-risk, solemn-review-gated copy. The wizard draft pass
 * writes storySection.* today; obituary/tribute prefixes are covered
 * so a future draft slot inherits the guardrail for free.
 */
export function isStoryDraftPath(path: string): boolean {
  return (
    path.startsWith('storySection.') ||
    path.startsWith('obituary') ||
    path.startsWith('tribute')
  );
}

function draftedMap(m: StoryManifest): Record<string, boolean> | undefined {
  const d = (m as unknown as Loose).draftedByPear;
  return d && typeof d === 'object' ? (d as Record<string, boolean>) : undefined;
}

/** True when a field-path is currently flagged as drafted-by-Pear. */
export function isDrafted(m: StoryManifest, path: string): boolean {
  const d = draftedMap(m);
  return !!d && d[path] === true;
}

/** True when any drafted story/obituary/tribute path remains. */
export function hasDraftedStoryPaths(m: StoryManifest): boolean {
  const d = draftedMap(m);
  if (!d) return false;
  return Object.keys(d).some((p) => d[p] && isStoryDraftPath(p));
}

/**
 * Remove one drafted path from draftedByPear (the host has made this
 * field theirs). Recomputes pearReviewRequired — it clears once no
 * drafted story path is left. Returns the SAME reference when the
 * path wasn't flagged, so a keystroke on a non-drafted field is a
 * genuine no-op. Never mutates the input.
 */
export function clearDraftedPath(m: StoryManifest, path: string): StoryManifest {
  const d = draftedMap(m);
  if (!d || d[path] !== true) return m;

  const nextDrafted = { ...d };
  delete nextDrafted[path];

  const out = { ...(m as unknown as Loose) } as Loose;
  if (Object.keys(nextDrafted).length === 0) delete out.draftedByPear;
  else out.draftedByPear = nextDrafted;

  // Solemn guardrail: once no drafted story words remain, the review
  // flag has nothing left to guard.
  if (out.pearReviewRequired && !hasDraftedStoryPaths(out as unknown as StoryManifest)) {
    delete out.pearReviewRequired;
  }
  return out as unknown as StoryManifest;
}

/** Clear several drafted paths in one pass (used when one control
 *  writes more than one field-path, e.g. the hero tagline). */
export function clearDraftedPaths(m: StoryManifest, paths: readonly string[]): StoryManifest {
  let out = m;
  for (const p of paths) out = clearDraftedPath(out, p);
  return out;
}

/**
 * The solemn publish gate. True when a memorial/funeral site still
 * carries Pear-drafted story words the family hasn't read/edited/
 * acknowledged — the publish flow must show a re-read interstitial
 * first (FIRST-PRESSING-PLAN §5).
 */
export function publishNeedsReview(m: StoryManifest): boolean {
  const occasion = (m as unknown as { occasion?: string }).occasion ?? '';
  if (!SOLEMN_OCCASIONS.has(occasion)) return false;
  if ((m as unknown as { pearReviewRequired?: boolean }).pearReviewRequired !== true) return false;
  return hasDraftedStoryPaths(m);
}

/**
 * The "I've read them" acknowledgement — clears pearReviewRequired
 * (unblocking publish) while leaving the draftedByPear badges intact.
 * Returns the same reference when there's nothing to clear.
 */
export function acknowledgeReview(m: StoryManifest): StoryManifest {
  if ((m as unknown as { pearReviewRequired?: boolean }).pearReviewRequired !== true) return m;
  const out = { ...(m as unknown as Loose) };
  delete out.pearReviewRequired;
  return out as unknown as StoryManifest;
}
