# CLAUDE-PRODUCT.md — Pearloom product reference

> **BRAND.md declares *why we exist*. CLAUDE-DESIGN.md documents *what's in the code*. This file documents *what the product does, what it doesn't, and what we're building next*.**
>
> Last updated: **2026-04-21**.

---

## 0 · How to use this file

- **Read BRAND.md and CLAUDE-DESIGN.md first.** This file assumes you know the voice and the code.
- **Sections 2–5 are the living inventory.** Update them whenever we add an event type, a block, or a capability.
- **Section 7 is the roadmap.** Ranked by acquisition impact × effort.
- **Section 8 is where open decisions live.** If a session proposes a change that breaks an assumption, surface it here rather than shipping silently.
- **New sessions should read §2 + §7 + §8 first** to know what's in scope.

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

Source of truth: `src/lib/site-urls.ts:26–31` + `src/types.ts` occasion field.

| Occasion | URL prefix | Wizard coverage | Template count |
|---|---|---|---|
| `wedding` | `/wedding/{slug}` | Full | ~45 |
| `engagement` | `/engagement/{slug}` | Re-uses wedding | ~30 shared |
| `anniversary` | `/anniversary/{slug}` | Partial | ~10 shared |
| `birthday` | `/birthday/{slug}` | Partial | 7 |
| `story` | `/story/{slug}` | Minimal (catch-all) | 2 |

**Reality check:** 95% of existing templates are wedding/engagement-themed and 100% of wizard prompts assume a couple. Birthday support is a thin veneer over the wedding flow. The "Event OS" positioning outruns the current reality.

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
