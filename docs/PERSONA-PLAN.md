# PERSONA-PLAN.md — Six strangers walk into the loom

> **The persona-driven road to mass user testing.**
> On 2026-07-08 six invented-but-honest people walked the real product —
> Playwright drove every step, every screenshot and DOM dump below is from
> the live dev build, and every file:line is verified. This document turns
> what they hit into an executable prompt system: nine session-sized
> sprints, ranked, each written to drop straight into the autoloop.
>
> Evidence shots: `docs/audit-shots/personas/`. Authored 2026-07-08.

---

## 0 · How to use this file (the prompt system)

Each sprint in §4 is a self-contained session brief in the house shape
(goal / direction / open threads / counts-as-done / skip). Two ways to run
one:

1. **The autoloop.** Replace the paused heading in `CLAUDE.md` (line 6)
   with the sprint's block, starting with the literal heading
   `## Active focus` — the Stop hook greps for exactly that string and
   keeps the session iterating until the heading is renamed back.
2. **By hand.** Tell a session: *"Run Sprint S3 of docs/PERSONA-PLAN.md."*
   The brief carries everything a cold session needs.

Run order is the printed order — S1–S3 are trust blockers (P0) and gate
everything; S4–S7 are the major UX lifts (P1); S8–S9 build the testing
apparatus (P2). One sprint per session. After each sprint: stamp its
status line here, re-run the affected persona walk (the harness scripts
are described in §2), and update the §5 gate.

**The prime directive for every sprint:** fix it for the persona named on
the finding, then check the other five didn't regress. The walks are the
test suite for this plan.

---

## 1 · The six people

These are the testers we will recruit. Until then, they are the lens every
change is judged through.

| | Who | Event | Device | Patience | They compare us to | The sentence they'd say |
|---|---|---|---|---|---|---|
| **Maya** (28) & Jordan (30) | Engaged couple, design-picky, split the planning | Wedding, Oct 2027, Asheville | MacBook + iPhone | High — will polish for hours | Zola, Joy, Minted, Squarespace | *"It has to feel like ours, not a template with our names in it."* |
| **Tyler** (20) | College junior, plans in the group chat | 21st birthday, rooftop | iPhone only, never a laptop | ~2 minutes, TikTok-calibrated | Partiful, an Instagram story | *"Can I make this and send the link before my next class?"* |
| **Linda** (60) & Robert | Married 40 years, hosting their own party | 40th anniversary, Naperville | iPad, text size bumped up | Careful — afraid of breaking things | Evite, a paper invitation | *"Did I do that right? Is it saved? Who's coming?"* |
| **Priya** (34) | Maid of honor, organizer-brain, plans at work | Bachelorette weekend, 3 days, Nashville | Work laptop + phone | Medium — efficient, decisive | A group text + spreadsheet + Splitwise | *"Nine girls, three days, one link that answers everything."* |
| **Denise** (52) | Planning her mother's memorial, grieving | Celebration of life, Savannah | Laptop, evenings | Fragile — one wrong note and she leaves | A church bulletin, a phone tree | *"Please don't make this feel like a party invitation."* |
| **Marcus** (41) | Dad, budget-aware, bilingual extended family | Daughter Isabella's quinceañera, San Antonio | Android phone | Medium — practical | Facebook events, a printed invite from the mercado | *"Will my mother understand this page? Does it look proper?"* |

What "winning" means per person: Maya publishes something she screenshots
for her group chat unprompted. Tyler goes tap-to-shareable-link in under
three minutes. Linda checks RSVPs weekly without calling her daughter for
help. Priya retires the spreadsheet. Denise finishes without crying for
the wrong reason. Marcus's mother reads the page and says it looks proper.

---

## 2 · The walk — what actually happened

Method: Playwright drove `/dev/wizard`, `/dev/site`, `/dev/editor`,
`/dev/dashboard`, and `/` at each persona's viewport (390×844 phone,
820×1180 iPad, 1440×900 desktop), dumping every step's headings, labels,
inputs, and buttons, thorough-mode (fill everything) and speedrun-mode
(skip everything). Six wizard runs reached Review in 19–25s each.

### What's already genuinely good (do not break these)

- **Occasion-aware bones are real.** Memorial asks "Who are we
  remembering?"; bachelorette schedules offer "Bar crawl"; memorial vibes
  are Gentle/Reflective; sections default to Obituary/Program/Tribute wall
  for Denise and Itinerary/Rooms/Group vote for Priya; the review CTA
  shifts (RSVP → "I'm in" → "Reply"). This is the moat — deepen, never
  flatten.
- **20 seconds to a pressed proof**, filling everything in. Speedrun is the
  same. The landing's "20 sec to a first draft" claim is true.
- **Editor first-run affordances**: the "3 to do" pill, "Next: Add your
  cover photo", Pear-suggests cards with real reasons, section rows with
  real counts ("2 chapters", "No photos yet").
- **The dashboard cockpit** reads like a competent assistant (countdown,
  "3 things only you can decide", budget bars).
- **Unknown RSVP names fall through to an open reply form** instead of a
  rejection — open-invite events work.

### The findings ledger

Severity: **P0** = trust/conversion breaker, blocks user testing ·
**P1** = major friction · **P2** = paper cut.

**F1 · P0 · The live preview speaks couple at every occasion.**
The wizard's phone-preview rail hardcodes the celebration frame: eyebrow
`SAVE THE DATE`, verb from a two-branch ternary — `'are getting married'`
: `'are celebrating'` (`WizardV8.tsx:2103–2105`) — and a story card that
always reads "OUR STORY / Two people, a shared beginning…". Denise's
memorial preview therefore reads **"SAVE THE DATE / Eleanor Whitfield /
are celebrating"** — her deceased mother, in a party frame, with broken
grammar. Tyler/Priya/Marcus all get "‹Name› are celebrating."
Evidence: `audit-shots/personas/memorial-preview-are-celebrating.png`.

**F2 · P0 · The Review step calls borrowed content "the exact site."**
Review copy: *"This is the proof — the exact site Pear will press."* The
proof then renders `buildCopy` demo fallbacks: Maya (Asheville) saw the
olives-on-pizza how-we-met and Santorini hotels ("Cosmos Suites…
caldera view"); Denise's memorial proof carries a generic "A life
remembered." The `editable` honesty gate works as designed in the editor —
but at Review, framed as a promise, borrowed specifics read as a lie or,
for a memorial, a fabrication about the dead. Evidence:
`audit-shots/personas/review-proof-frame.png`.

**F3 · P0 · The claim moment drops the site.**
Signed-out, "Weave my site" lands on a generic account sheet ("Begin your
own thread… An account keeps your sites, guests, and keepsakes in one
place"). Nothing says *the site he just watched get pressed is saved and
waiting* — no mini pressing, no name echo, no "Tyler's 21st is ready."
The state IS preserved (the `?next` forwarding shipped in GRAND-PLAN
Phase 2) but the UI never says so — and Tyler bails at unexplained walls.
Evidence: `audit-shots/personas/claim-moment-account-gate.png`.

**F4 · P1 · Signed-out palette step surfaces a raw auth error.**
"PEAR'S PICKS FOR YOU … **Sign in required.**" — `/api/wizard/smart-palette`
401s for anonymous users and `smartPalettesError` renders verbatim
(`WizardV8.tsx:2534–2546`). The step's own marquee ("Pear read your venue
and vibes and mixed three color sets just for you") fails its promise
mid-wizard, before the user was ever asked to sign in.

**F5 · P1 · The popular shelf hides the acquisition events.**
The occasion step shows 6 POPULAR cards + "Other event". Bachelorette
(Priya — the roadmap's biggest funnel lever, CLAUDE-PRODUCT §7 B.1) and
quinceañera (Marcus) both live behind the extra tap, and there is no
type-ahead. The landing hero is couple-shaped too: "Type two names."
Four of six personas type one name. And `user_preferences.intent` from
onboarding still prefills nothing (named follow-up since 2026-06-12).

**F6 · P1 · Guests must "find an invitation" that may not exist.**
The phone RSVP path: hero RSVP → scrolls to a banner ("Save your seat —
takes about 90 seconds") → second tap → modal: *"Find your invitation to
reply. Type the name on your invite."* Unknown names DO fall through to an
open form (good), but Tyler's friends have no invites — the copy tells
them they're at the wrong door, and the double-tap + "90 seconds" promise
adds friction at the single highest-traffic guest moment.

**F7 · P1 · One palette shelf for every mood.**
Classic presets are the same four for everyone — "Groovy Garden" is the
first color offered for Denise's memorial. Presets need occasion routing
(order, subset, or naming) like every other wizard surface already has.

**F8 · P1 · "Marco" is the bachelorette's guest of honor.**
`name-mode.ts:105` — bachelor and bachelorette share one branch, so
Priya's form suggests a man's name. One-line split; bridal shower already
has its own ('Jess').

**F9 · P2 · Memorial nav says "Registry."**
Denise's review nav: "Their story · Details · Schedule · **Registry**".
The registry section for memorial/funeral should present as "In lieu of
flowers" / "Donations" (the flavor exists in CLAUDE-PRODUCT §4.1; the
label doesn't follow).

**F10 · P2 · The phone wizard has no live preview.**
At 390px the preview rail (and its "This preview updates as you choose"
reassurance loop) simply isn't there. Tyler and Marcus build blind until
Review. A peek affordance ("See it so far" → bottom sheet) would close it.

**F11 · P2 · The RSVP interstitial over-promises and under-informs.**
"It takes about 90 seconds. Pear will follow up if anyone forgets" — the
form takes ~20 seconds, and "Pear will follow up" is host-facing copy on a
guest surface.

---

## 3 · The laws that emerge

Four cross-cutting rules distilled from the ledger. Add them to review
checklists; they are cheaper to obey than to re-audit.

1. **A solo occasion is not a degraded couple.** Any surface that renders
   names must consult the name mode (solo/couple/group) AND the occasion
   voice for its eyebrow, verb, story frame, and section labels. If a
   string contains "SAVE THE DATE", "are", or "Our story", it must prove
   it works for a memorial before it ships.
2. **Never present borrowed content as theirs.** Demo copy may dress an
   editable canvas; the moment a surface *makes a claim* ("the exact
   site", "your proof", a published page), only host-given content and
   honestly-labeled drafting slots may appear.
3. **Never drop the thing they just made.** Every gate (sign-in, save,
   publish, payment) must visibly carry the artifact through it — name,
   thumbnail, and a sentence that says it's safe.
4. **Guests owe us nothing.** Every guest-facing door must work with zero
   context — no invitation, no account, one thumb, three taps or fewer to
   done.

---

## 4 · The prompt system

Nine sprints. Copy a block (from its `## Active focus` line down to the
rule) into `CLAUDE.md` line 6 to arm the autoloop, or hand it to a session
verbatim. Statuses live here — stamp them as sprints land.

Shared validation loop for every sprint: `npx tsc --noEmit` → eslint on
touched files → `npx vitest run` → re-run the affected persona walk at the
persona's viewport → screenshots into `docs/audit-shots/personas/` →
commit → stamp this file.

---

### S1 — One of one · **status: planned** · P0

```
## Active focus — S1 · One of one (every occasion speaks its own language)

**Goal:** No persona ever sees another occasion's frame. Fixes F1, F7,
F8, F9 of docs/PERSONA-PLAN.md.

**Direction:** The wizard's live-preview rail (WizardV8.tsx ~2095–2110)
currently hardcodes eyebrow/verb/story-frame. Build a small
`previewFrameFor(occasion, nameMode)` helper in src/lib/event-os/ (next
to name-mode.ts) returning { eyebrow, verbLine, storyLabel, storyBlurb }
— wedding-arc keeps SAVE THE DATE / "are getting married"; solo
celebrations get singular verbs ("turns 21" when age is known, else "is
celebrating"); memorial/funeral get IN LOVING MEMORY / no verb line / "A
life remembered" with a quiet blurb; reunion/group get plural-correct
copy. Route every string in the preview rail through it. Unit-test the
matrix across all 28 occasions (grammar: no "‹single name› are").

**Open threads:**
- [ ] previewFrameFor + rail wiring + tests
- [ ] Palette classic presets routed by occasion (order or subset per
      EVENT_TYPES voice — solemn voices never lead with "Groovy Garden";
      lookup-only, no manifest writes)
- [ ] name-mode.ts:105 — split bachelorette from bachelor
      (primaryPlaceholder 'Sophia' or similar; keep 'Marco' for bachelor)
- [ ] Memorial/funeral registry section LABEL reads "In lieu of flowers"
      in nav + section heading (renderer label only — ids/fields
      unchanged; check occasionCopyFor is the right seam)

**Counts as done:** Denise's wizard run shows no party frame anywhere
(re-run the walk, screenshot the preview at the Tell-me step); the
grammar matrix test passes for all 28; Priya sees a woman's name
placeholder; memorial proof nav shows no "Registry".

**Skip:** The Review proof honesty problem (that's S2). Any renderer
layout work. New occasion content packs beyond the four threads.
```

---

### S2 — The honest proof · **status: planned** · P0

```
## Active focus — S2 · The honest proof (Review shows only the truth)

**Goal:** The Review step never presents borrowed content as the host's.
Fixes F2 of docs/PERSONA-PLAN.md.

**Direction:** Keep demo copy in the EDITOR canvas (the editable gate is
correct and stays). At Review, the pressing must render in a third
honesty mode: host-given content renders real; sections that would fall
back to demo copy instead render an honest drafting slat — the section's
real heading + a quiet inline note in Pear's voice ("Pear drafts this
with you in the editor — from your photos and the story you told me"),
styled as part of the proof (mono eyebrow + thread, not an error).
Suggested seam: buildCopy already takes { editable } — add a
{ proof: true } variant threaded from the Review pressing only
(FirstPressing / WizardStructureSection); grep for where the review
mounts ThemedSite. Hotels/travel demo entries (Santorini) must never
appear under a real host location. Memorial: drafting slats use the
solemn register and never fabricate biography.

**Open threads:**
- [ ] proof mode in buildCopy + Review pressing wiring
- [ ] Drafting-slat component (one, shared across sections)
- [ ] Review sub-copy: keep "the exact site Pear will press" honest —
      it now is; consider "everything here is yours, the marked slats
      are where Pear works with you next"
- [ ] Persona re-runs: Maya (no olives story, no Santorini), Denise (no
      fabricated life story), Tyler speedrun (slats everywhere, still
      inviting)

**Counts as done:** Grep-level proof that no DEMO_* / occasionCopyFor
demo body text reaches the Review DOM in the six persona walks; slats
render on-brand at 390px and 1440px; vitest pins the proof gate the same
way the editable gate is pinned.

**Skip:** Editor canvas behavior (unchanged). Published-site rendering
(already honest). Redesigning the Review layout.
```

---

### S3 — The unbroken thread · **status: planned** · P0

```
## Active focus — S3 · The unbroken thread (signed-out never loses work)

**Goal:** From first keystroke to claimed account, the site visibly
survives every gate. Fixes F3 + F4 of docs/PERSONA-PLAN.md.

**Direction:** Three gates, one principle (PERSONA-PLAN §3 law 3):
(1) THE CLAIM MOMENT — after "Weave my site" signed-out, the account
sheet must carry the artifact: a mini pressing (names, date, palette —
the wizard already has everything client-side), headline in the site's
voice ("Tyler's 21st is pressed and waiting"), and one reassurance
sentence ("It's saved — it will be here the moment you're in"). Wire
whatever the wizard hands off (sessionStorage draft / ?next) so the
post-auth landing goes straight to the editor of THAT site, not the
dashboard. (2) THE PALETTE GATE — /api/wizard/smart-palette 401s render
verbatim ("Sign in required.", WizardV8 fetchSmartPalettes). Signed-out:
don't fire the call; render the classic presets plus a quiet slat
("Pear mixes palettes from your story once you're signed in — after the
press"). Never show a raw auth error inside the wizard. (3) SAVE DRAFT —
walk the signed-out "Save draft" and "Exit" paths; whatever they do
today, they must either work or say honestly what will happen.

**Open threads:**
- [ ] Claim sheet: mini pressing + voice headline + reassurance + direct
      post-auth deep link into the new site's editor
- [ ] Smart-palette signed-out degrade (no fetch, no error, honest slat)
- [ ] Signed-out Save draft / Exit audit + fix
- [ ] Tyler phone re-run: wizard → weave → account sheet shows HIS party
      → (dev-auth) → editor of his site

**Counts as done:** The Tyler walk screenshot shows his name + date on
the claim sheet; no "Sign in required." string can render inside the
wizard; post-auth lands in the pressed site's editor.

**Skip:** Auth providers/flows themselves (SigninV8 is fresh). Google
OAuth config. Pricing/upsell on the claim sheet — it stays pure.
```

---

### S4 — Guests arrive without invitations · **status: planned** · P1

```
## Active focus — S4 · Guests arrive without invitations (RSVP in 3 taps)

**Goal:** A guest with zero context replies in three taps or fewer,
in copy that never implies a gate. Fixes F6 + F11 of docs/PERSONA-PLAN.md.

**Direction:** The published site's reply path (GuestRsvpModal +
rsvp section variants + StickyRsvpPill). (1) COPY BY LIST SHAPE: when
the site has no guest list (or open RSVP), the modal leads "Tell us
who's coming" — never "Find your invitation"; with a list, keep
find-my-invite but the miss path stays warm ("Can't find you — reply as
you are and the hosts will sort it"). (2) TAP COUNT: hero RSVP should
open the reply directly (keep the banner section for scroll-by, but the
nav/hero/pill CTAs go straight to the modal). (3) THE INTERSTITIAL
LINE: replace "It takes about 90 seconds. Pear will follow up if anyone
forgets." with a guest-true line ("Twenty seconds, no account needed").
(4) OCCASION REGISTER end-to-end: Denise's site says Reply/"We'll be
there" — verify the memorial preset's full path (form fields, success
card, decline copy) wears the solemn register. (5) SUCCESS MOMENT:
after reply, the add-to-calendar action must be one tap from the
success card.

**Open threads:**
- [ ] List-shape-aware modal copy (open vs listed)
- [ ] Direct-open from hero/nav/pill CTAs
- [ ] Interstitial copy + banner variant line
- [ ] Memorial reply register walk (dev/site ?occasion harness or
      fixture)
- [ ] Success card: calendar + share prominence
- [ ] Phone walk re-run: taps-to-done counted in the transcript

**Counts as done:** Unknown-name reply on the demo site in ≤3 taps from
page load (Playwright transcript proves it); zero "invitation" wording
on open-list sites; memorial path screenshot set.

**Skip:** RSVP preset field redesign (presets are right). The Loom
tapestry. Host-side guest tools.
```

---

### S5 — Every door is the front door · **status: planned** · P1

```
## Active focus — S5 · Every door is the front door (occasion reach)

**Goal:** The persona whose event isn't "wedding" finds their event in
one gesture, from the landing hero to the wizard. Fixes F5 of
docs/PERSONA-PLAN.md.

**Direction:** (1) OCCASION TYPE-AHEAD: add a quiet search field atop
the occasion step ("Type it — quinceañera, bachelorette, retirement…")
filtering all 31 registry entries with their taglines; keep the cards.
(2) THE POPULAR SHELF: make it deliberate — wedding, birthday,
bachelorette, baby shower, anniversary, memorial, quinceañera are the
acquisition list (CLAUDE-PRODUCT §7); revisit when real traffic data
exists (S8 instruments this). (3) LANDING HERO: "Type two names" →
name-count-agnostic copy ("Type a name — or two") and the hero input
should carry into the wizard prefilled (verify the handoff; wire it if
dead). (4) INTENT PREFILL: user_preferences.intent (set at onboarding
since 2026-06-24, read by nothing) preselects the wizard occasion with
the existing "★ For you" badge — close the oldest named follow-up.
(5) LANDING OCCASION TABS: Wedding/Milestone/Memorial/Baby
shower/Reunion tabs exist — confirm each re-presses the hero demo into
that occasion's frame (law 1), not just a palette swap.

**Open threads:**
- [ ] Type-ahead over the registry (label + tagline match, category
      headers kept)
- [ ] POPULAR list update + 'For you' intent prefill
- [ ] Landing hero copy + prefill handoff into /wizard/new
- [ ] Landing occasion-tab frame audit (memorial tab: no SAVE THE DATE)

**Counts as done:** Priya reaches the bachelorette Basics step in ≤2
gestures from /wizard/new (type "bach" → tap); Marcus the same for
quinceañera; intent=birthday account sees Birthday badged first; walks
re-run at both viewports.

**Skip:** Reordering the wizard's steps. New occasions. Landing visual
redesign (it's fresh); copy + wiring only.
```

---

### S6 — The first five minutes · **status: planned** · P1

```
## Active focus — S6 · The first five minutes (from pressed to proud)

**Goal:** Between "the editor opens" and "I sent the link", nobody
stalls. Fixes F10 and the post-publish gap of docs/PERSONA-PLAN.md.

**Direction:** The editor's first-run affordances are good ("3 to do",
"Next:" pill, Pear-suggests) — this sprint closes the two gaps around
them. (1) PHONE WIZARD PREVIEW PEEK (F10): at <640px the wizard has no
live preview; add a floating "See it so far" pill (glass chrome, BRAND
§9) opening the existing preview in a bottom sheet — read-only, one
tap in, one tap out. (2) THE PUBLISH MOMENT: publishing is the peak
emotional beat and must land like one — after Publish succeeds, a
pressed-card moment: the live URL large, copy-link + text-it-to-myself
+ QR in one place, occasion-voiced congrats line ("It's pressed.
Guests can leaf through it now."), and the next thread ("Invite your
guests" door). Audit what PublishChecklist/publish flow shows today
and elevate it. (3) FIRST-SESSION EXIT SAFETY: Linda closes the tab
mid-edit — verify the unsaved/beforeunload path and the return
experience says "everything you set is here" (the bridge sendBeacon
exists; the REASSURANCE is what's missing).

**Open threads:**
- [ ] Wizard preview peek sheet at <640px
- [ ] Publish success moment (URL, copy, QR, text-to-self, next door)
- [ ] Return-visit reassurance (dashboard site card or editor toast —
      smallest honest surface)
- [ ] Tyler phone walk: wizard → editor → publish → share sheet
      timed end-to-end

**Counts as done:** Tyler's phone transcript shows press → publish →
copied link with the share moment screenshotted; Maya's desktop publish
shows the same moment at 1440px; no regression in editor e2e.

**Skip:** Editor panel reorganization (done 2026-07-08). Studio.
Onboarding flow (fresh). Payments/domains at publish.
```

---

### S7 — Linda mode · **status: planned** · P1

```
## Active focus — S7 · Linda mode (confidence and accessibility)

**Goal:** A careful 60-year-old on an iPad with bumped text size
completes host tasks without fear, and a screen reader can follow.
Serves Linda + Marcus's mother across every host surface.

**Direction:** (1) ZOOM/TEXT-SCALE AUDIT: walk wizard/editor/dashboard
at 125% and 150% page zoom and iPad viewport — nothing clips, no
control drops below 44px tap target, mono-caps eyebrows stay legible
(they're 9–11px — verify they're never load-bearing). (2) FEAR
AUDIT: every destructive or big-feeling action (section remove, theme
apply, publish, guest delete) needs undo or arm-then-confirm — inventory
and close gaps (UndoToast exists in the editor; the dashboard is the
suspect). (3) REASSURANCE RAIL: "Nothing is public until you publish"
appears in the wizard — make saved-state legible everywhere Linda
looks (the editor's saved pill exists; dashboard edits + Studio need
the same honesty). (4) SEMANTICS PASS: axe-core across the six key
routes; fix labels/roles/contrast — the gold-on-cream eyebrow contrast
was fixed 2026-07-06, verify it held; focus states visible everywhere
(keyboard-walk the wizard). (5) PLAIN WORDS: BRAND §7 label audit on
host surfaces — flag any control label a first-time host must decode.

**Open threads:**
- [ ] 125%/150% zoom walk + fixes (wizard, editor rails, dashboard)
- [ ] Undo/confirm inventory + gaps closed
- [ ] Saved-state visibility on dashboard + Studio
- [ ] axe-core pass on /, /wizard/new (dev), editor, dashboard, /demo,
      /dev/site — zero serious/critical
- [ ] Label audit list → fixes or explicit keep-decisions

**Counts as done:** axe report clean of serious+critical on the six
routes; zoom screenshots archived; the fear-audit table lives in this
file's changelog with every row resolved.

**Skip:** Full WCAG certification. Guest-site theming contrast beyond
tokens (themes are host-chosen). Rewriting brand vocabulary in prose
(prose is allowed craft-speak; §7 governs control labels only).
```

---

### S8 — The glass box · **status: planned** · P2 (pre-testing infrastructure)

```
## Active focus — S8 · The glass box (see what testers actually do)

**Goal:** When strangers use Pearloom, we can see where they stall,
what breaks, and what they think — without asking them to file bugs.

**Direction:** Build on product_events + activation_funnel (shipped
2026-07-06). (1) FUNNEL COMPLETION: instrument the full first-session
funnel — wizard step enter/leave (with occasion + step timing), weave
click, claim-sheet outcome, first editor edit, publish, first share
action, first RSVP received. Content-free: ids and timings, never
inputs. (2) CLIENT ERROR CAPTURE: window.onerror/unhandledrejection →
a tiny /api/telemetry/client-error (rate-limited, sampled, no PII) so
tester crashes aren't invisible; ErrorBoundary reports the same way.
(3) THE WHISPER PILL: a quiet in-product feedback affordance on host
surfaces ("Tell Pear what felt off") → one text field + auto-context
(route, viewport, session hash) → a feedback table + notification-bell
digest line for us. Guest surfaces get none (guests owe us nothing).
(4) THE FUNNEL VIEW: a /dashboard-internal or SQL view rollup — step
conversion, median times, drop-off by occasion — enough to compare
before/after each sprint. (5) DECISION (don't build): session replay —
write the §6 decision entry with a privacy-first recommendation.

**Open threads:**
- [ ] Funnel events + timings (wizard/editor/publish/RSVP)
- [ ] Client error capture + ErrorBoundary wiring
- [ ] Whisper pill + table + bell digest line
- [ ] Funnel SQL view + how-to-read-it note in this doc
- [ ] Session-replay decision logged in PERSONA-PLAN §6

**Counts as done:** A full Tyler speedrun produces a legible event
trail end-to-end in the funnel view; a thrown error in dev appears in
the capture table; the pill round-trips on phone + desktop.

**Skip:** Third-party analytics vendors (first-party only, Supabase).
A/B testing infra. Dashboards beyond one honest view.
```

---

### S9 — The demo orchard · **status: planned** · P2 (testing apparatus)

```
## Active focus — S9 · The demo orchard (seeded worlds for testers)

**Goal:** A tester (or investor) can walk any persona's world in two
clicks, and a test account can always be reset to a known state.

**Direction:** (1) SIX SEEDED SITES: one published, fully-dressed site
per persona occasion (wedding, 21st, 40th anniversary, bachelorette,
memorial, quinceañera) — real manifests in the DEMO_MANIFEST pattern,
each with guests/RSVPs/photos seeded, reachable at /demo/{occasion}
(extend the existing /demo). The memorial demo is the tone benchmark —
build it with the care of a real one. (2) TESTER ACCOUNTS: a seed
script (dev/staging only, service-role, env-gated) that mints
test-{persona}@ accounts with the site, guests, and dashboard state
mid-journey — Linda's account has 12 RSVPs and 2 pending replies to
look at. (3) RESET: the same script re-runs idempotently — one command
returns every tester world to baseline between sessions. (4) THE
SCRIPT CARD: docs/testing/ gains the moderator kit — per-persona task
cards (5 tasks each, from §5's protocol), the recruiting screener, and
the observation sheet.

**Open threads:**
- [ ] Six occasion demos on /demo/{occasion}
- [ ] Seed + reset script (env-gated, idempotent, never runs against
      prod without an explicit flag)
- [ ] Moderator kit in docs/testing/
- [ ] Walk each demo at phone viewport — every one passes law 1 (§3)

**Counts as done:** /demo/bachelorette and /demo/memorial exist and
read true at 390px; the reset script round-trips a mutated tester
account; the moderator kit prints on one page per persona.

**Skip:** Public template gallery (different feature). Prod data
seeding. Video/tutorial content.
```

---

## 5 · The mass-testing readiness gate

Testing begins when every line is true. Check them off in place.

**Trust (blocks recruiting):**
- [ ] S1–S3 shipped — no persona sees another occasion's frame, a false
      proof, or a dropped artifact
- [ ] The six persona walks re-run clean at their viewports (transcripts
      + screenshots archived in docs/audit-shots/personas/)

**Instrumentation (blocks learning anything):**
- [ ] S8 funnel events live — wizard completion %, time-to-weave,
      publish %, first-share % all measurable per occasion
- [ ] Client error capture live; baseline error rate recorded for one
      week before testers arrive
- [ ] Whisper pill live on host surfaces

**Apparatus (blocks running sessions):**
- [ ] S9 demo orchard + reset script + moderator kit
- [ ] Device matrix passes: iPhone SE (375×667), iPhone 15 (390×844),
      Android (412×915), iPad (820×1180), laptop (1280×800),
      desktop (1440×900) — the six-walk suite at each
- [ ] Staging environment testers can safely break (never prod)

**The protocol (how a session runs):**
Recruit 5–6 per persona archetype (30–36 total; Denise's archetype is
recruited with extra care and compensated accordingly — never someone
currently grieving). 45-minute moderated sessions, think-aloud, on THEIR
device. Five tasks per persona from the moderator kit — always: (1) make
your event's site from nothing, (2) make it feel like yours, (3) publish
and share it, (4) reply as a guest from the shared link on a second
device, (5) find who's coming. Measure: task completion, time-to-value
(first draft / publish / share), stall points (>10s silence), the SUS
short form, and the one question that matters — *"Would you send this
link to your people today? If not, what's missing?"* Success bar to exit
testing: ≥80% task completion across personas, wizard→publish conversion
≥60% in-session, zero tone incidents on solemn flows.

---

## 6 · Decisions log

- **Q1: Session replay for testing?** Deferred to S8's decision thread.
  Leaning no for guests ever; maybe staging-only for hosts with consent.
- **Q2: Does Tyler's archetype need a lighter "party mode" wizard skin?**
  Not yet — his speedrun already reaches Review in ~20s. Revisit if
  testing shows drop-off at the Story phase.
- **Q3: Bilingual surfaces for Marcus's family?** The i18n plumbing +
  guest language switcher shipped 2026-07-06. Testing should include one
  Spanish-preferring guest task before we invest further. (Quinceañera
  demo site should carry bilingual copy as its default.)
- **Q4: Should "Other event" expand inline or navigate?** It expands
  inline with category headers today, which tested fine in the walks —
  keep; S5's type-ahead sits above it.

---

## 7 · Changelog

### 2026-07-08 — Authored from the six-persona walk
Playwright walks of landing / wizard (6 occasions × 3 viewports × 2
modes) / editor / published site + RSVP / dashboard. 11 findings (3 P0),
4 laws, 9 sprints, the readiness gate. Evidence in
docs/audit-shots/personas/. No product code changed in this session —
this document IS the deliverable.

*End of PERSONA-PLAN.md. The walks are the test suite for this plan:
re-run them after every sprint, and believe them over this document
when they disagree.*
