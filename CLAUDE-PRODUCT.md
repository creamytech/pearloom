# CLAUDE-PRODUCT.md — Pearloom product reference

> **BRAND.md declares *why we exist*. CLAUDE-DESIGN.md documents *what's in the code*. This file documents *what the product does, what it doesn't, and what we're building next*.**
>
> Last updated: **2026-07-06** (GRAND-PLAN executed end-to-end — see §10).

**Renderer contract (as of 2026-06-12):** `src/components/pearloom/redesign/ThemedSite.tsx` is THE renderer — one component for both the editor canvas (via `EditorRedesign`) and published sites (via `PublishedSiteShell`); the `editable` prop is the only difference. There is no dispatch, no fallback, no legacy path. Its predecessors (`ThemedSiteRenderer`, `SiteV8Renderer`, the V1 tree) are all deleted — see CLAUDE-DESIGN.md §15 (deleted-architecture ledger).

---

## 0 · How to use this file

- **Read BRAND.md and CLAUDE-DESIGN.md first.** This file assumes you know the voice and the code.
- **Sections 2–5 are the living inventory.** Update them whenever we add an event type, a block, or a capability.
- **Section 7 is the roadmap.** Ranked by acquisition impact × effort.
- **Section 8 is where open decisions live.** If a session proposes a change that breaks an assumption, surface it here rather than shipping silently.
- **New sessions should read §2 + §7 + §8 first** to know what's in scope.
- **Renderer work goes into `redesign/ThemedSite.tsx`.** It is the only renderer. Everything it superseded is in CLAUDE-DESIGN.md §15.

---

## 1 · Positioning

> *"The operating system for the days that matter."*

Pearloom isn't a wedding-site builder. It's the workspace that carries a celebration from **"save the date"** to **"remember when"** — site, guests, vendors, day-of ops, and the post-event keepsake film, all woven together.

Three product pillars (see `src/components/marketing/EventOSPillars.tsx`):

1. **Compose** — the site. AI-drafted, hand-edited, on-brand.
2. **Conduct** — the day-of. Run of show, vendors, voice toasts, live stream.
3. **Remember** — the film. Auto-cut highlight reel + anniversary rebroadcast.

Everything in this file is in service of those three acts happening for **any major life event**, not just weddings.

---

## 2 · Current event support (as of 2026-04-21)

### 2.1 Supported occasions (5)

Source of truth: `src/lib/site-urls.ts:36–73` (full SiteOccasion union) + `EVENT_TYPES` registry at `src/lib/event-os/event-types.ts`.

**28 occasions supported.** 5 shipping, 23 in beta (all have
templates + beta status in the registry as of 2026-04-22).
Every occasion now passes through:
- Category-filtered wizard step (A.2)
- Occasion-specific RSVP preset (A.3)
- Occasion-filtered block library (A.4)
- AI voice directive from `EVENT_TYPES[occasion].voice`
- Per-event OG share card (including solo-honoree layout)
- Per-event title / label in nav, share, metadata
- Optional extra wizard questions for bachelor/reunion/memorial/graduation

### 2.2 Block types (26)

Source of truth: `src/types.ts:528–554`.

Generic (work for any event):
- `hero` · `story` · `text` · `divider` · `video` · `quote` · `photos` · `photoWall` · `gallery` · `map` · `spotify` · `welcome` · `footer` · `vibeQuote` · `guestbook` · `faq`

Event-shaped (work but lean wedding):
- `event` · `countdown` · `rsvp` · `travel`

Wedding-specific (don't transfer cleanly):
- `registry` — wedding/housewarming only
- `weddingParty` — wedding only
- `hashtag` — wedding or themed birthday
- `storymap` — couple-specific by default (map of meaningful places)
- `quiz` — couple-quiz prompts
- `anniversary` — anniversary-specific rebroadcast

### 2.3 What's missing to be a real event OS

The current system assumes **one site = one event = one couple**. Reality looks different:

- A wedding is actually **8+ events** (engagement party → bridal shower → bachelor/ette → rehearsal → welcome → ceremony → reception → brunch) hosted by **different people** (couple, MOH, best man, parents).
- A life has dozens of milestone moments (births, birthdays, graduations, retirements, memorials) — most unrelated to weddings.
- Events have **different hosts, different guest lists, different tones, and different blocks that actually matter.**

The product has to cover this, or we're just another wedding-site tool.

---

## 3 · Proposed event-type catalog

Organized by **life arc** rather than alphabetically, so future sessions can see how events relate.

### 3.1 Wedding arc — the 8 events around one wedding

Each can be its own Pearloom site (often hosted by a *different* person than the couple).

| Event | Typical host | Distinguishing sections |
|---|---|---|
| **Engagement party** | Parents or couple | Story-of-how-we-met, photo gallery, simple RSVP |
| **Bridal shower** | MOH / mom | Registry, games cards, advice wall, dress code, small RSVP |
| **Bridal luncheon** | Bride | Intimate guest list (8–15), tea/menu, gift to bridesmaids |
| **Bachelor party** | Best man | Multi-day itinerary, activity vote, cost splitter, packing list, group chat thread, privacy gate |
| **Bachelorette party** | MOH | Multi-day itinerary, activity vote, photo sash/shirt designer, cost splitter, packing list, privacy gate |
| **Rehearsal dinner** | Groom's parents | Toast signup, 20–40 person seating, arrival logistics, dress code |
| **Wedding** | Couple | The whole current system (ceremony, reception, RSVP, registry, travel, etc.) |
| **Welcome party** | Couple (destination) | Arrival schedule, welcome bag contents, icebreaker prompts |
| **Morning-after brunch** | Parents | Casual menu, simple RSVP, farewell toast board |

### 3.2 Partner & family milestones

| Event | Distinguishing sections |
|---|---|
| **Anniversary** (1st–50th+) | Year-by-year chapters, vow-renewal option, anniversary rebroadcast, time capsule |
| **Vow renewal** | Original-wedding photos, new vows block, intimate RSVP |
| **Baby shower** | Registry, gender-reveal moment, advice-for-baby wall, name vote, games, theme |
| **Gender reveal** | Countdown, reveal-moment video, guess poll, photo after |
| **Sip & see** (newborn meet) | Very small guest list, feeding/sleep schedule notes, no-hold-during-naps request |
| **Housewarming** | Registry (home goods), parking map, dress code, tour photos |
| **Divorce party** (real market) | Story, RSVP, simple registry for self, photo wall |

### 3.3 Birthday / life-milestone

| Event | Distinguishing sections |
|---|---|
| **First birthday** | Time-capsule advice wall, photo gallery, cake-smash moment block |
| **Sweet 16** | Dress code, DJ playlist requests, photo booth, simple RSVP |
| **18th / 21st** | Bar/club venue, dress code, group transportation |
| **Milestone birthdays** (30/40/50/60/70/80/90/100) | Year-in-review story, tribute wall, photo timeline, toast signup |
| **Retirement party** | Career timeline, tribute wall, toast signup, advice-for-retirement |
| **Graduation** | Timeline of school years, thank-you-to-teachers block, open-house hours |
| **Bar / Bat Mitzvah** | Ceremony program, candle-lighting order, Hebrew name block, kid-friendly RSVP, photo/video for Monday Morning club |
| **Quinceañera** | Court-of-honor bios, waltz order, dress/suit gallery, traditions block (last doll, heels ceremony) |
| **Sweet 16** | Spotlight moment, DJ, photo booth, simple RSVP |

### 3.4 Cultural & religious

| Event | Distinguishing sections |
|---|---|
| **Baptism / Christening** | Ceremony details, godparents bios, reception RSVP |
| **First Communion** | Ceremony program, dress code, reception details |
| **Confirmation** | Program, saint-name block, reception |
| **Mehendi / Sangeet / Baraat** (South Asian wedding) | Each can be its own site within the wedding arc; music, outfits, dance order |
| **Chinese tea ceremony** | Ceremony order, gift customs, dress code, family roles |
| **Cultural wedding extensions** | Often need a day/event-specific sub-site so guests know what to wear/bring per day |

### 3.5 Commemoration & community

| Event | Distinguishing sections |
|---|---|
| **Memorial / Celebration of life** | Obituary, service order, tribute wall, livestream link, donation-in-lieu-of-flowers, photo archive, after-reception |
| **Funeral** | Similar to memorial but typically shorter notice, visitation hours, flowers/donations |
| **Reunion (family)** | Multi-day itinerary, room assignments, who's-who board, T-shirt sizing, ancestry timeline, group photos |
| **Reunion (class)** | Then-and-now photos, bio cards, RSVP with fun facts, itinerary |
| **Reunion (friends)** | Casual multi-day trip, cost splitter, activity vote |
| **Reunion (military)** | Service tribute, roll call, tribute for those lost |

### 3.6 Roll-up count

**~35 event types** in the proposed catalog. Today: **5** supported (and only 1 — `wedding` — well-supported).

---

## 4 · Blocks we need to add

To deliver the catalog above, we need ~15 new block types. Each has a clear purpose and reuses existing patterns (RSVP shape, text + photo columns, etc.).

| New block | Used by | Replaces improvisation |
|---|---|---|
| `itinerary` | Bachelor/ette, reunion, destination wedding, welcome party, brunch | Multi-day hourly schedule with optional photos per slot; arrive/depart markers |
| `costSplitter` | Bachelor/ette, reunion trips | Shared group budget with line items + per-person share + Venmo/Splitwise handoff |
| `activityVote` | Bachelor/ette, reunion | Multi-choice poll: "Which bar Friday night?" with guest voting |
| `toastSignup` | Rehearsal dinner, milestone birthday, retirement | Slot list ("toast #3"), volunteer signup, order on day-of |
| `rooms` | Reunion, destination wedding, bachelor trip | Room/cabin assignments with drag-and-drop; guest → bed pairing |
| `tributeWall` | Memorial, retirement, milestone birthday | Open guest submissions with moderation + display timeline |
| `adviceWall` | Baby shower, bridal shower, retirement | Prompted submissions ("advice for the new parents") + printable export |
| `nameVote` | Baby shower, gender reveal | Name suggestions poll with weighted voting |
| `program` | Bar/Bat Mitzvah, Quinceañera, memorial, cultural ceremonies | Ordered ceremony events with times + participant roles |
| `livestream` | Memorial, destination wedding | Prominent livestream link with countdown + time-zone helper |
| `obituary` | Memorial, funeral | Long-form text + dates + service-in-memory-of card |
| `dressCode` | Formal events, showers, quinceañera | Visual dress-code guide with example outfit photos |
| `menu` | Rehearsal dinner, showers, brunch | Course list with dietary tags + allergy callouts |
| `packingList` | Bachelor trip, destination wedding | Item checklist + guest check-off |
| `thenAndNow` | Class reunion, milestone birthday | Before/after photo pairs |
| `whosWho` | Reunion, wedding party | Face cards with roles/relationships — especially for family reunions |
| `groupChat` | Bachelor/ette, bachelor trip | Threaded chat pinned to the site (privacy-gated, not for all blocks) |
| `privacyGate` | Bachelor/ette, private events | Password + optional "only guests with email on list" filter |

### 4.1 Blocks to generalize (not new, but adapt)

- `registry` → accept multiple flavors: **wedding registry**, **baby registry**, **housewarming registry**, **donation-in-lieu** (for memorials).
- `countdown` → accept "T-minus" OR "since" (for anniversaries, memorials "2 years since").
- `event` → already generic but default tone is wedding-y.
- `storymap` → generalize from "couple's meaningful places" to "meaningful places of the guest of honor / family."
- `weddingParty` → generalize into **`honorList`** that can be: wedding party, court of honor (quinceañera), candle-lighting committee (bat mitzvah), family tree (reunion).

### 4.2 RSVP needs per-event config

Current RSVP is wedding-shaped (attending-with-plus-one, meal choice, song request). We need **RSVP presets per event**:

- **Wedding**: attending, plus-one, meal choice, song, dietary, comments
- **Baby shower**: attending, gift status, advice field
- **Bachelor/ette**: attending by day, cost share accept, allergies/medications, bed pref
- **Memorial**: attending (ceremony vs. reception), memory-to-share optional
- **Reunion**: attending by day, room pref, T-shirt size, dietary
- **Milestone birthday**: attending, memory-to-share, photo-from-past upload

Implementation: make the RSVP block take a `preset: 'wedding' | 'shower' | 'bachelor' | 'memorial' | …` prop; each preset defines fields.

---

## 5 · Event × Block default matrix

Each event type gets a curated default set of blocks when the wizard generates a site. Editors can still add/remove anything.

Legend: ● required · ○ default-on · — hidden by default

| Block \ Event | Wedding | Bachelor/ette | Bridal shower | Baby shower | Rehearsal | Memorial | Reunion | Milestone bday | Grad | Bar/Bat Mitzvah |
|---|---|---|---|---|---|---|---|---|---|---|
| `hero` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| `story` | ● | ○ | ○ | ○ | ○ | ● | ○ | ● | ● | ○ |
| `event` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| `rsvp` | ● | ● | ● | ● | ● | ○ | ● | ● | ● | ● |
| `countdown` | ● | ● | ● | ● | ● | — | ● | ● | ● | ● |
| `photos` / `gallery` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| `photoWall` (guest-upload) | ● | ● | ○ | ○ | — | ○ | ● | ● | ○ | ○ |
| `map` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| `travel` | ● | ● | ○ | — | — | — | ● | ○ | — | — |
| `faq` | ● | ● | ● | ● | ○ | ● | ● | ○ | ○ | ● |
| `guestbook` | ● | ○ | ○ | ○ | ○ | ● | ● | ● | ● | ● |
| `registry` | ● | — | ● (gifts) | ● (baby) | — | ● (donations) | — | ○ | ○ | ○ |
| `weddingParty` / `honorList` | ● | — | — | — | ● | — | — | — | — | ● (candle-lighters) |
| `storymap` | ● | — | — | — | — | ● | ● | ● | ○ | — |
| `quiz` | ● | ○ | ○ | ● (name vote) | — | — | ○ | ○ | — | — |
| `hashtag` | ● | ● | ● | ● | — | — | ● | ● | ● | ● |
| `spotify` | ● | ● | ○ | ○ | ● | — | ● | ● | ● | ● |
| `video` | ● | ○ | ○ | ● | ○ | ● | ● | ● | ● | ● |
| `quote` | ● | — | ● | ● | ● | ● | ● | ● | ● | ● |
| `anniversary` | — | — | — | — | — | — | — | — | — | — |
| — — NEW BLOCKS — — | | | | | | | | | | |
| `itinerary` | ○ | ● | — | — | — | — | ● | — | — | — |
| `costSplitter` | — | ● | — | — | — | — | ● | — | — | — |
| `activityVote` | — | ● | ○ | ○ | — | — | ● | — | — | — |
| `toastSignup` | ○ | — | — | — | ● | ○ | — | ● | ● | ○ |
| `rooms` | ○ | ● | — | — | — | — | ● | — | — | — |
| `tributeWall` | — | — | — | — | — | ● | — | ● | ● | — |
| `adviceWall` | — | — | ● | ● | — | — | — | ● | — | — |
| `nameVote` | — | — | — | ● | — | — | — | — | — | — |
| `program` | ● | — | — | — | — | ● | — | — | — | ● |
| `livestream` | ○ | — | — | — | — | ● | — | — | ○ | ● |
| `obituary` | — | — | — | — | — | ● | — | — | — | — |
| `dressCode` | ● | ○ | ● | ● | ● | ○ | ○ | ● | — | ● |
| `menu` | ● | ○ | ● | ● | ● | — | ● | ● | — | ● |
| `packingList` | — | ● | — | — | — | — | ● | — | — | — |
| `thenAndNow` | — | — | — | — | — | — | ● | ● | ○ | — |
| `whosWho` | ● (wedding party) | — | — | — | — | — | ● | — | — | ● |
| `groupChat` | — | ● | — | — | — | — | ● | — | — | — |
| `privacyGate` | — | ● | — | — | — | ○ | ○ | — | — | — |

This matrix is the single source of truth for what the wizard defaults to per event type. Lives in `src/lib/event-os/event-matrix.ts` (to be created).

---

## 6 · System changes needed to deliver this

### 6.1 Data model

**`SiteOccasion`** (in `src/lib/site-urls.ts`) expands from 5 to ~25. Each occasion gets:

```ts
interface EventType {
  id: SiteOccasion;
  label: string;            // UI copy
  category: 'wedding-arc' | 'family' | 'milestone' | 'cultural' | 'commemoration';
  /** Who typically hosts (wizard tone). */
  hostRole: string;
  /** Blocks enabled by default. */
  defaultBlocks: BlockType[];
  /** Blocks allowed but off by default. */
  optionalBlocks: BlockType[];
  /** Blocks hidden (can't be added). */
  hiddenBlocks: BlockType[];
  /** RSVP field preset. */
  rsvpPreset: 'wedding' | 'shower' | 'bachelor' | 'memorial' | 'reunion' | 'milestone' | 'cultural';
  /** Tone for Pear's AI drafting. */
  voice: 'celebratory' | 'intimate' | 'ceremonial' | 'playful' | 'solemn';
  /** Default templates that suit this event. */
  templateIds: string[];
}
```

Single `EVENT_TYPES` registry drives: URL prefix, wizard prompts, block picker filtering, RSVP form preset, Pear voice, template gallery filter.

### 6.2 Wizard (PearSpotlight)

Currently asks "what kind of celebration?" with 5 options.

Changes:
- **Step 1 — Category**: wedding-arc / family-milestone / cultural / commemoration / gathering. Keeps the screen uncluttered.
- **Step 2 — Specific event**: filtered list based on category (e.g. wedding-arc → engagement party, bridal shower, bachelor, rehearsal, wedding, brunch).
- **Step 3+ — Event-specific questions**: each event type declares its own wizard schema (who's hosting, how many days, privacy level for bachelor parties, etc.).
- **Voice adaptation**: Pear's drafting prompts switch tone by `voice` field — ceremonial for memorials, playful for bachelor parties, intimate for anniversaries.

This is a real refactor of `PearSpotlight.tsx`. Good opportunity to pair with §5 of `CLAUDE-DESIGN.md` (the deferred step-module extraction).

### 6.3 Renderer (SiteRenderer)

Currently renders all blocks on a manifest regardless of event type. Changes:

- `SiteRenderer` reads `manifest.occasion` and filters blocks to `defaultBlocks + optionalBlocks` for that event type.
- New blocks (itinerary, costSplitter, etc.) need their own `<BlockXxx />` components under `src/components/site/`.
- Block library drawer in the editor filters by event type so users only see blocks that apply.

### 6.4 Templates

Existing templates need an `appliesTo: SiteOccasion[]` array (already exists as `occasions:` field — just needs to be filled out for new types) and a **tone variant per event**. A "Tuscan Villa" template should render with wedding voice or reunion voice depending on the site it's applied to.

New templates needed, minimum:
- **1 per new event category** (bachelor/ette, bridal shower, baby shower, memorial, reunion, cultural ceremony).
- Template gallery in the dashboard must filter by event type.

### 6.5 URL system

`src/lib/site-urls.ts` is already path-based — adding new occasions is trivial. Add to the `ALLOWED_OCCASIONS` set and every URL helper respects them.

### 6.6 Branding / microcopy

BRAND.md §7 microcopy rules apply across all events but some tone adjustments per category. Not every event is "woven" — a memorial is "gathered," a bachelor party is "planned." Add a `microcopyPack` per category in CLAUDE-DESIGN.md next audit.

### 6.7 Supabase schema

No new tables needed for most events — existing `sites` + `guests` + `rsvps` cover them. New tables only for:
- `cost_shares` (costSplitter block) — guest → amount, status
- `toast_signups` (toastSignup block) — guest → slot #, is_confirmed
- `tribute_submissions` (tributeWall, adviceWall) — guest → body, photo, moderation state
- `room_assignments` (rooms block) — guest → room_id, bed_id
- `activity_votes` (activityVote block) — guest → choice_id

All follow the belt-and-braces RLS pattern in CLAUDE-DESIGN.md §14.

---

## 7 · Priority roadmap

Ranked by **acquisition impact × effort**. Each item is 1 session's worth of work (or flagged otherwise).

### Phase A — Foundation (must ship before any new event type)

| # | Task | Why first | Est. |
|---|---|---|---|
| A.1 | Introduce `EventType` registry (§6.1) | Every subsequent event just adds an entry; no more scattered `switch (occasion)` | 1 session |
| A.2 | Refactor wizard step 1–2 to category → specific-event | Otherwise adding 25 events to one dropdown breaks the UX | 1 session |
| A.3 | RSVP preset system (§4.2) | Every non-wedding event needs different fields | 1 session |
| A.4 | Block-availability filter in `SiteRenderer` + block picker | Prevents bachelor-party sites from showing a wedding registry | 0.5 session |

### Phase B — Wedding arc completion (highest acquisition lever)

The wedding arc is where we already win. Adding the adjacent events 10x's the funnel because **each wedding = ~3–4 Pearloom sites** (couple + MOH + best man + parents).

| # | Event | Why | Est. |
|---|---|---|---|
| B.1 | **Bachelor / Bachelorette party** | Biggest TAM after wedding itself; underserved by template tools; viral-friendly (group chats share the link) | 2 sessions |
| B.2 | **Bridal shower** | Hosted by someone *other* than the couple — pulls new users into the platform | 1 session |
| B.3 | **Rehearsal dinner** | Small, fast build, clear requirements | 1 session |
| B.4 | **Welcome party / morning-after brunch** | Destination weddings need these; drives the "whole weekend on Pearloom" story | 1 session |

### Phase C — Life milestones (new markets)

| # | Event | Why | Est. |
|---|---|---|---|
| C.1 | **Milestone birthdays (30/40/50…)** | Already half-supported; deepening it unlocks adult-party market | 1 session |
| C.2 | **Baby shower** | Huge adjacent market, natural word-of-mouth from couples who already used Pearloom | 2 sessions |
| C.3 | **Reunion (family / class)** | Underserved market, high shareability (everyone invites family) | 2 sessions |
| C.4 | **Retirement party** | Older, professional demographic — higher willingness to pay | 1 session |

### Phase D — Commemoration

| # | Event | Why | Est. |
|---|---|---|---|
| D.1 | **Memorial / Celebration of life** | Most emotional use case; livestream + tribute wall are genuinely useful; handle with care | 2 sessions |
| D.2 | **Anniversary (proper)** | Already an occasion but thin; do it right with year-by-year chapters + rebroadcast | 1 session |

### Phase E — Cultural

| # | Event | Why | Est. |
|---|---|---|---|
| E.1 | **Bar / Bat Mitzvah** | Specific and well-known format; adjacent to weddings | 1 session |
| E.2 | **Quinceañera** | Fast-growing market; specific traditions can be templatized well | 1 session |
| E.3 | **Sweet 16 / 21st** | Easy cultural variants of milestone birthday | 0.5 session |
| E.4 | **Baptism / Confirmation / First Communion** | Niche but requested | 1 session |
| E.5 | **Mehendi / Sangeet / Tea ceremony** | Multi-day wedding extensions; requires "event within a wedding" model | 2 sessions |

### Order recommendation

Do **A.1 → A.4 in one focused session** (the foundation is mandatory).

Then **B.1 (bachelor/ette) first** — it's the biggest acquisition unlock and will stress-test the architecture. Everything else becomes an ~1-session task once the foundation is right.

---

## 8 · Open questions / decisions log

Future sessions: surface questions here instead of silently assuming.

- **Q1:** Do we want "event within a wedding" — e.g., one master `wedding` site that contains `bachelor-party`, `rehearsal`, `welcome-party` as child events with shared guest list? Or each as its own separate Pearloom site?
  - **Tentative:** separate sites for now (simpler), add linking later ("This site belongs to Emma & James's wedding weekend — see the other events").

- **Q2:** For bachelor/ette parties — do we gate the site behind a password by default (private) or open (like weddings)?
  - **Tentative:** **private-by-default.** Most bachelor parties are single-gender, surprise-friendly, and often involve content guests don't want public.

- **Q3:** Do we charge per-site or per-event-group?
  - **Open.** If Pearloom-for-wedding is $19 one-time and a wedding needs 4 sites (couple + MOH + best man + parents), do we bundle? Most users will pay per site, but the narrative says "one event, one price."

- **Q4:** How do we handle multi-host events — where the MOH is editing the bridal shower site, not the couple?
  - **Open.** Needs a clear "this site is for someone else's event" onboarding. Co-host feature (`20260418_cohost.sql`) already exists but is wedding-centric; generalize.

- **Q5:** Memorial events are the most sensitive — should we skip AI drafting entirely and offer only empty blocks for manual composition?
  - **Tentative:** AI offers a *gentle* draft with mandatory human review before publish. BRAND.md voice applies ("gathered," not "AI-generated").

- **Q6:** Should each event type have its own OG image / share card treatment (not just the site's hero)?
  - **Yes, eventually.** Bachelor parties shared in group chats want a different preview than weddings shared with parents.

---

## 9 · Session-agnostic workflow

How we actually ship this over many sessions without re-explaining every time.

### 9.1 Before starting a new event type
1. Update this file's §2 to note what's in-progress.
2. Check §8 for unresolved questions that affect the event.
3. Create a feature branch: `claude/event-<name>` (e.g., `claude/event-bachelor`).

### 9.2 While working
- Use existing patterns — read CLAUDE-DESIGN.md §9 (brand primitives) and §10 (component inventory) before creating anything new.
- Follow BRAND.md §7 microcopy rules. Tone adjustments per event are OK; tone drift is not.
- Type-check + build before committing.

### 9.3 After shipping
- Update §2.1 of this file (occasions table) and §5 (matrix).
- Update CLAUDE-DESIGN.md §19 changelog if design tokens or primitives changed.
- Add an ADR at `/docs/adr/NNN-event-<name>.md` if a non-obvious decision was made.

### 9.4 When the session ends
- Push to branch.
- If partial work remains, leave a TODO at the top of the branch's README or as a comment in the most-edited file, written for a cold reader: "Next session, start with X; context is Y."

---

## 10 · Changelog

### 2026-07-06 — GRAND-PLAN executed end-to-end (docs/GRAND-PLAN.md, 20 pillars → shipped)

The 20-pillar GRAND-PLAN driven to completion across all tracks — ~34
commits on `main`, 11 migrations applied to prod (advisor-clean), full
suite 1213/1213. What shipped:

- **Track A (launch gates):** pear-chat private-money leak gated on
  server-side ownership; seating-lookup injection hardened; email trio
  (real one-click `/unsubscribe`, Svix webhook signature, send-time
  suppression); a CI workflow so the test suite gates every PR.
- **Track B (turn-it-on):** anniversary + weekly-digest crons scheduled;
  the photo layer unified so `guest_photos` reach the memory book /
  recap / day-after email; the `creator_email` index fix + a fail-open
  plan-gate bug; a11y (gold-text contrast, reduced-motion, focus traps);
  activation instrumentation (`product_events` + `activation_funnel`
  view + `sites.published_at`); `next/image` + resize-on-upload; the
  vendor booking-click affiliate primitive; **per-account AI dollar
  caps** (`ai_spend` + a fail-open gate across ~40 AI routes); and the
  **translation layer surfaced** (guest language switcher + host
  "offer in <language>" action over the existing i18n plumbing).
- **Phase 0 — Money Spine:** `budget_lines` + rollup math +
  `/dashboard/budget` + a real vendor→budget FK + cockpit door.
- **Phase 1 — the Keystone (collaborative split), live end-to-end:**
  `participants`/`expenses`/`expense_shares` + settle-up math, the
  `/api/split/*` API, the published costSplitter graduated to a live
  guest-editable ledger with P2P settle-up deep-links, RSVP→participant
  seeding, and the new-expense notification bell.
- **Phase 2 — journey free-flow:** guest→host CTA on every passport;
  the "just looking" intent → the live `/demo`; the finish-time 401
  dead-end caught (state preserved, `?next` forwarded through
  `/welcome`); Vibe + Palette made non-blocking.
- **Phase 3:** the Money hub (Budget surfaced in nav) + **Team &
  assignable tasks** (`event_tasks` + a role-gated board on the Plan
  hub).
- **Phase 4 — the Social layer:** a light, privacy-first friend graph
  (`friendships`, mutual-consent, first-names-only) on the event-graph
  base + "add a friend to an event" as a split participant.
- **Phase 5 — the Celebration Model:** first-class `celebrations` table
  (backfilled) + FK + sync; unified cross-event headcount; the per-link
  strip-visibility toggle; a celebration timeline; and a deduped shared
  roster ("everyone across the weekend").
- **Phase 6:** confirmed chip-in group gifting already complete;
  closed the sibling-strip privacy leak (bachelor/ette never advertised).

Deliberately deferred (tracked in `docs/FOLLOW-UPS.md`): **premium
tiers** (blocked on the monetization-model decision — §8 Q3; `requirePlan`
has no callers and the sold capabilities have no features yet), the
Phase-5 shared-roster *write-back*, Phase-1 expected-share, and a latent
`applyLocale` bug (reads `manifest.faq`; the field is `manifest.faqs`).
Still needs the human: email SPF/DKIM/DMARC DNS + the free-tier-limit
enforcement sign-off.

### 2026-07-04 — Wizard Sections step, three waves (docs/WIZARD-SECTIONS-PLAN.md executed in full)

A new **Sections** step in the wizard's Look phase (`Occasion →
Basics → Details → Day → Photos → Sections → Vibe → Palette →
Review`) lets a host CHOOSE which sections their site starts with
and a signature layout for each — pre-checked to the occasion's
smart defaults so it's a one-tap glance, never a form. Skipping
("Let Pear decide") writes nothing → identical to the prior
instant-wizard behavior. Shipped on
`claude/post-fable-code-review-lj8e4o`.

**Wave 1 — data layer + finish wiring.**
`src/lib/event-os/wizard-sections.ts` is the shared section
catalog: `SECTION_GATE` (SectionId → the EVENT_TYPES BlockType ids
that gate it), `SECTION_ORDER` (canonical blockOrder), `SECTION_META`
(labels SectionRail now imports so the rail + wizard can't drift),
`wizardSectionsFor` (derives the {essential, optional} set per
occasion from `EVENT_TYPES` — never a hand-kept 28-list), and the
finish wiring `mergeBlockOrder` / `applySectionPicks`. Deselecting
an essential writes `hiddenSections` (the renderer re-appends
omitted cores, so omission alone doesn't remove); content always
wins (a section the host gave real data to elsewhere is never
hidden). `wizard-seed.CORE_ORDER` + `bastings` now reference the
shared `SECTION_ORDER`.

**Wave 2 — the step UI.**
`src/components/pearloom/pages/wizard-sections.tsx`
(`WizardSectionChooser`): grouped section cards (Essentials pre-
checked, Nice-to-have folded past 4), the pearl as the on/off atom,
a collapsed 1-tap layout chooser marked with Pear's recommended
variant (gold pearl), static per-variant `VariantThumb` schematics
(no live render per card), mobile single-column + sticky group
headers, thread dividers + Fraunces + mono-caps eyebrows. Wired
into `WizardV8` as `st.sectionPicks`; `handleFinish` applies them
after `seedSectionsFromWizard` (so seeded content unions in).

**Wave 3 — polish + depth (this session).**
- **Sharper per-occasion layout defaults.** `VARIANT_RECOMMENDATIONS`
  (`redesign/layouts.ts`) restructured to an ordered rule list per
  section (a section can recommend DIFFERENT variants for different
  occasions); grew story (`letter` for anniversary/vow-renewal,
  `timeline` for memorial/milestone/retirement/graduation),
  schedule (`timeline` for reunion/memorial/funeral), itinerary
  (`flow`/Thread for bachelor/ette), travel (`map` for the scattered-
  guest trips). Lookup-only — `recommendedVariantFor` sharpens both
  the chooser default and the on-canvas Layout bar.
- **Fitting-room / Palette handoff.** The live pressing
  (`WizardStructureSection`) and the fitting room
  (`buildFittingManifest`) now apply `sectionPicks` (blockOrder /
  hiddenSections / layouts) BEFORE the nav/hero picks (so the
  fitting-room hero still wins) — a section set aside on the Sections
  step is absent from the pressing + fitting room, one added
  appears. Verified live via the authed E2E harness: Travel toggled
  off → absent from the pressing DOM and the fitting-room nav; Music
  toggled on → present in both.
- **Optional content seeding** (`seedSectionsFromWizard`): a ticked
  Dress code section is seeded with the host's own Day-step dress-
  code string as its headline; a ticked Menu is seeded with one
  course from the host's real meal choices. Fill-missing, never
  fabricated — published honesty preserved.
- **"Reset to Pear's picks"** — a quiet text button beside "Let Pear
  decide" that re-derives `sectionPicks` to the occasion essentials;
  shows only once the host has diverged from the baseline.

Known minor: `rsvp` carries `required:true` in `SectionRail`'s core
meta (pre-existing, since before Wave 1), so it's excluded from
`REORDERABLE_CORE_KEYS` and doesn't render as a manageable rail row
though it's essential — left as-is (not a Wave regression; making it
reorderable/removable has real semantics).

Validation: `tsc` clean · eslint clean on touched · vitest
1042/1043 (the 1 fail is a pre-existing photos/stylize rate-limit
isolation flake — passes alone) · `npm run build` passes.
Screenshots: `docs/audit-shots/wizard-sections-{step,diverged}-desktop.png`,
`wizard-sections-handoff-{desktop,fitting-room}.png`.

### 2026-07-02 — Editor sections, three waves (docs/EDITOR-SECTIONS-PLAN.md executed in full)

The 29-section audit's plan shipped as three waves on
`claude/post-fable-code-review-lj8e4o`:

**Wave 1 — correctness & honesty.** No layout switch loses host
content anymore (schedule day-grouping + Directions, travel
intro/shuttle, RSVP social proof + guarded open, registry notes,
gallery slideshow un-capped); occasion voice routed through
`occasionCopyFor` for story chips / countdown / music / map; the
host-invented registry `fundPct` bar deleted (the `progress`
variant is rebuilt fund-forward around the real pledge bar);
thread + secondary CTA on fullbleed/typographic heroes; token +
dark-hex sweep; the fake `static` map variant cut.

**Wave 2 — host ergonomics.** Shared `ReorderHandle` across 8 list
panels (gallery captions travel with their photo); the promised
blocks shipped — `nameVote`, `rooms`, `thenAndNow`, `whosWho` (as
honorList's `relationships` variant); FAQ twocol/cards clamp +
show-all (and the silent 7th-FAQ drop fixed); stepper wraps; flip
countdown balances at 390; countdown gains its own target date.

**Wave 3 — signature variants + the rest.**
- Six signature variants a template tool can't copy: hero `crest`
  (monogram in a double hairline ring — solemn-recommended),
  gallery `frames` (hairline-framed asymmetric editorial, BRAND
  §10), dressCode `wardrobe` ("Wear this" photo plates; panel
  gains per-example photo slots), itinerary `flow` re-rendered as
  the two-strand thread spine (id kept, label now "Thread"), menu
  `bill-of-fare` (prix-fixe sheet, roman-numeral courses),
  registry `storecards` (typographic initial plates + real
  domains replace the logo-less "logo wall"; legacy `logowall`
  picks alias through).
- Occasion recommendations: `recommendedVariantFor` in layouts.ts
  → a gold pearl on the on-canvas Layout bar pill. Lookup only —
  never auto-applied.
- Details overhaul: real collapsing accordion (subline is the
  expanded body; no lying chevrons), content-aware label→icon map
  (`details-icons.ts` — Parking wears a car; new `car`/`hanger`
  glyphs), writable subline (third `detailsCards` tuple slot,
  rendered by every variant), cap raised 3→6 and said out loud,
  new `ledger` variant (quiet ruled rows, no icon chrome).
- Pear in the block panels: inline rewrite (preview-before-apply)
  in Obituary (gentle register, mandatory-review note per Q5),
  AdviceWall + TributeWall prompts (solemn-aware), Menu intro,
  DressCode note.
- `groupChat` shipped — the last promised block: link-out card
  over the existing `bachelor.groupChatUrl` (platform named
  typographically, never embedded), thin panel, occasion-gated.
- Gallery multi-file upload (one batch POST, one undo step);
  duplicate-toggle merges (music suggestions + RSVP song requests
  → one "Guest songs" switch writing both fields; gallery's
  guestUploads/galleryUploads pair → one switch).

Named leftovers from the plan (each scoped in the doc): travel
manual-hotel entry + `postcard` stays, map second venue, RSVP
custom questions (the one L), story `newspaper` variant,
livestream `chapel`. vitest 909/909 · tsc clean · build passes.
Screenshots: `docs/audit-shots/editor/wave3-*.png`.

### 2026-07-02 — Dashboard host pass: three write-only loops closed + dead-end sweep

Walked all 31 /dashboard routes as a host. Nav needed no surgery
(the 22→10 cut holds); the value was closing loops and fixing
first-use dead ends:

- **Seating → day-of.** `manifest.seatingPlan` was write-only
  (the arranger saved it; nothing read it). DayOfV8's new
  "Seating at a glance" card shows tables + seats spoken for with
  an "Open the chart" door; field now typed on StoryManifest.
- **Voice DNA → the editor.** Previously only cadence drafts read
  `manifest.voiceDNA`. Now `/api/inline-rewrite` accepts a
  `voiceProfile` (in the user turn — the cached system prompt
  stays static) and every editor rewrite surface sends it:
  PearInlineRewrite (6 panels), PropertyRail's chips + 3-styles
  pressings, StoryPanel, FaqPanel. Registration via
  `lib/pear/editor-voice` (EditorRedesign effect). Tests pin it.
- **Group votes → Submissions.** Read-only `VotesTally` panel on
  /dashboard/submissions tallies `activityVote` polls per option;
  block/option slug helpers extracted to
  `lib/event-os/activity-votes` and shared with the published
  renderer so ids can never fork (unit-tested).
- **Dead-end sweep.** Empty states gained actions: Analytics /
  Director / Connections → Create a site; Payments' empty ledger
  → Set up your registry; Memory book → editor story deep link +
  site picker; QR poster (no site) → sites index; Passport cards
  (no guests) → Guests page. Four stale "top-right menu" copy
  strings (site picker moved sidebars ago) → "sidebar".
- **Cross-links + nav hygiene.** Day-of gained a quiet "Print for
  the day" row (QR poster + passport cards, occasion-gated) —
  those two print-at-home sheets were reachable only via ⌘K.
  Weekend builder removed from `DEPROMOTED_DESTINATIONS` (it's a
  first-class Site sub-nav tab; it was listed twice in ⌘K).

### 2026-07-02 — Registry + Vendor Book (launch-mode, no money transmission)

The two launch-blocking features, built in three waves on the
**"Pearloom never touches the money"** principle: no payment
processing, no held funds, no escrow — so no money-transmitter
licensing. Stripe checkout code stays parked behind absent env
keys (`hasStripe()` gates); everything below works with zero
payment config.

**Registry:**
- **Reserve-and-link items** — the native registry
  (`/api/registry-items` + new `RegistryItemsGrid` on the site's
  registry section, all four layouts) lets guests *reserve* an
  item (atomic optimistic-concurrency claim, first-name-only
  public view) and buy it at the merchant's own link. With Stripe
  keys present the old pay path still exists; without them,
  reserve is the only mode.
- **Give directly** (`manifest.registryFunds` +
  `RegistryFundCard` + `src/lib/registry-funds.ts`) — host's own
  Venmo/PayPal/CashApp/Zelle handles rendered as deep-link
  buttons + QR; optional goal with pledge-driven progress
  ("as shared by guests").
- **Honor ledger** (`gift_pledges` table + `/api/gift-pledges`)
  — guests self-report what they gave; public aggregates are
  first-names-and-count only, amounts owner-only.
- **Chip-in group gifting** (`registry_items.allow_group_gift`,
  migration `20260703_group_gifts.sql`) — several guests pledge
  toward one big item; woven progress line; chip-ins never mark
  the item spoken for.
- **Add by URL** — `/api/registry-items/from-url` +
  `src/lib/product-page.ts` (OG/JSON-LD title/photo/price
  prefill, SSRF-guarded: private-IP/host rejection pre-fetch and
  post-DNS, re-vetted redirects, 512KB/10s caps).
- **Unified ledger** — `RegistryClaimsFeed` +
  `/dashboard/registry` merge link claims, item reservations,
  payments, and pledges with kind chips, a "Given directly"
  stat, and the **thank-you ledger**: `thanked_at` on all three
  gift tables, "Mark thanked" pill, "Still to thank · N" stat,
  "Open in Studio →" deep link (`/dashboard/invite?thankTo=&gift=`)
  to a pre-addressed thank-you card. Drafting never sets
  thanked_at — only the explicit toggle.

**Vendor Book** (`/dashboard/vendors`, `site_vendors` table,
`/api/vendors/book`):
- Roster grouped considering/booked/paid with occasion-aware
  category chips; cost/deposit/balance with due dates (null cost
  stays null — never $0); due-next strip (overdue in plum,
  "All paid ✓" sage resting state); budget linkage
  (merge-by-name into `/api/sites/budget`).
- **Vendor call sheets** — `/vp/{token}` (packet_token via
  `20260703_vendor_packets.sql`): public print-friendly page
  shaped by `shapeVendorPacket` (privacy contract: no money, no
  notes, no other vendors, no guests, never the host account
  email); `manifest.dayOfContact` for the day-of phone.
- **Day-of "Who to call"** card in DayOfV8 (booked vendors by
  arrival time, tap-to-dial).
- **Due-date reminders** in the notification bell (`'vendor'`
  feed kind, deterministic createdAt so read-state sticks, one
  escalation at past-due; digest gets its own count line).
- **Pear + Director read the book** —
  `src/lib/vendor-book-summary.ts` aggregates feed
  `/api/pear-chat` host stats (VENDOR BOOK block) and
  `/api/director` contextSummary; DashDirector shows a "From
  your vendor book" ledger panel.

Migrations applied to prod + recorded: `20260702_site_vendors`,
`20260703_vendor_packets`, `20260703_gift_pledges`,
`20260703_group_gifts` (plus `20260702_song_request_art`,
`20260702_lock_link_guests_rpc` earlier in the session).
vitest 840/840. Named follow-ups: `allow_group_gift` toggle in
the dashboard RegistryItemsManager form (editor RegistryPanel
has it), Spotify env keys for playlist search.

### 2026-07-02 — Section gaps closed + the living playlist + the Loom

- **Three new addable sections** in the redesign renderer: `menu`
  (~21 occasions promised it), `dressCode` (~15), and
  `tributeWall` — the memorial's signature block, wired to the
  existing tribute_submissions moderation pipeline (guests write
  on the site; nothing shows until approved). Registry-gated via
  the Event-OS block pattern.
- **The living playlist**: guests suggest songs on the published
  site (typeahead via /api/music/search — Spotify
  client-credentials when SPOTIFY_CLIENT_ID/SECRET are set, free
  iTunes Search otherwise), hosts pick auto-add vs approve-first
  (manifest.music.suggestions/autoAdd), accepted tracks render as
  "The guest playlist" with album art + 30s needle-drop previews.
  Migration 20260702_song_request_art.sql (art_url/preview_url) —
  **apply to prod via MCP**. RSVP-form song answers now reach
  song_requests too.
- **The Loom** (manifest.rsvpLoom): a deterministic SVG tapestry
  above the RSVP form — one weft thread per attending reply, no
  PII (public /api/rsvp/weave returns hashed seeds only); guests
  watch their thread weave in live on reply.
- **The toast jukebox**: day-of plays the passport voice toasts as
  a queue; the memory book gains an "In their own voices" roll
  call; recorder copy follows the occasion.
- Add-Section picker's countdown/music gates now follow registry
  hiddenBlocks (no more countdown on funerals).

### 2026-06-12 — Instant wizard, the great deletion, doc re-audit

- **Wizard generation is instant for everyone.** The photo path no
  longer runs an AI pipeline at "Build my site" — photos become
  content (cover + gallery from the R2 URLs uploaded during the
  Photos step) and the manifest is assembled locally in ~1s, same
  as the no-photos path. Story drafting moves to the editor, on
  demand, where Pear already works. The background manifest
  pre-warm (a full Opus pipeline run per photo wizard) is deleted.
- **De-wedding'd the suggestion fallbacks** — schedule / dress code
  / registry / FAQ / hero-line chip sets now route by occasion
  shape; wedding sets only fire for wedding-shaped events. Wizard
  question packs, name modes, and vibes were already
  occasion-aware.
- **~90k lines deleted** after a prod check found zero rows
  carrying vibeSkin or customPages: the vibeSkin layer, the
  memory-engine story pipeline + /api/generate routes, the old
  ThemedSiteRenderer, the V1 site tree, the orphaned /preview
  surface, and ~40 dead lib modules. Full ledger in
  CLAUDE-DESIGN.md §15. The publish route no longer fires a
  Gemini call per publish.
- **Login lands on the dashboard** — the /welcome gate now
  grandfathers accounts that already own sites.
- CLAUDE-DESIGN.md rewritten from a fresh audit; this file's
  renderer contract updated to `redesign/ThemedSite`.

### 2026-06-11 — Welcome flow + orchard avatars + site-crest switcher

**The Welcome flow** (`/welcome`, server gate + `WelcomeFlowClient`):
first-run onboarding between sign-in and the product. Sign-in
defaults (SigninV8 + AuthModal) now land on `/welcome`; onboarded
accounts pass straight through server-side (one indexed read at
login, nothing after). Five movements on one sheet of paper —
arrival (auto-advances), name ("What should Pear call you?"),
mark (avatar picker), occasion (intent chips: wedding / engagement
/ baby / birthday / reunion / memorial / exploring), the agreement
(Terms + Privacy links, three product-verifiable promises, required
checkbox), then "The loom is yours" → Begin a thread (/wizard/new,
or /dashboard for explorers). Two-strand progress thread, Fraunces
letterpress, Enter-to-advance, reduced-motion fades. Name/mark/
occasion skippable; the agreement is the only gate. Migration
`20260624_onboarding.sql` (applied + tracked): `onboarded_at`,
`terms_accepted_at` (both stamped server-side from booleans),
`intent` on user_preferences. `intent` is stored but not yet read
by the wizard — named follow-up.

**Orchard avatars** (`src/components/pearloom/avatars.tsx`): twelve
hand-drawn SVG account marks (pears, sprig, bloom, spool, seal,
envelope, lantern, bunting, midnight moon) in the dashboard tints.
Picker in Settings → Account ("Your mark") + the Welcome flow;
stored as `user_preferences.avatar` (migration `20260623`); a
module-cached `useUserAvatar()` store keeps the topbar button,
sidebar menu, and settings modal in sync instantly. Fallback chain:
mark → sign-in photo → initials.

**Site crest** (DashShell): the sidebar celebration switcher's
spinning conic-gradient square (BRAND §10 "AI startup" energy) is
replaced by `SiteCrest` — cover photo in a gold hairline frame, or
an occasion-tinted paper tile (peach wedding-arc / plum memorial /
gold party / lavender family-ceremony / sage default) with the
site's initial in display italic + the gold pearl. Dropdown rows
get mini-crests + a gold check on the active site. Dead
`pl8-sb-cele-spin` keyframes removed.

**Fixed while in there:** `/api/user/preferences` PATCH was
clobbering every unspecified field back to defaults (saving a
display name reset Pear voice / quiet hours / pronouns / timezone)
— now merges with the existing row. The settings modal read
`display_name` from a `.preferences.` envelope the API never
returned — saved names now load back.

### 2026-06-11 — Sealed Arrival + persistent guest identity (event graph phase 1)

**Sealed Arrival** — the published site's envelope-opening first-
visit experience. `src/components/pearloom/site/ArrivalReveal.tsx`,
mounted by `PublishedSiteShell` (home route only). Wax-seal
monogram envelope in the site's theme; tap breaks the seal, the
flap lifts, two threads draw across the seam, the paper parts like
curtains. Passport-link guests (`?g=`) get an envelope addressed to
them + a postmark with the event date. Solemn voices (memorial /
funeral) resolve to a Quiet Arrival (thread rule + name + fade).
New `manifest.arrival` field ('auto' | 'envelope' | 'quiet' |
'off') with an Arrival picker in the editor's Share panel. Client
overlay only (crawlers / OG never gated); reduced-motion skips;
once per device with a per-session thread flourish on return
visits; transient RSVP hand-off pill after open.

**Persistent guest identity (event graph phase 1)** — the
deliberate alternative to a general-purpose social network (see
the strategy note in this entry's session). One human across every
celebration:
- Migration `20260621_people.sql` (APPLIED to prod via MCP +
  recorded in `_pearloom_migrations`): `public.people` keyed by
  lowercase email (deny-anon RLS), `person_id` on `guests` +
  `pearloom_guests`, `link_guests_to_people(p_site_id)` SQL linker,
  full backfill. `connections_opt_in boolean DEFAULT false` ships
  now so phase 2 (opt-in "people you've celebrated with") has its
  flag, but NOTHING cross-guest is exposed yet.
- `src/lib/people.ts` — `normalizePersonEmail`, `resolvePersonId`
  (upsert, latest-known facts), `linkGuestRowToPerson`,
  `personHistoryForHost`. All failure-tolerant: identity never
  blocks an RSVP/import. PRIVACY CONTRACT in the module header:
  hosts only see history from their OWN sites; guests see their
  own history via passport token; cross-guest visibility is
  opt-in-later.
- Write paths wired: `/api/rsvp` POST + `/api/guests` POST link
  fire-and-forget; `/api/guests/import` batch-upserts people then
  calls the SQL linker once.
- Host surface: `GET /api/guests/person-history` (owner-gated,
  rate-limited) + "A familiar face" recognition chip in
  DashGuests' AddGuestDialog (debounced on email entry, shows
  shared events + known dietary).
- Guest surface: "Your celebrations on Pearloom" card on
  `/g/[token]` (`YourCelebrationsCard`) — every other PUBLISHED
  site where the guest's email appears, with their reply status,
  linking to each public site. Drafts never surface.

**Phase 2 (SHIPPED same day):** event-scoped messaging + opt-in
connections. Migration `20260622_event_graph_phase2.sql` (applied
to prod + tracked): `site_messages` table — one table, two shapes
(`thread='party'` = the event-wide guest thread, `thread='dm'` =
host↔guest logistics line), deny-anon RLS, host moderation via
`hidden_at`. Also enables RLS on `_pearloom_migrations` (Supabase
advisor finding, owner signed off).
- `src/lib/people.ts` phase-2 helpers: `resolveGuestToken`
  (normalizes BOTH guest credentials — guests.passport_token and
  pearloom_guests.guest_token, email-bridged), opt-in get/set,
  `familiarFacesForPerson` (mutual opt-in enforced in-query,
  first names only — unit-tested).
- Guest APIs: `/api/messages` (token-authed GET/POST, party + DM,
  rate-limited, DM pings the host's notification bell via
  notifyHost category 'replies'), `/api/guest/connections`
  (GET status+faces, POST toggle).
- Host API: `/api/messages/host` (owner-gated GET grouped
  party/DMs, POST as host, DELETE = hide/moderate).
- Guest surfaces on `/g/[token]`: `GuestThreadCard` (tabs: "The
  thread" / "Hosts", 25s poll, optimistic send, solemn-voice copy
  for memorials) + `CelebratedTogetherCard` (opt-in toggle,
  default off, familiar-face first names).
- Host surface: `/dashboard/messages` (DashMessages) — guest
  thread with post + hide, DM conversations with inline reply.
  New "Messages" tab in the Guests sub-nav.
- Delivery is polling (the BroadcastBar cadence); Supabase
  Realtime is the named upgrade path.

The decision log: full social network rejected — episodic users,
cold-start, brand mismatch; the event graph is the social layer.

### 2026-06-01 — Brief #2 surface-layer port + orphan/stale cleanup

Brief #2 from `ClaudeDesign/` shipped as commit `334f6f19`,
sitting on top of the engine pieces (textures / patterns /
motifs / kits) that landed in the previous session
(`cf79cb47`, `87fb527d`). This is the surface-layer work that
makes the new engine visible.

**Layout variants registry — 48 variants across 9 sections:**

Ported from the prototype's `LAYOUTS` map. Each section now
ships a registry of named variants that ThemedSiteRenderer
dispatches via `manifest.blockVariants?.<section>`,
`activeEdition.layoutDefaults?.<section>`, falling back to the
first variant.

New variant files under `src/components/pearloom/site/`:
- `details-variants.ts` — tiles / iconrow / list / accordion / bento
- `faq-variants.ts` — accordion / twocol / numbered / cards
- `registry-variants.ts` — cards / chips / progress / logowall
  (honeymoon-fund progress bar, per-store status)
- `rsvp-variants.ts` — centered / split / banner / minimal
- `travel-variants.ts` — map / rows / table / carousel
  (star ratings, review counts, price tiers, distance,
  amenity chips, blurbs, room-block codes)

Extended existing registries:
- `gallery-variants.ts` — added masonry / slideshow / polaroid
  (now 7 variants total: grid / mosaic / strip / masonry /
  slideshow / polaroid / wall)
- `hero-variants/index.tsx` — added typographic / fullbleed
  (5 shipped + 3 prototype-fallback variants)
- `schedule-variants.ts` — added list / stepper / numbered
- `story-variants.ts` — added quote / zigzag / letter

`EditionDefinition` (`src/lib/site-editions/types.ts`) gained a
`layoutDefaults?: Partial<Record<SectionKey, string>>` field so
each Edition prescribes its preferred variant per section. All
9 variant files are imported by ThemedSiteRenderer as
side-effect imports — registration markers
(`DETAILS_VARIANTS_REGISTERED`, etc.) confirm the dispatch
table is hot.

**Command palette (⌘K / Ctrl+K):**

`src/components/pearloom/editor/CommandPalette.tsx` ports the
prototype's fuzzy-search modal. Items pulled from existing
registries (editions, kits, events) + flow openers (theme
shop, decor library, publish, settings, preview). Arrow keys
navigate, Esc closes, Enter selects. Mounted in `EditorV8.tsx`
via global keypress listener. The existing dashboard ⌘K
(`DashCommandPalette`) extended for parity.

**In-editor theme shop bottom sheet:**

`src/components/pearloom/editor/EditorThemeShop.tsx` is a
bottom-drawer (distinct from the standalone `/store` route)
that lets hosts preview + unlock packs without leaving the
canvas. Pack tiles in horizontal-scroll strip + filter chips;
tapping a pack re-skins the canvas BEHIND the sheet via vars +
kit + motif override (preview, not purchase). Inline "Unlock"
button morphs spinner → owned → auto-apply. Owned set persists
to `localStorage 'pl-store-owned'` (SHARED key with `/store`).
Closing without unlock restores the snapshot manifest. Reuses
the `PACKS` catalog + `applyPackToManifest` + `useEntitlements`
from the store module.

**Guest RSVP modal:**

`src/components/pearloom/site/GuestRsvpModal.tsx` ports the
prototype's overlay RSVP flow as a complement to the inline
PresetRsvpForm. Reads occasion-specific fields via the same
`rsvpConfig.mealOptions` shape the existing form consumes.

**Dashboard chrome refresh:**

`src/components/pearloom/dash/PLChrome.tsx` +
`UserSettingsModal.tsx` — new dashboard top-chrome with
account dropdown. `DashShell` + `ShellPersistentLayout` +
`DashGuests` / `DashSettings` updated to match.

**Orphan + stale cleanup (this thread):**

Audit returned CLEAN — no critical orphans remained after the
Phase 4 V8 deletion + Theme Store migration. The 4 prior
sweeps in this session (status-audit, V8 deletion, Theme
Store, Brief #2) properly removed everything they touched:
- Zero broken imports of deleted files (SiteV8Renderer,
  MarketplaceV8, TemplatePreview, legacy marketplace pages).
- 100% of new variant files imported + dispatched via
  ThemedSiteRenderer side-effect imports.
- 100% of `pearloom/store/index.ts` exports consumed inside
  `ThemeStore.tsx` (CartProvider, useCart, PackCard,
  PackPreview, QuickLookModal, CartDrawer).
- Only 2 files remain in `src/components/pearloom/marketplace/`:
  `template-themes.ts` (used by `lib/templates/apply-template.ts`)
  + `templates-data.ts` (used by `WizardV8.tsx`).

Stale-comment refresh:
- `src/types.ts` — `rendererVersion?: 'classic' | 'v2'` docblock
  rewritten. Was claiming the field selects between
  `SiteRendererV2` and a "legacy block-driven renderer";
  neither exists anymore. Now correctly framed as a pure
  backwards-compat flag preserved for older DB rows.
- `src/components/pearloom/site/GuestRsvpModal.tsx` — line 167
  comment updated from "SiteV8Renderer/PresetRsvpForm" to
  "ThemedSiteRenderer's PresetRsvpForm" (V8 was deleted).
- `src/components/pearloom/marketplace/templates-data.ts` —
  header comment no longer references the retired `/marketplace`
  + `/templates` routes; now correctly attributes the consumer
  as `WizardV8`.

Intentionally preserved (legacy-compat with proper context):
- `src/app/api/generate/stream/route.ts:835` —
  `manifest.rendererVersion = 'v2'` set on new wizard
  generations for legacy DB consumers that still dispatch on
  it. The site route ignores it; `themeFamily='v8'` is the
  live dispatch axis.
- `src/app/api/celebrations/weekend/route.ts:123` — same
  field, same reason.
- `src/components/pearloom/site/ThemedSiteRenderer.tsx:12` —
  header references the deleted `SiteV8Renderer` only to
  document the consolidation; this is the canonical migration
  narrative, not stale code.

### 2026-06-01 — V8 renderer deleted (Phase 4 complete)

Renderer consolidation finished. `SiteV8Renderer.tsx` deleted
(was 10,324 lines / ~411 KB — formerly the largest file in the
repo). `ThemedSiteRenderer.tsx` is now the only renderer; no
dispatch, no fallback, no legacy code path.

Shipped:
- `src/components/pearloom/site/SiteV8Renderer.tsx` — **deleted**.
- `StoryManifest.renderer` field removed from `src/types.ts`.
- Look Engine renderer toggle removed from
  `src/components/pearloom/editor/panels/LookEnginePanel.tsx`.
- `PublishedSiteShell` (`src/components/pearloom/site/PublishedSiteShell.tsx`)
  + `CanvasStage` (`src/components/pearloom/editor/CanvasStage.tsx`)
  hardcoded to mount `ThemedSiteRenderer` directly.
- Supabase migration `supabase/migrations/20260617_drop_manifest_renderer.sql`
  drops the `renderer` key from existing rows' `manifest` JSONB.

Phase 1–3 product-feature ports (RSVP, Guestbook, Day-of
broadcast, inline edit mode, photo lightbox, nav/hero/story/
divider/footer/FAQ/gallery improvements, Decor library,
Event-OS custom blocks, multi-page routing, section
backgrounds) all landed in ThemedSiteRenderer before this
deletion — feature parity reached.

### 2026-06-01 — Renderer consolidation begins (Themed canonical, V8 legacy)

ThemedSiteRenderer (the design-prototype port) is the canonical Pearloom renderer going forward. SiteV8Renderer becomes legacy and will be deleted after feature parity is reached.

Dispatch contract during the transition:
- `manifest.renderer` unset (or any non-`'v8'` value) → ThemedSiteRenderer (canonical)
- `manifest.renderer === 'v8'` → SiteV8Renderer (legacy)

Why this is happening: ThemedSiteRenderer is the visual identity the project committed to over the last few months (prototype port: themes.jsx/kits.jsx). V8 was the older renderer that accumulated product features (RSVP backend, Guestbook, Day-of broadcast, inline edit mode, photo lightbox) which Themed lacks. The path forward is to port V8's product features INTO Themed, then delete V8.

**Phase 0** (this session, complete): rename toggle copy, add canvas banner on V8, document contract.

**Phase 1** (this session, in progress): port V8's blocking product features into Themed:
- Working RSVP form + backend integration + urgency tiers
- Guestbook
- Day-of broadcast (DayOfBanner, BroadcastBar, GuestPearChat)
- Inline edit mode (EditableText, click-to-edit, onEditField)
- Photo lightbox + action menu

**Phase 2** (this session): port the recent component-roadmap improvements that landed in V8 only:
- 9 nav variants (5 desktop + 4 mobile) + Edition recommendations
- Hero variant registry + LivingAtmosphere parallax + gradient fallback
- Story chapter accent from photo
- Edition divider scroll-reveal
- Footer share chips + Edition palette
- FAQ inline CTAs by category
- Gallery strip + wall variants + Edition tile frames

**Phase 3** (future session): port Decor library, Event-OS custom blocks, multi-page routing, section backgrounds.

**Phase 4** (future session): SQL migration + delete `SiteV8Renderer.tsx` + remove `manifest.renderer` field.

### 2026-05-30 — Site Editions: layout overhaul Phases 1-3a, 2b

Major upgrade to generated sites — five named "Editions" each
ship a coordinated set of layout defaults (hero variant,
atmosphere preset, section divider rhythm) that the host picks
in one click. Replaces the old axis-by-axis layout configuration
where each surface lived in a separate panel.

**The 5 Editions** (see `src/lib/site-editions/editions.ts`):
- **Almanac** — bound book. Postcard hero, chapter marks,
  thread dividers, generous serif type. Recommended for
  wedding, anniversary, vow-renewal.
- **Cinema** — letterboxed film magazine. Photo-first hero,
  sprocket dividers, slug-line section openers, pearl CTA.
  Recommended for engagement, milestone birthdays.
- **Postcard Box** — tilted polaroid cards on cream-deep gauze,
  stitch dividers, stamp openers, no atmosphere shader.
  Recommended for bachelor/ette, bridal shower, reunion,
  sip-and-see, baby shower.
- **Linen Folder** — hotel stationery formal. Split hero,
  gold-hairline dividers, mono-uppercased labels with leading
  gold dot. Recommended for rehearsal dinner, bar/bat mitzvah,
  quinceanera, baptism, retirement.
- **Quiet Edition** — whitespace and restraint. Minimal hero,
  whitespace dividers, tiny mono overlines, no chrome.
  Recommended for memorial, funeral.

**CRITICAL CONTRACT**: Editions are READ-TIME defaults only.
The resolver (`src/lib/site-editions/resolve.ts`) never writes
back to the manifest. Hosts who set explicit per-block
overrides (heroVariant, atmosphere, blockOrder) keep them.
This protects every existing published site from any visual
regression.

**Shipped this pass**:
- `src/lib/site-editions/` module: types, editions registry,
  resolver, 19 passing tests covering registry shape +
  recommendation logic + resolver fallback chain
- `StoryManifest.edition` typed in `src/types.ts`
- `SiteV8Renderer` wired: hero variant fallback +
  atmosphere fallback chain (explicit > Edition > occasion
  default > legacy default)
- `src/components/pearloom/site/edition-dividers/` — 5
  divider components mounted in the SortableBlockList loop
  between sections
- `src/components/pearloom/site/edition-openers/` — 5
  opener components (built; per-section title-slot mounting
  deferred to Phase 4 when section dispatch is touched)
- `src/components/pearloom/editor/panels/EditionPicker.tsx`
  mounted at the top of the Theme panel as the
  highest-altitude design decision. 2-col grid of 5 tiles
  with 240×100 inline-SVG miniatures; active tile gets
  sage-tint highlight; unset+recommended tile gets a peach
  "★ Recommended" badge.

**Resolver logic** (`recommendEdition`): occasion match wins
first (memorial → quiet, bachelor-party → postcard-box, etc.);
voice falls through second (solemn → quiet, ceremonial →
linen-folder, playful → postcard-box); `DEFAULT_EDITION_ID =
'almanac'` as final fallback. Wizard-generated sites
automatically get the right Edition via this read-time
fallback — no wizard step needed, no API change.

**Phase 5a (edition-aware OG cards) also shipped**:
`/api/og` accepts an `edition` param; metadata emitter at
`src/app/sites/[domain]/page.tsx` reads `manifest.edition`
and forwards it. Cinema gets letterbox black bars, Linen
Folder gets centered gold hairlines; the others keep the
editorial frame. Sites without an explicit edition (or with
an unrecognized one) render the unchanged editorial frame —
zero regression on previously-shipped share cards.

**Deferred to subsequent phases** (genuine multi-session
refactors — flagged with their estimated session count from
the planning workflow):
- **Phase 4**: Schedule + Gallery section extraction into the
  registerBlockStyle variant pattern (5-10 sessions; touches
  the 8000-line SiteV8Renderer). Each section becomes a
  registry of variants matching the Hero + Story precedent.
- **Phase 5b**: per-Edition microcopy packs + long-tail block
  variants (Travel / FAQ / Registry / RSVP) on demand. Ship
  variants only when a specific Edition needs them, not by
  completeness.
- **Section-opener mounting**: the 5 opener components ship
  in `edition-openers/` but mounting each section's title
  slot requires touching every Section component in
  SiteV8Renderer (StorySection, ScheduleSection, etc.).
  Folded into Phase 4 since each Section will be extracted
  there anyway.
- **"Tilted grids" direction** (Margins / Spread / Newspaper
  / Wall / Filmstrip / Letterpress-sheet) — explicitly
  deferred per the plan; requires container-query foundation
  before safe to ship.

### 2026-05-30 — Other simplification-audit wins shipped this session

Multi-agent audit returned 18 ranked wins across editor /
dashboard / guest surfaces / cross-cutting. Shipped this thread:

- **Quick-edit modals** now route through `onManifestChange`
  (was silent data-loss bug — modals bypassed autosave + undo
  via `setManifest(() => m)`).
- **Duplicate AskPearFloater deleted** — GuestPearChat is the
  strictly-better streaming, guest-passport-aware version
  already mounted in the published-site tree. ~200 lines plus
  the summarizeManifest helper removed.
- **WhisperCard + CapsuleCard gated** behind
  `manifest.passport.allowWhispers` / `allowCapsule` (default
  OFF). Was shipping empty composers to every guest.
- **FloatingCountdown deleted + BroadcastBar suppressed in
  day-of**. Three competing top-chrome bars during peak
  engagement → one coordinated banner.
- **PresetRsvpForm sorts attending first** — guests no longer
  fill conditional fields then lose them when they toggle
  declined.
- **RegistryClaimsFeed two-stage revoke** — `window.confirm`
  replaced with arm-then-confirm inline button. Works in
  both editor + dashboard mount contexts.
- **DashHomeV8 trimmed** — Moments (placeholder tones) +
  LinkedCelebrations (dup of `/dashboard/connections`) +
  PearAssistant (context-less AI chat dup) all unmounted.
  Milestones returns null when no eventDate (was fake
  "RSVP deadline in 18 days" rows).
- **DashSubNav 22 → 10 essentials**. Routes still work at
  their URLs; ⌘K palette is the discovery surface for the
  de-promoted tools.
- **Photo replace URL paste → file upload** in
  GalleryQuickEditModal.
- **CustomPaletteEditor deleted** (~130 lines duplicating
  ColorTokenInspector).
- **StoryManifest fields typed**: rsvpConfig, rsvpButton,
  passport, weatherStyle, edition. ~10 `as unknown as` casts
  dropped across RsvpPanel, DetailsPanel, SiteV8Renderer.

**Deferred from audit** (need dedicated sessions):
- #7 Merge Gallery + Library (routing migration)
- #9 Promote PresetRsvpForm canonical, delete multi-step
  RsvpForm (~600-line rewrite)
- #11 Unify rewrite-tone across HoverToolbar + PearCommand +
  DesignAdvisor (variant-chip UX redesign; current vocabulary
  already consistent — what's missing is the one-round-trip
  preview pattern)
- #14 Merge BlockStyle + sectionBackgrounds (data migration
  risk; the two panels serve different mental models — bulk-
  edit vs deep-edit — so this is a UX redirect, not a true
  simplification)
- #15 Dashboard btn helpers (55 usages of `style={btnInk}`
  pattern; migration to `<Button variant>` is mechanical but
  touches 11 files)
- #16 Token aliasing (`--cream` → `var(--pl-cream)`); blocked
  on editor surfaces being insulated to `--pl-chrome-*` first
  or it leaks dark-mode swaps into editor chrome

### 2026-04-30 — Mass dead-code prune (~13,000 lines deleted)

After the surface prune, the user said "keep going don't stop".
Pivoted from "hide settings" to "delete orphan files". A
systematic per-folder grep confirmed which files no consumer
imported, deleted them in batches with type-check between each.

**51 components / utilities deleted across 5 batches:**

Round A — editor + site (3 files, ~1532 lines):
  • editor/panels/AssetLibraryPanel.tsx — v1 of LibraryPanelV2
  • editor/BlockMiniature.tsx — never imported
  • site/VideoChapterPlayer.tsx — never imported

Round B — V1 marketing landing components (29 files, ~8082 lines):
  Production HomeV8 imports from `marketing/v2/*` and
  `marketing/design/dash/*`. Everything at `marketing/<Top>.tsx`
  was an old design that was never swapped back to:
    BlocksLibrary, BlockTypesGrid, DirectorTimeline, EditorShowcase,
    EditorialHero, EventOSPillars, FAQSection, GuestExperience,
    HeroAtmosphere, HowItWorks, InteractiveFeatureGrid, MarketingFooter,
    MarketingNav, OccasionOrbit, PearsPromise, PricingPreview,
    ShowroomParallax, SiteMockup, SiteShowroom, SocialProofBar,
    Testimonials, TheLoomShowcase, TrustSignals, WeavingScrollSection,
    WovenDivider + the four Groove* siblings.

Round C — brand + shell (7 files, ~1148 lines):
  • brand/ AmbientNav, KineticHeading, Pull, WeaveLoader (BRAND
    primitives that were catalogued but never wired up)
  • shell/ AppShell+NavGroup+NavItem, ResponsiveTable, SiteSelector
    (superseded by DashShell / DashLayout)

Round D — root-level legacy (5 files, ~1806 lines):
  • mood-decorator, rsvp-insights, session-provider (dup of
    auth-provider), travel-guide, visual-timeline.

Round E — lib/ utilities (17 files, ~2570 lines):
  • assets, block-catalogue, breakpoint-utils, card-illustrations,
    clipboard, corner-presets, editor-ids, editor-log,
    marketplace-assets, patterns, plan-tiers, realtime-collab,
    referrals, use-reduced-motion, use-site-role, wedding-graph,
    wizard-state.

Net: ~15,138 lines of dead code obliterated. Type-check clean
throughout. The codebase is dramatically smaller and easier to
navigate. Nothing user-facing changed — these were all files
nothing imported.

### 2026-04-30 — Editor surface prune (round 4) + schema cleanup

Continuing the user's "cut down" direction.

**ThemePanel disclosures (more):**
- Decor library + Stickers grouped under one "✦ Decor extras —
  AI-drafted dividers, stamps, stickers" `<details>`. Most hosts
  don't touch the AI decor generator or sticker overlay; the
  Theme scroll no longer surfaces them by default.
- Snapshots (version-history) under "↺ Version history (snapshots)"
  `<details>`. Power feature kept fully functional, just hidden
  from the casual scroll. Theme panel is now ~2/3 the visual
  length it was at the start of this prune sweep.

**StoryManifest schema cleanup:**
Verified each via repo grep before deletion. Renderer untouched;
only the type was carrying field declarations nothing read.

  Dropped:
  - `lastAsset` — unused
  - `sitePassword` — unused (privacy gating uses
    manifest.privacyGate.password from the Event-OS round)
  - `watermark` — unused (only matches were AI prompt strings)
  - `privateGallery` — unused
  - `heroBadgeStyle` — declared on legacy <Hero> props but no
    consumer threaded the manifest field through; Hero falls
    back to defaults
  - `heroCountdownStyle` — same pattern
  - `heroTextColorOverride` — same pattern
  - `broadcasts` (manifest field) — feature uses public.live_updates
    table, not this manifest array
  - `postEventMode` — unused (post-event behavior is event-date
    math + dayOfMode)
  - `parchmentTint` — unused
  - `typographyPair` — unused (theme.fonts.* is canonical)
  - `customization` — typed but never read
  - `savedComponents` — typed but never read

  Kept:
  - `decorDrafts` — used by DecorLibraryPanel as editor working
    state (drafts in flight)
  - `themeFamily` — set by generation routes; not read by SiteV8
    but plausibly a future migration signal. Defer.

13 orphan field declarations gone. Lighter manifest payloads,
fewer footguns.

### 2026-04-30 — Editor surface prune (round 2)

User direction: "cut down on all these advanced settings as much
as possible and make it very user friendly". Acted on the audit
from earlier in the day.

**Removed UI / dropped writes:**
- FontPicker: deleted the "Script" font dropdown entirely (no v8
  surface ever consumed `theme.fonts.script` — it was editor
  chrome only). Stopped writing top-level `headingFont` / `bodyFont`
  / `scriptFont` — renderer only reads `theme.fonts.{heading,body}`.
- ThemePanel: deleted the "Active theme" PanelSection (free-text
  "Theme name" input + swatch tile). The text wrote `themeName`,
  which nothing read. Active palette is already labelled in the
  grid below. Dropped the legacy local-variable reads (palette,
  spacing, headingFont, bodyFont, scriptFont, themeName) — active
  palette resolved by matching `theme.colors.accent` against the
  preset list.
- SpacingPanel: deleted the entire "Section spacing"
  (cozy/comfortable/spacious/lush) picker + its `setSpacing()`
  writer. Wrote `manifest.spacing` AND `manifest.theme.spacing` —
  renderer reads neither. Renamed panel "Spacing & shape" →
  "Corner shape" since only card + photo radius remain.
- DecorLibraryPanel: deleted the divider-strength three-button
  picker. Renderer falls back to 'standard' when unset.
- AtmospherePanel: removed the inline per-section
  kind+intensity dropdown grid. Existing legacy overrides still
  render and now show as "Overriding hero — kind · intensity"
  with a Clear pill. The full picker was used by <2% of hosts.
- AtmospherePanel: tucked the ten decor-visibility switches under
  a native `<details>` disclosure inside an "Advanced" PanelSection.
- DecorLibraryPanel: tucked each per-slot custom-prompt composer
  under a "Custom direction (optional)" `<details>` so the
  default flow stays clean.

**Net surface change:** 5 form fields and 1 entire dropdown
removed from the main Theme + Atmosphere flows. Editor reads
noticeably quieter.

**Round 3 (also shipped, after the round-2 prune):**
- ColorTokenInspector: hoisted the accent picker inline (the
  one most hosts actually tweak); tucked Paper / Ink / Soft /
  Muted / Card behind an "Other colors — paper, ink, soft,
  muted, card" disclosure. Renamed panel "Color tokens" →
  "Tweak colors". One-click accent edits, five swatches off-
  screen by default.
- HeroPanel: tucked Time zone + Date format under a "Time zone
  & date format (optional)" disclosure inside the "When &
  where" PanelSection. Visible field count drops from 7 to 5.
- AtmospherePanel: tucked the entire 8-row × 5-option Section
  backgrounds button grid under "Override the paper for
  individual sections" disclosure.
- Verified clean (already correctly disclosed):
  NavPanel (calm/crisp/loud Mood preset + Advanced disclosure
  for the four motion axes — exemplar of the pattern).
  BlockStylePanel (per-section spacing inside "Layout"
  disclosure; six granular card fields inside "Card details"
  disclosure).
  DetailsPanel / SchedulePanel / FaqPanel / StoryPanel /
  TravelPanel (already focused).

**Still on the list (deferred):**
1. Group ThemePanel's still-12-sub-section vertical scroll into
   4-5 logical clusters — Palette / Type / Spacing-Corners /
   Decoration / Layout. The flow reads better than it did, but
   it's still long.
2. "Hero decoration" `decorStyle` toggle: three options
   (`occasion` / `classic` / `off`). All three have real
   renderer paths; removing 'classic' would silently change
   sites that opted in. Leave alone unless we add a migration.
3. Consolidate `manifest.atmosphere` + `manifest.aiAccentUrl` +
   `manifest.decorLibrary` + `manifest.stickers` under a
   single "Decoration" parent — they're all visual flair and
   rarely all touched together. Structural reorg, not a quick
   prune.

### 2026-04-30 — Settings audit: orphaned writes + dead reads

User flagged the layout feature as "glitchy" and asked for a
comprehensive audit of every editor panel × every manifest field
to confirm the canvas reflects what the host configures.

**Layout / siteMode (the original report):**
- `manifest.pageMode` was a true orphan — declared in types.ts,
  listed in ai-chat's manifest-path catalog, and referenced in
  the AI prompt's "current state" block, but never read anywhere.
  `manifest.siteMode` was the actual field the renderer + route
  layer consumed (with different value vocabulary: 'scroll' vs.
  'multi-page', not 'single-scroll' vs. 'multi-page'). When Pear
  patched pageMode the manifest stored it but the site never
  changed. Verified via SQL: 0 production rows had pageMode set.
- New `src/lib/site-mode.ts` module: canonical SiteMode +
  SiteBlockKey types, DEFAULT_BLOCK_ORDER, DEFAULT_HOME_BLOCKS,
  MULTI_PAGE_BLOCKS, BLOCK_PAGE_SLUG, plus type-safe `readSiteMode`
  + `readHomePageBlocks` helpers. Editor's LayoutModeSection,
  SiteV8Renderer, and both route handlers now import from one
  place — they can't drift.
- Sub-page route (`/sites/[domain]/[page]`) now redirects to home +
  anchor when `siteMode === 'scroll'`. This was the most visible
  glitch: a host flipped to scroll mode but old shared sub-page
  links still resolved, landing guests on a thin sub-page that
  didn't match the rest of the nav. Fixed.
- Removed `pageMode` from types + ai-chat references. Pear now
  patches the right field.

**RsvpPanel — three toggles that no-op'd, now wired:**
- `manifest.rsvpConfig.plusOnes` (default true): gates the
  "Bringing someone?" +1 invite-link composer in the public
  RSVP success card.
- `manifest.rsvpConfig.songRequests` (default true): gates the
  SongCard composer in /g/[token]'s PassportSections.
- `manifest.features.guestbook` (default false): mounts the
  Guestbook component on the public site between the block
  iteration and the footer. Skipped on multi-page sub-pages
  (the wall is a destination). The Guestbook component existed
  in src/components/guestbook.tsx for months but was never
  mounted by any consumer — orphaned. The toggle now does what
  hosts expect it to.

**ThemePanel — Motif picker rewired + duplicate writes dropped:**
- The "Motif" picker (Pear Stamps / Loop Lines / Soft Shapes)
  wrote `manifest.motif` (singular) — an orphaned field. The
  renderer reads `manifest.motifs` (plural object: blob /
  stamp / squiggle / sparkle / heart / postIt / polaroid).
  Picker tile lit up; rendered site never changed. Now it
  writes to the canonical `manifest.motifs` with mutual-
  exclusion logic — pear sets stamp, squiggle sets squiggle,
  blob sets blob; each pick clears the other two slots.
- Dropped legacy duplicate writes: applyPalette() no longer
  writes `palette` + `themeName` (renderer only reads
  `theme.colors`); applyFont() no longer writes `headingFont`
  + `bodyFont` (renderer only reads `theme.fonts.*`). These
  were write-only orphans bloating manifest payloads and
  inviting future code to read the wrong field.

**What's deferred (low-impact, leave for now):**
- `manifest.scriptFont`, `manifest.spacing`, `manifest.themeName`
  (separate from applyPalette write) — still written by ThemePanel
  controls but no renderer reads them. Removing requires a small
  UX decision per control. Cosmetic noise; defer.
- `manifest.atmosphere` shape: AtmospherePanel writes a complex
  object that the renderer reads in many places. Verified all
  fields connect.
- `manifest.blockStyles[*]` per-section overrides: thoroughly
  wired (BlockStylePanel writes 13 fields, all consumed by
  SiteV8Renderer's BlockStyleWrapper).
- `manifest.stickers[]`: thoroughly wired (StickerTrayPanel ↔
  StickerLayer renderer).
- `manifest.events[]`, `manifest.travelInfo.*`, `manifest.faq[]`,
  `manifest.registry.*`, `manifest.chapters[]`, `manifest.poetry.*`,
  `manifest.logistics.*`, `manifest.theme.*`, `manifest.nav.*`:
  all verified end-to-end.

**Dead reads (renderer reads, no panel exposes):**
- `manifest.occasion` — wizard-seeded only, by design.
- `manifest.vibeString` — wizard-seeded only, by design.
- `manifest.voiceDNA` — set from `/dashboard/voice`, by design.
- `manifest.subdomain` / `publishedAt` / `analytics` — read-only
  published state, by design.

### 2026-04-29 — Cross-feature wiring pass

Push to close loops across previously-shipped surfaces — the
features all existed, but data wasn't flowing between them.
Everything below is shipped (commits on main, awaiting push).

**Pear concierge — full context + auto-resolution:**
- `summariseManifest` in `/api/pear-chat` now feeds Pear the
  registry entries + cash fund, travel intro / parking /
  directions, hotel addresses + booking links, details cards
  (parking, accessibility, custom cards) and venue address. A
  guest asking "where's the registry link?" / "can my mom park
  close?" / "is the hotel pet-friendly?" now gets specifics.
- `<GuestPearChat>` mounted on `/sites/[domain]` self-resolves
  the visitor's identity from `?g=<passport_token>` (same path
  `<PersonalGuestGreeting>` uses). Guests who arrived via their
  personalized link get the same RSVP-aware concierge they had
  on `/g/[token]` anywhere on the public site.

**Pear host advisor — live activity stats:**
- DesignAdvisor (editor's Pear pill) now passes `siteSlug` to
  `/api/pear-chat`. Host mode fetches RSVP counts (attending /
  declined / pending), photo / claim / guestbook / submission
  totals — cached 30s per slug. Stats baked into the prompt as
  a LIVE ACTIVITY block. Host-mode system prompt now nudges
  Pear: "when the host asks 'what should I focus on?', lead with
  the most actionable number" — turning Pear from copywriter
  into real assistant.

**Notification bell — five new sources wired:**
- `registry_link_claims` → `kind: 'registry'`, gift-glyph,
  href to `/dashboard/registry`. Closes the gift→host loop
  outside the editor's RegistryPanel.
- `tribute_submissions` (advice / tribute walls) → reuses
  `kind: 'guestbook'`, hidden state filtered. Lands on
  `/dashboard/submissions`.
- `toast_signups` → reuses `kind: 'whisper'` for the peach
  tint. Volume is naturally low.

**`/g/[token]` words feed:**
- `<YourContributionsCard>` extended with a third strip — "Words
  you wrote" — that merges four guest-keyed text tables:
  `memory_prompts.response`, `whispers.body`,
  `song_requests.song_title`, `time_capsule.body`. All four
  already FK to `pearloom_guests(id)`; data was just never
  surfaced back to the guest. Each row gets a kind label
  (Memory · Whisper · Song request · Time capsule).

**Earlier in the session (already in commits before today):**
- `guest_photos.guest_id` migration + upload route accepts
  `guestToken` form-data → resolves to `pearloom_guests.id`.
- `<YourContributionsCard>` + `/g/[token]` photos + claims hub
  + RSVP card + DayOfBanner + BroadcastBar mounts.
- Bulk-nudge composer (`<NudgeComposer>` + Pear-drafted body
  via `/api/guests/draft-nudge` + send via `/api/guests/nudge`).
- `email_sent_at` stamps on invite + rsvp-email send paths.

**Plus (also shipped this session, after the initial summary):**
- Memory book aggregator now also pulls `tribute_submissions`
  + `guestbook` (with safe-fetch wrappers for older deployments).
  The "wall" and "guestbook" sections render in the printable
  keepsake. Closes the advice-wall loop end-to-end:
  guest posts → bell pings → host moderates → it lives in the
  printed book.
- Speech composer now embeds an "Words from your guests" panel
  fed by the same memory-book endpoint (memories + tributes +
  guestbook). Tap "Quote" on any row to drop the line into the
  draft with attribution. Closes the gap between guest material
  and the surfaces that mine it for toasts/vows.

**Round 2 (also shipped this session):**
- **Guestbook attribution end-to-end**: migration 20260615 adds
  `guestbook.guest_id` (nullable FK to pearloom_guests). Route
  resolves a `guestToken` form param to `pearloom_guests.id`;
  the public Guestbook component reads `?g=` / `?guest=` from
  URL on mount and threads it through. `/g/[token]` words feed
  now also surfaces guestbook signatures.
- **Registry claims feed extracted** to
  `@/components/registry/RegistryClaimsFeed` + `useRegistryClaims`
  hook. Editor RegistryPanel + `/dashboard/registry` both mount
  the same component now. Hosts who never open the editor still
  see who claimed what + can Draft thank-yous.
- **Pear advisor "send the nudge" action intent**: extends
  `pearloom:patch` with an optional `action` field (typed shape:
  `{ kind: 'send_nudge_pending', previewBody }`). Pear emits the
  envelope when the host explicitly asks to send; the new
  `<PearActionCard>` renders instead of `<PatchProposalCard>`,
  shows the previewBody, and on approval fans:
    `GET /api/guests/pending-ids?siteSlug=…` →
    `POST /api/guests/draft-nudge` (if no preview) →
    `POST /api/guests/nudge` with `{ siteId, guestIds, bodyText }`.
  Card flips to "✓ Sent to N guests". Pear is now a real
  assistant, not just a copywriter.
- **Day-of broadcast emails**: migration 20260616 adds
  `live_updates.email_broadcast_at` + `email_recipient_count` with
  a partial index for the daily-cap query.
  `/api/sites/live-updates` POST gains an `email: boolean` field;
  when true, fans out to attending guests via Resend (3/24h cap,
  tagged for the existing webhook). BroadcastComposer adds an
  off-by-default "Also email everyone attending" toggle with a
  confirm prompt + per-row ✉ N pip on emailed history entries.
  Closes the gap between BroadcastBar (30s polling on-site only)
  and guests not currently looking at the site.

**What's deliberately deferred (next session candidates):**

1. **Pear advisor more action kinds**: `send_nudge_pending` is
   the first, easiest case. Next obvious ones: `send_thank_yous`
   (per registry claim), `email_broadcast` (compose + send a
   day-of update through chat), `mark_attending` (set RSVP for
   a named guest the host mentions).
2. **Realtime broadcast delivery**: switch BroadcastBar's 30s
   polling to Supabase Realtime so on-site guests see live
   updates instantly; the email path is the failsafe for
   off-site guests.
3. **SMS broadcast**: parallel path to email for hosts with
   Twilio. Same composer toggle, even tighter rate limit.
4. **Per-guest broadcast deep-links in /g/[token]**: when an
   `?lu=<live_update_id>` param is present after an email click,
   highlight that update in the BroadcastBar so the recipient
   knows what triggered the email.

### 2026-04-23 — Retention + polish pass (Phase D completion)

A push to close the 4 TODOs flagged in the 2026-04-22 entry plus
five follow-ons. Everything below is shipped + pushed.

**Moderation:**
- **Advice / tribute / toast submissions** persisted to three new
  Supabase tables (`tribute_submissions`, `toast_signups`,
  `activity_votes`) with belt-and-braces deny-anon RLS.
- **Public write APIs** — `POST /api/event-os/submissions`,
  `POST /api/event-os/votes`, `POST /api/event-os/toasts` — each
  with unique-constraint dedup, 409 on slot conflict, and a
  graceful `stored: false` fall-through when Supabase env vars
  are missing.
- **Host moderation APIs** — `GET+PATCH /api/event-os/submissions/moderation`,
  `GET /api/event-os/votes/moderation`,
  `GET+DELETE /api/event-os/toasts/moderation`. All gated on
  `site_config.creator_email === session.user.email`.
- **Dashboard at `/dashboard/submissions`** composes three
  host-only panels: `SubmissionsModeration` (approve/hide/flag
  guest posts), `VotesSummary` (per-block winner + ranked tally
  + voter count), `ToastClaimsList` (per-block slot claims with
  void button).

**AI voice per event category:**
- `VOICE_GUIDANCE` / `VOICE_PRONOUNS` / `VOICE_BANNED` constants
  in `claude-passes.ts` — extended `poetryPassClaude`,
  `corePassClaude`, `critiqueChaptersClaude` to accept a
  `voice` param drawn from `EVENT_TYPES[occasion].voice`.
  Memorial sites now get "solemn" tone directives; bachelor
  parties get "playful"; etc. Pipeline threads the voice
  through every pass.

**PrivacyGate enforcement:**
- `privacyGate` block's `config.password` is now actually
  enforced via the existing PasswordGate + SitePasswordWrapper
  flow (`/sites/[domain]/page.tsx`). Legacy
  `comingSoon.passwordProtected` still wins if both are set.

**RSVP preset answers UI:**
- Extended Guest type on `/rsvps/page.tsx` with `rsvp_preset` +
  `rsvp_answers` JSONB. Desktop table + mobile cards render
  `<PresetAnswerChips />` so hosts see cost-acknowledge,
  bed-pref, memory-share, advice answers — not just legacy
  wedding columns.
- **Guest detail drawer** — clicking any row opens a right-edge
  drawer with the full `rsvp_answers` breakdown + email
  mailto + invited/replied timestamp. Esc / backdrop close.

**Event linking — sibling events for one celebration:**
- New `manifest.celebration = { id, name }` field on
  StoryManifest. Sites sharing the same `id` are siblings of
  each other.
- `PATCH /api/celebrations` (owner-only) sets/clears the field;
  mints a UUID if the caller didn't supply one.
- `GET /api/celebrations/siblings?siteId=X` (public) returns
  published siblings — domain, occasion, display title.
- `<LinkedEventsStrip />` renders above the footer on any
  published site that's part of a celebration with ≥1 sibling.
- `/dashboard/connections` page hosts `ConnectionsPanel` — host
  names the celebration, toggles which of their sites belong.

**Memorial publish guardrail:**
- `PublishModal.tsx` intercepts `occasion === 'memorial' |
  'funeral'` with a re-read interstitial listing a small
  checklist (names + dates, tone, service details, family
  review). Host clicks "I've re-read it" to continue.

**Per-event OG images:**
- Occasion label map expanded from 5 → 28 entries
  (`/api/og/route.tsx`). Memorial shows "IN LOVING MEMORY";
  sip-and-see shows "SIP & SEE"; etc.
- Solo-honoree events (birthdays, memorials, graduations,
  retirements, showers) centre a single 84px name without
  the "&" glyph. Metadata emitter (`/sites/[domain]/page.tsx`)
  skips `name2` for these occasions.

**StoryManifest.occasion widened** from the legacy 5-event
union to the full `SiteOccasion` type.

**Nav integration:**
- Desktop sidebar + mobile drawer now expose
  `/dashboard/submissions` + `/dashboard/connections` under
  the "Run event" section.

**Editor empty-state hints:**
- `SiteRenderer.tsx` cases for costSplitter, packingList,
  activityVote, toastSignup, obituary, livestream, program
  render a `.pl-empty-gradient` editorial strip in edit mode
  when content is empty. Published view still returns null.

**Minimal per-event wizard step:**
- New `'event-details'` step in `PearSpotlight.tsx` sits
  between venue + photos. Fires only for:
  - `bachelor-party` / `bachelorette-party` / `reunion` →
    asks "How many days?"
  - `memorial` / `funeral` → asks livestream URL + "in memory
    of / donations" line
  - `graduation` → asks school
- `Collected.eventDetails` typed + passed to
  `/api/generate/stream` for downstream LLM passes to use.

**What's still deliberately deferred:**

1. **Server-side consumption of `eventDetails`** — the wizard
   captures the fields; Gemini/Claude prompts don't yet read
   them. Trivial to wire once the pattern is picked (seed the
   block configs during generation vs. inject into prompts).
2. **PearSpotlight refactor** (§17 design debt) — still 144KB.
   Visual regression testing required; deferred to dedicated
   session.
3. **Voter-key hashing** — raw random IDs provide dedup today;
   with no real guest identity there's nothing meaningful to
   hash. Revisit when we add guest auth.
4. **Server-side `tribute_submissions` sync for localStorage
   blocks** — `AdviceWallBlock`, `ActivityVoteBlock`,
   `ToastSignupBlock`, `PackingListBlock` write to localStorage
   only today. Schema + API is in place; wiring each block is
   low-risk follow-up work.

### 2026-04-22 — All 28 event types graduated to beta

Every event type in the catalog now has a template and a
non-'planned' status. **28 of 28 shipping or beta.**

Summary of what's shipped across the sequence of commits:

- **10 new blocks**: itinerary, costSplitter, packingList,
  activityVote, adviceWall, toastSignup, obituary, livestream,
  program, privacyGate — all with schema + catalogue + SiteRenderer
  case + bespoke renderer.
- **21 new templates** (one per previously-planned event) —
  each a real editorial build with palette, vibe string,
  poetry, and blocks wired up.
- **RSVP preset system** (from earlier Phase A) consumed by
  `PresetRsvpForm.tsx`; every non-wedding site gets the right
  questions per event.
- **Supabase `guests.rsvp_preset` + `guests.rsvp_answers`** —
  preset-specific RSVP answers persist.

Coverage (status in EVENT_TYPES registry):
  Shipping: wedding, engagement, anniversary, birthday, story
  Beta (23): bachelor-party, bachelorette-party, bridal-shower,
            rehearsal-dinner, welcome-party, brunch, vow-renewal,
            bridal-luncheon, baby-shower, reunion,
            milestone-birthday, first-birthday, sweet-sixteen,
            retirement, graduation, memorial, funeral,
            bar-mitzvah, bat-mitzvah, quinceanera, baptism,
            first-communion, confirmation, housewarming,
            gender-reveal, sip-and-see

What's deliberately deferred (noted for next product sessions):

1. **Server-side sync for the localStorage blocks** — adviceWall,
   activityVote, toastSignup, packingList all persist guest state
   to localStorage only. Multi-guest visibility needs
   `tribute_submissions` / `activity_votes` / `toast_signups`
   tables + API routes. Every block has a clear schema; the
   interfaces are stable.
2. **Authenticated access for privacyGate** — today the block is
   a *callout* that declares the policy. Real password/session
   enforcement lives in PasswordGate (existing) but isn't wired
   to the block. Next session's work.
3. **Dashboard UI for rsvp_answers JSONB** — the column exists
   and is written; the guest dashboard still only shows the
   legacy columns (meal, dietary, song, message). One session
   of UI to surface preset answers per event type.
4. **AI voice per event category** — EVENT_TYPES already
   declares a `voice` field (celebratory / intimate / ceremonial
   / playful / solemn); the Gemini/Claude prompts don't yet
   vary by it. Low-effort follow-up that raises the AI-draft
   quality meaningfully for memorials + bachelor parties.

### 2026-04-22 — Phase B.1 completion + B.2 + B.3

**Phase B.1 wrap-up (bachelor/ette deep)**
- 4 new blocks shipped end-to-end (renderer + schema + catalogue + SiteRenderer case):
  - `packingList` — checklist grouped by category, per-guest check-off via localStorage
  - `activityVote` — multi-choice poll with bars + "your pick" marker, localStorage vote
  - `adviceWall` — prompted submissions, seeded entries from host, local submit
  - `toastSignup` — ordered slots with name claim via localStorage
- All four are purely presentational + localStorage for MVP; Supabase tables (`tribute_submissions`, `toast_signups`, `activity_votes`) remain the right next step for real multi-guest sync.

**Supabase: `guests.rsvp_preset` + `guests.rsvp_answers`**
- Migration `20260422_rsvp_preset_answers.sql` adds `rsvp_preset TEXT` + `rsvp_answers JSONB` to the `guests` table (the actual RSVP store; `public.rsvps` is legacy).
- `/api/rsvp` writes both on every submission; legacy columns (meal_preference, dietary_restrictions, song_request, message) remain authoritative when the preset maps onto them.
- Guest dashboards that want preset-specific answers now have a JSONB column to read from.

**Phase B.2 shipped — bridal-shower → beta**
- Template `gentle-gathering` (blush + sage) with registry, advice wall (seeded), countdown, RSVP.
- Event-type status: `bridal-shower` planned → beta.

**Phase B.3 shipped — rehearsal-dinner → beta**
- Template `the-night-before` (dark + gold) with toast signup (4 preset slots), small-group RSVP.
- Event-type status: `rehearsal-dinner` planned → beta.

Currently shipping/beta: wedding, engagement, anniversary, birthday, story (shipping) + bachelor-party, bachelorette-party, bridal-shower, rehearsal-dinner (beta). 9 of 28 event types.

### 2026-04-21 — Phase B.1 kickoff (bachelor/bachelorette party to beta)

- **Itinerary block** — `src/components/site/ItineraryBlock.tsx` + case in SiteRenderer. Multi-day hourly schedule with time/title/detail/location per slot. Registered in `block-catalogue.ts`. Reads from `PageBlock.config.days[]`.
- **"Last Weekend In" template** — `id: 'last-weekend-in'` in `wedding-templates.ts`. Editorial midnight palette, applies to both `bachelor-party` and `bachelorette-party`. Ships with a full 3-day itinerary skeleton guests can edit.
- **Status graduation** — `bachelor-party` and `bachelorette-party` moved from `'planned'` to `'beta'` in EVENT_TYPES. Both now have a real template and at least one working block differentiator.

**Remaining Phase B.1 work (next session):**
- **RSVP preset form** — `rsvp-form.tsx` still renders wedding fields only. The preset data exists in `rsvp-presets.ts`; the form needs to accept an `RsvpPreset` prop and render its fields. This is the single biggest unlock for all planned event types (not just bachelor).
- Panel UI for the itinerary block (edit days, add slots, reorder) — currently editable only via JSON config on the block.
- Remaining distinguishing blocks: `costSplitter`, `activityVote`, `packingList`, `privacyGate` — declared in `BlockType` and in the template's `optionalBlocks`, but not yet implemented.

### 2026-04-21 — Phase A complete (foundation)

- **A.1** — `EventType` registry with 28 entries (5 shipping, 23 planned) + 18 new `BlockType` values + expanded `SiteOccasion` + proxy allowlist from registry.
- **A.2** — Wizard two-step category → event picker. New `'category'` step before `'occasion'`; event options filtered by category via `getEventTypesByCategory()`.
- **A.3** — RSVP preset system at `src/lib/event-os/rsvp-presets.ts`. 8 presets, 16 field kinds, 4 unit tests.
- **A.4** — `filterBlocksForOccasion` in `block-catalogue.ts` delegates to the registry; BlockLibraryDrawer auto-updates.

### 2026-04-21 — Initial draft
- Created this file with:
  - Current state (§2): 5 occasions, 26 blocks, 60+ templates
  - Proposed catalog (§3): ~35 event types across 5 categories
  - New blocks needed (§4): 15 new + 5 generalizations + RSVP preset system
  - Event × block matrix (§5)
  - System changes required (§6)
  - Prioritized roadmap (§7)
  - Open questions (§8)
  - Session workflow (§9)
- Wired CLAUDE.md to auto-load alongside AGENTS.md + BRAND.md + CLAUDE-DESIGN.md.

---

*End of CLAUDE-PRODUCT.md. This file is a live product document. Every event we ship changes it; every decision we make adds to §8. Treat it like a real product spec, not a summary.*
