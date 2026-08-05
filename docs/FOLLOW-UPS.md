# Follow-ups — work that deserves its own session

> Captured 2026-07-06, at the end of the Track A/B + Money-Spine + Keystone-backend
> build (commits `a695b44`…`86e11792`, all on `main`). This is the backlog of
> **discrete, session-sized** chunks — things surfaced by that work plus the plan
> items too big to inline. The full roadmap lives in `docs/GRAND-PLAN.md §6`; this
> file is the "don't forget these" list, ordered roughly by when you'd want them.
>
> Legend: 🔴 launch-blocker · 👤 needs a human (not code) · ⚙️ tech-debt · 🧪 testing

---

## 0 · Progress log (what shipped since this file was written)

Extended in the same session (commits through `73a3b88b`, all on `main`,
all migrations applied to prod):

- **Phase 1 keystone — COMPLETE + live.** costSplitter graduated to the live
  ledger on published sites (guest add-expense + settle-up with P2P deep-links,
  static fallback), the `/api/split/*` API + owner-only seed route, RSVP →
  participant roster, and the new-expense notification bell.
- **Phase 2 core.** Guest→host CTA on every passport; explorer intent → `/demo`;
  the finish-time 401 dead-end caught (state preserved → `/signup?next=` forwarded
  through `/welcome`); Vibe + Palette made non-blocking.
- **Phase 3 start.** Budget surfaced in the sidebar ("Money" hub).
- **Phase 6.** Chip-in group gifting confirmed already complete end-to-end;
  sibling-strip privacy leak closed (§G item — bachelor/ette never advertised).

**GRAND-PLAN executed end-to-end** (commits through `~1d3b497f`, all on `main`,
11 migrations applied to prod, full suite 1213/1213): the rest of the plan
landed — **AI dollar caps across ~40 routes**; **Phase 3 Team & assignable
tasks**; **Phase 4** the friend graph + add-friend-to-event; **Phase 5 depth**
(strip-visibility toggle, celebration timeline, deduped shared roster); and the
**translation layer surfaced** (guest switcher + host action). See
CLAUDE-PRODUCT §10 (2026-07-06) for the full ledger.

**What genuinely remains** (small or blocked — none is a plan phase left undone):
- 👤 **Premium tiers** — BLOCKED on the monetization-model decision (§8 Q3):
  `requirePlan` has no callers and the sold capabilities (customDomain, co-hosts,
  linked celebrations) have no features behind them yet, so there's nothing to
  gate until the model is chosen. Not code we can write for you.
- **Phase 5 shared-roster WRITE-BACK** — the union is surfaced read-only; "add
  this person to these other events" (inserting guest rows on sibling sites) is
  the deliberate heavier follow-up.
- **Phase 1 expected-share** — RSVP cost-acknowledge creates the participant;
  pre-creating an expected share needs a target expense (noted in the RSVP hook).
- ⚙️ **`applyLocale` FAQ bug** — it reads `manifest.faq` but the field is
  `manifest.faqs`, so FAQ translations never render; the host translate action
  skips FAQ for now. One-line fix in `src/lib/i18n/apply-locale.ts` + re-add FAQ
  to the SharePanel translate call.
- The §F testing hardening + §G/§H long-tail below stand as before.

---

## A · Needs YOU — human action, not code (do before real users)

- 🔴👤 **Email DNS**: publish SPF, DKIM, DMARC and a dedicated bulk sending
  subdomain (e.g. `mail.pearloom.com`) in Resend + DNS. Without it, invitations
  land in spam — the one email launch-gate the code can't close.
- 🔴👤 **CAN-SPAM postal address**: set `EMAIL_POSTAL_ADDRESS` to the real
  registered address. The code is done — the footer renders the line only when
  the env var is present, so today's emails simply omit it (compliant to send
  transactional, not compliant for bulk marketing).
- 👤 **Decision — free-tier site limit**: fixing the `manifest`→`ai_manifest`
  fail-open bug (`3e0f3cc`) means `maxSites=1` now actually *enforces* for free.
  Confirm that's wanted at launch, or bump `PLAN_LIMITS.FREE.maxSites` /
  soften while premium isn't wired.
- 👤 **Set the new secrets in prod**: `RESEND_WEBHOOK_SECRET` (Svix `whsec_…`,
  or bounce tracking rejects everything), `EMAIL_UNSUB_SECRET` (else unsub
  tokens fall back to `NEXTAUTH_SECRET` — fine, but be deliberate), and
  **`FILM_RENDERER_WEBHOOK_SECRET`**, which became load-bearing 2026-08-04:
  `/api/film/render-complete` used to fail OPEN without it (any POST could mark
  a render job complete with an attacker-supplied URL) and now returns 503
  until it's set.
- 👤 **Stripe products for the new price points** ($89 Pass / $199 Keepsake).
  The checkout route reads `PLAN_PRICE_CENTS` from `plan-gate`, so no code
  changes — but the till can't take money at the new numbers until the
  products exist.

## B · Verify-before-launch (config + security audit session)

- ✅ **DONE 2026-08-04 — `PEARLOOM_E2E` auth bypass proven inert.**
  `src/lib/auth-e2e-gate.test.ts` imports `lib/auth` fresh under each env
  combination: absent in production even with the flag set, present outside
  production with it (so the invariant can't pass on a dead gate), armed only
  by the exact value `'1'`.
- ✅ **DONE 2026-08-04 — ownership harness.**
  `src/test/ownership-harness.test.ts` probes 12 mutating routes with no
  session (→401) and a signed-in non-owner (→4xx, no writes). It caught a real
  hole on its first run: `POST /api/guests` checked ownership only on the
  `siteSlug` branch, so a stranger could add guests — and fire invite emails —
  to any site via its raw `siteId`.
- ✅ **DONE 2026-08-04 — CAN-SPAM postal line.** No placeholder ships: the
  footer renders the line only when `EMAIL_POSTAL_ADDRESS` is set (§A is now
  purely "set the env var", not a code fix).
- **Confirm all prod env vars are set** (Stripe/Supabase/R2/Resend/Sentry) and
  that the 7 migrations applied 2026-07-06 match prod (they do as of this note —
  see `_pearloom_migrations`).

## C · Finish the keystone (Phase 1 remainder) — ✅ SHIPPED, section retained for history

> **STALE as of 2026-08-05.** §0 above already records this as
> "COMPLETE + live" — the costSplitter graduated to the live ledger,
> the split bell kind exists, RSVP seeds participants. The list below
> was never struck through when the work landed. Read §0, not this.

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

## D · Remaining plan phases — ✅ SHIPPED, section retained for history

> **STALE as of 2026-08-05.** §0 records "GRAND-PLAN executed end-to-end",
> which covers Phases 2–6 below. Premium tiers were the one genuine
> remainder and are now wired (see docs/MONETIZATION.md, enforcement
> status). Read §0, not this.

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
- ✅ **DONE 2026-08-05 — the flaky password test.** The tamper now flips
  the final hex digit, which differs for every possible input, instead of
  appending a fixed `ff` that collided with ~1 salt in 256. Pinned by an
  EXHAUSTIVE check over all 16 final characters (the flakiness lived in the
  string transform, not in scrypt, so it's proved where it costs nothing)
  plus a small sample of real hashes. A first attempt at 500 real hashes
  timed out — scrypt is deliberately slow — which is why the expensive half
  is a sample and the cheap half is exhaustive.

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

- ~~Fire `signed_up` + `keepsake_generated`~~ — DONE 2026-08-05. `signed_up` fires
  from the NextAuth signIn event off the welcome-email ledger claim (the app's only
  reliable new-account signal — JWT strategy has no `isNewUser`, and OAuth accounts
  never touch `/api/auth/register`, so a fire point there would have missed every
  Google signup). `keepsake_generated` fires once per site from `/api/memory-book`
  via the new `recordProductEventOnce`. `product-events.test.ts` now fails if a name
  is added to the union without a call site.
- Consider PostHog for hosted funnels/cohorts/session replay vs. growing the first-party
  `product_events` table. The SQL `activation_funnel` view covers the core funnel today.

---

*Keep this current: when a session picks one of these up, delete it here and note it in
the relevant plan doc's changelog.*
