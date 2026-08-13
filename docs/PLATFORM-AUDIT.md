# Pearloom — Complete Platform Audit

> **Purpose of this document.** A self-contained description of what Pearloom
> is, what it does, how it's built, how it makes money, and where it's weak —
> written for an outside reader with no access to the codebase. It is intended
> to be handed to independent reviewers (human or AI) with the question:
> *"what would you improve?"*
>
> Audit performed: **2026-08-04**, against the live `main`-descended working
> tree. Every count in §3 was measured from the source, not taken from prior
> docs. Where the repo's own documentation disagrees with the code, the code
> is reported and the drift is flagged in §13.

---

## 1 · What Pearloom is, in one paragraph

Pearloom is a web platform for planning, publishing, and remembering the big
days of a person's life. A host answers a short wizard, and Pearloom presses a
complete, designed event website — hero, story, schedule, travel, registry,
RSVP, FAQ, gallery — in about a second. From there the same account runs the
whole event: guest list and RSVPs, invitations and stationery, budget and
vendors, seating, music, the day-of run of show, and after it's over, a
keepsake. It spans **31 occasion types**, from weddings to memorials to
quinceañeras, with per-occasion vocabulary, tone, blocks, and forms. The
product's stated positioning is *"Beautiful websites for weddings and life's
big days — plus everything to run them."*

The commercial thesis is that competitors (The Knot, Zola, Joy, Minted,
Squarespace templates) sell either a **wedding website** or a **planning tool**,
and almost all of them are wedding-only. Pearloom sells one artifact that is
both, for any life event, with a deliberately high design bar.

---

## 2 · Positioning and design philosophy

Pearloom's differentiation is explicitly **taste**, and the codebase enforces
it structurally rather than by convention.

The stated cultural references are Hermès, Penguin Classics, letterpress
shops, and Linear. The explicit anti-references are template marketplaces,
Canva, and anything that reads "AI startup." A written brand constitution
(`BRAND.md`) governs typography, color, motion, and microcopy, and several of
its rules are enforced by failing unit tests rather than review — for example:

- **No physical-fulfillment promises** in copy (a fence test greps for them).
- **No pastel "sticker" marks** — decorative marks must render as letterpress
  ink, not solid discs (`no-sticker-marks.test.ts`).
- **No demo/fake content on published sites** — placeholder copy is gated
  behind an `editable` flag that is only true inside the editor canvas.
- **Editor chrome may not bind to site-theme variables** — enforced by an
  ESLint `no-restricted-syntax` rule, so editing a site's colors can never
  repaint the editor UI around it.
- **Forbidden-strings tests** on dashboard copy to keep post-event surfaces
  from speaking in future tense.

A notable microcopy decision, made after persona testing: the craft metaphor
("woven", "pressed", "threading") was **demoted out of the working UI**. It
survives in the marketing hero, the email signature, and a few designed
moments; buttons, forms, empty states, and errors use plain language, on the
grounds that a 60-year-old planning an anniversary should never have to decode
a word to finish a task.

---

## 3 · Scale and stack (measured)

| Metric | Value |
|---|---|
| Lines of TS/TSX/CSS under `src/` | **~282,500** |
| API route handlers | **238** |
| Page routes | **110** (incl. ~30 `/dev/*` design harnesses) |
| React components | **416** files |
| Library modules | **218** files |
| Supabase migrations | **78** |
| Database tables | **~88** |
| Unit/integration test files | **112** (Vitest) |
| Occasion types | **31** (5 `shipping`, 26 `beta`) |
| Block/section types | **48** |
| Site themes | **10** |
| Site "Editions" (layout systems) | **6** |
| Section layout variants | **116** across 32 section families |
| Theme Store packs | **75** |
| RSVP presets | **8** |
| AI-backed API routes | **~40** |
| Scheduled cron jobs | **6** |

**Stack:** Next.js 16 (App Router) · React 19 with the React Compiler ·
TypeScript · Tailwind 3 + ~11k lines of hand-authored CSS · Supabase
(Postgres, RLS, Realtime) · NextAuth (Google OAuth + scrypt credentials) ·
Stripe · Resend (email) · Cloudflare R2 (storage) · Upstash Redis (rate
limiting) · Mapbox · Sentry · web-push · Anthropic Claude + Google Gemini +
OpenAI images · Vitest + Playwright + axe-core.

---

## 4 · The core domain model

### 4.1 The manifest

Everything about a site is one JSON document — the `StoryManifest` — stored on
a `sites` row. It carries content (names, dates, story chapters, schedule,
FAQ, registry, travel), look (`themeId`, `themeVars`, `kitId`, `texture`,
`density`, `motifLayout`, `edition`), structure (`blockOrder`,
`hiddenSections`, `blockVariants`), and feature state (RSVP config, privacy
gate, arrival style, studio state, seating plan, voice DNA).

This is the platform's central architectural bet: one document, one renderer,
no per-site code. It makes the editor trivially live and publishing instant.
It also means the manifest is a large, weakly-typed surface with real
historical sediment — see §13.

### 4.2 The occasion registry

`EVENT_TYPES` is a single registry of 31 occasions. Each entry declares its
category, typical host, default/optional/hidden blocks, RSVP preset, AI voice
(`celebratory | intimate | ceremonial | playful | solemn`), and template ids.

Every occasion-aware behavior in the product derives from this one table: URL
prefix, wizard question packs, name mode (couple/solo/group), block picker
filtering, RSVP form shape, AI tone, dashboard nav visibility, OG share card
layout, and empty-state copy. Adding an occasion is a registry entry, not a
code branch. This is one of the codebase's genuinely strong design decisions.

Occasions span five arcs: wedding-adjacent (wedding, engagement, bachelor/ette,
showers, rehearsal, welcome party, brunch, vow renewal), family milestones
(baby shower, gender reveal, sip-and-see, housewarming), birthdays and life
milestones (first birthday, sweet sixteen, milestone birthdays, retirement,
graduation), cultural/religious (bar/bat mitzvah, quinceañera, baptism, first
communion, confirmation), and commemoration (memorial, funeral, reunion).

### 4.3 The renderer contract

**One component renders every site pixel** — `redesign/ThemedSite.tsx` — for
both the editor canvas and the published site. The only difference is an
`editable` prop. There is no dispatch, no fallback, no legacy path. Three
prior renderers were deleted to reach this state (§13).

### 4.4 The look system

A site's look is composed of five orthogonal axes, all manifest fields:

- **Theme** — a complete CSS custom-property bag (`--t-*`: paper, ink, accent,
  gold, line, fonts, radii, shadow) emitted on the site root. 10 built-in
  themes; theme packs override the bag.
- **Kit** — card/row treatment: classic, ticket, plate, scrapbook, index,
  minimal.
- **Texture** — paper grain variant plus an intensity scalar.
- **Motifs** — decorative layout from a motif registry.
- **Density** — cozy / comfortable / spacious.
- **Edition** — a read-time bundle of layout defaults (hero variant, divider
  rhythm, section openers) recommended per occasion. **Editions never write
  back to the manifest**, which protects every published site from visual
  regression when defaults change.

Sections additionally support **named layout variants** — **116 variants
across 32 section families** (hero, story, schedule, travel, registry,
gallery, FAQ, RSVP, nav, footer, countdown, map, music, plus every
Event-OS block) — with per-occasion recommendations surfaced as a hint,
never auto-applied.

---

## 5 · Feature inventory by surface

### 5.1 Acquisition — the landing page

A hand-built marketing site (`marketing/design/*`): hero, three-acts stage,
occasion grid, journey, studio showcase, day-of, guests, gallery, together,
pricing, testimonials, FAQ, CTA footer. Plus `/demo/{occasion}` — five seeded
demo worlds pressed through the real wizard pipeline (memorial included
deliberately, as a tone benchmark), so a prospect can walk a real site without
signing up.

### 5.2 Onboarding

`/welcome` — a five-movement first-run flow: arrival, name, "mark" (avatar —
photo, one of 12 hand-drawn orchard glyphs, or a monogram seal), occasion
intent, and a terms agreement (the only required gate). Accounts that already
own sites skip straight through. Auth supports Google OAuth and manual
accounts with scrypt-hashed credentials, email verification, and password
reset.

### 5.3 The wizard — `/wizard/new`

Nine steps in four presented phases: `Occasion → Basics → Details → Day →
Photos → Sections → Vibe → Palette → Review`.

Key characteristics:

- **Generation is instant and local.** No AI call at finish. The manifest is
  assembled client-side and POSTed; the host lands in the editor in ~1s. AI
  drafting was deliberately moved out of the critical path.
- **Photos are content, not inputs.** They upload to R2 during the step; the
  first becomes the cover, the rest the gallery.
- **Occasion-aware throughout** — name mode, question packs, vibe chips,
  suggestion sets, and a live preview frame that speaks the occasion's grammar
  (a memorial preview says "In loving memory," never "SAVE THE DATE").
- **A Sections step** lets the host pick which sections the site starts with
  and a signature layout for each, pre-checked to smart defaults. Skipping
  writes nothing.
- **A fitting room** for explicit kit/texture/motif/density picks.
- **Background decor pre-cook** — the decor library generates in the
  background while the host finishes, folded in at finish.
- **An honest Review pressing** — the preview carries the host's real date,
  location, and picks, with drafting placeholders shown as such rather than
  demo copy presented as final.

### 5.4 The editor — `/editor/[slug]`

A three-pane editor: section rail (sections + pages), the live site as canvas,
and a property rail (Content + Design tabs).

- **Content tab** dispatches to one of ~24 per-section panels.
- **Design tab** is the whole site look in one scroll: Pear's picks, themes,
  colors, fonts, paper/grain, layout and card styles, background, motion,
  menu/footer, fine-tune, CTAs.
- **Inline editing** directly on the canvas.
- **Autosave** on a 2s debounce, with `beforeunload` flush via `sendBeacon`,
  undo/redo, and base64 stripping to keep payloads under request limits.
- **Command palette** (⌘K) indexing sections, themes, kits, and flows.
- **In-canvas theme shop** — preview and unlock packs without leaving.
- **Pear copilot** — an AI assistant that proposes structured patches rendered
  as approve/reject cards, plus action cards that can actually execute
  (e.g. "send the nudge to all pending guests").
- **Collaboration** — role-gated (`owner | editor | guest-manager | viewer`)
  with presence.
- **Publish checklist** and, for memorials/funerals, a mandatory re-read
  interstitial before publishing.

### 5.5 The published site — `/{occasion}/{slug}`

Path-based, occasion-prefixed URLs across all 31 occasions, with optional
multi-page mode and sub-page routing.

Guest-facing features: a **sealed-envelope arrival animation** (with a quiet
variant for solemn occasions and an off switch), RSVP (inline plus a modal,
preset-shaped per occasion), a **live tapestry** that weaves a thread per
attending reply (deterministic SVG, no PII), guestbook, photo wall with guest
uploads and reactions, a guest-suggested **music playlist** with 30-second
previews, group **cost splitter** with settle-up deep-links, registry with
reserve-and-link plus chip-in group gifting, an AI concierge chat that knows
the site's real logistics, a day-of banner and broadcast bar, password/privacy
gating, translation into other languages, calendar (.ics) export, and
per-occasion OG share cards.

### 5.6 The guest passport — `/g/[token]`

Every guest gets a personal link. The passport addresses them by name and
carries: their RSVP state, seat assignment and table neighbors, personalized
travel notes, voice-toast recorder, their own contributions back to them
(photos, guestbook entries, whispers, song requests, time capsule), other
Pearloom celebrations they're part of, a host DM line, the event-wide guest
thread, an opt-in "people you've celebrated with" card, and a "host your own"
conversion CTA.

This is the platform's most distinctive guest-side feature and the seed of its
social graph.

### 5.7 The Studio — `/dashboard/invite`

A stationery editor for save-the-dates, invitations, and thank-yous, pressing
from the site's own theme tokens so the card and the site match.

- 10 layouts with per-occasion recommendations.
- Six paper stocks with their own inks (including dark navy), grain-strength
  control, and four edge treatments.
- Letterpress marks: dated postmark, monogram seal, mark-ink picker.
- Click-to-edit lines on the canvas; show/hide groups; placed decorative
  assets that snap to nine anchors and print in place.
- Real QR codes to the live site.
- An envelope liner and real-guest addressee.
- **A true press sheet** — three pages at exact physical size, 5×7 plus bleed
  with crop marks, geometry pinned by tests.
- Sending goes out as themed email where the hero image is *that guest's own
  card*, with passport deep-links, .ics attachment, and RSVP anchors.

Print-at-home is the only print story; physical fulfillment was retired
deliberately (§13).

### 5.8 The dashboard — host operations

Organized into hubs, with nav visibility derived per-occasion and per-phase.
The dashboard runs on a **phase spine** — `planning → final → the-day →
afterglow → kept` — computed from the day count, so the home surface changes
character as the event approaches and passes.

| Hub | Surfaces |
|---|---|
| **Home** | Phase-aware cockpit with a single hero plate, next-step guidance, live figures |
| **Site** | My sites, weekend builder (multi-event arcs), templates |
| **Guests** | Roster, RSVPs, messages (host↔guest DMs + party thread), threads, submissions moderation, guest import/dedupe, address collection, nudge composer, text/SMS invites |
| **Money** | Budget with rollups, vendor book with call sheets, registry ledger, payments |
| **Run the day** | Day-of run of show, seating arranger, vendor "who to call", live broadcasts, announcements |
| **Make** | Studio, uploads library, The Reel (gallery), speech composer, music, voice DNA |
| **Keep** | Keepsakes, memory book, passport cards, QR posters, post-event film |
| **Social** | Circle (friend graph), connections |
| **Meta** | Analytics, settings, help, director (AI planning assistant), cadence (email sequences) |

Notable individual capabilities: a drag-and-drop **seating arranger** with
tables, seats, and recorded constraints (manual assignment — there is no
auto-solver); a **speech composer** that mines real guest submissions for quotable
lines; **voice DNA** (analyze the host's writing/speech, then apply that voice
to every AI rewrite); an **AI event director**; a **notification bell** with
a unified feed across RSVPs, gifts, messages, vendor due dates, submissions,
and circle activity; and a **memory book** aggregating every guest artifact
into a printable keepsake.

### 5.9 The social layer

A deliberately narrow, privacy-first graph rather than a social network:

- **People** — persistent guest identity keyed by lowercase email, so one
  human is recognized across every celebration they attend. Hosts see history
  only from their own sites.
- **Circle** — invite by email, mutual-consent friendships, first-names-only
  exposure, re-verified on every read.
- **Person threads** — 1:1 messaging between consenting people.
- **Weave-in** — pull someone from your circle straight into a guest list.

Cross-guest visibility is opt-in and defaults off. The documented decision log
records that a general social network was considered and rejected (episodic
users, cold-start, brand mismatch) in favor of this event graph.

### 5.10 Automation and lifecycle

Six scheduled jobs: communications dispatch (10 min), film rendering (10 min),
notification digest (daily), day-after recap (daily), anniversary nudges
(daily), and a weekly digest (Mondays). Plus transactional email across
invites, RSVPs, broadcasts, welcome, verification, and thank-yous — with
one-click unsubscribe, Svix-verified webhooks, send-time suppression, and
bounce tracking.

---

## 6 · The AI layer

AI is present across ~40 routes but deliberately **never in a critical path**
— not in the wizard's finish, not at publish.

**Routing:** Claude (Opus/Sonnet/Haiku tiers) for copy, chat, rewriting, and
structured extraction with forced tool-choice; Gemini Pro/Flash for long-form
creative and analysis; an image router (OpenAI or Gemini) for photo stylizing,
decor, stickers, and QR posters.

**What AI actually does here:**

| Area | Capability |
|---|---|
| Copy | Story drafting, chapter rewrite, inline rewrite with tone control, FAQ generation, thank-you notes, follow-ups |
| Voice | Voice DNA analysis + transcription, applied to every rewrite surface so drafts sound like the host |
| Planning | Event director, schedule-from-notes, meal/hotel/travel-guide suggestions, registry import and drafting |
| Guests | Guest concierge chat (grounded in the site's real logistics), seatmate intros, personalized guest content, nudge drafting |
| Design | Palette from photos, look-from-story, decor library generation, recolor, background removal, SVG stickers, venue motifs |
| Studio | Card drafting, asset generation, stationery rewrite |
| Ceremony | Speech and toast drafting with per-occasion register (solemn for memorials, playful for bachelor parties) |

**Governance:** per-account dollar caps enforced across the AI routes with a
fail-open gate, plus usage metering and an admin usage view. Memorial content
gets a gentler register and a mandatory human-review note.

---

## 7 · Data, infrastructure, and security posture

**Database:** ~88 Postgres tables under Supabase. Belt-and-braces RLS —
restrictive `deny-anon` policies with a service-role client used inside API
routes, so anonymous access is denied at the database even if a route is
wrong. 78 migrations, tracked in a `_pearloom_migrations` table.

**API conventions** (consistent across routes): session check → rate limit →
JSON parse in try/catch → validate → work → `{ ok, … }` response, with
`[route]`-prefixed logging and a standard status-code vocabulary.

**Measured coverage:** 147 of 238 routes call `getServerSession`; 129 call
`checkRateLimit`. The gap is largely public guest endpoints (token-authed by
design) and webhooks, but it is not fully audited — see §13.

**Security work already done:** SSRF guards on URL-fetching (private-IP
rejection pre-fetch and post-DNS, re-vetted redirects, size/time caps),
optimistic-concurrency on registry claims, a privacy contract on vendor call
sheets (no money, no notes, no other vendors, no guests, never the host's
account email), a sibling-event privacy fix so bachelor/ette sites are never
advertised, seating-lookup injection hardening, and server-side ownership
gating on money-adjacent chat context.

**Privacy:** account data export and deletion endpoints exist, with a
deletions audit table.

**Observability:** Sentry, client-error capture, a product-events table with
activation-funnel and first-session-funnel views, and per-section analytics.

---

## 8 · Business model

**Per-site plans, one-time — explicitly not a subscription** (this is a
load-bearing marketing promise):

| | Journal | Atelier | Legacy |
|---|---|---|---|
| Price | $0 | **$19** one-time | **$129** one-time |
| Sites | 1 | 3 | 10 |
| Guests | 50 | 500 | Unlimited |
| Photos | 20 | 200 | Unlimited |
| AI generations | 3 | 50 | Unlimited |
| Custom domain | — | ✓ | ✓ |
| Theme Store | Free shelf | + every premium pack | + the signature shelf |

Memorials are free on every tier.

**Theme Store** — 75 packs in three tiers: free (funnel), premium ($10–18,
included with Atelier), signature ($20–28, included only with Legacy). The
à-la-carte shelf is deliberately a decoy for the plan: two premium packs cost
more than Atelier, which includes all of them plus a custom domain.

**Vendor marketplace** — an 8% platform fee on bookings, with the application
fee capped below the deposit so Stripe never rejects the vendor transfer.

**Registry** — Pearloom deliberately **never touches the money**. Guests
reserve items and buy at the merchant's own link; cash gifts are P2P
deep-links to the host's own Venmo/PayPal/CashApp/Zelle. This avoids
money-transmitter licensing entirely. Stripe checkout code exists but stays
parked behind absent env keys.

**⚠ The critical gap:** `requirePlan` — the function that would enforce paid
tiers — has **zero callers in the codebase**. Plan limits are defined and the
store's pack grants are server-enforced, but the plan ladder's headline
capabilities (custom domain, co-hosts, linked celebrations) have no features
gated behind them. The product currently has a documented price list and
essentially no paywall. This is flagged in the repo's own backlog as blocked
on a monetization decision.

---

## 9 · Quality and testing

- **112 Vitest test files**, covering pure logic (pricing, split math, budget
  rollups, contrast, dates, dedupe, tokens, RLS-adjacent access helpers),
  brand fences (forbidden strings, no-physical-promises, no-sticker-marks),
  and geometry contracts (press sheet at physical size).
- **Playwright** for e2e, plus visual regression on theme packs.
- **axe-core** accessibility testing — a persona-driven accessibility sprint
  brought all routes to zero serious/critical violations, deepened text
  tokens for AA contrast, and verified 125%/150% zoom.
- **Persona testing** — six personas (engaged couple, 20-year-old birthday
  host, 60-year-old anniversary couple, bachelorette MOH, memorial planner,
  quinceañera dad) walked the real product across phone/tablet/desktop; the
  resulting 11 evidence-anchored findings were each executed as a sprint.
- **CI** gates the test suite on every PR.
- Full-repo ESLint runs clean (0 errors, 0 warnings), with React Compiler
  lint rules active.

*Note: the suite could not be executed during this audit — dependencies are
not installed in the audit container. Counts above are from file inventory;
the last recorded full-suite result in the repo's own docs is 1,269–1,278
passing.*

---

## 10 · What has been deliberately deleted

Worth stating, because it shows the codebase has been actively pruned rather
than only accreted. Roughly **105,000+ lines** removed across several passes:

- Three prior site renderers (`SiteV8Renderer` at 10,324 lines, then
  `ThemedSiteRenderer`, then the original V1 component tree).
- An entire AI "vibeSkin" design-generation layer and the memory-engine story
  pipeline, after a production check confirmed zero rows used them.
- The V1 marketing tree, an orphaned `/preview` surface, ~40 zero-importer lib
  modules, and the shadcn UI kit remainder.
- **Pearloom Print** — the paid physical print-and-mail service (Lob
  integration, checkout, fulfillment, order dashboard) — retired end-to-end as
  a product decision, with a fence test now guarding against the copy coming
  back.
- 13 orphaned manifest fields that were written but never read.

A deleted-architecture ledger is maintained so future sessions don't
resurrect things.

---

## 11 · Genuine strengths

1. **The occasion registry.** 31 event types driven from one table with no
   scattered switch statements. Adding an occasion is a data entry.
2. **One renderer, one manifest.** Editor and published site are literally the
   same component. This eliminates an entire class of "looks different when
   published" bugs.
3. **Design conviction enforced by tests.** Brand rules as failing tests, not
   review comments, is unusual and effective.
4. **Read-time defaults that never write back.** The Editions contract means
   improving defaults can't regress a published site.
5. **The honesty gate.** Demo content structurally cannot reach a published
   site.
6. **Regulatory avoidance by design.** Never touching gift money sidesteps
   money-transmitter licensing without losing the registry feature.
7. **The guest passport.** A genuinely differentiated guest surface that
   doubles as the acquisition loop.
8. **Persona-driven accessibility work** that treated an older, non-technical
   host as a first-class user.
9. **Documented decision log.** Rejected paths (social network, physical
   print, craft-metaphor microcopy) are recorded with reasoning.

---

## 12 · Weaknesses, risks, and open questions

Ordered roughly by severity.

### 12.1 Commercial

- **No paywall.** `requirePlan` has zero callers. The pricing page sells
  capabilities that nothing gates. This is the single largest gap between what
  is marketed and what is enforced.
- **Monetization model unresolved.** A wedding realistically produces 3–4
  Pearloom sites (couple, maid of honor, best man, parents). Per-site pricing
  and the "one event, one price" narrative contradict each other, and the
  question is logged as open.
- **One-time pricing with ongoing costs.** Sites are hosted, images stored,
  and AI metered indefinitely off a single $19–$129 payment. There is no
  modeled unit economics for a memorial site that stays up for a decade.
- **Vendor marketplace is a thin primitive.** The 8% fee and click tracking
  exist; supply acquisition does not.

### 12.2 Product scope

- **Enormous surface for the team size.** ~110 routes, ~30 dashboard
  destinations, 48 block types, 75 theme packs. Nav has been cut twice
  (22→10 essentials, then a "quiet shelf" de-promotion), which is a symptom.
  It is not clear which features drive retention versus which exist because
  they were buildable.
- **26 of 31 occasions are `beta`.** Breadth is registry-deep but the depth
  per occasion beyond weddings is largely untested with real users.
- **Feature loops that may not close.** Several capabilities (voice DNA,
  cadence, director, memory weave, film) are individually impressive but their
  usage rates are unknown.

### 12.3 Technical

- **`pearloom.css` is ~8,400 lines**, carrying per-kit and per-texture CSS
  plus sediment from deleted surfaces. A dead-selector audit is overdue.
- **The manifest is a large weakly-typed document.** Historical fields, mixed
  naming, and `as unknown as` casts still appear. There is no schema
  validation on write.
- **Rate limiting covers 129 of 238 routes.** The uncovered set has not been
  systematically audited to confirm each is intentionally public.
- **No systematic ownership/RLS test harness.** A wrong-owner→403 test across
  every mutating route is on the backlog but not written.
- **An E2E auth bypass provider exists**, gated on an env flag plus
  `NODE_ENV !== 'production'`, with **zero tests asserting it is inert in
  production**. The gate looks correct; the absence of a test on an auth
  bypass is the risk.
- **Thin e2e coverage** — one Playwright spec file in the tracked suite
  relative to the size of the product.
- **Known live bug:** `applyLocale` reads `manifest.faq`, but the field is
  `manifest.faqs`, so FAQ translations never render. Confirmed still present.
  One-line fix.

### 12.4 Operational

- **Email deliverability is unfinished** — SPF, DKIM, DMARC, and a dedicated
  bulk sending subdomain are outstanding owner actions. Without them,
  invitations land in spam, which breaks the product's core loop.
- **A CAN-SPAM postal address placeholder** (`[MAILING ADDRESS]`) is still in
  the email footer.
- **No staging environment**, and no completed error baseline period, both
  gates the repo's own testing plan set before recruiting users.

### 12.5 Documentation drift

The repo's internal docs are unusually thorough but have drifted from the
code in at least three places, which matters because future sessions read
them as authoritative:

- `MONETIZATION.md` still documents Pearloom Print pricing and margins as a
  live product; the feature was deleted.
- `CLAUDE-PRODUCT.md` states 28 occasions; the registry has 31.
- `CLAUDE-DESIGN.md` states 6 themes; there are 10. It also describes "48
  variants across 9 sections"; there are 116 across 32.

---

## 13 · Open product questions (unresolved, from the internal log)

1. **Event grouping** — should one wedding be a master site containing child
   events with a shared guest list, or separate linked sites? (Currently
   separate, with a "celebration" linking layer.)
2. **Pricing unit** — per site or per celebration?
3. **Multi-host onboarding** — the maid of honor editing the shower site is a
   first-class case the onboarding doesn't yet address.
4. **Memorial AI** — currently a gentle draft plus mandatory human review.
   Should AI drafting be offered at all for memorials?
5. **Free-tier enforcement** — `maxSites: 1` now genuinely enforces for free
   accounts. Is that the intended launch behavior?
6. **Post-event lifecycle** — the afterglow→"kept" window is a hardcoded 45
   days. What happens to a site at year five?

---

## 14 · Questions for a reviewer

If you are reviewing this document, the most valuable feedback would address:

1. **Focus.** Given the surface area in §5, what would you cut, merge, or
   de-promote? Which features would you bet are load-bearing for retention,
   and which are impressive but inert?
2. **Monetization.** How would you resolve §12.1 — what should be gated, at
   what price, on what unit (site / celebration / subscription), given that
   one wedding spawns several sites and that hosting cost is perpetual?
3. **Go-to-market.** The product spans 31 occasions but is deepest on
   weddings. Is breadth an asset or a diluting force at this stage? Where
   would you concentrate?
4. **The differentiation bet.** Pearloom is betting that *design taste* is a
   defensible moat against The Knot/Zola/Joy. Is it? What else would need to
   be true?
5. **Risk.** What in §12.3–12.4 would you fix before letting real users in,
   and in what order?
6. **The guest loop.** The guest passport is the acquisition mechanism — a
   guest at one event becomes a host of the next. How would you strengthen
   that loop?
7. **What's missing.** What does a platform in this category need that isn't
   in this document at all?

---

*End of audit. Compiled 2026-08-04 from the source tree. Counts are measured;
where the repo's docs disagree with the code, the code is reported.*
