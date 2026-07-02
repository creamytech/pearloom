# Dashboard layout plan — "the quiet dashboard" (2026-07-02)

> Field report: every dashboard page opens with an editorial display
> headline + prose paragraph + oversized stat cards before any real
> content. On a phone the host scrolls ~1.5 viewports of words to
> reach the thing they came for. The BRAND voice belongs to the
> woven *site*; the dashboard is a tool and should read like one.
> This plan covers every active route, desktop + mobile.

## 1 · The seven rules (apply to every page)

1. **Compact header.** Mono eyebrow (10px, tracked) + ONE display
   line, 22–24px on phones / 30–32px desktop (down from ~40/56).
   NO body paragraph under the title by default. Sub-copy moves to
   (a) the empty state, or (b) a small "?" HintChip. The header,
   sub-nav included, may not exceed ~120px on phones.
2. **Content above the fold.** The page's primary object (roster,
   feed, grid, canvas) must start within the first phone viewport
   (≤380px below the sub-nav) and within ~35% of desktop height.
   Stats/prose never push it down.
3. **StatStrip, not stat cards.** One horizontal row of compact
   chips (label · number inline, ~40px tall), `.pl-hscroll` on
   phones. Zero-value stats collapse into one muted trailing chip
   ("0 maybe · 0 stale · 0 declined"). The 2×3 grid of 180px KPI
   cards is retired everywhere.
4. **Hints are dismissible, once.** Any "how this works" paragraph
   (e.g. Two-Tap Thanks' purple instruction card) becomes a
   HintChip: a one-line hint with a ？ affordance expanding a
   popover; auto-collapsed after first visit (localStorage).
5. **One empty state, three parts.** Icon/EmptyState card, ONE
   sentence, one action. The page header does NOT restate emptiness
   ("Your Reel is empty." + "Nothing yet." card = pick the card).
6. **Actions in one row.** Page-level actions become icon-labeled
   chips in a single wrapping/scrolling row under the header —
   never a second stacked block; overflow goes into a ⋯ menu.
7. **Desktop = main column + quiet rail.** Content column
   (~680–760px) + right rail (~300px) for stats, Pear notes, tips.
   Editorial full-width stacking is reserved for the marketing site.

## 2 · Shared primitives to build (once, in `pearloom/dash/`)

- `PageIntro` — eyebrow + title + optional single-line meta +
  actions row. Replaces every per-page hero. Props map 1:1 onto
  what DashLayout already receives, so migration is mechanical.
- `StatStrip` — `[{label, value, tone?, href?}]`; collapses zeros;
  hscroll on phones; renders in PageIntro's meta slot or rail.
- `HintChip` — one-liner + expandable detail; localStorage key;
  replaces every mounted explainer paragraph.
- `RailCard` — desktop right-rail wrapper (stats, Pear's note,
  related links). On phones rail content renders BELOW the main
  object, never above.

## 3 · Per-route plan

Archetypes: **L** list/ledger · **G** grid · **C** canvas/preview ·
**K** composer/tool. Each route gets: header cut → what leads →
where stats/prose go.

| Route | Type | Desktop | Mobile |
|---|---|---|---|
| **/dashboard (Home)** | L | Greeting shrinks to one line + date. Site card + "next 3 things" lead; funnel/stat blocks → right rail. | Site card first; orientation/AskPear cards below actions; stats as StatStrip. |
| **/dashboard/rsvp (Guests)** | L | ROSTER leads at top of content column. "1 coming, 0 maybe…" headline → StatStrip (Invited·Yes·Pending promoted; zeros collapsed). Prose ("Every RSVP, meal note…") deleted; Pear-follow-up note → rail. By-event cards → compact chips row. | Search + Add guest + roster within first viewport. Action chips (Pear's review, Copy from…) → ⋯ menu. |
| **/dashboard/messages** | L | Thread list leads; composer sticky bottom of column. | Same; header one line. |
| **/dashboard/submissions** | L | Filter tabs + moderation feed lead; counts as StatStrip. | Same. |
| **/dashboard/registry** | L | Ledger feed leads; "Given directly"/"Still to thank" as StatStrip chips (tap scrolls); sidebar copy → rail. Items manager grid second. | StatStrip + feed; manager behind a tab already — keep. |
| **/dashboard/vendors** | L | Due-next strip stays (it's already quiet); roster leads; totals → StatStrip. | Same; category chips single row. |
| **/dashboard/day-of** | K | Now/next banner leads; jukebox + wall as columns. | Banner → timeline immediately; headers one line (done in prior pass, re-verify vs new rules). |
| **/dashboard/weekend** | K | Arc canvas leads; explainer → HintChip. | Anchor card first; satellites list. |
| **/dashboard/invite (Studio)** | C | Already canvas-first — only trim the landing headline to PageIntro. | Keep StudioMobileBar; trim intro copy. |
| **/dashboard/gallery (Reel)** | G | Grid leads; view toggle + filter chips in ONE row; "Your Reel is empty" headline + paragraph deleted (EmptyState card only). | Same; chips hscroll (exists). |
| **/dashboard/library** | G | Upload tiles + grid lead. | Same. |
| **/dashboard/keepsakes** | K | "Keepsakes, drafted by Pear" 2-line display + paragraph → PageIntro one line. Two-Tap Thanks: purple how-to card → HintChip; guest chips lead. | Same; "0 of 2 done" becomes StatStrip chip. |
| **/dashboard/memory-book** | C | Book preview leads; options → rail. | Preview first; options below. |
| **/dashboard/speech** | K | Editor leads; "Words from your guests" → rail. | Editor first; guest material behind a tab. |
| **/dashboard/seating** | K | Canvas leads (already); intro line trimmed. | Tap-to-seat hint → HintChip. |
| **/dashboard/qr-poster** | C | Poster preview leads; theme/copy controls → rail. | Preview first, controls below (scaling shipped earlier). |
| **/dashboard/passport-cards** | C | Sheet preview leads; print/share actions one row. | Same. |
| **/dashboard/analytics** | L | KPI tiles → StatStrip; funnel + depth lead. | StatStrip + charts; 1-col. |
| **/dashboard/event (sites index)** | G | Site cards lead immediately; "My sites" hero + paragraph → PageIntro. | Card first (screenshot shows hero + prose pushing it down). |
| **/dashboard/director** | K | Givens + timeline lead; vendor ledger panel stays rail. | Timeline hscroll (shipped); intro one line. |
| **/dashboard/connections** | K | Constellation leads; explainer → HintChip. | Same. |
| **/dashboard/voice** | K | Recorder rows lead; "N of 8" → StatStrip chip. | Same. |
| **/dashboard/cadence** | K | Timeline rail leads; explanation → HintChip. | Same. |
| **/dashboard/guest-review** | L | Insight cards lead; header one line. | Same. |
| **/dashboard/print** | L | Batches lead; composer second. | Same. |
| **/dashboard/profile / help / tools / bridge / music / payments** | — | Already quiet or tool-like: apply PageIntro + rule 1 only. | Same. |

**Copy discipline addendum (BRAND-compatible):** headers keep the
craft voice in ONE line ("The loom, at a glance" not two sentences).
Numbers speak via StatStrip. Prose survives only inside empty states
and HintChips. Control labels stay plain words (BRAND §7).

## 4 · Build order

- **Wave 1 — primitives + worst pages:** PageIntro/StatStrip/
  HintChip/RailCard; migrate Home, Guests, Gallery/Reel, Keepsakes,
  Event index (the five screenshotted offenders).
- **Wave 2 — ledgers:** Registry, Vendors, Submissions, Messages,
  Analytics, Guest-review, Print, Payments.
- **Wave 3 — composers/canvases:** Day-of, Weekend, Keepsakes book,
  Memory book, Speech, Seating, QR, Passport, Director, Connections,
  Voice, Cadence, Studio intro, remaining.
- Each wave: screenshot before/after at 390px + 1280px via the dev
  server where reachable; validation loop; commit; ff main.

*Definition of done per page:* primary object visible in first phone
viewport · header ≤120px on phones · zero permanently-mounted
explainer paragraphs · stats in one strip · one empty state.
