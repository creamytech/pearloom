# RADICAL-DESIGN-DIRECTIONS.md — bold redesign directions (for Fable 5)

> Written directions (no mockups), produced with the `frontend-design`
> lens against the full-route screenshot audit (see
> `DESIGN-AUDIT-2026-07.md`). Where the audit asked "what's broken,"
> this asks "what would make it unforgettable." Drafted 2026-07-08.
>
> These push HARD. They stay inside the brand's soul (BRAND.md is the
> contract — Fraunces, cream, olive/gold thread, letterpress, editorial
> midnight) but treat that soul as a starting gun, not a ceiling. Each
> surface gets ONE signature idea plus concrete moves; each ends with a
> "stretch" swing that bends the bible, flagged as such.
>
> **Execution status (2026-07-08):**
> - §A pressed empty states — **SHIPPED** (EmptyShell full + inline; all
>   12 dashboard tabs).
> - §B graceful imagery — **SHIPPED** (`redesign/graceful-image.tsx`
>   pressed mat; every published-site photo path).
> - §B hero archetypes — **ALL THREE SHIPPED**: `cover` (sealed cover,
>   wax-seal monogram, parts on tap, once/device, ArrivalReveal
>   suppressed), `spread` (off-axis editorial, photo bleeds to edge),
>   `plate` (poster type, opsz press-in, foil thread).
> - Foil/deboss/press-in vocabulary now lives in three places; NEXT
>   session should extract the shared primitives layer (§E) before
>   building §C/§D on top.
> - Remaining: §A workbench stretch, §B gallery-frames default +
>   kinetic scroll type, §C landing thread-spine + occasion re-press +
>   store swatch drawer, §D wizard Pressing + editor chrome recession.

---

## 0 · The one thesis (read first)

**Pearloom is executed like tasteful software; it should be executed
like a made object.**

Right now almost every surface is the same instrument: a calm grid of
rounded cream cards, one accent tint, even 20px spacing, a Fraunces
heading, a mono eyebrow. It's genuinely well-made — but it's *uniform*,
and uniform is the enemy of memorable. A letterpress atelier's dashboard
should not have the same rhythm as its FAQ page.

Four levers turn "tasteful" into "unforgettable." Every direction below
is these four applied to a surface:

1. **Materiality.** Stop drawing cards; press them. Debossed panels
   (inset shadow + 1px light top edge), gold as a *foil* (a thin
   metallic gradient sheen on hairlines/dates, not flat #C19A4B), real
   paper grain that varies by surface weight, deckled/torn edges on
   keepsake objects. The product should look like it has a *surface you
   could run a thumb across*.
2. **Broken grid.** Kill the "everything is a 12-col card grid" reflex.
   Asymmetry, deliberate overlap, full-bleed ink bands that run edge to
   edge, one element that breaks the margin. Vary density hard — a
   near-empty pressed page next to a dense ledger.
3. **Type as theater.** Fraunces is a variable font with `opsz`, `SOFT`,
   `WONK` axes you're barely using. Go enormous on the one word that
   matters (200–400px display), animate the optical size on load so
   glyphs "press in," let italic and roman fight in one headline. The
   body (Geist) is the *only* safe choice in the system — keep it, but
   set it with editorial measure (55–62ch), real drop-caps, hanging
   punctuation.
4. **The thread as structure, not decoration.** Today the two-strand
   thread is a divider motif. Make it *load-bearing*: a single olive+gold
   strand that enters top-left, runs down the page as the scroll spine,
   ties each section, and terminates in the CTA. One continuous line the
   eye can follow through the whole surface. That's the signature no
   template tool can copy.

If a redesign doesn't move at least two of these levers, it isn't
radical — it's a reskin.

---

## A · Dashboard + empty states

**Signature idea: "The Composing Stone."** The dashboard is not a
control panel — it's the printer's workbench where a celebration is
being set into type. Reframe the whole surface from *cards on cream* to
*plates on a work surface*.

Concrete moves:
- **Full-bleed ink hero, edge to edge.** The countdown hero (already the
  best thing on the home screen) should bleed to all three edges of the
  content area — no margin, no radius on the outer edges — so the
  editorial-midnight ink is a *band*, not a card. Everything below it is
  cream. That single contrast jump does more than any new component.
- **A living galley spine.** Run one gold-flecked thread down the left
  gutter of the content column (not the nav — the content). Section
  eyebrows hang off it like tabs on a galley. It's the scroll spine from
  §0.4 made concrete, and it visually unifies the home screen's eight
  stacked modules into one object.
- **Plates, not cards.** Debossed panels: `inset` shadow + a 1px
  top-edge highlight, ~0 border. On hover a plate lifts 2px and its top
  highlight brightens — it reads as picking a metal type plate off the
  stone.
- **Scale contrast.** Section labels get *huge* Fraunces numerals set
  behind them (a ghosted "01", "02" at 160px, 6% ink) — the magazine
  move. The RSVP donut becomes a **wax-seal gauge**: a pressed circular
  seal whose fill is the "yes" ratio, gold rim, not a Chart.js ring.
- **Density variety.** The budget module wants a dense ledger feel
  (ruled rows, tabular figures, red overage). The "3 things only you can
  decide" wants the opposite — airy, one decision per pressed card,
  huge. Stop giving every module the same padding.

**Empty / first-run states — the biggest single win.** Today they're a
dashed box with a pear and one line. Reframe: **an empty state is a
blank page on the press, waiting.** Full-bleed, occasion-tinted, no
dashed border. A single thread enters from the top-left and stops
mid-air, unwoven. Enormous pressed Fraunces prompt ("Nothing woven yet.
Begin a thread.") set like a title page, the action as a *pressed* CTA.
Make emptiness feel like held breath, not an error card. Build it once
as `<PressedEmptyState occasion=… verb=…>` so all eight tabs are one
intentional family. This is the surface a brand-new user meets on every
tab — it should be the most beautiful blank page they've seen.

**Stretch (bends the bible):** a true "workbench" layout — modules as
draggable plates on a subtly textured steel/stone surface with a faint
non-cream ground behind the paper. Flagged: introduces a non-cream
ground, which BRAND §9 reserves; worth a prototype, needs sign-off.

---

## B · Published guest site (the money surface)

**Signature idea: "The Invitation as Object."** A guest should feel
they've been handed a physical, letterpressed, foil-stamped piece — not
shown a web page. This is where materiality earns the most, because it's
the emotional peak and the most-shared surface.

Concrete moves:
- **Three real hero archetypes, not variants of one card.**
  1. *The Cover* — a full-bleed pressed cover (paper grain, deckled
     bottom edge, foil-sheen date) that physically lifts/parts on
     arrival (you have `ArrivalReveal` — make the site *itself* the
     envelope, not an overlay on top of it).
  2. *The Spread* — editorial magazine asymmetry: names set enormous and
     off-axis, a single hairline-framed photo breaking the margin,
     generous void. No centered-stack hero.
  3. *The Type Plate* — no photo at all; the couple/honoree names at
     300px pressed Fraunces, italic-and-roman mixed, thread underline in
     foil. For the design-forward host who wants restraint.
- **Gallery: frames, not a grid.** The uniform tile grid is the
  template-tool tell. Go to hairline-framed, asymmetric, varied-scale
  editorial placement (one full-bleed, two small, one portrait) with
  real matting. (You already have a `frames` variant — make it the
  default, not the exception.)
- **Foil + deboss vocabulary.** Dates, monograms, and the RSVP seal get
  a thin metallic gradient (not flat gold). Section openers get a
  debossed rule. This is the single cheapest move that reads as
  "expensive."
- **Materiality that degrades gracefully.** (Ties to audit P2.) Every
  image sits in a paper-textured, blurred-up frame so a slow/missing
  photo reads as *pressed paper waiting*, never a gray gap.
- **Kinetic type on scroll.** Names/section titles linked to scroll
  progress via the `opsz`/`WONK` axes — the letters settle *into* the
  paper as they enter. One signature motion, used once per section.

**Stretch:** a "leafed," not scrolled, reading mode — the site turns
like pages of a bound book (horizontal, page-curl), honoring the BRAND
"pages are leafed" verb literally. High-effort, unforgettable, mobile-
risky — prototype behind a per-site toggle.

---

## C · Marketing landing + store

The landing is already the strongest surface, so "radical" here means a
**bolder editorial swing**, not a fix.

**Landing — signature idea: "The Loom weaves the page."** Make the
thread the literal spine of the whole scroll: one olive+gold strand
enters at the logo, runs the full length of the page, and each section
is *tied on* to it — it grows as you scroll and knots at the final CTA.
The page becomes one woven object end to end, not a stack of sections.
- **Occasion switch as a re-press.** Today changing the occasion swaps
  an accent. Make the *entire page re-press* into the new occasion's
  palette + type weight with a weave-wipe transition — a theatrical,
  once-noticed, never-forgotten moment that also demonstrates the
  product's core promise (one voice, any occasion).
- **Kinetic hero headline.** "The days that matter" set at true display
  scale with the optical-size press-in on load, italic "matter" doing
  the WONK wobble. Push the scale far past current.
- **Ditch remaining card-grid sections** (the pillars row) for
  asymmetric editorial spreads with overlap and scale jumps.

**Store — signature idea: "The swatch drawer."** Reframe the theme-pack
grid from an e-commerce card wall into a **physical sample book** you
leaf through — each pack a tactile swatch card (real material texture,
foil pack name, a torn corner showing the paper beneath). Hover =
lift + the pack's palette "inks in." Filtering pulls a drawer. Make
buying a theme feel like choosing letterpress stock, not adding to cart.

**Stretch:** a cursor-follow thread on the landing (a strand trails the
pointer and ties into the nearest section) — playful, risky, could read
gimmicky; A/B it.

---

## D · The creation flow (wizard + editor)

**Wizard — signature idea: "The Pressing," full-bleed and cinematic.**
The current wizard is a competent form with a phone preview parked in
the corner. Invert it:
- **The live pressing IS the stage.** The host's site-in-progress fills
  the screen, center, large; the controls are a thin tray at the bottom.
  Every keystroke re-presses the real thing. The phone-in-corner reads
  as "form with preview"; a full-bleed living pressing reads as "watch
  Pear make your thing."
- **Fewer, bigger, theatrical steps.** Each step is one enormous
  question set as a title page (occasion picker already close — push the
  scale, kill the search-box-first feel, lead with beautiful occasion
  plates). Transitions are the weave-wipe, not a slide.
- **The generating moment ("first pressing") is the emotional peak** —
  give it real theater: the thread weaves the layout in, type presses
  into paper, the palette inks. You have `GeneratingScreen`; make it a
  *set piece*, not a spinner-with-copy.

**Editor — signature idea: "Chrome disappears, the plate is the star."**
The editor is the densest, most "software-like" surface (three rails +
topbar). Radical here = *restraint*:
- **Thin the chrome.** Rails become quiet "type cases" — narrow,
  low-contrast, recede until hovered. The canvas gets the light and the
  space. Right now the rails compete with the work.
- **Direct-on-canvas everything.** Push edits onto the plate itself
  (inline type, drag handles that appear on hover) so the right rail is
  a fallback, not the primary surface. The editor should feel like
  standing at the press, not operating a dashboard.
- **One material accent:** the selected block gets a debossed gold
  hairline frame (the pearl-accent you already have, pushed to foil),
  not a flat highlight.

**Stretch:** collapse wizard and editor into one continuous surface —
you never "finish the wizard and enter the editor," you just keep
pressing, and chrome fades in as the site takes shape. Big architecture
bet; the highest-ceiling idea in this doc.

---

## E · How to execute without wrecking what works

- **Build the four levers as a shared layer first** (§0): a `Pressed`
  surface primitive (deboss + foil tokens), a `ThreadSpine` structural
  component, Fraunces variable-axis motion utilities, and the graceful
  image frame. Every direction above composes from these — do them once,
  centrally, or the surfaces will drift.
- **Sequence by stakes:** empty states (A) first — cheapest, highest
  first-impression payoff — then the published hero/gallery (B, the
  money surface), then the wizard pressing (D), then the landing swing
  (C). Editor restraint (D) last; it's the riskiest to destabilize.
- **Keep the escape hatch:** every "stretch" is flagged because it bends
  BRAND.md. Prototype them behind flags; don't ship a bible change
  without the owner. The non-stretch directions all live *inside* the
  bible — they're the bible turned up loud.
- **The trap to avoid:** don't let "radical" become "busy." Materiality
  and scale contrast are the moves; more gradients, more color, more
  motion are not. Spend boldness in one place per surface (§0) and keep
  everything around it quiet.

*Companion to `DESIGN-AUDIT-2026-07.md`. That doc says what to fix; this
one says how far to push. Screenshots in the session scratchpad
`audit/`.*
