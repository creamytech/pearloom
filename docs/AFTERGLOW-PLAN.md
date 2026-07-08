# AFTERGLOW-PLAN.md — the dashboard after the day

> Five phone screenshots of a real post-event dashboard (wedding
> 2026-06-27, viewed 11 days later) are the evidence base. The date
> fix from GRAND-PLAN-2 §1 landed — the hero honestly says
> "11 DAYS AGO · The day has come and gone" — but every OTHER card
> on Home is still planning a wedding that already happened:
> a "Final stretch" badge, a day-of prep checklist, a road that
> wants to send a *save-the-date*, "The big day · 0 days out," and
> a weave-in shelf suggesting an *engagement party*. The product
> has no concept of "after."
>
> This plan gives it one: a single **phase model** every cockpit
> card reads (correctness), a smaller and warmer **afterglow card
> set** for the weeks after the day (simplicity), and photo-backed,
> real-number card upgrades (beauty). Sprint blocks at §6.

---

## 0 · How to use this file

- Same prompt system as `docs/PERSONA-PLAN.md` / `docs/GRAND-PLAN-2.md`:
  copy a block from its `## Active focus` line to the closing rule
  into `CLAUDE.md` line 6 to arm the autoloop, or hand it to a
  session verbatim. Stamp statuses here as sprints land.
- Every finding cites file:line as of 2026-07-08 (post-GRAND-PLAN-2).
  Re-grep before trusting a paragraph if the file has churned.
- **Reference implementations already correct** — the tense-aware
  patterns to imitate, not reinvent: `HeroBanner` + `useCockpitCountdown`
  (`cockpit.tsx` — `past` flag, "come and gone" pill),
  `RememberingCard` (`WelcomeHome.tsx:1071+`), `AnniversaryCard`
  (~320–430 days window), `DayOfV8.tsx:143-154,1617-1621`
  ("AFTER THE DAY"), DashDirector's "It happened 3 weeks ago."

---

## 1 · The evidence — five cards, five lies

What the screenshots show, mapped to the code that produces it:

| # | Card (screenshot) | Says, 11 days after | Why (file:line) |
|---|---|---|---|
| 1 | **NeedsYouNow** badge | "FINAL STRETCH · 11 days ago" — and its one todo is "Day-of timeline: vendors, run-of-show" | `stageFromDaysUntil` (`WelcomeHome.tsx:78-83`) reads the CLAMPED `daysUntil` (:143) — post-event is forever `0 → 'late' → 'Final stretch'` (:340). `usePearTodos` (:683) is stage-driven planning-only. |
| 2 | **ChecklistCard** | "DAY-OF CHECKLIST · Confirm vendor arrival times · Pack welcome gifts" | `checklistItems` (`WelcomeHome.tsx:366`) is a static prep list with no phase branch; `ChecklistCard` (`cockpit.tsx:456`) renders whatever it's given. |
| 3 | **RoadCard** | "THE ROAD TO JUN 27 · What's next: Save the date → … → The big day · 0 days out" | `buildMilestones` (`WelcomeHome.tsx:802`) builds the *cadence send ladder* from clamped `daysUntil`; "The big day" rung (:816) reads "0 days out" forever. Feeds `ProgressCard` ("On track and looking good," `cockpit.tsx:321`) too. |
| 4 | **WeekendCard** | "THE WEEKEND · *More to look forward to* · ＋ WEAVE IN Engagement party / Bridal shower / Bachelor party" | `weekendAdds` (`WelcomeHome.tsx:422`) offers the anchor arc's not-yet-created satellites with **no date sense** — an engagement party (offset −180d) is suggested after the wedding. The heading is hardcoded future-tense. The dated sibling cards (Jul 9–11) are legitimately future — those are fine. |
| 5 | **HomeSitePreview** | eyebrow "SAVE THE DATE" | `previewEyebrow = solemn ? 'In loving memory' : 'Save the date'` (`WelcomeHome.tsx:401`) — two states, neither of them "after." |
| + | **TheLongView** | "This day is the *first knot*" with "The day" pinned as `now` | `cockpit.tsx:1007` — the four steps are static; "That week" never becomes the live step, "The day" never reads done. Content is right for afterglow; the *states and tense* aren't. |
| + | **GuestSummaryCard** | RSVP donut with "pending" counts | `cockpit.tsx:502` — post-event, "pending" is noise; the honest number is *who celebrated with you*. |
| + | **Blessing** | "You're doing something wonderful." | present-tense (`WelcomeHome.tsx:442`); the header pair `"You're building / something beautiful."` (:440-441) too. |

**The root cause is architectural, not eight small bugs:** there is
no shared phase. Each card does (or skips) its own date math, and the
one shared input (`stage`) is derived from a clamped number that
cannot go past zero. GRAND-PLAN-2 §1 fixed the *displays* that lied;
this plan fixes the *decisions* that still do.

---

## 2 · North star

> **The dashboard is a companion for the whole arc — it plans, then
> it holds the day, then it remembers. Never the wrong voice.**

The test we hold every card to: read it aloud 11 days after the
wedding. If it would make the couple wince ("send your save-the-date!")
it's wrong. If it would make them smile ("74 people celebrated with
you — the reel has 212 photos") it's right.

---

## 3 · The phase model (one resolver, every card reads it)

New leaf module `src/lib/event-os/cockpit-phase.ts`:

```ts
export type CockpitPhase =
  | 'planning'   // rawDaysUntil > 30, or no date yet
  | 'final'      // 1..30 — the final stretch (real this time)
  | 'the-day'    // 0 — day-of
  | 'afterglow'  // -1..-45 — photos arrive, thank-yous go out
  | 'kept';      // < -45 — the quiet keepsake state

export function cockpitPhaseFor(rawDaysUntil: number | null): CockpitPhase;
/** Copy per phase per occasion voice — 'Final stretch' /
 *  'The afterglow' / solemn variants; ONE place, unit-tested. */
export function phaseCopyFor(phase: CockpitPhase, voice: EventVoice): {...};
```

- Input is the already-correct `rawDaysUntil`
  (`daysBetweenCalendarDates`, unclamped — `WelcomeHome.tsx:138-141`).
- The existing `stage` ('early'|'mid'|'late') SURVIVES but only
  *inside* `planning`/`final` for copy granularity — it is never
  again consulted after the day.
- The existing `postEvent` boolean (:445) and the Anniversary window
  (:449-454) fold into this — `showAnniversary` becomes a `kept`-phase
  concern; `RememberingCard` becomes the `afterglow` anchor.
- Unit-test the boundary matrix (day 31/30/1/0/−1/−45/−46, null).

### 3.1 The per-card behavior matrix

The heart of the plan. "—" = card does not render in that phase.

| Card | planning / final | the-day | afterglow (−1..−45) | kept (< −45) |
|---|---|---|---|---|
| **Greeting header** | "You're building *something beautiful.*" | "Today's the day." | "You did *something beautiful.*" | "Something worth keeping." |
| **HeroBanner** | countdown (as-is) | live d/h/m/s | come-and-gone pill (as-is) **+ the afterglow strip** (§4.1) | same, quieter |
| **NeedsYouNow** | planning todos (as-is) | day-of essentials only | remembering todos: *N photos await your nod* (real moderation count), *thank-yous — x of y sent* (real `thanked_at` ledger), *the memory book is ready to share* | — (bell carries stragglers) |
| **ProgressCard** | as-is | — | — (the story card replaces the % bar; a finished event isn't 73% done) | — |
| **RoadCard** | cadence ladder (as-is) | — | **StoryCard** — the same rail, past tense, all-done: real stamps ("Pressed May 2 · Published May 9 · 74 said yes · The day — Jun 27") | — |
| **ChecklistCard** | day-of prep list (as-is) | same | **post-event list**: send the thank-yous · approve guest photos · print the keepsake · settle vendor balances (occasion-aware; solemn variant gentle) | — |
| **QuickActions** | Add task / Invite / Edit / Studio | Day-of / Broadcast / Site / Guests | Memory book / Thank-yous / The Reel / Share the keepsake | Memory book / Anniversary / Site |
| **HomeSitePreview** | eyebrow "Save the date" | "Today" | occasion-aware past eyebrow via a tiny `postEventEyebrowFor(occasion)`: wedding "Just married" · birthday "It happened" · memorial keeps "In loving memory" · generic "The day, kept" | same |
| **GuestSummaryCard** | RSVP donut (as-is) | donut | **attendance recap**: "74 celebrated with you" as the headline numeral; declined/pending demoted to a quiet footnote | same |
| **MemoryCard** | 3 tiles (as-is) | as-is | **promoted** — the row lead, 6 tiles + count, guest photos included (§4.2) | promoted |
| **WeekendCard** | siblings + weave-ins (as-is) | as-is | **future-dated siblings only**; weave-in suggestions filtered to `offsetDays >= 0` events still ahead, else the shelf hides; heading flips: future siblings → "More to look forward to," none → card gone | suggestions become anniversary / reunion only |
| **BudgetBreakdown** | as-is | — | — (already gated by `budgetVisible && !postEvent` :446 — keep) | — |
| **TheLongView** | static (as-is) | "The day" = now | **live states**: The day ✓ done · That week = now (while in it) · One year on upcoming | One year on = next; anniversary-forward |
| **RememberingCard** | — | — | promoted to the rail anchor (exists, correct — :1071) | folds into MemoryCard |
| **Blessing** | "You're doing something wonderful." | same | "You did something wonderful." | "It was wonderful." (solemn: "Held with love and care." stays — already past-agnostic) |

### 3.2 What "simplicity" means here

Post-event Home drops from **~12 cards to ~7**: afterglow hero →
remembering (todos) → memory + attendance → post-event checklist →
story card → long view → weekend (only if future siblings). The
planning machinery doesn't get a past-tense skin — it *leaves*.

---

## 4 · Beauty — the richness upgrades

### 4.1 The afterglow hero strip

The `HeroBanner`'s right photo slot stays, but below the
come-and-gone pill the left column gains one quiet strip of **real
numerals** (letterpress display figures, mono captions — the
BRAND §4 pairing): `74 CELEBRATED · 212 PHOTOS · 31 NOTES`. All three
numbers already exist: attending count (`/api/guests`), reel photo
count (the memory-book aggregator / `guest_photos`), guestbook +
tribute counts. Zero new tables. Numbers that are 0 don't render —
honesty over symmetry.

### 4.2 MemoryCard grows up in afterglow

Today: 3 manifest-gallery tiles (`cockpit.tsx:592`,
`memoryImages` caps at 3, `WelcomeHome.tsx:383-390`). Afterglow: 6
tiles from gallery + **approved guest photos** (the same source the
memory book reads), a "+N more" tile, and the card takes the lead
position in its row. The tilted-tile treatment stays — it's already
the most charming card on the page.

### 4.3 The StoryCard (RoadCard, past tense)

Not a new component — `RoadCard` with all-`done` milestones and a
rewritten `buildMilestones` branch that emits *what happened* with
real dates from data already on hand: manifest `created_at`
(pressed), `published_at` (published — the S8 column), final
attending count (said yes), the day. The gold rail becomes a
finished seam — every dot filled, the thread tied off (reuse the
ThreadSpine knot gesture at the rail's end).

### 4.4 TheLongView goes live

Add `done`/`now` per step (the RoadCard state grammar): post-event,
"The day" wears a check, "That week" is the ringed *now* while
within 7 days, then "One year on" becomes next. Same four steps,
no new copy — just states that move.

---

## 5 · Correctness guardrails (so this never regresses)

- `stageFromDaysUntil`, `phaseLabel`, `checklistItems`,
  `buildMilestones`, `weekendAdds`, `previewEyebrow`, `usePearTodos`
  all take (or derive from) the **phase**, never a raw/clamped day
  count of their own. Delete the local clamp at
  `WelcomeHome.tsx:143` once nothing planning-side needs it.
- A **render test** (vitest + testing-library, mirroring the proof
  tests' style): mount WelcomeHome's derived copy pipeline with
  rawDaysUntil = −11 and assert the forbidden strings are absent:
  `"Final stretch"`, `"days out"` (except "N days ago"),
  `"Save the date"` (eyebrow), `"Confirm vendor arrival"`,
  `"More to look forward to"` (when no future siblings),
  `"You're doing"`. The same grep-able list is the sprint's
  counts-as-done.
- The `/dev/dashboard` harness gains a phase switcher (planning /
  day / afterglow / kept sample props) so every future visual pass
  sees all four worlds — the missing harness state is *why* this
  shipped wrong.

---

## 6 · The prompt system — ready-to-paste sprint blocks

Shared validation loop: `npx tsc --noEmit` → eslint on touched →
`npx vitest run` → authed harness screenshots at 1280 + 390 with a
**past-dated site** (the e2e provider + mocked /api/sites, the
established rig) → commit → stamp this file → push both branches.

---

### AG.1 — The phase spine · status: not started · P0

```
## Active focus — AG.1 · The phase spine (no card decides its own tense)

**Goal:** One resolver decides the cockpit's phase; every wrong card
from docs/AFTERGLOW-PLAN.md §1 stops rendering planning content
post-event. Correctness only — the new afterglow content is AG.2.

**Direction:** Build src/lib/event-os/cockpit-phase.ts
(cockpitPhaseFor + phaseCopyFor, unit-tested boundary matrix: 31/30/
1/0/-1/-45/-46/null). Thread `phase` through WelcomeHome.tsx and
gate per §3.1's matrix: stage/phaseLabel only consulted pre-day;
ChecklistCard, RoadCard, ProgressCard, BudgetBreakdown hidden in
afterglow/kept; weekendAdds filtered to still-ahead offsets (shelf
hides when empty; heading flips); previewEyebrow via
postEventEyebrowFor(occasion); header + blessing past tense;
usePearTodos returns [] post-event (AG.2 fills it). Add the
forbidden-strings render test from §5 and the /dev/dashboard phase
switcher.

**Open threads:**
- [ ] cockpit-phase.ts + boundary unit tests
- [ ] WelcomeHome: gate every card per the §3.1 matrix (hide-only)
- [ ] postEventEyebrowFor + header/blessing tense
- [ ] weekendAdds offset filter + heading flip + empty-shelf hide
- [ ] Forbidden-strings test + dev-harness phase switcher

**Counts as done:** the render test passes; an authed screenshot of
Home with a -11-day site shows NO planning-tense copy anywhere; a
+90-day site renders exactly today's dashboard (zero pre-day
regressions — pin with a second screenshot).

**Skip:** All new afterglow content (AG.2/AG.3). DayOfV8, Director,
guest passport — already phase-correct.
```

---

### AG.2 — The afterglow home · status: not started · P0

```
## Active focus — AG.2 · The afterglow home (remembering has a face)

**Goal:** The post-event dashboard is a smaller, warmer set of cards
that help with what actually remains — per docs/AFTERGLOW-PLAN.md
§3.1's afterglow column. Requires AG.1's phase.

**Direction:** (1) usePearTodos afterglow branch with REAL numbers:
pending photo-moderation count (the Reel's queue), thank-yous x/y
from the thanked_at ledger (the registry claims feed's own stat),
"share the memory book" when guest content exists — each row deep-
links to its surface. (2) checklistItems afterglow list (thank-yous
· approve photos · print keepsake · settle vendor balances), solemn
variant gentle, vendor row only when the Vendor Book has unpaid
balances (vendor-book-summary already computes this). (3)
GuestSummaryCard `recap` mode — "N celebrated with you" headline
numeral, declined/pending as a quiet footnote, donut retired
post-event. (4) QuickActions afterglow set (Memory book /
Thank-yous / The Reel / Share). (5) RememberingCard leads the rail.

**Counts as done:** afterglow Home renders ≤7 cards; every number on
it is real (no invented counts — absent data renders the graceful
empty state); solemn occasion screenshot reads gently throughout;
vitest green.

**Skip:** Photo-richness (AG.3), TheLongView states (AG.4).
```

---

### AG.3 — The afterglow hero + memory promotion · status: not started · P1

```
## Active focus — AG.3 · Rich, real, photographic (the beauty pass)

**Goal:** The afterglow dashboard looks like the celebration it
remembers — §4.1–4.3 of docs/AFTERGLOW-PLAN.md.

**Direction:** (1) HeroBanner afterglow strip: letterpress numerals +
mono captions (CELEBRATED / PHOTOS / NOTES) from /api/guests counts +
the memory-book aggregator; zero-count figures don't render. (2)
MemoryCard afterglow: 6 tiles from gallery + APPROVED guest photos
(same source as the memory book), "+N more" tile, lead position;
keep the tilt. (3) buildMilestones afterglow branch → the StoryCard:
all-done rail with real stamps (pressed = created_at, published =
published_at, N said yes, the day) and a tied-off knot at the rail's
end. ProgressCard stays retired (a finished day isn't a percent).

**Counts as done:** afterglow screenshots (desktop + 390) show the
photo strip + promoted memory card + past-tense story rail with real
dates; a photo-less site degrades to warm gradients (no broken
slots); vitest green.

**Skip:** TheLongView (AG.4). Any new photo upload/moderation UI —
read-only consumption of existing sources.
```

---

### AG.4 — The long view goes live + weekend tense · status: not started · P2

```
## Active focus — AG.4 · Time moves through the long view

**Goal:** TheLongView's steps carry done/now/next states that track
real time, and the WeekendCard is fully tense-aware — §4.4 + the
weekend column of §3.1 in docs/AFTERGLOW-PLAN.md.

**Direction:** (1) TheLongView takes `phase` + rawDaysUntil: The day
✓ done post-event; That week ringed-now within 7 days after; One
year on becomes next thereafter (reuse RoadCard's state grammar —
filled dot / ringed now). kept-phase copy leans anniversary-forward.
(2) WeekendCard kept-phase suggestions swap to anniversary/reunion
(the AnniversaryCard's ~320-430d window stays the primary
anniversary door — don't double-prompt inside its window). (3) The
long view's solemn variant states move the same way with the
existing gentle copy.

**Counts as done:** three screenshots (pre / afterglow / kept) show
the states advancing; no double anniversary prompt inside the
AnniversaryCard window; vitest green.

**Skip:** Nothing else — this is the polish tail.
```

---

## 7 · Suggested execution order

AG.1 → AG.2 ship together if possible (the phase spine with nothing
filling the afterglow reads empty — acceptable for a day, better as
one arc). AG.3 next (the visible wow). AG.4 last. Each block is
independently committable.

## 8 · Open questions

- **Q1 — afterglow window length.** 45 days is a first guess
  (thank-you etiquette season). Tune with real data once S8's funnel
  shows return-visit decay. Tentative: 45, constant in
  cockpit-phase.ts, one place to change.
- **Q2 — ProgressCard's farewell.** Hide post-event (recommended,
  §3.1) vs. one final "All woven — 100%" state. Recommendation:
  hide; the StoryCard says it better with dates than a bar does with
  a percent.
- **Q3 — memorials.** The afterglow set must read as *the
  remembering*, not *the wrap-up* — solemn copy variants are named
  in AG.2/AG.4. The existing RememberingCard solemn branch is the
  register to match.
- **Q4 — per-photo focal point** (carried from GRAND-PLAN-2 §9):
  the afterglow's photo-forward cards raise the value of a tappable
  focal-point picker. Still deferred; COVER_FOCUS carries for now.

---

*The evidence screenshots live in the session uploads (IMG_9295–9299,
2026-07-08). The test is unchanged: read every card aloud, 11 days
after. It should sound like someone who was there.*
