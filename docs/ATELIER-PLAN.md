# ATELIER-PLAN.md — what we press, what we send, what we never fulfill

> Four owner questions, answered with a code audit (2026-07-08, four
> parallel deep audits — print surfaces, Studio theming, the full
> dashboard route inventory, and the guest-invitation trace):
>
> 1. **Do we need the print shop?** No — and it's bigger than a
>    button: a live Lob.com + Stripe print-and-mail pipeline ships
>    today. §1 retires it deliberately.
> 2. **Studio revamp matching the site's themes/graphics?** Yes —
>    today the Studio is a parallel design system that cannot
>    reproduce the site it's supposedly stationery for. §2.
> 3. **What else across the dashboard routes?** 32 routes, 4 clear
>    merges, and a phase-awareness pass now that cockpit-phase.ts
>    exists. §4.
> 4. **Invite emails + links that amaze?** The single most divergent
>    surface in the product: the batch invite is an unthemed
>    near-black email → an unthemed cream page that never shows the
>    couple's design, with no OG preview. §3 makes the invitation
>    ONE woven object: email → envelope → site.
>
> Sprint blocks at §6. Same prompt system as AFTERGLOW-PLAN.

---

## 0 · How to use this file

- Copy a block from §6 (from its `## Active focus` line to the
  closing rule) into `CLAUDE.md` line 6 to arm the autoloop, or hand
  it to a session verbatim. Stamp statuses here as sprints land.
- File:line citations are as of 2026-07-08 — re-grep before trusting
  a paragraph if the file has churned.
- Recommended order: **PR.1 → INV.1 → INV.2 → ST.1 → ST.2 → DR.1 →
  DR.2 → INV.3 → ST.3 → DR.3.** Print retirement first (it's the
  owner's direct call and unblocks copy everywhere); the invitation
  next (guest-facing, acquisition-weighted); Studio then rides on
  the invitation's theme plumbing; route consolidation last.

---

## 1 · The print question — retire Pearloom Print

### What the audit found (it's live, not latent)

A complete paid physical-fulfillment service exists:

- **The engine:** `src/lib/print-engine/` — `lob-client.ts` (real
  Lob.com REST: postcards ~$0.74, letters $1.20+, address
  verification), `fulfill.ts:95` (`fulfillPrintIntent` inserts
  `print_jobs` rows and submits each recipient to Lob after payment
  settles), `pricing.ts:34-41` (retail $1.79–$3.29/card + a
  **$50 lifetime print credit**), `render.ts` (SVG → 300dpi PNG → R2).
- **The money:** `/api/print/checkout` → Stripe Checkout ("{Kind} —
  {N} cards mailed"); `stripe/webhook:443` → `handlePrintOrderPaid`
  → Lob. `/api/print/orders` GET lists jobs with `tracking_number`,
  `mailed_at`, `delivered_at`.
- **The surfaces:** `StudioMailFlow.tsx` ("Printed, stamped, and
  mailed for you", return-address collection, "Continue to payment");
  `StudioSendOverlay.tsx:305-311` (Print channel, badge "Mail it for
  you"); `StudioPrintPreview.tsx:156`; **`/dashboard/print`**
  (`PrintOrdersClient.tsx` — "Pearloom Print", "Mail a new batch",
  USPS tracking links); sidebar nav item **"Print shop"**
  (`DashShell.tsx:89`); ⌘K "Print orders" (`DashCommandPalette.tsx:70`).
- **The funnels into it:** KeepsakesPage:264,305 "Order in print";
  MemoryBookPage:345 "Order printed book" (which lands on a postcard
  composer — there is no book product); PassportCardsPage:399
  "Print & mail via shop"; DashGallery:649 "Turn the Reel into a
  printed book"; **the public pricing page** `DesignPricing.tsx:78`
  "**$50 Pearloom Print credit**".

Meanwhile the print-at-home layer is healthy and physical-free:
`window.print()` PDF paths on QR poster, passport cards, memory
book, export-pdf, Studio "Print / PDF", DayOf "Print for the day".

### The decision

**Retire the fulfillment service entirely.** Owner's call: no
physical anything. Even though Lob does the printing, Pearloom owns
the charge, the address data, the lost-mail support, and the
refunds — that's a physical-goods business. The replacement story
is *stronger* on-brand anyway:

> **"Pearloom presses the artwork; your printer presses the paper."**
> Every card exports as a **press-ready PDF** (trim + bleed, 300dpi,
> front/back/envelope) the host can print at home or hand to any
> local print shop or online printer — plus the existing themed
> email send, which is free and instant.

What retirement means concretely (sprint PR.1):
- Delete the user-facing surfaces: `/dashboard/print` +
  `PrintOrdersClient`, `StudioMailFlow`, the Send overlay's Print
  channel and mail-mode copy, the "Print shop" nav item, the ⌘K
  entry, and every "Order in print / mail via shop / printed book"
  funnel button (retarget those to the PDF path).
- Delete the engine + routes: `src/lib/print-engine/`,
  `/api/print/checkout`, `/api/print/orders`, the
  `handlePrintOrderPaid` webhook branch. (Git history keeps it if
  the decision ever reverses; record in CLAUDE-DESIGN §15.)
- Fix the public promise: `DesignPricing.tsx:78` — replace
  "$50 Pearloom Print credit" with a non-physical perk
  ("Press-ready PDFs for every card" / theme-pack credit).
- Copy audit: "Order in print" → "Press-ready PDF"; "Print the
  keepsake" stays (it's print-at-home); afterglow checklist strings
  already say "Print the keepsake book" — fine as-is.
- **Build the thing the copy now promises:** a real press-ready PDF
  export (PR.1 ships the reframe with `window.print()` + print CSS;
  ST.3 upgrades to a true PDF with trim marks via the existing
  `studio-card-svg` serializer).
- DB: `print_jobs` / intents tables stay (historical orders), the
  UI just stops minting new ones. If any real orders exist in prod,
  keep GET tracking alive behind a direct URL until the last one
  delivers, then remove.

---

## 2 · Studio v2 — stationery pressed from the site

### The gap (why a revamp, not a polish)

The Studio is a **parallel design system** that cannot reproduce the
site it's stationery for:

1. **Colors:** 6 private palettes matched by *nearest hue* to the
   legacy `manifest.theme.colors.accent` scalar
   (`studio-defaults-from-look.ts:143-176,195`) — never the actual
   `--t-*` bag / `themeId` / `themeVars` the renderer uses
   (`ThemedSite.tsx:425-434`). A Theme-Store-pack site gives the
   Studio *nothing* to match.
2. **Fonts:** 4 pairs built from only Fraunces/Inter/Caveat
   (`studio-constants.ts:126-131`); themes set in Cormorant Garamond
   or Geist Mono can never be reproduced — and monogram/sign-off
   elements hard-code Fraunces/Caveat regardless
   (`StudioCard.tsx:120,168,185-193`).
3. **Textures:** the site's texture is **not inherited** on first
   open; the Studio list is 6 of the site's 14; `<TextureFilters/>`
   isn't mounted so displacement materials can't render; the print
   SVG ignores texture entirely (`studio-card-svg.ts:314-319`).
4. **Motifs/kits/patterns:** site `motifLayout` placement, kit
   identity, `pattern` layers — all absent; one coarse corner glyph.
5. **The envelope:** hardcoded wax color `#C97A6E`, fixed flap,
   Pearloom "FOREVER" postage — unrelated to the site's Sealed
   Arrival envelope the guest actually sees on click-through.
6. **QR:** real `BrandedQR` renders on the save-the-date back ONLY;
   the invite back *references* "the QR on your envelope" but never
   draws one (`StudioCard.tsx:149`); thank-you back is decorative.
7. **Bugs:** autosave dep array omits `state.texture` and
   `state.customColors` (`useStudioState.ts:310-315`) — changing
   only those never saves.

### The direction — one design system, two surfaces

**A Studio card is the site, folded to 5×7.** Same theme bag, same
type, same grain, same motifs:

- **ST.1 — the theme spine.** Cards render inside `.pl8-guest` with
  the site's resolved `--t-*` bag (`themeRootStyle` — the exact
  chain ThemedSite uses), always (not only when a texture is set).
  Layouts consume `var(--t-paper/ink/accent/gold/display/body)`
  instead of palette hexes. Seeding reads `themeId`/`themeVars`
  first (legacy `theme.colors` as fallback), inherits
  `manifest.texture` + intensity, and mounts `<TextureFilters/>`.
  The 6 preset palettes survive as *deliberate departures* ("wear
  the site's look" is the default chip; presets are alternates).
  Fix the autosave dep bug. Custom colors become overrides ON TOP
  of the theme bag.
- **ST.2 — composition + the envelope.** Card layouts pick up the
  site's motif language (`MotifLayer` placement modes scaled to
  card size), kit-informed frames (arch / deco / hairline from
  `kitId`), theme-derived wax seal + postage (accent + gold, the
  couple's monogram — the same medallion `ArrivalReveal` renders),
  and a real `BrandedQR` available on every card type's back +
  envelope. The Studio envelope and the site's Sealed Arrival
  envelope become the SAME designed object — what you send is what
  they open.
- **ST.3 — the press-ready export.** `studio-card-svg` grows: theme
  fonts embedded, texture baked, back + envelope serialized, trim +
  bleed marks, true PDF download ("Press-ready PDF — take it to any
  printer"). This is the print shop's replacement deliverable.

---

## 3 · The invitation — one woven object from inbox to site

### The gap (two products pretending to be one)

- **The Studio batch invite** (`/api/invite/guest`): a hand-rolled
  **near-black `#0E0B12` email** — hardcoded literals, Georgia, no
  site palette, **no photo, no date, no venue**, generic sender
  `Pearloom <invites@…>` — linking to **`/i/<token>`**
  (`InviteReveal.tsx`): a **hardcoded cream `#FDFAF0` page** with
  its own crimson-wax envelope animation, identical for every couple
  regardless of theme, on a separate `invite_tokens` table. A guest
  invited from the Studio **never sees the site's themed Sealed
  Arrival**.
- **The add-a-guest / nudge / cadence / RSVP pipelines** already use
  the shared themed `emailLayout` + `?g=`/`/g/` links — the
  save-the-date email even embeds a photo + monogram and lands on a
  themed reveal. The good pattern exists; the flagship flow ignores
  it.
- **No OG image on `/i/<token>` or `/g/<token>`** — the two most
  personal links a guest receives preview as bare text in
  iMessage/WhatsApp while the site link gets the full editorial
  card.
- `ArrivalReveal`'s own spec promises a **postmark stamped with the
  event date** (line 17) that was never rendered. Solemn QuietArrival
  never personalizes from `?g=`.
- Housekeeping: the shared email footer ships a literal
  `[MAILING ADDRESS]` CAN-SPAM placeholder
  (`email-sequences.ts:211`); sender names are inconsistent across
  pipelines (`Pearloom` vs couple vs `noreply`).

### The direction — the sealed envelope arrives by email

The invitation is ONE object in three states: **the email is the
envelope · the click breaks the seal · the site is the letter.**

- **INV.1 — one themed email system.** The batch invite joins the
  shared `emailLayout` with `emailThemeFromSuite` (the couple's
  paper/ink/accent/gold + display font), gains the cover photo,
  date + venue block, and the couple's monogram; sender becomes
  `{Couple names} <invites@pearloom.com>` everywhere; per-cardType
  subjects stay. Kill the second "default cream" divergence
  (`DEFAULT_THEME` vs `BRAND_EMAIL_THEME` — one token set). Fill the
  CAN-SPAM placeholder from config. Exclusivity register in the
  copy: "Pressed for {first name}" / "One of {N} invitations."
- **INV.2 — the click-through + the preview.** Retire the parallel
  `/i/<token>` world: the invite link becomes the published site
  with the guest's `?g=` token (one token space; `/i/` 301s for old
  emails) so every guest lands in the site-themed **Sealed Arrival**
  — envelope in the couple's paper, "Sealed for {name}", monogram
  wax. Add the promised **postmark with the event date** to the
  envelope face; give solemn QuietArrival its `?g=` personalization
  ("In memory, for {name}" register). Ship OG cards for the guest
  links (`/g/`, and `/i/` while it lives): the themed editorial
  card + "An invitation for you" variant — the iMessage preview IS
  the first impression.
- **INV.3 — the amazement layer.** A per-guest **invitation-card
  image** rendered at the edge (`/api/invite-card` via the existing
  ImageResponse pipeline — it already loads Fraunces + theme params)
  embedded as the email hero: the guest's name pressed onto the
  couple's actual card artwork. Plus an `.ics` calendar attachment
  on invitations, and the RSVP deep-link (`?g=` + `#rsvp`) under one
  gold CTA. Email clients can't load Fraunces — the rendered image
  carries the letterpress; live text stays serif-stack fallback.

---

## 4 · The dashboard routes — consolidation + phase-awareness

32 routes under `/dashboard`. The shell, Home (post-AFTERGLOW),
Guests, Studio, Day-of, Registry, Vendors, Budget, Weekend, Circle,
Music, Speeches, Seating, Messages, Submissions, Cadence are in
good shape. The work is **merges, retirements, and teaching the
routes the phase**:

| Finding | Evidence | Move |
|---|---|---|
| **Two memory-book pages.** `/dashboard/keepsakes` (KeepsakesPage, "Keepsakes · Book" tabs) and `/dashboard/memory-book` (MemoryBookPage) both render the memory book from the same `/api/memory-book`. | both mount PLChrome; sidebar links only `keepsakes` | Merge into ONE Memory surface at `/dashboard/keepsakes` (print view folds in as the "Book" tab); `/dashboard/memory-book` redirects. Migrate off PLChrome onto DashLayout. |
| **Two photo pages.** `/dashboard/gallery` (The Reel — guest photos + moderation) vs `/dashboard/library` ("Every photo you've uploaded") | old audit item #7, still open | Merge: the Reel gains a "Your uploads" source tab; `/library` redirects. One photo home. |
| **`/dashboard/payments`** — "Stripe payments received"; launch-mode has no Stripe, page is an empty ledger duplicating the Registry claims feed | launch-mode principle ("Pearloom never touches the money") | Fold into `/dashboard/registry` as a ledger filter; route redirects. |
| **`/dashboard/print`** | §1 | Retired in PR.1 (nav + route + ⌘K). |
| **`/dashboard/connections`** ("Linked events") vs Weekend/celebrations | weekend is a first-class tab; connections is the old manifest-string linker | Fold linking UI into Weekend; redirect. |
| **`/dashboard/director` + `/dashboard/analytics`** — both de-promoted; Director's brief overlaps the phase-aware Home; Analytics is quiet numbers | DEPROMOTED_DESTINATIONS | Keep Analytics (quiet, honest). Make Director the *phase-aware* weekly brief or fold its unique panels (vendor ledger, timeline read) into Home/Day-of; decide in DR.3, don't pre-commit. |
| **`/dashboard/bridge`** (memory prompts / whispers / SMS drafts) + **`/dashboard/guest-review`** + **`/dashboard/voice`** | niche, ⌘K-reachable | Keep routes; surface them contextually (bridge from Guests sub-nav; voice from Studio/editor tone controls) rather than more nav. |
| **`/dashboard/tools`** | aggregator over the ⌘K list | Keep — it's the "junk drawer with a label"; audit list after retirements. |
| **Phase-blindness beyond Home.** Studio still defaults to save-the-dates 11 days after the wedding; Cadence offers send ladders post-event; Day-of is planning-shaped after the day; RSVP page pressures "pending" forever. | cockpit-phase.ts exists now | DR.2: routes read `cockpitPhaseFor` — Studio's default tab flips to **thank-yous** post-event (with the thank-you ledger's still-to-thank count), Cadence stands down into "what was sent" history, Day-of becomes the recap door, RSVP leads with attendance. |

---

## 5 · Guardrails

- **No physical promises:** a grep-able forbidden list after PR.1 —
  `"mailed for you"`, `"Mail it for you"`, `"print credit"`,
  `"stamped"` (as fulfillment), `"Order in print"` — enforced by a
  unit test over the Studio/keepsake/pricing copy modules, same
  pattern as the afterglow forbidden-strings fence.
- **One theme source:** Studio + emails + OG + Sealed Arrival all
  resolve theme via the SAME helpers (`themeRootStyle` /
  `emailThemeFromSuite` / suite params). Any new stationery surface
  that hardcodes a palette is drift.
- Screenshots per sprint in `docs/audit-shots/atelier/`; email HTML
  verified via a rendered-fixture snapshot (no live sends needed).

---

## 6 · The prompt system — ready-to-paste sprint blocks

Shared validation loop: `npx tsc --noEmit` → eslint on touched →
`npx vitest run` → authed harness screenshots at 1280 + 390 →
commit → stamp this file → push both branches.

---

### PR.1 — Retire Pearloom Print · status: not started · P0

```
## Active focus — PR.1 · No physical anything (retire Pearloom Print)

**Goal:** Pearloom never prints, stamps, mails, or charges for
physical goods — per docs/ATELIER-PLAN.md §1. The press-ready-PDF
story replaces it everywhere.

**Direction:** Delete the user-facing mail surfaces (StudioMailFlow,
Send overlay Print channel, /dashboard/print + PrintOrdersClient,
"Print shop" nav item, ⌘K "Print orders") and the engine
(src/lib/print-engine/, /api/print/*, the stripe webhook print
branch). Retarget every funnel button (KeepsakesPage "Order in
print" ×2, MemoryBookPage "Order printed book", PassportCardsPage
"Print & mail via shop", DashGallery "printed book") to the
print-at-home/PDF path with honest labels. Replace the public
pricing "$50 Pearloom Print credit" (DesignPricing.tsx:78) with a
non-physical perk. Add the no-physical-promises forbidden-strings
test (§5). Record the deletion in CLAUDE-DESIGN §15.

**Counts as done:** repo-wide grep for "mailed for you|Mail it for
you|print credit|Order in print" returns only git history; the
forbidden test passes; Studio Send overlay shows Email + PDF only;
tsc/eslint/vitest green; screenshots of Studio send + keepsakes.

**Skip:** The true trim-marks PDF (ST.3 — window.print() carries
PR.1). Historical print_jobs data (leave tables).
```

---

### INV.1 — One themed email system · status: not started · P0

```
## Active focus — INV.1 · The email wears the couple's theme

**Goal:** Every guest email — above all the Studio batch invite —
wears the site's palette, type, photo, and facts, from one shared
system. docs/ATELIER-PLAN.md §3.

**Direction:** Rebuild /api/invite/guest's HTML on the shared
emailLayout + emailThemeFromSuite (kill the hardcoded #0E0B12
template): cover photo, date + venue block, couple monogram
masthead, per-cardType subjects kept, solemn register kept. Sender
becomes "{Couple names} <invites@pearloom.com>" across invite/
nudge/cadence/rsvp paths. Unify DEFAULT_THEME vs BRAND_EMAIL_THEME
into one token set; fill the [MAILING ADDRESS] CAN-SPAM placeholder
from config. Exclusivity copy: "Pressed for {first name}". Snapshot
tests over the rendered HTML (theme colors present, no hardcoded
hexes) per cardType + solemn.

**Counts as done:** rendered-fixture snapshots show the site theme
in the batch invite for two different themed sites; all senders
named consistently; vitest green.

**Skip:** Link-target changes (INV.2), the card-image hero (INV.3).
```

---

### INV.2 — The click-through + the preview · status: not started · P0

```
## Active focus — INV.2 · Break the seal (one arrival, one link, a real preview)

**Goal:** Every invite link lands on the site's themed Sealed
Arrival, addressed to the guest — and previews beautifully in
iMessage. docs/ATELIER-PLAN.md §3.

**Direction:** Point the batch invite at the published site with the
guest's ?g= token (unify with pearloom_guests tokens; keep /i/
as a 301 for already-sent emails). Add the event-date POSTMARK to
ArrivalReveal's envelope face (its own spec promises it); give the
solemn QuietArrival its ?g= personalization in the memorial
register. Ship OG images for /g/[token] (and /i/ while it lives):
themed editorial card, "An invitation" variant, no guest PII in
the shared image. Verify the full flow in the authed harness:
email link → envelope addressed "Sealed for {name}" → postmark →
site.

**Counts as done:** clicking a batch-invite link opens the themed
Sealed Arrival with the guest's name + postmark (screenshot);
/g/ links render an OG card (fixture test); /i/ redirects; no
guest sees the hardcoded cream InviteReveal anymore.

**Skip:** The per-guest card image (INV.3). Deleting the
invite_tokens table (redirect needs it).
```

---

### ST.1 — Studio theme spine · status: not started · P1

```
## Active focus — ST.1 · The card wears the site's theme bag

**Goal:** A Studio card renders from the site's actual --t-* theme
bag — colors, fonts, texture — seeded from themeId/themeVars, not
a hue-match. docs/ATELIER-PLAN.md §2.

**Direction:** StudioCard renders inside .pl8-guest with
themeRootStyle(getTheme(themeId), density, themeVars) ALWAYS;
layouts consume var(--t-paper/ink/accent/gold/display/body)
(replace palette.* hexes); mount <TextureFilters/>; inherit
manifest.texture + intensity on first open; wax seal + accents from
--t-accent/--t-gold (kill #C97A6E). "Wear the site's look" is the
default Design chip; the 6 presets stay as deliberate departures;
customColors override on top. Remove hardcoded Fraunces/Caveat
where the theme provides faces. Fix the autosave dep bug
(useStudioState.ts:310-315 — texture + customColors). Seed reads
themeId/themeVars with legacy theme.colors fallback.

**Counts as done:** a santorini (Cormorant) site and a midnight
(dark/foil) site each open the Studio showing a card unmistakably
in THEIR theme (screenshots); texture/customColor edits autosave
(test); vitest green.

**Skip:** Motif placement/kit frames/envelope (ST.2), PDF (ST.3).
```

---

### ST.2 — Composition + the shared envelope · status: not started · P1

```
## Active focus — ST.2 · The envelope you send is the envelope they open

**Goal:** Cards carry the site's motif language and kit identity;
the Studio envelope and the site's Sealed Arrival become the same
designed object; every card back earns a real QR.
docs/ATELIER-PLAN.md §2.

**Direction:** Scale MotifLayer's placement modes (corners/margins/
crest) onto the 420×588 card; kit-informed card frames (arch, deco
hairlines, classic rules) from kitId; envelope re-derived from the
ArrivalReveal design — same monogram medallion, theme wax, paper,
and the event-date postmark (shipped in INV.2); BrandedQR available
on every type's back + envelope flap (replace the decorative
QRGlyph + the invite back's phantom "QR on your envelope" line).

**Counts as done:** side-by-side screenshot — Studio envelope vs
the site's Sealed Arrival envelope — reads as one object for two
different themes; all three card types can carry a scannable QR;
vitest green.

**Skip:** PDF export (ST.3).
```

---

### ST.3 — Press-ready PDF export · status: not started · P2

```
## Active focus — ST.3 · The press-ready PDF (the print shop's replacement)

**Goal:** Every Studio piece exports a true press-ready PDF — trim +
bleed, 300dpi, theme fonts embedded, front/back/envelope — the host
can hand to any printer. docs/ATELIER-PLAN.md §1-2.

**Direction:** Extend studio-card-svg to serialize back + envelope,
embed the theme faces, bake the chosen texture (it currently bakes
one generic noise — :314-319), add trim/bleed marks, and compose to
PDF client-side (or a print-CSS sheet at exact physical size as the
fallback). Wire "Press-ready PDF" as the second Send channel next
to Email. Update keepsake/passport funnels' labels to match.

**Counts as done:** downloaded PDF opens at exact 5×7+bleed with
crop marks and the site's fonts/texture; the Send overlay offers
Email / Press-ready PDF; vitest green.

**Skip:** Anything resembling fulfillment.
```

---

### DR.1 — Route merges · status: not started · P1

```
## Active focus — DR.1 · One home per job (keepsakes, photos, money)

**Goal:** Four route consolidations so no job has two half-homes.
docs/ATELIER-PLAN.md §4.

**Direction:** (1) Merge MemoryBookPage into KeepsakesPage's Book
tab; /dashboard/memory-book redirects; migrate the merged page off
PLChrome onto DashLayout. (2) Merge LibraryPage into DashGallery as
a "Your uploads" source tab; /dashboard/library redirects. (3) Fold
the payments ledger into /dashboard/registry as a filter;
/dashboard/payments redirects. (4) Fold connections' linked-events
UI into the Weekend page; /dashboard/connections redirects. Update
sidebar/sub-nav/⌘K lists + every internal Link to the old routes.

**Counts as done:** all four old routes 308-redirect; no nav item
or ⌘K entry points at them; the merged surfaces carry every
capability the old pages had (checklist in commit message); vitest
green + screenshots.

**Skip:** Director/analytics decisions (DR.3).
```

---

### DR.2 — The routes learn the phase · status: not started · P1

```
## Active focus — DR.2 · Every route knows the day has passed

**Goal:** Studio, Cadence, Day-of, and Guests read cockpit-phase —
no route pressures a host about a day that already happened.
docs/ATELIER-PLAN.md §4.

**Direction:** (1) Studio: post-event default tab = thank-yous, with
the still-to-thank count from the gift ledger; save-the-date tab
demoted with an honest note. (2) Cadence: afterglow shows the sent
history ("what went out, when, to how many") and stands down the
send ladder; kept = read-only. (3) Day-of: post-event header flips
to the recap door (memory book, reel, toasts) — the run-of-show
archives. (4) /dashboard/rsvp: post-event leads with who celebrated
(recap framing shipped on Home) and retires nudge CTAs. Extend the
forbidden-strings test with per-route afterglow assertions.

**Counts as done:** the four routes screenshot correctly against a
-11-day site (the AFTERGLOW harness rig); forbidden-strings test
extended + green; +90-day screenshots pin zero pre-day regressions.

**Skip:** Home (done), Director (DR.3).
```

---

### INV.3 — The amazement layer · status: not started · P2

```
## Active focus — INV.3 · Pressed for you (the card in the email)

**Goal:** The invite email opens with the guest's OWN card — their
name pressed onto the couple's artwork — plus calendar + one gold
path to RSVP. docs/ATELIER-PLAN.md §3.

**Direction:** /api/invite-card: an edge ImageResponse rendering the
invitation card image per guest (theme params + Fraunces via the
existing OG font loader; token-authed, no-store, no PII in URL —
pass the invite token, resolve server-side). Embed as the email
hero above the themed body (INV.1's layout). Attach an .ics to
invitation sends (date/venue/site URL). CTA deep-links ?g= +
#rsvp. Numbered-edition line where honest ("One of 96, pressed for
Amara"). Rate-limit + cache the renderer.

**Counts as done:** fixture email renders with the per-guest card
image for two themes; .ics validates; the CTA lands on the RSVP
modal with the guest resolved; vitest green.

**Skip:** Per-guest video/animation. Any physical anything.
```

---

### DR.3 — Nav curation + the Director question · status: not started · P2

```
## Active focus — DR.3 · The quiet shelf (director, analytics, bridge, voice)

**Goal:** The de-promoted shelf earns its place or folds in —
finish the route audit. docs/ATELIER-PLAN.md §4.

**Direction:** (1) Director: make it the phase-aware weekly brief
(it already reads the vendor book + timeline) or fold its unique
panels into Home/Day-of and retire the route — decide from usage
+ overlap after DR.1/DR.2 land, document the decision here. (2)
Bridge + voice + guest-review: contextual doors (Guests sub-nav,
Studio tone control, NeedsYouNow) instead of nav items; routes
stay. (3) Re-audit ⌘K + /dashboard/tools lists post-retirements.
(4) Sidebar "Keepsake" section label sweep after PR.1/DR.1.

**Counts as done:** nav + ⌘K contain no dead or duplicate
destinations; the Director decision is recorded in this doc with
its rationale; screenshots of the final sidebar.

**Skip:** New features — this is curation.
```

---

## 7 · Open questions

- **Q1 — print history.** If prod `print_jobs` has real undelivered
  orders at PR.1 time, keep the tracking GET alive at a direct URL
  until the last delivery, then remove. Check before deleting.
- **Q2 — /i/ token table.** After INV.2's redirect window (90 days
  of sent emails?), drop the `invite_tokens` table or keep as a
  permanent alias. Tentative: keep the 301 forever, it's ~free.
- **Q3 — Director's fate** — deliberately deferred to DR.3 with
  data.
- **Q4 — email deliverability.** Sender display-name changes (couple
  names) keep the same from-domain; SPF/DKIM/DMARC DNS remains the
  standing owner action (GRAND-PLAN follow-up).

---

*The test for every sprint here: a guest opens the email in iMessage
and gasps a little; a host prints the card at their local shop and
it matches their site exactly; and nobody, anywhere, is waiting on
Pearloom to mail them anything.*
