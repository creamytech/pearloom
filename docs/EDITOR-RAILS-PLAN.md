# EDITOR-RAILS-PLAN.md — press the thing, get the thing

> Three field reports from the owner (2026-07-09, phone screenshots
> of the live editor), one underlying disease:
>
> 1. **The Cover hero's photo strip is dead to the touch.** Four
>    tiles; one real photo; "you can only select one and you can't
>    quick replace inline."
> 2. **Pressing the nav bar or the footer gives you nothing.** Their
>    layout options hide in a different place (the Design tab's
>    "Menu & footer" group) that a host has no reason to find.
> 3. **The phone editor's panel is a cramped scroll well.** Desktop
>    forms squeezed into a 48vh sheet, a scrollbar nobody sees, two
>    stacked headers. Owner's ask: "think of something more
>    intuitive like rich cards they can swipe."
>
> The disease: the editor has no single **selection contract**. Some
> things select and edit; some select and do nothing; some don't
> select at all; photos edit only when they're absent. This plan
> makes one law — *press the thing, get the thing* — and rebuilds
> the phone panel around swipeable control cards.
>
> Sprint blocks at §6. Same prompt system as ATELIER-PLAN.

---

## 0 · How to use this file

- Copy a block from §6 (from its `## Active focus` line to the
  closing rule) into `CLAUDE.md` line 6 to arm the autoloop, or hand
  it to a session verbatim. Stamp statuses here as blocks land.
- File:line citations are as of 2026-07-09 (commit `d5c4589c`) —
  re-grep before trusting a paragraph if the file has churned.
- Recommended order: **PH.1 → SEL.1 → SEL.2 → DK.1 → DK.2 → PH.2 →
  DK.3 → LAY.1 → LAY.2.** The photo strip first (it is the owner's
  exact reproduction and a one-file fix); the selection contract
  next (it unlocks nav/footer and sets the law); the phone deck
  third (biggest lift, biggest payoff); layout-depth polish last.

---

## 1 · Diagnosis, with receipts

### 1a · The hero photo strip edits only when it's empty

`HeroPhotos` (`ThemedSite.tsx:1694-1730`) is the 4-tile strip under
the `centered` and `cover` heroes (the only multi-photo heroes —
every other variant is single-photo or photo-less; registry at
`layouts.ts:21-32`):

- **Fields:** `[coverPhoto, ...galleryImages]`, deduped, `.slice(0,4)`
  (`:1695-1698`). There is no hero-owned photo set — tiles 1–3 are a
  window onto `galleryImages[0..2]`, the Gallery section's array.
- **The bug:** when `photos.length > 0` the strip renders plain
  `FadeInImage` tiles (`:1699-1709`) — **no `EditPhotoTarget`, no
  click, no hover hint, no Reframe.** Only the *empty* state
  (`:1714-1729`) wraps its 4 placeholder tiles in `EditPhotoTarget`
  (tap → `pearloom:open-photo` → `CanvasPhotoDrawer`). So the moment
  a host has one photo, the strip goes inert — exactly the owner's
  report. One photo also means one tile: the three "add a photo"
  invitations vanish instead of remaining as targets.
- **The sprig frames** in the owner's screenshot are `PressedMat`
  (`graceful-image.tsx:39-53`) — `FadeInImage`'s graceful state for
  photo URLs that fail to load. In the editor that grace is a lie of
  omission: the host sees a pretty frame, not "this photo is broken,
  tap to replace it."
- **The panel side manages one photo of four.** `HeroPanel`'s only
  photo control is `CoverPhotoField` → `PhotoUploadSlot`
  (`HeroPanel.tsx:29,44`, drag-drop + "Swap from gallery · N" at
  `_photo-upload.tsx:186-295`) — it writes `coverPhoto` only. The
  strip's other three tiles are editable nowhere in the Opening
  panel, on any device.

What already exists and must be REUSED, not re-invented:
`EditPhotoTarget` (`ThemedSite.tsx:5520`, hover hint + Reframe),
`EditPhotoCorner` (`:5733`), `CanvasPhotoDrawer`
(`CanvasPhotoDrawer.tsx`, opened via `pearloom:open-photo`, wired at
`EditorRedesign.tsx:1007-1060` — writes `coverPhoto` /
`galleryImages[i]`), `collectPhotoPool` (`_photo-upload.tsx:473`),
`PhotoUploadSlot` + `GalleryPickerModal` (`_photo-upload.tsx`),
`/api/photos/upload`, `/api/user-media`.

### 1b · Selection is a lottery

The on-canvas **Layout chip** ("Layout · Cover" + schematic popover,
gold recommendation pearl) lives in `TSection`
(`ThemedSite.tsx:4831-4917`) and appears only when the section was
given `manifest` + `onEditField` and its `LAYOUTS[id]` has >1
variant (`:4657-4659`). Coverage today:

| Thing on canvas | Selectable? | Layout chip? | Panel? |
|---|---|---|---|
| Core/optional/block sections via `sectionEl` (`:857-858`) | yes | yes (all 28 registries ≥2 variants) | yes (`renderSectionEditor`, `PropertyRail.tsx:875-929`) |
| **Nav bar** (`TSection id="nav"`, `:814` — no `manifest`/`onEditField` passed) | yes | **no** (5 desktop variants exist, `LAYOUTS.nav`) | **no** (`default → null`, `PropertyRail.tsx:925-928` — Content tab shows a bare header) |
| **Mobile menu** (`LAYOUTS.navMobile`, 4 variants) | **no canvas presence at all** | — | Design tab only |
| **Footer** (`SiteFooter` raw via `footerEl`, `:870-876`; reads `manifest.footerVariant`) | **no** | — | Design tab only (`FooterPick`, `ThemePickerBody.tsx:1063-1110`) |
| Guestbook + linked-events strips (`:829-837`) | no | — | Guestbook has a panel, reachable only from the rail |

So a host presses the nav bar: gold frame appears, nothing else.
Presses the footer: nothing at all. Meanwhile the pickers they
wanted (`NavPick` `ThemePickerBody.tsx:1112-1167`, `FooterPick`
`:1063-1110`) sit in the Design tab's `#pl-dz-menu` group — the
right options in a place only a rail-scroller finds.

### 1c · The phone editor is desktop furniture in a dollhouse

- The sheet (`MobileSheet.tsx`) mounts **the desktop `PropertyRail`
  verbatim** (`EditorRedesign.tsx:844-854`); every panel is the same
  `FInput`/`FGroup` desktop form (`renderSectionEditor`), scrolling
  inside a `min(48vh, 460px)` well (`EditorRedesign.tsx:762-766`).
  No visual cue says "this panel scrolls."
- **Two stacked headers**: the sheet's own header (See my site ·
  `< SECTION >` stepper · Done, `MobileSheet.tsx:543-674`) and then
  PropertyRail's eyebrow + title + Content|Design tabs
  (`PropertyRail.tsx:618-662`) — ~150px of chrome before the first
  control, in a 460px sheet.
- The **Design tab is the full desktop ladder uncut**
  (`ThemePickerBody` inline at `PropertyRail.tsx:761-771`): themes,
  colors, fonts, paper, layout styles, background, motion, menu,
  fine-tune — one infinite vertical scroll inside the well.
- There is **no horizontal paging machinery** editor-side (the only
  gesture engine is the sheet's vertical drag-to-peek,
  `SheetController`, `MobileSheet.tsx:70-214`). The product already
  teaches a swipe-shelf grammar everywhere else (landing `pd-shelf`,
  dashboard `pl8-homerow`, guest strips `pearloom.css:6769-6943`) —
  the editor is the one phone surface that never uses it.
- Worth keeping (hard-won, do not regress): the `SheetController`
  single-writer position contract (`MobileSheet.tsx:24-55`),
  keyboard-lift via `visualViewport` (`:427-465`), peek mode +
  pointer passthrough (`:475`), iOS 16px input floor
  (`pearloom.css:8988-8992`), `.pl-hit44` tap targets, safe-area
  math, `contentKey` swap-in-place (`EditorRedesign.tsx:761`).

---

## 2 · The law

**Press the thing, get the thing.** One selection contract for every
visible region of the canvas:

1. Everything a guest can see is selectable in the editor — sections,
   nav, footer, strips. No dead presses.
2. Selection always yields: the gold frame, the "Editing ·" tag, the
   **Layout chip when ≥2 variants exist**, and a **real panel** with
   the thing's own controls (never `default → null`).
3. Anything editable inline (text via `InlineEdit`, photos via
   `EditPhotoTarget`) is editable inline in **every** state — filled,
   empty, or broken. Empty invites; broken confesses; filled swaps.
4. The rail keeps deep control; the canvas keeps first touch. Both
   write the same manifest fields — no dual vocabularies.

---

## 3 · Track PH — the photo strip (and photos generally)

### PH.1 — Filled tiles are targets; the strip never goes inert

`HeroPhotos` rework (one file + no new manifest fields — the strip
stays a window onto `coverPhoto` + `galleryImages`):

- In the editor, render **all four slots always**: filled tiles wrap
  their `FadeInImage` in `EditPhotoTarget` (slot 0 → `{kind:'cover'}`,
  slot i → `{kind:'gallery', index:i-1}`) so every tile gets tap-to-
  swap, the "Change photo" hover hint, and Reframe; remaining slots
  render the tonal `PhotoPlaceholder` add-targets (today's empty-state
  behavior, `ThemedSite.tsx:1714-1729`). Published rendering is
  untouched: real photos only, `null` when none (honesty rule).
- **Broken photos confess in the editor**: `FadeInImage` gains an
  optional `onStateChange`/editable prop so `EditPhotoTarget` can
  overlay a plum "Photo didn't load — replace it" chip on the
  `PressedMat` state instead of a silent sprig. Published sites keep
  the graceful mat.
- Audit the other photo-bearing variants for the same inertness:
  `split`, `spread`, `fullbleed` (uses `EditPhotoCorner` ✓),
  `postcard` — every filled photo surface must carry a target.
  Acceptance: with 1 photo on the Cover hero, a host can tap any of
  the 4 tiles and swap/add inline on desktop AND phone (the
  `CanvasPhotoDrawer` already renders on both).

### PH.2 — The Opening panel shows the whole strip

`HeroPanel` gains an "Opening photos" group: a 4-slot mini-strip
(reusing `PhotoUploadSlot`'s pool/upload plumbing) mapping slot 0 →
`coverPhoto`, slots 1–3 → `galleryImages[0..2]`, with one quiet line
of truth: "These lead your gallery." (shared array, said out loud —
the same photos appear in the Gallery section). Drag to reorder
within the strip reorders `galleryImages`. The existing single
`CoverPhotoField` folds into slot 0. Mobile gets this via DK.1's
Photos card for free.

**Decision (closed): no `manifest.heroPhotos` field.** The shared
array is a feature (one photo pool, no sync bugs) — the strip is a
view, the panel says so, and `writePhoto` already targets it.

---

## 4 · Track SEL — the selection contract

### SEL.1 — The nav bar earns its press

- Pass `manifest` + `onEditField` to the nav's `TSection`
  (`ThemedSite.tsx:814`) so the **Layout chip appears** with
  `LAYOUTS.nav`'s 5 variants (chip machinery needs zero changes —
  the gate at `:4658` opens by itself).
- Give `nav` a real panel: `NavPanel` in `renderSectionEditor` —
  brand line/monogram toggle, page links summary, and the two
  variant rows that today live only in `NavPick` ("Menu, desktop" /
  "Menu, phone" — `navMobile`'s only home gains a second, findable
  one). `NavPick` stays in the Design tab; both write
  `manifest.layouts.nav`/`.navMobile` — same fields, no forks.
- The chip's popover gets a second row for the phone menu (4
  `navMobile` variants) — the one registry with no canvas presence.

### SEL.2 — The footer exists

- Wrap `SiteFooter` in `TSection id="footer"` (today it renders raw,
  `ThemedSite.tsx:870-876`) → selectable, gold frame, "Editing ·
  Footer" tag.
- Layout chip: add a `LAYOUTS.footer` registry (signature / columns /
  minimal — the `FooterPick` trio) with a read/write adapter onto
  `manifest.footerVariant` (**no data migration**; the chip's
  `pickLayout` writes `layouts.footer` for new picks and the renderer
  reads `layouts.footer ?? footerVariant` — old rows keep working).
- `FooterPanel` in `renderSectionEditor`: footer copy fields (sign-off
  line, credits toggle) + the variant row. `FooterPick` in the Design
  tab keeps working over the same adapter.

### SEL.3 — No dead presses anywhere

Sweep the canvas for remaining unselectable/dead regions: the
guestbook strip and linked-events strip (`:829-837`) get `TSection`
wrappers routing to their panels; anything selected must never hit
`renderSectionEditor`'s `default → null` (`PropertyRail.tsx:925-928`)
— replace the default with a labeled "This part has no options yet"
card so a gap is visible, not silent. Acceptance: tap every visible
region of a maximal site — zero presses that produce only a frame.

---

## 5 · Track LAY — layout-option depth

### LAY.1 — Layout lives in both places, visibly

The section panel (Content tab) header gains the same quiet
"Layout · ‹current›" chip the canvas shows, opening the same
schematic popover — a host who lives in the rail never hunts for
where layouts moved, and on phones the chip rides into the sheet for
free. One component (`LayoutChip`), two mounts (TSection +
`SectionPanelShell` header).

### LAY.2 — Nav/footer pickers speak schematic

`NavPick` and `FooterPick` (`ThemePickerBody.tsx:1063-1167`) render
text chip rows while every section popover renders `VariantThumb`
schematic cards — extend `variant-thumb.tsx` with nav (5), navMobile
(4), and footer (3) drawings and use them in both the Design-tab
pickers and the new SEL.1/SEL.2 chips. One visual language for
"which layout is this," everywhere (the wizard's Sections step
already set it).

### LAY.3 — Recommendation coverage audit

`recommendedVariantFor` (`layouts.ts:289-357`) rules exist for the
storied sections; extend the ordered-rule list to nav/footer (e.g.
solemn → `minimal-text` nav + `minimal` footer; playful → `pill`
phone menu) so the gold pearl appears in the new chips too. Lookup
only — never auto-applied (standing rule).

---

## 6 · Track DK — the phone editor becomes a card deck

The owner's instinct is right, and the product already teaches the
gesture: **rich horizontal cards, swiped, one task per card** — the
same shelf grammar as the landing, dashboard, and guest strips. The
sheet stops being a dollhouse window onto desktop forms.

### DK.1 — The control deck

- New `MobileCardDeck`: a scroll-snap x row (86vw slides, next card
  peeking, edge fade — the `pl8-homerow` recipe, `touch-action:
  pan-x pan-y`) mounted as the sheet's body on phones, with a dot
  rail + card titles under the sheet header.
- **Panels declare cards instead of being forked.** The card
  boundary already exists in the code: `SectionPanelShell` groups /
  `FGroup`s (`_section-atoms`). Teach `SectionPanelShell` a
  `deck` presentation: on phones each top-level group renders as one
  deck card (title = group label); desktop rendering is unchanged.
  24 panels get the deck without 24 rewrites; a panel can override
  its card split where the default grouping reads wrong.
- Example (the Opening panel): Photos (the PH.2 strip) · Names ·
  Date & place · Buttons · Extras — five cards, each fitting the
  sheet with no interior scroll. A card that must scroll gets the
  edge-fade + "more" affordance, but the design target is *no
  vertical scroll inside cards*.
- Keep everything hard-won from §1c: `SheetController` stays the
  position owner; keyboard-lift now also pins the deck to the
  focused card; `.pl-hit44`, 16px inputs, safe-area, peek mode all
  unchanged. The deck raises the see-through sheet to ~`56vh` (cards
  absorb what vertical scroll bought).

### DK.2 — One header, not two

Inside the sheet, `PropertyRail` suppresses its eyebrow/title (the
sheet header already names the section) and its Content|Design tabs
move into the sheet header as a compact segmented control beside the
stepper — ~90px of chrome returned to content. Desktop rail
untouched (`isMobileViewport` already threads through,
`PropertyRail.tsx:493-495`).

### DK.3 — Design on phones is a deck of doors, not a ladder

The Design tab stops inlining the full `ThemePickerBody` ladder into
the well. Phones get a **Design deck**: Theme · Colors · Fonts ·
Paper · Layout & cards · Menu & footer · Motion — each card shows
the current state (live swatch/specimen/thumb) and opens its full
editor as a drill-in push inside the sheet (back chevron returns to
the deck). The ladder component is reused per-door; nothing is
re-implemented, only re-cut.

### DK.4 — The Photos card is the flagship

The Opening deck's Photos card = PH.2's 4-slot strip at card scale:
big tiles, tap → `CanvasPhotoDrawer` (which is already a bottom
tray — on phones it slides over the sheet), long-press or handle to
reorder. This card is the answer to the owner's screenshot: the four
hero photos, all four tappable, in the first card a phone host sees.

### DK.5 — Swipe = step (stretch)

Once the deck feels right: swiping past the last card of a section
steps to the next section's first card (the header stepper's
`stepToSection` wiring at `EditorRedesign.tsx:776-783` already does
the scroll-sync). Gated behind DK.1 telemetry/feel — skip if it
fights the per-card swipe.

---

## 7 · Sprint blocks

### Block 1 — PH.1 + SEL.1 + SEL.2 (the reported bugs)
Goal: the owner's two screenshots can't be reproduced. Every hero
tile taps; nav press → chip + panel; footer press → chip + panel.
Counts as done: canvas tap-audit green (SEL.3 sweep on a maximal
fixture site), `tsc`/eslint/vitest clean, screenshots desktop+390px.
Skip: deck work, LAY polish.

### Block 2 — DK.1 + DK.2 (the deck lands)
Goal: phone props sheet = card deck, one header. The Opening panel
reads as 5 swipeable cards with zero interior scroll at 390×844.
Counts as done: deck on all core-section panels via
`SectionPanelShell` (overrides only where grouping reads wrong);
keyboard-lift + peek regression-tested; e2e smoke for tap-to-swap on
the Photos card.
Skip: Design deck (next block), DK.5.

### Block 3 — DK.3 + DK.4 + PH.2
Goal: Design tab is a deck of doors on phones; Opening photos strip
in the panel on all devices.
Counts as done: no full-ladder scroll inside the sheet anywhere; the
photos strip writes/reorders `galleryImages` correctly (autosave +
undo verified through bridge.ts).

### Block 4 — LAY.1-3 + SEL.3 sweep
Goal: layout everywhere it's expected, schematic everywhere, pearls
on nav/footer, zero dead presses.
Counts as done: LayoutChip mounted in panel headers; VariantThumb
covers nav/navMobile/footer; recommendation rules extended; the
"no options yet" card replaces `default → null`.

---

## 8 · Open questions / decisions log

- **Q1 — hero photo set:** own field vs window onto
  `coverPhoto`+`galleryImages`? **Closed: window** (PH.2) — said out
  loud in copy, no migration, no sync bugs.
- **Q2 — footerVariant vs layouts.footer:** **Closed: adapter, no
  data migration** (SEL.2) — new picks write `layouts.footer`,
  renderer falls back to `footerVariant`.
- **Q3 — deck card taxonomy per panel:** default = top-level panel
  groups. Owner should eyeball Block 2's Opening/Story/RSVP decks
  before we lock the per-panel overrides.
- **Q4 — DK.5 (swipe past the last card steps sections):** feel
  decision after Block 2; default off.
- **Q5 — broken-photo data:** the owner's three sprig tiles imply
  dead `galleryImages` URLs in prod (possibly from the base64-strip
  era). PH.1 confesses them in the editor; do we also want a
  one-time integrity sweep (HEAD-check manifest photo URLs, report
  in the dashboard)? Cheap script, owner's call.

---

*Validation loop per block: `npx tsc --noEmit` → `npx eslint
<touched>` → `npx vitest run` → dev-harness screenshots (desktop +
390×844) → commit → push. The editor's e2e harness lives at
`/dev/editor`; extend its fixture site to a maximal section set for
the SEL.3 tap-audit.*
