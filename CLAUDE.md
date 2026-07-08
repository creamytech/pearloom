@AGENTS.md
@BRAND.md
@CLAUDE-DESIGN.md
@CLAUDE-PRODUCT.md

## Sprint paused — awaiting user direction

> The Stop hook in `.claude/settings.json` greps for the literal
> heading that names the sprint focus; renaming this heading
> here pauses the autoloop without touching settings. Restore
> the sprint heading (and a goal / threads / done-criteria
> block) to resume.

**Last sprint (Studio / stationery editor at `/dashboard/invite`)
landed 2026-05-31:**
- All three open threads green: smoke flow across stationery
  types/views/drafts, AI generation paths mocked + asserted,
  Send overlay → `/api/invite/guest` → `email_sent_at` stamp.
- Studio e2e suite 41/41 passing locally. Type-check clean.
- Last commits on `main`: `bf2c3eb3` (EditionPicker prototype
  theme-pack card), `ad77fbb0` (Studio: skip the spurious
  mount-time autosave — closed the flaky AI-asset round-trip
  test). User push pending.

**To start the next sprint:** rename the heading on line 6 back
to the literal sprint-focus heading that the Stop hook greps
for, and fill in goal / direction / open threads /
counts-as-done / what-to-skip in the same shape as before.

**Both prior sprint queues are fully executed** (2026-07-08):
`docs/PERSONA-PLAN.md` S1–S9 and `docs/GRAND-PLAN-2.md` A.1–A.2 /
B.1–B.2 / C.1–C.6 are all stamped SHIPPED — nothing left to arm in
either. All four 2026-07-08 migrations (person_threads, avatar_url,
circle_invites, crew_threads) are applied to prod and recorded;
advisors clean.

**`docs/AFTERGLOW-PLAN.md` is fully executed** (2026-07-08, commit
`70713cd6`) — the post-event dashboard revamp. All four sprint
blocks (AG.1 phase spine → AG.2 afterglow home → AG.3 hero +
memory → AG.4 long view) are stamped SHIPPED. The cockpit now runs
on `src/lib/event-os/cockpit-phase.ts` (planning / final / the-day
/ afterglow / kept from the unclamped day count); WelcomeHome's
derived copy lives pure in `welcome-home-copy.ts` behind the
forbidden-strings test; `/dev/dashboard` has the four-world phase
switcher. Every dashboard-card change must keep the §5 guardrails
green (the forbidden-strings test IS the fence). Open decisions
remain in AFTERGLOW-PLAN §8 (the 45-day afterglow→kept window is a
constant in cockpit-phase.ts; per-photo focal point still
deferred). vitest 1278/1278; the PERSONA, GRAND-PLAN-2, and
AFTERGLOW queues are all fully executed.

**`docs/ATELIER-PLAN.md` is fully executed** (2026-07-08, ten
commits `bde6c615`…the DR.3 curation commit) — all ten §6 blocks
stamped SHIPPED. What landed: Pearloom Print retired end-to-end
(engine + routes + surfaces + pricing promise; the
no-physical-promises fence test guards the copy); the invitation is
one woven object (themed email on the SuiteTheme contract → the
guest's own per-guest card image as the hero via /api/invite-card →
?g= passport links landing on Sealed Arrival with a dated postmark;
/i/ is a legacy 301; .ics + #rsvp deep-links); Studio v2 presses
from the site's real --t-* bag ('site' sentinel palette/font,
KitFrame, shared seal/postmark envelope, real QR everywhere) and
exports a true press sheet (StudioPressSheet — 3 pages at exact
physical size, 5×7+bleed with crop marks, geometry pinned by
press-sheet-geometry tests); routes merged (payments→registry,
connections→weekend) and phase-aware (Studio/Cadence/Guests read
cockpit-phase); nav curated (Director de-promoted per §8 Q3 — Home
is the brief; ⌘K indexes the sidebar; DEPROMOTED = the true quiet
shelf: cadence/director/review/voice; Guests sub-nav gained
Threads). Open: §7 Q2 (/i/ 301 kept indefinitely), Q4 (email DNS —
owner action). vitest 1269/1269 (the retired print/SVG-serializer
suites left with their features; the press-geometry + stationery
contracts replaced them).

**The next plan is written and ready: `docs/TASTE-PLAN.md`**
(2026-07-08) — the owner flagged product-wide design taste with a
reference image. Five moves stolen from it (type-scale drama, hero
plate per route, decisive state chips, hatch pattern-as-state,
space/radius calm) translated through BRAND.md — steal the moves,
refuse the pastel-gradient skin. Five armable blocks T.1–T.5 at §4;
not yet armed. Paste a block over the heading on line 6 to arm one.
