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
- Future rounds: keepsake/film pipeline · AI/Pear surfaces · vendor marketplace · analytics/retention · the companion app tie-in.

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

### ▸ Phase 5 — Celebration scope
- [ ] First-class **celebration object** (replace the shared-string `manifest.celebration.id`)
- [ ] Budget + split promoted from `site` → `celebration` scope (weekend clusters)
- [ ] Shared roster + roles across sibling sites
- 💎 *premium: per-celebration pricing ("one price for the whole weekend") — the brand-fit tier*

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

*This is a live plan. It supersedes the scattered budget notes in CLAUDE-PRODUCT §6.7 (the `cost_shares` table planned there and never built is realized here as `expenses`/`expense_shares`). Update it as phases land.*
