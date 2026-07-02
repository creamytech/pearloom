# Dashboard layout plan 2 — post-"quiet dashboard" screenshot audit (2026-07-02)

> Screenshot-driven audit of the RESULT of the quiet-dashboard
> migration (docs/DASHBOARD-LAYOUT-PLAN.md). All 31 `/dashboard`
> routes were rendered **authed** via the e2e credentials provider
> (`PEARLOOM_E2E=1` dev server + `POST /api/auth/callback/e2e`, the
> exact mechanism in `e2e/global-setup.ts`) with `/api/**` route
> interception returning plausible JSON (1 wedding site "Emma &
> James", 9 guests, 3 vendors, 6 reel photos, a 4-phase cadence).
> Viewports: **1440×900**, **390×844**, **1740×950**. Reference
> shots: `docs/audit-shots/*.png` (`{route}--{viewport}.png`).
>
> **What did NOT reproduce:** at 1740px every page correctly clamps
> (~1240) and centers — the reported "content hugs left on ≥1700px"
> was not observed on this branch. Re-verify ≥1920 before building
> §1-D; the clamp *inconsistency* (1080/1160/1180/1240 across pages)
> is real either way.
>
> **Mock artifacts to ignore if you re-run the harness:** blank
> cover on the "Nonna" site card (data-URI in CSS `url()` — real
> https covers render; see §3.8), and any `data:` images that paint
> white. The red "N Issues" pill bottom-left is the Next dev
> overlay, not product UI.

---

## 1 · Shell-level fixes (build once, fix everywhere)

### 1-A · Home two-column imbalance — redistribute, don't stretch  **[broken]**

`home--desktop.png`: the main column (NeedsYouNow + Lately) ends at
~y800 while the 320px rail (site preview → budget → guest pulse →
"The road to" → "Around your day") runs to ~y1760 — **~950px of
empty paper** left of the rail before the full-width TheLongView
begins at ~y1790. Worst offender in the product; same at 1740px.

Fix in `src/components/pearloom/pages/WelcomeHome.tsx` (grid at
~line 424, column assignment ~lines 434–492):

1. Move `<Milestones>` ("The road to …") and `<SiblingEventsCard>`
   ("Around your day") from the rail into the **main** column,
   after `<Lately>`.
2. Move `<TheLongView>` from below the grid into the main column
   as its last card (it's a 1-row horizontal timeline; give it
   `gridColumn: 1` width, not full-bleed).
3. Rail keeps: HomeSitePreview, ResumeDraft, Budget/Remembering,
   RsvpMomentum, GuestPulse. Approx heights after the swap:
   main ~1500px vs rail ~1250px — balanced.
4. Add `position: sticky; top: 16px` to the rail wrapper so short
   rails don't leave dead paper when the main column grows.

Acceptance: with the audit's mock data, bottom of main column and
bottom of rail within ~300px of each other at 1440.

### 1-B · Rail cards use window breakpoints inside a 320px column  **[broken — text collision]**

The two Home collisions the user screenshotted are both caused by
**window**-width checks (`useIsMobile(720)`) deciding a layout for
cards that live in the **320px rail** at desktop:

- `Milestones` (WelcomeHome.tsx ~line 1023–1040): at desktop
  `isNarrow=false` → 4-col grid `'76px 22px 1fr auto'` with the
  `m.sub` note in a trailing `auto` column. In 320px that leaves
  ~150px for label+note → "Final menu" / "caterer needs the
  headcount" collide (see `home--desktop.png` right rail).
- `SiblingEventsCard` rows (~line 1367–1380): label span is
  `whiteSpace: nowrap` and the blurb is a nowrap-ellipsis span in
  the same flex row → "Rehearsal dinner" overprints "right before —
  family and…". This one collides on phone too
  (`home--phone.png`).

Fix:
1. Give both cards a `narrow?: boolean` prop (or measure the
   container with a ResizeObserver / CSS container query — CSS
   `@container` is the durable fix since pearloom.css already has
   per-kit container patterns). When the card is mounted in the
   rail, always render the stacked (isNarrow) variant: label on
   line 1, note under it, 3-col grid.
2. `SiblingEventsCard` row: drop `whiteSpace: 'nowrap'` from the
   label; blurb gets `flex: 1; minWidth: 0`; keep ellipsis.
3. Sweep for other `useIsMobile(...)` consumers rendered inside
   the 320px rail (`RailCard` children) and pass the same flag.

### 1-C · Phone `.display` clamp inflates card headings  **[cramped]**

On phones, card-level headings ("Today's rundown", "Who's coming",
"Drafted from what they did.") render ~34–40px via the ≤640px
`h1/h2/h3.display` clamp (`clamp(32px, 9vw, 56px)`, pearloom.css)
— inside 358px-wide cards they wrap to 2–3 lines and eat half a
viewport before content (`day-of--phone.png`, keepsakes). The
clamp was scoped to headings in the 06-12 fix, but dashboard card
titles are also `h2/h3.display`.

Fix: scope the mobile clamp to the page-title context only
(`.pl8-dash-topbar .display`, marketing surfaces), or add a
`.display-card` class (fixed 20–22px at ≤640px) and apply it to
every dashboard card `SectionHeader`/panel title. One CSS change +
mechanical class sweep. Acceptance: no dashboard card heading
exceeds 24px at 390px.

### 1-D · One content clamp + one gutter token  **[cosmetic, cross-page]**

Measured left edge of the page eyebrow at 1440: tabbed pages
(guests/registry/day-of/event…) x=304; voice/cadence/print/
guest-review x≈333–352; Studio landing x=431. Content max-widths
in code: 1240 (DashShell topbar), 1180 (PLChrome default), 1080
(DashGallery empty state), 1160 (per-page pads). Vendors mixes
widths *within* one page: the "Due next" card spans ~1100px while
the vendor-card grid below stops at ~720px (`vendors--desktop.png`).

Fix: define `--pl-dash-maxw: 1240px` + `--pl-dash-pad` in
globals.css; DashLayout/PLChrome/standalone clients all consume
them. Vendors: give the roster grid the same width as the due-next
strip (3-up at ≥1200px instead of 2-up at 720px).

### 1-E · StatStrip / hscroll edge affordance  **[cosmetic → cramped]**

`.pl-hscroll` scrolls (no page-level H-overflow found anywhere —
good), but strips clip mid-chip at the viewport edge with no cue:
"1 MAYB…" on Guests, "0 VISITS · 0 TODAY · 0 MOBILE %" on
Analytics, the 470px all-zeros span on Registry
(`registry--phone.png`, `rsvp--phone.png`).

Fix in `QuietDash.tsx` StatStrip + `.pl-hscroll` CSS:
1. Right-edge fade mask (`mask-image: linear-gradient(to left,
   transparent 0, black 24px)`) applied only while
   `scrollWidth > clientWidth` (small hook or CSS scroll-driven
   fallback acceptable).
2. When **all** items are zero (Registry pre-launch), render one
   short chip ("Nothing yet") instead of the joined
   "0 LISTED · 0 CLAIMED · 0 OPEN · 0 STILL TO THANK · 0 GIVEN
   DIRECTLY" run-on — that string can never fit a phone.
3. `scroll-padding` / trailing spacer so the last chip can be
   scrolled fully into view.

### 1-F · CountdownHero right slot reads as a broken grey box  **[broken-looking]**

`home--desktop.png` / `home--phone.png`: the hero's right slot
(cockpit.tsx ~line 228–242, "warm wash + laid texture + pear
watermark") renders as a flat two-tone grey rectangle with a ghost
pear — on phone it's a full-width ~340px dead band between the
countdown and the stat chips. This is the user-reported "site-card
cover placeholder" issue.

Fix in `src/components/pearloom/dash/cockpit.tsx` CountdownHero:
1. When the site has a `coverPhoto`, render it (cover-fit, hairline
   frame) in the slot.
2. Otherwise reuse the SiteCrest recipe (occasion-tinted paper +
   display-italic initial + gold pearl) — already shipped and looks
   right in the sidebar — instead of the grey wash + watermark.
3. On <760px collapse the slot to a 96px strip under the CTA row
   (or drop it) so the hero fits the fold budget.

### 1-G · Content-above-the-fold regressions on phone  **[cramped]**

Rule 2 of plan 1 (primary object ≤380px below sub-nav) fails on:
- **Home**: NeedsYouNow starts ~y1050 (hero 500px + chips + quick
  jumps). 1-F plus demoting QuickJumps below NeedsYouNow gets the
  first decision card into viewport 1.
- **Guests**: roster starts ~y880 (title + actions + 6-chip strip +
  by-event chips + nudge banner). Fold fixes: nudge banner becomes
  one line (see §2 rsvp), by-event chips fold into the StatStrip.

---

## 2 · Per-page findings

Severity: **B** broken · **C** cramped · **c** cosmetic.
"—" = nothing beyond §1 items. Every fix references §1 where shared.

| Route | Desktop (1440) | Phone (390) | Fix |
|---|---|---|---|
| **/dashboard** (Home) | **B** rail imbalance ~950px void (§1-A); **B** "Final menu"/caterer-note collision in "The road to" (§1-B); **B** grey hero slot (§1-F); "Around your day" label/blurb overlap (§1-B); Lately = full-width card with 1 line (c) | **B** same overlaps (§1-B); grey band (§1-F); content below fold (§1-G); page is 3674px tall | §1-A/B/F/G; Lately: cap card height to content, merge into NeedsYouNow card as a "Lately" footer list when <3 items |
| /dashboard/event (My sites) | "Planning a whole weekend?" banner spans ~1100px while cards stop at 1025 — ragged right edge (c); draft card w/ failed cover = blank slot, no crest fallback (§3.8) | Cards ~500px tall each but scan fine (—) | Width: give banner the card-grid width; §3.8 fallback |
| /dashboard/rsvp (Guests) | Row action chips (Invite/+1/Resend/Remove) always visible → 3-line 150px rows (C); PARTY column duplicates guest name when party==name (c); WHO-CAN-REPLY rail copy "Invited onlyso strangers" missing space (c) | **B** nudge-banner text fragments into 5-word column beside inline CTA (`rsvp--phone.png`); strip clip (§1-E); roster below fold (§1-G); search placeholder truncated (c) | Actions: hover/focus-reveal on desktop, per-row ⋯ menu on phone (chips already collapse to sheet — extend); party column: blank when equal to name; nudge banner: text + CTA stack vertically <480px; fix "only " space in DashGuests rail copy |
| /dashboard/messages | Two-card layout occupies top 480px, ~400px dead paper below; thread card is paper while DM card is tinted — reads as different systems (c) (`messages--desktop.png`) | — | Make DM explainer a RailCard (consistent chrome); composer sticks to bottom of column per plan 1 |
| /dashboard/submissions | — (clean empty state) | — | — |
| /dashboard/registry | — | **B**-ish all-zeros strip is one 470px unwrappable span, clips with no cue (§1-E #2) | §1-E |
| /dashboard/vendors | Roster grid (720px) vs due-next strip (1100px) width mismatch (§1-D); "considering" section = one ⅓-width card + ⅔ empty (c) | Due-next hscroll has peek — good (—) | §1-D; considering cards join the same 3-up grid |
| /dashboard/day-of | Rundown time cell wraps "4:00 / PM" (C) | Same wrap worse; custom-message input squeezed ~150px beside Send (C); card headings oversized (§1-C) | Rundown grid: time column `minmax(72px, auto)` + `whiteSpace: nowrap`; broadcast composer stacks input above Send <480px |
| /dashboard/weekend | Subtitle + "?" HintChip + full explainer banner = triple explainer (c); disabled "Weave 4 linked sites" pill reads dead (c) | 3600px page; picker = 9 full-width cards before the basics (C) | Explainer: HintChip only (banner is the expanded state — collapse after first visit already; verify localStorage key fires); phone picker: 2-col compact cards |
| /dashboard/invite (Studio) | Own inset (x=431) vs shell gutter (§1-D) (c) | — | §1-D |
| /dashboard/gallery (Reel) | **B** page crashed to "Pear hit a snag" when a photo had an unknown `source`/missing `id` (harness data — but the guard is missing in prod too) | — | Harden DashGallery: unknown `source` → bucket 'guest', key falls back to url; never let one row kill the page |
| /dashboard/library | — | — | — |
| /dashboard/keepsakes | One-line hint + "?" + expanded purple explainer stack (c) | Guest-chip grid clips mid-row at maxHeight 220 with no scroll cue (TwoTapThanks.tsx:264) (C); heading inflation (§1-C) | Add bottom fade + "N more" count under the chip grid; §1-C |
| /dashboard/memory-book | — (renders well with data) | — | — |
| /dashboard/speech | Rail card 160px vs editor 600px — fine; — | — | — |
| /dashboard/seating | — | — | — |
| /dashboard/qr-poster | Controls rail ends at ~y620 beside a 1290px poster — 670px dead rail (c) | — | `position: sticky` on the controls rail (§1-A #4 pattern) |
| /dashboard/passport-cards | — | — | — |
| /dashboard/analytics | **B** literal `&rsquo;` rendered in Pear's-reading quote (§3.1); **B** "Dismiss" ghost button = blank white pill on the dark panel (§3.2) | Strip clip (§1-E) | §3.1/3.2 |
| /dashboard/director | "The givens." card renders header-only/empty when the director session has no facts (c — hollow card) | Loom timeline SVG (790px) clips mid-dot, hscroll affordance unclear (C); Pear chat card ~350px hollow between intro and chips (c); mood-card blobs crop oddly at corner (c) | Givens: hide card (or show "Tell Pear one thing" chip row) when zero givens; timeline: visible peek + fade (§1-E mask on its scroller); chat: collapse empty body to auto height |
| /dashboard/connections | "Your celebrations" card ~510px tall for 2 rows — ~200px hollow bottom (c) | — | Card height = content; the standalone/linked toggle chip shouldn't reserve list height |
| /dashboard/voice | Different gutter (§1-D) | — | §1-D |
| /dashboard/cadence | — (renders well) | — | — |
| /dashboard/guest-review | — | — | — |
| /dashboard/print | Different gutter/top offset vs siblings (§1-D) | — | §1-D |
| /dashboard/profile | — | — | — |
| /dashboard/help | — | — | — |
| /dashboard/tools | — | — | — |
| /dashboard/bridge | — | — | — |
| /dashboard/music | Three side-by-side columns each carrying its own empty-state sentence (3 empties on one screen — plan-1 rule 5) (c) | Columns stack → 3 stacked empty cards (c) | When all three lanes are empty, render ONE EmptyState in place of the triage board |
| /dashboard/payments | Un-migrated: three 120px KPI cards showing $0.00 (plan-1 rule 3) (c) | Same, stacked | Migrate to StatStrip + PageIntro like siblings |

---

## 3 · Point bugs (exact locations)

1. **`&rsquo;` rendered literally** —
   `src/components/marketing/design/dash/DashAnalytics.tsx:464`:
   the quote strings contain HTML entities inside a JS string
   (`'"Your site&rsquo;s quiet…"'`). Use `’`.
2. **Blank Dismiss pill** — same file ~line 471: `btnGhost` +
   `color: PD.paper` on the dark "Pear's reading" panel produces
   cream-on-cream. Needs a dark-panel ghost variant
   (transparent bg + cream border/text).
3. **"Invited onlyso strangers"** — DashGuests rail copy: missing
   space after the italic `Invited only` span.
4. **Milestones desktop collision** — WelcomeHome.tsx `Milestones`
   grid `'76px 22px 1fr auto'` (§1-B).
5. **SiblingEventsCard overlap** — WelcomeHome.tsx ~1377:
   nowrap label + ellipsis blurb (§1-B).
6. **Day-of rundown time wrap** — the rundown row's time cell is
   too narrow for "4:00 PM" at both widths.
7. **DashGallery crash on unexpected photo row** — filter/counts
   assume `source` ∈ union and `id` present; page dies to the
   error boundary instead of skipping the row.
8. **PhotoPlaceholder CSS url** — `motifs.tsx:922`
   `` background: `#e8e4d5 url(${src}) center/cover` `` — unquoted
   `url()` breaks on URLs with spaces/parens (and any `data:` URI).
   Quote it: `url("${src}")`. Also: when `src` fails to load there
   is no crest fallback — the card shows a flat blank (seen on the
   draft card); consider `onError`-style fallback to the tone
   gradient + Pear mark.
9. **TwoTapThanks chip grid** — `TwoTapThanks.tsx:262–265` scrolls
   at maxHeight 220 with zero affordance; add fade + count.

---

## 4 · Build order — two waves

### Wave 1 — the shell + Home (one session)
1. §1-A Home column redistribution + sticky rail.
2. §1-B container-narrow variants for Milestones +
   SiblingEventsCard (kills both text collisions everywhere).
3. §1-F CountdownHero cover slot (photo → crest fallback).
4. §1-C card-heading clamp scope (CSS + class sweep).
5. §1-E StatStrip: fade mask + all-zeros single chip + scroll pad.
6. Point bugs §3.1–3.6 (each is a one-liner-to-small edit).
7. Re-run the audit harness on Home/Guests/Analytics/Registry at
   both viewports; compare against `docs/audit-shots/`.

### Wave 2 — per-page sweep (one session)
1. §1-D width/gutter tokens; Vendors + Print + Voice + Cadence +
   Studio adopt them; Vendors roster grid to strip width.
2. Guests: action-chip reveal + party-column dedupe + phone nudge
   banner stack (§2 rsvp row).
3. Day-of rundown + broadcast composer fixes.
4. Payments → StatStrip migration; Music single-empty; Connections
   + Director hollow-card collapses; Messages DM RailCard.
5. Keepsakes/TwoTapThanks + Weekend phone picker + QR sticky rail.
6. Hardening: §3.7 gallery guard, §3.8 url() quoting.
7. Full 31-route × 2-viewport re-run; spot-check the table above;
   update this doc's severities to ✓.

*Definition of done:* no text collisions at any audited viewport ·
main column and rail bottoms within ~300px on every two-column page
· primary object inside viewport 1 on phone for Home + Guests · one
clamp/gutter pair everywhere · zero literal HTML entities · no
full-page crash from a malformed data row.

---

## 5 · Re-running this audit

Harness (not committed): sign in exactly as `e2e/global-setup.ts`
does against `PEARLOOM_E2E=1 next dev -p 3001`, intercept `/api/**`
per the mock table above, screenshot `fullPage` per route/viewport.
All 31 routes rendered authed; none required code changes. Routes
needing data mocks beyond `/api/sites` + `/api/guests`:
gallery (`/api/dashboard/reel` — rows must carry `id` + a valid
`source`), cadence (`{ eventDate, phases[] }` with full
`MergedPhase` shape incl. `product`), memory-book, passport-cards,
director, vendors (`/api/vendors/book`), sites-stats.
