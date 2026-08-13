// ─────────────────────────────────────────────────────────────
// Pearloom / lib/one-pressing.ts
//
// THE MERGE's feature flag (C.5 — REVAMP-EXECUTION-PLAN §9,
// RADICAL-DESIGN §D). "The pressing IS the surface": wizard steps
// become the empty-state prompts of the editor canvas, chrome
// fades in as content lands, and the press becomes an in-place
// transition — no route seam, no double-create class, no handoff
// cliff.
//
// The old wizard remains the DEFAULT and the fallback. This flag
// ships to 100% only when the staging funnel e2e + the wow-moment
// metrics (already instrumented) match or beat the old wizard —
// plan §9's counts-as-done. Until then, every C.5 increment lands
// behind it.
//
// Gates, in precedence order:
//   1. `?press=one` / `?press=classic` on the URL — per-visit
//      override for testing either path on any deploy.
//   2. localStorage 'pl-one-pressing' ('1' on, '0' off) — a dev /
//      dogfooding toggle that survives navigation.
//   3. NEXT_PUBLIC_ONE_PRESSING=1 — the deploy-level default for
//      staged rollout.
//   4. Off.
// ─────────────────────────────────────────────────────────────

export const ONE_PRESSING_STORAGE_KEY = 'pl-one-pressing';

/** Client-side gate — resolves the flag for this visit. Server
 *  components should treat the flag as off (the merged surface is
 *  a client experience; the classic wizard remains the SSR path). */
export function onePressingEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search).get('press');
    if (q === 'one') return true;
    if (q === 'classic') return false;
    const stored = window.localStorage.getItem(ONE_PRESSING_STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch { /* storage blocked — fall through to the deploy default */ }
  return process.env.NEXT_PUBLIC_ONE_PRESSING === '1';
}
