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

Same day, second owner call: **the squiggle glyph is gone
completely.** Stamp centers render the Asterism (the Sprig read
as a wavy line at stamp sizes); the Studio's 'doodle' motif +
squiggle asset are retired (persisted picks render clean); the
desk-scene and error-pill flourishes, the templates-browser
flourish, and BuilderV8's dead "Loop Lines" option are removed;
the `Squiggle`/`Filigree` components are deleted from motifs.tsx
so the glyph cannot quietly return. Never reintroduce a wavy-line
mark — HairlineRule / Asterism / Fleuron are the ornament set.

### SV.1 — Theme packs press the card · **SHIPPED 2026-07-09**
The store's pack catalog is pressable in the Studio.
`studio/studio-theme-packs.ts` is the bridge: a pack look rides
`manifest.studio.palette` / `.fontPair` as `pack:<id>`; the card
root mounts the pack's full `--t-*` bag (the `'site'` sentinel
mechanism, generalized) so the card wears the pack's REAL colors,
faces, and paper grain — including the store-exclusive materials
(silk / washi / …). What landed: the Colors rail's **Theme packs**
shelf (owned + free packs press in one tap — colors + faces +
texture together; locked packs list quietly under "In the store"
with an Unlock link — one purchase covers site + stationery, §7
Q1 resolved YES); the Typography group shows the pack's own
display face as the active pair; the Paper row surfaces
pack-exclusive grains as the active chip; `<StoreFonts />` loads
the catalog faces only while a pack is pressed; stale pack ids
fall back like every other Studio dial (unit-tested across the
whole catalog). Visual harness at `/dev/studio`. Deferred to a
later block: the site's 6 named themes as pressable rows (the
'site' row covers the common case), and the byte-identical
snapshot test for legacy rows (ids are untouched, aliasing was
not needed).

### SV.2 — Paper parity · **SHIPPED 2026-07-09**
The sheet became a real dial. What landed, all persisted on
`manifest.studio` (+ the autosave writableFields + stale-id
sanitizers): **Grain strength** — a 25–150% slider driving
`--pl-texture-intensity` on the card root, shown once a grain is
on the sheet (the site's exact intensity mechanism); **Paper
color** — six stocks decoupled from the palette (bright white /
cream / ecru / blush / kraft / navy; kraft + navy bring their own
ink so type never vanishes; dark sheets drop the light-paper
noise overlay), sitting between the palette and custom colors in
the override chain; **Edge** — plain / hairline / double rule /
gilded (theme gold), where an explicit pick replaces the
kit-derived frame. The press sheet prints the same sheet the
canvas shows (props threaded through every card mount);
`/dev/studio` screenshots: navy + gilded + kraft grain at 150%,
blush + double rule + linen at 60%. Geometry tests untouched and
green. Deferred: deckle edges (needs a mask treatment that
survives the press sheet's squared trim), and the per-guest card
image (`/api/invite-card`) carrying the stock — it renders from
the SuiteTheme contract, a separate block.

### SV.3 — Marks & decor v2 · **SHIPPED 2026-07-09**
Two new marks in the ink language, both persisted like every
dial: **Postmark** (the dated cancel — PEARLOOM POST + the event
date around the ring, the same mark the envelope and Sealed
Arrival wear) and **Seal** (double hairline ring, display-italic
initials — the crest, miniaturized). Plus the **Mark ink** picker
(Auto / Ink / Accent / Gold) routing through every mark: postmark
+ seal + stamp rings, leaves, monogram; wax keeps its FILL (it's
physical) and the pick chooses the wax color instead. Deferred:
asset snap positions (there is no drag system to snap — assets
apply through the customMotifUrl slot; revisit if drag ever
lands).

### SV.4 — Element-level control · **SHIPPED 2026-07-09**
**Click any line on the card to rewrite it in place** — a
contentEditable `Editable` span on eyebrow / message / place /
footer lines (+ the letter body on the handwritten layout),
committing into the SAME per-type copyOverrides slice the Copy
rail and Pear rewrites use. Clearing a line restores the built-in
copy (empty = unset), so inline edits can never vanish an
element; hiding is the rail's explicit job: the new **On the
card** group shows/hides each line + the mark per stationery
type, and **Names size** (Small / Medium / Large) scales the
display names on every layout — carried through the press sheet.
The press sheet + send preview render read-only (no
`onEditCopy`). Deferred: per-element alignment / ink /
letter-spacing (named in §7).

### SV.5 — Layout registry + occasion recommendations · **SHIPPED 2026-07-09**
5 → 10 layouts: **Crest** (monogram ring, the solemn pick),
**Split** (two columns on a center hairline), **Border** (full
hairline frame, eyebrow set into the top rule), **Full photo**
(the photograph IS the card, ink scrim, paper-colored type),
**Ticket** (perforated stub with rotated mono type, the playful
pick). `recommendedStudioLayoutFor(occasion)` (lookup-only:
solemn → crest, playful → ticket, reunion → split, ceremonial →
border, couple arc → classic) marks Pear's pick with the gold
pearl on the Layout chips — never auto-applied.

### SV.6 — Back & envelope parity + the fence · **SHIPPED 2026-07-09**
**Back of card** chips (Default / Photo): the photo back carries
the cover photograph with the monogram, a short line in the
script face, and the site QR — printed identically by the press
sheet (same 5×7 spec, geometry tests untouched). The **envelope
liner** presses fine diagonal hairlines in the card's accent
inside the flap; the **addressee preview** shows the first real
guest's name (bracketed placeholders when the list is empty or
unauthenticated). And the fence: `no-sticker-marks.test.ts`
pins that Squiggle/Filigree stay deleted, no studio surface
imports them, every Stamp circle is `fill="none"`, and no pastel
disc fill exists anywhere in the mark surfaces. Deferred:
registry-QR and details back variants (the per-type Default backs
already carry details/reply/note).

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
