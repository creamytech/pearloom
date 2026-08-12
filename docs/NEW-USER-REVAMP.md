# NEW-USER-REVAMP.md — the first full user test, and where to revamp

> **What this is.** The first end-to-end user test of the current build on a real,
> persisting stack — the walk `docs/DECISIONS-2026-08-04.md` §3 admits no human had
> taken. One simulated first-time host ("Maya Rivera") walked landing → signup →
> welcome → wizard (six photos, real story text) → press → editor → publish; a
> simulated guest ("Priya Patel") RSVP'd; then seven parallel surface audits and an
> adversarial verification pass ran over the same live environment. Everything below
> is evidence-anchored: a screenshot, a database row, or a code path.
>
> **Method.** Local full simulation: Postgres 16 with all 80 repo migrations, a
> PostgREST+Storage emulator standing in for Supabase, the real Next.js app,
> Playwright driving real browsers. Real signup (scrypt credentials), real writes,
> real RSVPs. AI keys, email delivery, and Google OAuth were absent — findings
> caused by their absence are tagged as simulation artifacts, not product defects;
> what IS reported is how the product behaves when those dependencies degrade,
> which is coded-in behavior that production users will meet on any model hiccup,
> AI-budget cap, or slow network. Written 2026-08-12.

---

## 0 · The one-paragraph verdict

The crafted moments are real and they land — the welcome flow, the wizard's live
pressing, the proof-and-seal review, the guest's "You're woven in." are the best
versions of those moments I've seen in this category. But every strategic pillar
has a severed wire between two halves that were each built well separately: the
doorway is walled by a layout file the doorway contract can't see (H1); the press
double-fires across the wizard→editor seam (H2); the host's words die crossing
into the site (H3); the publish ceremony gates nothing (H7); the billing gates
read a table the billing grant can't write because it doesn't exist (H5); the
"Remember" pillar filters on a column nothing sets (H6); and the passport growth
engine reads a guest table the RSVP flow doesn't write (H8). The product is a set
of excellent organs with no circulatory system. The revamp it needs is not another
design pass — RADICAL-DESIGN already shipped that — it is a **continuity revamp**:
one uninterrupted thread from first click to published site to guest reply to the
next host, with every hand-off honest, idempotent, and *tested end-to-end across
the seam* rather than unit-pinned on one side of it.

---

## 1 · Headline discoveries

### H1 · The signup wall is back, and it contradicts everything [P0 — strategic regression]

**Observed:** signed out, every door into creation dead-ends at a password field.

- Landing → type "Ana & Leo" into the hero → **Create your site** → `/login?next=/wizard/new`.
- `/start` (the express door) → paste details → "Here's what we read" → **Looks
  right — continue** → `/login?next=/wizard/new`.
- `/wizard/new` direct → `/login?next=/wizard/new`.

**Cause:** `src/app/wizard/layout.tsx` — 17 lines, comment "Mirrors
src/app/dashboard/layout.tsx" — server-gates every `/wizard/*` route on a session.

**Why this is the most important finding in this document:** the product's own
strategy stack protects the opposite behavior at four layers, and all four were
bypassed by this one file:

1. `docs/REVIEW-SYNTHESIS.md` §1.5 — all three external reviews ranked no-signup
   preview at/near #1 ("the gap is questions-before-value").
2. `docs/PERSONA-PLAN.md` S3 — "the unbroken signed-out thread" SHIPPED: claim card
   on /signup, press resumes post-auth, palette gate degrades honestly. **All of
   that machinery is now unreachable code.**
3. `src/proxy.ts` carries THE DOORWAY CONTRACT in a comment block ("Adding a
   creation surface here would silently reinstate the signup wall this product
   deliberately removed") plus `MUST_STAY_OPEN_PREFIXES = ['/start', '/makeover',
   '/wizard', '/editor', …]`.
4. `src/proxy.test.ts` pins the contract — **at the proxy layer only.** A layout
   file above it re-instated the wall and no test noticed.

**The lesson for the revamp:** the funnel has no end-to-end guard. The doorway
contract must be pinned by a test that *walks the funnel* (fetch `/wizard/new`
without a session, assert 200), not by a unit test over one exported constant.

### H2 · The seal press can double-create, burning the URL and the free tier [P0]

**Observed:** one wizard run produced two `sites` rows 23 seconds apart —
`maya-and-daniel` (orphan draft) and `maya-and-daniel-2` (the site Maya actually
landed in). Every subsequent surface compounds it:

- The publish modal, share kit, and live URL all read `…/wedding/maya-and-daniel-2`
  — her clean name is squatted by her own orphan.
- **My sites** shows two identical cards ("Maya & Daniel · Jun 12, 2027 · Wedding ·
  Pressed Garden" — one LIVE, one DRAFT) with **no delete affordance** and no way
  to tell them apart.
- The free tier allows exactly 2 sites (docs/DECISIONS-2026-08-04 §2, verified live:
  the 3rd create 402s with "You've reached the sites limit for your plan (2)") — so
  **the bug consumes the entire free allowance**. Maya's next act — the bridal
  shower her MoH wants, the exact reverse-acquisition loop the free tier was
  resized FOR — hits an upgrade prompt caused by a defect.

**Cause (verified in code):** two cooperating gaps —
1. `handleFinish` re-fire paths: the seal's `busy` guard is component state; the
   press overlay mounts slowly on a cold route; an impatient second activation (or
   the `pendingPress` resume effect) can run `handleFinish` twice.
2. `findAvailableSubdomain` (`src/app/api/sites/route.ts:25`) treats **any**
   existing row as taken — including the same creator's row from the same press —
   and silently suffixes `-2`. Creation has no idempotency key; the same-owner case
   is never adopted.

### H3 · The host's own story dies silently [P0-adjacent trust break]

Maya gave the wizard four sentences that matter (pottery class, the proposal at
Craggy Gardens, the dog). Verified in the database: that text lands **only** in
`manifest.factSheet.story`. The published site ships with **no story section at
all** — nav shows Details/Schedule/Travel/…, no "Our story," despite the wizard
promising "Pear listens for the specifics and weaves them into the site itself."

In the editor, the PEAR SUGGESTS card offers "I can **baste** a first draft of the
story section in from exactly what you said" → **Add it** → button reads "Adding…"
→ *nothing happens, no error, card stays*. The code admits it —
`src/components/pearloom/redesign/BastedIn.tsx`:

> "Draft came back empty (keyless deploy / model hiccup) — leave the card up so the
> host can retry or pull it."

A model hiccup or a capped AI budget produces this exact dead-button experience in
production. Two aggravations: the copy says "baste," vocabulary BRAND.md §7
explicitly retired from user-facing copy in July; and the highest-emotion content a
host gives the product is the content with the least reliable path to the site.

### H4 · The RSVP asks about a dinner the host never planned [P1 — honesty]

Maya explicitly skipped "We know the menu +" in the wizard. Priya's RSVP still asked
her to choose **Chicken / Fish / Vegetarian / Kids meal** (the wedding preset's
unconditional default fields). The host now holds meal answers for a menu she hasn't
planned; the guest now believes a plated dinner exists. The product's own honesty
rule — published sites render exclusively host-authored content — stops at the RSVP
form's questions.

### H5 · The till has no ledger: a paying customer cannot receive what they bought [P0 — verified against PRODUCTION]

Not a simulation artifact — verified by read-only queries against the prod database
(project vpwnpxowqflajvqpgvyb):

- **`user_plans` does not exist in production.** Both Stripe webhook handlers grant
  a purchased plan via `updateUserPlan` → upsert into `user_plans`
  (src/app/api/stripe/webhook/route.ts:132, src/app/api/billing/webhook/route.ts:74)
  — which **throws on a missing table**. A customer who pays $89 for the Pass is
  charged by Stripe and never receives the plan; every later lookup fails and
  degrades to free limits (plan-gate rule 3). MONETIZATION.md marks these gates
  "Enforced"; the enforcement reads work, but **the grant side has no storage.**
- The same prod check found a whole family of code-shipped features whose tables
  exist nowhere: `section_analytics` (every published-site view beacon 500s;
  analytics permanently empty), `site_invites` (coordinator invites dead),
  `guestbook_messages` + `whispers.message/read_at` (the notification bell's polls
  error forever), `marketplace_purchases`, `referrals`, `announcements`,
  `email_captures`, `gallery_photos`, `invite_tokens`, `photos`, `time_capsules`.
  Of SETUP.md's manual tables, only `scheduled_emails` was ever applied to prod.
- **`sites.domain` and `sites.user_id` don't exist in prod either**, yet the
  submissions/toasts moderation ownership check (`.eq('domain', …)`), The Reel
  (`select … domain …`), and the registry-items ownership check
  (`select user_id, creator_email`) query them. The moderation check "fails
  closed" — **site owners get 403 from their own moderation queue in production**,
  and guest tributes/toasts go into a queue no one can ever read.

### H5b · And the migrations can't rebuild what prod does have [P1 — blocks staging]

The mirror-image problem: `guests_site_email_unique` exists on prod but not in
`supabase/migrations/` — so a migrations-built environment (the staging env
REVIEW-SYNTHESIS §1.1 item 8 calls for) ships with **every guest RSVP hard-failing**
("We could not save your RSVP", verified live in this simulation before patching).
There is no single source of schema truth: prod is missing what the code needs,
and the migrations are missing what prod has.

### H7 · "Nothing is public until you publish" is false — drafts are world-readable [P0 — privacy]

The wizard's Review step promises "Nothing is public until you publish, Maya." The
publish modal frames a "GO LIVE" moment. Verified live: the UNPUBLISHED orphan
draft (manifest.published absent, `comingSoon.enabled: true`) serves its complete
site — names, date, venue, schedule, parking — at its guessable URL
(`/wedding/maya-and-daniel`, HTTP 200) to a logged-out visitor. The coming-soon
flag gates nothing. For a wedding this is a broken promise; for the
privacy-sensitive occasions the product courts (bachelorette parties are
private-by-default per CLAUDE-PRODUCT §8 Q2, memorials in progress) it is a
disclosure bug. Publish must be a real gate, not a ceremony.

### H6 · The "Remember" pillar has never fired for anyone [P0 — verified against PRODUCTION]

`publishSite` stamps `published_at` and `manifest.published`, but **nothing in src/
ever writes the `sites.published` boolean** — and five features filter on
`.eq('published', true)`: the sibling-events strip, the celebration timeline, the
anniversary cron, the weekly digest, and the day-after recap. Prod check:
`select count(*) from sites where published = true` → **0 rows, ever**. The entire
third pillar of the positioning ("Remember — the film, anniversary rebroadcast")
plus cross-event linking is silently dead in production. (The dashboard's
LIVE/DRAFT chips are unaffected — they derive from `manifest.published`, and
`sites-list.ts` even carries a comment claiming the table "carries no published
column," which prod contradicts: the column exists, it is just never written.)

### H8 · The guest passport — "the growth engine" — is a 404 [P0 — verified]

REVIEW-SYNTHESIS §1.6, unanimous: "The passport is the growth engine … elevate it
to the product's center." Verified live: a guest who RSVPs through the published
site gets a `passport_token` on the `guests` table — and `/g/<that token>` returns
**404**. The passport resolver reads the parallel `pearloom_guests` table (empty
for product-created guests); the guest world is forked across two tables with two
token columns and two resolvers, and the halves don't meet. Compounding: where a
passport does render (legacy paths), its "RSVP now" CTA links to `/dev/site` — a
demo couple's wedding — and re-submitting an RSVP silently wipes the guest's prior
meal/song/note answers. The strategy's centerpiece is unshippable today.

---

## 2 · The walk, scored stage by stage

| Stage | Grade | What happened (evidence in §5) |
|---|---|---|
| Landing | **A–** | Dark editorial hero, occasion tabs re-press the page, typed-names input, honest stats. Undermined only by where its CTA leads (H1) and hot-linked Unsplash imagery on a "craft house" brand. |
| Signup → Welcome | **A** | Five movements (name → mark → occasion → seal-press agreement) with real intent capture. The single best onboarding flow I have walked in this category. |
| Wizard | **A–** | Live phone preview mirrors every keystroke; moments picker stamps typical times; six uploaded photos became a real extracted palette; the sections table-of-contents is pre-picked and glanceable; the Review proof is the real site. Voice intake offered on Basics. |
| The press | **F** | H2. The one moment that must be bulletproof is the one that double-fires, and its slug logic burns the couple's name. |
| Editor handoff | **C** | Canvas hero read "…Asheville, North Carolina · **Santorini, Greece**" (theme demo venue beside real data — the exact "demo presented as mine" class the S1/S2 persona fixes cleaned out of the wizard, surviving in the editor). "PEAR SUGGESTS" dead-buttons (H3). Readiness says 86% while My sites says "Pear thinks everything's set." Dense three-rail chrome meets a first-time host. |
| Publish | **B+** | Clean modal (public/password, address preview, single CTA), warm "You're live" moment with next-step doors. Shows the burnt `-2` URL (H2); OG preview renders the date raw ("2027-06-12") with low-contrast names. |
| Published site | **B** | Honest content gating (no demo leaks — Santorini does NOT publish), calendar links, drawn map, countdown. But: no story section despite the host writing one (H3); dangling "·" separator after the location in hero + footer; meal question fabricated (H4). |
| Guest RSVP | **A–** | Name-first lookup, three steps, no account, full data round-trip (status/meal/song/note verified in DB), persistent-identity `people` row created, "You're woven in." confirmation with add-to-calendar. |
| Dashboard | **B–** | The Guests page is excellent (Priya's full row, per-moment RSVP chips, meal counts, who-can-reply switch). But Home's guest summary told Maya she has **no guests** while Priya's RSVP sat one click away (`/api/guests?site=` vs the route's `siteSlug` contract — 404 masked to an empty state); "Planning progress 25%" counts Pear's own un-accepted email suggestions as the host's to-dos; the Day-of room cosplays a live wedding 304 days early ("Right now: Cocktail hour"); day-of checklist ticks live in `useState` and vanish on reload; duplicate site cards (H2); the sidebar plan chip speaks a retired vocabulary. |
| Studio | **A–** | A real card designer: three drafted directions, site-look inheritance (palette/paper/edge/grain), live send counts, proof sheet. Mark tray shows sample "S&S" monograms instead of the couple's M&D. |

**The shape of the product, from the walk:** the peaks are extraordinary and the
valleys are all in the same place — every seam where one surface hands the user to
the next (landing→wizard, press→editor, wizard-story→site, host-config→guest-form,
site→My-sites). The revamp target is the seams, not the surfaces.

---

## 3 · What must not be touched

Genuinely excellent, verified working, load-bearing for the brand (mine + the
fleet's independent "impressed" lists, converged):

1. **The welcome flow** — the seal-press agreement is the most memorable ToS moment
   in software; intent capture works (the wizard pre-selected Wedding with "★ FOR
   YOU" from Maya's onboarding answer).
2. **The wizard's live pressing** — every keystroke lands in the phone preview;
   photos → palette in seconds, client-side; the sections step reads as a glance.
   And the S1 occasion-truth work **holds** across memorial / bachelorette / baby
   shower / birthday runs — "IN LOVING MEMORY … a life, well loved," never a
   conjugated wedding verb. The breaks are all at seams *beyond* the wizard.
3. **The first-time guest RSVP** — 4 taps + one typed field, live name
   recognition, no account; the decline path is genuinely graceful (hides the
   celebration fields, stores a clean row, "The door stays open if plans change").
4. **The Guests dashboard page** — dense but instantly legible; real data,
   per-moment chips, honest meal counts, a plainly-worded privacy switch.
5. **The Studio** — real card design inheriting the site's look; depth no
   competitor's stationery tool has.
6. **The grief exemption is real code, not marketing** — `isGriefExempt` is
   consulted by every capacity gate; memorials never consume slots; Settings
   restates the promise.
7. **Editor micro-flows** — hide-a-section (eye icon → instant canvas update →
   undoable toast → labeled reversible toggle) is exemplary; autosave held up
   under every edit type the fleet threw at it.
8. **The three-area nav collapse** works for a novice — 13 items in named groups
   beat the 34-destination sprawl it replaced.

---

## 4 · Where to completely revamp

The design-taste work is done and shows — the fleet's competitive audit put it
plainly: *"116 layout variants, 75 packs, a Studio with press-sheet geometry
tests, a Landing-v4 polish: this surface already exceeds parity — a revamp here
would be redecorating."* What follows is product structure.

### 4.0 · First: the two-week wire-repair sprint (before any revamp)

Every P0 in §1 is a severed wire, and none is a rebuild. In rough order of
blast-radius per hour of work:

| Wire | Repair |
|---|---|
| H1 doorway | Delete `app/wizard/layout.tsx`'s gate; add the funnel e2e (signed-out fetch of `/wizard/new` → 200) so no layer can re-wall it. |
| H5 billing storage | Ship `user_plans` (+ the other phantom tables) as real migrations; apply to prod; add a webhook integration test that grants a plan against a migrations-built DB. |
| H8 passport | Point the `/g/[token]` resolver at both token columns (the email-bridged resolver `resolveGuestToken` already exists in `lib/people.ts` — the page just doesn't use it); fix the `/dev/site` CTA. |
| H7 publish gate | Make the public site route honor unpublished/comingSoon; then "Nothing is public until you publish" becomes true. |
| H6 remember pillar | Write `sites.published` in `publishSite` (one line) — five dead features come back on. |
| H2 press | Idempotency key per press session; same-owner slug adoption; a delete path for duplicate drafts. |
| RSVP resubmit | Prefill the recognized guest's reply; merge-on-write, never blank-overwrite. |
| /api/guests contract | One param name, one test asserting Home's guest summary equals the roster. |
| Studio mount-autosave | Re-fix and this time pin with a "no write on read-only visit" test (the prior fix, commit `ad77fbb0`, regressed silently). |

The pattern to institutionalize: **every one of these broke at a seam between two
units that each passed their own tests.** The missing discipline is cross-seam
contract tests — the staging build (R6) is where they live.

### R1 · One continuous pressing: merge wizard → editor
The walk's evidence: the wizard is the best surface (A–) and the editor handoff is
the cliff (C). The host goes from "watching my site assemble itself as I talk" to
a three-rail workbench with a fabricated Greek island in the byline.
RADICAL-DESIGN §D already names this stretch ("you never finish the wizard and
enter the editor — you just keep pressing, and chrome fades in as the site takes
shape") and calls it the highest-ceiling idea in the doc. This audit turns that
from taste into evidence: the press double-fires *because* the seam exists;
Santorini leaks *because* the editor canvas is a second rendering contract; the
story dies *because* drafting was deferred across the seam. Merge the surfaces
and the seam's whole bug class goes with it. Fold in the fleet's editor revamps:
**one readiness system** (today an unexplained 86% bar, a topbar checklist, and
Pear's cards each answer "what's left?" differently), **demo ink visibly marked
as demo ink** on the canvas (never composited into one line with real data), and
**a truthful editing model for published sites** (today "Live" + a Publish button
+ 2-second-live autosave coexist — a host redecorating is unknowingly repainting
in front of guests).

### R2 · The guest loop is the product: one identity spine, then the wedge
The strategy docs already declare the passport "the growth engine"; the
competitive audit's verdict is that a Partiful-class social wedge is structurally
present and currently "unclaimable, invisible, and channel-mismatched." The revamp:

- **Collapse the `guests` / `pearloom_guests` fork** — one guest identity, one
  token, one resolver. Three surfaces already disagree about the same guest
  (roster right, Home empty, passport 404). Every future guest feature compounds
  the fork's cost.
- **Make the passport phone-first** — it is the guest's surface and it ships
  desktop-shaped (540px cards on a 390px viewport, overflow, cut-off send button).
- **Make replies durable** — recognized guests see their reply and update it;
  every contribution (photo, song, note, toast) visibly accrues to their passport.
  That accrual is the Partiful-class moat: guests leave a wedding *owning
  something*, and "host your own" converts from a footer link (today an unlinked
  div) into an earned door out of an object they already love.

### R3 · Honest asks, honest states — extend the honesty fence to behavior
The product's honesty architecture protects published *copy* but not *behavior*:
the RSVP invents a menu (and stores the default as the guest's answer); the
registry publishes "we've put a few things together" over zero items; the Day-of
room announces "Right now: Cocktail hour" 304 days early; Home counts Pear's
un-accepted suggestions as the host's progress; money surfaces wear fabricated
"2.4k sold" badges; Guests claims "Pear is following up… once a week" with no such
automation. One law, mechanically fenced like the copy rules already are: **derive
every question, claim, and count from host-authored state, or don't show it.**
The rsvpPreset schema system already exists — wire the visible fields to it,
conditioned on what the host actually configured.

### R4 · "Your words land" — receipts for everything the host gives
The trust contract of "tell me about it" is that the telling visibly shows up.
Generalize BastedIn's one-time receipts: every fact the host gives (story,
parking, kids policy, hotel) has a visible destination; every Pear apply lands
with a shown diff or fails loudly with a retry. No AI call may fail silently on
the golden path — today the code chooses silence by design.

### R5 · One visibility spine
Four flags that never meet govern who can see a site: `manifest.published`,
`comingSoon.enabled`, `privacyGate.password`, and the registry's
`privateByDefault` (declared for bachelor/ette, wired to nothing). Replace with
one visibility state machine — draft / link-only / public / password — enforced
in the site route, surfaced in one place, honest in the wizard's promise and the
publish ceremony. This also delivers CLAUDE-PRODUCT §8 Q2 (private-by-default
bachelorette) for real.

### R6 · Schema provenance + the staging gate
Make the repo able to rebuild prod: adopt a prod baseline migration, reconcile
the six orphan tables and the missing indexes/columns both directions (prod is
missing what the code needs; migrations are missing what prod has). Then the CI
job: build Postgres from migrations, run the critical-path e2e (create → publish
→ RSVP → pay-grant) against it. This audit's harness — local Postgres + the
repo's own migrations + a PostgREST emulator — is a working prototype of that
job and found five prod-verified P0s in one afternoon; institutionalize it.

### R7 · Rebuild the money path end-to-end — it does not exist today
The 2026-08-04 restructure (Page $0 / Pass $89 / Keepsake $199) is decided, and the
*limits* side is genuinely enforced (site/guest/co-host gates verified live; the
grief exemption is real code, consulted by every gate). Everything else about the
money path is severed, fabricated, or dead:

- **No affordance reaches the till** — sidebar "Upgrade" routes to the profile
  page; the 402's `upgradeUrl` and every other funnel loops or dead-ends before a
  Stripe checkout.
- **If a buyer did pay, the grant fails** — `user_plans` does not exist in prod
  (H5); both webhooks throw on grant.
- **A store purchase that completed would land on `/store/success` — a 404.**
- The pricing page sells the Pass on features that are not gated (full Studio,
  Director, broadcasts, seating, budget, vendor book — all free today), while the
  chrome still speaks the retired vocabulary ("Journal · plan") — three tier
  vocabularies coexist (Journal/Atelier/Legacy in chrome, Page/Pass/Keepsake on
  the landing, free/pro/premium in the DB).
- Money surfaces carry **fabricated social proof** — "2.4k sold" counts, ratings,
  "MOST CHOSEN", a fake usage meter — in a product whose entire internal culture
  is honesty-fenced; and `/partners` publicly promises 10–15% commissions
  ("already earning") over a fake registration form with zero backend.
- The growth loop's highest-traffic surface, the published-site "MADE WITH
  PEARLOOM" footer credit, is an **unlinked div**.

The revamp: one plan vocabulary, one upgrade door that reaches a real checkout,
a grant path with storage, tier cards that describe the product that exists (or
`requirePlan` wired to make the cards true), the store re-merchandised for the
signature-shelf model, honest numbers only, and a linked footer credit. Until
this whole chain works, the product has a price but no business.

---

## 4b · The market bets (from the competitive read)

Where a "complete revamp" moves acquisition/retention vs where it redecorates:

1. **Guest-loop acquisition** (= R2). Every competitor's guest is an anonymous
   form-fill (Zola/Joy/Minted) or an ephemeral phone number (Partiful). A
   Pearloom guest can leave with a durable object — passport, recap, their
   contributions. 100 guests per wedding become the funnel instead of the
   audience. Nothing else on the roadmap has this multiplier.
2. **The celebration container as the customer-facing unit** — sequenced exactly
   as DECISIONS §3 says (after doorway evidence), because it is the only pricing
   story that beats "Joy is free": nobody sells "the whole weekend, every host,
   one price." The data model is built; what was missing until now is the
   *working funnel* to gather the evidence — which is what the wire-repair
   sprint restores.
3. **Own "after the day."** Minted owns before (stationery), Zola owns
   during-planning (registry), Partiful owns casual-during — nobody owns after.
   Pearloom has already built the afterglow phase machinery; H6's one-line fix
   turns the pillar on, and the Keepsake tier gives it a business model. Market
   it as the moat instead of treating it as an epilogue.

**Table-stakes debts to price into any plan** (not revamps, but the competitive
audit's gap list the pricing must stop contradicting): custom domains don't exist
on any tier while the archive fee's rationale depends on them; no printed
stationery while the Pass is priced against Minted's print line; no card-based
cash gifts; the email channel is still un-provisioned in prod; no phone-first
guest surface in a market Partiful won phone-first.

## 4c · Stop doing

- **Stop investing in editor variants, theme packs, and landing polish** — past
  parity; every marginal hour there is redecorating (competitive audit's words).
- **Stop shipping new surface ahead of owner unblocks** — every remaining launch
  gate is a non-code owner action (DNS, one env address, a Stripe product, three
  secrets, the Apple cert), the oldest aging 5+ weeks while ~50 commits of new
  surface landed. The docs audit's recommendation stands: a two-week unblock
  sprint, nothing else ships first.
- **Stop letting the docs teach the drift** — CLAUDE-DESIGN.md still instructs
  future sessions to use the retired "Begin a thread" copy; the one §7 rule
  without a fence test is the one that regressed. Fence the retirements, fix the
  teaching doc.
- **Stop re-deciding monetization** — three models in two months with zero paying
  customers; the churn is in the model, not the code. Freeze the 2026-08-04
  ladder behind a reconciliation pass + fence test, then earn the right to
  revisit with ~200 activated celebrations, exactly as DECISIONS §4 already says.

### R8 · Phone-first, for real
The competitive gap ("no phone-first guest surface in a market Partiful won
phone-first") has internal evidence now: the wizard's Basics grid collapses at
390px (NAME 1 crushed to a 66px square), the guest passport overflows the phone
viewport with its Send button cut off, and the **phone editor canvas is
tap-inert** — section text doesn't respond to touch, making phone editing
display-only. RADICAL-DESIGN's remaining §D item already says "mobile-first" for
the working-steps rebuild; treat phone as the primary device for BOTH sides
(guests are ~100% phone; hosts edit from the sofa), and add the two mechanical
fences: a 390px layout pass in CI screenshots and the share/OG card formatter the
mobile audit proposes (three designed moments currently hand-assemble
theme-on-theme ink at 1.72:1 contrast with raw ISO dates).

---

## 5 · Method, evidence, and honesty about the simulation

**The stack.** Local Postgres 16 built from the repo's own 80 migrations; a
purpose-built PostgREST + Storage emulator on :54321 speaking supabase-js's wire
grammar (JSON serialization done by Postgres itself for fidelity; unknown grammar
fails loudly so sim gaps can't masquerade as product behavior); the real Next.js
app; Playwright driving real Chromium. Real scrypt signup, real writes, real
uploads (six generated photos), real RSVPs. Where the local schema lacked what
prod has, it was patched and logged; where *both* lack what the code needs, that
became H5 — and the prod side of every such claim was verified with read-only
SQL against project `vpwnpxowqflajvqpgvyb`.

**Simulation artifacts, honestly tagged** (never reported as product findings):
AI keys absent (Pear drafting/palette degraded — the *silent-failure UX* on
those paths is coded-in and reported; the failures themselves are not), email
delivery absent, Google OAuth absent, `images.unsplash.com` blocked by the
sandbox (routed to placeholders), dev-mode compile latency (only
second-visit slowness was judged), and the Sealed Arrival envelope suppressed
under automation (`navigator.webdriver` guard — verified working when spoofed;
my first-walk "no envelope" note was this guard, not a bug).

**Scale.** One first-hand core walk (Maya Rivera, wedding) + one guest (Priya
Patel) + four occasion re-runs (memorial, bachelorette, baby shower, birthday) +
eight parallel surface audits ≈ 110 findings: **10 P0 · 45 P1 · 55 P2**. Every P0
and every headline claim in §1 was verified twice — by the reporting agent's
evidence and independently by hand (browser repro, psql, code read, or prod SQL).

**Evidence.** Representative screenshots in `docs/audit-shots/new-user-sim/`
(landing, welcome movements, wizard steps, the proof, the press, the editor with
the Santorini byline, publish modal, published site, RSVP confirmation, dashboard,
My-sites twins, Studio, the /start door). The full findings ledger follows.

---

## 6 · The full findings ledger (fleet + first-hand)

Titles only; each finding's detail, evidence path, and repro live in the audit
transcripts. Severities: P0 trust-breaker/blocker on a core journey · P1 major
friction or incoherence · P2 polish.


| # | Sev | Area | Finding |
|---|---|---|---|
| 1 | P0 | dashboard-ia | Home page tells a host with a real RSVP that she has no guests — /api/guests param contract mismatch |
| 2 | P0 | editor-depth | sites.published column is never written by any code path — five features silently dead |
| 3 | P0 | guest-experience | Re-submitting an RSVP silently destroys a returning guest's prior answers |
| 4 | P0 | guest-experience | Guest passport 'RSVP early' / 'RSVP now' CTAs land on a different couple's demo wedding (/dev/site) |
| 5 | P0 | guest-experience | The guest passport surface is a 404 end-to-end for modern sites — two stacked resolver bugs |
| 6 | P0 | wizard-occasions | Unpublished drafts are fully world-readable at their guessable URL — 'Nothing is public until you publish' is false |
| 7 | P0 | wizard-occasions | Guest RSVP modal serves the wedding form on every occasion — 'Joyfully' + 'Chicken/Fish/Vegetarian/Kids meal' on a memorial |
| 8 | P0 | monetization-growth | Paid store checkout redirects buyers to a 404 — /store/success does not exist |
| 9 | P0 | product-docs | Repo cannot reproduce prod: 6 live tables have no creating migration — staging (the stalled readiness-gate item) cannot be stood up from the repo |
| 10 | P0 | product-docs | Every remaining launch blocker is a non-code owner action, and the oldest have been aging 5+ weeks while ~50 commits of new surface shipped |
| 11 | P1 | dashboard-ia | Owner permanently locked out of Submissions moderation and The Reel — queries select a nonexistent sites.domain column |
| 12 | P1 | dashboard-ia | Merely opening the Studio silently rewrites the live site's manifest — the site's theme identity changed while browsing |
| 13 | P1 | dashboard-ia | The duplicate orphan site is nearly indistinguishable everywhere and the preferred URL is unrecoverable |
| 14 | P1 | dashboard-ia | Unpublished 'DRAFT' sites are fully public at their guessable URL — the published flag gates nothing |
| 15 | P1 | dashboard-ia | Day-of room simulates a live wedding day 304 days early — 'Right now: Cocktail hour' next to '304 DAYS TO GO' |
| 16 | P1 | dashboard-ia | Home's 'Planning progress 25% · 2 done · 1 in progress · 5 to do' measures Pear's un-accepted email suggestions, not planning |
| 17 | P1 | dashboard-ia | Passport cards reads a different guest table than the roster — always empty for guests added through the product |
| 18 | P1 | editor-depth | Demo venue 'Santorini, Greece' renders in the hero byline next to the host's real Asheville venue |
| 19 | P1 | editor-depth | Every edit to a published site goes live to guests in ~2 seconds with no warning and no draft state |
| 20 | P1 | editor-depth | 'PEAR SUGGESTS — Add it' fails completely silently when the story draft comes back empty |
| 21 | P1 | editor-depth | 'baste' shipped in host-facing copy — violates BRAND.md §7 (the word was retired 2026-07-08) |
| 22 | P1 | editor-depth | No way to change the site URL/slug anywhere in the product |
| 23 | P1 | editor-depth | Mobile preview breaks the hero name mid-word: 'Maya an / d Daniel' |
| 24 | P1 | editor-depth | Editor canvas presents an unmarked fabricated love story (three identical demo chapters) the published site will drop |
| 25 | P1 | guest-experience | Published RSVP fabricates a meal menu the host never wrote — and stores the default as the guest's choice |
| 26 | P1 | guest-experience | The RSVP call-to-action label is invisible (1.46:1 contrast) on the RSVP section button and the mobile-nav drawer pill |
| 27 | P1 | guest-experience | Registry section publishes 'we've put a few things together' with zero registry items |
| 28 | P1 | guest-experience | Guest passport overflows the phone viewport — playlist card 150px off-screen, thread Send button cut off |
| 29 | P1 | guest-experience | Passport ignores the guest's existing RSVP and is signed by 'Us' instead of the couple |
| 30 | P1 | guest-experience | Hero 'Learn more' is a dead tap — anchors to #story which is never rendered |
| 31 | P1 | guest-experience | 'Add to your calendar' .ics puts the wedding at midnight–4 AM |
| 32 | P1 | wizard-occasions | Bachelorette/bachelor 'private-by-default' (CLAUDE-PRODUCT §8 Q2) is declared in the registry but wired to nothing |
| 33 | P1 | wizard-occasions | Editor hero composites the host's real venue with the demo location: 'Ashwood Hall, Portland · Santorini, Greece' |
| 34 | P1 | wizard-occasions | Publish modal stamps 'YOU'RE INVITED' on a memorial and shares it by email with subject 'You're invited' |
| 35 | P1 | monetization-growth | The retired plan vocabulary ('Journal') is what signed-in hosts actually see — and paid hosts would be labeled with the free tier's dead name |
| 36 | P1 | monetization-growth | The pricing page sells the Pass on features that are not gated — free accounts already have the full Studio, Director, broadcasts, seating, budget, and vendor book |
| 37 | P1 | monetization-growth | No upgrade affordance actually reaches the till — every funnel dead-ends or loops |
| 38 | P1 | monetization-growth | Fabricated numbers throughout the money surfaces: fake 'sold' counts, fake ratings, a fake usage meter, and 'MOST CHOSEN' |
| 39 | P1 | monetization-growth | The growth loop's main surface is a dead end: 'Made with Pearloom' is an unlinked div, the always-on guest CTA drops attribution, and the referral reward is half-shipped |
| 40 | P1 | monetization-growth | /partners publicly promises referral commissions ('already earning', 10–15% tiers) with a fake registration form and zero backend |
| 41 | P1 | product-docs | The pricing page sells at least five Pass capabilities that nothing gates — violating the unanimous foundation rule 'pricing page and product must agree exactly' |
| 42 | P1 | product-docs | The $29/yr archive fee's entire stated rationale is a feature that was de-listed as never-built one day later — and MONETIZATION's ladder table still advertises it |
| 43 | P1 | product-docs | BRAND §7's retired vocabulary ('basted in', 'Nothing yet. Begin a thread.') still renders on the live landing, dashboard, editor, and brand emails — the one brand rule with no fence test regressed |
| 44 | P1 | product-docs | CLAUDE-DESIGN.md actively instructs future sessions to use the retired copy and contradicts itself on theme count — the drift engine is the onboarding doc itself |
| 45 | P1 | product-docs | Wizard double-site creation: the docs claim re-entry is guarded, but the guard is a React state flag racing an auto-press timer — the live walk's orphan duplicate proves it fires |
| 46 | P1 | product-docs | The host's typed story ('how it started') silently reaches nothing on the site — known, documented debt for 2 months, mitigated only by an optional card |
| 47 | P1 | product-docs | RSVP meal-question presets are republished as the site's dinner menu — the plan doc's 'never invents dishes' claim fails at the semantic level |
| 48 | P1 | product-docs | The shipped activation funnel implements a weaker north star than the agreed one, and is blind at the single riskiest step (invite delivery) |
| 49 | P1 | competitive | Table-stakes gap: custom domains don't exist on any tier — while the monetization structure quietly depends on them |
| 50 | P1 | competitive | Table-stakes gap: no printed or mailed stationery at all, while the Pass is explicitly priced against Minted's stationery line |
| 51 | P1 | competitive | Table-stakes gap: guests cannot give cash by card — funds are Venmo/PayPal deep-links only |
| 52 | P1 | competitive | Table-stakes gap: the invitation email channel is still un-provisioned in production (SPF/DKIM/DMARC owner action pending) |
| 53 | P1 | competitive | Table-stakes gap: no mobile app or phone-first guest surface in a market Partiful won by being phone-first |
| 54 | P1 | mobile-a11y | Wizard Basics step field grid collapses at 390px — NAME 1 crushed to a 66px square |
| 55 | P1 | mobile-a11y | Publish-modal share card fails WCAG contrast on all three text layers (worst 1.72:1) |
| 56 | P2 | dashboard-ia | Budget empty state uses the exact retired brand-forbidden copy 'Nothing yet. Begin a thread.' |
| 57 | P2 | dashboard-ia | Site-card kebab menu is clipped by the cover's overflow — 'Delete site' renders half cut off |
| 58 | P2 | dashboard-ia | Draft card offers 'View live' and 'Preview' that both point to the public production URL of an unpublished site |
| 59 | P2 | dashboard-ia | Home's 'DAY-OF CHECKLIST — You can do this.' is a static fabricated list shown 10 months early with invented priorities |
| 60 | P2 | dashboard-ia | Analytics RSVP funnel fabricates 'Opened' and 'Started a reply' stages from the terminal status |
| 61 | P2 | dashboard-ia | Guests page asserts 'Pear is following up on the quiet ones once a week' — a hardcoded claim of automated activity that isn't happening |
| 62 | P2 | dashboard-ia | Registry's 'See payments →' link loops back to the Registry itself |
| 63 | P2 | dashboard-ia | Weekend planner ignores the host's existing wedding — blank names/date form beside her real site |
| 64 | P2 | dashboard-ia | Small consistency/copy nits across the shell |
| 65 | P2 | editor-depth | The 86% readiness bar is unexplained, unclickable, and disagrees with the topbar checklist |
| 66 | P2 | editor-depth | Account settings modal ignores Escape |
| 67 | P2 | editor-depth | Story panel suggests 'Class of 2027' highlight chip on a wedding site |
| 68 | P2 | editor-depth | Free built-in theme applies with the toast 'Pack applied' — and shares its name with an $18 store pack |
| 69 | P2 | editor-depth | ⌘K palette: 'guest' finds only 'Preview as a guest', and the button wears a Mac-only symbol |
| 70 | P2 | editor-depth | Entire ~60-tile premium theme-pack shelf is mounted offscreen in the editor DOM at load |
| 71 | P2 | guest-experience | Dangling '·' separator after the location in hero and footer |
| 72 | P2 | guest-experience | Sealed Arrival: the 'For you' addressee line renders behind the wax seal |
| 73 | P2 | guest-experience | Photo-upload page renders desktop-squeezed (~40% width) when reached via the site's own button |
| 74 | P2 | guest-experience | Pear's degraded-mode reply to guests is engineer-speak |
| 75 | P2 | wizard-occasions | Published hero renders a dangling '·' separator when the demo place drops out |
| 76 | P2 | wizard-occasions | RSVP-deadline suggestion says '(five weeks out, our suggestion)' while showing a clamped 2-days-out date |
| 77 | P2 | wizard-occasions | Retired 'basted in' copy still live in the editor's Pear Suggests card and the music dashboard |
| 78 | P2 | wizard-occasions | Wizard seeds sections the editor immediately flags 'unusual for this occasion' (FAQ on birthday; registry extra offered on registry-hidden occasions) |
| 79 | P2 | wizard-occasions | Occasion search dead-ends with no catch-all hand-off ('divorce' → nothing) |
| 80 | P2 | wizard-occasions | Memorial editor's Opening panel presents couple-shaped name fields ('IN MEMORY OF [field] & [field]') |
| 81 | P2 | wizard-occasions | Plan-limit wall appears only after the host completes all 9 wizard steps and presses the seal |
| 82 | P2 | wizard-occasions | First vibe chip offered on a birthday is 'Romantic — SOFT SERIF · CANDLELIT' |
| 83 | P2 | monetization-growth | Degraded-payment and auth errors surface as infrastructure-speak with no next step |
| 84 | P2 | monetization-growth | Store merchandising contradicts the entitlement model: 47 plan-granted packs wear price tags next to 'Owned', and the Pass is never cross-sold on the signature shelf |
| 85 | P2 | monetization-growth | 'Subscription' framing and dead-name leftovers survive inside the settings modal, against the load-bearing 'ONE-TIME, NOT A SUBSCRIPTION' promise |
| 86 | P2 | monetization-growth | Dead 'Pear's promise →' anchor on the live pricing section; the orphaned DesignFAQ still carries Journal/Atelier/Legacy copy and is whitelisted by the fence test |
| 87 | P2 | monetization-growth | MONETIZATION.md drifts from its own code on three numbers it declares itself the source of truth for |
| 88 | P2 | product-docs | MONETIZATION.md §8 contradicts the same-day DECISIONS doc on two counts ('unit economics unmodeled' vs 'Modelled'; 'test two packages' vs 'do not price-test') |
| 89 | P2 | product-docs | Print survives in two un-stamped planning docs 5 weeks after end-to-end deletion: SUITE-STRATEGY '§7 Print: where the money is' and FOLLOW-UPS §H's Studio→Print seam item |
| 90 | P2 | product-docs | Dead prod schema: the `referrals` table exists in prod with zero code readers — the same orphan class the route audit deleted /api/wedding-day for |
| 91 | P2 | product-docs | DECISIONS-2026-08-04 contradicts itself on whether the referral ledger is applied ('written but not applied' in §1 vs 'APPLIED to prod, guards verified live' in the summary) |
| 92 | P2 | product-docs | Surface-area-to-validated-value ≈ 11:1 — 80 user-facing page routes and 34 dashboard destinations vs ~7 surfaces in the product's own validated core journey |
| 93 | P2 | product-docs | The oldest open product questions are 16 weeks old, and the #1-ranked distribution strategy depends on the one still unanswered (multi-host onboarding) |
| 94 | P2 | product-docs | Monetization has churned three times in two months with zero paying customers — plan-gate.ts touched 6× in two days; the churn is in the model, not the code |
| 95 | P2 | competitive | Landing pricing's 'Pear's promise →' trust link is a dead anchor — DesignFAQ (the #journal target) is not mounted on the landing page |
| 96 | P2 | competitive | The unmounted DesignFAQ still carries the retired tier names ('Journal is free', 'Atelier and Legacy hosts get them included') and the stale one-site free tier |
| 97 | P2 | competitive | Seating chart is gated behind the $89 Pass while The Knot ships it free and Zola sells it à-la-carte for $14.99 |
| 98 | P2 | competitive | Positioning blind spot: 'plus everything to run them' claims planning-suite parity the product doesn't attempt — vendor discovery is the missing pillar competitors lead with |
| 99 | P2 | mobile-a11y | Raw ISO date '2026-08-15' on three designed letterpress moments |
| 100 | P2 | mobile-a11y | Phone canvas is tap-inert: section text and inline-edit fields don't respond to touch |
| 101 | P2 | mobile-a11y | Signup: 14px inputs trigger iOS zoom-on-focus; password toggle 26×26 and 'Sign in' 42×17 tap targets |
| 102 | P2 | mobile-a11y | Welcome mark picker: 18 avatar buttons have no accessible name beyond title attribute |
| 103 | P2 | mobile-a11y | Editor SectionRail rows not keyboard-focusable; insert points are DIVs without focus outline |
| 104 | P2 | mobile-a11y | RSVP modal inputs lack programmatic labels; focus not restored on close |
| 105 | P2 | mobile-a11y | Closed EditorThemeShop stays mounted with ~75 identically-named focusable pack tiles |
| 106 | P2 | mobile-a11y | Demo venue 'Santorini, Greece' rides next to the host's real venue; dangling '·' in preview |
| 107 | P2 | mobile-a11y | Publish CTA pill text clipped at 390px |
| 108 | P2 | mobile-a11y | Published default theme: hero tagline 3.91:1 and gold eyebrows 4.2–4.4:1 (AA misses) |
| 109 | P2 | mobile-a11y | Hydration mismatch on /wizard/new (server HTML differs from client) |
| 110 | P2 | mobile-a11y | Wizard occasion cards expose no selection state to assistive tech |

*(Plus the first-hand walk findings folded into §1–§2: the double-press duplicate,
the silent story death, the fabricated meal question, the demo-venue composite,
the dangling separator, the S&S sample monograms, the day-of checklist amnesia,
the "Journal" chip, and the schema-provenance set — several overlap with fleet
rows above where two auditors found the same defect independently.)*

---

*End of NEW-USER-REVAMP. The companion evidence set is in
`docs/audit-shots/new-user-sim/`. The simulation harness (local Postgres from
migrations + PostgREST emulator) is documented in §5 and is the working prototype
for the staging CI gate this document recommends in R6.*
