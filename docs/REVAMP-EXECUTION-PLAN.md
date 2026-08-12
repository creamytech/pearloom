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
    `20260812_time_capsules.sql`. Also pending: a prod
    unique-index dump to diff against migrations (tables/columns
    are verified clean; indexes were verified for the RSVP-critical
    pair only).
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
- **G.4 Passport, phone-first (L28, L29).** 390px-first relayout (no
  horizontal scroll), signed by the couple's names, the guest's real
  state everywhere. The competitive bet's foundation.
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

- **T.1 Day-of is a rehearsal until the day (L15).** Pre-event the
  room wears an explicit REHEARSAL frame: no wall-clock "Right now",
  no checked-off moments; it flips live on the day (cockpit-phase
  already knows).
- **T.2 Progress tells the truth (L16, L59 + walk).** Planning
  progress counts only host-real milestones (Pear's un-accepted
  suggestions move to a "Pear suggests" strip, not the host's
  numbers); the Day-of checklist persists (manifest or table — not
  `useState`) and appears in day-of week, derived where possible.
- **T.3 Analytics don't invent stages (L60).** Funnel stages render
  only from real tracking events; absent tracking shows "not tracked",
  not 100%.
- **T.4 No phantom automations (L61).** "Pear is following up weekly"
  either becomes true (the cadence system CAN do it — wire it, off by
  default, host-armed) or the copy goes.
- **T.5 No fabricated social proof (L38).** Fake sold counts, ratings,
  "MOST CHOSEN", the fake usage meter — deleted. Real counts render
  when real.
- **T.6 /partners tells the truth (L40).** Unpublish until the
  program exists; replace with a "talk to us" capture that goes
  somewhere real.
- **T.7 Weekend planner reads the world (L63).** Prefills from the
  host's existing site; never a blank form beside real data.
- **T.8 Link hygiene (L62 + L64 batch).** Registry "See payments" goes
  to payments; the shell copy-nit list from the dashboard audit swept.

**Fence for the sprint:** extend the forbidden-strings suite with a
"fabrications" fence — the specific dead claims can't return; plus a
CI grep that any `sold`/`rating` literal in store data is flagged.

---

## §6 · Sprint M — THE MONEY PATH (one vocabulary, one door, honest cards)

**Goal:** a customer can discover the price, pay it, and receive it —
and every money surface tells one true story. (R7 complete; needs O.2.)

- **M.1 One vocabulary (L35, L85, L86, L96).** Page/Pass/Keepsake
  everywhere: `usePlan` labels, sidebar chip, settings modal (kill the
  "subscription" wording), the orphaned DesignFAQ either remounted
  with new copy or deleted (its fence-test whitelist removed).
- **M.2 Doors reach the till (L37).** Landing plan buttons carry plan
  intent through auth to checkout; `?upgrade=true` lands on a real
  upgrade surface; the 402's upgradeUrl goes there; one `/upgrade`
  route to rule them all.
- **M.3 Cards describe the real product (L36, L41, L97 + O.6).** Per
  Pass line item: gate it (wire `requirePlan` through the one choke
  point — it has zero callers today) or remove it from the card.
  Outcome: pricing page === enforcement table === MONETIZATION.md.
- **M.4 Store re-merchandised (L84, L68).** Plan-granted packs stop
  wearing price tags beside "Owned"; the signature shelf cross-sells
  the Pass; the free-theme/store-pack name collision resolved; toast
  says "Theme applied."
- **M.5 The archive fee makes sense (L42 + O.5).** If domains build:
  fee = domain + full-res retention as documented. If not: fee is
  full-res retention only, priced honestly, MONETIZATION.md amended.
- **M.6 The loop links (L39).** "MADE WITH PEARLOOM" becomes a link
  with attribution (`?ref=<site>`); the passport's "host your own"
  carries it; `grantReferralCredit`'s ledger verified live (S.1
  adopted the table).
- **M.7 The agreement fence (L87, L88, D.3).** One test imports
  `PLAN_LIMITS`/`PLAN_PRICE_CENTS` and the pricing page's rendered
  claims and asserts agreement; MONETIZATION.md's three drifted
  numbers corrected and cross-doc contradictions resolved.
- **M.8 Degraded money copy (L83).** Keyless/degraded states speak
  host language with a next step, never infrastructure-speak.

**Counts as done:** on staging with test Stripe keys: see price →
choose Pass → pay → land on success → plan granted → gated feature
unlocks → settings shows "Pass". Every step in one e2e.

---

## §7 · Sprint V — THE VISIBILITY SPINE

**Goal:** one visibility state machine; four flags become one truth.
(R5; finishes what W.3 started.)

- **V.1** `visibility: draft | link-only | public | password` on the
  manifest; the site route enforces it; publish modal sets it; the
  four legacy flags (`published`, `comingSoon.enabled`,
  `privacyGate.password`, registry `privateByDefault`) read-migrate
  into it.
- **V.2** Private-by-default wiring (L32): bachelor/ette (and any
  registry-flagged occasion) presses as `link-only` with the privacy
  panel pre-armed; CLAUDE-PRODUCT §8 Q2 finally true.
- **V.3** Promise copy audited against the machine: the wizard line,
  the publish ceremony, the Share panel all describe the actual state.

**Fence:** a state-machine matrix e2e — each of the four states ×
(anon visitor / link visitor / password visitor) asserts exactly who
sees what.

---

## §8 · Sprint A — PHONE + ACCESS (the 390px and keyboard pass)

**Goal:** the funnel and the guest side work on the devices people
actually hold. (R8; mobile-a11y ledger complete.)

- **A.1** Wizard Basics grid at 390px (L54) + publish CTA clip (L107)
  + mobile hero mid-word break (L23: non-breaking join or wrap the
  pair, all hero variants).
- **A.2** Phone canvas tap-to-edit (L100): tapping a section on the
  phone editor opens its sheet — the props-sheet plumbing exists; the
  canvas tap targets don't. (Full phone-first editing lands with C.5.)
- **A.3** The suite-card formatter (L55, L99, L108): one shared
  formatter for every designed card (publish modal, first-pressing,
  It's-pressed, OG) with a contrast floor (auto ink-flip against the
  accent) and humane date formatting ("Saturday, June 12, 2027" —
  never raw ISO). Replaces three hand-assembled versions.
- **A.4** Keyboard + SR: SectionRail rows focusable (L103), RSVP modal
  labels + focus restore (L104), welcome marks named (L102), occasion
  cards announce selection (L110), settings modal Escape (L66).
- **A.5** Signup mobile ergonomics (L101): 16px inputs (kills iOS
  zoom), ≥44px tap targets.
- **A.6** DOM hygiene: EditorThemeShop unmounts when closed (L70,
  L105); the `/wizard/new` hydration mismatch fixed (L109); guest
  photo-upload page responsive (L73).

**Fence:** a 390px screenshot pass in the screenshot-tour CI for the
funnel steps; an a11y assertions spec for the fixed controls.

---

## §9 · Sprint C — ONE PRESSING (the big rebuild, last on purpose)

**Goal:** dissolve the wizard→editor seam — the highest-ceiling
structural bet (R1; RADICAL-DESIGN §D's named remaining rebuild), done
LAST because W–A de-risk it and its bug class is already fenced by
then.

- **C.1 Demo-ink law (L18, L24, L33, L71, L75, L106).** No fabricated
  value ever composites into a line with real host data: kill the
  per-field `place` fallback (the Santorini class) and the dangling
  "·" joins; canvas demo content wears an explicit DEMO slat
  (chapters, taglines); published empty-section policy from G.5
  generalized.
  *(Ship this block FIRST and independently — it's small and it's the
  worst remaining trust break.)*
- **C.2 A truthful editing model for published sites (L19).** Explicit
  states: editing-live (banner: "changes appear to guests as you
  save") or staged ("review & update site" publishes the diff) — host
  chooses; the Publish button stops lying either way.
- **C.3 One readiness system (L65).** The 86% bar, the topbar
  checklist, and Pear's cards merge into one explainable readiness
  model with visible criteria; clicking it shows the list.
- **C.4 Receipts everywhere (H3 complete).** Every wizard fact shows
  its destination ("Your parking note → Details section"), every Pear
  apply shows a diff, every failure is loud. BastedIn's receipts
  pattern generalized into the one Pear-apply pipeline.
- **C.5 The merge.** The pressing IS the surface: wizard steps become
  the empty-state prompts of the editor canvas; chrome fades in as
  content lands; phone-first working steps (RADICAL §D). The press
  becomes an in-place transition (no route seam → no double-create
  class, no handoff cliff). Feature-flagged; the old wizard remains
  the fallback until the funnel metrics beat it.
- **C.6 Site addresses, managed (L22).** Slug rename with redirect
  from the old address, availability check, and clear copy about what
  changes; surfaced in Share/Settings.

**Counts as done:** the flag ships to 100% only when the staging
funnel e2e + the wow-moment metrics (already instrumented) match or
beat the old wizard.

---

## §10 · Sprint P — THE POLISH LEDGER (everything that remains)

Batched by surface; each row is small and evidence-anchored. This
sprint closes every ledger item not consumed above.

- **P.1 Dashboard batch:** budget empty-state copy (L56, with D.2's
  fence), kebab menu clip (L57 — done in W.2 if not earlier),
  weekend/registry/link nits remaining from L62–L64.
- **P.2 Editor batch:** "Class of 2027" chip routed by occasion
  (L67), ⌘K synonyms + platform-aware shortcut glyph (L69), Sealed
  Arrival addressee position (L72), Pear degraded-mode guest copy in
  host language (L74).
- **P.3 Wizard batch:** RSVP-deadline suggestion copy matches the
  clamped date (L76), seeded-sections vs "unusual for this occasion"
  agreement (L78), occasion search catch-all → "Other event" (L79),
  memorial Opening panel honoree-shaped fields (L80), plan-limit
  surfaced at wizard ENTRY not after the press (L81), vibe chips
  occasion-ordered (L82), Studio mark tray wears the couple's own
  monogram (walk F5).
- **P.4 Landing batch:** "Pear's promise" anchor restored (L95, with
  M.1's DesignFAQ decision), self-hosted imagery replacing Unsplash
  hotlinks (walk observation — a craft house shouldn't hotlink stock).

---

## §11 · Sprint D — DOCS TRUTH (stop the drift engine)

Run early-parallel (D.1–D.2 with Sprint W; the rest with M).

- **D.1** CLAUDE-DESIGN.md corrected: §5 stops teaching the retired
  copy (L44), theme count fixed, §12 gains the S.4 migration
  discipline, §16 debt list refreshed against this plan.
- **D.2** The §7 fence: `brand-retired-copy.test.ts` — "basted in",
  "Begin a thread." and future retirements fail CI in any user-facing
  string (L21, L43, L56, L77). Sweep all current occurrences
  (bastings.ts, ThreeActsStage "BLOCKS · BASTED IN", music dashboard,
  BastedIn.tsx naming can stay internal).
- **D.3** Doc reconciliation: MONETIZATION↔DECISIONS contradictions
  (L88, L91), the three drifted numbers (L87), print leftovers stamped
  RETIRED in SUITE-STRATEGY §7 and FOLLOW-UPS §H (L89).
- **D.4** The activation funnel upgraded to the agreed north star —
  published + guest threshold + invitation sent + response — and an
  invite-delivery stage added the moment O.1 lands (L48).
- **D.5** PERSONA-PLAN §5's readiness gate refreshed: the staging item
  now points at S.2; the mass-testing protocol re-armed once Sprint G
  ships.

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
