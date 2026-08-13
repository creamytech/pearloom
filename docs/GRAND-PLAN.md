# GRAND-PLAN.md — Money, People, Plan

> The biggest-swing improvement plan for Pearloom: turn "a tool that makes a
> beautiful site" into **the operating system for the whole celebration** —
> where **budget, group cost-splitting, collaboration, and the plan** are
> first-class, shared, and unified across every one of the 31 event types.
>
> Grounded in a full codebase audit (2026-07-06). File paths are real. The
> recurring theme: **~80% of the plumbing already exists — it's just siloed
> and host-only.** This plan is mostly *connecting and collaborating*, not
> building from scratch.
>
> **This is a living doc — it grows one audit round at a time.**

### Audit rounds
- **Round 1 (2026-07-06):** money/budget · collaboration/group-events · all 31 event types · end-to-end journey → Pillars 1–3, per-event map, roadmap Phases 0–4, keystone.
- **Round 2 (2026-07-06):** premium tiers/monetization · accounts + social graph (friend network) · auth/onboarding free-flow → added **Pillar 4 (Social Layer)**, **Pillar 5 (Premium tiers)**, **Pillar 6 (Journey free-flow)**, all grounded. Key corrections vs. assumptions: monetization is a **real 3-tier system** (`plan-gate.ts`, not thin); the journey friction is **structural gating**, not the flows; the guest↔user gap is an **unlinked shared email**, and **no friend edge table exists** (the one new primitive).
- **Round 3 (2026-07-06):** celebration/weekend linking model + visibility/privacy · single-site-multi-event feasibility · guest identity across events → added **Pillar 7 (The Celebration Model)**. Key findings: the linked-events strip is **all-or-nothing public** (a wedding site leaks a linked bachelor site to guests — confirmed bug); one-site-many-events is a heavy renderer rebuild, so the win is a **first-class Celebration object** (shared roster, unified headcount, timeline) + **per-link directional visibility** (default hidden), *not* merging events into one site.
- **Round 4 (2026-07-06):** opinionated review of all ~31 dashboard routes (4 clusters) → added **Pillar 8 (Dashboard consolidation)**. Verdict: the dashboard needs *deduplicating*, not building. Root cause = **three disagreeing nav registries** (sidebar ~20 / sub-nav 5 / ⌘K ~13); `/tools` is scar tissue. ~31 routes → ~8 areas; a route-by-route keep/improve/merge/demote/kill table is in Pillar 8.
- **Round 5 (2026-07-06):** Pear/AI surfaces · the Remember pillar (keepsake/film) · retention/lifecycle · vendor marketplace → added **Pillars 9–12**. Dominant theme: **an enormous amount of value is built but dark, broken, or disconnected** — the anniversary + weekly-digest crons exist but aren't scheduled; the lifecycle-email engine runs on a permanently empty queue; guest photos never reach the keepsake (three unsynced photo tables); the film is UI-less dead scaffold; the Director is the best AI asset but buried; Pear never acts unprompted though the pieces exist. The biggest wins here are **turning on / connecting what already exists**, not building new.
- **Round 6 (2026-07-06):** the companion app · security/RLS/abuse · performance/cost at scale → added **Pillars 13–15**. The companion app is an orphaned prototype built backwards (invert it: thin shell + push + WebView). Security core is strong but has **one critical unauthenticated financial-data leak** (`pear-chat`) that's a hard launch gate. Perf has a one-line index bug + a platform-wide guest-traffic scan — and the **`celebrations` table fixes the privacy leak + the worst scan + a DoS lever in one move**.
- **Round 7 (2026-07-06) — series complete:** i18n/accessibility · rendering-engine depth · email/deliverability · testing/QA · activation metrics → added **Pillars 16–20**. Highlights: i18n is English-only with an 80%-built dead translation layer (+ 3 fixable a11y defects); the **rendering engine is genuinely deep and honest** (~100+ variants, 37 kits — the one clean bill of health; weakness only at the landing↔renderer seam); email has **existential deliverability holes** (no domain auth, 404 unsubscribe, wrong webhook signature); **CI runs none of the 1,052 tests**; and there's **zero host-activation instrumentation**. **Seven rounds now cover the whole product surface** — see §9 · Conclusion.

---

## 0 · The three truths the audit surfaced

1. **Three money models that never talk to each other.**
   - `manifest.budget = [{ cat, used, cap }]` — host planning budget, dollars, a 40-line manifest array, owner-gated, written only by `src/app/api/sites/budget/route.ts`, surfaced as one cockpit card (`dash/cockpit.tsx` `BudgetBreakdown`). **No `/dashboard/budget` route. No table.**
   - `event_director_sessions.budget_cents` — the AI planner's top-line number (`/api/director`, `DashDirector.tsx`).
   - `manifest.bachelor.costs[] = [{ label, amount(string), paidBy(name) }]` + `splitCount` — the `costSplitter` block. **Display + per-head math only. No table, no guest write, no payment rails.**
   - The Vendor Book (`site_vendors`, real cents table) is the actuals-out, joined to the budget only by a **fragile string match** (vendor name == budget category, `VendorBookClient.tsx addToBudget()`). Payments (`payments` table) is the actuals-in. None reconcile.

2. **Two people-systems that never meet.**
   - **Co-hosts** (back-of-house): `cohosts`/`cohost_invites` (`20260418_cohost.sql`), 4 roles (`owner` via `sites.creator_email`; `editor|guest-manager|viewer` via table), resolved in `src/lib/cohost-access.ts`, invited by email/SMS/link from `SharePanel.tsx`, realtime co-edit (`useEditorCollab.ts`). **Scoped to a single site.**
   - **Guests / people** (front-of-house): the identity graph `people` (email-keyed, `20260621_people.sql`), roster rows, passport tokens, event messaging (`site_messages`), opt-in connections. Guests can RSVP, vote, claim toast slots, DM, pledge gifts — but have **no roles, no edit access, and no financial standing.**
   - **The keystone gap:** there is no entity that is *both a guest AND a co-payer*. `paidBy` is free text, not a `person_id`. `splitCount` is a bare divisor. The system literally cannot say "Maya (guest #7, person X) owes $68."

3. **The journey leaks momentum and the dashboard has two heads.**
   - Landing CTAs go straight to `/wizard/new`, **bypassing `/welcome`** — so the intent step (which drives the "★ For you" occasion + name prefill) silently never fires for most first-timers. `intent:'exploring'` is a first-class chip with **no destination** (dead end).
   - The wizard never asks about **budget** or **guest count**, and never seeds a **guest list** (only the honor-list names become guests) — so hosts land in an empty Guests page and lose the "Pear did it for me" momentum.
   - Navigation has three disagreeing systems: sidebar `DASH_NAV_GROUPS` (~19), sub-nav `DASH_SECTIONS` (5 umbrellas), and ⌘K `DEPROMOTED_DESTINATIONS` (12). **Payments, Director (the planner), Cadence (send-scheduling), Bridge, Music are discoverable only by ⌘K** — a host may never find money or the AI planner.
   - Collaboration is scattered across 6 places with **no home**. Group-trip milestone ladders *advertise* features ("collect cost shares & sizes", "book the travel window") that **don't exist**.

**Design constraint (non-negotiable, from BRAND/CLAUDE-DESIGN):** *Pearloom never touches the money.* No processing, no held funds, no escrow. Every money feature is **self-report + aggregate + P2P deep-link** (the shipped honor-ledger pattern, `gift_pledges` + `registry-funds.ts`). The Stripe rail exists (`hasStripe()`, 3% fee) but stays parked behind absent env keys; nothing below requires it.

---

## 1 · North Star

> **Money, People, Plan — first-class, shared, unified.**

Pearloom becomes the place a celebration *lives*, not just where its site is made. The wow moments:

- A host **sets a budget** and every vendor deposit, gift received, and expense **counts against it automatically** — planned ↔ committed ↔ paid in one view.
- A bachelor trip's **whole group sees what's been bought and splits it live** — add an expense, pick a split, watch the settle-up update, tap Venmo. No spreadsheet, no Splitwise.
- Co-planners get a **real shared workspace** with roles and assignable tasks, not a scattered set of invite links.
- The journey **carries momentum** from "★ For you" onboarding → a wizard that seeds budget + guests → a dashboard organized around *Money · People · Plan* instead of 30 scattered tools.

> **The meta-finding (rounds 1–5): most of this is already built — it's just siloed, buried, duplicated, or switched off.** The retention loop is written but un-cron'd; the lifecycle-email engine runs on an empty queue; guest photos never reach the keepsake because three tables don't sync; the film is UI-less scaffold; the Director is the best AI asset but buried; the dashboard has 31 routes across 3 disagreeing navs; the celebration link leaks privately-intended sites publicly. **So the highest-ROI work is *connecting and turning on*, not greenfield building** — and a surprising amount of the wow (the anniversary loop, the keepsake photos, a proactive Pear) is days of wiring, not months. Sequence the "turn it on / connect it" wins first.

---

## 2 · Pillar 1 — The Money Spine (unified budget)

**Goal:** "set a budget and put items that count against it," done right — one reconciled ledger, not three silos.

### 2.1 Data
Promote `manifest.budget` from a manifest array to a real table (keep the array as a cached read-model for the cockpit, for back-compat + offline reads):

```
budget_lines
  id, scope_kind ('site'|'celebration'), scope_id,
  category, planned_cents,
  kind ('manual'|'vendor'|'registry_income'|'gift_income'|'expense'),
  source_ref (FK to site_vendors.id / payments.id / expenses.id, nullable),
  created_by, created_at, updated_at
```

- **Planned** = host-entered caps per category (`kind='manual'`).
- **Committed** = Vendor Book rows flow in as `kind='vendor'` lines via a **real FK** (`source_ref → site_vendors.id`) — kill the fragile name-string match in `VendorBookClient.addToBudget()`.
- **Paid / actual** = vendor `balance_paid` + `deposit_paid`, plus expense lines (Pillar 2).
- **Income** = registry funds + cash gifts + chip-ins (`payments`, `gift_pledges`) offset the net.

### 2.2 Surface
- New first-class **`/dashboard/budget`** route in the "Vendors & money" sidebar group. One screen: **Planned vs Committed vs Paid** per category, a net "in vs out" strip, over-budget lines in plum (BRAND: plum = the warning color).
- The cockpit `BudgetBreakdown` becomes a **door into** this route (today it's a terminal card).
- Occasion-aware **category templates** seeded at create time: wedding → venue/catering/photo+video/attire/flowers/music/stationery; bachelor trip → lodging/travel/activities/dining/gifts; birthday → venue/food/cake/entertainment/decor; reunion → lodging/food/shirts/activities. (One map in `event-os/`, derived like every other occasion-aware system.)

### 2.3 Wizard
Add one lightweight, skippable step — **"Roughly, what's your budget? · About how many guests?"** — between Day and Photos. Feeds:
- the budget category seeds,
- the milestone math (`buildMilestones` in `WelcomeHome.tsx`),
- the Director's planning state (already tracks `budget`/`guestCount`),
- the group cost-share expected-share math (Pillar 2).

Nothing is invented — blank stays blank, and the step says "you can change this anytime."

---

## 3 · Pillar 2 — Collaborative Group Budgets + Cost-Splitting (the headline)

**Goal:** "the group sees what's bought and splits it" — bachelor trips, birthdays, reunions.

### 3.1 The keystone primitive: the Participant
Introduce the one entity that doesn't exist: **a person who is on the guest list AND a co-payer**, anchored to `people.id` / `guests.id` (never free text). Everything else hangs off this.

```
participants                       -- a member of a group's shared money
  id, scope_kind, scope_id,
  person_id (FK people), guest_id (FK guests, nullable),
  display_name, joined_at

expenses                           -- "I bought X for $Y"
  id, scope_kind, scope_id, title, amount_cents,
  paid_by_participant_id, category, note, receipt_url (nullable),
  added_by_participant_id, created_at

expense_shares                     -- how each expense splits
  expense_id, participant_id, share_cents,
  settled_at (nullable)            -- P2P settlement is self-reported
```

Scope is `site` for a single group site, `celebration` for a weekend cluster (Pillar 3). RLS + access **mirror the shipped `activity_votes` guest-write pattern** (`20260423_event_os_submissions.sql`): deny-anon, service-role API, token-authed guest writes, rate-limited.

### 3.2 What the group can do (guest-side, on the private site + `/g/[token]`)
- **Add an expense** — "Airbnb · $1,240 · paid by Sam · split evenly." Split modes: even / by-share / custom / exclude-some.
- **See the live settle-up** — real balances over `person_id` ("Maya paid $340, is owed $68; you owe Maya $68"), with who-owes-whom **minimized** (fewest transfers), not a naive `splitCount` divisor.
- **Settle via P2P deep-link** — Venmo / CashApp / PayPal / Zelle, reusing `src/lib/registry-funds.ts` handle normalization + deep-links. Mark settled = self-report (`settled_at`). **Pearloom never touches the money.**
- **Everyone sees what's been bought** — the shared expense feed, live.

### 3.3 Wiring it to what exists
- `costSplitter` **graduates** from host-authored `manifest.bachelor.costs` display block to this live shared ledger. Backwards-compatible: existing manifest costs migrate into `expenses` on first open.
- The `bachelor` **RSVP preset already has a `cost-acknowledge` field** ("I understand the ~$X share", required) — wire it to auto-create the participant + expected share on RSVP.
- New expense → **bell notification** to participants (reuse `notifyHost`/notification infra).
- **Privacy-gated by default** for bachelor/ette (the registry already sets `privateByDefault: true`).
- The `rooms` block gains **per-room cost** that flows into expenses; `packingList` check-off finally syncs (optional, same table pattern).

### 3.4 Who gets it
Ranked by fit (from the event-type audit): **bachelor/ette (ship first)** → **reunion** → **destination-wedding weekend cluster** → **milestone-birthday trips** → friends' trips. Single-honoree events get the *group-gifting* flavor instead (Pillar 5).

---

## 4 · Pillar 3 — The Journey & Dashboard Overhaul

**Goal:** "our user flow and dashboard needs major upgrades."

### 4.1 Fix the funnel
- **Landing → onboarding:** route first-timers through `/welcome` (or carry `intent` into the wizard entry) so the "★ For you" occasion + name prefill actually fires. Give `intent:'exploring'` a real home (template gallery / live demo site) instead of a dead end.
- **Budget + guest-count in the wizard** (Pillar 1.3).
- **Seed the guest list:** one lightweight moment — paste emails / import / "add them later" — so Guests isn't empty and the "Pear did it" momentum carries.

### 4.2 Collapse three navs into three hubs
Today: sidebar (19) vs sub-nav (5) vs ⌘K (12), with money and planning buried. Reorganize the dashboard around the North Star:

- **💰 Money hub** — Budget (planned) · Vendors (committed) · Payments (income) · Split (group). One place for every dollar in and out. (Promotes Payments out of ⌘K.)
- **👥 People hub** — Guests · Messages · **Team** (co-host roles + assignable tasks + activity — the *collaboration home* that doesn't exist today) · Connections. Co-planning finally has a workspace.
- **🗓 Plan hub** — promote the Director out of ⌘K: milestone road + Cadence (send-scheduling) + budget summary + task assignments, occasion-aware (build on the `MilestoneFamily` couple/trip/party/cultural/solemn taxonomy already in `WelcomeHome.tsx`).
- Keep **Compose** (Studio/Reel/Speeches/Music) and **Keepsakes** as-is; fix the naming drift (sidebar "Guests"→`/rsvp`, "Studio"→`/invite`).

### 4.3 Kill the dead-ends
- Give Analytics / Payments / Print a **next action** (they're read-only culs-de-sac today).
- **Surface the post-event loop *before* the event** — set up guest-photo capture + keepsake anticipation ahead of the day, not only after (`RememberingCard` currently appears only once the date passes).

---

## 4b · Pillar 4 — The Social Layer (friends + accounts)

**Goal:** users can **add other users** to events (e.g. add friends to a bachelor party). This is the connective tissue for the future companion app and turns every celebration into an acquisition loop.

**Ground truth (audit round 2):**
- **A "user" is just an email.** There is *no* `users` table and no user id — email is the PK everywhere (`src/lib/auth.ts`, JWT sessions). Password accounts live in `account_credentials`; **Google-only accounts appear only in `user_preferences`** — so "does an account exist?" must probe *both* tables (this OR-probe already exists in `src/app/api/co-host/lookup/route.ts`).
- **The guest↔user gap is an unlinked shared email.** A guest = an email/name on a per-site `guests`/`pearloom_guests` row; the `people` node (`src/lib/people.ts`, email-keyed) is the per-human node both *could* share — but **no code joins guest-email to account-email, and `people` has no "has an account" flag.**
- **No friend graph exists** (confirmed by full grep). The only relationship surfaces are the anonymized opt-in guest connection (`people.connections_opt_in` + `familiarFacesForPerson`, mutual-consent, first-names-only) and host-authored `relationship_graph` (single-site guest metadata, unused). Neither is a user↔user edge.

**Plan:**
1. **Make account-ness first-class.** Promote the `co-host/lookup` two-table probe to a shared `resolveAccount(email)` lib and add a `has_account`/`account_email` marker on `people` — so the identity node knows who has a login. *This one change closes the guest↔user seam the whole social + money vision needs.*
2. **The friend edge (the one new primitive):** `user_connections(a_person_id, b_person_id, status ∈ pending|accepted|blocked, requested_by, created_at, accepted_at)` anchored on `people.id`. Friend-request/accept **generalizes the co-host invite/accept mechanics** (`src/app/api/sites/co-host/route.ts` + `co-host/invitations`) from "email → site + role" to "email → email + status," with the `connections_opt_in` mutual-consent stance as the privacy template.
3. **Add a friend to an event.** Reuse the existing "pull people in" primitive — **`src/app/api/guests/copy-from/route.ts`** already bulk-copies humans (name/email/phone/`person_id`) between a host's sites, deduped by email. Point it at friend rows → creates a `guests` row + `link_guests_to_people`; if the event is a group-money event, **also mint a Participant (Pillar 2)** so the friend is a co-payer and sees the split instantly. *This is where the social layer and the money layer fuse.*
4. **The acquisition loop.** Guest → account (one-tap, Pillar 6) → friend graph (seeded from co-celebrants + the account-resolver) → pull friends into the next bachelor trip / birthday. "You've celebrated with X three times — add as a friend."
5. **Notifications.** Add a `social` category to `src/lib/notifications/prefs.ts` and feed kinds (`friend_request`, `added_to_event`) to `src/lib/notifications/feed.ts`; reuse `notifyHost` (already has a `cohost` category) + `sendHostPush`.
6. **Privacy-first.** Inherit the strict opt-in / mutual / first-names stance of `people.ts`; a friend graph never auto-exposes cross-host event history.

*Build on: `co-host/lookup` (account probe) · `people.id` (anchor) · `connections_opt_in` (consent pattern) · `guests/copy-from` (pull-into-event) · `notifyHost`/bell/push (spine). The one genuinely new table is the friend edge.*

---

## 4c · Pillar 5 — Premium tiers (monetization)

**Goal:** more ways to tie premium in — gate the **new value** (capability/scale/collaboration), not just cosmetics.

**Ground truth (audit round 2) — bigger than expected:** monetization is **not** thin. There's a real 3-tier ladder in `src/lib/plan-gate.ts` (canonical spec `docs/MONETIZATION.md`): **Journal $0 · Atelier $19 one-time · Legacy $129 lifetime**, stored in `user_plans` (per-account, email-keyed). `PLAN_LIMITS` gate `{sites, guests, photos, aiGens, customDomain}`. A **single choke point** — `checkPlanAccess()`/`requirePlan()` → HTTP 402 with `upgradeUrl` — already enforces: AI block generation (Atelier), site/guest/photo limits, and paid-theme-pack publishing. Memorials/funerals are unconditionally exempt (`isGriefExempt`). Fee rails exist (3% gifts/registry as merchant-of-record, 8% vendor Connect) but are parked behind `hasStripe()` → everything runs free when Stripe env keys are absent.

**Plan — attach premium to this roadmap's new value (one-line `requirePlan()` guards, mirroring `src/app/api/ai-blocks/route.ts`):**
- **Budgets (Pillar 1):** free = basic budget; Atelier = planned↔committed↔paid reconciliation, vendor auto-flow, category templates, export.
- **Group split (Pillar 2):** free = split a small group; Atelier = unlimited participants, receipts/attachments, settle-up reminders; Legacy = celebration-level split across sibling sites.
- **Collaboration (Pillar 3):** free = 1 co-host; Atelier/Legacy = unlimited co-hosts + roles + assignable tasks. **Note:** co-hosts + linked celebrations are *sold* as Legacy in `DesignPricing.tsx` but **not code-gated today** — wire them.
- **Social (Pillar 4):** free = add friends; premium = crew templates ("my usual crew"), one-tap re-invite, cross-event history.
- **Wire the unenforced gates** already defined/marketed: `customDomain` (in `PLAN_LIMITS`, zero enforcement in code), co-hosts, linked celebrations.
- **Model decision (open):** keep one-time (Journal/Atelier/Legacy) or add a recurring tier. Recommendation: the plan's **celebration object** (Phase 5) makes **per-celebration one-time** pricing coherent and on-brand ("one price for the whole weekend") — better than reviving the stale subscription plumbing in the legacy `src/lib/stripe.ts` (`free`/`pro` $12, subscription-shaped — dead residue).
- **Reconcile debt:** two webhook endpoints (`/api/billing/webhook` + `/api/stripe/webhook`) both handle `checkout.session.completed`; unify them. Retire the stale `stripe.ts` `PLANS`.

*Build on: `requirePlan()`/`checkPlanAccess()` (the choke point) · `user_plans` (storage) · `theme_pack_purchases`/entitlements (the "owned SKU" ledger) · the parked 3%/8% fee rail (turns live when a group-split settle-up wants a real rail — optional, brand permitting).*

---

## 4d · Pillar 6 — Journey free-flow (make it effortless)

**Goal:** the journey should be **easy, free-flowing, not complicated.**

**Ground truth (audit round 2):** the flows are *already light* — a draft needs only **occasion + names + one vibe** (everything else is skippable or pre-satisfied). The friction is almost entirely **structural gating**, in three places:

**The three structural fixes (highest leverage):**
1. **Lift the pre-launch gate for guests now; retire it at launch.** `src/proxy.ts` (122–148) + `src/lib/site-gate.ts` make `/gate` a **hard proxy wall that also blocks guest passports (`/g/[token]`), published sites, and RSVP** behind a shared password. Add `/g/`, `/rsvp`, and published site-hosts to the exemptions immediately; flip `SITE_GATE_ENABLED=false` at launch. *No invited guest should ever hit a password wall.*
2. **Move the account wall from the END of the wizard to the SAVE moment.** Today a logged-out visitor can traverse all 9 wizard steps → `POST /api/sites` returns **401** → a raw "Failed to create site (401)" dead-end (`WizardV8.tsx` handleFinish + error render). The wizard already persists state to `localStorage`. Fix: catch the 401 → route to `/signup?next=/wizard/new` preserving state (or build anonymously and gate only the save). *"Try before you sign up."*
3. **Guest → host one-tap loop.** `/g/[token]` (988 lines) has **zero** path to make your own event — the single biggest growth-loop gap. Add a "Make one of your own" CTA → `/wizard/new` pre-seeded with the occasion. Fuses with the Social Layer.

**Plus the polish that collapses the "9 steps" feeling:**
- Merge Palette into Vibe (Palette is default-satisfied — a ceremonial empty gate); hide the empty Sections step until its chooser ships.
- Make **Vibe optional** (Pear infers a default from occasion) → effectively **zero forced choices** beyond occasion + names.
- **Ask occasion once** — dedupe the welcome intent step vs the wizard Occasion step (wizard already prefills from intent).
- **Move Google-Photos OAuth scope out of sign-in** — auth with One Tap / basic `openid email profile`; request the Photos scope only when the host clicks "Pick from Google Photos" (today the sign-in button front-loads a scary consent screen, `auth.ts` 48–59).
- **Defer the co-host invite** from Review to the post-build editor (ask *after* the host has seen value).
- **`intent:'exploring'` → a real destination:** the fully-rendered `/demo` site (with live look dials) already exists — route "Just looking" there, or into a pre-seeded sample wizard.
- **Wire the landing playground into the wizard** — the hero name/occasion inputs + the Studio device preview are decorative today; carry "what you typed/skinned" straight into a pre-seeded `/wizard/new` draft.

*Net: the build quality is high; fix the gate wall + the account-wall placement + the missing guest→host loop and the journey becomes free-flowing.*

---

## 4e · Pillar 7 — The Celebration Model (link milestones, keep audiences separate)

**Goal:** stop making a whole separate site *feel* like a whole separate event to manage, and let a host's milestones (anniversary → bachelor → bachelorette → wedding → …) link into one arc **that grows over time — without a wedding guest ever seeing the bachelor site.**

**Ground truth (audit round 3):**
- A "celebration" is *only* `manifest.celebration = { id, name }` — **no table, no timeline, no shared roster, no visibility control.** Siblings are discovered by matching that string across independent `sites` rows.
- **The privacy hole is real and confirmed.** Linking == public cross-advertising: `LinkedEventsStrip` renders **unconditionally** on every published home page (unlike the guestbook, which is opt-in), and `/api/celebrations/siblings` is **public + unauthenticated**, filtering on *only* `published=true` + matching id. A `privacyGate` password does **not** hide a sibling from the strip — it only stops a visitor *after* they click; the name, occasion, and URL still leak. The *only* way to hide a sibling is to keep it an unpublished draft (which also hides it from its own guests). **No middle ground.** So a wedding site really would advertise a linked bachelor party to every wedding guest.
- **One-site-many-events is NOT feasible today** and would be a heavy rebuild: the renderer treats a site as *one occasion rendered as sections*; "pages" are a fixed 8-block whitelist (`V8_PAGE_KEYS`); the arbitrary-page mechanism (`customPages`) was deleted; `manifest.events[]` renders as **schedule rows**, not events; RSVP is **one `guests` row per guest per site** (`onConflict: site_id,email`) with no per-event status/meal/deadline/headcount. Making one site hold distinct events = new per-event schema + generalized routing + per-event RSVP + shared roster + multi-event editor.
- Rosters are **fully per-site**; the only bridge is a one-time `guests/copy-from` (then they drift). The `people` graph gives *identity continuity* (recognition), not a shared roster.
- Weekend cluster and life-arc are the **same primitive today** (sites sharing `celebration.id`); nothing sequences them over time or models "what's next." (`offsetDays` already spans ~6 months: engagement −180 → brunch +1.)

**The design decision — and the course-correction:** *don't* collapse everything into one site. One site = one audience; merging a bachelor party and a wedding into one site is exactly the wrong merge (it makes the privacy problem worse), and it's a heavy renderer rebuild. **Instead, keep separate sites (separate audiences = the privacy guarantee, by construction) and make the *Celebration* a first-class object that collapses the *operational* cost of N sites to near-one.** Two layers:

### Layer 1 — The Celebration container (host-private)
A real `celebrations` table (`id`, `name`, `owner_email`, `arc_type`, `created_at`) replacing the manifest string (back-compat: the old id becomes the FK). It owns:
- **A shared roster** — enter/import guests **once** at the celebration level; each event draws its invited *subset*. Kills the copy-then-drift problem. Per-event invitation/attendance state layers on top of one person list.
- **A unified RSVP / headcount view** — "who's coming to what," one grid across all events.
- **One budget (Pillar 1) + one split (Pillar 2)** at celebration scope.
- **A timeline / arc** — ordered milestones over time, "what's next" prompting, a host hub showing the whole arc. *This is the "grows over time" vision:* a year on, Pear nudges "add your anniversary to the same celebration" (feeds the keepsake/anniversary-rebroadcast loop, currently unbuilt).
- **One dashboard hub** — manage the celebration without flipping the `SiteCrest` 4 ways per task.

### Layer 2 — Per-link public visibility (the privacy fix)
Cross-visibility becomes a **separate, opt-in, directional, per-pair** decision, **default hidden**:
- `LinkedEventsStrip` stops being unconditional — it reads a **directed** `show_from → show_on` visibility flag (default off). *Link ≠ show.* You can show the welcome party on the wedding site but **never** the bachelor on the wedding site, even while both are linked in your private arc.
- **Guest-overlap aware** — default the toggle from audience overlap (shared-roster subsets); disjoint audiences (bachelor vs wedding) never auto-suggest cross-linking.
- **Sensitive-pair guard** — private-by-default occasions (bachelor/ette) never appear in another site's strip without an explicit, *warned* opt-in.
- The siblings API becomes **visibility-aware** (not just `published + id`) and respects `privacyGate`.

**Weekend cluster vs. life-arc = one primitive:** a Celebration with a timeline. They differ only in *when* events are added and whether cross-visibility is on (weekend: overlapping audiences, often on; life-arc: disjoint audiences over time, off).

**What it buys:**
- *"Don't want a site per event"* → solved operationally: N sites now **feel like one** (shared roster, unified headcount, one hub, one budget). The per-event site still exists (needed for separate audiences/tones/URLs) — but the management cost collapses.
- *"Don't show the bachelor from the wedding"* → solved twice over: separate audiences by construction **+** private-by-default directional visibility.
- *"Grow over time"* → the Celebration is a persistent, extensible timeline.
- Fixes the confirmed privacy bug.
- **Billing (Pillar 5):** a real Celebration object makes **per-celebration pricing** coherent ("one price for the whole arc") — resolves the open per-site-vs-per-group question on-brand.

**Optional, later (heavier):** a true one-site-multi-event mode for the *tightest* same-audience clusters (welcome/ceremony/brunch under one guest list) — per-event pages + per-event RSVP over the shared roster. The Celebration object delivers most of the value first; this is a P-later renderer/editor/schema change.

---

## 4f · Pillar 8 — Dashboard consolidation (the route audit)

**Goal:** ~31 dashboard routes → a coherent, lean IA a real host can navigate. A four-cluster opinionated review found the dashboard **mostly doesn't need building — it needs *deduplicating*.**

### The root cause: three navigations that disagree
There are **three nav registries that tell different stories** — a half-finished 22→10 trim that then quietly re-expanded:
- `DASH_NAV_GROUPS` (`DashShell.tsx`) — the sidebar, **~20 items, not occasion-gated**.
- `DASH_SECTIONS` — 5 sub-nav umbrellas (site/guests/day/studio/memory).
- `DEPROMOTED_DESTINATIONS` (`DashCommandPalette.tsx`) — ~13 "⌘K-only" items feeding both ⌘K **and** `/dashboard/tools`.

They contradict each other: **Payments is listed twice** (sidebar + ⌘K), **Vendors three times** (sidebar + Day-of sub-tab + Day-of call-sheet), Music in both; `/dashboard/tools` claims to list "surfaces the sidebar doesn't carry" while listing Director/Analytics/Payments **which the sidebar does carry**; and because the sidebar isn't occasion-gated, **bachelor/memorial hosts see a Registry/Payments the rest of the app hides**. `/dashboard/tools` is scar tissue — the third rendering of the de-promoted list. **The single highest-value fix is collapsing the three registries into one model, one home per surface.**

### Verdict per route

| Route | Verdict | Move |
|---|---|---|
| `/dashboard` (cockpit) | **KEEP + trim** | ~18 cards → 5–6; kill vanity (TheLongView, Blessing, HomeSitePreview) + the **fake local-only ChecklistCard**; Budget card → *door* into Money hub |
| `/rsvp` (Guests roster) | **KEEP (anchor)** | pull merge + VIP tag in from guest-review |
| `/submissions` | **KEEP** | absorb the Messages broadcast thread (inbound + moderated in one place) |
| `/cadence` (Sends) | **KEEP + PROMOTE** | out of ⌘K → the single outbound-message spine ("Sends"); roster nudge becomes a deep-link, not a parallel impl |
| `/guest-review` | **MERGE → KILL** | dupe/stale already re-implemented on the roster; move merge + VIP onto the roster |
| `/messages` | **MERGE/trim** | broadcast thread → Submissions; **kill the per-guest DM inbox** → a per-row roster action |
| `/bridge` | **KILL (junk drawer)** | seat-intros → Seating; Memory Weave/Capsule/Whispers → Memory; Pear-SMS → Sends |
| `/voice` | **DEMOTE** | a one-time setup step inside the drafting flow, not a destination |
| `/day-of` | **KEEP (scope it)** | read-only cockpit; swap vanity hero stats for day-relevant; lead with timeline + toast jukebox; **stop parenting editing tools** |
| `/seating` | **KEEP** | tool + read-only Day-of glance (already the right shape) |
| `/vendors` | **KEEP → re-home** | move to **Money hub**; drop the Day-of sub-tab; replace string-match budget merge with a real FK |
| `/payments` | **MERGE → KILL** | read-only dead-end; → an income *tab* in Money, backed by Registry's richer aggregation |
| `/registry` | **KEEP** | items + thank-yous stay; money-in feeds the Money hub; dedupe the two-way "see payments / manage registry" links |
| `/invite` (Studio) | **KEEP (anchor)** | fix the Studio→Print seam (today you export an SVG and **re-upload** it) |
| `/gallery` (Reel) | **KEEP moderation** | kill the strip/slideshow **view switcher** (vanity); merge the wall into Photos |
| `/library` | **MERGE** | → one **Photos** surface (tabs: My uploads · The Reel · Pending approval) |
| `/speech` | **KEEP** | distinct, high-value AI tool (cool *and* used) |
| `/music` | **KEEP** | fix the sidebar/⌘K double-listing |
| `/keepsakes` | **MERGE → KILL** | a lobby for the book one click away (same data); fold hero + thank-you tools into memory-book |
| `/memory-book` | **KEEP** | the real finished artifact |
| `/print` | **KEEP (parent)** | becomes the **Print shop** housing passport + qr |
| `/passport-cards` | **MERGE** | → Print shop tab (welcome-bag flourish most skip) |
| `/qr-poster` | **MERGE** | → Print shop tab (keep the AI-theme feature) |
| `/director` | **KEEP → Plan hub** | strip the ⌘K/tools dup; the cockpit RoadCard links here |
| `/analytics` | **DEMOTE / borderline KILL** | read-only vanity; fold conversion + quiet-guest into cockpit/Guests; needs a next-action to survive |
| `/event` (My sites) | **KEEP** | the site-management anchor; hosts the "start a celebration" entry |
| `/weekend` | **MERGE** | → Celebration hub (the *create* half) |
| `/connections` | **MERGE** | → Celebration hub (the *manage* half); fix the four-names problem |
| `/profile` (Settings) | **KEEP + fix** | rename route → `/settings` (label already says Settings); trim pointer-only Domain/Privacy sections; dedupe the 3 billing doors |
| `/help` | **KEEP as-is** | best-scoped page in the set |
| `/tools` | **KILL** | a symptom of the three-registry rot, not a feature |

### Target IA (~31 routes → ~8 areas)
One nav model, one home per surface, occasion-gated everywhere:
- **Home** — the trimmed cockpit (5–6 load-bearing cards, each a door).
- **Guests** — roster (＋guest-review) · **Sends** (Cadence, the one outreach spine) · **Submissions** (all inbound/moderated, ＋the broadcast thread).
- **Money** — Budget · Vendors · Registry (money-in) · Payments (income tab) · Split.
- **Plan** — Director (brain) · milestone road · tasks (Cadence's schedule shows here as the timeline).
- **Create** — Studio · **Photos** (Library＋Reel) · Speech · Music.
- **Remember** — Memory book (＋Keepsakes) · **Print shop** (Print＋Passport＋QR).
- **Day-of** — the live read-only cockpit (Seating as its tool).
- **Celebration** — Weekend＋Connections unified (Pillar 7) · My sites.
- **Meta** — Settings · Help. (`/tools` deleted.)

*The throughline: four routes (guest-review, weekend, connections, analytics) are second/third copies of a concept that lives better elsewhere; `/bridge`, `/keepsakes`, `/passport`, `/qr` collapse into their real parents; `/tools` + the stale ⌘K list are scar tissue. Almost nothing needs building — it needs merging.*

---

## 4g · Pillar 9 — Pear as a real agent (make the AI a person, not toys)

**Goal:** deliver the brand's "Pear is a person, not a product" promise — a proactive assistant, not a box of AI gimmicks.

**Ground truth (audit round 5):** the router stack is solid (Claude opus/sonnet/haiku + Gemini + `gpt-image-2`), but **metering is observability-only — no dollar caps** — and most Gemini spend bypasses the meter entirely (raw `fetch`), so the cheapest/highest-volume tier is invisible. The **defensible Pear is a narrow set**: voice-matched drafting (`wizard/draft`, `cadence/draft`, `rewrite-text`, `inline-rewrite`), the **pear-chat host advisor** (folds in live RSVP stats + the Vendor Book ledger, and can *act* via the `pearloom:patch` / `send_nudge_pending` envelope), **Voice DNA** (train once → every draft sounds like the host — the most differentiated thing in the codebase, and the most under-leveraged), and **the Director** (the only real tool-use agent, Opus + tools — but buried at a lonely tab with 4 tools and, ironically, *less* agency than pear-chat). The rest is **decorative image spend diluting the budget and the persona**: AI-painted QR posters, decor generation (4 `gpt-image-2` calls each), stylize filters, venue-color "smart palette," and a `/api/ai-*` grab-bag with no persona continuity.

**Plan:**
1. **Make the Director the product** — merge it with pear-chat's action-envelope + manifest-patch tools so it can *fill blank sections, send the nudge, own the timeline*, and put it at the center of the Plan hub (Pillar 8), not a buried tab.
2. **Close the proactive loop** — Pear should act *unprompted*. The pieces exist and aren't stitched: `guests/intelligence` computes "12 haven't RSVP'd," `guests/draft-nudge` writes it, `cadence` schedules it. One proactive card — *"Deadline in 6 days, 12 pending — here's a draft in your voice. Send?"* — changes the felt intelligence more than any new model.
3. **Vendor Book → budget advice** — Pear reports the ledger but never advises; benchmark host spend against the directory's price tiers ("florals ~15% above typical for 120 guests in your city"). A differentiator competitors structurally can't copy (ties to Pillar 12).
4. **Ship "draft my story from photos"** — named debt (CLAUDE-DESIGN §16); `factSheet`/`eventDetails` already ride the manifest and `pear-caption` proves vision works. This is the *emotional* core of "Pear is a person."
5. **Make Voice DNA ambient** — learn it passively from what the host types in the editor (not a separate `/dashboard/voice` chore), and pipe it into the **guest concierge** so Pear answers guests in the *couple's* voice.
6. **Give guest-list intelligence a real model** — relationship/dietary inference from freeform guest messages → feed the proactive loop.
7. **Retire the vanity + fix metering** — convert `qr/poster` + most `decor/*` image gen to curated templates (deterministic, cheaper, more on-brand), add per-account **dollar caps**, and route the raw-`fetch` Gemini calls through the meter. (AI depth is a natural premium lever — Pillar 5.)

---

## 4h · Pillar 10 — The Remember pillar (make the keepsake real)

**Goal:** deliver the third act (Remember = the keepsake + the film + the anniversary) that the product *positions* but hasn't wired.

**Ground truth (audit round 5) — a structural data break poisons the pillar:** **photos live in three tables that never sync** — `guest_photos` (what real guests upload at the event), `gallery_photos` (host uploads), and `photos` (what the film reads). The dashboard **memory book reads only *manifest* photos**; the **recap page + the "your memory book is ready" day-after email read `gallery_photos`** (which guests never write to). **So guest-uploaded photos never reach the keepsake, the recap, or the day-after email** — the flagship post-event artifact is structurally empty of the actual photos. (Plus two guestbooks — `guestbook` vs `guestbook_messages` — and two guest tables.) By contrast the **words pipeline is genuinely end-to-end** (memory/whisper/capsule/song/tribute/toast → the book, keyed by `site_id`). **Voice** reaches only the day-of jukebox, never a durable keepsake. **The film is dead scaffold** — no UI entry point, `FILM_RENDERER_WEBHOOK_URL` unset so it self-finalizes to `output_url=null`; **no video is ever produced**, yet "auto-cut highlight reel" is core positioning. **"Order printed book"** routes to a Lob *card* composer — there's no bound-book fulfillment.

**Plan:**
1. **Unify the photo layer** — make `guest_photos` the single source of truth that the memory book, recap, and film all read. *This one change lights up the keepsake photos, the recap page, and the day-after email simultaneously* — the highest-leverage fix in the pillar.
2. **Fix the recap wiring** (`guest_photos` + `guestbook`) and **converge** the recap and the dashboard memory book onto one aggregation so "the memory book" means one thing.
3. **Make voice durable** — embed an audio player in the recap/book "In their own voices" section; auto-transcribe on upload (`voice-dna/transcribe` exists) — which also feeds the film's toast-quote ambition.
4. **Deliver a real bound book** — the button + the aggregation exist; add the book-fulfillment path in `print-engine` and turn the best-built asset into a paid physical keepsake.
5. **Ship the film or cut it from positioning** — cheapest honest version: render the existing Claude storyboard + guest photos + Ken Burns + toast audio to an MP4 with a real worker + a dashboard entry point. Until then, stop calling it a pillar.
6. **De-dupe the doubled tables** (guestbook/guestbook_messages, pearloom_guests/guests) — foundational cleanup the whole pillar rests on.

---

## 4i · Pillar 11 — The return loop (retention for an episodic product)

**Goal:** survive the episodic gap ("one event, then silence") — the core business question the docs flag as the reason a social network was rejected.

**Ground truth (audit round 5) — the retention machinery is largely BUILT but DARK:**
- **The "come back next year" mechanic is written but off.** `cron/anniversary` and `cron/weekly-digest` are fully built, gated, and idempotent — but **not in `vercel.json`, so they never fire.**
- **The lifecycle-email engine is a cron on an empty queue.** `email-sequences.ts` + `scheduled_emails` + `/api/cron/email` (every 5 min) exists, but **nothing ever enqueues to it** — the "email spine" is an illusion.
- **Cadence ends at thank-you + 7 days** (no anniversary phase, though the `'milestone'` product value exists unused).
- The anniversary email reaches **the host only**, **milestone years only** (1/5/10…). `AnniversaryCard`'s own comment: *"a feature with no entry point."* The guest's lovely "one year ago today" passport view has **no email/push that ever drives them back to it.** Time capsules open **silently** (no notification).
- **The guest→host CTA does not exist** — `/g/[token]` and `YourCelebrationsCard` are the perfect surfaces and offer no "make your own," the only true viral loop in a one-off product.
- Analytics has **no retention/cohort/return-visitor tracking** at all.

**Plan:**
1. **Turn on the dark crons** — schedule `cron/anniversary` + `cron/weekly-digest` in `vercel.json`. Nearly free, and the single highest-leverage retention fix on the board.
2. **Feed or delete the orphaned email engine** — enqueue rsvp-reminder / event-reminder / thank-you from the real flows, or remove it so the spine isn't fiction.
3. **Guest-facing anniversary rebroadcast + capsule-open cron** — extend the anniversary email to RSVP-yes guests (already resolvable) and to *every* year, and notify when a time capsule opens. ~1 session on existing infra — *the actual retention engine.*
4. **The guest→host CTA** on `/g/[token]` + `YourCelebrationsCard` → pre-seeded `/wizard/new`. The only viral loop; fuses with Pillar 4 (social) + Pillar 6 (free-flow).
5. **Extend cadence past thank-you** (use the unused `'milestone'` phase).
6. **Push, not pull** — surface the keepsake *before* the event (anticipation), and email/push guests to their year-ago passport.
7. **Real retention analytics** (cohort / return-visitor) — none exists today.

---

## 4j · Pillar 12 — Vendors: lead-gen, not a Connect marketplace

**Goal:** monetize the vendor surface *without* breaking the "Pearloom never touches the money" constraint.

**Ground truth (audit round 5):** the **private Vendor Book is shipped and strong** — hosts voluntarily catalogue *real vendors* + *real host-entered spend* + booked/paid status + regions. That is **proprietary demand-side data** Zola/The Knot pay enormous sums to approximate. But the **public directory is an empty stub** (zero seed data — "the directory is filling up" is its live state; no ingestion path; the `VendorCard` is a bare outbound link with **no lead tracking** despite the migration claiming affiliate revenue; `vendor_shortlists` is dead; the `directory_vendor_id` book-bridge is plumbed but no UI sets it). The **8% Connect booking marketplace is fully parked *and contradicts* the architecture** — `createVendorBooking` is never called, there is **no vendor side at all** (no accounts, onboarding, or profiles), and turning on Connect makes Pearloom a payment facilitator (the exact money-transmitter weight the never-touch-money principle avoids). Plus a `vendors` table-name collision and an orphaned legacy `/api/vendors/route.ts`.

**Plan (constraint-safe, in order):**
1. **Do NOT build the Connect booking marketplace** — it's a company pivot, not a feature (breaks never-touch-money, two-sided cold-start with zero supply, a whole second app). Park it.
2. **Seed the directory + ship the click/lead event** the migration already promises — outbound `booking_url` clicks are the affiliate/referral primitive, and need **no Connect and no merchant-of-record**.
3. **Surface the directory→book bridge** (`directory_vendor_id`) — a "Save to your book / Request a quote" action turns the book's private demand signal into a routable, money-free lead.
4. **Monetize the vendor side without payments** — featured/subscription listings + per-lead referral fees.
5. **Only much later**, if supply + lead volume prove out, consider Connect for actual booking — the last step, not the first.

**Risks (be honest):** Connect violates the constraint (licensing/compliance weight); empty-directory cold-start; a **privacy landmine** — the book's vendor contacts are private/unconsented, so *never* scrape them to bootstrap supply (host-initiated, consented intros only); and focus cost vs. the near-term thesis. Clean up the table-name collision + the orphaned legacy route while here.

---

## 4k · Pillar 13 — The companion app (invert it)

**Goal:** a mobile companion that carries the plan's social/money/retention value — not a second full app to maintain.

**Ground truth (audit round 6):** `pearloom-app/` is a **polished but orphaned prototype** — dropped in a single commit (2026-07-02), untouched since, **not wired into the web build/CI/types**. It has 35 real native screens, but it **cannot authenticate against the backend**: the sign-in is a TODO stub, and it targets a Bearer-token `/api/auth/google/callback` that doesn't exist (the web is NextAuth **session cookies** + `getServerSession`). Its API layer is written against an **imagined REST surface** (many invented paths); it **natively re-implements** the renderer, editor, wizard, and types. It's ~85% host-side and contains **none** of the plan's social/money vision. The *only* working integration is the unauthenticated guest companion (`/api/companion/[token]`).

**The insight: it's built backwards.** It natively rebuilt the *high-effort, low-native-value* surfaces (renderer/editor/wizard) and **stubbed the two things that actually justify going native** — push notifications and device capabilities.

**Plan — invert it:**
1. **A thin Expo shell whose primary job is push** — register device tokens against the **existing** web notification spine (`src/lib/notifications/*`, `/api/notifications/push`), consuming the plan's new kinds (`friend_request`/`added_to_event` from Pillar 4, expense/settle-up from Pillar 2, guest anniversary from Pillar 11). Push is the linchpin of the retention thesis (pull a guest back a year later).
2. **Auth that reuses the web session** (WebView NextAuth login or a real token bridge) — resolve the Bearer-vs-cookie incompatibility once.
3. **~4 native surfaces mapped to the plan** — Your-Celebrations timeline (Pillar 11), add-a-friend via **contacts** (Pillar 4), split-the-bill/settle-up + **wallet** (Pillar 2), RSVP + **camera** (guest photos). Load the renderer/editor/wizard as the **existing responsive web in a WebView**.
4. **Delete the ~2,700 lines of duplicated native renderer/editor/wizard.**

Native **only** where an OS capability (push, contacts, wallet, camera) is load-bearing; everything else stays PWA/web. **Risk:** two codebases silently diverge — the plan is all web/backend, so the native fork drifts for free. Fund the thin shell, not the fork.

---

## 4l · Pillar 14 — Security & launch-readiness

**Goal:** clear the hard gates before a real launch (this product handles money + guest PII).

**Ground truth (audit round 6): the core architecture is strong** — deny-anon RLS applied consistently, the service-role client confined to server routes (never `NEXT_PUBLIC`, never imported client-side), Stripe webhooks signature-verified + idempotent, all crons `Bearer CRON_SECRET`-gated, the add-by-URL SSRF guards solid (scheme allowlist + DNS private-IP check + re-vet every redirect + caps), sound crypto (scrypt + `timingSafeEqual` + `randomUUID` tokens with expiries), the vendor packet's privacy contract verified, guest PII CRUD ownership-gated + AES-256-GCM at rest. **The exploitable gaps cluster in one pattern: unauthenticated endpoints that use the service-role client to touch private data or spend money.**

**Must-fix before launch (ranked):**
1. **🔴 CRITICAL — `pear-chat` leaks the couple's private money, unauthenticated.** The route has **no session/token check** (IP rate-limit only), and the server never enforces `mode:'guest'` — so an anonymous `POST /api/pear-chat` with a known public subdomain reads back the **Vendor Book ledger** (cost/deposit/balance/paid/due + vendor names) and RSVP counts via the service-role client. Textbook broken-access-control on **financial data** — an automatic pentest/SOC2 fail. **Gate the stats path behind a host session + ownership check; never run it in the public concierge flow.**
2. **🟠 HIGH — `seating/lookup` filter injection.** Guest-supplied name is interpolated raw into a PostgREST `.or(...)` with no escaping of `%_\,()`, and the query isn't site-scoped. Escape wildcards + scope to the site.
3. **🟡 MEDIUM — systemic:** rate limiting is **in-memory per-instance** (115 routes; effective limit = `max × instances`, and `x-forwarded-for` is trusted raw/spoofable) → move abuse-sensitive/expensive/AI endpoints to the Redis limiter. Unauthenticated **AI cost-abuse** (`pear-chat`, `decor/megasheet` image gen). **`address-book` unauthenticated overwrite** — knowing a guest name + subdomain lets an attacker **redirect where printed invitations/gifts mail** → require the guest `?g=` token or store as pending. Public **RSVP overwrite/spam** → `guestListOnly` + token as the safer default.
4. **Config verification:** confirm in prod that `PEARLOOM_E2E` is unset and `STRIPE_WEBHOOK_SECRET` / `CRON_SECRET` / `PEARLOOM_ENCRYPTION_KEY` / `SITE_GATE_PASSWORD` are all set.
5. **Hardening (low):** guest-photo R2 keys use `Math.random()` → `randomUUID`; `og` route SSRF-lite (allowlist the photo host); `decor/upload-svg` uses a regex blocklist → use the existing `sanitize-svg.ts`; the site-gate token is non-crypto with a default password.

**The theme:** C1 is the **same class** as the celebration-siblings privacy leak (Pillar 7) — *unauthenticated service-role endpoints exposing private data.* Fix it systematically: every service-role endpoint needs an ownership/token gate, or must return only already-public data.

---

## 4m · Pillar 15 — Performance & cost at scale

**Goal:** fix the scaling cliffs before traffic finds them.

**Ground truth (audit round 6) — top cliffs:**
1. **A one-line index bug, big blast radius.** `GET /api/sites` (every dashboard load) and the plan-gate create-count filter the JSONB path `site_config->>creator_email` instead of the **indexed top-level `creator_email` column** → **full-table scan every time**, and the list ships the full `ai_manifest` per site.
2. **`celebrations/siblings` is a platform-wide scan on guest traffic** — loads *every published site's* manifest and filters in JS, no limit/index; cost grows with total platform sites × guest views. **The worst blast radius, and it's *also* a DoS lever (security M5).**
3. **The notification-digest cron** runs ~10 queries × N sites **sequentially**, hard-capped at 500 → ~5,000 round-trips inside the 300s wall, and **site #501+ silently gets no digest.**
4. **AI spend is uncapped in dollars** — the Director fires up to 12 Opus calls re-sending a growing context (only the system prompt cached); decor burns **4× `gpt-image-2` ≈ $0.24/gen**; raw-`fetch` Gemini is unmetered; `ai-usage.ts` is a dashboard, not a fuse.
5. **Client weight on guest phones:** ~**118 KB gzipped CSS on every page** (`pearloom.css` 93 KB + `globals.css` 25 KB — hand-authored, not purged; ~1,854 lines are editor/dash/wizard chrome a guest never renders), and **`next/image` is used zero times** despite being configured → full-resolution, un-optimized images on guest phones. *(Verified non-issues: the 6k-line renderer is well code-split; three.js/shaders/framer-motion are all lazy — don't chase these.)*

**Ranked fixes:**
- **Tier 1:** fix the `creator_email` index filter (highest ROI, lowest risk) · give celebrations a real `celebration_id` column + index · **cap AI spend** ($/day per-user + global) · drop `ai_manifest` from the `/api/sites` list projection.
- **Tier 2:** parallelize + paginate the digest cron (cursor past 500) · **adopt `next/image`** for guest photos · resize/re-encode on upload (`sharp` is already a dep).
- **Tier 3:** move the 115 in-memory rate-limiters to Redis (also the security M1 fix) · prune dead CSS + un-globalize editor CSS off guest pages · cache the guest render (it's `force-dynamic` with no ISR today).

**⚡ The convergences (one move, many wins):**
- **Build Pillar 7's `celebrations` table** → fixes the privacy leak (P7) **＋** the worst perf scan (P15 #2) **＋** the DoS lever (P14 M5). *Three findings, one move.*
- **Migrate to the Redis rate-limiter** → fixes the anti-abuse control (P14 M1) **＋** unauthenticated AI cost-abuse (P14 M2).
- **Add AI dollar caps** → serves P9 (retire vanity spend) **＋** P15 (#4) **＋** P14 (M2).

---

## 4n · Pillar 16 — i18n & accessibility (unlock the diverse-guest market)

**Goal:** serve the cultural events + multilingual/elderly guests the product courts (quinceañera, mitzvah, memorials across cultures).

**Ground truth (audit round 7):** the product is **effectively English-only with dead scaffolding.** The translation pipe is **~80% built** — `manifest.translations`, `applyLocale`, `?lang=` readers, and a Gemini `/api/translate` route supporting **10 locales incl. Hebrew + Arabic** — but **nothing writes translations, nothing calls the route, and there's no language switcher**, so it's a dead gimmick. `<html lang="en">` is hardcoded, dates default `en-US`, currency is `$`-only, name order is Western, and there's **no RTL** (blocking the advertised he/ar). **Accessibility is mixed:** the motion story is genuinely strong (`prefers-reduced-motion` respected across ~76 files, skip link, focus-visible ring, good modal ARIA) — but three real defects: **gold-on-cream text fails WCAG (~2.5:1)**, the WebGL `GradientMesh` + `CustomCursor` **ignore reduced-motion** (a BRAND §6 violation), and dialogs have **no focus trap** (the `use-focus-trap` hook exists but is used in one place).

**Plan:**
1. **Wire up the translation layer** (it's 80% there) — an editor/wizard "translate" action → `/api/translate` → persist `manifest.translations[locale]`, plus a guest-facing language switcher reading `availableLocales()`. The single biggest lever for the non-English-guest story — mostly plumbing. *(Or cut the dead scaffold.)*
2. **Drive `<html lang>` + `dir` from `activeLocale`** (with an RTL map for he/ar).
3. **Fix gold contrast** (darken it for any text/focus use; keep the hue for decorative hairlines only) **+ gate `GradientMesh`/`CustomCursor` on reduced-motion.**
4. **Add a shared focus trap** to the guest RSVP modal + ⌘K palettes; restore focus on close.
5. **Locale-aware date/currency helper** — replace the ~10 hardcoded `en-US`/`$` sites.
6. **Audit host-photo alt text + passport landmarks** (the memorial/screen-reader case). *(Multi-language is also a natural premium lever — Pillar 5.)*

---

## 4o · Pillar 17 — The rendering engine (the good news — polish the seams)

**Goal:** protect and extend the strongest part of the product.

**Ground truth (audit round 7) — this is the series' one unambiguously good finding.** The rendering engine is **genuinely deep, coherent, and honest** — **~100+ variant renderers** (the docs' "~48" undercounts), **37 real kits**, **18 textures**, **10 themes**, all truly wired via `data-pl-*` + CSS, host-data-preserving across layouts, with an honesty contract (empty + published → `null`) and a test that enforces the registry. Occasion→variant recommendations are coherent and never auto-apply; the editor variant UX is well-built (the on-canvas Layout bar, ThemeRail, and the FittingRoom "drape" preview). **The weaknesses are all at the seams between layers, not in the renderer:**
- **The landing Studio is a standalone reimplementation** with its own `data-kit`/`sk-mat-*` CSS that *doesn't exist* in the renderer, and **5 drifted kit ids** (`tasting`↔`menu`, `waxseal`↔`wax-seal`, …). So the marketing demo can **silently drift from the product** — the single biggest coherence risk.
- **Three kit lists must be hand-synced** (editor `KITS` 24, `MOTION_KITS` 8, `packs.ts` `Kit` union ~16 — missing many), so a pack literally can't be *typed* to carry a kraft/index kit.
- **5 pack-exclusive kits + 6 pack-only textures are reachable only by purchase** — hidden premium depth.
- An IA smell: three skinning axes all borrow the word **"layout"** (site layout / section layout / kit).

**Plan:**
1. **Kill the landing/renderer split** — drive the landing preview off the *real* renderer CSS (`data-pl-kit`/`data-pl-texture`) and fix the id drift, so the demo is guaranteed to match the product. *(The recently-shipped landing Studio uses the parallel CSS — fold it back.)*
2. **Unify one `KIT_REGISTRY`** (id, label, blurb, tier, `cssPresent`) consumed by editor + packs + landing + a CSS-coverage test.
3. **Surface the invisible premium depth** — a "premium finishes" teaser for the pack-exclusive kits/textures (monetization; Pillar 5).
4. **Expose more of the 18 textures** in the editor (flecked/smooth for free).
5. **Disambiguate the "layout" vocabulary** — Page style / Section style / Card finish.
6. **Delete the confirmed dead micro-code** (`HotelWrap.disableLink`, the stale `_shared.tsx` "fall through" comment).

---

## 4p · Pillar 18 — Email & deliverability (existential for an invitation product)

**Goal:** invites reach the inbox and the product is CAN-SPAM/one-click compliant. *If invites land in spam, the product fails.*

**Ground truth (audit round 7):** a rich, mostly-live email inventory with the *right instincts* (plaintext alternative, `List-Unsubscribe` headers, batching, per-site caps) — but **launch-critical holes:**
- **Zero evidence of SPF/DKIM/DMARC**, and **bulk guest invites (500/send) share one root domain** with password-reset/verification mail — a bounce spike from a blast degrades the reputation account-recovery depends on. No transactional/bulk domain split.
- **The `/unsubscribe` page doesn't exist** — every bulk invite ships a **404 unsubscribe link** (fails the Gmail/Yahoo one-click rule + CAN-SPAM, and actively hurts placement). There's **no per-guest opt-out** at all.
- **The Resend webhook signature check is written for the wrong scheme** (plain HMAC vs Resend's Svix `id.timestamp.body`) → with the secret set, real **bounce** events are rejected (tracking dark); unset, they're forgeable. And **nothing suppresses sends to already-bounced addresses.**
- **The anniversary + weekly-digest crons aren't scheduled**; the `scheduled_emails` reminder pipeline is dead (confirms Pillar 11).
- No CAN-SPAM postal address; unsanitized From display name (header-injection); the recap `to:` exposes co-hosts' addresses; email rate limits are in-memory.

**Plan (existential first):**
1. **Send-time bounce/complaint suppression** (an address-keyed suppression table read before every send).
2. **Fix the Resend/Svix webhook signature** + reject unsigned in prod.
3. **Ship a real `/unsubscribe` page + per-recipient opt-out** honoring `List-Unsubscribe`.
4. **Separate sending domains** (a `send.` subdomain) + configure **SPF/DKIM/DMARC** (DMARC `p=none` → enforce).
5. **Wire the retention crons** (weekly-digest + anniversary) into `vercel.json`.
6. **Wire or delete `scheduled_emails`** (the automated RSVP reminder never sends today).
7. CAN-SPAM address · sanitize From · bcc the recap · move email limits to Redis + a daily ceiling.

---

## 4q · Pillar 19 — Testing & CI (turn the safety net on)

**Goal:** make the existing test discipline actually protect the product.

**Ground truth (audit round 7):** the **~1,052 tests are real** but concentrated in pure utilities + a small set of *excellent* money-idempotency route tests (the Stripe-webhook test is a model). Route coverage is **~10%** (23/221), component **~6%**. **The safety net is off: CI is effectively nonexistent** — the only workflow is the screenshot tour; **no tsc/eslint/vitest/build runs on PRs**, so the whole suite is local + unenforced, and nothing mechanical stops a bad merge. Critical **untested** paths: **auth core** (`lib/auth.ts` has *zero* tests — including the `PEARLOOM_E2E` bypass gate that must never activate in prod), **ownership/RLS** (no wrong-owner→403 harness), **`billing/webhook`** (a second money webhook with none of the good coverage), the **privacy-leak surfaces** (`pear-chat`/`celebrations-siblings`/`guest-connections` — no isolation test), **PII/GDPR** (`delete-account`/`export-data`), **SSRF** (guard exists, no regression test), and the shipped cost-split.

**Plan (CI gates first — highest ROI in the whole plan):**
1. **Add `ci.yml`: `tsc → eslint → vitest → next build`, required on every PR + branch protection.** This converts the 1,052 tests you already have from local discipline into a real merge gate. *The single highest-ROI move — the tests exist; they just don't run.*
2. Coverage report with a floor on `src/lib/**` + `src/app/api/**`.
3. **Auth + ownership harness** (prove the E2E provider is inert without its env gate; wrong-owner→403 across mutating routes).
4. **`billing/webhook` tests** mirroring the Stripe-webhook discipline.
5. **Privacy-isolation tests** for `pear-chat`/`celebrations-siblings`/`guest-connections` (user A can't derive user B's data).
6. **SSRF regression + PII** tests.
7. **One true guest-facing e2e** (RSVP submit + registry claim) — today 43 of 64 e2e tests are on the stationery-studio chrome.

---

## 4r · Pillar 20 — Activation instrumentation (stop flying blind)

**Goal:** be able to measure — and therefore improve — whether a new host succeeds.

**Ground truth (audit round 7):** **no product analytics of any kind** (no PostHog/Amplitude/Mixpanel/GA; Sentry is error monitoring only). The only instrumentation is **guest-side** (site visits + the RSVP funnel). **The host funnel is entirely unmeasured** — welcome-flow drop-off lives in local state, wizard drop-off in localStorage, and `POST /api/sites` fires **no event on create or publish** — so no one can answer "what % of signups publish?" or "time-to-first-RSVP?". The aha moment: **`site_published`** (leading) + **`first_rsvp_received`** (true activation — the two-sided loop closing). (Published state lives only inside `ai_manifest` JSONB with no `published_at` column — friction for both analytics and perf.)

**Plan:**
1. **A lightweight first-party `product_events` table** (`id, event, email, site_id, props, created_at`) — a pattern the codebase already uses three times (`site_analytics`, `guests.invite_opened_at`, `welcome_emails`). Fire server-side (`signed_up`, `welcome_completed`, `site_created`, `site_published`, `first_rsvp_received`, `keepsake_generated`) + a `/api/events` beacon for the client funnels (welcome/wizard steps). Enough to compute the whole funnel. *(Or adopt PostHog for hosted funnels/cohorts/replay.)*
2. **Promote a real `sites.published_at` column** (clean analytics + ends the JSONB spelunking; helps Pillar 15).
3. **Compute the funnel from existing data today** — a single SQL view over `welcome_emails` / `user_preferences.onboarded_at` / `sites.created_at` / `guests.responded_at` yields signup → onboarded → created → published → first-RSVP + **time-to-publish** + **time-to-first-RSVP** with zero new instrumentation. The only gaps needing new events: welcome/wizard step-level drop-off + landing→signup.
**North-star metric:** % of signups **activated** (published + ≥1 RSVP) within 14 days.

---

## 5 · Per-event application (all 31)

Occasion is threaded through ~11 systems, all derived from **one registry** (`event-os/event-types.ts`) — so per-event upgrades are low-friction. Three shapes:

| Shape | Events | Headline upgrade |
|---|---|---|
| **Group-trip** (participant = payer) | bachelor · bachelorette · reunion · milestone-birthday trip · friends' trip | **Collaborative split (Pillar 2)** — private by default, participants = the group, rooms cost-linked, real per-day trip dates + itinerary |
| **Wedding-arc / weekend cluster** | wedding · engagement · vow-renewal · welcome-party · brunch | **Celebration-level shared budget** across sibling sites (Pillar 6) · co-host roles matter (MOH/best man/parents) · Vendor Book → budget |
| **Single-honoree gathering** | birthday · milestone · retirement · graduation · showers · sip-and-see | **Group gifting** (chip-in on one gift) — partly built (`gift_pledges` + `group_gifts`); finish + surface it · host budget for the party |
| **Cultural** | quinceañera · bar/bat-mitzvah · baptism · communion · confirmation | program + honor-list · host budget · group gifting |
| **Commemoration** | memorial · funeral | budget hidden (already gated) · donation-in-lieu (income only) · **no splitting** |

---

## 6 · Roadmap (trackable)

Ordered to de-risk (the money spine underpins everything), front-load the headline wow (the group split), and make entry effortless early. **Premium hooks (💎) are called out per phase — monetization weaves through, it isn't a single phase.** Check boxes as phases land.

### ▸ Phase 0 — Unify the money (foundation)
- [ ] `budget_lines` table (`scope`, `category`, `planned_cents`, `kind`, `source_ref`)
- [ ] `/dashboard/budget` route — Planned ↔ Committed ↔ Paid, over-budget in plum
- [ ] Vendor→budget **real FK** (kill the `VendorBookClient.addToBudget` string match)
- [ ] Wizard "rough budget + guest count" step (skippable) → seeds categories + milestones + Director
- [ ] Occasion-aware category templates (`event-os/`)
- [ ] Cockpit `BudgetBreakdown` → door into the route (kill the terminal card)
- 💎 *premium: reconciliation view, vendor auto-flow, export*

### ▸ Phase 1 — The Participant + collaborative split (HEADLINE) ⭐
- [ ] `participants` + `expenses` + `expense_shares` tables (anchored to `person_id`)
- [ ] Guest-side **add-expense** + split modes (even/share/custom/exclude)
- [ ] **Live settle-up** (who-owes-whom minimized) + P2P deep-links (reuse `registry-funds.ts`)
- [ ] `costSplitter` graduates from `manifest.bachelor.costs` → live ledger (back-compat migration)
- [ ] RSVP `cost-acknowledge` → auto-create participant + expected share
- [ ] New-expense → bell notifications; private-by-default gating
- [ ] **Ship bachelor/ette first**, then reunion
- 💎 *premium: unlimited participants, receipts, reminders/nudges*

### ▸ Phase 2 — Journey free-flow (make entry effortless) — Pillar 6
- [ ] Try-before-signup: reach a drafted site before an account; defer account to save/publish
- [ ] Landing → `/welcome` intent actually fires (or carry intent into wizard entry)
- [ ] Retire the pre-launch `/gate` wall (at launch)
- [ ] `intent:'exploring'` → a real destination (gallery / demo)
- [ ] Guest-list seeding moment in the wizard (paste/import/skip)
- [ ] Fewer forced wizard choices; smart skippable defaults; mobile-first entry
- 💎 *premium: nothing gated here — free-flow is top-of-funnel; monetize downstream*

### ▸ Phase 3 — Three hubs + the Team (collaboration home) — Pillar 3
- [ ] **Money hub** (Budget · Vendors · Payments · Split) — promote Payments out of ⌘K
- [ ] **People hub** (Guests · Messages · Team · Connections)
- [ ] **Plan hub** — promote the Director out of ⌘K (milestones · cadence · budget · tasks)
- [ ] **Team**: co-host roles + assignable tasks (build on `viewerRole` + `usePearTodos`)
- [ ] Nav-naming cleanup (Guests→rsvp, Studio→invite drift)
- 💎 *premium: 1 free co-host → unlimited co-hosts + roles + task assignment*

### ▸ Phase 4 — The Social Layer (friends + accounts) — Pillar 4
- [ ] Close the **guest↔user** gap (email → account, one `person_id` across both)
- [ ] Guest → host **one-tap** ("start your own event") from `/g/[token]`
- [ ] **Friend graph** — bidirectional accept/decline on the opt-in-connections base
- [ ] **Add a friend (a user) to an event** → drops them in as a Pillar-2 participant
- [ ] The acquisition loop (guest → account → friends → next event) + companion-app seam
- 💎 *premium: friend-group templates ("my crew"), one-tap re-invite, cross-event history*

### ▸ Phase 5 — The Celebration Model (Pillar 7)
- [ ] First-class **`celebrations` table** (replace the shared-string `manifest.celebration.id`; old id → FK)
- [ ] **Shared celebration roster** (enter guests once; each event draws its subset) — kills copy-then-drift
- [ ] **Unified RSVP / headcount** view across all events
- [ ] Budget + split promoted from `site` → `celebration` scope
- [ ] **Timeline / arc** semantics (ordered milestones, "what's next", grows over time → anniversary loop)
- [ ] One dashboard hub (manage without flipping the crest)
- [ ] **Per-link directional visibility** (default hidden) — `LinkedEventsStrip` opt-in + guest-overlap aware + sensitive-pair guard; siblings API visibility-aware
- [ ] *(later, heavier)* true one-site-multi-event mode for tightest same-audience clusters
- 💎 *premium: per-celebration pricing ("one price for the whole arc") — the brand-fit tier*

### ▸ Phase 6 — Group-gifting finish + per-event polish
- [ ] Finish chip-in group gifting for single-honoree events (`gift_pledges`/`group_gifts` are half-built)
- [ ] Per-event trip tools (room cost, packing sync, per-day dates)
- [ ] Pre-event surfacing of the keepsake/post-event loop
- [ ] Next-actions on read-only dead-ends (Analytics/Payments/Print)

### ▸ Cross-cutting — Premium tiers (Pillar 5)
- [ ] Decide the model: per-account sub vs per-celebration one-time vs hybrid (recommend celebration-first)
- [ ] Wire capability gating at each 💎 above (server-side entitlement, not just cosmetic)
- [ ] Layer recurring tier over existing one-time lines (theme packs, prints, domain, Pear depth)

### ▸ Quick wins (high value · low effort · surfaced by round 2)
Small, mostly self-contained fixes that punch above their weight — good "warm-up" work before the big phases.
- [ ] **Lift the gate for guests** — exempt `/g/`, `/rsvp`, published site-hosts in `site-gate.ts`/`proxy.ts` so invited guests never hit the password wall (today they do).
- [ ] **Catch the wizard 401** — a logged-out finisher currently gets a raw "(401)" dead-end after 9 steps; route to `/signup?next=/wizard/new` preserving the `localStorage` state.
- [ ] **Guest→host CTA** on `/g/[token]` → pre-seeded `/wizard/new` (biggest growth loop, ~1 component).
- [ ] **Wire the gates already sold** — `customDomain`, co-hosts, linked celebrations are in `PLAN_LIMITS`/marketing but not enforced (`requirePlan()` one-liners).
- [ ] **`intent:'exploring'` → `/demo`** (the fully-rendered demo already exists) instead of a no-op.
- [ ] **Make Vibe optional** + auto-advance Palette → zero forced wizard choices beyond occasion + names.
- [ ] **Move Google Photos scope out of sign-in** → request it only at photo-pick time.
- [ ] **Reconcile the two Stripe webhooks** + retire the stale `stripe.ts` subscription residue.
- [ ] **Plug the sibling-strip privacy leak** — gate `LinkedEventsStrip` behind a per-sibling opt-in (default off) so a linked bachelor/private site can't be advertised on the wedding site. (Stopgap before the full Celebration Model; today it's unconditional + public.)
- [ ] **Collapse the three nav registries into one** — reconcile `DASH_NAV_GROUPS` / `DASH_SECTIONS` / `DEPROMOTED_DESTINATIONS`; one home per surface; **delete `/dashboard/tools`** and the triple-listings (Payments ×2, Vendors ×3). Occasion-gate the sidebar so bachelor/memorial hosts stop seeing hidden routes.
- [ ] **Fix the Studio→Print artwork seam** — push Studio artwork straight into a print batch instead of "export SVG → re-upload" (`PrintOrdersClient.tsx:506`).
- [ ] **Un-bury Cadence** — the cockpit keeps linking to a ⌘K-only page; promote it to the Guests/Sends surface.
- [ ] **Trim the cockpit** — cut TheLongView, CockpitBlessing, HomeSitePreview; kill or make-real the fake local-only ChecklistCard.
- [ ] **Rename `/dashboard/profile` → `/dashboard/settings`** (label already says "Settings") with a redirect.
- [ ] **⭐ Turn on the dark crons** — add `cron/anniversary` + `cron/weekly-digest` to `vercel.json`. The "come back next year" retention loop is fully built and simply **not scheduled**. Nearly-zero effort, highest-leverage retention fix in the plan.
- [ ] **⭐ Unify the photo layer** — point the memory book + recap + day-after email at `guest_photos` (the table real guests actually write to). Today guest photos reach *none* of the keepsake surfaces; this one change lights up all three.
- [ ] **Feed or delete the orphaned email engine** — `email-sequences.ts` + `/api/cron/email` runs every 5 min on an empty queue; either enqueue reminders/thank-yous or remove the illusion.
- [ ] **Add AI dollar caps + meter the Gemini calls** — metering is observability-only and most Gemini spend bypasses it (raw `fetch`); before scaling AI, cap per-account cost and route the cheap/high-volume tier through the meter.
- [ ] **Ship the vendor click/lead event** — the directory's `booking_url` clicks are the affiliate primitive the migration already promises but never implemented (money-free, no Connect).
- [ ] **🔴 LAUNCH GATE — gate `pear-chat`** — it currently leaks the couple's private Vendor Book ledger to *any anonymous* request with a known subdomain. Require host session + ownership on the stats path. Must-fix before launch.
- [ ] **Fix the `seating/lookup` filter injection** + site-scope it (unescaped guest input into a PostgREST `.or()`).
- [ ] **⚡ Fix the `creator_email` index filter** — one-line change (filter the indexed column, not the JSONB path) that turns two full-table scans into index seeks; highest ROI / lowest risk perf fix.
- [ ] **Adopt `next/image` + resize-on-upload** for guest photos — configured but used zero times; full-res images ship to guest phones today (`sharp` is already a dep).
- [ ] **Migrate abuse/AI endpoints to the Redis rate-limiter** — in-memory limits are per-instance (`max × instances`) and XFF-spoofable; this also closes the unauthenticated AI cost-abuse vector.
- [ ] **⭐ Add `ci.yml` (`tsc → eslint → vitest → build`, required)** — the 1,052 tests currently run *nowhere* on PRs. Half a day converts the whole suite into a real merge gate. Highest-ROI move in the plan.
- [ ] **🔴 Email launch-critical trio** — ship a real `/unsubscribe` page (every bulk invite currently ships a **404**), fix the Resend/**Svix** webhook signature (bounce tracking is broken), and configure **SPF/DKIM/DMARC** + a bulk sending subdomain. Without these, invitations land in spam.
- [ ] **Bounce suppression** — read `email_bounced_at` before every send; stop re-mailing dead addresses.
- [ ] **Fix gold contrast + gate GradientMesh/CustomCursor on reduced-motion** — the one WCAG contrast failure + two BRAND §6 motion violations.
- [ ] **Ship the SQL activation view** — signup → onboarded → published → first-RSVP + time-to-first-RSVP, computable from existing tables today (no new instrumentation).
- [ ] **Fix the landing↔renderer kit-id drift** — the landing Studio's `sk-mat-*`/`data-kit` demo CSS drifts from the real `data-pl-kit` renderer (5 mismatched ids); drive the preview off the real CSS.

---

## 7 · The one keystone

If only one thing ships first: **the Participant + `expenses`/`expense_shares` tables (Phase 1 core).**
It's the missing primitive the entire collaborative-money vision hangs on, it has the highest visible wow ("the group splits it"), and every pattern it needs already exists to copy — the `activity_votes` guest-write pattern, the `gift_pledges` self-report + aggregate money model, the `registry-funds.ts` P2P deep-links, and the `people` identity graph to anchor real balances. Everything else in this plan is *connecting existing pieces*; this is the one genuinely new primitive.

---

## 8 · Open decisions (for the human)

- **Scope granularity:** ship split at `site` scope first (simplest) and add `celebration` scope in Phase 3, or model `celebration` as first-class from day one? (Recommend: site-first.)
- **Participant identity:** require an email (→ `people.id`, real cross-event balances + history) or allow anonymous name-only participants (lower friction, weaker identity)? (Recommend: email-optional, name-only allowed, upgrade on RSVP.)
- **Budget table vs manifest:** fully migrate `manifest.budget` to `budget_lines`, or keep the array as the cockpit read-model and treat the table as the reconciliation ledger? (Recommend: table is source of truth, array is a cached projection.)
- **Group-gifting vs split framing** for milestone-birthday: some are parties (gift), some are trips (split). Let the host pick, or infer from the weekend-arc? (Recommend: host toggle, defaulted by shape.)

---

---

## 9 · Conclusion — 20 pillars, 7 audit rounds, one throughline

Seven rounds audited the whole product surface — money, collaboration, events, journey, dashboard, AI, keepsake, retention, vendors, mobile, security, performance, i18n/a11y, rendering, email, testing, activation. **The single finding that recurs in every round: most of the value is already built — it's just siloed, buried, duplicated, or switched off.** The rendering engine is deep and honest; the retention loop, the translation layer, the email spine, the test suite, and the Director agent are all substantially built and *not wired on*. So the work sorts into three tracks, not one backlog:

### Track A — 🔴 Launch gates (must fix before real users)
Non-negotiable for a product handling money + guest PII + sending mail:
- **Security C1** — gate `pear-chat` (unauthenticated private-money leak).
- **Email trio** — real `/unsubscribe` (invites ship a 404 today), fix the Svix webhook signature, configure SPF/DKIM/DMARC + a bulk subdomain. *Invitations that land in spam = a dead product.*
- **CI gate** — run the 1,052 tests you already have on every PR.
- Config verification (E2E provider off in prod; all secrets set).

### Track B — ⚡ "Turn it on" (days of wiring, outsized impact)
The meta-finding cashed out — connect what's already built:
- **Schedule the anniversary + weekly-digest crons** → the whole retention loop switches on.
- **Unify the photo layer** (`guest_photos`) → keepsake + recap + day-after email all light up.
- **Wire the translation layer** (80% built) → the cultural-events / non-English market.
- **The `creator_email` index fix** + **`next/image`** → dashboard + guest-phone perf.
- **The SQL activation view** → stop flying blind, from existing data.

### Track C — 🏗 The product vision (the sequenced build)
The roadmap in §6, anchored by the keystone (§7). The spine: **Money (P1) → Group Split (P2, the headline) → Journey free-flow (P6) → the three hubs + dashboard consolidation (P3/P8) → the Social layer (P4) → the Celebration Model (P7) → Remember/retention depth (P10/P11).** Premium gating (P5) and Pear-as-agent (P9) weave throughout; the companion app (P13) inverts to a thin push shell once the backend social/money layers exist.

### The convergences worth remembering
A few single moves each close several findings at once:
- **The `celebrations` table (P7)** → fixes the privacy leak **+** the worst perf scan **+** a DoS lever **+** unlocks celebration-scoped budgets/pricing.
- **The Participant primitive (P2)** → the group split **+** the friend-graph anchor (P4) **+** cross-event identity.
- **The Redis limiter** → the anti-abuse control **+** AI cost abuse. **AI dollar caps** → three pillars.

**If you build in one order:** Track A (launch gates) → the Track B "turn-it-on" wins (visible impact, low risk) → Track C starting **Phase 0 (Money Spine) → Phase 1 (the group split)**. That sequence de-risks the launch, banks quick wins the reviews all agreed on, and then builds the headline feature on a foundation that's already been made sound.

---

*This is a live plan (20 pillars across 7 audit rounds, 2026-07-06). It supersedes the scattered budget notes in CLAUDE-PRODUCT §6.7 (the `cost_shares` table planned there and never built is realized here as `expenses`/`expense_shares`). Update it as phases land.*
