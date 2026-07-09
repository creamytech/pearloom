# STUDIO-PLAN — the stationery Studio grows up

> Authored 2026-07-09 from the owner's brief. Status: **planned,
> unexecuted** except §5 SV.0 (the mark replacement, shipped the
> same day). Each block below is one session's work; stamp them
> SHIPPED here as they land, ATELIER-PLAN style.

---

## 1 · The owner's brief (verbatim intent)

1. *"Replace all these marks, I hate it and they're still
   everywhere."* — the solid pastel disc `Stamp` (lavender circle,
   circular SAVE THE DATE text) reads as a sticker pasted over the
   design. It appeared on the Studio card, the rails' draft
   previews, the asset palette, the press sheet, and dashboard
   chrome.
2. *"Plan out a better Studio that has the same level of
   customization as the site editor and matches the paper types
   and stuff."* — the Studio should not be a toy next to the
   editor. One look vocabulary, both surfaces.

## 2 · Where the Studio stands today (audit, 2026-07-09)

What Studio v2 already has (ST.1–ST.3 heritage):
- **Presses from the site's real `--t-*` bag** — the `'site'`
  sentinel palette + font pair (studio-defaults-from-look).
- 6 fixed palettes (`PALETTES` in `studio-constants.ts`), 4 font
  pairs, 5 layouts, 7 motifs, 4 copy tones, per-line
  `copyOverrides`, custom colors.
- 6 paper textures riding the site's `[data-pl-texture]` grain
  system (linen/paper/kraft/canvas/marble/gilded).
- Decor-library import, AI asset drafting + drag-onto-card, real
  QR, the shared seal/postmark envelope, StudioPressSheet (exact
  physical size, crop marks, geometry pinned by tests).

Where it falls short of the editor:

| Axis | Site editor | Studio v2 |
|---|---|---|
| Themes | 6 named themes + 58 packs + custom `themeVars` | 6 fixed palettes + 'site' + custom colors |
| Fonts | per-theme stacks, pack fonts | 4 fixed pairs + 'site' |
| Paper | texture + **intensity** + grain variants | texture only, no intensity, paper color locked to palette |
| Layout | per-section variant registries (~50 variants) + occasion recommendations | 5 card layouts, no recommendations |
| Elements | per-section panels, InlineEdit on canvas, fine-tune | fixed element set per layout; copy via rail only |
| Decor | decor library + motif layouts + stickers | 7 canned motifs + dragged assets |
| Back/envelope | (site n/a) | one back layout, envelope fixed except seal |

## 3 · Design laws for everything below

- **One material vocabulary.** Anything the card can wear, the
  site can wear, and vice versa: themes, textures, inks, marks.
  No Studio-only pastel families. (BRAND §3, §5.)
- **Marks are STAMPED, never stickers.** Ink on paper: hairline
  rings, letterpress, postmarks, wax. A solid pastel disc never
  returns — SV.6 adds the fence test.
- **Labels stay plain** (BRAND §7): *Colors, Paper, Layout,
  Fonts, Marks* — never *Palette, Texture intensity, Variant*.
- **Real data only** on the canvas: names/date/venue from the
  manifest (the names fence from 2026-07-09 guarantees they
  exist); demo copy never renders for a host with real fields.
- **The press sheet is the contract.** Every new control must
  survive StudioPressSheet at physical size — geometry tests
  extend with each block.

## 4 · Target architecture — one look contract

A single derivation, `studioThemeFrom(bag: ThemeVars)`, maps ANY
`--t-*` bag (site theme, pack, custom) onto the card's paper /
ink / accent / accent2 / fonts. The existing `'site'` sentinel
becomes the general case; the 6 legacy palette ids stay as
aliases resolving through the same path so persisted
`manifest.studio` rows keep rendering identically.

```
site themes (themes.ts) ─┐
theme packs (packs.ts) ──┼→ --t-* bag → studioThemeFrom() → card
custom themeVars ────────┘         ↑
                     'site' sentinel (today's ST.1 path)
```

## 5 · Sprint blocks

### SV.0 — Replace the marks · **SHIPPED 2026-07-09**
The `Stamp` motif redesigned in place (`pearloom/motifs.tsx`,
same API): solid pastel disc → letterpress ink postmark (hairline
double ring, dotted inner ring, mono-caps circular text, tone
picks the INK, paper shows through; `inkColor` override keeps it
legible on dark papers — wired for the twilight palette in
StudioLayouts). Every consumer swapped automatically: Studio card
motif overlay, rails' draft previews, asset chips, dashboard
chrome, press sheet. Visual harness at `/dev/marks`.

### SV.1 — One look contract (themes + fonts parity)
`studioThemeFrom()` in `src/lib/site-look/` + the Colors rail
regrouped: **Your site** → the site's 6 named themes → owned
packs (via `useEntitlements`) → custom colors. Fonts rail follows
the same order (theme stacks first). Legacy palette/font ids
alias through. Counts as done: a host who owns a pack can press
the card in that pack's full look; persisted old rows render
byte-identical (snapshot test).

### SV.2 — Paper parity ("matches the paper types and stuff")
Texture + **intensity** slider matching `--pl-texture-intensity`;
paper STOCK color decoupled from the palette (cream / bright
white / ecru / kraft / blush / navy, each with ink auto-contrast);
edge treatments (none / hairline frame / double rule / deckle).
The press sheet + print preview + per-guest card image
(`/api/invite-card`) all carry the same paper. Counts as done:
the card and the published site can wear the identical
texture+intensity, verified side-by-side at `/dev/marks`-style
harness; geometry tests still green.

### SV.3 — Marks & decor v2
The postmark family grows in the ink language: dated postmark
(event date around the ring — same mark the envelope and Sealed
Arrival wear), monogram seal (double hairline ring, Fraunces
initials — the site's `crest` hero variant, miniaturized), wax
seal (keeps its fill — wax is physical), corner flourishes,
Thread rules. Per-mark ink picker (theme inks only). Decor
library becomes first-class in the Marks rail (not a disclosure).
Dragged assets snap to 9 anchor positions. Counts as done: every
mark option renders from theme inks; no solid pastel fills
anywhere in `studio/`.

### SV.4 — Element-level control (the editor's fine-tune, for cards)
Inline editing ON the canvas (InlineEdit pattern from the
editor) for every text element; per-element controls: show/hide,
alignment, size step (S/M/L), ink override, letter-spacing for
eyebrows. Element order within the layout's slots. Counts as
done: a host can compose a card without opening the Copy rail;
autosave stays scoped (`manifestPatch`, never the whole
manifest).

### SV.5 — Layout registry + occasion recommendations
5 → ~10 layouts as a registry (`studio-layouts.ts`, mirroring the
site's variant registries): adds crest (solemn-recommended),
split, border-frame, full-photo with scrim, ticket (site kit
kinship), postcard back. `recommendedLayoutFor(occasion)` marks
Pear's pick with the gold pearl, exactly like the editor's Layout
bar. Counts as done: memorial defaults to crest/quiet, wedding to
classic; recommendations are lookup-only, never auto-applied to
existing cards.

### SV.6 — Back & envelope parity + the fence
Back-of-card layouts (RSVP card, details card, photo back,
registry QR back); envelope liner pressed from the card's texture
+ accent; addressee preview from real guest rows. Plus the fence:
a `no-sticker-marks.test.ts` asserting no component in
`studio/` or `motifs.tsx` renders a filled `<circle>` of a
pastel `bg` behind circular text (the disc can't quietly return),
and a press-sheet geometry extension for the new backs.

## 6 · Explicitly out of scope

- Physical print fulfillment (retired; ATELIER §1 — the
  no-physical-promises fence stays).
- New AI drafting endpoints (the existing draft/rewrite/asset
  routes are enough; SV blocks only re-route their outputs).
- Site-side changes beyond exporting the look derivation — the
  renderer contract is untouched.

## 7 · Risks / open questions

- **Q1** Pack entitlements on stationery: does owning a pack for
  the SITE cover the card too? Tentative: yes — one purchase, one
  look, both surfaces (matches "one woven object", ATELIER).
- **Q2** Paper stock color vs. email rendering: dark stocks need
  the themed-email layout to adapt (INV.1 contract) — check
  before SV.2 ships the navy stock.
- **Q3** How far the ticket layout may drift from the site's
  ticket kit before it stops reading as kin — resolve in SV.5
  with side-by-side screenshots.
