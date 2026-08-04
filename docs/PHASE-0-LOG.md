# Phase 0 — Foundation work log

> The §1.1 launch-blocker list from `docs/REVIEW-SYNTHESIS.md`, executed
> in order. Every code item is done, tested, and on
> `claude/platform-audit-features-i4v4o8`. Compiled 2026-08-04.
>
> Validation gate at completion: `tsc` clean · **1363 vitest tests pass**
> (117 files) · `eslint src` clean repo-wide (0/0) · `npm run build`
> succeeds.

## What shipped

| # | Item | What landed | Tests |
|---|---|---|---|
| 1 | **faq/faqs localization bug** | `applyLocale` read `manifest.faq`; the field is `faqs`, so FAQ translations never rendered. Fixed the read/write and re-added FAQs to the SharePanel translate action (segment mode, keyed by row id). | `apply-locale.test.ts` — 6 |
| 2 | **E2E auth-bypass inertness** | The test-only `e2e` credentials provider had zero tests. New suite imports `lib/auth` fresh under each env combo and asserts: absent in production even with the flag set, present outside production with it (live-gate proof), armed only by the exact value `'1'`. | `auth-e2e-gate.test.ts` — 6 |
| 3 | **Entitlement choke point** | `checkGuestCapacity` in `plan-gate.ts` is now the single maxGuests gate (grief exemption + fail-open + 402 body). All four host-side guest writers call it; `/api/guests/from-person` was inserting **ungated** — closed. | `plan-gate.test.ts` — 13 |
| 4 | **Route classification audit** | `docs/ROUTE-AUDIT.md` classifies all 237 routes. Four posture fixes: `film/render-complete` failed OPEN with its secret unset (now 503s); orphan anonymous `/api/wedding-day` deleted; `auto-draft` rate-limited; the three `pear-*` editor AI routes now require the session and key AI spend to the account. | audit doc + existing route tests |
| 5 | **Ownership harness** | `src/test/ownership-harness.test.ts` probes 12 mutating routes with no-session (→401) and signed-in-stranger (→4xx, no writes). **Caught a real bug:** `POST /api/guests` checked ownership only on the `siteSlug` branch, so a stranger could add guests + fire invite emails to any site via raw `siteId`. Both paths now gated. | ownership-harness — 25 |
| 6 | **Manifest validation + versioning** | `lib/manifest-schema.ts` validates every manifest at the `/api/sites` write boundary (both full-save and patch paths). A guardrail, not a strict schema — rejects only structurally-broken payloads, stamps `CURRENT_MANIFEST_VERSION` via an idempotent migration hook. | `manifest-schema.test.ts` — 11 |
| 7 | **Critical-path e2e** | New `critical-path` Playwright project + spec guarding the account-deletion destructive action (DELETE never fires until the exact email is retyped; cancel never touches the endpoint). Hermetic. Verified green (2/2) against the preinstalled Chromium. | critical-path.spec — 2 |

## Two real bugs the foundation work caught

Both were latent authorization holes, not hypotheticals:

1. **`POST /api/guests` — ungated `siteId` path (item 5).** A
   signed-in stranger could add guests, and trigger invitation emails,
   to *any* site by passing its raw `siteId` instead of `siteSlug`. The
   editor only ever sends `siteSlug` (which was gated), so it never
   surfaced in use — but the API accepted the ungated shape. Caught by
   the ownership harness on its first run.
2. **`POST /api/film/render-complete` — fail-open webhook (item 4).**
   With `FILM_RENDERER_WEBHOOK_SECRET` unset, any POST could mark render
   jobs complete with an attacker-supplied `outputUrl`. Now fails closed.

## Owner actions still outstanding (code can't close these)

From `REVIEW-SYNTHESIS.md` §1.1 + §6 — these block real-user launch and
are **not** code:

- **Email DNS** — SPF, DKIM, DMARC + a dedicated bulk sending subdomain
  in Resend/DNS. Without it, invitations land in spam.
- **CAN-SPAM postal address** — replace the `[MAILING ADDRESS]`
  placeholder in the email footer with the real registered address.
- **Prod secrets** — `RESEND_WEBHOOK_SECRET`, `EMAIL_UNSUB_SECRET`,
  `FILM_RENDERER_WEBHOOK_SECRET` (now load-bearing — the route fails
  closed without it).
- **Staging environment** — the other half of the synthesis's
  "staging + critical-path e2e" gate; the specs are written, staging is
  where they run against a real backend.
- **The pricing/packaging decisions** — the six owner decisions in
  `REVIEW-SYNTHESIS.md` §6 (container as the unit, the $0/$89/Keepsake
  restructure, theme-store disposition, the archive-fee framing, the
  free-tier cap). Phase 1 is blocked on these.

## Next: Phase 1

Per `REVIEW-SYNTHESIS.md` §7 — the growth-shaped product: the container
pivot (with per-satellite privacy scopes designed in from day one — R3's
"shedding problem"), the new pricing once §6 is decided, the paste/upload
+ 2-question express doorway, and the passport recap + referral. Several
Phase-1 pieces have partial plumbing already (celebrations table, guest
CSV import, the offline queue) — see the cost table in §5 of the
synthesis.
