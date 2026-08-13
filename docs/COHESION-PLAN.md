# COHESION-PLAN — One Surface (the app feel)

> Owner brief (2026-08-13): "make the product feel cohesive like an
> app — everything connected, not jumping from web page to web page;
> the transitions and everything should feel smooth and all in one."
>
> This plan turns that into verifiable engineering. BRAND §6 is the
> motion constitution (things *thread in*, they don't cut); the
> (shell)/loading.tsx decision is LAW (dashboard tab switches stay
> instant — no fades inside the shell).

---

## §1 · The audit (2026-08-13, local stack)

What actually breaks the app feel today, measured:

1. **Eight internal hard navigations.** `window.location.assign/href`
   on in-app routes forces a full document load — the one thing that
   *always* feels like "jumping web pages": DashShell's no-sites
   button (`/dashboard/event`), SharePanel's post-rename editor jump,
   UserSettingsModal (×2: share deep-link + `/dashboard/profile`),
   MakeoverPage → `/wizard/new`, DesignPricing → `/upgrade`,
   `/gate` → next, ThemedSite's multi-page block jumps (published
   sites). The rest of the 15 grep hits are legitimately external
   (Stripe checkout ×4, wallet pass) and must stay hard.
2. **No transition language between zones.** Every soft navigation is
   an instant repaint. Landing → wizard → editor → dashboard → store
   are five visual worlds that CUT into each other; nothing carries
   the eye across. (Verified: Link/router navs are already
   client-side — the App Router side is healthy; the cut is purely
   visual.)
3. **Ground continuity is already solid** — `body` carries the cream
   + grain at the root (globals.css:415), so zones share the paper.
   No white flash between routes. Keep it that way.
4. **Loading language is mostly right already** — editor/store/site
   routes have paper-skeleton `loading.tsx` files; the shell's is
   deliberately null (owner decision: the dashboard is ONE page).
5. **Next 16.2.1 note:** `experimental.viewTransition` exists but
   Next "strongly advise[s] against" production use. We use the
   NATIVE `document.startViewTransition` directly — no experimental
   flag, graceful no-op where unsupported, disabled under
   `prefers-reduced-motion`.

## §2 · The laws

- **One document.** Inside the product, navigation never reloads the
  document. External money/wallet redirects are the whitelist.
- **The weave cut.** Zone-to-zone navigation gets ONE house
  transition — a quick cross-fade with a settle (≤240ms,
  `--pl-ease-out`), the visual equivalent of a page turning in the
  same book. Never per-route bespoke choreography.
- **The shell stays still.** Inside `/dashboard/*` the transition is
  NONE — tab switches keep the "one page, different content" law.
- **Reduced motion = no motion.** `startViewTransition` is skipped
  entirely; navigation is plain.

## §3 · The blocks

- **N.1 The soft-navigation law.** Convert the eight internal hard
  navigations to router navigation (via N.2's `useSoftRouter` so
  they also get the weave cut). External redirects keep
  `window.location` and gain a `// hard on purpose: <reason>`
  comment. **Fence:** `src/lib/no-hard-navigation.test.ts` — grep
  for `window.location.assign|href =` in src, whitelist =
  external-only call sites, each named.
- **N.2 The weave cut (transition layer).**
  `src/components/shell/soft-navigation.tsx`: (a) `useSoftRouter()`
  — push/replace wrapped in `document.startViewTransition` when
  supported + motion allowed + the route pair crosses a zone
  boundary; (b) `<SoftNavigation>` mounted once in the root layout —
  a capture-phase click listener that upgrades plain internal `<a>`
  /`<Link>` clicks (no modifier keys, no target/download, same
  origin, not `[data-pl-hard]`) into the same wrapped navigation;
  (c) the `::view-transition-*(root)` CSS in globals.css — 200–240ms
  cross-fade + 6px settle, `@media (prefers-reduced-motion: reduce)`
  kills it. Shell-internal pairs (`/dashboard/* → /dashboard/*`)
  bypass the transition by law.
- **N.3 Zone thresholds.** The seams a cross-fade alone can't carry:
  verify the wizard door (template remount) and the editor skeleton
  read as *arrivals* under the weave cut, not double-loads (the
  skeleton IS the destination's first frame — confirm no
  flash-of-skeleton on warm navigations); "View your site" stays a
  new tab ON PURPOSE (a guest-context preview) and gets
  `data-pl-hard` + a `rel` note.
- **N.4 The fence.** `e2e/specs/cohesion.spec.ts` in the staging
  fence: walk landing → wizard → dashboard → studio → editor →
  store with a window marker; assert ZERO document reloads across
  the whole walk; assert the shell pair skips the transition (no
  `::view-transition` pseudo activity on tab switch — assert via the
  transition hook's own telemetry flag); reduced-motion context runs
  the same walk clean.

## §4 · Skip / out of scope (named)

- `experimental.viewTransition` in next.config — Next's own docs
  advise against production use; the native API needs no flag.
- Shared-element morphs (hero → editor canvas continuity) — a future
  taste pass once the base cut ships; requires per-element
  `view-transition-name` design work.
- Published guest sites keep their own feel; only the block-page
  jump converts (it's still the app's router underneath).

## §5 · Status

- N.1 — **SHIPPED 2026-08-13.** All eight internal hard navigations
  converted: DashShell's no-sites button (plain shell push),
  MakeoverPage + DesignPricing (useSoftRouter, cross-zone),
  UserSettingsModal ×2 (close-then-push so the modal can't linger
  over a soft same-zone move), SharePanel's rename jump (soft also
  means no stale-slug unload beacon), ThemedSite's multi-page block
  jumps (router via AppRouterContext — null-safe for test renders).
  The seven external call sites keep window.location with a named
  "hard on purpose" comment (Stripe ×5, wallet, the gate cookie).
  Fence: `src/lib/no-hard-navigation.test.ts` (3 tests).
- N.2 — **SHIPPED 2026-08-13.** `components/shell/soft-navigation.tsx`
  (useSoftRouter + the root-mounted <SoftNavigation/> click
  upgrader + the pathname-arrival release with a 1.2s cap) and the
  ::view-transition weave-cut CSS in globals.css (180ms out /
  240ms settle-in, --pl-ease-out; reduced-motion kills every
  view-transition animation). Live-verified: dashboard → editor =
  exactly one cut; shell tab switch = zero cuts; reduced-motion =
  zero cuts; document alive throughout.
- N.3 — **SHIPPED 2026-08-13.** "View your site" links already open
  the guest context in a new tab via target="_blank", which the
  upgrader skips by construction — no data-pl-hard needed; the
  wizard door (GeneratingScreen) and the editor's paper skeleton
  remain the zone arrivals and compose under the cut unchanged.
- N.4 — **SHIPPED 2026-08-13.** `e2e/specs/cohesion.spec.ts` (2
  tests, in .github/workflows/staging-fence.yml): the fully-soft
  walk (shell switch → back → editor) asserts zero document
  reloads, zero shell cuts, ≥1 zone cut; the reduced-motion
  context walks the same path with zero cuts and no reload.
  vitest 1862/1864 (the two failures are the pre-existing weekend
  baseline + the stylize isolation flake, which passes alone);
  tsc/eslint/build clean.
