# REGISTRY-PLAN.md — every gift gets a face, nobody touches the money

> Owner ask (2026-07-09): "plan major improvements to the registry —
> can we have image populate with details of an item if manually
> added? things like that. i know we don't wanna handle registry
> ourselves so need to make it easy and awesome for users."
>
> The constitution stands: **Pearloom never touches the money**
> (CLAUDE-PRODUCT 2026-07-02 — reserve-and-link, honor ledger,
> P2P funds, chip-ins; no processing, no escrow). This plan is about
> making the *authoring* and *browsing* of gifts feel effortless and
> rich, not about payments.

---

## 0 · How to use this file

- Copy a block from §4 into `CLAUDE.md` line 6 to arm the autoloop,
  or hand it to a session verbatim. Stamp statuses as blocks land.
- File:line citations as of 2026-07-09 (commit `d13b4385`).
- Recommended order: **RG.1 → RG.2 → RG.3 → RG.4 → RG.5.**

---

## 1 · What exists (and the asymmetry the owner hit)

The plumbing for "paste a link, get a rich item" ALREADY exists —
it's just not everywhere, and the manual path got none of it:

| Piece | State |
|---|---|
| `/api/registry-items/from-url` | ✅ Server-side page read → `{ title, imageUrl, price, store }`, SSRF-guarded (private-IP rejection pre-fetch + post-DNS, re-vetted redirects, 512KB/10s caps — `src/lib/product-page.ts`) |
| Editor RegistryPanel | ✅ Paste-a-link → `readProductUrl` (`RegistryPanel.tsx:481-516`) prefills the add form with title/photo/price |
| Dashboard RegistryItemsManager | ❌ **No from-url wiring at all.** The add/edit modal is raw fields — name, price, and a bare "Image URL" text input (`RegistryItemsManager.tsx:226-227,337`). This is the "manually added items have no image" pain. |
| Item cards (dashboard) | Partial — image-or-tint tile (`:169-170`), price + claim counts; no store plate, no priority signal |
| Published grid (`RegistryItemsGrid`) | ✅ 4 layouts incl. `storecards` (typographic store plates + real domains) |
| Group gifting, pledges, funds, thank-you ledger | ✅ Shipped (chip-ins, honor ledger, P2P funds, `thanked_at` loop) |

The asymmetry: a host who adds items in the **editor** can paste a
link and get a face; a host in the **dashboard** (or who types a
gift by name anywhere) gets a gray tile.

---

## 2 · The law

**Every gift gets a face, and adding one is one gesture.** Paste
anything — a product link, or just words — into ONE composer, and
the item comes back looking like a catalog card: photo, name, price,
store. Where the web can't supply the face (a name-only wish like
"a weekend of babysitting"), Pearloom supplies a beautiful one — a
host photo or the occasion-tinted gift plate — never a gray box.
And we never fake what we don't know: no scraped guesses by name,
no invented prices.

---

## 3 · Tracks

### RG.1 — One smart composer, everywhere

- A single **"Add a gift"** composer replaces the two divergent add
  flows: one input that takes *a link or a few words*. URL detected
  (on paste or submit) → `from-url` reads the page, a live preview
  card threads in (photo/title/price/store, each editable), "Set
  it" saves. Plain words → straight to the manual card with RG.2's
  face picker. Component shared by RegistryPanel (editor) and
  RegistryItemsManager (dashboard) so the two can never drift
  again.
- **Paste-anywhere**: pasting a product URL into the plain-words
  state auto-upgrades to the link flow (no separate "Add by URL"
  affordance to find).
- **Multi-link paste**: several URLs pasted at once queue through
  from-url sequentially with a visible thread of preview cards —
  a host can dump five tabs' worth of links in one go. (Server
  route unchanged; queue is client-side, rate-limit friendly.)

### RG.2 — Every item gets a face

- **Manual items get a face picker**: (a) upload/pick a photo
  (reuses `/api/photos/upload` + the site photo pool), or (b) a
  **gift-plate set** — hand-drawn Pearloom category art (kitchen,
  home, adventure, honeymoon, little-one, garden, table, quiet
  luxuries…) rendered in the site's `--t-*` tints so it matches
  every theme. The bare "Image URL" text input dies.
- **Deliberate constraint (say it in the decisions log): no
  image-search-by-name.** There is no ToS-safe, reliable source to
  scrape a product photo from words alone; a wrong photo on a gift
  is worse than a plate. The plate set IS the answer for
  name-only items.
- **Broken images confess**: a dead `imageUrl` shows the plate +
  a quiet "photo didn't load — refresh or replace" affordance
  (same honesty pattern as the editor's photo tiles).
- **"Refresh from the store"**: any item with an `itemUrl` gets a
  one-tap re-read (re-runs from-url) — updates photo and price,
  with a "price changed $X → $Y" note the host confirms. Never
  automatic; prices moving silently under a host is spooky.

### RG.3 — The item card grows up

- **Store plate**: items with an `itemUrl` wear the storecards
  treatment (typographic initial plate + real domain) on the
  dashboard manager card too — the published grid already knows
  how.
- **Priority pearl**: the existing `priority` field ('want' etc.,
  `RegistryItemsManager.tsx:231`) surfaces as a gold pearl on
  "most wanted" items — manager AND published grid, and most-wanted
  items sort first by default.
- **Category shelves**: the manager groups by `category` with the
  product's swipe-shelf grammar on phones (`pl8-homerow-flush` is
  already on the grid — grouping is the missing half).
- **Quantity + chip-in state at a glance**: "2 of 3 reserved" and
  the woven chip-in progress line on the manager card (published
  grid has it; the manager should read the same).

### RG.4 — Links in, links out (still no money)

- **Link-out registries stay first-class**: the existing
  registry-links cards (Zola/Amazon/Target lists guests open
  directly) are the right answer for hosts who built elsewhere —
  polish, don't replace.
- **Decision to close: no third-party registry IMPORT** (scraping
  a Zola/Amazon list page into items). ToS-hostile, breaks
  monthly, and the multi-link paste (RG.1) covers the honest
  version of the same wish.
- **De-dupe guard**: pasting a link that matches an existing
  item's `itemUrl` offers "already on your list — edit it?"
  instead of a twin.

### RG.5 — Guest-side polish (small, after the above)

- "Still available" filter chip + most-wanted-first sort on the
  published grid.
- Reserve flow copy tightened: what reserving means ("we'll mark
  it spoken for — you buy it at the store") said once, plainly.
- The registry section's phone presentation joins the cards
  grammar where the layout variant fits (chips/cards variants).

---

## 4 · Sprint blocks

### Block RG-A — RG.1 + RG.2 (the owner's ask) — ✅ SHIPPED 2026-07-09
Goal: adding a gift is one gesture and every item has a face.
Counts as done: shared composer mounted in BOTH the editor panel
and the dashboard manager; paste-URL → rich preview → save;
manual add offers photo-or-plate (bare Image URL input gone);
plate set renders in site tints; broken images confess;
from-url de-dupe guard. tsc/eslint/vitest + phone screenshots.
Skip: shelves, store plates, refresh.
> Landed as `src/components/registry/gift-face.tsx` — the shared
> face system (8 plates via a `plate:<id>` imageUrl sentinel, no
> migration) + link-intake helpers, consumed by
> RegistryItemsManager, RegistryPanel, and RegistryItemsGrid.
> Deviation: the composer is shared HELPERS + one contract
> (paste field → readProductPage → prefill), not one mounted
> component — the two hosts' form stacks (modal fields vs FInput
> atoms) made a literal shared component worse, the drift-proof
> part (URL detect / read / de-dupe / faces) is one module.

### Block RG-B — RG.3 (the card grows up) — ✅ SHIPPED 2026-07-09
Goal: manager cards match the published grid's richness.
Counts as done: store plates + priority pearl + category shelves
+ chip-in/quantity state on manager cards; most-wanted sort.
> Manager: GiftFace faces, store-domain chip, "Most wanted" gold
> pearl on priority='need', category shelves (pl8-homerow-flush
> on phones), need→want→dream sort inside each shelf, multi-unit
> progress bar kept.

### Block RG-C — RG.4 + RG.5 + refresh — ✅ SHIPPED 2026-07-09
Goal: refresh-from-store with price-change confirm; multi-link
paste queue; guest-side filter/sort polish.
> Refresh: per-item "Refresh" (itemUrl only) → from-url re-read →
> confirm dialog naming exactly what changed ("price $X → $Y" /
> "a newer photo") before the PATCH. Queue: 2+ pasted URLs open
> LinkQueue — sequential reads with a 700ms courtesy pause
> (from-url allows 10/min), per-row title/price edit + "Add it",
> failed rows get "Try again", dupes marked. Published grid:
> most-wanted-first sort, "Still available only" chip (shown past
> 6 items with something spoken for), reserve copy line
> ("Reserving marks it spoken for here — you buy it at the
> store."), priority pearl in --t tints.

---

## 5 · Open questions / decisions log

- **Q1 — image search by name?** **Closed: no** (RG.2) — plates +
  host photos; never a scraped guess.
- **Q2 — third-party registry import?** **Closed: no** (RG.4) —
  link-out cards + multi-link paste are the honest version.
- **Q3 — auto price refresh?** **Closed: manual only** with a
  confirm note (RG.2); silent price drift under a host is worse
  than a stale price.
- **Q4 — plate art set**: needs ~10 category drawings in the motif
  language (Pear glyph lineage). Worth a look from the owner after
  Block RG-A ships the first four.

---

*Validation loop per block: tsc → eslint touched → vitest →
/dev/dash-registry + editor RegistryPanel screenshots (desktop +
390px) → commit → push. The money stance is a hard constraint on
every block: no checkout, no held funds, no processing.*
