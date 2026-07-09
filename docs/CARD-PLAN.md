# CARD-PLAN.md — every card feels like a card

> Owner ask (2026-07-09, three phone screenshots): "can we improve
> the card designs maybe add some depth so users know they're
> scrollable cards? also there's a ton of negative space in some
> card options so maybe we can make it richer and show previews of
> the paper types and stuff like that — plan out massive
> improvements to all cards."

---

## 0 · How to use this file

- Blocks in §3 execute top-down; stamp statuses as they land.
- File:line citations as of 2026-07-09 (commit `7a4b629f`).

## 1 · What the screenshots showed (the audit)

1. **Invisible cards** (IMG_9326). Deck slides are `--cream-2` on a
   `--card` sheet with a `--line-soft` border — cream on cream. No
   elevation. The Theme card's preview reads as content floating in
   the sheet; only the dot rail and a 10%-wide sliver of "Colors"
   hint that this is a deck. Nothing says "swipe me."
2. **Dead space in doors** (IMG_9327/9328). Drill-in doors (Colors,
   Paper) are a strip of controls + ~70% empty sheet. Worse now
   that the sheet opens near-full: the canvas is hidden behind it,
   so there's no live feedback either — the controls float in a
   void and their effect is invisible until Done.
3. **Text where visuals should be** (IMG_9328). Paper textures are
   TEXT PILLS ("Linen", "Velvet", "Kraft"). A texture is the single
   most visual thing in the product and its picker shows words.

## 2 · The card law (new chrome rules)

1. **Elevated paper.** Every deck slide is a raised card: `--card`
   ground on the sheet's cream, a real `--line` hairline, radius 16,
   and a soft two-layer shadow. The deck row keeps breathing room
   below the cards so the shadow renders (the row clips overflow-y).
2. **The next card always peeks.** 86% slides + gap stay; the
   shadow + edge make the peek read as a card edge, not a glitch.
3. **No card floats its content in a void.** Short content grows a
   PREVIEW to fill (the door cards' look plates); controls stack
   from the top; anything below ~55% empty is a bug.
4. **Pickers that change something visual SHOW the visual.** Paper
   = real texture swatches (the site renderer's own TextureLayer —
   it's inline data-URI noise, chrome-safe). Colors/fonts doors
   carry a live miniature of the site that repaints as you tap —
   the stand-in for the canvas the full-height sheet now hides.
5. **One miniature language.** `SiteLookPlate` (site-look-plate.tsx)
   is THE miniature: the hosts' names in the real display face on
   the real paper with the real texture and a real accent pill.
   Deck previews, door headers, and future compare surfaces all
   press the same plate.

## 3 · Blocks

### Block CD-A — depth + the look plate + paper swatches — ✅ SHIPPED 2026-07-09
Goal: cards read as swipeable cards; doors lose their dead space;
paper becomes visual.
Counts as done: deck-slide elevation CSS (editor deck + studio
deck); door cards' previews grow to fill; `SiteLookPlate` module
mounted atop the colors / fonts / paper doors (live repaint on
every tap); TexturePick renders real TextureLayer swatch tiles on
the site's paper (text pills dead); deck 'paper' preview uses the
real texture. tsc/eslint/vitest + phone screenshots.

### Block CD-B — section deck richness pass
Goal: the SECTION panels' first cards lead with something visual
where one exists. Audit-driven, per panel: Gallery leads with a
thumbnail strip, Schedule with its mini timeline, Hero with the
opening-photos strip it already has (verify placement), Travel
with the hotel faces, Registry with item faces. Skip panels that
are genuinely form-first (RSVP config, Privacy).

### Block CD-C — the remaining pickers go visual
Goal: apply law #4 everywhere. Colors door gains pressed palette
PLATES (preset palettes as mini look plates, not dot rows); Fonts
door pairs render as specimen cards ("Aa · Fraunces / Geist") in
the actual faces; Background door previews its wallpapers as
tiles; Motion door demos its kits on the look plate (reduced-
motion honoured); Menu door already draws schematics — verify
parity. Studio deck cards inherit whatever's missing.

## 4 · Decisions / notes

- TextureLayer moved to an export from ThemedSite (it's pure inline
  styles + data-URI tiles — no site-scope CSS dependency), so
  chrome can press honest texture swatches without duplicating the
  material recipes.
- The look plate reads manifest.names; sites without names show
  "Your names" (only pre-wizard demo worlds).
- Deck slide chrome is CSS-only (pearloom.css) so every current and
  future deck (editor sections, design doors, studio) inherits it
  without component edits.
