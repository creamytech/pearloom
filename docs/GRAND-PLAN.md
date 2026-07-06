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
- **Round 2 (in progress):** premium tiers/monetization · accounts + social graph (friend network) · auth/onboarding free-flow → will add **Pillar 4 (Social Layer)**, **Pillar 5 (Premium tiers)**, **Pillar 6 (Journey free-flow)** and re-sequence the roadmap. (Grounding audits running now; sections marked ⏳ below get filled from them.)
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

## 4b · Pillar 4 — The Social Layer (friends + accounts) ⏳ *grounding — audit round 2*

**Goal:** users can **add other users** to events (e.g. add friends to a bachelor party). The strategic bet: today Pearloom has *guests* (an email on a list) and *accounts* (a login) as two disconnected things, plus an opt-in "people you've celebrated with" graph — but **no real user↔user friend graph**. Building one turns every celebration into an acquisition loop and sets up the future companion app.

**Direction (to be grounded by the accounts/social audit):**
- **Close the guest↔user gap** — the missing seam. A guest's email → a real account; a `person_id` that spans "guest of an event" and "logged-in user." The `people` graph (email-keyed, `connections_opt_in`, `familiarFacesForPerson`) and the co-host `lookup` (already probes "is this invitee a Pearloom user?") are the seeds.
- **A friend graph** — bidirectional connections (accept/decline), built on the opt-in-connections foundation but promoted from "faces you've celebrated with" to "friends you can pull into an event."
- **Add friends to an event** — invite a *user* (not just an email) into a group event as a **participant** (Pillar 2) — so they're a co-payer + can see the split immediately, no re-entering details. This is where the social layer and the money layer fuse.
- **The acquisition loop** — every guest/participant is one tap from an account; every account gains a friend graph; every friend can be pulled into the next bachelor trip / birthday / reunion. Ties directly into the companion app.
- **Privacy-first** — inherit the strict opt-in, mutual-consent, first-names-only stance of `people.ts`; a friend graph never leaks event history across hosts without consent.

*(This pillar is the connective tissue for "the app we build later" — a mobile companion where your friends, your events, and your shared money live in one place.)*

---

## 4c · Pillar 5 — Premium tiers (monetization) ⏳ *grounding — audit round 2*

**Goal:** more ways to tie premium tiers in — **capability + scale + collaboration** gating, not just cosmetics. Today monetization looks thin (one-time theme packs + prints + a parked Stripe rail + a "$0 free / $48 one-time per occasion" promise); premium should attach to the *new value* this plan creates.

**Premium hooks the roadmap creates (to be grounded by the monetization audit):**
- **Money/budget:** free = basic budget; premium = planned-vs-committed-vs-paid reconciliation, vendor→budget auto-flow, multi-category templates, export.
- **Group split:** free = split among a small group; premium = unlimited participants, receipts/attachments, celebration-level split across sibling sites, reminders/nudges to settle.
- **Collaboration:** free = 1 co-host; premium = unlimited co-hosts + roles + assignable tasks (the Team hub).
- **Social:** free = add friends; premium = friend-group templates ("my usual crew"), one-tap re-invite, cross-event history.
- **Scale:** free = 1 active site; premium = the whole weekend/celebration cluster, multi-site.
- **Keepsake/print + domain + Pear AI depth** — existing cosmetic/one-time lines stay, layered under a recurring tier.
- **Model question (open):** per-account subscription vs per-celebration one-time vs hybrid. The plan's celebration object (Phase 5) makes *per-celebration* pricing coherent ("one price for the whole weekend"), which fits the brand better than per-seat SaaS.

---

## 4d · Pillar 6 — Journey free-flow (make it effortless) ⏳ *grounding — audit round 2*

**Goal:** the user journey should be **easy, free-flowing, and not complicated.** Round-1 already found the big leaks (landing bypasses `/welcome`; no budget/guest step; empty guest list; buried money/planner; `exploring` dead-end). This pillar makes *entry itself* frictionless.

**Direction (to be grounded by the auth/onboarding audit):**
- **Try before you sign up** — let a cold visitor reach a drafted site (or a live playground) *before* forcing an account; defer account creation to the save/publish moment. The landing hero already has a live occasion+names playground — extend it into "start weaving, sign up to keep it."
- **Kill / retire the pre-launch `/gate` wall** at launch — it's the very first thing a real visitor hits today.
- **Guest → host in one tap** — a guest on `/g/[token]` who loves their experience should be able to start their *own* event instantly (huge acquisition surface, currently a gap). Fuses with the social layer.
- **Fewer forced choices in the wizard** — smart defaults, everything skippable, no asking for something before it's needed.
- **One coherent path** — collapse the confusing forks (which auth path lands where; sidebar vs sub-nav vs ⌘K) into a single free-flowing spine.
- **Mobile-first** — the whole entry flow effortless on a phone (where most invite links are opened).

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
