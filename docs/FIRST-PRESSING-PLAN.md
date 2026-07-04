# THE FIRST PRESSING — plan doc

> Make the wizard **draft a real, personal site** from what the host told it —
> revealed as a moment — so the editor opens on a living draft of *their*
> celebration, not demo scaffolding.
>
> Status: **PLAN ONLY.** No implementation, no commits. Executable by build
> agents. Branch `claude/post-fable-code-review-lj8e4o`, repo `/home/user/pearloom`.
>
> Last audited against code: 2026-07-04.

---

## 0 · The gap (confirmed by reading)

`WizardV8.handleFinish` (`src/components/pearloom/pages/WizardV8.tsx:2334`) is
**instant + local — no AI drafts anything**. The manifest is assembled
client-side: names/logistics/`factSheet`/`eventDetails` + palette → `theme.colors`
→ `applyWizardLook` → `seedSectionsFromWizard` (deterministic, `_suggestions`-based,
"no model calls") → `applySectionPicks` → `POST /api/sites {create:true}` → arm
`FirstPressing` → `/editor/{slug}`. CLAUDE-DESIGN §16 debt #5 names this exactly:
*"the wizard no longer drafts story content; the editor's draft-from-photos/facts
flow is the named successor."*

So a host answers 8 thoughtful steps (occasion, names, the fact-sheet story
prompts in `wizard-questions.ts`, the Day facts, photos, sections, vibe, palette)
and the editor opens with:

- **Story** — empty. `buildCopy` (`ThemedSite.tsx:5864`) renders
  `storySection.body || (demo ? V.storyBodyDemo : '')` — i.e. the demo anecdote
  *only in the editor canvas*, nothing on the published page. The host's
  `factSheet.story` / `howWeMet` / `favorite` sit on the manifest **unused**.
- **Hero tagline** — a generic `occasion-copy.ts` fallback (`tagline`), or a
  template tagline. Never their words.
- **FAQ** — honestly seeded by `wizard-seed.ts` but generic
  (`faqAnswerDraftFor` is template-string, not voiced).
- **Schedule / details / registry** — structural, no prose.

**The prompt→site promise produces structure, not their words.** Close it.

### What already exists (build on, don't rebuild)

- **`FirstPressing.tsx`** (`redesign/`) — the *reveal* overlay already ships. Four
  beats (warp → seal → title → unveil) in the host's suite, armed via
  `armFirstPressing(slug)` in `handleFinish` (line 2654), consumed by
  `EditorRedesign.tsx:423` (`shouldPlayFirstPressing`). **The reveal is done.**
  This plan makes the site *underneath* the reveal a real draft, and extends the
  *generating* moment (`GeneratingScreen.tsx`) that plays before it.
- **`GeneratingScreen.tsx`** — the press-stages choreography with a
  minimum-duration floor (`minPressMs`, `pressScript`) already in place.
- **`seedSectionsFromWizard`** (`lib/wizard-seed.ts`) — fill-missing, honesty-safe
  section seeding. The draft layers on top of this; it does not replace it.
- **`claude/client.ts` + `structured.ts`** — `generateJson` with forced
  `tool_choice`, `withRetry`, `cached`, tiers, auto `recordAiUsage` metering.
- **On-demand route pattern** — `api/inline-rewrite/route.ts`: session gate →
  `checkPearGate` (plan-tier) → `checkRateLimit` → graceful degrade to input when
  `ANTHROPIC_API_KEY` absent or Claude errors. Copy this shape verbatim.

---

## 1 · Core concept

A single lean **draft pass** runs during the generate moment. It takes the
seeded manifest + the host's fact-sheet + occasion voice, and — in **one batched
`generateJson` call on Sonnet 4.6** — fills the copy fields the host can't be
asked to write from scratch: the story, the hero line, voiced FAQ answers,
schedule blurbs, details sublines, a registry intro. It writes **fill-only**
(never clobbers host-authored or Day-step content), records which fields it
drafted in `manifest.draftedByPear`, and is **strictly additive**: if it's slow,
fails, over-budget, or unconfigured, the wizard falls through to today's
instant-local manifest — the site *always* generates. The drafted manifest is
what gets `POST`ed, so the `FirstPressing` reveal parts to show living content.

---

## 2 · Drafting scope — per-section input→output contract

The draft pass is a **single tool call** returning one structured object. Each
field below is an independent slot in that object's schema; the merge writes each
one **only if the target manifest field is still empty** (honesty §5). Every
prompt is **occasion-voiced** by `EVENT_TYPES[occasion].voice`
(`celebratory | intimate | ceremonial | playful | solemn`) — the same axis
`occasion-copy.ts` and `vibesForOccasion` already route on.

| Draft slot | Manifest target (fill-only) | Inputs the model gets | Honesty guard |
|---|---|---|---|
| `storyHeadline` | `storySection.headline` | `factSheet.{story,howWeMet,why,favorite,anchors}`, names, occasion, voice, vibes | Only emit if `factSheet.story`/`howWeMet` non-empty; else leave empty (no fabrication) |
| `storyBody` | `storySection.body` | same as above | Same gate. 2–4 sentences. Must *spend the anchors* (the dog, the bar in Lisbon) — never invent new facts |
| `storyChips` | `storySection.chips` (3) | occasion, voice, story text | Chrome-safe (they're timeline eyebrows); occasion-correct (never "We met" on a memorial — the `occasion-copy` `storyChips` are the fallback if the model declines) |
| `heroTagline` | `poetry.heroTagline` | names, occasion, voice, vibes, date/venue | 5–8 words, no fabricated facts. Always safe to emit (it's a tone line, not a claim) |
| `faqAnswers` | `faqs[i].answer` **only where currently blank AND the question is answerable from facts** | the seeded `faqs[]` questions + `logistics` + Day facts (`kidsPolicy`, `parkingNote`, `plusOnes`, hotels, `dresscode`) | Never answer a question the facts don't cover — leave blank. Voiced rewrite of facts the host already gave, not new policy |
| `scheduleBlurbs` | `events[i].subline`/`s` where blank | `events[]` (host's tap-built schedule names + times), occasion, voice | One short line per moment. Descriptive only ("raise a glass"), never invents a time/place |
| `detailsSublines` | `detailsCards[i][2]` (the 3rd tuple slot) where blank | existing `detailsCards` label+value, occasion | Expand the host's own value into a warm subline; no new facts |
| `registryIntro` | `registryIntro` where blank AND registry enabled | occasion, voice, whether a real registry URL exists | Tone line only. Solemn occasions → "in lieu of flowers" register if `registryFunds`/donation present |

### What is NOT drafted (leave honest empty states)

- **Anything requiring facts we don't have.** No invented venues, times, prices,
  addresses, guest names, dietary policies, or "fun facts."
- **Story on a bare fact-sheet.** If the host skipped the story prompts,
  `storyHeadline`/`storyBody` stay empty → published page shows no story section
  (per `storyAuthored` gate, `ThemedSite.tsx:629`); the editor shows the demo
  ghost as today. This is correct — we don't fabricate a couple's history.
- **Photos / captions / images.** Text-only pass. No image generation (see §7
  caution). Cover + gallery are already wired from R2 URLs.
- **Names, dates, venues, logistics.** Host-entered facts pass through verbatim.

### Voice mapping (reuse existing infra)

The draft route derives the voice directive from
`getEventType(occasion).voice`, mirroring the `VOICE_GUIDANCE` /
`VOICE_BANNED` constants the deleted pipeline used (see git history —
`claude-passes.ts`) but as a small local table:

```
celebratory → "warm, celebratory, present-tense; no exclamation marks"
intimate    → "close, tender, unhurried"
ceremonial  → "formal, dignified, traditional register"
playful     → "loose, funny, a little irreverent; still tasteful"
solemn      → "gentle, spare, reflective; never cheerful; 'gathered' not 'celebrated'"
```

All prompts additionally carry the BRAND §7 microcopy contract in the cached
system prompt: never "AI-generated"/"Generated"/"Loading"; lowercase verb-first;
warm not cheesy; "drafted by Pear".

---

## 3 · The generating moment — extend the press into a real First Pressing

`GeneratingScreen.tsx` already renders press stages with a `minPressMs` floor.
Two changes:

1. **Add a drafting stage** to both `PRESS_STAGES` and
   `PRESS_STAGES_WITH_PHOTOS` (in `GeneratingScreen.tsx`) between "Laying out the
   sections" and "Pressing the proof":

   ```
   { id: 'story', label: 'Setting your story in type',
     hint: 'Pear drafts your words; you make them yours in the editor.',
     matches: [/story in type|drafting|setting your (story|words)/i] }
   ```

   The label vocabulary stays inside the letterpress metaphor: *"Setting your
   story in type…"*, *"Inking the details…"*, *"Pressing the proof…"*.

2. **Drive the stage from the real draft lifecycle** in `handleFinish`'s
   `pressScript`. Today `pressScript` is pure client timers. Keep that as the
   *floor*, but when the draft call is in flight, hold on the "Setting your story
   in type…" label until the draft resolves (or the budget aborts), then advance
   to "Pressing the proof…". This makes the moment honest: the stage that's
   actually waiting on Claude is the one that lingers.

   **No real token streaming into the screen** (keep it lean — one batched call,
   §4/§7). The stage cadence is simulated as today; only the *story* stage's
   dwell is gated on the actual promise. Real SSE per-section streaming is a
   deferred enhancement (Wave 5), not needed for the moment to land.

3. **Minimum-duration beat.** Keep `minPressMs` as the "don't flash" floor
   (currently ~4.5–6s). The draft call typically resolves inside that window;
   when it doesn't, the ceiling (§4) caps the extra wait. Net: the moment feels
   crafted (≥ floor) and never laggy (≤ ceiling).

4. **The reveal is unchanged.** `FirstPressing.tsx` already parts to show the
   live site. Because the draft is merged *before* the `POST` (§4), the site the
   curtains reveal is the living draft. No demo→real swap flash.

5. **Reduced-motion.** `GeneratingScreen` and `FirstPressing` already honor
   `prefers-reduced-motion` (the `plfp-anim`/`pear-gen-anim` guards). The extra
   stage is a list row + label change — no new motion. The reduced-motion path
   still shows the drafting stage text (accessible, `aria-live="polite"` already
   set) and the quiet static reveal card.

---

## 4 · Data flow — where the draft hooks in

### Recommendation: **BLOCKING during the generate moment** (merge-before-POST)

`handleFinish` today (abridged), lines 2411–2585:

```
assemble local manifest (occasion, names, logistics, factSheet, theme)
 → applyWizardLook
 → attach photos (coverPhoto, galleryImages)
 → foldCookedDecorInto
 → seedSectionsFromWizard          // honest fill (FAQ questions, travel, RSVP)
 → applySectionPicks               // blockOrder / hiddenSections / layouts
 → explicit structure + fitting-room picks
 → POST /api/sites {create:true}
 → armFirstPressing → router.push(/editor/{slug})
```

**Insert the draft pass between `applySectionPicks` (+ structure picks) and the
`POST`:**

```
 … → applySectionPicks → structure/fitting-room picks
 → DRAFT PASS:  const drafted = await draftFirstPressing(manifest, {          // NEW
       occasion, voice, names, factSheet, day facts, vibes }, { signal, budgetMs })
       manifest = mergeDraft(manifest, drafted)   // fill-only + draftedByPear
 → POST /api/sites {create:true}   // posts the DRAFTED manifest
 → armFirstPressing → /editor
```

`draftFirstPressing` is a thin client helper (`lib/first-pressing/client.ts`)
that `fetch`es `POST /api/wizard/draft` with an `AbortController`. `mergeDraft`
lives in `lib/first-pressing/merge.ts` (pure, unit-testable, fill-only).

### Why blocking (merge-before-POST), not background-fill-in-editor

| | **Blocking (recommended)** | Background fill-in-editor |
|---|---|---|
| "Editor opens on a living draft" | **Yes** — the site is drafted before navigation | No — editor opens empty, content pops in seconds later |
| Reveal integrity | `FirstPressing` curtains part on real content | Curtains part on demo/empty, then a jarring swap |
| Persistence / honesty | One `POST` of the final manifest; drafted copy is on-disk before the host ever sees it | Needs a second autosave `POST` racing the host's first edits; risk of clobbering an edit-in-flight |
| Undo semantics | Draft is part of the editor's initial baseline (clean) | Draft arrives *after* baseline → pollutes undo history, can land mid-keystroke |
| Latency cost | +0 to +~ceiling on an already-choreographed 4.5–12s moment | Editor is interactive sooner, but the promise is broken |
| Failure mode | Fall through to seeded manifest, POST as today | Editor already open; a failed background draft is a silent no-op (fine) but the win never lands |

The generate moment is *designed to absorb latency* (the press floor exists
precisely so the site doesn't flash into existence). Spending 3–8s of that
window on a draft is the cheapest place in the whole product to put an AI call,
and it's the only place that keeps the reveal honest. Background-fill trades the
core promise for speed we don't need — the host is watching a deliberate moment,
not waiting at a blank screen.

**Both paths share the same route and merge logic** — if a future session wants a
"draft more in the editor" button (debt #5's named successor), it calls the same
`/api/wizard/draft` with the live manifest and merges the same way. Design the
route occasion-agnostic and manifest-in/patch-out so it serves both.

### The route: `POST /api/wizard/draft`

Shape mirrors `inline-rewrite/route.ts`:

```
POST /api/wizard/draft   (maxDuration = 30, force-dynamic)
  auth: getServerSession → 401 if none
  gate: checkPearGate(email)        // plan-tier — draft is a Claude spend
  rate: checkRateLimit(`fp-draft:${email}:${ip}`, { max: 8, windowMs: 10*60_000 })
  body: { occasion, voice, names, factSheet, dayFacts, vibes,
          sections: string[],           // which draft slots to attempt (from blockOrder)
          existing: { storyBody?, heroTagline?, faqs?, … } }   // for fill-only gating server-side too
  →  if !ANTHROPIC_API_KEY: return { drafted: {}, skipped: 'unconfigured' }   // graceful
  →  generateJson<DraftResult>({ tier:'sonnet', system: cached(<contract>),
        messages:[user turn with facts], schema: DRAFT_SCHEMA,
        schemaName:'emit_first_pressing', maxTokens: 1400, temperature: 0.7 })
        // route attribution: recordAiUsage picks up model automatically;
        // pass route:'/api/wizard/draft' where the client allows (see ai-usage.ts note)
  →  return { drafted: DraftResult }    // never throws to caller: try/catch → { drafted:{} }
```

The **server also enforces fill-only** (it receives `existing`) so a slow client
can't double-draft, and so the route is safe to call from the editor later. The
`DRAFT_SCHEMA` is a flat object of optional strings/arrays — every field
optional, so the model can decline any slot it can't honestly fill (that's the
honesty guard as *schema*, not just prompt).

---

## 5 · Honesty + review

### Stance (recommended): drafted copy is **authored-on-behalf**, persists + publishes, badged

Drafted copy seeds the manifest as **real editable content** — it persists, it
publishes. This is the correct reading of the honesty rule (CLAUDE-DESIGN §7):
the `editable`/`demoCopy` gate exists to keep *fabricated demo* off published
sites. Draft content is **not demo** — it's grounded in the host's own
fact-sheet, drafted *for* them, and they land in the editor looking right at it.
Forcing an "accept each section" gate before anything shows would reintroduce the
empty-editor problem this whole project exists to kill.

But it must never *masquerade* as hand-written. Two mechanisms:

1. **`manifest.draftedByPear: string[]`** — a new manifest field (type it in
   `src/types.ts`): the list of field-paths the draft pass wrote
   (`["storySection.body", "poetry.heroTagline", "faqs.0.answer", …]`). `mergeDraft`
   populates it. It is the single source of truth for "Pear drafted this."

2. **Per-section "Pear drafted this — make it yours" affordance** in the editor.
   In `PropertyRail` / the relevant panels (`StoryPanel`, `FaqPanel`, `HeroPanel`,
   `DetailsPanel`, `SchedulePanel`, `RegistryPanel`), when the bound field-path is
   in `draftedByPear`, show a quiet gold-hairline badge: *"Pear drafted this —
   make it yours"* with two actions:
   - **the host edits the field** → the path is removed from `draftedByPear`
     (their words now; badge disappears). This is a normal `editField` patch,
     fully undoable.
   - **"Clear"** → resets the field to empty (reverts to the honest empty
     state / demo ghost) and drops the path. Undoable.
   - **"Redraft"** (optional, Wave 4) → calls `POST /api/wizard/draft` for that
     one slot with the live manifest, previews-before-apply (reuse the
     `PearInlineRewrite` preview pattern already in the panels).

3. **First-run "review your draft" nudge** (lightweight, not a modal wall).
   Because `FirstPressing` already plays once and lands the host in the editor,
   piggyback a one-time `PearAssist`/`UndoToast`-style strip: *"Pear basted in a
   first draft from what you told me. Read it through and make it yours."* with a
   "Show me what Pear wrote" action that scrolls/jumps through the
   `draftedByPear` sections. One dismiss; never nags.

### Memorial / funeral guardrail (CLAUDE-PRODUCT Q5)

Solemn occasions still get a draft (it's *more* valuable there — grief-writing is
hard — but it's the highest-risk), with two hard constraints:

- **Gentle register, mandatory human review before publish.** The draft runs on
  the `solemn` voice. Set `manifest.pearReviewRequired = true` (new typed flag)
  whenever the draft wrote any story/obituary/tribute field on a
  `memorial`/`funeral` occasion.
- **Block publish until acknowledged.** `PublishChecklist.tsx` /
  `PublishModal` gains a check: if `pearReviewRequired` and `draftedByPear`
  still contains story/obituary paths, the publish flow shows a re-read
  interstitial (the pattern the 2026-04-23 memorial guardrail already
  established) — *"Pear drafted these words. Please read them as the family
  before pressing."* — with an explicit "I've read them" that clears
  `pearReviewRequired`. Editing a drafted field also clears its path, so a host
  who genuinely edits satisfies the gate naturally.

### Undo / regenerate

- The draft is merged **before** the `POST` and thus **before** the editor's
  bridge initializes its history baseline (`bridge.ts` seeds history from
  `initialManifest`). So the draft is part of frame 0 — it can't be "undone below
  baseline," which is correct (there's no pre-draft state in the editor to return
  to). Clearing/redrafting a field is a normal, undoable `editField`.
- No `manifest`-level "undo the whole draft" — the per-section **Clear** action
  is the escape hatch, and it's granular + undoable, which is what a host
  actually wants ("this story line is off, the rest is great").

---

## 6 · Failure / latency / cost guardrails

Non-negotiable: **the site always generates. AI is additive, never blocking in
the failure sense.**

- **Hard latency ceiling.** `draftFirstPressing` runs under an `AbortController`
  with `budgetMs ≈ 9000` (tunable const). If the call hasn't resolved by then,
  abort, keep the seeded manifest, POST as today. The press floor already covers
  the perceived time; the ceiling caps the real wait so the moment never drags
  past ~10–12s total.
- **Any error → fall through.** Route wraps Claude in try/catch → `{ drafted:{} }`
  (like `inline-rewrite` returning original text). Client wraps
  `draftFirstPressing` in try/catch → on throw/abort, `drafted = {}` →
  `mergeDraft` is a no-op → seeded manifest ships. Network failure, 429, 500,
  529, timeout, malformed JSON all land here.
- **Unconfigured.** No `ANTHROPIC_API_KEY` → route returns `{ skipped:
  'unconfigured' }` immediately; the whole feature silently degrades to today's
  behavior. Dev/test/self-host without a key are unaffected.
- **Plan-tier gate.** `checkPearGate` blocks free-tier over-budget accounts
  (same as every other Claude route) → client treats the block as "no draft" and
  ships seeded. Never surfaces an error to the host mid-generate.
- **Cost.** One Sonnet 4.6 call/site: ~1.5–2.5k input (fact-sheet + occasion +
  section list + cached system) + ~600–1000 output → **~$0.02–0.03/site**
  (`ai-usage.ts` table: Sonnet $3/$15 per MTok). The cached static system prompt
  makes repeat generations ~90% cheaper on input. Metered automatically through
  the instrumented client; add `route:'/api/wizard/draft'` attribution where the
  chokepoint allows. This is a *one-time-per-site* spend at the highest-intent
  moment — the cheapest, best-justified AI call in the product.
- **Model choice = Sonnet, not Opus.** The deleted memory-engine pipeline
  (CLAUDE-DESIGN §15) ran per-photo **Opus** passes + vision + grounding +
  critique + poetry and was removed for being *slow and costly*. The First
  Pressing is the deliberate anti-pattern: **one Sonnet call, text-only, no
  vision, no multi-pass, no image gen, hard-capped, fallback-safe.** Sonnet 4.6
  gives near-Opus literary voice at 60% of the cost and comfortably inside the
  latency budget. (If a future quality bar demands it, the *story slot only*
  could route to Opus behind a flag — but default and ship on Sonnet.)
- **Idempotency / double-fire.** `handleFinish` already guards re-entry with
  `busy`. The route's fill-only server-side gate means even a retried POST won't
  double-write. `draftedByPear` is set, not appended blindly (dedupe on merge).

---

## 7 · Caution — the deleted pipeline (CLAUDE-DESIGN §15)

The old story pipeline (`memory-engine/pipeline.ts`, `claude-passes`, `prompts`,
`passes`, `grounding`, `photo-vision`, `image-fetcher`, `motif-picker`,
`typography-picker`, `/api/generate*`) was deleted 2026-06-12 (~90k lines)
because it was **slow, costly, and ran a full Opus + Gemini vision pipeline per
photo at the wizard's critical path**, blocking the host for minutes.

The First Pressing must not become that again. Hard rules for build agents:

- **One call. Text-only.** No vision, no photo analysis, no multi-pass
  refinement, no critique loop, no image/decor generation (the background decor
  cook is separate and already exists).
- **Sonnet, capped, fallback-safe.** Never Opus-by-default, never uncapped,
  never on the "site fails if this fails" path.
- **Don't resurrect the deleted modules.** Write fresh, minimal
  `lib/first-pressing/*`. Do not import from git-history `memory-engine`.

---

## 8 · Build waves (ranked)

Each wave is independently shippable and leaves the product working.

### Wave 1 — the pipeline lib + route (foundation, no UI change)
- `src/lib/first-pressing/schema.ts` — `DRAFT_SCHEMA` (flat, all-optional) +
  `DraftResult` type + the voice table.
- `src/lib/first-pressing/merge.ts` — `mergeDraft(manifest, drafted)`: fill-only,
  writes each slot to its manifest target only when blank, populates
  `manifest.draftedByPear`, sets `pearReviewRequired` for solemn story writes.
  Pure + unit-tested (co-located `merge.test.ts`).
- `src/lib/first-pressing/client.ts` — `draftFirstPressing(manifest, ctx,
  {budgetMs})` with `AbortController`, try/catch → `{}`.
- `src/app/api/wizard/draft/route.ts` — the route (§4), copying
  `inline-rewrite`'s gate/rate/degrade shape.
- Type additions in `src/types.ts`: `draftedByPear?: string[]`,
  `pearReviewRequired?: boolean`.
- **Ship gate:** route returns sane JSON; `mergeDraft` unit tests green; no
  wizard change yet (behind a `const FIRST_PRESSING_ENABLED` flag, default off).

### Wave 2 — wire into handleFinish (the moment goes live)
- Insert the draft pass in `handleFinish` between `applySectionPicks`/structure
  picks and the `POST` (§4). Flag-gated.
- Add the "Setting your story in type…" stage to `GeneratingScreen.tsx`
  (`PRESS_STAGES` + `PRESS_STAGES_WITH_PHOTOS`) and gate its dwell on the draft
  promise via `pressScript`.
- Ceiling + fallback wired; verify (with key absent) the wizard is byte-identical
  to today.
- **Ship gate:** end-to-end — a wedding run with a filled story lands in the
  editor with a real drafted story + hero line; a run with `ANTHROPIC_API_KEY`
  unset is unchanged; a forced route-500 falls through cleanly. Flip the flag on.

### Wave 3 — the editor review affordance (honesty surface)
- `draftedByPear` badge in the panels (`StoryPanel`, `FaqPanel`, `HeroPanel`,
  `DetailsPanel`, `SchedulePanel`, `RegistryPanel`) — *"Pear drafted this — make
  it yours"* + **Clear**. Edit-clears-path logic in `editField` or a small
  `lib/first-pressing/clear-on-edit.ts` helper the panels call.
- First-run "review your draft" strip after `FirstPressing` (reuse
  `UndoToast`/`PearAssist` chrome).
- **Ship gate:** badges appear only on drafted fields; editing removes them;
  Clear reverts to empty; both are undoable.

### Wave 4 — solemn guardrail + per-slot redraft
- `pearReviewRequired` publish gate in `PublishChecklist`/`PublishModal`
  (re-read interstitial for memorial/funeral with unreviewed story paths).
- Optional per-slot **Redraft** action (preview-before-apply, `PearInlineRewrite`
  pattern) → same `/api/wizard/draft` with the live manifest.
- **Ship gate:** a memorial site with a drafted story cannot publish without the
  explicit "I've read them" acknowledgement or a genuine edit.

### Wave 5 (deferred, optional) — real streaming into the moment
- SSE per-section streaming so the press stages tick on *actual* draft progress
  instead of simulated cadence. Only if the batched moment proves to feel static.
  Not needed for the promise to land; explicitly out of scope for v1.

---

## 9 · File-touch summary (for build agents)

**New:**
- `src/lib/first-pressing/schema.ts`, `merge.ts` (+ `merge.test.ts`), `client.ts`
- `src/app/api/wizard/draft/route.ts`

**Edited:**
- `src/components/pearloom/pages/WizardV8.tsx` — `handleFinish` draft insertion
  (~line 2544, after structure picks, before the `POST` at 2581), flag const.
- `src/components/pearloom/wizard/GeneratingScreen.tsx` — new press stage.
- `src/types.ts` — `draftedByPear`, `pearReviewRequired` on `StoryManifest`.
- `src/components/pearloom/editor/panels/{Story,Faq,Hero,Details,Schedule,Registry}Panel.tsx`
  — `draftedByPear` badge + Clear (Wave 3).
- `src/components/pearloom/redesign/PublishChecklist.tsx` — solemn gate (Wave 4).

**Read-only reference (do not fork):**
- `lib/wizard-seed.ts` (the fill-only precedent), `redesign/occasion-copy.ts`
  (voice fallbacks + `storyChips`), `redesign/ThemedSite.tsx:5736` (`buildCopy`
  field chain — the merge targets must match: `storySection.{headline,body,chips}`,
  `poetry.heroTagline`, `faqs[].answer`, `detailsCards[i][2]`, `events[].subline`,
  `registryIntro`), `claude/structured.ts` (`generateJson`),
  `api/inline-rewrite/route.ts` (route shape).

---

## 10 · Open decisions (surface, don't silently assume)

- **Q-FP1: Voice beyond weddings for the story slot.** `occasion-copy.ts`
  `WEDDING_VOICES` modulates only wedding-arc copy by Pear-voice; other occasions
  read their pack directly. The draft pass uses `EVENT_TYPES.voice` (5 registers),
  which is coarser than the 3 wedding sub-voices. **Recommend:** ship on the
  5-register axis; the host's chosen vibes (`st.vibes`) ride the prompt as extra
  tone signal. Finer per-occasion voice packs are a follow-up, not a blocker.
- **Q-FP2: `voiceDNA`.** `manifest.voiceDNA` (from `/dashboard/voice`) doesn't
  exist yet at wizard time (it's a post-hoc editor setting), so the First Pressing
  can't use it. The editor's later "redraft" (Wave 4) *should* pass it (like
  `inline-rewrite` does). Noted, not v1.
- **Q-FP3: Story slot on Opus behind a flag?** Left as a tunable const
  (`STORY_TIER = 'sonnet'`), default Sonnet. Revisit only if quality review
  demands; never default-on (see §7).
- **Q-FP4: Does the draft count against a paid quota the host sees?** It's one
  metered call at generate time. Recommend it's **included** (not a visible
  credit) — it's core to the promise. `checkPearGate` still protects against
  abuse. Pricing owner to confirm.

---

*End of FIRST-PRESSING-PLAN.md. Plan only — implement in waves, verify each ship
gate, keep the site generating even when every AI path is dark.*
