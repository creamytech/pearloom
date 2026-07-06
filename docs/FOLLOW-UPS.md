# Follow-ups — work that deserves its own session

> Captured 2026-07-06, at the end of the Track A/B + Money-Spine + Keystone-backend
> build (commits `a695b44`…`86e11792`, all on `main`). This is the backlog of
> **discrete, session-sized** chunks — things surfaced by that work plus the plan
> items too big to inline. The full roadmap lives in `docs/GRAND-PLAN.md §6`; this
> file is the "don't forget these" list, ordered roughly by when you'd want them.
>
> Legend: 🔴 launch-blocker · 👤 needs a human (not code) · ⚙️ tech-debt · 🧪 testing

---

## A · Needs YOU — human action, not code (do before real users)

- 🔴👤 **Email DNS**: publish SPF, DKIM, DMARC and a dedicated bulk sending
  subdomain (e.g. `mail.pearloom.com`) in Resend + DNS. Without it, invitations
  land in spam — the one email launch-gate the code can't close.
- 🔴👤 **CAN-SPAM postal address**: replace the `[MAILING ADDRESS]` placeholder in
  the email footer (`src/lib/email-sequences.ts`, the shared `emailLayout` + the
  bulk colophon) with the real registered address.
- 👤 **Decision — free-tier site limit**: fixing the `manifest`→`ai_manifest`
  fail-open bug (`3e0f3cc`) means `maxSites=1` now actually *enforces* for free.
  Confirm that's wanted at launch, or bump `PLAN_LIMITS.FREE.maxSites` /
  soften while premium isn't wired.
- 👤 **Set the new secrets in prod**: `RESEND_WEBHOOK_SECRET` (Svix `whsec_…`,
  or bounce tracking rejects everything) and `EMAIL_UNSUB_SECRET` (else unsub
  tokens fall back to `NEXTAUTH_SECRET` — fine, but be deliberate).

## B · Verify-before-launch (config + security audit session)

- 🔴🧪 **Prove `PEARLOOM_E2E` auth bypass is inert in prod.** `lib/auth.ts` has an
  E2E provider gated on an env flag that must never activate in production —
  today it has *zero* tests. Add a test that asserts it's off without the gate.
- 🧪 **Ownership / RLS harness**: a wrong-owner→403 test across every mutating
  route (there's no systematic one). The new `/api/split/*` + `/api/sites/budget/lines`
  gates are good models to pin.
- **Confirm all prod env vars are set** (Stripe/Supabase/R2/Resend/Sentry) and
  that the 7 migrations applied 2026-07-06 match prod (they do as of this note —
  see `_pearloom_migrations`).

## C · Finish the keystone (Phase 1 remainder) — HIGH VALUE

The backend is done + live (`participants`/`expenses`/`expense_shares`, the
`/api/split/*` routes, `lib/budget/split.ts`). What's left is the visible payoff:

- ⭐ **CostSplitter live-UI graduation** (`redesign/section-variants/blocks/cost-splitter.tsx`).
  Today it renders static `manifest.bachelor.costs`. Add a live mode: a `'use client'`
  fetch of `GET /api/split?siteId=&token=<?g=>` (resolve the passport token the way
  `GuestPearChat`/`PersonalGuestGreeting` do), render participants + expenses + the
  DERIVED `settleUp` with P2P deep-links (reuse `registry-funds.ts` `venmoHref`/
  `cashappHref`/`paypalHref`), plus a guest **add-expense** form (`POST /api/split/expenses`)
  and add-participant. **Fallback to today's static display when no live data** (so
  existing sites don't regress). Honour the honesty rule: editor canvas shows demo;
  published shows only real. This is real interactive published-surface work — its own
  session.
- **RSVP cost-acknowledge → auto-create a participant + expected share** (`/api/rsvp`).
- **New-expense → notification bell** (a `'split'` feed kind; deterministic createdAt
  so read-state sticks — mirror the vendor-due-date bell).
- **Dashboard host view of the split** (a hub card / route) + private-by-default
  gating check for bachelor/ette.
- **Seed on first open**: wire `seedFromBachelorCosts` (already built + tested in
  `lib/budget/split-seed.ts`) behind a one-tap "bring in your weekend costs".

## D · Remaining plan phases (each is 1–2 sessions — see GRAND-PLAN §6)

- **Phase 2 — Journey free-flow**: try-before-signup (reach a drafted site pre-account),
  land→`/welcome` intent actually firing, retire the `/gate` wall at launch,
  `intent:'exploring'`→`/demo`, guest-list seeding in the wizard, fewer forced
  wizard choices.
- **Phase 3 — Three hubs + Team**: Money (Budget·Vendors·Payments·Split) / People
  (Guests·Messages·Team·Connections) / Plan (promote the Director out of ⌘K).
  Co-host roles + assignable tasks. Nav-naming cleanup.
- **Phase 4 — Social layer**: close the guest↔user gap (one `person_id` across both),
  guest→host one-tap from `/g/[token]`, a friend graph on the opt-in-connections base,
  "add a friend to an event" → drops them in as a Pillar-2 participant.
- **Phase 5 — Celebration Model**: first-class `celebrations` table (replace the
  shared-string `manifest.celebration.id`), shared roster, unified RSVP/headcount,
  budget+split promoted to celebration scope, timeline/arc. *One move that closes
  several findings at once — the privacy leak (§G), the worst perf scan, a DoS lever.*
- **Phase 6 — Group-gifting finish + per-event polish**: finish chip-in gifting
  (`gift_pledges`/`group_gifts` are half-built), per-event trip tools, keepsake
  pre-surfacing, next-actions on read-only dead-ends.
- **Premium tiers (cross-cutting)**: decide the model (recommend celebration-first),
  then wire **server-side** entitlement gating at each 💎 (not cosmetic).

## E · Track B leftovers (turn-it-on)

- **Translation layer** — ~80% built; wire it on for the cultural-events /
  non-English market. Investigate the existing scaffolding first (its own session).
- ⚙️ **Migrate abuse/AI endpoints to the Redis rate-limiter** (`rate-limit-redis.ts`
  exists). In-memory limits are per-instance (`max × instances`) and XFF-spoofable;
  this also closes the unauthenticated AI cost-abuse vector.
- ⚙️ **AI dollar caps + meter the Gemini calls**. `lib/ai-usage.ts` metering is
  observability-only and most Gemini spend bypasses it (raw `fetch`). Cap per-account
  cost + route the cheap/high-volume tier through the meter *before* scaling AI.

## F · Testing hardening (Pillar 19, beyond the CI now in place)

- 🧪 **Coverage floor** on `src/lib/**` + `src/app/api/**`; then flip eslint from the
  soft CI gate to a hard one **once the §G backlog clears**.
- 🧪 **`billing/webhook` tests** — a second money webhook with none of the Stripe-webhook
  test's discipline.
- 🧪 **Privacy-isolation tests** — user A can't derive user B's data via `pear-chat` /
  `celebrations-siblings` / `guest-connections`.
- 🧪 **SSRF regression** (the `product-page.ts` guard has none) + **PII/GDPR**
  (`delete-account` / `export-data`).
- 🧪 **One true guest-facing e2e** (RSVP submit + registry claim). Today 43/64 e2e are
  on the stationery-studio chrome.
- 🧪 **Flaky test to fix**: `src/lib/password.test.ts` "tampered/malformed hashes" is
  non-deterministic — `hashPassword` uses a random salt, so ~1/256 runs the hash ends
  in `ff` and `slice(-2)+'ff'` re-verifies. Make it deterministic (seed the salt or
  assert on a fixed known hash).

## G · Architecture / tech-debt surfaced this build

- ⚙️ **Budget dual-store** (decided coexist for now): `manifest.budget` array (cockpit
  quick budget) vs `budget_lines` table (rich ledger). They are intentionally NOT
  synced. Eventually unify — the clean path is to make the cockpit's BudgetBreakdown
  read the table rollup **and** its inline editor write the table (source_kind='manual'),
  then deprecate the array. Skipped now because a partial read-switch would route edits
  into the wrong store (desync). Own session.
- ⚙️ **`GET /api/sites` list projection is a de-facto full-manifest cache** read by ~15
  dashboard surfaces (pear-chat context, day-of, seating, registry, music, library,
  welcome-preview…). Slimming it (real perf win) needs a dedicated per-site fetch
  (`GET /api/sites/:slug/manifest`) + migrating those consumers, *then* trimming the
  list to `{occasion, coverPhoto, published, names, themeId}`. Coordinated change.
- ⚙️ **next/image LCP hero not migrated**: `ThemedSite.tsx` `FadeInImage` (the LCP hero
  atom, bespoke blur-up/reduced-motion/fetchPriority) + `PhotoLightbox` + `LivePhotoWall`
  (CSS-columns masonry) were deliberately left. The hero is the biggest remaining
  image win but is higher-stakes — its own careful pass.
- ⚙️ **Dark-paper gold-as-text a11y**: per-kit eyebrow labels on the midnight/deco-gilt
  papers (`pearloom.css` ~5240/5283) still use decorative gold as text. A static darken
  would *reduce* contrast there — needs a **theme-aware** token (light→dark gold-text).
- ⚙️ **CommandPalette chrome-token violations** (~90 pre-existing `no-restricted-syntax`)
  + **PLChrome** "components during render" lint error (CLAUDE-DESIGN §16). Clear these
  to make eslint a hard CI gate.
- ⚙️ **`pearloom.css` is 8.4k lines** — dead-selector audit now that the V1/V8 trees are
  gone.
- ⚙️ **Reconcile the two Stripe webhooks** + retire the stale `stripe.ts` subscription
  residue.
- ⚙️ **Sibling-strip privacy leak**: `LinkedEventsStrip` advertises linked sites
  unconditionally + publicly (a wedding site could expose its linked bachelor site).
  Stopgap: gate behind a per-sibling opt-in (default off) before the full Celebration
  Model lands.
- ⚙️ **Co-hosts lost pear-chat advisor stats**: the security fix (`5dd0ef4`) made the
  stats owner-only. If co-hosts should see RSVP counts (not the money ledger), broaden
  the gate to `resolveViewerRole` with a money/no-money split. Minor.

## H · Quick wins (batch a few into one session — GRAND-PLAN §6)

- Lift the gate for guests (`/g/`, `/rsvp`, published hosts) so invitees never hit the
  password wall.
- Catch the wizard 401 (logged-out finisher → `/signup?next=/wizard/new`, preserving
  localStorage).
- Guest→host CTA on `/g/[token]` → pre-seeded `/wizard/new` (biggest growth loop).
- Wire the gates already sold (`customDomain`, co-hosts, linked celebrations) with
  `requirePlan()` one-liners.
- Make Vibe optional + auto-advance Palette (zero forced wizard choices beyond
  occasion + names).
- Move the Google Photos scope out of sign-in → request at photo-pick time.
- Un-bury Cadence; trim the cockpit (TheLongView / CockpitBlessing / fake ChecklistCard);
  rename `/dashboard/profile` → `/dashboard/settings` with a redirect.
- Fix the Studio→Print artwork seam (push artwork straight into a print batch).
- Collapse the three nav registries into one; delete `/dashboard/tools`; occasion-gate
  the sidebar.
- Fix the landing↔renderer kit-id drift (`sk-mat-*`/`data-kit` demo CSS vs the real
  `data-pl-kit`).

## I · Analytics follow-ups (on top of the funnel now shipped)

- Fire `signed_up` + `keepsake_generated` — both are in the `ProductEventName` union but
  have no server fire point yet (no `isNewUser` hook; the keepsake-generate route).
- Consider PostHog for hosted funnels/cohorts/session replay vs. growing the first-party
  `product_events` table. The SQL `activation_funnel` view covers the core funnel today.

---

*Keep this current: when a session picks one of these up, delete it here and note it in
the relevant plan doc's changelog.*
