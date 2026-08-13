# Wizard Sections — "What should your site hold?" Plan

> Produced 2026-07-03 on `claude/post-fable-code-review-lj8e4o`. **Plan only — nothing here is implemented.**
>
> **Goal:** give the host a fast, on-brand wizard step to CHOOSE which sections their site starts with and a good layout for each — pre-checked to the occasion's smart defaults so a host can one-tap through, but able to remove what they don't want and pick a signature layout for what they do. This cuts the time otherwise spent in the editor's Add-Section picker + Layout bar.
>
> **Read first:** `BRAND.md` (§3 thread/paper/letterpress, §7 microcopy, §9 layered chrome), `CLAUDE-DESIGN.md` §4 (look system) + §8 (wizard), `CLAUDE-PRODUCT.md` §5 (the event×block matrix), and `docs/EDITOR-SECTIONS-PLAN.md` (what each layout variant looks like + the audit-shots under `docs/audit-shots/editor/`).
>
> **Companion contract:** this reuses the exact gates the editor + renderer already ship — `section-applicability.ts` (`isCoreSectionApplicable`, `sectionHasContent`), `EditorRedesign.isBlockApplicable`, `redesign/layouts.ts` (`LAYOUTS`, `DEFAULT_VARIANT`, `recommendedVariantFor`, `EDITION_LAYOUT_DEFAULTS`). Nothing here forks the section model; it front-loads the choice.

---

## 0 · The current state (why this is a real gap)

Today the wizard (`WizardV8.tsx`) never asks about sections. At `handleFinish` (line ~2279) it assembles a manifest with **no explicit `blockOrder`**. The renderer (`ThemedSite.tsx:592-640`) then:

1. Falls back to `coreKinds = [hero, story, details, schedule, travel, registry, gallery, rsvp, faq]` when `blockOrder` is empty, and
2. **Re-appends every missing core section** (`ThemedSite.tsx:613-616`), then
3. Gates each core section by `isCoreSectionApplicable(occasion)` OR `sectionHasContent` (`:637-640`).

So the host lands in the editor with "whatever the occasion's core gate allows," in a fixed order, every layout at its `DEFAULT_VARIANT`. Optional/Event-OS blocks (`countdown`, `menu`, `itinerary`, `honorList`, …) are **never present** unless `seedSectionsFromWizard` happens to add one (countdown/music/honorList only) or the host hunts for the Add-Section picker. A bachelor host promised `itinerary + costSplitter + rooms` sees none of them; a memorial host has to add `obituary + program + tributeWall` by hand.

**The opportunity:** the occasion already declares its ideal set (`EVENT_TYPES[occasion].defaultBlocks / optionalBlocks / hiddenBlocks`) and the best layout per section is already computable (`recommendedVariantFor`). The wizard just has to surface it as a choice and write it down.

---

## 1 · The UX

### 1.1 Placement — a new step, `Sections`, inside the **Look** phase

`STEPS` (WizardV8.tsx:55) becomes:

```
Occasion → Basics → Details → Day → Photos → Sections → Vibe → Palette → Review
```

`PHASES` (WizardV8.tsx:63) gains it under **Look** (so the phase header reads "Look · 1 of 3"):

```ts
{ key: 'Look', steps: ['Sections', 'Vibe', 'Palette'] },
```

**Why here, not earlier:** the host has just finished Story + Photos + Day, so we know the occasion, the date, whether they added hotels/registry/playlist (which pre-check Travel/Registry/Music with *real* content already attached), and whether they uploaded photos (pre-check Gallery honestly). Sections then flows straight into Vibe/Palette/Review, where the fitting-room preview already renders the chosen set live. It sits **before** Vibe so the look phase reads "what's on the page → how it feels → what color it is."

### 1.2 The screen — "the table of contents, laid out on paper"

Title (Fraunces display, `.pl-letterpress`): **"What should your site *hold*?"** Subhead (Geist): "Pear picked what fits a {occasion label}. Tap to add or set aside — you can change everything later." A mono-caps eyebrow with a gold rule leads it, per BRAND §4.

Two groups, each a mono-caps section label with a `<Thread />` divider beneath (BRAND §3 thread-as-atom):

- **ESSENTIALS** — the occasion's `defaultBlocks`, pre-checked (ON).
- **NICE TO HAVE** — the occasion's `optionalBlocks`, pre-unchecked (OFF).

Hidden blocks (`hiddenBlocks` + non-applicable sections) never appear — no "registry" on a bachelor party, no "countdown" on a funeral.

Each section is a **card** (`<SectionCard>`), not a checkbox row:

```
┌────────────────────────────────────┐
│ [mini-preview]        Schedule   ●  │   ← ● = on/off pearl toggle (BRAND Pearl)
│ [thumbnail of the     Day-of timeline│
│  layout variant]      ─────────────  │
│                       Timeline  ▾    │   ← 1-tap layout chooser (default = recommended)
└────────────────────────────────────┘
```

- **Toggle:** tapping the card body toggles on/off. On = olive border + `pl-pearl-accent` dot + paper fills warm (`--pl-olive-mist`); off = hairline border, muted. Reuse the exact selected-tile treatment from `OccasionPicker`'s `tile()` (WizardV8.tsx:862-935) so it feels like the same wizard.
- **Layout chooser:** a compact pill (`▾ Timeline`) under the label. Tapping expands an inline row of 2-4 variant thumbnails (the section's `LAYOUTS[section]` entries) — the recommended one carries a **gold pearl** (mirrors the on-canvas Layout bar's recommendation mark, `EDITOR-SECTIONS-PLAN` #6 / `layouts.ts:281`). Default selection = `recommendedVariantFor(section, occasion) ?? EDITION default ?? DEFAULT_VARIANT[section]`. Most hosts never open it — the default is already the right one. Collapsed by default to keep the screen a one-glance list.
- **Mini-preview thumbnail:** see §4.4 — a lightweight static SVG/CSS glyph of the variant, NOT a live `ThemedSite` render (cost + scroll reasons). The live full-site preview stays where it already is: the fitting room, one step later.

**Fast path (the point):** every essential is pre-checked at its best layout. The primary button reads **"Looks right → "** and the host can tap it in one second. A quiet secondary link, **"Let Pear decide"**, skips the step entirely (writes nothing — identical to today's behavior). No host is ever forced to curate.

**On-brand, not a form:** paper ground, thread dividers between groups and under each group header, Fraunces labels, mono-caps eyebrows with gold rules, the pearl toggle as the "on" atom. No checkboxes, no switches, no "0 selected" counter. Cards cascade in with the existing `pl-cascade-row` stagger (used by `OccasionPicker`). Reduced-motion honored.

### 1.3 Mobile-first

The wizard is heavily phone-used. On ≤640px:

- Cards are **full-width, single column**, ~72px tall (thumbnail left 56px, label + toggle right). Thumb-reachable pearl toggle on the trailing edge.
- The layout chooser expands as a **horizontal scroll strip** of variant thumbnails below the tapped card (same pattern as `EditorThemeShop`'s pack strip), not a dropdown menu.
- Group headers stick (`position: sticky`) so ESSENTIALS / NICE TO HAVE stay oriented while scrolling.
- Count of cards is bounded (see §5 risk) — essentials cap at ~10, nice-to-have collapses behind "Show N more" past the first 4.

### 1.4 Copy (BRAND §7)

- Never "sections" as a cold noun in the toggle — the card label IS the plain word (`Schedule`, `Menu`, `Travel`) per BRAND §7 plain-control-labels.
- Empty/none state (host turned everything off): "A quiet site — just your opening. Add a thread any time." (never "No sections").
- Layout chooser recommended mark tooltip: "Pear's pick for a {occasion}."

---

## 2 · Per-occasion section sets

### 2.1 The derivation rule (authoritative — do not hand-maintain 28 lists)

The chooser is built over **canvas `SectionId`s**, and each section's offered/pre-checked/hidden state is *derived* from the occasion via the gates that already exist. This is the single most important design decision: **reuse the gates, don't re-encode the matrix.**

Add one leaf module `src/lib/event-os/wizard-sections.ts` exporting:

```ts
// SectionId → the EVENT_TYPES BlockType id(s) that gate it.
// Unifies section-applicability.CORE_SECTION_BLOCK_GATES,
// EditorRedesign.BLOCK_GATE_ALIASES, and the optional sections.
export const SECTION_GATE: Record<string, readonly string[] | null> = {
  hero: null, details: null,          // always essential (no card / pinned card)
  story: ['story'],
  schedule: ['event'],                // UNIVERSAL → every occasion
  travel: ['travel'],
  registry: ['registry'],
  gallery: ['gallery', 'photos'],     // UNIVERSAL 'photos' → every occasion
  rsvp: ['rsvp'],
  faq: ['faq'],
  countdown: ['countdown'],
  map: ['map'],
  music: ['spotify'],
  // Event-OS blocks — direct, plus honorList's aliases:
  honorList: ['weddingParty', 'whosWho'],
  itinerary: ['itinerary'], costSplitter: ['costSplitter'],
  activityVote: ['activityVote'], toastSignup: ['toastSignup'],
  adviceWall: ['adviceWall'], program: ['program'],
  livestream: ['livestream'], obituary: ['obituary'],
  packingList: ['packingList'], tributeWall: ['tributeWall'],
  menu: ['menu'], dressCode: ['dressCode'], nameVote: ['nameVote'],
  rooms: ['rooms'], thenAndNow: ['thenAndNow'], groupChat: ['groupChat'],
};

export interface WizardSectionOffer {
  section: string;          // canvas SectionId
  label: string;            // from SectionRail SECTIONS/OPTIONAL/BLOCK defs
  group: 'essential' | 'optional';
  defaultOn: boolean;       // essential → true
  variant: string;          // recommendedVariantFor ?? edition ?? DEFAULT_VARIANT
  variants: LayoutVariant[]; // LAYOUTS[section]
  recommended?: string;     // recommendedVariantFor(section, occasion)
}

export function wizardSectionsFor(occasion: string, edition?: string): WizardSectionOffer[];
```

`wizardSectionsFor(occasion)` logic per section in a canonical order (§2.3):

- Resolve gate `g = SECTION_GATE[section]`.
- `null` → always **essential** (hero is pinned/not a card; details is an essential card).
- Else look at `EVENT_TYPES[occasion]`: if any of `g` ∈ `defaultBlocks` → **essential** (default ON); else if any ∈ `optionalBlocks` → **optional** (default OFF); else → **hidden** (skip — this catches `hiddenBlocks` and anything not listed).
- `variant = recommendedVariantFor(section, occasion) ?? EDITION_LAYOUT_DEFAULTS[edition]?.[section] ?? DEFAULT_VARIANT[section]`.
- Labels come from the existing `SectionRail` defs (`SECTIONS`, `OPTIONAL_SECTIONS`, the block list at SectionRail.tsx:38-146) — export those as a shared `SECTION_META` map so the wizard and rail can't drift.

This means **the §5 CLAUDE-PRODUCT matrix is honored automatically** because `EVENT_TYPES` already encodes it. Adding an occasion or moving a block between default/optional needs zero wizard changes.

### 2.2 Pre-checked (essential) sections, all 28 occasions

Derived from `EVENT_TYPES[*].defaultBlocks` via the rule above. **`Details`, `Schedule`, `Gallery` are essential for every occasion** (details = always-on gate; schedule/gallery = UNIVERSAL `event`/`photos`) — omitted from each row below for brevity; only the occasion-specific essentials are listed.

| Occasion | Essential (pre-checked) beyond Details/Schedule/Gallery | Notes / gaps |
|---|---|---|
| wedding | Story, Countdown, RSVP, Registry, Travel, FAQ, Honor list, Map | `guestbook` default → feature toggle, no canvas card (GAP) |
| engagement | Story, Countdown, RSVP, Map, FAQ | |
| anniversary | Story | `anniversary`, `quote`, `guestbook` blocks have no canvas section (GAP) |
| birthday | Countdown, RSVP, Map | |
| story | Story | |
| bachelor-party | Countdown, RSVP, Itinerary, Cost splitter, Group vote, Packing list, Rooms, FAQ | `privacyGate` → Privacy tool panel, offered as a toggle not a card |
| bachelorette-party | Countdown, RSVP, Itinerary, Cost splitter, Group vote, Packing list, Rooms, Dress code, FAQ | |
| bridal-shower | Countdown, RSVP, Registry, Advice wall, Dress code, Menu, Map, FAQ | |
| bridal-luncheon | RSVP, Menu, Map, Dress code | |
| rehearsal-dinner | RSVP, Toast signup, Menu, Dress code, Map, FAQ | |
| welcome-party | Itinerary, RSVP, Map, Dress code, FAQ | |
| brunch | Menu, Map, RSVP | |
| vow-renewal | Story, Countdown, RSVP, Map | `anniversary`, `quote`, `guestbook` GAP |
| baby-shower | Countdown, RSVP, Registry, Advice wall, Name vote, Menu, Dress code, Map, FAQ | |
| gender-reveal | Countdown, RSVP, Map, Name vote | Name vote default variant = `tiles` (recommended) |
| sip-and-see | RSVP, Menu, Map, FAQ | |
| housewarming | RSVP, Registry, Map, Dress code, Menu, FAQ | |
| first-birthday | Countdown, RSVP, Advice wall, Menu, Map, FAQ | |
| sweet-sixteen | Countdown, RSVP, Dress code, Music, Map, FAQ | `hashtag` GAP |
| milestone-birthday | Story, Countdown, RSVP, Toast signup, Tribute wall, Music, Map, FAQ | |
| retirement | Story, RSVP, Toast signup, Tribute wall, Advice wall, Then & now, Map, FAQ | |
| graduation | Story, RSVP, Tribute wall, Then & now, Map, FAQ | |
| bar-mitzvah | Story, Countdown, RSVP, Program, Honor list, Dress code, Menu, Map, FAQ | Honor list serves `whosWho`/candle-lighters |
| bat-mitzvah | Story, Countdown, RSVP, Program, Honor list, Dress code, Menu, Map, FAQ | |
| quinceanera | Story, Countdown, RSVP, Program, Honor list, Dress code, Menu, Music, Map, FAQ | Honor list = court of honor |
| baptism | RSVP, Program, Honor list, Dress code, Menu, Map, FAQ | Hero default = `crest` (recommended) |
| first-communion | RSVP, Program, Dress code, Menu, Map, FAQ | Hero `crest` |
| confirmation | RSVP, Program, Dress code, Menu, Map, FAQ | Hero `crest` |
| memorial | Story, Obituary, Program, Tribute wall, Map, Livestream, FAQ | Hero `crest`, Obituary `card`; Countdown hidden |
| funeral | Obituary, Program, Map, Livestream, FAQ | Hero `crest`, Obituary `card`; Countdown hidden |
| reunion | Itinerary, RSVP, Rooms, Honor list, Then & now, Map, FAQ | Honor list = who's who |

Offered-but-unchecked (`optionalBlocks`) and hidden (`hiddenBlocks`) fall straight out of the same rule — see each occasion's `EVENT_TYPES` entry. No separate table needed; the module derives them.

### 2.3 Canonical section order (for `blockOrder`)

Selected sections write into `blockOrder` in this fixed order so a site reads coherently regardless of pick order (hero is pinned by the renderer, never in `blockOrder`):

```
story, obituary, details, schedule, program, itinerary, travel, rooms,
menu, dressCode, registry, gallery, thenAndNow, honorList, tributeWall,
adviceWall, nameVote, activityVote, toastSignup, costSplitter, packingList,
countdown, map, music, livestream, groupChat, rsvp, faq
```

Rationale: story/obituary open, logistics in the middle, gallery/people/interactive in the body, RSVP + FAQ close (RSVP near the end matches the default-plate placement; FAQ last). This supersedes `wizard-seed.CORE_ORDER` — export it as `SECTION_ORDER` from `wizard-sections.ts` and have both the wizard and `seedSectionsFromWizard`/`bastings.blockOrderWith` reference it (they currently hardcode the old 8-item `CORE_ORDER`).

### 2.4 Default layout per section per occasion (`recommendedVariantFor` overrides)

Base = `DEFAULT_VARIANT` (layouts.ts:222). The only occasion-specific overrides today (`VARIANT_RECOMMENDATIONS`, layouts.ts:281) — the chooser pre-selects these and marks them with the gold pearl:

| Section | Recommended variant | Occasions |
|---|---|---|
| hero | `crest` | memorial, funeral, baptism, first-communion, confirmation |
| gallery | `frames` | wedding, vow-renewal, anniversary, rehearsal-dinner |
| menu | `bill-of-fare` | rehearsal-dinner, wedding, retirement, bar-mitzvah, bat-mitzvah, quinceanera |
| dressCode | `wardrobe` | wedding, quinceanera, sweet-sixteen, bar-mitzvah, bat-mitzvah |
| obituary | `card` | memorial, funeral |
| nameVote | `tiles` | gender-reveal |

Everything else uses `DEFAULT_VARIANT[section]`. **Recommended follow-up (out of scope but noted):** `VARIANT_RECOMMENDATIONS` is deliberately thin — this step is the reason to grow it (e.g. `schedule: timeline` for reunions, `story: letter` for anniversaries, `itinerary: thread` for bachelor/ette). Adding entries there automatically improves the wizard defaults with zero wizard code change.

---

## 3 · Data flow — selections → manifest

### 3.1 New wizard state

Add to `WizardState` (WizardV8.tsx:257):

```ts
/** Section chooser. undefined = host skipped ("Let Pear decide") →
 *  identical to today's behavior (no blockOrder/hiddenSections written). */
sectionPicks?: {
  /** Selected canvas SectionIds, in the host's on/off state. */
  on: string[];
  /** Per-section layout variant the host landed on (default = recommended). */
  layouts: Record<string, string>;
};
```

Seed `sectionPicks` when the host **first lands on the Sections step** (not before — so occasion changes upstream re-derive it): `on = essentials`, `layouts = { [section]: offer.variant }` from `wizardSectionsFor(st.occasion, st.editionPick)`. Re-derive if `st.occasion` changed since last seed (guard with a ref, like the existing `stRef` mirror).

### 3.2 The critical renderer subtlety — deselection needs `hiddenSections`

**This is load-bearing.** `ThemedSite.tsx:613-616` re-appends any core section missing from `blockOrder`:

```ts
const reorderedRest = [
  ...savedOrder.filter(valid),
  ...coreKinds.filter((k) => k !== 'hero' && !savedOrder.includes(k)),  // ← auto-append
];
```

So **omitting a core section from `blockOrder` does NOT remove it** — it comes back (then gets gated by applicability/content). To honor a host turning an *essential* section OFF, the finish assembly must add it to `manifest.hiddenSections` (read at `ThemedSite.tsx:591`, filtered at `:635`). Optional/Event-OS sections are the opposite: they only render when present in `blockOrder`, so turning one ON = add to `blockOrder`, turning it OFF = omit.

### 3.3 Finish assembly (in `handleFinish`, after `seedSectionsFromWizard`, before the STRUCTURE picks at WizardV8.tsx:2467)

```ts
if (st.sectionPicks) {
  const offers = wizardSectionsFor(st.occasion, st.editionPick);
  const onSet = new Set(st.sectionPicks.on);

  // 1. blockOrder = every selected non-hero section, in canonical order.
  const selected = SECTION_ORDER.filter((s) => onSet.has(s));
  manifest.blockOrder = mergeBlockOrder(manifest.blockOrder, selected);
  // mergeBlockOrder: seed may have already appended countdown/music/
  // honorList — keep host picks authoritative, union in seed adds that
  // carry real content, dedupe, re-sort by SECTION_ORDER.

  // 2. hiddenSections = essentials the host turned OFF (so the
  //    renderer's auto-append can't resurrect them).
  const coreKinds = ['story','details','schedule','travel','registry','gallery','rsvp','faq'];
  const hiddenOff = coreKinds.filter((s) => !onSet.has(s) && offers.some((o) => o.section === s));
  if (hiddenOff.length) {
    manifest.hiddenSections = Array.from(new Set([
      ...((manifest.hiddenSections as string[] | undefined) ?? []),
      ...hiddenOff,
    ]));
  }

  // 3. Per-section layout variants → manifest.layouts (merge under
  //    what applyWizardLook + the STRUCTURE picks already wrote; host
  //    section-variant picks win over the LAYOUT_TO_VARIANTS map but
  //    the explicit nav/hero fitting-room picks below still win over
  //    these — same precedence order as the editor).
  manifest.layouts = {
    ...((manifest.layouts as Record<string,string> | undefined) ?? {}),
    ...st.sectionPicks.layouts,
  };
}
```

**Ordering vs. existing finish steps (important):**
1. `applyWizardLook` (2413) writes `layouts` from `LAYOUT_TO_VARIANTS` (magazine/filmstrip/etc.).
2. `seedSectionsFromWizard` (2448) appends countdown/music/honorList to `blockOrder` **and seeds their content** (meals→rsvp, playlist→music, party→honorList).
3. **NEW: section-picks block (above)** — must run *after* seed so `mergeBlockOrder` sees the seed's additions and can keep the ones that carry host content (a host who added a playlist in "The Extras" gets Music even if they didn't tick it in the chooser — content wins, mirroring `sectionHasContent`).
4. STRUCTURE picks (2473) + fitting-room kit/texture (2491) — unchanged; `layouts.nav/navMobile/hero` from the fitting room still layer on top.

**Content-wins guarantee:** never let a chooser deselection strip a section the host gave real data to elsewhere in the wizard (hotels→travel, registry URL→registry, meals→rsvp, party names→honorList, playlist→music). In step 2, filter `hiddenOff` to exclude any section where `sectionHasContent(section, manifest)` is true. This makes the chooser purely additive-or-tidying, never destructive of entered data — the same invariant the renderer enforces.

### 3.4 Seeding content for newly-chosen optional sections

`seedSectionsFromWizard` already seeds the sections it knows (countdown/music/registry/honorList/faq/travel/details). For **Event-OS sections the host newly ticks in the chooser** (e.g. `menu`, `dressCode`, `program`, `itinerary`) there's no wizard-collected content, so they render as the editor's honest empty state (`BlockEmpty` → "Nothing yet. Begin a thread." per the Wave-1 fix). That's correct — the chooser is a *table of contents*, and the bastings (`deriveBastings`) + panels invite the host to fill them. **Do not fabricate content** to fill a ticked section (published honesty rule, CLAUDE-DESIGN §7). Optionally (Wave 3), extend `seedSectionsFromWizard` to draft occasion-appropriate placeholders for `dressCode`/`menu` from the Day step's `dressCode` field where one exists.

### 3.5 Tests

- Unit `src/lib/event-os/wizard-sections.test.ts`: for all 28 occasions, `wizardSectionsFor` essentials == `defaultBlocks` mapped through `SECTION_GATE`; optionals == `optionalBlocks`; hidden excludes `hiddenBlocks`; every returned `variant` ∈ `LAYOUTS[section]`; `SECTION_ORDER` covers every `allKinds` section.
- Extend `wizard-seed.test.ts` / add `wizard-finish` coverage: deselecting an essential with no content → `hiddenSections`; deselecting one WITH content → stays; ticking an optional → `blockOrder`; layout picks land in `manifest.layouts`; skip path writes neither field.

---

## 4 · Scope / build waves

Ranked by impact. Fast wins flagged **[S]**, larger builds **[L]**.

### Wave 1 — The data layer + finish wiring (ship first; unlocks everything) **[M]**
1. `src/lib/event-os/wizard-sections.ts` — `SECTION_GATE`, `SECTION_ORDER`, `SECTION_META` (labels from SectionRail), `wizardSectionsFor`, `mergeBlockOrder`. Pure, server-safe, fully unit-tested. **[S]**
2. Refactor `SectionRail`'s `SECTIONS/OPTIONAL_SECTIONS`/block defs to import labels from `SECTION_META` (single source; no drift). **[S]**
3. Point `wizard-seed.CORE_ORDER` + `bastings.blockOrderWith` at the shared `SECTION_ORDER`. **[S]**
4. `handleFinish` section-picks block (§3.3) behind `if (st.sectionPicks)`. With state present but no UI yet, this is testable in isolation. **[S]**

This wave alone, with `sectionPicks` seeded silently to the essentials, changes nothing user-visible but makes the manifest explicit and correct — a safe landing.

### Wave 2 — The step UI **[L]**
5. `WizardSectionChooser` component (`src/components/pearloom/pages/wizard-sections.tsx`) — the grouped card grid, pearl toggle, collapsed layout chooser, mobile single-column + sticky headers, "Let Pear decide" skip. Consumes `wizardSectionsFor`. **[L]**
6. `SectionCard` + `LayoutChooserRow` subcomponents; wire selection into `st.sectionPicks`. **[M]**
7. Add `'Sections'` to `STEPS` + `PHASES`; render the step in the wizard body switch; validation is trivially `canContinue = true` (a valid empty set is allowed). **[S]**
8. Mini-preview thumbnails (§4.4). **[M]**

### Wave 3 — Polish + depth **[M]**
9. Grow `VARIANT_RECOMMENDATIONS` (layouts.ts) with per-occasion picks for schedule/story/itinerary/travel so the chooser's defaults get sharper (pairs with `EDITOR-SECTIONS-PLAN` #6). **[S]**
10. Fitting-room handoff: the fitting room's live `ThemedSite` preview already reads `blockOrder`/`hiddenSections`/`layouts` — verify a section toggled off on the Sections step is absent in the Palette-step pressing (`WizardStructureSection`) and the fitting room. Likely free; add a regression shot. **[S]**
11. Optional content seeding for `dressCode`/`menu` from Day-step data (§3.4). **[M]**
12. "Add all / reset to Pear's picks" affordance for hosts who over-edit. **[S]**

### 4.4 Mini-preview thumbnails — the one build decision to get right

Do **not** render a live `ThemedSite` per card (30 cards × a full renderer = jank on a phone; the live preview is the fitting room's job). Instead, a `<VariantThumb section variant>` that draws a ~56×72 static schematic — hairline frames + thread + type-block glyphs in the current palette — one tiny CSS/SVG component with a `switch (variant)`. This keeps the step instant and reads as "a pressed illustration," on-brand. The audit shots in `docs/audit-shots/editor/` are the reference for what each schematic should evoke (e.g. `site-schedule-1440.png` → the schedule `cards` thumb; `site-registry-1440.png` → registry `cards`). Build ~5 archetypal schematics (list / cards / timeline / gallery-grid / photo-hero) and map each variant id to one — full per-variant fidelity is not needed at thumbnail scale.

---

## 5 · Open questions / risks

1. **Overwhelm — how many cards before it's a chore?** Weddings/showers/mitzvahs hit 10-13 essentials. Mitigation: essentials are *pre-checked at the right layout*, so the honest interaction is "glance and continue," not "configure 13 things." Cards are compact (label + toggle + collapsed layout pill); the layout chooser is opt-in. Cap essentials rendered before a "Show N more" fold at ~8 on mobile; keep NICE-TO-HAVE folded past 4. **Decision needed:** is a 13-card wedding acceptable, or do we hard-cap essentials to a "top N" and fold the rest into nice-to-have? Recommend: show all essentials (they're pre-checked, low-friction) but fold nice-to-have.

2. **Do we still let them skip?** **Yes — required.** "Let Pear decide" writes no `sectionPicks` → `handleFinish` behaves exactly as today. This preserves the instant-wizard promise (CLAUDE-DESIGN §8) for hosts who don't want to curate, and de-risks the whole feature (the new path is purely additive).

3. **Preview cost.** Live per-card previews are out (§4.4). The fitting room already pays the full-render cost once, later, and now honors the chosen set — no new live-render surface. Watch: seeding `sectionPicks` on step-enter must be cheap (pure derivation, no fetch).

4. **Interaction with the fitting room / look system.** The fitting room writes `layouts.nav/navMobile/hero` + kit/texture/edition; the chooser writes `layouts.<bodySection>` + `blockOrder` + `hiddenSections`. Disjoint keys except `hero` — and the fitting room's hero pick must **win** over the chooser's (it's later + more specific). Precedence: `applyWizardLook` map < chooser section variants < STRUCTURE/fitting-room nav/hero (already the order in §3.3). The Edition ("Feel") pick can change recommended defaults (`EDITION_LAYOUT_DEFAULTS`); since the chooser runs *before* the fitting room, if a host changes Edition later the already-picked section variants stay (explicit host pick) — acceptable, and matches `readVariant`'s "explicit wins over edition" chain.

5. **`blockOrder` becomes authoritative — regression surface.** Today most sites have an empty `blockOrder` and rely on the renderer's core fallback. Writing an explicit `blockOrder` for every wizard site changes the default-render path for new sites. Risk: a section the renderer *would* have auto-included (via `sectionHasContent`) but the host didn't tick. Mitigated by the content-wins filter (§3.3 step 2) + union-with-seed (`mergeBlockOrder`). Add a finish-assembly test asserting no host-entered content is ever dropped. Existing/pre-feature manifests are untouched (they never set `sectionPicks`).

6. **`hiddenSections` semantics.** Confirm no other surface treats `hiddenSections` as editor-only. It's read by `ThemedSite` for both editor + published; a wizard-set hidden section can still be re-shown from the editor's Sections rail (the host un-hides it). Verify the SectionRail exposes hidden core sections as re-addable (it should — they're in `SECTIONS`); if not, that's a one-line rail fix so a wizard deselection is reversible.

7. **Gaps flagged in §2.2** — `guestbook`, `anniversary`, `quote`, `hashtag`, `storymap`, `quiz`, `welcome`, `vibeQuote`, `photoWall` are `EVENT_TYPES` blocks with **no redesign canvas section**, so they can't appear as chooser cards. `guestbook` is a `manifest.features.guestbook` toggle; `photoWall` folds into gallery guest-uploads. **Decision:** either (a) surface `guestbook`/`photoWall` as special toggle cards that write their feature flag instead of `blockOrder`, or (b) leave them out of the chooser (they're reachable in the editor). Recommend (b) for v1, note (a) as a follow-up; do **not** show a card that silently does nothing.

---

## Appendix — key files

| Concern | File |
|---|---|
| Wizard shell + `handleFinish` | `src/components/pearloom/pages/WizardV8.tsx` (STEPS:55, PHASES:63, handleFinish:2279, seed call:2448, structure picks:2467) |
| Occasion registry (default/optional/hidden per occasion) | `src/lib/event-os/event-types.ts` |
| Layout variants + defaults + recommendations | `src/components/pearloom/redesign/layouts.ts` (`LAYOUTS`, `DEFAULT_VARIANT`, `recommendedVariantFor`, `EDITION_LAYOUT_DEFAULTS`) |
| Renderer section resolution (blockOrder / hiddenSections) | `src/components/pearloom/redesign/ThemedSite.tsx:590-640` |
| Core-section occasion gate + content gate | `src/components/pearloom/redesign/section-applicability.ts` |
| Event-OS block gate | `src/components/pearloom/redesign/EditorRedesign.tsx` (`isBlockApplicable`, `BLOCK_GATE_ALIASES`, `BLOCK_SECTION_IDS`) |
| Section labels/descs (reuse as SECTION_META) | `src/components/pearloom/redesign/SectionRail.tsx:38-146` |
| Finish content seeding | `src/lib/wizard-seed.ts` (`seedSectionsFromWizard`, `CORE_ORDER`) |
| Look wiring (writes layouts) | `src/lib/site-look/wizard-look.ts` (`applyWizardLook`, `LAYOUT_TO_VARIANTS`) |
| Post-open suggestions | `src/components/pearloom/redesign/bastings.ts` (`blockOrderWith`) |
| Live preview (reads chosen set) | `wizard-structure.tsx`, `wizard-fitting-room.tsx` |
| Editor layout reference shots | `docs/audit-shots/editor/` |
| **NEW** shared section catalog | `src/lib/event-os/wizard-sections.ts` (`SECTION_GATE`, `SECTION_ORDER`, `SECTION_META`, `wizardSectionsFor`, `mergeBlockOrder`) |
| **NEW** chooser UI | `src/components/pearloom/pages/wizard-sections.tsx` (`WizardSectionChooser`, `SectionCard`, `LayoutChooserRow`, `VariantThumb`) |

*End of WIZARD-SECTIONS-PLAN.md. Plan only — implement in the waves above; validate each with `npx tsc --noEmit` → eslint on touched files → `npx vitest run` → a wizard walk-through on phone + desktop.*
