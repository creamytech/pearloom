@AGENTS.md
@BRAND.md
@CLAUDE-DESIGN.md
@CLAUDE-PRODUCT.md

## Active focus

**Sprint T — HONEST STATES** (`docs/REVAMP-EXECUTION-PLAN.md` §5).
Sprints W, S, and G all shipped in full 2026-08-12/13 — every stamp
in the plan doc. G closed with the fork collapse (G.1b, commit
pending push): `guests` is the ONE canonical guest row, the
20260812_guest_spine_merge migration merged + rekeyed everything,
the adapter in lib/event-os/db.ts is the only guest resolver, and
`no-guest-fork.test.ts` greps the fork from ever growing back.
pearloom_guests is frozen-deprecated (drop after a quiet cycle).

Goal: rule §0.2 (never fabricate) applied everywhere the audit
found a fabrication.

**T.4, T.5, T.6, T.8 SHIPPED 2026-08-13** (stamps in plan §5):
store fabrications deleted + no-fabricated-proof fence; /partners
honest (mailto hello@); registry loop-link cut, countdown label
calendar-aligned, one "Sign out" label; the Guests follow-ups card
states the real manifest.reminderCadence instead of claiming
phantom weekly activity.

Open threads: T.1 day-of wears a REHEARSAL frame pre-event
(cockpit-phase knows; L15: no wall-clock "Right now", no checked-off
moments pre-day) · T.2 progress counts only host-real milestones
(Pear's un-accepted suggestions → a "Pear suggests" strip, not the
host's numbers; L16/L59) + the Day-of checklist persists (manifest
or table — never useState) and appears in day-of week · T.3 funnel
stages render only from real tracking events ("not tracked", never
100%; L60 — /dashboard/analytics) · T.7 weekend planner prefills
from the host's existing site (L63 — /dashboard/weekend opens blank
beside a real dated site).

Counts as done: the fabrications fence — the forbidden-strings
suite extended so the specific dead claims can't return, plus a
grep that flags any sold/rating literal in store data.

Skip: Sprints M–D work not needed for a T block; the pending prod
MCP applies (owner/Supabase re-auth — plan §3 S.1 lists five now:
20260529, 20260530, 20260812_schema_parity, 20260812_time_capsules,
20260812_pearloom_guests_site_key + 20260812_guest_spine_merge).

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

**`docs/TASTE-PLAN.md` is fully executed** (2026-07-08, five
commits `dad78a24`…the T.5 calm-pass commit) — the design-taste
pass from the owner's reference image, moves stolen and the
pastel-gradient skin refused. What landed: shell `<StateChip>` (one
status language — 9 surfaces migrated, 9 local helpers deleted);
the display tier (PageIntro/PLHead at 44-46px letterpress + the
shared mono-gold eyebrow); shell `<HeroPlate>`/`<PlateAction>` (the
cockpit hero generalized — Guests/Registry/Vendors/Budget/Keepsakes
each open with ONE pressed plate, real figures only); `pl-hatch`
line-screen utilities (settled things wear the press: claimed
tiles, sent phases, thanked rows, done moments); BRAND §7 copy
fixes. New chrome rules for future sessions: statuses render via
StateChip (never bare colored text), one plate per route (never
two), pattern-as-state via pl-hatch (never new patterns). vitest
1269/1269.

**`docs/STUDIO-PLAN.md` is the next plan** (authored 2026-07-09,
owner brief: replace the pastel Stamp marks + bring the Studio to
editor-level customization with paper parity). SV.0 SHIPPED same
day: the `Stamp` motif redesigned in place (`pearloom/motifs.tsx`)
from a solid pastel disc to a letterpress ink postmark — hairline
double ring, dotted inner ring, mono-caps circular text, tone
picks the ink, paper shows through; every consumer swapped
automatically; visual harness at `/dev/marks`. SV.1 SHIPPED same
day: the store's theme packs press the card (`pack:<id>` palette/
font sentinel over the pack's `--t-*` bag; Theme-packs shelf in
the Colors rail, owned/free press in one tap with faces + grain,
locked link to the store; `/dev/studio` harness). SV.2 SHIPPED
same day: paper parity (Grain-strength slider on
`--pl-texture-intensity`, six paper stocks with their own inks
incl. dark navy, edge treatments plain/hairline/double/gilded;
all persisted on manifest.studio; press sheet carries the same
sheet). SV.3–SV.6 SHIPPED same day — **the plan is fully
executed**: dated Postmark + monogram Seal marks + the Mark-ink
picker (SV.3); click-to-edit lines on the canvas + the On-the-card
show/hide group + Names size (SV.4); 10 layouts with
`recommendedStudioLayoutFor` gold-pearl picks (SV.5); the photo
back, the envelope liner + real-guest addressee, and the
`no-sticker-marks.test.ts` fence (SV.6). SV.7 (the depth pass)
closed every deferral: placed assets (press pieces onto the card
at 9 snap anchors, drag to re-snap, printed in place —
`manifest.studio.placed`), Label ink + spacing for the mono-caps
lines, the per-guest email card pressing on the studio's paper
stock (`lib/studio/paper-stocks.ts` shared with /api/invite-card),
and deckle CLOSED as a product decision (print-at-home can't
manufacture a torn edge; deckled stock + the Plain edge is the
honest answer). Nothing in the plan remains open except §7 Q2/Q3
judgment calls. New mark law: marks are STAMPED ink, never pastel
sticker discs — the fence test enforces it.
