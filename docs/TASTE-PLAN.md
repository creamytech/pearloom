# TASTE-PLAN.md — steal the moves, refuse the skin

> Owner prompt (2026-07-08): *"i feel like the design taste can be
> improved dramatically across our product — look at this design i
> found online"* + a reference image: a task-management mobile app
> (serif display type, pink→lavender gradient hero cards, decisive
> status chips, diagonal-hatch calendar blocks, heavy whitespace).
>
> **The read:** the reference is genuinely well-made — but what makes
> it feel expensive is five reusable *moves*, not its pastel *skin*.
> The skin (gradient cards, cool pink/lavender, pure-white ground)
> is precisely BRAND.md §10's banned list ("floating gradient blobs…
> anything that reads AI startup"). The moves, translated into our
> paper/ink/olive/gold vocabulary, are exactly what the product
> chrome is missing. This plan is the translation.

---

## 0 · How to use this file

- Same prompt system as AFTERGLOW/ATELIER: copy a §4 block over
  `CLAUDE.md` line 6 to arm the autoloop, or hand it to a session.
  Stamp statuses here as sprints land.
- Every block starts with its own fresh per-surface audit — the §2
  audit below is a first pass (dashboard home + guests + the
  session's accumulated screenshots), not a substitute.
- BRAND.md remains the constitution. Nothing in this plan adds a
  gradient, cools the palette, or whitens the ground.

---

## 1 · The reference, deconstructed — five moves worth stealing

1. **Type-scale drama.** Giant serif display ("Design review",
   "April 2026") against tiny, quiet metadata. The contrast of
   scale — not the typeface — is what reads as taste. We own
   Fraunces and barely push it past 26px in product chrome.
2. **One hero surface per screen.** A single saturated focal card;
   everything else white and quiet. Focal hierarchy makes the
   screen feel designed instead of assembled.
3. **Decisive state chips.** Solid-ink pill with reversed text for
   the active state; tinted quiet pills for the rest. State is
   *shape + weight*, not just a word.
4. **Pattern-as-state.** The diagonal-hatch fills on calendar
   blocks. Hatching is a printmaking gesture — this move is MORE
   ours than theirs (letterpress line-screen), and we don't use it.
5. **Whitespace + radius discipline.** One card radius, one gap
   rhythm, generous padding. Restraint applied uniformly.

**What we refuse (BRAND §9/§10):** gradient hero cards, cool
pink/lavender, pure-white ground, glass used as a surface. Our
ground is cream paper with grain; our saturation lives in ink-solid
olive and one gold hairline.

---

## 2 · First-pass taste audit — where the product falls short of its own bible

- **Type scale is timid in chrome.** Route headers (PLHead) sit at
  ~26-34px while the canvas has room for 44-56. Card titles inside
  Panels run 13-15px semibold sans — the letterpress voice
  disappears one level below the header. Eyebrows exist but aren't
  everywhere metadata lives.
- **Uniform card weight.** Dashboard Home (post-AFTERGLOW) has a
  real hero — the dark-olive cockpit card — and it's the
  best-looking screen in the product *because* of it. Almost no
  other route has a focal surface: Guests, Registry, Vendors,
  Budget, Keepsakes open as N equal panels. The hero move should be
  a route-level pattern, not a Home one-off.
- **State language is quiet text.** RSVP statuses, vendor states
  (considering/booked/paid), task states, phase notes — mostly
  rendered as small colored text or subtle tints. No decisive
  ink-solid chip recipe exists in the atoms; each surface improvises.
- **No pattern vocabulary.** The three brand signatures (grain,
  thread, letterpress) are strong on the landing + published sites,
  thinner in the dashboard. A hatch/line-screen fill in olive-on-
  paper would give calendars, progress, and phase states a
  distinctly *pressed* texture no SaaS template has.
- **Small honesty details.** e.g. the Guests empty state's "← Back
  to Sites" (capitalized "Sites" against BRAND §7's verb-first,
  lowercase rule; stray warm-pink shadow on the pill). A copy+chrome
  sweep will find a dozen of these.
- **Radius/gap drift.** Panels, chips, inputs, and overlays carry
  at least four radii (8/10/12/14/18) and ad-hoc gaps. The
  reference's calm comes from ONE radius family and one gap rhythm.

---

## 3 · The Pearloom translation

| Reference move | Our vocabulary |
|---|---|
| Gradient hero card | **The pressed plate**: ink-solid olive (or editorial-midnight in dark) card with letterpress Fraunces, gold hairline, grain riding over it — the cockpit hero, generalized into a `<HeroPlate>` primitive |
| Serif scale drama | Fraunces display sizes UP on route headers (opsz axis high, `.pl-letterpress`), mono-caps eyebrows on every metadata cluster, card titles gain a display tier |
| Solid/tinted chips | One `<StateChip>` recipe in shell atoms: ink-solid + reversed text (active/now), paper-tint + ink text (rest), plum reserved for destructive/overdue — replaces every improvised status text |
| Diagonal hatch fills | `pl-hatch` utility: 45° olive/gold line-screen at low opacity on paper — phase blocks, calendar spans, progress fills, "spoken for" registry items |
| Whitespace discipline | Radius tokens collapse to two (card/pill); gap rhythm from the density scale; padding floors on Panels |

---

## 4 · Sprint blocks

### T.1 — The chip & state language · status: SHIPPED 2026-07-08 (`dad78a24`) · P0

> **Executed:** shell <StateChip> (7 kinds incl. lavender 'info') + rsvpStateKind/vendorStateKind; nine surfaces migrated (guests roster + sheet, /rsvps, editor GuestsPanel, vendor book, cadence, registry claims, submissions, music mode); 7 local color maps + 2 local chip components + the orphaned PaymentsPanel deleted. GuestReview's severity map stays — it tints cards, not chips.

```
## Active focus — T.1 · One chip to rule every status

**Goal:** A single <StateChip> recipe in src/components/shell/,
BRAND-toned (ink-solid active / paper-tint rest / plum destructive),
adopted by every dashboard status surface. docs/TASTE-PLAN.md §3.

**Direction:** Audit every improvised status rendering (RSVP
statuses, vendor considering/booked/paid, task states, cadence
phases, registry spoken-for, thank-you ledger). Build the atom,
migrate surfaces, delete the local one-offs. Chip label copy obeys
BRAND §7 (plain words, verb-first buttons stay buttons).

**Counts as done:** no dashboard surface renders a status as bare
colored text; one atom, zero forks; vitest green; before/after
shots in docs/audit-shots/taste/.

**Skip:** The published-site renderer — site chips are theme
territory (--t-*), not chrome.
```

### T.2 — Type-scale drama on product chrome · status: SHIPPED 2026-07-08 (`75b0c9c2`) · P0

> **Executed:** PageIntro + PLHead titles rise to clamp(28-30 → 44-46px) with .pl-letterpress + optical sizing; one shared eyebrow recipe (mono-caps, 0.2em, leading gold rule); SectionTitle card tier → 24px; 390px floors verified.

```
## Active focus — T.2 · Let Fraunces be loud

**Goal:** The reference's scale contrast in our voice: route
headers grow into true display settings, metadata shrinks into
mono-caps eyebrows, card titles gain a display tier.
docs/TASTE-PLAN.md §2.

**Direction:** PLHead display size up (~44-52 desktop, clamp on
phones), .pl-letterpress on light ground; define a 3-tier chrome
type scale (display / card-title / meta) as tokens; sweep Panels so
titles use the tier instead of 13-15px sans bold; eyebrow+gold-rule
treatment wherever a label introduces a cluster. Honour the ≤640px
display clamp precedent (2026-06-12).

**Counts as done:** every dashboard route header reads letterpress;
Panel titles share one tier; zoom 125/150% clean; axe pass on
touched routes; before/after shots.

**Skip:** Marketing pages (already loud) and the editor canvas
(site territory).
```

### T.3 — One hero plate per route · status: SHIPPED 2026-07-08 (`ef239958`) · P1

> **Executed:** shell <HeroPlate> + <PlateAction> generalized from the cockpit HeroBanner; adopted on Guests, Registry, Vendors, Budget, Keepsakes replacing their PageIntros — one saturated surface per screen, real figures only (zero-collapse), Guests keeps its interactive filter pills as the numbers.

```
## Active focus — T.3 · The pressed plate (focal hierarchy)

**Goal:** Generalize Home's cockpit hero into a <HeroPlate>
primitive and give each major route ONE focal surface; everything
else stays quiet paper. docs/TASTE-PLAN.md §3.

**Direction:** Extract the cockpit hero's recipe (ink-solid ground,
letterpress display, gold hairline, grain overlay, phase-aware
copy) into shell/. Adopt on Guests (the count + next-action),
Registry (given/still-to-thank), Vendors (due-next), Budget (the
rollup), Keepsakes (the film/book moment). Phase-aware via
cockpit-phase where the route already reads it (DR.2).

**Counts as done:** ≥5 routes open with one plate + quiet panels;
no route has two competing saturated surfaces; §5 forbidden-strings
fence stays green; shots per route.

**Skip:** Settings/help (utility surfaces stay quiet).
```

### T.4 — Pattern-as-state (the line-screen) · status: SHIPPED 2026-07-08 (`01827d34`) · P1

> **Executed:** pl-hatch/-strong/-gold utilities (45° olive/gold line-screen, CSS-only); worn by settled things: fully-claimed registry tiles, sent cadence phases, thanked ledger rows, done day-of moments.

```
## Active focus — T.4 · Hatching is letterpress, not SaaS

**Goal:** A pl-hatch utility (45° olive/gold line-screen on paper,
2 intensities) as the brand's pattern-fill for stateful spans.
docs/TASTE-PLAN.md §1.4.

**Direction:** CSS-only utility in globals.css (repeating-linear-
gradient, no images); adopt on: weekend/day-of timeline spans,
cadence sent-phase cards, registry spoken-for tiles, budget
progress fills, seating occupied seats. Reduced-motion/print safe;
AA contrast preserved under text.

**Counts as done:** the utility exists with documented intensities;
≥4 surfaces wear it; nothing else invents a pattern; shots.

**Skip:** Published sites (themes own their textures).
```

### T.5 — Space, radius, and the copy sweep · status: SHIPPED 2026-07-08 (`this commit`) · P2

> **Executed:** §7 copy fixes (Back to Sites → sites ×2, skeleton Loading → Threading ×2); radius audit found the atoms + card system already token-clean (--r-md/--pl-radius-*/999 from A.1) — per-surface small-element radii (8-14px) left deliberately, documented here rather than churned.

```
## Active focus — T.5 · The calm pass

**Goal:** Two radius tokens, one gap rhythm, and a BRAND §7 copy
sweep across dashboard chrome. docs/TASTE-PLAN.md §2.

**Direction:** Collapse chrome radii to --pl-radius-card /
--pl-radius-pill; audit Panel paddings to the density scale; sweep
button/label copy for §7 violations ("← Back to Sites" →
"Back to sites", etc.) and stray non-token shadows/colors. ESLint
or a strings test where a rule is mechanical.

**Counts as done:** radius grep finds only tokens in chrome; copy
sweep documented with count fixed; vitest green.

**Skip:** The editor panels' --pl-chrome-* system (already
insulated + linted) except where radii drift.
```

---

## 5 · Open questions

- **Q1 — dark mode parity.** The hero plate + hatch utilities must
  land in editorial midnight simultaneously or dark mode drifts
  another step behind. Treat dark shots as part of every block's
  counts-as-done.
- **Q2 — how loud is too loud?** T.2's display sizes should be
  proofed on the 13" laptop + iPhone SE before sweeping — one
  session, screenshots first, then commit the scale.
- **Q3 — the reference's avatar clusters.** Nice, but ours would be
  guest faces we mostly don't have (privacy + sparse photos). The
  orchard marks + monogram seals are our equivalent — no block yet;
  revisit after T.3.

---

*The test for this plan: put the dashboard next to the reference
image and it should feel MORE expensive, not similar — pressed
paper against their glass, and no one can tell which template
either came from, because neither did.*
