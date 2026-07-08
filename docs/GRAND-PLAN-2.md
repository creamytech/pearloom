# GRAND-PLAN-2.md — One card system, a real weekend, a real circle

> Three fronts, one session's audit (2026-07-08), grounded in the actual
> code — not assumptions. The user flagged three things live in the
> product: a dashboard card that lied about dates, a card *system* that
> reads inconsistent route to route, a Weekend Builder that provisions a
> full published site for a two-hour brunch, and a Circle that's a
> settings panel wearing a friends-list costume. This doc is the plan;
> the sprints at §7 execute it.
>
> **Already fixed this same session** (see §1 — don't redo it): the
> "ended event still says TODAY" bug. It was systemic, not one card —
> three separate components clamped days-until to `Math.max(0, …)`,
> which makes a wedding three weeks ago and a wedding happening in this
> exact instant computationally identical. Fixed with two shared
> helpers (`daysBetweenCalendarDates`, `formatDaysAgo` in
> `src/lib/date-utils.ts`) and applied to all three known sites. The
> audit below found a fourth (`AnniversaryPreview.tsx`) that's
> accidentally safe, and two reference implementations
> (`DayOfV8.tsx`, `DashConnections.tsx`) that already do this right —
> cite them when this pattern needs to spread further.

---

## 0 · How to use this file

- **Read CLAUDE-PRODUCT.md and CLAUDE-DESIGN.md first.** This file
  assumes you know the renderer, the Event OS registry, and the
  Celebration Model (GRAND-PLAN.md Pillar 7) — Track B leans on all
  three.
- **§7 is the prompt system.** Copy a block (from its
  `## Active focus` line to the closing rule) into `CLAUDE.md` line 6
  to arm the autoloop, or hand it to a session verbatim — same
  mechanic as `docs/PERSONA-PLAN.md`.
- **Every finding cites file:line.** If the code has moved, the doc is
  stale at that point — re-grep before trusting the surrounding
  paragraph.
- **Three tracks, not three phases.** A (card system), B (weekend
  rethink), C (circle) are largely independent — a session can pick
  any one up without the others being done. §8 gives a recommended
  order, not a hard dependency chain.

---

## 1 · Already fixed this session — the date-math bug, systemically

Four components computed "time until an event" from a raw millisecond
subtraction, then clamped the result to `Math.max(0, …)` before
display. That clamp is the bug: it makes "3 weeks ago" and "happening
right now" the same number, zero, forever.

Fixed:
- `src/components/pearloom/dash/cockpit.tsx` `useCockpitCountdown` —
  the hero banner's live d/h/m/s countdown + "TODAY" eyebrow. Now
  carries a `past: boolean` (calendar-day-accurate, not a raw-ms sign
  check) — past events show `"YOUR WEDDING · 3 WEEKS AGO"` and a quiet
  "The day has come and gone" pill instead of a frozen `00:00:00:00`
  flip-clock.
- `src/components/pearloom/pages/WelcomeHome.tsx` `phaseNote` (fed to
  `NeedsYouNow`) — same fix, `formatDaysAgo` for the negative case.
- `src/components/marketing/design/dash/DashDirector.tsx` `diffDays` +
  its four render sites (holding-card date, page title, "THE LOOM"
  eyebrow, mood-reading pill) — all four said "0 days"/"0d"/"0D TO GO"
  forever after the event; now say "3 weeks ago" and switch the title
  to past tense ("It happened 3 weeks ago."). The same file's
  loom-timeline `done`/`isNow` math (`deriveTimeline`, :127) carried
  the identical clamp internally — unclamped alongside the display
  fix (safe: upcoming-event behavior is unaffected, and every
  milestone now correctly reads "done" once the event has passed
  instead of freezing at whichever stop was last "T-minus positive"
  when the clock hit 0).

Verified live (screenshot: hero banner rendered with a June date
against a July "now" reads `"YOUR WEDDING · 3 WEEKS AGO"`, no frozen
clock) and with 10 new unit tests (`src/lib/date-utils.test.ts`).
vitest 1256/1256.

**Found but deliberately NOT touched:**
- `src/components/pearloom/dash/AnniversaryPreview.tsx:81` — clamped
  too, but harmless: `nextAnniversary()` (:21-36) only ever returns a
  future-or-today date by construction, so the clamp can't fire on a
  genuinely negative value. Leave as-is; don't "fix" a guard that
  isn't guarding anything real.
- **Reference implementations already correct** — reuse these
  patterns rather than reinventing when this class of bug turns up
  elsewhere: `src/components/pearloom/pages/DayOfV8.tsx:143-154,
  1617-1621` (explicit `daysUntil > 0` / `< 0` branches, "AFTER THE
  DAY" / "Today's the day"); `src/components/marketing/design/dash/
  DashConnections.tsx:999-1013` (`past = r.ms < todayMs`, dims past
  events, no false countdown).

---

## 2 · North star

> **Every card tells the truth, every satellite event costs what it's
> worth, and Circle is a place people actually want to open.**

Three wow-moments this plan is aimed at:

- A host opens the dashboard and every card — Home, Director,
  Connections, Circle, wherever a date appears — reads consistently,
  visually and grammatically, whether the date is next month or last
  month.
- Planning a wedding weekend means adding a Friday welcome drink and a
  Sunday brunch as two-line items on the SAME site's schedule, not
  spinning up two more published domains with their own guest lists,
  RSVP forms, and passwords to manage — full satellite sites stay
  available for the events that actually need their own tone and
  guest list (bachelorette, rehearsal dinner), not the ones that don't.
- Circle feels like the one thing in Pearloom that's genuinely social:
  invite a friend by text as easily as by email, they become a friend
  the moment they accept — not after a second buried confirmation —
  and adding someone to an event and adding them to your circle are
  the same one tap, not two trips through two different screens.

---

## 3 · Track A — One card system

### 3.1 The finding: at least four competing card systems, none of them chosen

A dedicated audit agent swept every `/dashboard` route. Verbatim
findings:

- **`PageCard`** (`src/components/shell/PageCard.tsx`) is a fully-built
  shared primitive — its own header comment says "Replaces three
  different card patterns" — with **zero consumers anywhere in the
  repo** outside its own file/barrel. Built, never adopted.
- **`Panel`** (`src/components/marketing/design/dash/DashShell.tsx:
  818-843`, radius 20, `var(--card-ring)`, `var(--shadow-sm)`) is the
  one actually in use — DashCircle, DashConnections, DashDirector,
  DashGuests, DashMessages, DashSettings, DashSubmissions all mount
  it — but callers routinely override its radius inline anyway
  (`DashSettings.tsx:375` sets `borderRadius: 16` on top of Panel's
  20).
- The legacy global **`.card`** class (`src/app/pearloom.css:423-427`,
  `border-radius: var(--r-md)` = 20px) is used directly via
  `className="card"` in `WelcomeHome.tsx:635`.
- Everything else hand-rolls **inline `borderRadius` with no shared
  constant**: 16 (`cockpit.tsx:44`), 18 (`cockpit.tsx:201`,
  `AnniversaryPreview.tsx:90`), scattered 12/14/10/9 through
  `DashAnalytics.tsx`, `DashConnections.tsx`, `DashGuests.tsx`,
  `DashSettings.tsx`.
- **Two token systems collide**: `globals.css:138-155`
  (`--pl-radius-lg` = 0.75rem, used only by the unused `PageCard`) vs.
  `pearloom.css:108-117` (`--shadow-sm/md`, `--r-md` = 20px, used by
  everything real). `WelcomeHome.tsx:1078,1094` mixes both eras
  inside one file (`var(--gold-line, ...)`, pre-`pl-` tokens, next to
  `var(--pl-olive)` from the current era).
- **Empty states, 3 competing systems**: the real `<EmptyState/>`
  (`src/components/shell/EmptyState.tsx`) is used in exactly **one**
  place (`TeamTasksPanel.tsx:460`); a separate `EmptyShell` primitive
  (`DashShell.tsx`, used by `DashDirector.tsx:329,347`) duplicates the
  job; `DashGallery.tsx` hand-rolls its own (`NoSitesCard:908`,
  `CaughtUpCard:435`).
- **Loading states are mostly bare italic text**, not skeletons:
  `"Threading…"` in `DashMessages.tsx:165`, `DashDirector.tsx:465`,
  `DashSubmissions.tsx:333`, `DashCircle.tsx:312`,
  `NotificationPrefsTab.tsx:144`, `DashShell.tsx:119` — one of these
  (`TwoTapThanks.tsx:252`) even carries a comment warning against the
  "eternal 'Threading…' strip" it's still doing. Real skeletons exist
  only in `DashGuests.tsx:1495`, `DashGallery.tsx`'s `QueueSkeleton`,
  `WizardV8.tsx`, `EventIndexPage.tsx`.

**Full card inventory by route** (for the migration checklist —
components confirmed to exist, not exhaustive per-prop):

| Route | Cards |
|---|---|
| Home/cockpit | `HeroBanner`, `ProgressCard`, `RoadCard`, `ChecklistCard`, `GuestSummaryCard`, `MemoryCard`, `WeekendCard`, `NeedsYouNow`, `Lately`, `BudgetBreakdown`, `TheLongView` (all `cockpit.tsx`) + `FirstThreadCard`, `ResumeDraftCard`, `RsvpMomentumCard`, `RememberingCard`, `AnniversaryCard` (inline in `WelcomeHome.tsx:618-1179`) |
| Director | Holding card, decisions ledger, THE LOOM timeline, this-week weave, mood reading — all inline in `DashDirector.tsx` |
| Connections | Sibling-event timeline list (`DashConnections.tsx:985-1075`) |
| Circle/Submissions/Gallery/Settings/Guests/Messages | Each hand-rolled per `Dash*.tsx`, e.g. `DashGallery.tsx` (`ModerationQueueCard:444`, `GuestUploadCard:541`, `NoSitesCard:908`, `CaughtUpCard:435`) |
| Day-of | `AttendanceCard` (`DayOfV8.tsx:532`), `DayOfHero` (:104) |
| Vendors/Budget/Registry | `VendorCard` (`VendorsPage.tsx:202`), plus route-local clients |
| Weekend/Passport/QR/Seating/Memory book | `WeekendBuilderPage.tsx` (`Card:553`), `KeepsakeCard` (`KeepsakesPage.tsx:123`), `SiteCard` (`EventIndexPage.tsx:67`) |

### 3.2 The decision this track has to make first

**Evolve `Panel`, delete `PageCard`.** `Panel` already has real
callers across seven route files; `PageCard` has zero. Reviving an
unused primitive and migrating everyone onto it is more work and more
risk than promoting the thing that's already half-adopted. Concretely:
add whatever `PageCard` does better (if anything — audit both files
side by side before deciding) onto `Panel`, then delete `PageCard.tsx`
and its barrel export.

### 3.3 What "done" looks like

- One card primitive, one border-radius token, one shadow token, used
  by every route in the table above — no inline `borderRadius`
  overrides left in `Dash*.tsx` files.
- One empty-state component (`<EmptyState/>`), used everywhere a list
  can legitimately be empty — `EmptyShell`, `NoSitesCard`,
  `CaughtUpCard` folded into it or deleted.
- One loading pattern — real skeletons (reuse `DashGallery.tsx`'s
  `QueueSkeleton` as the template) everywhere, zero bare "Threading…"
  strips left standing alone.
- `--pl-radius-lg` and `--r-md` reconciled to one token family (pick
  `--r-md`'s value since it's the one actually rendering everywhere
  today; re-point `--pl-radius-lg` to it or delete it).

---

## 4 · Track B — Rethink Weekend Builder

### 4.1 The finding: it's genuinely heavyweight, not just heavy-feeling

Traced end to end, proven with the actual insert call:

- Catalog: `src/lib/event-os/weekend-arcs.ts:17-39` — `WeekendEventDef`
  / `WeekendAnchor`, a **static config catalog only**, no persisted
  per-user data.
- UI: `src/components/pearloom/pages/WeekendBuilderPage.tsx` — its own
  header comment says "one celebration, a weekend of linked sites";
  its own copy says "Each becomes its own site with its own guest
  list" (:375) and "Every event gets its own address on top of this
  one — `{baseSlug}-welcome`, `{baseSlug}-brunch`…" (:368).
- Route: `src/app/api/celebrations/weekend/route.ts` — per satellite
  event, calls `saveSiteDraft(session.user.email, slug, themed,
  names)` (:168).
- **The proof**: `saveSiteDraft` (`src/lib/db.ts:202-213`) does a real
  `supabase.from('sites').insert({...})` — the **identical** table and
  insert path used by any normal single-event site: its own
  `subdomain`, `site_config`, `ai_manifest`, its own draft/publish
  state, its own editor route. A two-hour welcome drink gets exactly
  the same weight as the wedding itself.
- The **Celebration Model** (GRAND-PLAN.md Pillar 7, shipped
  2026-07-06) doesn't help here — it's an FK/index layer *over* these
  same heavyweight site rows (`supabase/migrations/
  20260706_celebrations.sql:4-19` says so explicitly: "a SHARED
  STRING... matched by equality across sites," promoted to "a
  first-class row," not a new lightweight entity). `celebrationSites()`
  (`src/lib/celebrations.ts:79-125`) still returns full site rows.
  There is **no dedicated "celebrations" UI screen** — it surfaces only
  as a public sibling-links strip and the WelcomeHome weekend card,
  both of which link straight to `/editor/{slug}` for an existing full
  site (`WelcomeHome.tsx:407-420` — `weekendEvents` built directly
  from the user's `sites` list; the "weave in" tiles link to
  `/wizard/new?occasion=...`, the full new-site wizard).

**Conclusion**: nothing lightweight exists anywhere in this flow
today. A redesign toward "a moment doesn't need its own site" is new
work, not a wiring fix.

### 4.2 The reframe: two tiers, not one

The Event OS registry (CLAUDE-PRODUCT.md §3.1) already draws the right
line — it's just not reflected in the tooling. Some wedding-weekend
events genuinely need their own site: their own guest list (often a
*different* guest list — the bachelorette isn't inviting grandma),
their own tone, their own host. Others are just... a thing that
happens on Friday at 6pm that the same wedding guests already know
about.

**Tier 1 — Moments.** Welcome drinks, the morning-after brunch, an
airport-shuttle window. No new site, no new domain, no new guest list.
These become entries on the couple's **own site's existing
schedule/itinerary block** — the block type already exists
(`itinerary`, per CLAUDE-PRODUCT.md §2.2/§4) and already renders a
multi-day, multi-slot schedule with times, locations, and optional
per-slot detail. A "moment" is just one more entry: `{ day, time,
label, location, note }`. Zero new tables. The wizard's Sections step
already knows how to offer `itinerary` per occasion
(`wizard-sections.ts`).

**Tier 2 — Events.** Bachelor/ette party, rehearsal dinner, bridal
shower — occasions that are **already first-class entries in
`EVENT_TYPES`** with their own RSVP presets, their own voice, their own
templates (CLAUDE-PRODUCT.md §2.1). These keep today's real-site
behavior (their own guest list is the point), but the *creation path*
gets cheaper and more honest: route straight through the wizard's own
instant-manifest path (the same `applyWizardLook` + `seedSectionsFromWizard`
pipeline every other site uses) rather than the separate,
half-duplicated `/api/celebrations/weekend` route, and link the result
via the **existing** `celebrations` table (`syncCelebration`,
`linkSiteCelebration` in `src/lib/celebrations.ts`) instead of any new
plumbing.

### 4.3 What changes concretely

- **Data**: no new table for Tier 1 — moments live in
  `manifest.blocks` on the couple's own site as `itinerary` slots (the
  renderer already handles this shape). Tier 2 keeps using `sites` +
  `celebrations` exactly as today.
- **UI**: `WeekendBuilderPage.tsx` stops asking "what events happen
  this weekend" and generating N sites. It asks, per event the host
  names: **"Add as a moment on this site"** (default — instant, free,
  no new guest list) vs. **"Give it its own site"** (for the events
  that need a different guest list or tone — pre-selected for
  bachelor/ette, rehearsal dinner, bridal shower; available for
  anything else on request). Copy stops promising "each becomes its
  own site" as the only option.
- **WelcomeHome's "Around your day"** (`WeekendCard`,
  `cockpit.tsx:627-697`, wired from `WelcomeHome.tsx:407-420`) reads
  Tier-1 moments straight from the selected site's own itinerary block
  first; Tier-2 events keep rendering as today (real sibling sites via
  `sites` + `celebration_id`).
- **Nothing about the existing Celebration Model changes** — it's
  reused as-is for Tier 2, exactly as designed.

### 4.4 What this deliberately does NOT do

Does not touch or duplicate the Celebration Model's cross-event
roster/timeline work (already shipped, GRAND-PLAN.md Pillar 7). Does
not remove the option to give ANY event its own site — a host who
wants a bachelorette site should still get one in one tap; the change
is that a welcome drink no longer *has* to become one.

---

## 5 · Track C — Circle, rebuilt as a real (simple) social network

### 5.1 The finding: the bones are good; the surface reads like Settings

Data model, confirmed from the migrations directly:

- **`people`** (`20260621_people.sql:27-40`) — `id`, `email` (unique,
  lowercase identity key), `display_name`, `phone`, `dietary`,
  `connections_opt_in boolean DEFAULT false`. Deny-anon RLS.
- **`friendships`** (`20260706_friendships.sql:35-48`) — directed row
  per pair (`requester_person_id`, `addressee_person_id`), `status`
  `'pending'|'accepted'|'declined'`, unique pair constraint, no-self
  check. A mutual pending auto-collapses to `accepted` in app code
  (`decideRequest`'s `accept-reverse` branch, `friends.ts:100-103`) —
  the **only** automatic case today.
- **`person_threads` / `person_messages`**
  (`20260708_person_threads.sql:33-54`) — one thread per pair
  (`kind` `'pair'|'crew'`, `'crew'` reserved and **completely
  unbuilt** — no membership table, no UI, no API), ordered pair-key,
  messages capped 1-4000 chars, `hidden_at` moderation.
- **SMS already exists in the codebase — just not for Circle.**
  `20260627_sms_invites.sql` + `src/lib/sms.ts` +
  `src/app/api/guests/text-invite/route.ts` — Twilio-backed, used only
  for per-event guest-roster invites (`DashGuests.tsx`). Zero SMS code
  anywhere in `DashCircle.tsx`, `lib/friends.ts`, `lib/threads.ts`,
  `api/friends/*`, `api/threads/*` — confirmed via targeted grep.

UI, confirmed from the actual component:

- Route: `/dashboard/circle` → `DashCircle.tsx`
  (`DashShell.tsx:97`). Panel stack, top to bottom: opt-in gate
  (:223-236) → REQUESTS with Accept/Decline (:241-255) → YOUR CIRCLE
  with per-person "Add to an event" chips (:258-411) → WAITING ON,
  pending outgoing (:413-429) → INVITE SOMEONE NEW by **email only**,
  name optional (:431-467) → discovery, "PEOPLE YOU'VE CELEBRATED
  WITH" (:470-485).
- The 1:1 thread lives **inline inside the person card** (:341-400,
  bubbles + composer, 25-second poll via `/api/threads`) — not a
  dedicated chat surface. `DashConnections.tsx` is a completely
  different feature (linking sibling **sites**, not people) that
  happens to share the word "connections."

Auto-friending, traced end to end: **no** — `POST /api/friends
{action:'invite'}` (`src/app/api/friends/route.ts:152-174` →
`src/lib/friends.ts:340-359`) inserts a `pending` row and stops there.
When the invitee later signs in, `resolvePersonId`
(`src/lib/people.ts:41-86`) resolves them to the same `people.id` (the
"claim mechanism"), but the pending request still surfaces as a sealed
envelope inside the **welcome onboarding flow**
(`docs/ONBOARDING-PLAN.md:96,129`) that the invitee must separately
click "Keep them" on (`respondFriend`, `friends.ts:210-241`, `POST
/api/friends {action:'accept'}`). Two people, two separate actions,
even though one of them already named the other by email.

Friend-to-event, traced end to end: the **only** path is S3's
"weave-in" — `POST /api/guests/from-person`
(`src/app/api/guests/from-person/route.ts:42-134`), which adds an
**existing circle friend** to one event's guest list. There is **no**
path today for "invite someone who ISN'T in my circle yet, to this one
event, and have them become both a guest and a friend in the same
action" — normal guest-add (`/api/guests`) only ever touches `guests`
and `people`, never `friendships`.

### 5.2 What "a real, simple, beautiful social network" means here

Not a general-purpose social network — Pearloom's own decision log
(CLAUDE-PRODUCT.md §8 Q1, and the GRAND-PLAN.md Pillar 4 rationale)
already rejected that, for the right reasons: episodic users, cold
start, brand mismatch. The ask is narrower and achievable: **the
existing event-graph social layer, given a UI and an invite flow
worthy of it.** Concretely, five sprints:

- **C.1 — Visual redesign.** Circle stops reading as a stacked
  settings panel and starts reading as a warm, populated place: a
  woven grid of friend mini-cards (photo/orchard mark, first name,
  last-thread preview, shared-event count) as the primary view, with
  requests/invite/discovery as clearly-labeled but visually secondary
  rows above and below it — not five equal-weight panels in a
  vertical stack. Paper + thread + letterpress (BRAND §9) — never
  glass-as-surface, never a gradient card.
- **C.2 — SMS invite parity.** Add "Invite by text" beside "by email"
  on the existing invite composer, reusing `src/lib/sms.ts` (already
  proven in production for guest invites) rather than building new
  Twilio plumbing. Same `/api/friends` invite action, a `phone` field
  alongside `email`, same `people` upsert (keyed by phone when email
  is absent — `resolvePersonId` needs a phone-first lookup path added
  to `people.ts`).
- **C.3 — Tighten the auto-friend moment.** Keep mutual consent (it's
  the right privacy default — an invite alone shouldn't create a
  connection, since anyone could type in an email they don't own) but
  remove the SECOND detour once the invitee has already landed via a
  named, personal invite link: today they land in `/welcome`'s sealed-
  envelope metaphor and must separately unseal-then-accept. Instead,
  a click on a personal circle-invite link (as opposed to a generic
  `/signup`) should surface a single, immediate "Add [name] back?"
  action at the top of their very first session — one tap, not a
  buried onboarding step. The consent model is unchanged (both people
  still act); the UX gets shorter by one hop.
- **C.4 — Friend-to-event in one step.** Extend the Add Guest dialog
  (`DashGuests.tsx`) so adding someone who ISN'T yet a circle friend
  offers a single checkbox, "Also add to my Circle" — one submit
  fires both the existing guest-add path and a `/api/friends` invite.
  Today a host has to visit two different screens to do what feels
  like one action.
- **C.5 — Real-time chat.** The 1:1 thread (`person_threads` /
  `person_messages`) is architecturally sound — mutual-consent-gated,
  deny-anon RLS, re-verified on every read/write
  (`src/lib/threads.ts`). Move it off 25-second polling
  (`DashCircle.tsx:67-69`) onto Supabase Realtime, subscribed to the
  signed-in person's own thread ids. This is the single change most
  likely to make Circle *feel* like a chat product instead of an
  inbox that happens to refresh.
- **C.6 (stretch) — Group threads.** Build out the reserved-but-unused
  `kind='crew'` row on `person_threads` — a named group thread
  ("Bach weekend crew") with several circle friends as members. Needs
  one new thin membership table (`crew_thread_members(thread_id,
  person_id)`) and a "start a group" affordance in Circle; the
  message-send/read path is otherwise identical to the 1:1 case.

### 5.3 What this deliberately does NOT do

Does not build contact import (deliberately deferred per
`SOCIAL-PLAN.md:249-250,257-258` — a real product decision about not
scraping a user's address book, not a gap). Does not add `@Pear` to
threads (deferred, `SOCIAL-PLAN.md:157,171` — a separate, smaller
follow-up once C.5 lands). Does not touch `DashConnections.tsx` — that
is the sibling-**sites** linking feature (Celebration Model UI), an
entirely different system that happens to sit one tab away in the
nav; don't let the shared vocabulary ("connections") cause the two to
merge in implementation.

---

## 6 · Cross-track note: Weekend + Circle actually compose

Once Track B's Tier-2 events reuse the wizard's instant-manifest path
and the existing Celebration Model, and Track C's C.4 makes "friend +
guest" a single action, a natural follow-on (not in scope for this
plan, worth a decision-log entry) is: a bachelorette party's guest
list becomes trivially seedable **from the couple's own Circle** —
"invite from your circle" instead of typing emails cold. Don't build
this now; note it so the session that picks up C.4 sees the shape
coming.

---

## 7 · The prompt system — ready-to-paste sprint blocks

Shared validation loop for every sprint below: `npx tsc --noEmit` →
eslint on touched files → `npx vitest run` → live screenshot
verification (dev harness where one exists, authed e2e session
otherwise) → commit → stamp this file → push to both the feature
branch and `main`.

---

### A.1 — One card, everywhere · **status: SHIPPED 2026-07-08** · P0 (foundation)

> Shipped: PageCard.tsx deleted (zero consumers confirmed) + barrel
> export removed; Panel's radius token-ized to `var(--r-md, 20px)`
> with a "never override per call site" contract comment; the four
> inline Panel radius overrides removed (DashGuests ×3, DashSettings);
> cockpit's `cockpitCard` (16) + HeroBanner (18) + DashDirector's
> `card` (16) all unified onto `var(--r-md, 20px)`. Loading: the
> existing `DashSkeleton` primitive adopted at all seven bare
> "Threading…" sites (DashMessages, DashSubmissions, DashCircle,
> DashDirector, TwoTapThanks, RegistryItemsManager,
> NotificationPrefsTab) — DashShell:119's full-page display-type
> splash kept as the deliberate branded splash it is. Empty states:
> DashGallery's NoSitesCard + CaughtUpCard folded onto the shared
> `<EmptyState/>` inside their card chrome (verified live — Fraunces
> italic + woven thread + pearl CTA render correctly on the Reel).
> DECISION RECORDED: `--pl-radius-lg` is NOT deleted — it has
> legitimate non-dashboard consumers (SeatingCanvas, Live overlays,
> gate, admin, route loading skeletons); the dashboard simply
> standardizes on `--r-md`. Similarly EmptyShell (full-page no-site
> sheet) and EmptyState (card-level) serve different jobs — both
> stay; the audit's "3 systems" collapses to these two, each with a
> clear role. tsc/eslint clean, vitest 1256/1256.

```
## Active focus — A.1 · One card system (foundation for everything after)

**Goal:** Every dashboard route uses the SAME card primitive, radius,
shadow, empty state, and loading state. Fixes the "four competing
card systems" finding of docs/GRAND-PLAN-2.md §3.1.

**Direction:** Evolve `Panel` (src/components/marketing/design/dash/
DashShell.tsx:818-843) into the one shared primitive — it already has
7 real call sites, unlike the unused `PageCard`
(src/components/shell/PageCard.tsx, zero consumers). Diff the two
files; port anything PageCard does better onto Panel; delete
PageCard.tsx + its barrel export. Sweep every `Dash*.tsx` for inline
`borderRadius` overrides on top of Panel (DashSettings.tsx:375 is a
known offender) and remove them. Reconcile `--r-md` (pearloom.css,
the value actually rendering everywhere) and `--pl-radius-lg`
(globals.css, used only by the now-deleted PageCard) into one token.

**Open threads:**
- [ ] Panel vs PageCard diff + merge + PageCard deletion
- [ ] Remove every inline borderRadius override on a Panel-based card
- [ ] Reconcile --r-md / --pl-radius-lg to one token
- [ ] One <EmptyState/> everywhere a list is empty — fold in/delete
      EmptyShell, NoSitesCard, CaughtUpCard
- [ ] One skeleton pattern (template: DashGallery.tsx's QueueSkeleton)
      — replace every bare "Threading…" loading string with a real
      skeleton, across DashMessages/DashDirector/DashSubmissions/
      DashCircle/NotificationPrefsTab/DashShell

**Counts as done:** grep for inline `borderRadius:` in every
Dash*.tsx file returns zero hits outside token references; grep for
"Threading…" returns zero standalone-text loading states; PageCard.tsx
no longer exists; one screenshot pass across all ~31 /dashboard routes
shows visually matching card chrome.

**Skip:** Any visual REDESIGN of what's inside a card (that's Track C
for Circle specifically) — this sprint is chrome unification only.
```

---

### A.2 — The date-math sweep · status: partially done 2026-07-08 · P1

```
## Active focus — A.2 · The date-math sweep (spread the fix, don't just patch it)

**Goal:** Every card anywhere in the product that shows a "days
until/since" figure uses daysBetweenCalendarDates + formatDaysAgo
(src/lib/date-utils.ts), never a raw-ms clamp. Fixes the remaining
instances after the cockpit/WelcomeHome/DashDirector fix already
shipped this session (docs/GRAND-PLAN-2.md §1).

**Direction:** grep the whole src/ tree for the pattern
`Math.max(0,` near `getTime()` or a variable named daysUntil/
daysOut/daysToGo/rawDays. For each hit: replace the clamp with a
signed calendar-day diff, and give the render site a past-tense
branch using formatDaysAgo. Reference the two patterns already
correct in-house (DayOfV8.tsx:143-154,1617-1621 and
DashConnections.tsx:999-1013) as the target shape. Do NOT touch
AnniversaryPreview.tsx:81 — its clamp is provably inert (nextAnniversary()
never returns a negative value), fixing it would be motion without
effect.

**Open threads:**
- [ ] Full-repo grep for the clamp pattern; enumerate every hit with
      file:line before touching anything
- [ ] Fix each hit found (expect: Vendor Book due-dates, RSVP
      deadline countdowns, cadence/send-time displays — verify which
      of these are genuinely affected vs. already date-of-future-only
      by construction like AnniversaryPreview)
- [ ] A unit test per new call site mirroring date-utils.test.ts's
      shape (same-day / weeks-ago / years-ago cases)

**Counts as done:** the enumerated grep list from the first task is
fully accounted for (fixed, or explicitly logged as inert like
AnniversaryPreview); vitest green; a live screenshot of each fixed
surface with a deliberately-past test date shows correct past-tense
copy, no frozen zero.

**Skip:** Any NEW date-bearing card the audit didn't already surface —
this sprint closes what's already found, not a general vigilance
policy.
```

---

### B.1 — Weekend moments (Tier 1: no new site) · status: not started · P1

```
## Active focus — B.1 · Weekend moments — a schedule entry, not a site

**Goal:** A welcome drink, a morning-after brunch, or any other
"moment" in a wedding weekend becomes a slot on the couple's OWN
site's itinerary block — zero new sites, zero new domains, zero new
guest lists. Fixes the heavyweight-by-default finding of
docs/GRAND-PLAN-2.md §4.1 for the events that don't need their own
guest list.

**Direction:** The itinerary block type already exists and already
renders multi-day/multi-slot schedules (CLAUDE-PRODUCT.md §2.2/§4;
wizard-sections.ts already offers it per occasion). No new table.
WeekendBuilderPage.tsx's flow, for anything the host marks as a
"moment" rather than "its own site," should append a slot to
manifest.blocks' itinerary entry on the currently-selected site
instead of calling /api/celebrations/weekend's per-event
saveSiteDraft loop. Read src/lib/db.ts:202-213 first to confirm
exactly what saveSiteDraft does today so the new path is a genuine
alternative, not a parallel call into the same heavyweight function.

**Open threads:**
- [ ] Decide the moment's shape: { day, time, label, location, note }
      as one itinerary-block entry; confirm the renderer already
      handles a bare entry with no dedicated guest list gracefully
- [ ] WeekendBuilderPage.tsx: per named event, a real choice —
      "Add as a moment on this site" (default) vs. "Give it its own
      site" — not the current single "each becomes its own site" copy
- [ ] Wire "moment" mode to write directly into the selected site's
      manifest.blocks itinerary entry (existing autosave path via
      bridge.ts, not a new API route)
- [ ] Update WelcomeHome's "Around your day" card (cockpit.tsx
      WeekendCard, wired at WelcomeHome.tsx:407-420) to read moments
      from the itinerary block first, sibling sites second

**Counts as done:** adding a "Friday welcome drinks" moment through
Weekend Builder creates zero new rows in `sites` (verify via
Supabase); it appears as a real slot in the couple's own published
site's schedule/itinerary section; the dashboard's weekend card shows
it without a second domain anywhere in the UI.

**Skip:** Anything about Tier-2 (bachelor/ette, rehearsal dinner) —
that's B.2 and explicitly keeps today's real-site behavior.
```

---

### B.2 — Weekend events (Tier 2: cheaper real sites) · status: not started · P2

```
## Active focus — B.2 · Weekend events — real sites, cheaper to make, properly linked

**Goal:** Events that genuinely need their own guest list (bachelor/
ette, rehearsal dinner, bridal shower) still get real sites, but
created through the SAME instant-manifest wizard pipeline every other
site uses, and linked via the EXISTING Celebration Model — not the
separate, partially-duplicated /api/celebrations/weekend route.

**Direction:** src/app/api/celebrations/weekend/route.ts currently
hand-builds a manifest per satellite event and calls saveSiteDraft in
a loop (route.ts:120-182). Replace that with: for each Tier-2 event
the host names, apply the SAME applyWizardLook + seedSectionsFromWizard
pipeline the wizard's own handleFinish uses (CLAUDE-DESIGN.md §8),
then call syncCelebration + linkSiteCelebration
(src/lib/celebrations.ts:28-77) to join it to the parent celebration —
exactly the mechanism GRAND-PLAN.md Pillar 7 already built for this.
This removes the celebration-linking special-casing currently baked
into api/celebrations/weekend and replaces it with the general-purpose
primitive that already exists.

**Open threads:**
- [ ] Confirm applyWizardLook + seedSectionsFromWizard can run
      server-side outside the wizard's own client flow (they may need
      a thin server wrapper — check for existing usage in
      /api/generate/stream or similar server contexts)
- [ ] Replace the per-event saveSiteDraft loop in
      api/celebrations/weekend/route.ts with the wizard pipeline +
      syncCelebration/linkSiteCelebration
- [ ] WeekendBuilderPage.tsx's "give it its own site" choice (from
      B.1) routes here
- [ ] Verify the public sibling-links strip (LinkedEventsStrip.tsx)
      still renders correctly for celebrations built this way

**Counts as done:** creating a bachelorette-party satellite through
Weekend Builder produces a real, published-quality site indistinguishable
from one made through /wizard/new, correctly joined to the parent
celebration via sites.celebration_id — verified by checking the
sibling-links strip renders on both the parent and the satellite.

**Skip:** B.1's moment-tier work (separate sprint, separate code path).
```

---

### C.1 — Circle, redesigned · **status: SHIPPED 2026-07-08** · P0

> Shipped: DashCircle.tsx rebuilt as a place. The friend GRID is the
> hero — per-friend cards with a flat tinted paper disc (PD
> sand/wash/mint/blush cycled by index — dark-mode-aware, no
> spheres), Fraunces name, and a real last-note preview from one
> `GET /api/threads` on load ("You: …" / "‹Name›: …", italic
> "No notes yet — begin a thread." when empty; sending a note
> updates the preview optimistically). Requests + waiting-on fold
> into ONE slim gold-ruled attention strip that only renders when
> non-empty. Opening a friend gives the card a gold hairline ring
> and expands a full-width two-column detail panel below the grid
> (thread + composer left; shared celebrations, dietary, and the
> weave-into-an-event chips right) instead of the old nested inline
> row. Invite + discovery drop to a secondary two-up row; the empty
> circle uses the shared <EmptyState/>. Both detail + secondary
> grids collapse at 720px. Zero API changes — listThreads already
> carried the previews. Verified live with mocked populated state
> at 1280 + 390 (screenshots: c1-circle-grid, c1-circle-detail,
> c1-m-grid). tsc/eslint clean, vitest 1256/1256.

```
## Active focus — C.1 · Circle looks like a place, not a settings panel

**Goal:** DashCircle.tsx reads as a warm, populated social space —
friend mini-cards with thread previews as the primary view — instead
of five equal-weight stacked panels. Fixes the "reads like Settings"
finding of docs/GRAND-PLAN-2.md §5.1.

**Direction:** Current structure (DashCircle.tsx: opt-in gate
:223-236 → requests :241-255 → your circle :258-411 → waiting-on
:413-429 → invite :431-467 → discovery :470-485) is functionally
complete but visually flat — every panel is the same weight. Redesign
around a primary grid of friend cards (mark/photo, first name,
last-thread preview truncated, shared-event count if any) as the hero
of the page; fold requests/waiting-on into a slim top strip (badge
count, expandable); keep invite + discovery but visually secondary,
below the friend grid. Paper + thread + letterpress only — BRAND §9
is explicit that glass is chrome-only, never a surface, so friend
cards stay paper with a hairline, not a frosted panel.

**Open threads:**
- [ ] Friend-card grid component (mark, name, last message preview,
      shared-event count) replacing the current flat "your circle"
      list rows
- [ ] Requests + waiting-on collapse into one slim expandable strip
      above the grid (badge count when collapsed)
- [ ] Invite + discovery move below the grid, visually secondary
      (smaller type, muted ink) — still fully functional, just not
      competing for first-glance attention
- [ ] Verify against BRAND §9 — no glass-as-surface, no gradient
      cards; reuse whatever Track A (§3) lands on for the card
      primitive if A.1 has already shipped

**Counts as done:** a fresh screenshot of /dashboard/circle with 3+
real friends reads as a populated social space at first glance, not a
form; requests/invite/discovery are all still one tap away, just not
visually equal to the friend grid.

**Skip:** The chat surface itself (thread bubbles + composer) — that's
functionally fine today; this sprint is the SURROUNDING page, not the
thread UI. Group/crew threads (C.6).
```

---

### C.2 — Invite by text · **status: SHIPPED 2026-07-08** · P1

> Shipped: the invite composer gets a By-email/By-text channel
> toggle; text mode sends `{ phone }` to the same /api/friends
> invite action, which normalizes via lib/sms.ts's normalizePhone,
> mints a circle-invite TOKEN (new `circle_invites` table —
> migration 20260708_circle_invites.sql, **apply to prod pending
> Supabase MCP re-auth**; code degrades gracefully while absent),
> and sends the SMS through the proven sendSms path with a
> personal link to /signup?circle=<token>. Design decision vs. the
> original block: people.email is NOT NULL, so there is no
> phone-first resolvePersonId — a phone-only invitee CANNOT be
> pre-created as a person row; the token IS the identity bridge
> (claiming stamps their phone onto the person row they create at
> signup). Keyless deploys answer "Text invites aren't set up yet"
> honestly. Verified live: toggle + tel input render; stash/claim
> loop verified end-to-end under C.3.

```
## Active focus — C.2 · Invite a friend by text, not just email

**Goal:** The Circle invite composer offers "by text" alongside "by
email," reusing the Twilio plumbing already proven for guest invites.
Fixes the "no SMS anywhere in Circle" finding of docs/GRAND-PLAN-2.md
§5.1.

**Direction:** src/lib/sms.ts + the pattern in
src/app/api/guests/text-invite/route.ts already work in production for
per-event guest invites — reuse them, don't rebuild Twilio integration.
POST /api/friends {action:'invite'} currently only accepts email
(friends.ts:322-326 normalizeInviteEmail). Add a phone field as an
alternative identifier; resolvePersonId (people.ts:41-86) needs a
phone-first lookup path added (people.phone is already a column,
20260621_people.sql:27-40 — just not queried on today for identity
resolution the way email is).

**Open threads:**
- [ ] people.ts: phone-first resolvePersonId path (parity with the
      existing email path)
- [ ] /api/friends invite action: accept phone as an alternative to
      email; validate + normalize (reuse whatever normalization
      guests/text-invite already does)
- [ ] DashCircle.tsx invite composer: a tab or toggle, "By email" /
      "By text," not two separate forms
- [ ] Send path: reuse lib/sms.ts's send function with circle-invite-
      specific copy (not the guest-invite template)

**Counts as done:** inviting a phone number through Circle sends a
real SMS (verify via Twilio test credentials or a logged dry-run),
creates the same pending `people`/`friendships` rows email invite
does, and the recipient's later sign-in resolves to the same person
row whether they used email or phone to accept.

**Skip:** Auto-friending logic changes (C.3) — this sprint is the
send channel only, the accept flow is unchanged.
```

---

### C.3 — Tighten the accept moment · **status: SHIPPED 2026-07-08** · P1

> Shipped: /signup?circle=<token> stashes `pl-circle-invite`
> (same survive-the-auth-gate pattern as pl-wizard-claim);
> `POST /api/circle-invites/claim` (session-authed, rate-limited)
> redeems it via `claimCircleInvite` — files the PENDING request
> FROM the inviter (their invite = their request, via the existing
> requestFriend state machine, so consent is unchanged), stamps
> claimed_at/claimed_person_id, back-fills the claimer's phone.
> The new `<CircleInviteClaim/>` (mounted once in
> ShellPersistentLayout) then shows the one-tap gold-hairline pill:
> "‹Name› saved you a place in their circle — add them back?" →
> accept via the normal /api/friends accept; "Not now" leaves the
> pending request answerable later in Circle (never auto-declines).
> A forwarded link can't create a second request (claimed-by-other
> is terminal). The sealed-envelope /welcome flow remains the
> fallback for requests NOT tied to an arrival link. Verified live
> end-to-end with the e2e session: stash SET → pill SHOWN → accept
> → "in each other's circle now" confirmation. vitest 1256/1256.

```
## Active focus — C.3 · One tap to add them back, not a buried onboarding step

**Goal:** Someone who signs up via a named, personal circle-invite
link sees a single, immediate "Add [name] back?" action at the top of
their first session — not a sealed-envelope metaphor buried inside
the general /welcome onboarding flow. Fixes the "two separate accept
actions for one already-named invite" finding of docs/GRAND-PLAN-2.md
§5.1. Mutual consent is NOT removed — both people still act — this
sprint removes the extra HOP, not the consent step.

**Direction:** Today: POST /api/friends {action:'invite'} creates a
'pending' friendships row (friends.ts:340-359); the invitee's eventual
sign-in resolves them to the same people.id via resolvePersonId
(people.ts:41-86), but the pending request only surfaces inside
/welcome's sealed-envelope UI (per docs/ONBOARDING-PLAN.md:96,129),
requiring a separate unseal-then-"Keep them" flow
(respondFriend, friends.ts:210-241). Distinguish "arrived via a
personal circle-invite link" from "arrived via generic /signup" (the
invite link should already carry a token/identifier — check how the
existing guest passport-token pattern works for precedent) and, for
the personal-invite case specifically, surface the accept action
immediately and prominently on first landing rather than folding it
into the general onboarding sequence.

**Open threads:**
- [ ] Confirm/build a distinguishable circle-invite link (token or
      email-match) separate from generic signup
- [ ] First-session detection: does this account have a pending
      friendships row FROM the specific inviter whose link they used?
- [ ] Surface a one-tap "Add [name] back?" action immediately (not
      inside the sealed-envelope welcome step) when that's true
- [ ] Existing sealed-envelope /welcome flow stays as the fallback for
      pending requests NOT tied to the invite link the person actually
      used to arrive (e.g., someone invited by a third party earlier)

**Counts as done:** signing up via a personal circle-invite link and
completing account creation shows an immediate, one-tap "add them
back" moment before or without needing to complete the full /welcome
sequence; declining still works and doesn't auto-create a friendship.

**Skip:** SMS invite work (C.2, separate sprint) — this sprint is
about the ACCEPT side regardless of which channel sent the invite.
```

---

### C.4 — Friend and guest in one step · **status: SHIPPED 2026-07-08** · P2

> Shipped: AddGuestDialog gains "Also add to my Circle" — off by
> default, enabled only when an email is present AND the host's
> circle is opted in. One submit fires the existing guest-add path
> plus a fire-and-forget /api/friends invite per entered email
> (couple mode invites both); the server side is idempotent (an
> already-pending/accepted pair no-ops via decideRequest), and no
> second email exists to dedupe — the circle invite sends nothing;
> its pending request greets the guest at first sign-in, so the
> recipient still gets exactly ONE message (their guest invite).
> A circle failure never fails the guest add. Design note vs. the
> original block: client-side "not yet a friend" detection is
> impossible by design (friends carry personId + first name only —
> emails never cross the wire), so the checkbox shows for any
> email and idempotency does the dedupe server-side. The weave-in
> direction (existing friend → event) is untouched. Verified live:
> checkbox shown, one submit produced both the guest POST and
> {action:'invite', email, name}. vitest 1256/1256.

```
## Active focus — C.4 · Adding a guest can also add a friend, in one action

**Goal:** The Add Guest dialog offers "Also add to my Circle" as a
single checkbox — one submit creates the guest AND sends a friend
invite when the person isn't already a circle friend. Fixes the "two
separate screens for what feels like one action" finding of
docs/GRAND-PLAN-2.md §5.1.

**Direction:** Today, /api/guests (or /api/guests/from-person for
existing circle friends, per SOCIAL-PLAN.md's weave-in) only ever
touches guests/people — never friendships. DashGuests.tsx's
AddGuestDialog already checks whether an entered email matches an
existing circle friend (the "FROM YOUR CIRCLE" chip row, per
SOCIAL-PLAN.md:186-189) — extend that same lookup to detect the
NOT-a-friend-yet case and offer the checkbox. On submit with the box
checked, fire the existing guest-add path AND the existing
/api/friends invite path — don't build a new combined endpoint, just
sequence the two existing calls client-side (or server-side if a
single request is preferable — check whether the existing patterns in
this codebase prefer one over the other, e.g. sendGuestInviteEmail's
call site in /api/guests/from-person/route.ts for precedent on
combining actions in one handler).

**Open threads:**
- [ ] AddGuestDialog: detect "not yet a circle friend" for the
      entered email/phone (reuse the existing circle-friend lookup,
      just invert the condition)
- [ ] "Also add to my Circle" checkbox, off by default (adding a
      friend is a bigger ask than adding a guest — don't default it on)
- [ ] Wire the checkbox to fire both the guest-add and the
      /api/friends invite call on submit
- [ ] Confirm the two actions don't double-send email — a person
      getting both a guest invite AND a circle invite in the same
      moment should get ONE email that mentions both, not two

**Counts as done:** adding a new guest with the checkbox ticked
creates both a guests row AND a pending friendships row; the
recipient gets one coherent email, not two; the existing weave-in
path (adding an EXISTING friend to an event) is untouched.

**Skip:** Any change to the existing weave-in flow (from-person route)
— this sprint is strictly the reverse direction (event → circle).
```

---

### C.5 — Realtime chat · status: not started · P2

```
## Active focus — C.5 · Threads stop polling, start feeling like chat

**Goal:** The 1:1 person-thread UI moves from 25-second polling to
Supabase Realtime. Fixes the "feels like an inbox, not a chat app"
gap of docs/GRAND-PLAN-2.md §5.1/§5.2.

**Direction:** person_threads/person_messages
(20260708_person_threads.sql) already has the right shape and RLS;
src/lib/threads.ts already re-verifies the accepted friendship on
every read/write. DashCircle.tsx:67-69 currently polls /api/threads
every 25 seconds. Subscribe instead to Supabase Realtime inserts on
person_messages filtered to thread_ids the signed-in person's
people.id is party to (person_lo/person_hi). This mirrors work already
done elsewhere in the product for a different feed — check whether
any existing Realtime subscription (e.g. the site_messages 'pl-msg-
${siteId}' broadcast channels, per CLAUDE-DESIGN.md §12) has a pattern
worth reusing rather than inventing a new subscription shape.

**Open threads:**
- [ ] Realtime subscription scoped to the signed-in person's own
      thread ids (never a broad table-wide subscribe — RLS should
      enforce this but verify the subscription filter matches it)
- [ ] Optimistic send stays (already exists per SOCIAL-PLAN.md) —
      Realtime replaces the POLL for INCOMING messages, not the
      existing optimistic local echo for outgoing ones
- [ ] Fallback: if Realtime is unavailable (env not configured, or a
      transient disconnect), degrade to the existing 25s poll rather
      than going silent
- [ ] Typing/presence — explicitly OUT of scope unless it's near-free
      given the Realtime channel already open; don't scope-creep this
      sprint into a presence system

**Counts as done:** two authed sessions in different browser contexts
exchange messages with sub-second latency, no visible poll delay;
disabling Realtime (simulate by blocking the websocket) falls back to
polling rather than a broken thread.

**Skip:** Group/crew threads (C.6) — this sprint is the existing 1:1
pair thread only.
```

---

### C.6 — Group threads (stretch) · status: not started · P3

```
## Active focus — C.6 · Crew threads — the reserved kind, finally built

**Goal:** A host can start a named group thread with several circle
friends ("Bach weekend crew"), using the already-reserved but unbuilt
kind='crew' row shape on person_threads. Fixes the "schema-ready,
zero UI" gap noted in both SOCIAL-PLAN.md and
docs/GRAND-PLAN-2.md §5.1.

**Direction:** person_threads.kind already has a CHECK constraint
allowing 'crew' (20260708_person_threads.sql:33-54) but nothing reads
or writes it. Needs one new membership table
(crew_thread_members(thread_id, person_id), deny-anon RLS matching
the pattern of every other people-adjacent table this session/prior
sessions have built) and a "start a group" affordance in the
redesigned Circle (C.1) letting a host pick 2+ existing circle
friends. Message send/read logic should be nearly identical to the
1:1 case in lib/threads.ts — the main new surface is membership
checking (a message read/write must verify person_id is IN
crew_thread_members for that thread, not just "is one of exactly two
people" as the pair case implicitly assumes).

**Open threads:**
- [ ] crew_thread_members table + migration + RLS
- [ ] lib/threads.ts: generalize the pair-thread membership check to
      also handle crew (membership-table lookup instead of the
      person_lo/person_hi pair check)
- [ ] "Start a group" UI in the redesigned Circle (C.1) — name the
      thread, pick 2+ friends already in the host's circle only (no
      inviting non-friends into a crew directly — they'd need to be a
      1:1 friend first)
- [ ] Realtime wiring (C.5) extended to crew threads, same
      subscription pattern generalized to membership-table lookup

**Counts as done:** a host creates a named crew thread with 3 circle
friends, all 4 people can send/receive in it, a 5th person (not a
member) cannot read or write to it even with a guessed thread id
(RLS-enforced, verify with a direct query as a non-member).

**Skip:** Anything beyond simple group messaging — no per-thread
roles, no @Pear-in-crew-thread, no read receipts. This is the
minimum viable group thread, not a full chat-app feature set.
```

---

## 8 · Suggested execution order

Not a hard dependency chain — any block can run standalone — but if
picking one order:

1. **A.1** first. Every subsequent redesign (Circle especially) is
   cheaper to build against a settled card primitive than against
   four competing ones.
2. **C.1 → C.2 → C.3 → C.4.** The Circle basics are the most directly
   requested piece and the biggest single "wow" — do them as one
   connected arc so the invite→accept→chat→event loop feels coherent
   end to end rather than shipping in a scattered order.
3. **B.1 → B.2.** The Weekend rethink is a genuine data-model/flow
   change with more moving parts and more risk (touches the wizard's
   server-side pipeline) — give it its own focused session(s) after
   the lower-risk work above has landed.
4. **A.2, C.5, C.6** last — A.2 is a mechanical sweep with no design
   risk (do whenever convenient), C.5/C.6 are polish/stretch that
   benefit from C.1-C.4 already being stable to build on top of.

---

## 9 · Open questions

Surface here rather than assuming, per this codebase's own convention
(CLAUDE-PRODUCT.md §8).

- **Q1:** Should Tier-1 "moments" (B.1) carry any RSVP tracking at
  all, or are they purely informational entries on the schedule? A
  welcome drink probably doesn't need a headcount; a moment with a
  hard capacity (a shuttle with limited seats) might. Tentative:
  informational-only for v1; revisit if a real host request surfaces
  a capacity need.
- **Q2:** For C.3's tightened accept flow — should it apply
  retroactively to already-pending invites sent before this ships, or
  only to invites sent after? Tentative: retroactively, since the
  underlying friendships row is identical either way; the only change
  is where/when the accept action surfaces.
- **Q3:** C.4's "also add to Circle" checkbox — should it be
  available from the Circle side too (i.e., "invite a new person" in
  Circle offers "also add them to this event"), making it symmetric?
  Tentative: yes, eventually, but ship the guest→circle direction
  first since that's the more common real host workflow (hosts think
  in terms of "who's coming," not "who's in my circle," most of the
  time).
- **Q4:** Does A.1's card-primitive decision affect anything already
  mid-flight elsewhere in the codebase (check for any other open
  branch touching Dash*.tsx files before starting, to avoid a merge
  pile-up)?

---

## 10 · Conclusion

Three fronts, one root discipline each: **unify** the card chrome
(it's inconsistent because nothing ever chose), **right-size** the
weekend model (it's heavy because nothing ever built the light
option), and **finish** the circle (the graph and the messaging are
already real — they're just wearing the wrong clothes and missing the
one automatic step a genuine social product needs). None of these are
greenfield. All of them are "the plumbing mostly exists — connect it
and give it the surface it deserves," the same throughline
GRAND-PLAN.md found across the whole product. Sprint blocks are armed
and waiting at §7.
