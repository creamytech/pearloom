# REVAMP-EXECUTION-PLAN.md — every update, start to finish

> **What this is.** The complete, executable plan for everything
> `docs/NEW-USER-REVAMP.md` found — all 110 fleet findings (L1–L110, the
> ledger in that doc §6), the eight headline discoveries (H1–H8), and the
> first-hand walk findings, plus the structural revamps and the market
> bets. Every finding is mapped to exactly one block (Appendix A is the
> reverse index — nothing is unassigned). Ten sprints, in order, each in
> the house style: goal → blocks → counts-as-done → fences. Written
> 2026-08-12, immediately after the audit.
>
> **How to run it.** One sprint at a time. Arm a sprint by restoring the
> `## Active focus` heading in CLAUDE.md (per the note at its top) with
> the sprint's goal / threads / counts-as-done copied from here. Stamp
> each block SHIPPED in this doc as it lands. The validation loop for
> every block: `npx tsc --noEmit` → `npx eslint <touched>` →
> `npx vitest run` → `npm run build`, plus the block's own fence test.
>
> **The one law this plan exists to enforce:** every P0 the audit found
> broke at a SEAM between two units that each passed their own tests.
> So every block here ships with a fence that crosses the seam — an
> integration/e2e/contract test, not another unit test. A block without
> its fence is not done.

---

## §0 · Ground rules for every sprint

1. **No new product surface ships until Sprint W is stamped.** (The
   docs-audit's conclusion, adopted: the bottleneck is wiring and owner
   actions, not missing features.)
2. **Honesty is behavior, not just copy.** Any question, claim, count,
   or state shown to a user must derive from host-authored or real data
   — or not render. This extends the existing `editable`-gate law.
3. **Every retired word/pattern gets a fence when it is removed** (the
   proven mechanism — the one §7 retirement without a test is the one
   that regressed).
4. **Prod schema changes ship as migrations first**, applied via MCP,
   recorded in `_pearloom_migrations` AND `supabase_migrations` — never
   as dashboard-only SQL again. That is how the phantom-table class
   dies.
5. **Grief outranks everything**, unchanged: memorial/funeral paths are
   exempt from gates and get the gentlest copy in every block below.

---

## §1 · Day 0 — the owner-action list (parallel to everything)

Non-code launch gates, all aging (L10, L52). None blocks a sprint from
*starting*, but Sprint M and the exit criteria cannot FINISH without
the first three.

| # | Action | Unblocks |
|---|---|---|
| O.1 | Email DNS: SPF/DKIM/DMARC + dedicated sending subdomain; set the CAN-SPAM physical-address env | Every invite/nudge/broadcast send; activation funnel's riskiest stage (L48, L52) |
| O.2 | Stripe: live products/prices for Pass $89 / Keepsake $199 / archive $29; webhook secret in prod env | Sprint M end-to-end |
| O.3 | Prod env secrets audit: `ANTHROPIC_API_KEY` present + funded, `RESEND_API_KEY`, R2 keys — verify each with the health probe (W.12) | Pear drafting reliability (H3's trigger class) |
| O.4 | Apple Pass Type ID certificate | Wallet passes (already built, blocked) |
| O.5 | Decision: custom domains — build (restores the archive fee's rationale) or stay de-listed (then restructure the archive fee per M.5) (L42, L49) | M.5 |
| O.6 | Decision: seating gated behind Pass vs free (competitors ship it free / $14.99) (L97) | M.3 |
| O.7 | Answer CLAUDE-PRODUCT §8 Q4 (multi-host onboarding) — 16 weeks open, and the #1 distribution motion depends on it (L93) | Post-plan bets §12 |

---

## §2 · Sprint W — THE WIRES (all P0s; ~1–2 weeks)

**Goal:** the ten severed wires from NEW-USER-REVAMP §1 reconnected,
each pinned by a cross-seam test. After this sprint, the Maya walk
(landing → signed-out wizard → press → publish → guest RSVP → passport
→ return visit) completes with zero defects.

### W.1 · Reopen the doorway (H1) — SHIPPED 2026-08-12
Delete the session gate in `src/app/wizard/layout.tsx` (the file's only
job; remove the file or reduce it to a passthrough). Verify the S3
signed-out machinery still works end-to-end: wizard signed out → press
→ claim card on `/signup?next=` → press resumes post-auth.
**Fence:** `e2e/specs/doorway.spec.ts` — a NO-storageState context
walks: `/` → hero CTA → lands on `/wizard/new` (not /login); `/start` →
paste → continue → wizard; direct `/wizard/new` → 200. Runs in CI.
**Counts as done:** all three signed-out paths reach the wizard; the
claim-card press-resume walk passes.

### W.2 · An idempotent, recoverable press (H2, L45, L13) — SHIPPED 2026-08-12
- Re-entrancy: a `useRef` guard inside `handleFinish` (state `busy` is
  not a guard) + disable the seal the instant the press starts.
- Idempotency: the wizard mints a per-session press key; `POST
  /api/sites {create:true}` carries it; the route stores it on the row
  and returns the existing row for a replayed key.
- Same-owner adoption: `findAvailableSubdomain` treats a row owned by
  the same creator with `updated_at` within the press window as
  ADOPTABLE — update it, never suffix `-2`.
- Recovery: My-sites cards get a working Delete (also fixes the kebab
  clip, L57) and show their URL; the site switcher disambiguates
  identical names with slug + created date (L13).
**Fence:** unit — two concurrent creates with one key → one row;
e2e — double-click the seal → exactly one site exists.
**Counts as done:** no sequence of seal clicks can produce two rows;
an existing duplicate is deletable from My sites.

### W.3 · Publish becomes real (H6+L2, H7+L6+L14, L58) — SHIPPED 2026-08-12
- One line: `publishSite` writes `published: true` (and un-publish
  clears it). Backfill prod: `update sites set published = true where
  ai_manifest->>'published' = 'true'`.
- The public site route 404s (or renders the coming-soon page, which
  exists) for unpublished sites. Existing published sites unaffected.
- Draft cards: "Preview" → editor preview; "View live" hidden until
  published (L58).
- The five dead consumers (sibling strip, celebration timeline,
  anniversary cron, weekly digest, day-after recap) come back on —
  verify each against a published fixture.
**Fence:** e2e — a pressed-but-unpublished site's URL is not publicly
readable; a published one is; `/api/celebrations/siblings` returns a
published sibling.
**Counts as done:** "Nothing is public until you publish" is true, and
`select count(*) from sites where published=true` is nonzero in prod
after the next real publish.

### W.4 · One guest-read contract (L1) — SHIPPED 2026-08-12
`WelcomeHome` and every other `/api/guests` caller use one param
(`siteSlug`); the route 400s loudly on unknown params instead of
silently empty-listing. Home's guest summary, NEEDS-YOU-NOW, RSVP
momentum, and guest-review all show Priya-class data.
**Fence:** contract test — Home's guest summary count === roster count
for the same fixture site.

### W.5 · The passport resolves (H8, L5, L4) — SHIPPED 2026-08-12
- `/g/[token]` resolves through `resolveGuestToken` (lib/people.ts) —
  BOTH token columns, email-bridged — so every token the product mints
  (RSVP emails, dashboard links, nudges, QR cards, wallet passes)
  opens a passport.
- Kill the legacy `/rsvp` stub redirect to `/dev/site`; passport CTAs
  deep-link to the guest's real site RSVP with `?g=` (L4).
**Fence:** e2e — RSVP as a new guest on a fresh site → fetch the
minted token from the DB → `/g/<token>` renders that guest's passport
for that site, with their RSVP state shown.

### W.6 · Replies are durable (L3, L29) — SHIPPED 2026-08-12
Recognized guest → load their reply; form prefilled (status, meal,
song, note); submit merges (never blank-overwrites); the passport's
RSVP card shows current state with an explicit "Update your reply".
**Fence:** e2e — RSVP with song+note, re-open, change meal only →
song+note survive in the DB.

### W.7 · The purchase completes (H5-part, L8) — SHIPPED 2026-08-12
- Ship `/store/success` (and verify the plan-checkout return surface)
  — a pressed "It's yours" moment listing what was bought, linking
  back to where the buyer was.
**Fence:** route test: success_url targets resolve 200 for both store
and plan checkouts.

### W.8 · The grant has storage (H5) — SHIPPED 2026-08-12
Migration `user_plans` (+ apply to prod via MCP, both trackers). A
webhook integration test grants `pro` against a migrations-built DB
and `getPlanWithLimitsForEmail` returns Pass limits. Same migration
wave: `section_analytics` (analytics stops 500ing).
**Fence:** the webhook grant test in CI against the S.2 staging build.

### W.9 · Owners can see their own data (L11 + registry-items) — SHIPPED 2026-08-12
Fix the phantom-column queries: `sites.domain` → `subdomain`
(submissions + toasts moderation, The Reel), `sites.user_id` →
`creator_email` (registry-items). Audit for the rest mechanically:
grep every `.select(`/`.eq(` column against the real schema (the S.1
schema snapshot makes this greppable).
**Fence:** a schema-reference test — every column named in a supabase
query exists in the migrations-built DB (fails on the next phantom).

### W.10 · Reads don't write (L12)
Re-fix the Studio mount-time autosave (the prior fix `ad77fbb0`
regressed) — no POST until the host edits.
**Fence:** e2e — open `/dashboard/invite`, wait, assert `updated_at`
unchanged and no `manifest.studio` was stamped. (The test the first
fix never got.)

### W.11 · The story lands, or fails loudly (H3, L20, L46) — SHIPPED 2026-08-12
Minimal, pre-C.4: (a) at press time, seed the story section from
`factSheet.story` VERBATIM as the host's own words ("In your words" —
no AI needed, no fabrication; Pear's rewrite is an upgrade offered in
the editor); (b) `BastedIn.set()` on an empty/failed draft shows a
plain error with Retry — delete the silent-return branch; (c) rename
the copy off "baste" (D.2 fences it).
**Fence:** e2e — a wizard run with story text produces a published
site whose story section contains that text; unit — a null draft
renders the error state.

### W.12 · The dependency health probe (new) — SHIPPED 2026-08-12
A `/api/health/deps` (admin-gated) reporting: DB reachable, each
phantom-table present, ANTHROPIC/RESEND/R2 keys present+valid, Stripe
mode. The O.3 owner check and every future deploy reads it.
**Counts as done:** probe green in prod after O.1–O.3.

**Sprint W exit:** the scripted Maya walk (new e2e:
`critical-journey.spec.ts`, adapted from the audit harness) passes
green: signed-out wizard → one site → story present → publish gates →
RSVP durable → passport opens → no phantom-column errors in the log.

---

## §3 · Sprint S — THE SCHEMA (provenance + the staging gate)

**Goal:** one source of schema truth; the repo rebuilds prod; CI proves
it forever. (H5b, L9, L90; REVIEW-SYNTHESIS §1.1 item 8 closed.)

- **S.1 Baseline + reconcile. — SHIPPED 2026-08-12.** The full
  three-way diff (prod 95 tables ↔ migrations-built ↔ working local)
  ran both directions and closed clean:
  · *Port-what-prod-has:* `guests_site_email_unique` +
    `guests_passport_token_idx` were already in migrations
    (`20260604_guests_and_security_fixes.sql`) — no port needed;
    prod's `vendors.amount_cents/site_id/status` (an ad-hoc shape
    predating `20260416_event_os`) ported via
    `20260812_schema_parity.sql`.
  · *Create-what-code-needs:* `marketplace_purchases` (read by
    /api/marketplace/owned, written by /api/billing/webhook, existed
    NOWHERE) created in `20260812_schema_parity.sql`;
    `time_capsules` (the Love Letter capsule route + the live
    /time-capsule/[token] page ran on an in-memory Map — every
    sealed letter evaporated on deploy) created in
    `20260812_time_capsules.sql`.
  · *Decide-or-delete, all six decided:* `photos` DB reads →
    repointed to `guest_photos` (companion feed + the post-event
    film; the storage-bucket `photos` refs were never phantom);
    `gallery_photos` → its whole chain repointed to `guest_photos`
    (reel, recap page, day-after count) and the orphaned
    /api/gallery route DELETED (its only caller was the unmounted
    legacy GuestPassport); `announcements` → broadcast/push now
    writes the real `day_of_announcements` (every push broadcast's
    in-app copy had silently vanished); `invite_tokens` → the dead
    legacy branches removed from /api/invite/ics and /i/[token]
    (the table never existed anywhere, so no legacy row could ever
    match; /i/ now resolves guest tokens directly), and the dead
    /api/invite/rsvp + GuestPassport + InviteRsvpForm deleted;
    `email_captures` → /api/email-capture DELETED (zero callers);
    `referrals` → NOT adopted (the diff showed prod never had it —
    the ledger reads `referral_credits`, which is real; the L90/L91
    plan note was wrong about adoption).
  · *Local purified:* hand-patch columns `sites.domain`/`user_id`,
    the dup `guests_site_email_uniq` index, and the local
    `referrals` table dropped; `_pearloom_migrations` recreated in
    prod's exact shape. Fresh-from-migrations ≡ working local:
    **identical**.
  · **Pending prod applies (Supabase MCP re-auth needed):**
    `20260529_registry_claims_idempotency.sql` and
    `20260530_account_deletions_audit.sql` (both authored long ago,
    never applied) + `20260812_schema_parity.sql` +
    `20260812_time_capsules.sql` +
    `20260812_pearloom_guests_site_key.sql` +
    `20260812_guest_spine_merge.sql` +
    `20260813_published_snapshot.sql` (the C.2 staged-editing
    snapshot column) + `20260813_site_redirects.sql` (the C.6
    address-forwarding table) +
    `20260813_activation_north_star.sql` (the D.4 funnel view
    upgrade — nine now). Also pending: a prod unique-index dump to
    diff against migrations (tables/columns are verified clean;
    indexes were verified for the RSVP-critical pair only).
- **S.2 The staging CI gate. — SHIPPED 2026-08-12.** The emulator
  productized at `scripts/staging/pearlrest.mjs` (env-driven config,
  `.data/` scratch, README) with `scripts/staging/migrate.mjs` as
  `npm run db:migrate` — bootstraps Supabase-isms (roles, auth.jwt
  stub, pgcrypto) onto plain Postgres and applies all migrations in
  lexical order with a deferral-retry pass (the one same-day
  inversion, crew_threads→person_threads, retries clean). Verified
  against a truly empty database: 82 migrations apply, and the whole
  stack (empty PG → db:migrate → emulator → app) passes the fence
  suite 7/7 including first-ever e2e-user sign-in on a zero-row DB.
  `.github/workflows/staging-fence.yml` runs exactly that on every
  PR (postgres:16 service, route pre-warm, doorway +
  press-idempotency + publish-gate specs; the plan named
  `critical-journey.spec.ts` before the fence specs existed — the
  three W-sprint fences ARE the critical journey). Red = no merge.
- **S.3 Poll hygiene. — SHIPPED 2026-08-12.** The bell's sources
  stopped erroring when W.8/S.1 created their tables — and
  `warnFeed()` now threads every source's supabase `error` (which
  never throws, so the old try/catch caught nothing) into a loud
  `[notifications]` server warning. A failing source still drops
  only itself, but it can no longer impersonate "no news" — the
  masking pattern that hid L1 is structurally gone in feed.ts.
- **S.4 Migration discipline. — SHIPPED 2026-08-12.** CLAUDE-DESIGN
  §12 amended with the four rules: the migration IS the schema
  (db:migrate from empty must work, hand patches are missing
  migrations), the staging fence enforces it on every PR, every
  migration lands in prod same-day via MCP + `_pearloom_migrations`
  (filename PK shape both ends), and new code never reads a column
  no migration declares.

**Counts as done:** `npm run db:migrate` against empty Postgres yields
a DB where the full e2e passes ✓ (7/7 on a zero-row build); CI runs it
on every PR ✓ (staging-fence.yml); prod and migrations diff clean ✓ on
tables/columns (the only deltas are the four pending prod applies
listed above; the index-level diff awaits MCP re-auth).

---

## §4 · Sprint G — THE GUEST SPINE (identity, presets, phone)

**Goal:** one guest identity, occasion-true honest asks, a passport
worth the name. (The R2 revamp, first half.)

- **G.1 Collapse the fork.** One canonical guest row (keep `guests`;
  migrate `pearloom_guests` consumers through an adapter, then backfill
  and retire). One token column. Every minting surface (emails, QR,
  wallet, dashboard links) and every resolver on the same spine.
  Fence: grep-test — no `pearloom_guests` references outside the
  adapter; the W.5 e2e keeps passing.
  - **G.1a — SHIPPED 2026-08-12.** The full consumer survey
    (docs/FORK-SURVEY.md) found the fork's core disease:
    `pearloom_guests.site_id` had NO single convention — the RLS
    policy + purge/export routes assumed the SUBDOMAIN while the
    only live writer (the passport mint) and eight readers used the
    sites uuid. Auto-minted rows were invisible to owner-scoped RLS
    and SKIPPED by delete-account's purge (a live GDPR gap). Fixed
    by converging on uuid-as-text (the live data's shape):
    `20260812_pearloom_guests_site_key.sql` backfills legacy
    subdomain rows (pearloom_guests + the four passthrough tables
    whispers/time_capsule/song_requests/memory_prompts) and
    rewrites the RLS policy; delete-account + export-data sweep
    BOTH keys; `resolveSiteRef` (the adapter's site-key resolver in
    lib/event-os/db.ts) repairs the five routes that passed a uuid
    into subdomain-only getSiteConfig — guest-passport/[token],
    passport-cards, pear-sms, memory-weave (all returned null/404
    at baseline), and film.ts's guest_photos read now keys by
    subdomain as that table requires. All 12 fence e2e green.
  - **G.1b — SHIPPED 2026-08-13.** THE FORK IS COLLAPSED.
    `20260812_guest_spine_merge.sql`: guests gains the 12 profile
    columns; every pearloom_guests row lands in guests (matched by
    site uuid + lower(email) fills gaps, unmatched inserts fresh;
    `_pearloom_guest_merge_map` records old→new ids permanently);
    the 13 FKs + guest_push_subscriptions rekeyed to guests(id)
    with original delete semantics (UNIQUE(guest_id) children
    ctid-deduped first); guests.guest_token gets its unique
    partial index. The adapter (lib/event-os/db.ts): getGuestByToken
    reads ONE table via or(passport_token, guest_token) — the
    whole two-table bridge-and-mint dance deleted; listGuests +
    findGuestsByPhone added; upsertGuest (dead code) removed. All
    14 direct consumers swapped (display_name:name aliasing, token
    fallbacks, the memory_prompts embed now joins guests);
    people.resolveGuestToken is one lookup. pearloom_guests stays
    FROZEN as a safety net (COMMENT: deprecated; drop after a
    quiet release cycle — the purge/export dual-key sweeps still
    cover it). Fence: `no-guest-fork.test.ts` (grep — nothing in
    src/ queries the old table) + all 12 fence e2e green. Named
    leftovers: `database.types.ts` regeneration (needs supabase
    codegen), and the eventual DROP TABLE.
- **G.2 rsvpPreset drives the form (L7). — SHIPPED 2026-08-12.**
  `GuestRsvpModal` renders the preset schema: the attending toggle
  wears the occasion's register (`ATTENDING_LABELS` — memorial says
  "I'll attend / I can't attend", never "Joyfully"), and every
  non-core preset field renders generically below the guest cards
  (memory-share on memorials, cost-acknowledge + bed preference on
  bachelor trips, rooms + shirt sizes on reunions), party-level,
  straight into `rsvp_answers`. Named leftover: the `photo-upload`
  kind is deliberately NOT rendered (no upload plumbing in the
  modal — a fake field is worse than none; the passport's photo
  card is the real path). The note field now shows on declines too
  (a memorial's message-to-the-family matters most when a guest
  can't come). Fence: `e2e/specs/rsvp-honesty.spec.ts` (in the
  staging-fence workflow).
- **G.3 Conditioned asks (H4, L25, L47). — SHIPPED 2026-08-12.**
  Nothing is pre-selected (`emptyReply()` — attending starts
  unanswered, Send waits for a real answer) and only answered
  guests are stored (an untoggled family member stays pending). No
  host menu → no meal question (`mealOptions` no longer invents
  "Chicken/Fish"; the toggle needs BOTH the host switch AND a real
  menu). **Bonus prod bug the fence caught:** `/api/rsvp`'s
  `.upsert(onConflict: 'site_id,email')` could NEVER work — the
  real unique index is the expression `(site_id, lower(email))
  WHERE email IS NOT NULL`, which plain-column ON CONFLICT rejects
  with 42P10 — so every first reply from an unmatched guest 500'd
  in prod. Replaced with the existing-reply lookup (already there
  from W.6) + plain insert + a 23505 race fallback. Fence: the
  menu-less-site spec asserts the stored row carries no
  meal_preference. (The wizard meal-chips copy note is folded into
  T-sprint's wizard honesty pass.)
- **G.4 Passport, phone-first (L28, L29). — SHIPPED 2026-08-12.**
  The 390px overflow was two `minWidth: 0` omissions (the playlist
  inputs' intrinsic ~180px floor beat their grid tracks; the thread
  composer's flex input shoved Send off-screen) — both fixed, page
  no longer scrolls sideways. The "Us"/"U S" letter: coupleNames
  derived only from legacy `coupleId`, never `manifest.names` where
  every modern site's real names live — fixed, letters sign as the
  couple. The "pick one to RSVP" lie: the passport's reply lookup
  was a case-SENSITIVE email `.eq` (everything else joins on
  lower(email)) — now token-first then `ilike`. Two bonus fixes the
  fence surfaced: `/api/guests` POST now returns the passport_token
  it just minted, and the passport's first-ever visit no longer
  races generateMetadata against the page body for the identity
  mint (`cache(getGuestByToken)` — the loser used to 404 the
  guest's first tap on their invitation). Fence:
  `e2e/specs/passport-phone.spec.ts` (in the staging-fence
  workflow): scrollWidth ≤ 392 at 390px, real names, no "U S", the
  guest's real reply state, case-variant email exercised.
- **G.5 Registry honesty (L27). — SHIPPED 2026-08-12.** The registry
  gets the story section's honesty gate: published sites render it
  only when the host gave it something (stores, an intro note, P2P
  fund handles, or dashboard items — `/api/registry-items` POST now
  stamps `manifest.registryHasItems` so DB-only registries stay
  visible to the server gate). The stock "we've put a few things
  together" body is demo-gated — hosts' own intro or nothing. Named
  edge: a host who adds items then deletes ALL of them keeps the
  stamp (unstamping on last delete is a nicety, not wired).
- **G.6 Calendar + anchors (L31, L30). — SHIPPED 2026-08-12.**
  `event.ics` uses the best REAL time (targeted event → logistics →
  first timed schedule event on the same date) and with no time
  anywhere emits an honest all-day `VALUE=DATE` event instead of the
  midnight-to-4am block. The hero's "Learn more" default anchor is
  gate-aware: `#story` only when a story is authored (the honesty
  gate hides unauthored stories), else `#schedule` which always
  renders; host overrides untouched.
- **G.7 Guest-surface contrast (L26). — SHIPPED 2026-08-12.** A
  WCAG floor at the render root: `themeRootStyle` measures the
  `--t-rsvp`/`--t-rsvp-ink` pair and, under 4.5:1, swaps the ink for
  whichever of the theme's own paper/ink (or plain white/black)
  reads best — covering every derivation path (packs, hydrate,
  custom vars) in one place; non-hex values are left alone. The
  floor's own test then caught two CATALOG themes failing AA on
  their own RSVP block — amalfi (3.37:1) and first-light (4.02:1) —
  both deepened in place. `themes.contrast.test.ts` pins the
  audit's exact 1.46:1 pair repairing to ≥4.5:1 and all ten catalog
  themes passing unmodified.

**Counts as done:** the four occasion worlds (wedding, memorial,
bachelorette, baby shower) each pass a guest-side e2e: honest form,
durable reply, working passport, working calendar, no false claims.

---

## §5 · Sprint T — HONEST STATES (the truth pass)

**Goal:** rule §0.2 applied everywhere a fabrication was found.

- **T.1 Day-of is a rehearsal until the day (L15). — SHIPPED
  2026-08-13.** deriveStatuses knows the day state: before the day
  every moment is 'later' and the hero frames the schedule as "a
  rehearsal of your run of show — it keeps real time when the day
  arrives"; ON the day the wall clock speaks; after it, moments
  rest done and "the day has run its course." No more green-checked
  4:30 Ceremony beside "304 DAYS TO GO".
- **T.2 Progress tells the truth (L16, L59 + walk). — SHIPPED
  2026-08-13.** Cadence-preset rows carry `pearSuggested`, render as
  "Pear suggests: …" with take-it-or-leave-it framing, and are
  EXCLUDED from the done/in-progress/to-do numbers — progress
  measures what the host did. The prep checklist is phase-gated
  (planning → empty; the list belongs to the final stretch + the
  day — L59's "Confirm vendor arrival times, High" ten months early
  is gone) and its checkmarks PERSIST on manifest.dayOfChecklist
  through the draft-save door (ChecklistCard gained a controlled
  mode; local-state fallback for other callers).
- **T.3 Analytics don't invent stages (L60). — SHIPPED 2026-08-13.**
  Opened/Started count only real pings (invite_opened_at /
  reply_started_at) — the old code back-filled them from the
  terminal status, rendering a fabricated 100%-at-every-stage
  funnel. A stage with zero pings while replies exist renders
  "not tracked"; the dropped-count line skips untracked stages.
- **T.4 No phantom automations (L61). — SHIPPED 2026-08-13.** The
  Guests follow-ups card now reads manifest.reminderCadence (the
  editor's real, cron-consumed setting) and states the
  configuration — off (with the door to turn it on) / one reminder
  / two reminders — never a claim of running activity.
- **T.5 No fabricated social proof (L38). — SHIPPED 2026-08-13.**
  Pack.rating + Pack.sales deleted from the catalog type, the r:/s:
  literals stripped from all 61 packs, the bestseller badge removed
  (packs + decor items), "Top rated" sort + "★ Bestsellers" chip
  cut, 'featured' keeps editorial order. Fence:
  `no-fabricated-proof.test.ts` (no rating/sales keys on any pack;
  no store surface renders "sold"/Bestseller). The `new` badge
  stays — an honest editorial fact. Real sold counts may return
  when derived from theme_pack_purchases. (No usage meter found in
  the store; if L38's meter lives on another money surface it
  falls to that surface's block.)
- **T.6 /partners tells the truth (L40). — SHIPPED 2026-08-13.**
  The 337-line commission-tier promise ("hundreds already earning",
  a form wired to nothing) replaced with the honest page: the
  program is in the making, and the one door — mailto
  hello@pearloom.com — goes somewhere a person reads.
- **T.7 Weekend planner reads the world (L63). — SHIPPED
  2026-08-13.** /dashboard/weekend prefills names + date from the
  host's newest (wedding-preferred) site via GET /api/sites, with
  a "Filled in from your site /<domain> — change anything" note.
  Functional setters fill only still-empty fields, so nothing the
  host typed is ever clobbered; the blank form remains the
  graceful fallback when they have no sites.
- **T.8 Link hygiene (L62 + L64 batch). — SHIPPED 2026-08-13.**
  Registry's "See payments →" (a permanentRedirect back to the same
  page) removed — the ledger it promised is on that page. The Home
  hero's countdown label now counts calendar days like the road
  card beside it (the ticking cells keep ms precision) — no more
  303-vs-304 on one screen. The shell's three exits wear one
  label: "Sign out".

**Fence for the sprint: SHIPPED 2026-08-13.** welcome-home-copy.test
gained the fabrications describe-block (the L61/L38/L40 dead claims
grepped out of their source files forever) + the checklist's
planning-phase-empty contract; `no-fabricated-proof.test.ts` covers
the store data (no rating/sales keys, no sold/Bestseller renders).
**Sprint T is complete — all eight blocks stamped.**

---

## §6 · Sprint M — THE MONEY PATH (one vocabulary, one door, honest cards)

**Goal:** a customer can discover the price, pay it, and receive it —
and every money surface tells one true story. (R7 complete; needs O.2.)

- **M.1 One vocabulary (L35, L85, L86, L96). — SHIPPED 2026-08-13.**
  The L35 break point was the CLIENT: /api/store/entitlements
  already returned Page/Pass/Keepsake, but usePlan's validation
  accepted only the retired Atelier/Legacy names and fell back to
  "Journal" — so every host, paid ones included, wore the free
  tier's dead name. usePlan + the route fallback now speak the
  marketed vocabulary; the settings modal is "Your plan · One-time
  plans — no subscription, nothing renews" (tab: Plan; ⌘K: Plan &
  billing); help-faq answers "Do plans renew?" with the truth; the
  export copy says "even if you leave" not "cancel"; DesignFAQ
  (mounted nowhere, still selling Journal/Atelier/Legacy) is
  DELETED with its fence whitelist removed; the pricing grid's dead
  "Pear's promise →" #journal anchor is gone — the promise is said
  plainly.
- **M.2 Doors reach the till (L37). — SHIPPED 2026-08-13.** One
  `/upgrade` route (server-gated; signed-out visits round-trip
  through /login with ?plan/?from intact) renders the two paid
  cards FROM DesignPricing.TIERS — the same fence-pinned array the
  landing renders — and POSTs the working checkout. Every door now
  reaches it: the landing's "Choose Pass/Keepsake" carry plan
  intent via the new onChoosePlan (they used to fall into
  /wizard/new with the free CTA); the settings modal's Upgrade
  links go to /upgrade?plan= (they looped to /#pricing, whose paid
  buttons then dropped the intent — no settings CTA ever reached
  the till); the 402 bodies' upgradeUrl is /upgrade?from=<feature>
  (was /dashboard?upgrade=true — a query param nothing read), and
  /upgrade opens with a sentence naming the met limit in the
  host's real numbers; the wizard's finish-line site-cap 402 stops
  dead-ending — the error slat grows a "See the Pass →" door and
  says the draft is saved. `e2e/specs/money-door.spec.ts` (4
  tests, added to the staging fence) pins render, intent-through-
  auth, the from-line, and the keyless degrade.
- **M.3 Cards describe the real product (L36, L41, L97 + O.6). —
  SHIPPED 2026-08-13.** The decision went REMOVE, not gate: every
  un-gated claim (full Studio, Director, seating, budget, vendor
  book, memory book, archive download) is off every money surface —
  the pricing page's three cards, the settings plan cards
  (UserSettingsModal + DashSettings), and the Stripe checkout LINE
  ITEMS themselves (the receipt sold "the full Studio, and the
  day-of room"). Cards now claim only what PLAN_LIMITS enforces or
  the pack grants give: Page 2 sites / 100 guests / 15 Pear drafts a
  month / standard catalog; Pass 10 sites / 500 guests+photos / ∞
  co-hosts / ∞ drafting / the SIGNATURE shelf (the old card sold
  "the premium shelf" — free for everyone); Keepsake = every limit
  removed. `requirePlan` keeps zero callers — nothing needed gating
  because nothing un-gated is sold anymore (O.6 seating decision
  thereby resolved: seating stays free, un-sold). Bonus: the dead
  aiGenerations ladder (10/100/∞, enforced by nothing) aligned to
  the ONE real gate — checkPearGate's 15/month free, unlimited from
  Pass up; ai-blocks' 402 stopped saying "Upgrade to Atelier".
- **M.4 Store re-merchandised (L84, L68). — SHIPPED 2026-08-13.**
  Owned packs never wear a price (card + quick-look — 47
  plan-granted packs showed "$16" beside "Owned"); the quick-look's
  plan-grant hint speaks the marketed names ("Included with the
  Pass / the Keepsake" — it still sold Atelier/Legacy); the apply
  toast says "Theme applied" (true for built-ins AND packs — L68's
  PICK card toasted "Pack applied" for a free theme); the $18 pack
  renamed 'Santorini Linen' -> 'Aegean Linen' (it shared its exact
  display name with the FREE built-in theme; entitlement id
  unchanged). Named leftover: theme-packs-visual baselines for
  santorini-linen re-seed on next run.
- **M.5 The archive fee makes sense (L42 + O.5). — SHIPPED
  2026-08-13 (the de-listed default).** O.5 unanswered → the plan's
  default applied: the fee's rationale is full-resolution media
  retention ONLY — the custom-domain half is out of the story
  everywhere it was told (MONETIZATION §4 restructured; plan-gate's
  ARCHIVE_RENEWAL_CENTS comment rewritten; §8's DECISIONS framing
  note updated). Also made explicit in both places: the fee is
  PRICED, NOT BILLED — no checkout path charges the constant, and
  no surface may present it as live billing until the feature
  exists. If O.5 later builds domains, the bundled framing can
  return with the feature.
- **M.6 The loop links (L39). — SHIPPED 2026-08-13 (code-side).**
  The published footer's "Made with Pearloom" credit is a real link
  to /wizard/new?ref=<site> in both variants that render it (it was
  a plain div — the growth thesis's main surface was a dead end);
  HostYourOwnCard carries refSlug and the passport passes the
  site's slug. Note: S.1's diff showed prod never had a `referrals`
  table — the ledger reads `referral_credits` (real, migrated);
  grantReferralCredit's live verification remains for a post-deploy
  check.
- **M.7 The agreement fence (L87, L88, D.3). — SHIPPED 2026-08-13.**
  `src/lib/pricing-agreement.test.ts` (18 tests): PLAN_LIMITS /
  PLAN_PRICE_CENTS / PEAR_MONTHLY_LIMIT ⇄ DesignPricing.TIERS
  (exported for the fence) ⇄ MONETIZATION.md's ladder rows ⇄ the
  settings cards + Stripe line items (text-grepped) — change one and
  the suite makes you change the rest. Occasions count pins to
  EVENT_TYPES.length; shelf claims pin to planGrantedPackIds (free
  holds all 55 non-signature packs, none of signature; Pass+ hold
  everything). MONETIZATION.md corrected: sites 1→2, the dead "AI
  generations 10/100/∞" row → "Drafts by Pear 15 a month / ∞ / ∞",
  a Co-hosts 1/∞/∞ row, the rows selling custom domain + full
  Studio + memory book replaced by an explicit "what the ladder
  deliberately does NOT list" note; §8 reconciled with
  DECISIONS-2026-08-04 (L88 — don't price-test till ~200 activated;
  unit economics ARE modelled) and DECISIONS §4's "Pass includes
  the full Studio" anchor got a correction note.
- **M.8 Degraded money copy (L83). — SHIPPED 2026-08-13.**
  `src/lib/money-copy.ts` (`humanizeCheckoutError`) is the one
  voice for a till that can't take the payment: what happened +
  NOTHING WAS CHARGED + a next step. All three checkout UIs route
  through it — the /upgrade door, the settings plan buttons (which
  printed the API's "Payments are not configured." in red), and
  the store cart drawer (same, plus browser-speak "Failed to
  fetch" now caught). Server strings unchanged (API contract /
  logs); only the rendered sentence translates. money-copy.test.ts
  pins every branch (never "configured"/"stripe"; keyless names
  the inbox); the money-door e2e proves the live degrade.

**Counts as done:** on staging with test Stripe keys: see price →
choose Pass → pay → land on success → plan granted → gated feature
unlocks → settings shows "Pass". Every step in one e2e.

**Sprint status 2026-08-13: all eight code-side blocks SHIPPED
(M.1–M.8).** The keyless half of counts-as-done is proven
(money-door.spec.ts: price → choose → honest degrade, hasStripe()
false). The PAID half — Stripe test keys through webhook to plan
grant — remains blocked on owner action O.2; when keys land, extend
money-door.spec.ts with the paid walk (the checkout POST, webhook
grant, and settings "Pass" badge are all already wired).

---

## §7 · Sprint V — THE VISIBILITY SPINE

**Goal:** one visibility state machine; four flags become one truth.
(R5; finishes what W.3 started.)

- **V.1 — SHIPPED 2026-08-13.** `src/lib/site-visibility.ts` is THE
  resolver (`readSiteVisibility`: draft | link-only | public |
  password): the press check outranks every field ("nothing is
  public until you publish" is now literally rule 1), an explicit
  `manifest.visibility` wins (password with no password degrades to
  public — an empty gate is not protection; explicit draft on a
  pressed site is the host pulling it back), and pre-spine manifests
  read-migrate from the legacy flags — privacyGate.password, the
  comingSoon password (its documented precedence kept), the
  registry's privateByDefault, and even the DELETED PearSpotlight
  wizard's soft-signal 'unlisted'/'private' values (found as a
  duplicate `visibility` declaration in types.ts; both map to
  link-only). Enforced everywhere that reads: the site route (page +
  metadata — password sites' metadata says nothing personal now),
  the SUB-PAGE route (whose generateMetadata never got H7's gate —
  a draft's names/tagline leaked through sub-page OG for anyone who
  guessed the URL), the shell's SiteGate (mounts exactly when the
  machine says password), and `getPublishedSites` — which listed
  EVERY site with a manifest into the sitemap, drafts included,
  leaking the very slug-existence the 404 gate was built to hide;
  now only `public` is listed. 15 unit tests pin the resolution.
- **V.2 — SHIPPED 2026-08-13 (L32).** The wizard stamps
  `visibility: 'link-only'` on private-by-default occasions at
  press; the publish modal and the rewritten three-state
  PrivacyPanel both open pre-armed on "Just people with the link"
  for those occasions; and the resolver's registry fallback makes
  the same true for every pre-spine bachelor/ette already
  published. CLAUDE-PRODUCT §8 Q2, wired at last — proven live by
  the matrix fence's bachelorette test (no explicit choice →
  reachable by link, noindex).
- **V.3 — SHIPPED 2026-08-13.** The copy tells the machine's truth:
  the wizard/editor "Nothing is public until you publish" line is
  now literally rule 1 of the resolver; the publish ceremony's
  "It's pressed" describes the CHOSEN state (password → "share the
  link and the password together"; link-only → "hidden from search
  engines"); the publish modal offers all three live states in
  plain words; the PrivacyPanel names the current state and warns
  that an empty password gate protects no one. (SharePanel makes no
  visibility claims — audited, nothing to fix.)

**Fence:** SHIPPED — `e2e/specs/visibility-matrix.spec.ts` (in the
staging fence): one site walks draft → public → link-only →
password → pulled-back-draft, asserting per state who sees what
(anon 404 / owner preview / open+indexable / open+noindex / gate
with wrong-password-stays-out + right-password-enters + private
metadata), plus the bachelorette-default test. All 18 fence e2e
green locally.

---

## §8 · Sprint A — PHONE + ACCESS (the 390px and keyboard pass)

**Goal:** the funnel and the guest side work on the devices people
actually hold. (R8; mobile-a11y ledger complete.)

- **A.1 — SHIPPED 2026-08-13.** The Basics-grid crush (L54) had a
  two-layer cause: inline gridTemplateColumns fighting the phone
  stylesheet AND two children whose inline gridColumn:'span 2'
  conjured an implicit second column whenever the stylesheet stacked
  the grid — silently rebuilding the two-up layout. Columns live
  only in pearloom.css now; spanning children use '1 / -1' (inert in
  one column). Publish CTA truncates its URL half, never the verb
  (L107). Hero names never break mid-word (L23): every variant
  renders name·joiner·name as space-less adjacent spans, so the
  browser saw one "MayaandDaniel" run and split it anywhere; one CSS
  rule (.pl8-hero-display > span { inline-block }) fixes all nine
  variants. All three verified live at 390px.
- **A.2 — VERIFIED FIXED 2026-08-13 (L100).** Does not reproduce:
  tapping a section on the phone canvas activates it AND opens the
  props sheet ("EDITING · OUR STORY" + sheet, verified live at
  390px) — EditorRedesign.selectFromCanvas landed with intervening
  mobile-canvas work. Nothing to build; the wiring already exists
  (setActive={viewportMobile ? selectFromCanvas : setActive}).
- **A.3 — SHIPPED 2026-08-13.** `src/lib/suite-card.ts` is the one
  formatter: humaneDateLabel (the hero's own formatting — ThemedSite
  delegates to it), suiteDateVenueLine (the joiner renders only
  between two real values), suiteCardInk (contrast-floored ink
  family; mid-tone card colors that beat both warm inks — the
  audit's olive at 2.12:1 — escalate to pure black/white). Wired
  into PubShareCard (which paired theme-ink with theme-card at
  1.72–2.12:1, L55), the First Pressing overlay, and the hero
  (L99's raw-ISO trio). L108's deeper cause found: the failing
  tagline/eyebrow colors come from the WIZARD's palette-derived
  vars, not the catalog — themeVarsFromPalette now floors
  ink-soft/ink-muted/accent-ink at 4.5:1 against the section at the
  source; wizard-look.test.ts fences four tricky palettes.
- **A.4 — SHIPPED 2026-08-13.** SectionRail rows are keyboard stops
  (role=button + Enter/Space; rows and insert points get a
  :focus-visible ring — L103); RSVP modal inputs gain real label
  association and focus restores to the OPENER on close (the trap
  hook captured activeElement after autoFocus had already moved
  focus inside — L104); welcome marks carry aria-label (L102);
  occasion cards announce selection (L110); the settings modal
  honors Escape, field-Escape stays with the field (L66).
- **A.5 — SHIPPED 2026-08-13 (L101).** Signup inputs 16px (kills
  the iOS zoom-on-focus), the password eye 44px, both "Sign in"
  links carry 44px tap areas via padding + negative margins.
- **A.6 — SHIPPED 2026-08-13.** EditorThemeShop unmounts when
  closed (two-phase mount through the exit slide) and every pack
  tile gets a distinct accessible name (L70/L105). L109 (the
  /wizard/new hydration mismatch) and L73 (the squeezed guest
  photo-upload page) no longer reproduce — verified over repeated
  loads/live taps; fixed by intervening sprint work.

**Fence:** SHIPPED — `e2e/specs/phone-access.spec.ts` (in the
staging fence): the Basics grid computes ONE column at 390px with
full-width fields, occasion cards expose aria-pressed, signup
inputs ≥16px + a 44px eye, and a pressed site's hero name units are
inline-block. (The screenshot-tour 390px pass rides the existing
tour spec on demand; the executable CI fence is this spec.) All 21
fence e2e green locally.

---

## §9 · Sprint C — ONE PRESSING (the big rebuild, last on purpose)

**Goal:** dissolve the wizard→editor seam — the highest-ceiling
structural bet (R1; RADICAL-DESIGN §D's named remaining rebuild), done
LAST because W–A de-risk it and its bug class is already fenced by
then.

- **C.1 Demo-ink law (L18, L24, L33, L71, L75, L106). — SHIPPED
  2026-08-13.** The law lives as a pure helper —
  `composeVenuePlaceLine` (lib/suite-card.ts): demo halves render
  only when the host gave NEITHER half (editor only), and the "·"
  joiner renders only between two real parts. ThemedSite's hero
  byline builds through it — the per-field 'Santorini, Greece'
  fallback that composited with the host's real Asheville is dead,
  and every dangling-'·' case (editor, preview, published hero +
  footer) resolves from the same root. Canvas demo content wears
  the tab: `DemoInkTab` ("Example — click to write yours", the
  peach working accent) renders on any section whose canvas render
  is PURE demo — the un-authored story (L24's three unmarked
  fabricated chapters) and the un-given registry, the same pair the
  published-honesty gates drop for guests (G.5's policy,
  generalized to the canvas). Fenced in suite-card.test.ts (the
  Santorini class, the demo-pair gate, the never-dangling joiner);
  verified live: editor shows real venue + Example tab + zero
  Santorini, published shows zero dangling joins.
- **C.2 A truthful editing model for published sites (L19). —
  SHIPPED 2026-08-13.** The host chooses at publish ("Edits after
  publishing": Go live as you save / Wait for your OK), stored as
  `manifest.editMode` (readEditMode in site-visibility.ts). Staged:
  publishSite stamps `sites.published_manifest`
  (20260813_published_snapshot.sql — local-applied, queued for prod
  in §3 S.1's pending list) and the PUBLIC routes serve that
  snapshot via `servedManifestFor` while autosaves accumulate
  privately; "Update site" (the topbar button's honest label on a
  staged published site) re-snapshots. Live: the snapshot stays
  NULL and autosaves serve within seconds — the original behavior,
  now SAID OUT LOUD by the topbar's EditModeNote pill ("Edits go
  live as you save" / "Edits wait for your OK"). The visibility
  gate always reads the WORKING manifest, so unpublishing takes
  effect instantly in either mode. Fenced: the staged walk
  (publish v1 → private edit never leaks → Update releases it)
  rides visibility-matrix.spec.ts in the staging fence; verified
  live in both modes end-to-end. (The diff VIEW inside the update
  flow — showing which sections changed — is a refinement left for
  C.5's merged surface.)
- **C.3 One readiness system (L65). — SHIPPED 2026-08-13.** The
  rail's completion bar and the topbar checklist are ONE model:
  bridge.ts derives the % from the SAME `buildPublishChecks` the
  checklist renders (they used to run two different 7-check lists —
  86% beside a disagreeing checklist, neither explaining itself),
  and the bar is a real button — clicking it opens the checklist
  popover (`pearloom:open-publish-checklist`), whose failing rows
  already jump to the fixing panel. Judgment call recorded: Pear's
  cards (bastings) are SUGGESTIONS, not readiness claims — after
  T.2 they never count toward the host's numbers, so they stay a
  separate strip rather than merging into the checklist; the two
  systems that CLAIMED readiness are now one.
- **C.4 Receipts everywhere (H3 complete). — SHIPPED 2026-08-13.**
  The destination half built: `wizardFactDestinations`
  (lib/wizard-seed.ts, CO-LOCATED with the seeder so a new seed
  can't ship without its receipt line) maps every seeded wizard
  fact to where it landed — "Your parking note → the Travel
  section", day plan → Schedule, dress code → Details cards, hotels
  → Travel, menu → Menu, playlist → Music, reply-by → RSVP —
  rendered in BastedIn's once-per-site receipts strip ("Where your
  answers landed") beside the existing story anchors. The other
  halves were already in place from earlier sprints and are hereby
  confirmed as the one pipeline: PearAssist's preview-before-apply
  (Keep / Try again / Discard) for every inline rewrite, BastedIn's
  loud failures (L20's silent 'Add it' fixed with an error line +
  retry) + fireUndoable receipts on every rail apply, and
  DashAskPear honestly showing prose-only when a patch envelope
  can't be applied from the dashboard. Fenced in
  wizard-seed.test.ts (a full picks set seeds → every fact names
  its destination; an empty manifest produces zero receipts).
- **C.5 The merge — IN PROGRESS behind the flag (increments 1–2
  shipped 2026-08-13).** The pressing IS the surface: wizard steps
  become the empty-state prompts of the editor canvas; chrome fades
  in as content lands; phone-first working steps (RADICAL §D). The
  press becomes an in-place transition. Feature-flagged; the old
  wizard remains the fallback until the funnel metrics beat it.
  - *Increment 1:* `lib/one-pressing.ts` — the `onePressing` gate
    (?press=one/classic beats localStorage beats
    NEXT_PUBLIC_ONE_PRESSING beats off; server always sees off),
    resolution order pinned by unit test.
  - *Increment 2:* `pages/OnePressing.tsx` — the merged surface's
    first working cut, mounted by WizardNewClient when the flag
    resolves on: the REAL renderer (ThemedSite, proof mode) presses
    the site live behind a floating glass prompt card (occasion →
    names → date/venue → press); un-answered sections wear honest
    drafting slats, never demo copy; the press rides the SAME
    idempotent pressKey path (W.2 — no new double-create class) and
    the same 401 claim-handoff / 402 upgrade-door contracts.
    `e2e/specs/one-pressing.spec.ts` (staging fence): flag-off
    renders the classic wizard untouched; ?press=one presses live
    (typed names appear in the canvas) → lands in the editor →
    exactly one site.
  - *Named next increments:* the true in-place editor mount (no
    route swap — needs the ownership pass folded in), photos/palette
    steps as canvas prompts, chrome fade-in choreography, the
    funnel-metrics comparison that gates the 100% rollout.
- **C.6 Site addresses, managed (L22). — SHIPPED 2026-08-13.**
  `/api/sites/rename` (owner-gated, rate-limited): GET ?check=
  availability (format + taken + reserved-by-a-renamed-site), POST
  renames subdomain + site_config.slug, collapses redirect chains,
  and records the old address in `site_redirects`
  (20260813_site_redirects.sql — local-applied, queued for prod).
  The public routes (home + sub-pages) 301 old addresses to the new
  home forever, so printed cards and shared links keep working —
  child tables ride along untouched (they key by the sites row id).
  Surfaced in the Share panel: `SiteAddressEditor` under the Site
  URL — debounced availability as the host types, plain-words copy
  ("Your old link keeps working — it forwards here"), and the
  editor navigates itself to the new address on success. Verified
  live: check taken/free/reserved, rename 200, new address serves,
  old address lands on the new one with content intact, the old
  slug refuses reuse.

**Counts as done:** the flag ships to 100% only when the staging
funnel e2e + the wow-moment metrics (already instrumented) match or
beat the old wizard.

---

## §10 · Sprint P — THE POLISH LEDGER (everything that remains)

Batched by surface; each row is small and evidence-anchored. This
sprint closes every ledger item not consumed above.

- **P.1 Dashboard batch — SHIPPED 2026-08-13.** The budget
  empty-state's retired "Nothing yet. Begin a thread." is plain
  copy now, with the D.2 fence (`brand-retired-copy.test.ts`)
  keeping every retirement dead (L56); the kebab clip closed in
  W.2 (L57); the weekend/registry/link nits all closed inside
  Sprint T — T.7 covered L63, T.8 covered L62 + L64. Nothing in
  the batch remains.
- **P.2 Editor batch — SHIPPED 2026-08-13:** the "Class of" chip
  fires only on graduation; every other occasion gets its year
  plainly (L67). ⌘K indexes the Guests TOOL under
  guest/list/invite/rsvp/people — searching "guest" no longer
  routes hosts away from managing guests — and the trigger's glyph
  is platform-aware (⌘K on Apple, Ctrl+K elsewhere, resolved
  post-mount) (L69). The Sealed Arrival address line drops to
  bottom:12, clearing the wax seal's disc instead of rendering
  half behind it (L72). Pear's three degraded 503s stop saying
  "isn't connected to a model on this server": the guest concierge
  says "Pear is resting right now — your hosts can answer anything
  you need"; the two host drafters say "Pear can't draft right now
  — you can write this yourself, or try again later" (L74).
- **P.3 Wizard batch — SHIPPED 2026-08-13:** the RSVP-deadline
  suggestion says "(as soon as you can — the day is close)" when the
  five-weeks-out ideal is clamped by a near date (L76); wizard FAQ
  seeding is gated on the occasion's own registry blocks so a seeded
  section can't contradict "unusual for this occasion" (L78); a
  no-match occasion search offers "Give it a home anyway — start a
  Story site" instead of a dead end (L79, live-verified); the
  Opening panel's solo default follows the SAME chain the canvas
  uses (explicit subject.kind → isSoloOccasion), so a memorial
  presents one honoree field with "Single honoree" ON, never two
  fields joined by '&' (L80, live-verified in the editor);
  /api/store/entitlements now surfaces the press gate's own sites
  headroom (count/max/atLimit, grief-exempt sites excluded) and the
  wizard says "You're using all N sites on your plan…" with a
  /upgrade?from=sites door AT ENTRY, role=status, memorials named
  as always allowed (L81, live-verified at the limit); celebratory
  vibe chips are occasion-ordered — a non-couple occasion (birthday)
  leads Joyful/Playful with Romantic demoted to the tail, while
  couple-shaped celebratory occasions (engagement) still lead
  Romantic (L82, both live-verified); and the Studio's mark tray,
  draft thumbnails, and Decoration picker all wear the host's own
  monogram via the shared `monogramFor` (walk F5, live-verified —
  the tray now matches the card exactly, S&S sample gone).
- **P.4 Landing batch — SHIPPED 2026-08-13.** L95 closed inside
  M.1 (DesignFAQ deleted; the dead "#journal" anchor removed; the
  memorial promise said plainly in the pricing footer). The
  Unsplash sweep: all 36 stock hotlinks are gone — the house now
  presses its own plates (`public/plates/plate-01..12.jpg`,
  twelve painterly occasion-tinted fields authored in-house;
  `lib/photo-plates.ts` maps slots stably) across the landing
  (hero backdrops, day-of wall, gallery tiles, album strips,
  studio covers), both demo worlds, and the dev harness; the
  `images.unsplash.com` remotePattern is deleted from next.config
  so a future hotlink breaks visibly; `no-stock-hotlinks.test.ts`
  is the fence (zero unsplash refs in src, no remotePattern, all
  12 plates present). Live-verified: landing renders 19 plate
  images with zero unsplash requests; /demo renders all 12 plates
  after scroll with none broken.

---

## §11 · Sprint D — DOCS TRUTH (stop the drift engine)

Run early-parallel (D.1–D.2 with Sprint W; the rest with M).

- **D.1 — SHIPPED 2026-08-13.** CLAUDE-DESIGN.md corrected against
  the code: §5 stops teaching the retired "Nothing yet. Begin a
  thread." key and instead names the clarity-first law + the
  `brand-retired-copy.test.ts` fence (L44); the §1 table's "6 named
  themes" now matches §3.3's 10 (themes.ts counted — the registry
  is the authority); §12 already carried the S.4 migration
  discipline (verified, no edit needed); §16's debt list refreshed
  to 2026-08-13 (story-drafting item updated for W.11's verbatim
  seeding, C.5's flag and the nine pending prod applies added as
  live debt).
- **D.2 — SHIPPED 2026-08-13 (inside P.1).**
  `src/lib/brand-retired-copy.test.ts`: "Begin a thread" is
  zero-tolerance in src; "basted in" is whitelisted only to
  bastings.ts (internal name) + the pear-chat prompt that INSTRUCTS
  against it. The P.1 sweep fixed all six live occurrences (budget,
  music dashboard, circle ×2, DashShell, signup metadata, the
  welcome-email CTA).
- **D.3 — SHIPPED 2026-08-13.** L87 + L88's MONETIZATION side had
  already been reconciled by M.7 (the ladder says 2/10/Unlimited,
  the AI-generations row matches PEAR_MONTHLY_LIMIT, §8 cites
  DECISIONS §5's "modelled and fine" and "do not price-test yet" —
  all fence-pinned by pricing-agreement.test.ts). Closed here: L91
  — DECISIONS-2026-08-04 §1's "written but not applied" status
  paragraph corrected (the summary row was right; S.1's prod diff
  confirmed referral_credits live) — and L89: SUITE-STRATEGY §7
  print stamped RETIRED (original text preserved as a quoted
  record), its §1 table row and build-order Phase 6 and "why this
  wins" #4 struck, and FOLLOW-UPS §H's Studio→Print seam item
  marked VOID.
- **D.4 — SHIPPED 2026-08-13 (local; prod apply queued).**
  `20260813_activation_north_star.sql` replaces activation_funnel
  with the agreed ladder (REVIEW-SYNTHESIS §1.10): guest_count /
  reached_guest_threshold (≥10) / sent_invitation
  (guests.email_sent_at) / received_response (responded_at, any
  status — a decline is a response); activated = published ∧ ≥10
  guests ∧ invitation sent ∧ ≥1 response; activated_within_14d
  follows the new bar; received_first_rsvp kept for dashboard
  continuity. Applied locally (view smoke-tested over sim data,
  stage flags correct); queued as the ninth pending prod apply in
  §3. The invite-DELIVERY stage (first_invite_delivered_at) is
  deliberately deferred to O.1 — no per-guest delivery stamp exists
  until the email webhook lands.
- **D.5 — SHIPPED 2026-08-13.** PERSONA-PLAN §5 refreshed: the
  staging checklist item now points at the S.2 migrations-built
  stack (the recipe exists; hosting an instance remains the owner
  half), and the gate carries a re-arm note — G's honest guest
  flows, W's critical-journey CI walk, and D.4's north-star view
  are in place; still open before recruiting: the one-week
  client-error baseline and the hosted staging instance.

---

## §12 · After the plan — the market bets (positions, not sprints)

Executed only after the wires hold; each has its trigger written down.

1. **Guest-loop growth (R2's second half).** With G.1–G.4 live:
   passport recap post-event, "host your own" with style inheritance +
   the archive-year referral reward (implemented; ledger applied),
   guest→host conversion instrumented as THE metric. Trigger: Sprint G
   shipped + O.1 (emails deliver).
2. **The container pivot.** Per DECISIONS §3, unchanged: trigger at
   ~50 celebrations through the (now actually open) doorway, measuring
   how many link a second event. The data model is ready; W.1 finally
   makes the evidence collectible.
3. **Own "after the day."** H6's fix turns the Remember pillar on;
   market the afterglow (recap, anniversary rebroadcast, Keepsake) as
   the moat — the quadrant no competitor owns. Trigger: first cohort
   of real published events reaches their day.
4. **Table-stakes decisions (owner, §1):** domains (O.5), print
   partnership vs never (L50 — a print-shop referral on the
   press-sheet export is the zero-risk middle), card-based cash funds
   (L51 — deliberate no today; revisit only with volume evidence),
   phone posture (L53 — the PWA + wallet-pass route first, no native
   app before product-market fit).
5. **Surface-area diet (L92).** After C.5, a route census: every
   surface earns its place by usage or folds into the quiet shelf —
   the 11:1 surface-to-validated-value ratio is the number to drive
   down.

---

## §13 · Exit criteria — "all complete" means

1. Sprints W, S, G, T, M, V, A, C, P, D all stamped SHIPPED in this
   doc, each block's fence green in CI.
2. The staging gate (S.2) green on every PR; prod schema and
   migrations diff clean.
3. The full journey e2e green **signed out to paid**: landing → wizard
   (no wall) → one press, one site → story present in the host's words
   → publish (real gate) → guest RSVP (honest, durable) → passport
   opens → purchase grants plan → recap fires post-date.
4. Zero fabricated numbers, claims, or automations anywhere a user
   looks (T fences green).
5. The 110-item ledger + H1–H8 all traceable in Appendix A to a
   SHIPPED block (or an explicit owner decision recorded in §1).
6. Owner actions O.1–O.3 done (O.4–O.7 may trail with their features).
7. vitest / tsc / eslint / build green; the Maya walk re-run by a
   fresh session finds no P0s.

**Exit state, stamped 2026-08-13 — everything a session can close is
closed.** (1) ✅ all ten sprints stamped SHIPPED above, every fence in
CI. (2) ✅ the staging gate runs on every PR; prod schema diff clean
except the nine §3 pending applies (owner re-auth). (3) the KEYLESS
journey is green end-to-end (money-door.spec proves price → choose →
honest degrade); the paid half blocks on O.2 by definition. (4) ✅ T
fences green. (5) ✅ Appendix A maps all 110 + H1–H8 + walk extras.
(6) ⏳ owner — O.1 (email DNS), O.2 (Stripe keys), O.3 (env/health
check via /api/health/deps), plus the nine MCP applies. (7) ✅ vitest
1860/1861 (the one failure is the pre-existing weekend-route
baseline, recorded in §10's P.3 stamp), tsc/eslint/build clean, and
the scripted Maya walk (critical-path.spec.ts) + all fence suites
re-run green on the local stack the day of this stamp (24/24 across
critical-path, doorway, press-idempotency, publish-gate,
rsvp-honesty, passport-phone, money-door, visibility-matrix,
phone-access, one-pressing).

---

## Appendix A · Complete finding → block index

Walk headliners: H1→W.1 · H2→W.2 · H3→W.11+C.4 · H4→G.3 · H5→W.7+W.8+S.1 ·
H5b→S.1+S.2 · H6→W.3 · H7→W.3+V.1 · H8→W.5+G.1. Walk extras: F1→C.1 ·
F2→G.3 · F3→C.3 · F4→M.1 · F5→P.3 · day-of-checklist→T.2 · unsplash→P.4.

| Ledger | Block | | Ledger | Block | | Ledger | Block |
|---|---|---|---|---|---|---|---|
| L1 | W.4 | | L38 | T.5 | | L75 | C.1 |
| L2 | W.3 | | L39 | M.6 | | L76 | P.3 |
| L3 | W.6 | | L40 | T.6 | | L77 | D.2 |
| L4 | W.5 | | L41 | M.3 | | L78 | P.3 |
| L5 | W.5 | | L42 | M.5 | | L79 | P.3 |
| L6 | W.3+V.1 | | L43 | D.2 | | L80 | P.3 |
| L7 | G.2 | | L44 | D.1 | | L81 | P.3 |
| L8 | W.7 | | L45 | W.2 | | L82 | P.3 |
| L9 | S.1 | | L46 | W.11 | | L83 | M.8 |
| L10 | §1 | | L47 | G.3 | | L84 | M.4 |
| L11 | W.9 | | L48 | D.4 | | L85 | M.1 |
| L12 | W.10 | | L49 | O.5+M.5 | | L86 | M.1 |
| L13 | W.2 | | L50 | §12.4 | | L87 | M.7 |
| L14 | W.3 | | L51 | §12.4 | | L88 | D.3 |
| L15 | T.1 | | L52 | O.1 | | L89 | D.3 |
| L16 | T.2 | | L53 | §12.4+A | | L90 | S.1 |
| L17 | G.1 | | L54 | A.1 | | L91 | D.3 |
| L18 | C.1 | | L55 | A.3 | | L92 | §12.5 |
| L19 | C.2 | | L56 | P.1+D.2 | | L93 | O.7 |
| L20 | W.11 | | L57 | W.2 | | L94 | M.7 |
| L21 | D.2 | | L58 | W.3 | | L95 | P.4 |
| L22 | C.6 | | L59 | T.2 | | L96 | M.1 |
| L23 | A.1 | | L60 | T.3 | | L97 | O.6+M.3 |
| L24 | C.1 | | L61 | T.4 | | L98 | §12.4 |
| L25 | G.3 | | L62 | T.8 | | L99 | A.3 |
| L26 | G.7 | | L63 | T.7 | | L100 | A.2 |
| L27 | G.5 | | L64 | T.8 | | L101 | A.5 |
| L28 | G.4 | | L65 | C.3 | | L102 | A.4 |
| L29 | G.4+W.6 | | L66 | A.4 | | L103 | A.4 |
| L30 | G.6 | | L67 | P.2 | | L104 | A.4 |
| L31 | G.6 | | L68 | M.4 | | L105 | A.6 |
| L32 | V.2 | | L69 | P.2 | | L106 | C.1 |
| L33 | C.1 | | L70 | A.6 | | L107 | A.1 |
| L34 | G.2* | | L71 | C.1 | | L108 | A.3 |
| L35 | M.1 | | L72 | P.2 | | L109 | A.6 |
| L36 | M.3 | | L73 | A.6 | | L110 | A.4 |
| L37 | M.2 | | L74 | P.2 | | | |

\* L34 (memorial "YOU'RE INVITED" publish card + email subject) ships
with G.2's occasion-true share grammar — the publish modal and mailto
read the registry's voice/grammar, "In loving memory" for solemn.

---

*End of REVAMP-EXECUTION-PLAN. Companion: `docs/NEW-USER-REVAMP.md`
(the evidence), `docs/audit-shots/new-user-sim/` (the screenshots).
Arm Sprint W first.*
