# Editor Sections — Audit & Improvement Plan

> Produced 2026-07-02 on `claude/post-fable-code-review-lj8e4o`. Plan only — nothing here is implemented.
>
> **Scope:** every section in `PropertyRail.tsx`'s SECTIONS map — the 9 core sections, nav/navMobile, the 3 optional sections (countdown / map / music), and the 13 Event-OS blocks — judged on both the guest-facing variants (`redesign/section-variants/`, `ThemedSite.tsx`, registry in `redesign/layouts.ts`) and the host-facing panels (`editor/panels/`, `editor/panels/blocks/`).
>
> **Method:** full code read of all 27 renderer variant families + 24 panels, plus live screenshots from `/dev/site` (demo manifest, 1440 + 390, `?kit=` knobs) and `/dev/editor` (reference-manifest editor). Screenshots in `docs/audit-shots/editor/`. Bar: Hermès / Linear, per BRAND.md.
>
> **Environment caveats:** external images (R2 / Unsplash demo photos, Google static maps) don't resolve in this sandbox, so photo slots render grey in the shots — layout judgments unaffected. Event-OS blocks aren't in the demo manifest's `blockOrder`, so they were judged from code + the editor fixture rather than published-look screenshots.

---

## The three systemic findings (context for the ranking)

1. **The default variant is a superset; the alternates silently drop host data.** Across schedule / travel / registry / rsvp / story / details, the first (default) variant renders everything the panel can write, and the alternate layouts drop fields — multi-day grouping, Directions links, travel intro + shuttle, registry notes, RSVP social proof, story chips. A host who fills a field and then picks a prettier layout loses content with no warning. This is the single biggest quality gap and it's mostly S-effort per fix.
2. **Occasion voice leaks in fallbacks.** faq / registry / tributeWall / program route copy through `occasionCopyFor`; story-timeline, countdown, music, map, and details icons do not — a memorial or retirement site can surface "We met · We fell · We knew", "Until we celebrate", "Songs for the dance floor", a heart-stamped map, and a gift icon on a parking card.
3. **Reordering is missing exactly where order is meaning.** No reorder for gallery photos, registry stores, FAQ rows (which ship a *decorative* drag glyph), schedule moments, program moments (an order of service!), honorList people (processional order), menu courses, itinerary slots, meal options, hotels. Three panels have partial reorder (itinerary days, vote options, advice seeds) — proof the pattern is cheap once shared.

---

## 1 · Top-10 major improvements (ranked by host-visible impact)

### 1. Variant/data parity — no layout may drop host data  `M total (a bundle of S fixes)`
Make every variant render every field its panel writes. Concretely:
- **Schedule** — lift the Day-N grouping out of `ScheduleBlock` (`ThemedSite.tsx:2435-2504`) into a shared `<ScheduleDays>` wrapper so `timeline` / `stepper` / `numbered` (`section-variants/schedule.tsx`) group multi-day data; render the `addr` → Directions link in all four variants (today `cards`-only, `ThemedSite.tsx:2553`).
- **Travel** — add `intro` + `shuttle` to `TravelCopy` (`src/types.ts:69-80`; `shuttle` isn't even declared) and render both in `map` / `table` / `carousel` (`section-variants/travel.tsx`); today only `rows` shows them (`ThemedSite.tsx:2609, 2673`).
- **RSVP** — move `GoingSocialProof` + the `requestRsvp()`/`editable`-guarded open into the shared `withLoom` path in `RsvpBlock` (`ThemedSite.tsx:2980-3009`) so `split`/`banner`/`minimal` (`section-variants/rsvp.tsx`) stop losing "Show who's going" and stop dispatching raw `pl-open-rsvp`.
- **Registry** — render `s.note` in `chips` / `logowall` (`section-variants/registry.tsx:16-49, 105-156`) or hide the note field when those variants are active.
- **Story** — chips render only in `sidebyside`/`timeline`/`zigzag`; give `stacked`/`quote`/`letter` a quiet meta row, or label in StoryPanel which layouts show them.
- **Gallery slideshow** — remove the `slice(1,7)` thumb cap (`section-variants/gallery.tsx:148-206`) and add stage paging so all 30 photos are reachable.

### 2. Occasion-voice sweep — route hardcoded fallbacks through `occasionCopyFor`  `M`
- `StoryTimeline` fallback `['We met','We fell','We knew']` (`ThemedSite.tsx:2021`) — the worst offender; renders on published non-wedding sites with no chips.
- Countdown eyebrow/label `'The big day' / 'Until we celebrate'` (`ThemedSite.tsx:3250-3251`).
- Music `'The soundtrack' / 'Songs for the dance floor'` (`ThemedSite.tsx:3776-3777`) + GuestPlaylist composer copy (`GuestPlaylist.tsx:321`).
- Map eyebrow `'Where it's happening'` (`ThemedSite.tsx:3491`) + the heart glyph on the postcard stamp (`ThemedSite.tsx:3622`) — swap to a Pear motif / venue initial.
- Details positional icons `['sparkles','users','gift'][i]` (`ThemedSite.tsx:5629`) — see #7.
All copy goes in `redesign/occasion-copy.ts` where the packs already live.

### 3. A shared reorder primitive, rolled across every list panel  `L (primitive) + S per panel`
Build one `useListReorder` / `<RowCard reorder>` affordance in `panels/_section-atoms.tsx` (▲/▼ at minimum; drag optional) and wire it into: SchedulePanel moments, GalleryPanel photos (+ caption reindex), RegistryPanel stores, FaqPanel (the existing `Icon name="drag"` at `FaqPanel.tsx:177` is currently a lie — wire or remove), RsvpPanel meal options, ProgramPanel moments, HonorListPanel people, MenuPanel courses, ItineraryPanel slots, ActivityVotePanel polls, TravelPanel hotels, CostSplitterPanel rows. Program + honorList first — those are the two blocks where sequence *is* the content.

### 4. Ship the promised-but-missing blocks (reunion/baby-shower are hollow)  `L`
`event-types.ts` lists these as **defaults** for beta occasions, yet none exists as a canvas section — a reunion host is promised `rooms + whosWho + thenAndNow` and can add none:
- **`nameVote`** (default: baby-shower, gender-reveal) — cheapest win: `blocks/name-vote.tsx` reusing the live `/api/event-os/votes` backend from activityVote, plus a suggestion-submit composer and a "reveal after you vote" mode. `M`
- **`rooms`** (default: bachelor/ette, reunion) — the data model already exists (`manifest.bachelor.rooms[]`, written by `BachelorPanel.tsx:225`); needs `blocks/rooms.tsx` (variants `assignments` room-cards + guest chips / `board`) + a thin panel mirroring CostSplitterPanel. `M`
- **`whosWho`** — alias to honorList's gate + a `relationships` variant; don't build a new block. `S`
- **`thenAndNow`** (default: retirement, graduation, reunion) — before/after photo pairs; panel = paired `PhotoUploadSlot`s (pattern in HonorListPanel). `M`
- **`groupChat`** — link-out block over the existing `bachelor.groupChatUrl`; livestream is the template (link, never embed). `S`

### 5. Registry honesty — kill the invented progress number  `M`
The `progress` variant (`section-variants/registry.tsx:52-102`) renders a fake `fundPct` the host sets with a slider (`RegistryPanel.tsx:287-298`) — directly above the *real* pledge-driven `RegistryFundCard` bar (`ThemedSite.tsx:2720`). Two progress bars, one invented. Remove `fundPct`/`fundSub` + the slider; redesign `progress` to promote the real honor-ledger fund card as its hero. This is a brand-contract violation ("as shared by guests", never invented) sitting on the money surface.

### 6. Signature-variant pack — moments a template competitor can't copy  `L`
The highest-reach sections have the thinnest variant spreads. Five new/redesigned variants, each leaning on a brand primitive:
- **dressCode `wardrobe`** — the block is default/optional on ~18 occasions and has ONE variant (`layouts.ts:176-178`). Add a photo-example variant ("Wear this" plates with hairline frames) — panel gains paired `PhotoUploadSlot`s. `M`
- **gallery `frames`** — hairline-framed asymmetric editorial layout. BRAND §10 bans unframed symmetric photography; none of the 4 gallery variants uses a frame. `M`
- **hero `crest`** — monogram lockup + letterpress rule, no photo; fills the solemn/formal gap between `minimal` (too plain) and `typographic` (too loud). `M`
- **itinerary `thread`** — evolve `flow` to use the real two-strand `<Thread/>` primitive (today it's a single `--t-accent` line at 0.5 opacity, `blocks/itinerary.tsx:249`). `S`
- **menu `bill-of-fare`** — menu's two variants share one `CourseBlock` (`blocks/menu.tsx:206`) and read as one idea; add a prix-fixe scroll or Plate-kit treatment. `M`
- **registry `storecards`** — rename/rebuild `logowall`, which shows the same gift glyph for every store ("a logo wall with no logos"); favicon/brand-mark per `s.url` or a curated logo map keyed like `_link-targets.ts`. `M`

### 7. Details section overhaul — half the section is dead or fake  `M`
- `DetailsItem.s` subline renders in `iconrow`/`bento` (`section-variants/details.tsx:79, 226`) but `buildCopy` never sets it (`ThemedSite.tsx:5626-5630`) and no panel edits it — dead DOM everywhere.
- The `accordion` variant is a static row list with a decorative chevron (`details.tsx:160`) — it doesn't collapse. Make it a real accordion; the expanded body finally gives `s` a home.
- Icons are positional, not semantic — add a label→icon map (Parking→car, Dress→hanger) + an icon picker in DetailsPanel.
- The invisible 3-card cap (`DetailsPanel.tsx:178` — the Add button just vanishes) should rise, esp. for `bento` which wants 4-6 tiles; `plusOnesWelcome` is an orphan write (no renderer) — wire or drop.
- New `ledger` variant: a quiet ruled label/value list for almanac/quiet editions (all four current variants force circular icon chrome).

### 8. Pear where the host is most stuck + moderation parity  `M`
- **Zero inline Pear in all 13 block panels** — the product's core promise is least present where hosts stall. Start with **ObituaryPanel** (a grieving host at an empty remembrance box is pointed *away* to the Memorial workspace, `ObituaryPanel.tsx:56`); then AdviceWall/TributeWall prompt drafting and MenuPanel.
- **AdviceWallPanel has no moderation link** (`AdviceWallPanel.tsx:90`, hint text only) while TributeWallPanel ships the full `/dashboard/submissions` link pattern (`TributeWallPanel.tsx:72-94`) — same backend, copy the affordance. `S`
- **`BlockEmpty`** (`section-variants/blocks/_shared.tsx:81`) says "Nothing here yet — open the panel to begin" — off the mandated BRAND §7 key ("Nothing yet. Begin a thread."), and it's the empty state 11 of 13 blocks show hosts. `S`
- Merge the duplicate toggles hosts must decode: `music.suggestions` vs `rsvpConfig.songRequests` (adjacent in `MusicPanel.tsx:132,155`, also in `RsvpPanel.tsx:118` under a different label) and GalleryPanel's `guestUploads` vs `galleryUploads` (`GalleryPanel.tsx:150,176`). `S`

### 9. Thread + token hygiene sweep  `S-M total`
- **Two of six heroes ship without the thread atom**: `fullbleed` (`ThemedSite.tsx:1711`) and `typographic` (`ThemedSite.tsx:1749`) have no KDivider — and fullbleed hardcodes `#fff` over a fixed dark scrim, ignoring theme tokens, and silently drops the secondary CTA.
- **`--t-font-display` → `--t-display`**: countdown + music are the only blocks using the wrong token name (`ThemedSite.tsx:3262, 3787` et al.) — silent browser-serif fallback.
- **Dark-mode hex hardcodes**: gallery `polaroid` `#fffdf7` (`gallery.tsx:210-269`), countdown `flip` white fallback + dead hidden span (`ThemedSite.tsx:3421-3425`), rsvp `split`'s fixed lavender gradient `#c8b6e8→#9b88c9` (`rsvp.tsx:55` — should be the cover photo or a `--t-*` mat), music `jukebox` full-hex club palette (`ThemedSite.tsx:3879-3913` — map gold to `--t-gold`, plate to a `--t-*` dark token). Editorial midnight, not OLED (BRAND §10).

### 10. Long-content resilience — sections that break at real scale  `M`
- FAQ `twocol`/`cards` render every answer open — a wall of text at 12 questions (`section-variants/faq.tsx:87-128, 186-235`); add collapse or cap-and-"show all", and set `cards`' bold-sans question in `--t-display` italic like its siblings.
- Schedule `stepper` is one endless horizontal scroll at 15 moments (`schedule.tsx:89`) — wrap or vertical fallback past ~5.
- Countdown `flip` wraps unbalanced at 390 (see `site-hero-390.png` — seconds orphan onto a second row).
- Map `static` is a lie — it's the full iframe with `pointer-events:none` (`ThemedSite.tsx:3665-3700`); its own comment promises a load-fail pin fallback that doesn't exist. Make it a real static image or cut it.
- Countdown should be able to target a date other than the hero date (count to the welcome dinner); `CountdownPanel` is 65 lines and correct but can't do this.

---

## 2 · Per-section table

Effort: S ≤ half-day · M 1-2 days · L ≥ 3 days. "✓" = ships at the bar today.

| Section | Guest-side verdict + fix | Panel verdict + fix | Effort |
|---|---|---|---|
| **hero** | 6 variants, 4 strong (`postcard` best). `fullbleed`/`typographic` drop the thread + secondary CTA; fullbleed hardcodes #fff. Add `crest` monogram variant for solemn/formal. | Strong (disclosures, cover nudge). `milestone` renders only in `centered` (`ThemedSite.tsx:1518`) — gate the field or render everywhere; explain that the centered photo strip pulls from Gallery. | S (thread/CTA) · M (crest, milestone) |
| **story** | 6 genuinely distinct variants; `timeline` is best but its `'We met…'` fallback is couple-coded (`ThemedSite.tsx:2021`) — occasion bug. Chips invisible on 3 of 6 layouts. Add `newspaper` drop-cap columns for long/obituary-length stories. | Best core panel (Pear draft/refine, tone chips, chapters). Chips-as-chapters cap mismatch (4th chip renders a rail row with no editable body, `StoryPanel.tsx:529` vs `ThemedSite.tsx:2057`); no chip/chapter reorder. | S (fallback, cap) · M (newspaper) |
| **details** | Weakest core section: dead `s` subline in `iconrow`/`bento`, static fake `accordion`, positional icons. Real accordion + icon map + `ledger` variant. | Thinnest core panel: add subline + icon picker; raise/explain the invisible 3-card cap; `plusOnesWelcome` is an orphan write. | M (overhaul) |
| **schedule** | `cards` complete (multi-day, Directions, editable); other 3 lose day grouping + Directions — silent data loss. `stepper` breaks past ~5 items. | Strongest data panel (templates, Build-from-notes, MiniTimeline). No manual moment reorder; warn when multi-day data meets a variant that can't show it. | S (parity) · M (grouping wrapper, reorder) |
| **travel** | `map` variant (real projection, gold pins) is the most premium thing in the audit — promote to an edition default. `intro`+`shuttle` render only in `rows`; `carousel` weakest (replace with `postcard` stays). | Best-integrated panel (Places search, find-hotels-near-venue). No manual hotel entry (boutique inn / Airbnb block can't be added) and no reorder. | S (intro/shuttle) · M (manual entry, postcard) |
| **registry** | `cards` premium; `progress` renders an **invented** fundPct beside the real honor ledger — honesty fix #5; `logowall` has no logos; `chips`/`logowall` drop notes. Shared RegistryItemsGrid/FundCard are excellent. | Strongest panel (URL prefill, live spoken-for). Remove `fundPct` slider; note field should hide on variants that drop it; no store reorder. | S (notes, slider) · M (progress redesign, storecards) |
| **gallery** | `grid`/`masonry` good; `slideshow` caps at 7 photos (half-built); `polaroid` hardcodes light-mode hex. Add `frames` hairline-framed editorial variant (the missing on-brand idea). | Clean uploads but **no photo reorder** and one-at-a-time upload — the two most-felt gaps at 30 photos. Merge duplicate guest-upload toggles. | M (reorder+multi-upload, frames) · S (hex) |
| **rsvp** | Default plate complete (Loom, social proof, safe open). `split` = hardcoded lavender gradient ignoring palette/photos; social proof + `requestRsvp()` guard lost on all 3 alternates. Add real "RSVP by {date} · N replied" microline. | Rich (auto reply-by, live meal counts, Loom toggle). Custom questions explicitly stubbed (`RsvpPanel.tsx:120-122`) — the real gap for non-wedding events; no meal-option reorder. | S (split mat) · M (parity) · L (custom questions) |
| **faq** | Default accordion good; `numbered` on-brand; `twocol`/`cards` unusable at 12 questions (all answers open); `cards` breaks the Fraunces voice. | Best-in-class Pear (bulk "Draft all N unanswered"). Drag glyph is decorative — wire or remove; `add()` seeds literal `'New question'`; link "3 waiting" guest questions to Submissions. | S (voice, seed) · M (collapse, reorder) |
| **countdown** | 6 variants, `hero` wall-of-numbers best. Copy hardcoded ("Until we celebrate") — occasion sweep; `ribbon` notch trick breaks on dark accents; `flip` has dead code + white hardcode and wraps badly at 390. `--t-font-display` bug. | Deliberately small and honest. Add occasion label suggestions + a "count to a different date" field. | S (tokens, copy) · M (alt date) |
| **map** | Healthiest variant set (4 of 5 distinct; `postcard` a keepsake). `static` is a fake (iframe with clicks off); heart stamp wrong for memorials; no second venue (ceremony + reception). | Good (address override, live echo). Height setting silently ignored by `split` (`minHeight:320` hardcode); add second-venue support. | S (stamp, height) · M (static, 2nd venue) |
| **music** | `jukebox` striking but all-hex (token-ize gold/plate); dance-floor copy hardcoded — occasion sweep. Shared GuestPlaylist is the strongest guest component in the product. | Strong (provider auto-detect). Two near-identical suggestion toggles to merge; add live "N suggestions waiting" count; embed preview before publish. | S (tokens, toggles) · M (copy, counts) |
| **menu** | Two variants share one `CourseBlock` — weakest spread on a block ~21 occasions get. Add `bill-of-fare` / Plate-kit variant. Dietary chips + honesty gating done right. | Course→dish nesting good; **no course reorder** (menus are a sequence); no Pear draft. | S (reorder) · M (variant) |
| **dressCode** | ONE variant for a block on ~18 occasions — the reach/investment mismatch of the set. Add `wardrobe` (photo examples in hairline frames) + `swatches`. | Genuinely good for scope (occasion suggestions, real color wells, no mismatches). Gains photo slots with the wardrobe variant. | M (wardrobe) · S (swatches) |
| **tributeWall** | Reference block — moderated, solemn/celebratory copy routed, honesty-gated demos, on-brand empty states. Leave alone. | The moderation gold standard (real Submissions link). Pattern-donor for adviceWall. | — |
| **itinerary** | 3 real ideas; `flow`'s thread should be the two-strand `<Thread/>`; `tickets` could earn the ticket kit harder. Best kit-awareness in the set. | Day reorder ✓ but slot reorder ✗; no Pear ("draft a Friday"). | S (slots) · M (thread) |
| **costSplitter** | Correct math, real mobile collapse. No "I've settled" acknowledgment (packingList's localStorage pattern fits); USD hardcoded. | `WhoPaidField` payer-reuse is lovely. No row reorder; add currency field. | S each |
| **activityVote** | Reference interactive implementation (live API, optimistic, honest fallback). Add reveal-after-vote + poll close/deadline (both feed nameVote). | Option reorder ✓, poll reorder ✗. Add Pear option suggestions. | S (reorder) · M (reveal/close) |
| **toastSignup** | `list`'s dotted gold leader is editorial and lovely; 409 handling warm and correct. Add guest "release my claim". | Occasion-routed placeholders + seed-4-slots starter. Solid. | S |
| **adviceWall** | 3 distinct variants (`letters` drop cap is on-brand); correct empty-state key. Extend paper-grain onto the wall scraps. | **No moderation link** while tributeWall has one — copy `TributeWallPanel.tsx:72-94`. Seed reorder ✓. No Pear prompt drafting. | S |
| **program** | Solemn discipline done right (roman leaders, gold nodes, no chips). Verify `centerline` on ≤400px. | **No moment reorder on an order of service** — the most order-critical block has the weakest sequencing. Fix first. | S |
| **livestream** | Most technically sophisticated (tz countdown, Live-now pulse, link-out rationale). Optional `chapel` variant for funerals (play-medallion reads party). | "Test link" is genuinely thoughtful. Clean. | M (chapel, optional) |
| **obituary** | The most restrained, most on-brand surface in the product. Keep hands off; verify justify/hyphens rivers on tablet. | Correct thin editor over `memorial.obituary`, but the **highest-value inline-Pear gap** — a grieving host is pointed away instead of helped in place. | M (Pear) |
| **packingList** | localStorage-only by documented design (correct); check-pop is nice motion. Optional kraft card back for bachelor kit. | Category grouping + rename-retags done well. | S (optional) |
| **honorList** | 3 distinct variants; smart side-derivation, but "Her people / His people" fails two-bride/two-groom weddings — neutral or host-editable group labels. | Real photo support ✓, role presets ✓, **no people reorder** despite `order:i` being written from array position. | S each |
| **nav / navMobile** | 5 + 4 variants, out of this audit's core scope; no data-loss findings surfaced. | Layout lives on the on-canvas "≡ Layout" bar (correct call — `PropertyRail.tsx:698`). | — |
| **thenAndNow / whosWho / rooms / nameVote / groupChat** | **Do not exist** as canvas sections despite being `defaultBlocks` for beta occasions in `event-types.ts` (`rooms`/`groupChat` even have data models in `BachelorPanel.tsx`). See improvement #4. | — | S-M each (see #4) |

---

## 3 · Build order

### Wave 1 — Correctness & honesty (1-2 sessions, almost all S)
The silent-data-loss and brand-contract fixes. No new surface area; every item is verifiable with existing tests + `/dev/site`.
1. Story timeline occasion fallback (`ThemedSite.tsx:2021` → `occasionCopyFor`).
2. Registry `fundPct` removal + `progress` promotes the real fund card (`registry.tsx:52-102`, `RegistryPanel.tsx:287-298`).
3. RSVP parity: `GoingSocialProof` + guarded `requestRsvp()` into the shared path (`ThemedSite.tsx:2960-3010`, `rsvp.tsx:8-11`).
4. Schedule Directions link + Travel `intro`/`shuttle` into all variants (types change in `src/types.ts` + `schedule.tsx`/`travel.tsx`).
5. Registry notes on `chips`/`logowall`; gallery slideshow un-cap.
6. Thread on `fullbleed`/`typographic` heroes + fullbleed theming/secondary CTA.
7. Token sweep: `--t-font-display`→`--t-display`; dark-mode hexes (polaroid, flip, jukebox, rsvp-split mat).
8. `BlockEmpty` brand copy (`_shared.tsx:81`); AdviceWallPanel submissions link; FAQ drag-glyph + `'New question'` seed; map `static` honesty (fix or cut).

### Wave 2 — Host ergonomics & Pear (2-3 sessions)
1. Shared reorder primitive in `_section-atoms.tsx`, rolled out in priority order: program → honorList → menu courses → gallery photos → schedule → FAQ → registry → the rest.
2. Gallery multi-file upload; duplicate-toggle merges (music/RSVP song fields, gallery guest-upload pair).
3. Details overhaul (#7): real accordion, icon map + picker, subline field, raise the card cap, `ledger` variant.
4. Schedule day-grouping wrapper for all variants; FAQ collapse for `twocol`/`cards`; stepper wrap; countdown flip mobile fix + alternate-date field.
5. Inline Pear: ObituaryPanel first, then adviceWall/tributeWall prompts, menu draft.
6. Occasion-voice sweep for countdown/map/music (needs copy-pack entries in `occasion-copy.ts`; pairs naturally with #4's copy work).

### Wave 3 — New surface: signature variants + missing blocks (3-4 sessions)
1. `nameVote` block (vote API reuse + reveal-after-vote from Wave 2's activityVote work) — unblocks baby-shower/gender-reveal defaults.
2. `whosWho` alias variant on honorList + neutral side labels; `groupChat` link-out block.
3. `rooms` canvas block over `manifest.bachelor.rooms[]`; `thenAndNow` paired-photo block.
4. Signature variants: dressCode `wardrobe` (photos + panel slots), gallery `frames`, hero `crest`, itinerary `thread`, menu `bill-of-fare`, registry `storecards`.
5. Travel manual-hotel entry + `postcard` stays variant; map second venue; RSVP custom questions (the one L; scope carefully — presets already cover most occasions).

Each wave ends with: `npx tsc --noEmit` → eslint on touched files → `npx vitest run` → screenshot pass on `/dev/site` (1440 + 390, plus `?kit=` spot checks) and `/dev/editor?occasion=memorial` for the solemn-voice paths.

---

## Appendix — screenshots (docs/audit-shots/editor/)

| File | Shows |
|---|---|
| `site-hero-1440.png` | Centered hero + split nav + flip countdown (demo photo grey — env). |
| `site-hero-390.png` | Mobile hero; flip countdown wrapping unbalanced (seconds orphan row). |
| `site-schedule-1440.png` | Schedule `cards` default with Day-N grouping — the superset variant. |
| `site-schedule-kit-ticket-1440.png` | Same section under `?kit=ticket` — kit CSS working; cramped title wraps in narrow stubs. |
| `site-travel-1440.png` | Travel `rows` + shuttle callout; 3-hotel orphan hole in the 2-col grid; map `postcard` broken-image (static map, env). |
| `site-registry-1440.png` | The fund card with the honest "64% funded" bar — the real bar the fake `fundPct` duplicates. |
| `site-rsvp-1440.png` | Default RSVP inverse plate (the only variant with social proof + safe open). |
| `site-countdown-flip-1440.png` | Flip variant at 1440. |
| `editor-schedule-panel-1600.png` | Schedule panel: Day-shape MiniTimeline, per-moment fields, Build-from-notes — and no reorder handles. |
| `editor-schedule-design-tab-1600.png` | The rail's Design tab = whole-site look; per-section layout lives on the on-canvas Layout bar. |
