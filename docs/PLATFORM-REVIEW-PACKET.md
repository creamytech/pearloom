# Pearloom — Platform Review Packet

> **What this document is.** A self-contained packet for an outside reviewer
> (human or AI) with no access to the codebase. It has four parts:
>
> - **Part I — The audit.** What Pearloom is, what it does, how it's built,
>   how it makes money, and where it's weak. Compiled 2026-08-04 directly from
>   the source tree; every count is measured, not inherited from internal docs.
> - **Part II — Review #1.** The strategic recommendations of the first
>   independent reviewer, preserved in full.
> - **Part III — Annotations on Review #1.** Fact-checks from the codebase:
>   where Review #1's assumptions under- or over-estimate what already exists.
> - **Part IV — Questions for you.** What we want from the next reviewer —
>   including where you agree or dissent from Review #1, not just fresh ideas.

---

# PART I — THE AUDIT

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

## 2 · Positioning and design philosophy

Pearloom's differentiation is explicitly **taste**, and the codebase enforces
it structurally rather than by convention.

The stated cultural references are Hermès, Penguin Classics, letterpress
shops, and Linear. The explicit anti-references are template marketplaces,
Canva, and anything that reads "AI startup." A written brand constitution
governs typography, color, motion, and microcopy, and several of its rules are
enforced by failing unit tests rather than review — for example:

- **No physical-fulfillment promises** in copy (a fence test greps for them).
- **No pastel "sticker" marks** — decorative marks must render as letterpress
  ink, not solid discs.
- **No demo/fake content on published sites** — placeholder copy is gated
  behind an `editable` flag that is only true inside the editor canvas.
- **Editor chrome may not bind to site-theme variables** — enforced by an
  ESLint rule, so editing a site's colors can never repaint the editor UI
  around it.
- **Forbidden-strings tests** on dashboard copy to keep post-event surfaces
  from speaking in future tense.

A notable microcopy decision, made after persona testing: the craft metaphor
("woven", "pressed", "threading") was **demoted out of the working UI**. It
survives in the marketing hero, the email signature, and a few designed
moments; buttons, forms, empty states, and errors use plain language, on the
grounds that a 60-year-old planning an anniversary should never have to decode
a word to finish a task.

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

## 4 · The core domain model

### 4.1 The manifest

Everything about a site is one JSON document — the `StoryManifest` — stored on
a `sites` row. It carries content (names, dates, story chapters, schedule,
FAQ, registry, travel), look (theme, theme variables, kit, texture, density,
motif layout, edition), structure (block order, hidden sections, block
variants), and feature state (RSVP config, privacy gate, arrival style, studio
state, seating plan, voice DNA).

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

**One component renders every site pixel** — for both the editor canvas and
the published site. The only difference is an `editable` prop. There is no
dispatch, no fallback, no legacy path. Three prior renderers were deleted to
reach this state (§10).

### 4.4 The look system

A site's look is composed of five orthogonal axes, all manifest fields:

- **Theme** — a complete CSS custom-property bag (paper, ink, accent, gold,
  line, fonts, radii, shadow) emitted on the site root. 10 built-in themes;
  theme packs override the bag.
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
gallery, FAQ, RSVP, nav, footer, countdown, map, music, plus every Event-OS
block) — with per-occasion recommendations surfaced as a hint, never
auto-applied.

## 5 · Feature inventory by surface

### 5.1 Acquisition — the landing page

A hand-built marketing site: hero, three-acts stage, occasion grid, journey,
studio showcase, day-of, guests, gallery, together, pricing, testimonials,
FAQ, CTA footer. Plus `/demo/{occasion}` — five seeded demo worlds pressed
through the real wizard pipeline (memorial included deliberately, as a tone
benchmark), so a prospect can walk a real site without signing up.

### 5.2 Onboarding

`/welcome` — a five-movement first-run flow: arrival, name, "mark" (avatar —
photo, one of 12 hand-drawn orchard glyphs, or a monogram seal), occasion
intent, and a terms agreement (the only required gate). Accounts that already
own sites skip straight through. Auth supports Google OAuth and manual
accounts with scrypt-hashed credentials, email verification, and password
reset.

### 5.3 The wizard

Nine steps in four presented phases: `Occasion → Basics → Details → Day →
Photos → Sections → Vibe → Palette → Review`.

Key characteristics:

- **Generation is instant and local.** No AI call at finish. The manifest is
  assembled client-side and POSTed; the host lands in the editor in ~1s. AI
  drafting was deliberately moved out of the critical path.
- **Photos are content, not inputs.** They upload during the step; the first
  becomes the cover, the rest the gallery.
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

### 5.4 The editor

A three-pane editor: section rail (sections + pages), the live site as canvas,
and a property rail (Content + Design tabs).

- **Content tab** dispatches to one of ~24 per-section panels.
- **Design tab** is the whole site look in one scroll: AI picks, themes,
  colors, fonts, paper/grain, layout and card styles, background, motion,
  menu/footer, fine-tune, CTAs.
- **Inline editing** directly on the canvas.
- **Autosave** on a 2s debounce, with `beforeunload` flush, undo/redo, and
  payload-size management.
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

### 5.7 The Studio — stationery

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
deliberately (§10).

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
auto-solver); a **speech composer** that mines real guest submissions for
quotable lines; **voice DNA** (analyze the host's writing/speech, then apply
that voice to every AI rewrite); an **AI event director**; a **notification
bell** with a unified feed across RSVPs, gifts, messages, vendor due dates,
submissions, and circle activity; and a **memory book** aggregating every
guest artifact into a printable keepsake.

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
one-click unsubscribe, signature-verified webhooks, send-time suppression, and
bounce tracking.

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

**Governance:** per-account dollar caps enforced across the AI routes, plus
usage metering and an admin usage view. Memorial content gets a gentler
register and a mandatory human-review note.

## 7 · Data, infrastructure, and security posture

**Database:** ~88 Postgres tables under Supabase. Belt-and-braces RLS —
restrictive deny-anon policies with a service-role client used inside API
routes, so anonymous access is denied at the database even if a route is
wrong. 78 migrations, tracked in a migrations table.

**API conventions** (consistent across routes): session check → rate limit →
JSON parse in try/catch → validate → work → `{ ok, … }` response, with
route-prefixed logging and a standard status-code vocabulary.

**Measured coverage:** 147 of 238 routes check the session; 129 rate-limit.
The gap is largely public guest endpoints (token-authed by design) and
webhooks, but it is not fully audited — see §12.

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

## 9 · Quality and testing

- **112 Vitest test files**, covering pure logic (pricing, split math, budget
  rollups, contrast, dates, dedupe, tokens, access helpers), brand fences
  (forbidden strings, no-physical-promises, no-sticker-marks), and geometry
  contracts (press sheet at physical size).
- **Playwright** for e2e, plus visual regression on theme packs.
- **axe-core** accessibility testing — a persona-driven accessibility sprint
  brought all routes to zero serious/critical violations, deepened text
  tokens for AA contrast, and verified 125%/150% zoom.
- **Persona testing** — six personas (engaged couple, 20-year-old birthday
  host, 60-year-old anniversary couple, bachelorette maid of honor, memorial
  planner, quinceañera dad) walked the real product across
  phone/tablet/desktop; the resulting 11 evidence-anchored findings were each
  executed as a sprint.
- **CI** gates the test suite on every PR.
- Full-repo ESLint runs clean (0 errors, 0 warnings), with React Compiler
  lint rules active.

*Note: the suite could not be executed during this audit — dependencies are
not installed in the audit container. Counts above are from file inventory;
the last recorded full-suite result in the repo's own docs is 1,269–1,278
passing.*

## 10 · What has been deliberately deleted

Worth stating, because it shows the codebase has been actively pruned rather
than only accreted. Roughly **105,000+ lines** removed across several passes:

- Three prior site renderers (one of them 10,324 lines).
- An entire AI "vibeSkin" design-generation layer and a multi-pass AI story
  pipeline, after a production check confirmed zero rows used them.
- The V1 marketing tree, an orphaned preview surface, ~40 zero-importer lib
  modules, and the shadcn UI kit remainder.
- **Pearloom Print** — the paid physical print-and-mail service (Lob
  integration, checkout, fulfillment, order dashboard) — retired end-to-end as
  a product decision, with a fence test now guarding against the copy coming
  back.
- 13 orphaned manifest fields that were written but never read.

A deleted-architecture ledger is maintained so future sessions don't
resurrect things.

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

- **The hand-authored product CSS is ~8,400 lines**, carrying per-kit and
  per-texture CSS plus sediment from deleted surfaces. A dead-selector audit
  is overdue.
- **The manifest is a large weakly-typed document.** Historical fields, mixed
  naming, and unsafe casts still appear. There is no schema validation on
  write.
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
- **Known live bug:** the locale-apply helper reads `manifest.faq`, but the
  field is `manifest.faqs`, so FAQ translations never render. Confirmed still
  present. One-line fix.

### 12.4 Operational

- **Email deliverability is unfinished** — SPF, DKIM, DMARC, and a dedicated
  bulk sending subdomain are outstanding owner actions. Without them,
  invitations land in spam, which breaks the product's core loop.
- **A CAN-SPAM postal address placeholder** is still in the email footer.
- **No staging environment**, and no completed error baseline period — both
  gates the repo's own testing plan set before recruiting users.

### 12.5 Documentation drift

The repo's internal docs are unusually thorough but have drifted from the
code in at least three places: the monetization doc still documents the
deleted physical-print product as live; the product doc says 28 occasions
where the registry has 31; the design doc says 6 themes and "48 variants
across 9 sections" where there are 10 and 116 across 32.

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

# PART II — REVIEW #1 (first independent reviewer, verbatim substance)

> The following is the first outside review of Part I, preserved in full.
> Part III annotates it against the codebase.

## The blunt read

Pearloom does not have an innovation problem. It has a focus, packaging, and
distribution problem.

You've built something closer to an operating system for celebrations, but
the market will initially evaluate it as a wedding website builder. That puts
Pearloom beside products offering websites, guest lists, RSVPs, registries,
and planning tools for free. Zola, Joy, The Knot, and Minted all provide
substantial free wedding-site functionality, so "we have more features" will
not create a mass migration by itself.

Meanwhile, Partiful has shown what explosive event-product growth looks like:
extremely fast creation, invitations sent through channels people already use,
no guest account requirement, social interaction on the event page, and
constant exposure to future hosts. Its monthly active users are reportedly in
the millions.

Pearloom currently has a dramatically better destination, but Partiful has a
better doorway. That is what I would fix.

## The position Pearloom should own

Stop leading with *"Beautiful websites for weddings and life's big days —
plus everything to run them."* That is accurate, but broad and
feature-oriented. Position Pearloom as:

**The guest experience for your entire celebration** — or, for the
wedding-focused launch: **Your whole wedding, beautifully connected.**

Pearloom is not primarily a prettier Zola, another planning dashboard, an AI
wedding planner, a marketplace, or a website builder. It is the place where
every event, guest, message, plan, personal detail, day-of update, photo, and
memory stays connected.

Incumbents already own recognizable categories: The Knot owns planning
content and vendor discovery; Zola owns registry commerce and the all-in-one
pitch; Minted owns matching stationery; Joy owns generous free planning;
Partiful owns casual, frictionless, social invitations. Pearloom can own the
**personalized celebration layer**: every guest receives a living, personal
version of the event rather than visiting a generic information page.

The guest passport is not just another feature. It should become the center
of the company.

## The biggest structural move: make "Celebration" the product

The open question about event grouping is actually the key to the whole
strategy. **Do not sell sites.** Create a first-class Celebration object.

A wedding celebration might contain: engagement party, bridal shower,
bachelor/ette, welcome party, ceremony and reception, after-party, farewell
brunch. These can still have independent pages, hosts, guest subsets,
designs, and URLs. But to the customer, they are **one celebration** with:

- One shared people directory
- One design system
- One master schedule
- One communications layer
- One media library
- One guest passport
- Multiple event-specific RSVPs
- Multiple hosts and permissions

This immediately solves several audit problems: pricing becomes per
celebration; the maid of honor becomes a first-class user; bridal-party
events become acquisition channels; hosts invite collaborators earlier;
guests encounter Pearloom multiple times; the "wedding weekend" product
becomes much stronger; the 31-occasion architecture remains useful without
being visible as complexity.

Internally, Pearloom can still create multiple manifests. Externally, the
customer has bought and created one celebration.

## The free product needs to be dangerously good

You cannot compete for mass adoption with a $19 entry point when the
recognizable alternatives are free. The free version should not feel like a
trial — it should create the network.

**Free: Pearloom Page.** One active celebration, a genuinely beautiful
website, core RSVP and guest management, ~100 guests, email and link
invitations, basic guest passports, basic schedule/travel/FAQ/gallery/
registry links, several of the best themes, a Pearloom subdomain, and a
permanent lightweight archive. **Do not hide all the good-looking themes.**
Design is the acquisition mechanism; a mediocre free Pearloom site actively
hurts you.

**Paid: Pearloom Celebration Pass** (~$79–$99 one-time per celebration).
Multiple linked events, multiple hosts with granular permissions, up to 500
guests, custom domain for the active event period, every standard theme and
Edition, full Studio, personalized guest passports, seating, advanced
messages and broadcasts, AI concierge, advanced RSVPs, guest upload
moderation, planning tools, branding removal, higher photo and AI limits.

**Paid: Pearloom Keepsake** (~$149–$249 one-time). The expensive,
ongoing-cost features: full-resolution long-term media, memory book,
post-event film, voice recordings, time capsule, downloadable archive,
anniversary resurfacing, premium printed-file exports. After perhaps two
years, the basic site remains online indefinitely, while maintaining the
custom domain and full-resolution media becomes an optional archive plan
(~$19–$29/year). That preserves the honest promise — planning Pearloom is not
a subscription — while avoiding a promise of unlimited AI, storage, video
rendering, and hosting forever for $19.

**What not to gate:** attractive themes, basic RSVP, basic guest lists, a
usable website, standard photos, memorial functionality. Those are table
stakes. **Gate coordination, personalization, collaboration, communication,
and preservation.**

## The mass-onboarding product

Pearloom needs a creation experience that feels borderline magical before
anyone sees the dashboard.

**"Press my celebration."** The first screen should require almost nothing —
*What are you celebrating?* — then allow the user to provide information in
whichever form they already have: paste an existing The Knot / Zola / Joy /
Minted / Squarespace wedding-site URL; upload a save-the-date; upload
invitation screenshots; paste a text message; paste notes from a planner;
connect a calendar; or answer four basic questions manually. Pearloom
extracts names, dates, locations, schedule, dress code, accommodations,
registry links, visual style, and event hierarchy — then produces a complete
preview immediately. **Do not require account creation until the user clicks
Keep editing or Publish.** The current nine-step wizard is thoughtful, but
mass onboarding needs an alternate route that feels like: *Give us what you
already have. We'll make it beautiful.* The wizard remains the guided path.

**The switching weapon: Pearloom Makeover.** A public tool — *Paste your
current wedding website. See it reimagined by Pearloom.* It generates a
non-published visual preview from the couple's existing public content. This
could be the strongest social acquisition mechanic: before-and-after videos,
TikTok transformations, Pinterest assets, planner demonstrations, influencer
wedding makeovers, "roast my wedding website" content, one-click migration.
Many couples will have already started with an incumbent; switching must feel
easier than staying.

## Turn the guest passport into the growth engine

The passport should not be buried at a token URL. It should be presented as
the reason to choose Pearloom.

**Before the event:** a guest receives a personalized link by text or email —
*"Scott, you're invited to celebrate Alex and Jamie."* They RSVP without an
account, see only the events they're invited to, save a personal itinerary,
see travel info, submit dietary restrictions, ask logistical questions, add
to calendar, add a pass to their mobile wallet, and contact the host without
hunting for a phone number.

**As the event approaches**, the passport evolves: shuttle time appears,
hotel instructions become prominent, weather notes appear, seat and table
information unlocks when the host chooses, last-minute announcements appear,
the schedule changes live. A dynamic **Pearloom Pass** for Apple/Google
Wallet — personal schedule, location, seat, QR, contact info, updates, no app
install — would be a powerful extension.

**During the event**, the passport becomes interactive: upload photos,
request songs, record a toast, sign the guestbook, view the run of show, find
their seat, see transportation instructions.

**After the event**, it becomes a personalized recap — *"You celebrated with
84 people. You appeared in 23 photos. Here are the messages and memories you
contributed."* — then: *"Planning something of your own? Start with this
celebration's style."* **This is where the next host is born.** Weddings are
episodic; the product has to transfer from one couple to the next before the
original couple churns, and the passport gives far more transfer
opportunities than a footer logo.

**Referral reward:** when a guest starts their own celebration, the new host
gets a premium Edition or domain credit; the original host gets a Keepsake
upgrade, storage, or film credit. Reward the emotional product, not generic
account credits.

## One envelope-pushing feature I would place a major bet on

**The Pearloom Concierge Number.** Every celebration receives a phone number
or messaging identity guests can text: *"What time is the shuttle?" "Can I
bring my child?" "Where do I park?" "What should I wear?" "I need to change
my meal."* The assistant responds only from host-approved event information
and the guest's invitation permissions. When confidence is low, it escalates
to the host instead of inventing an answer.

Why this is big: guests need no app; hosts stop answering the same questions
repeatedly; older guests can use it; it makes the AI materially useful
instead of decorative; every interaction reinforces Pearloom. Digital
invitations are increasingly moving through text, and products like Partiful
have normalized text-based event coordination. Pearloom should not try to
beat Partiful at being louder or more social — it should beat it at being
personal, beautiful, and genuinely helpful.

## What I would cut from the main experience

Not necessarily delete — remove from navigation and product storytelling
until behavior proves they deserve to return: Circle, person threads, cost
splitter, standalone voice DNA / cadence / AI director destinations, the
Theme Store as a major destination, vendor marketplace, registry ledger,
speech composer, QR posters, post-event film controls, general social pages.

The capabilities can appear contextually: "improve this in my voice" invokes
Voice DNA; "write my toast" opens the speech composer; "remind pending
guests" invokes cadence; "create a recap" invokes film rendering; "split this
Airbnb" reveals the splitter. **The user should not need to understand your
architecture to benefit from it.**

Reduce the visible application to three areas — **Create** (website, events,
design, invitations), **Guests** (list, RSVPs, messages, seating, passports),
**Plan & Remember** (planning tools before; gallery and keepsakes after). The
interface can change with the phase spine, but the mental model should remain
stable. Right now Pearloom risks feeling like someone opened thirty
incredibly nice drawers in front of the customer and asked them to choose
where to begin.

## Weddings first, breadth second

Keep all 31 occasions in the platform. **Do not market all 31 equally at
launch.** Roughly two million U.S. couples married in 2025 at an average cost
around $34,000 — more than enough market for an initial wedge, and Gen Z
couples are highly visual and focused on personal storytelling.

Publicly focus on: (1) weddings and wedding weekends; (2) showers,
bachelor/ette events, and welcome parties that attach to weddings; (3)
memorials through a separate, respectful acquisition path. Do not put
weddings, birthdays, quinceañeras, funerals, reunions, baptisms, and
retirement parties in the same hero — it makes the product sound generic even
though the implementation is not. The registry should drive hidden product
specialization and long-tail landing pages, not the initial positioning.
Once the growth loop works for weddings, other occasions become distinct
campaigns with their own language and demos.

## The fastest practical go-to-market channels

**1. Wedding planners as the distribution layer.** Don't build a giant vendor
marketplace first — The Knot's vendor scale is not worth attacking head-on.
Instead, give planners a free professional product — **Pearloom for
Planners**: unlimited client drafts, reusable templates, duplicate a proven
celebration structure, client handoff, planner-as-administrator, guest-list
import, vendor call sheets, white-label preview links, shared task/approval
flow, referral revenue, portfolio pages. A planner running 15 weddings a year
is more valuable than 15 individually acquired couples. Start with 20–30
planners in one market and personally onboard them.

**2. Own the bridal-party ecosystem.** The maid of honor is underserved.
Create free, extremely easy products for showers, bachelor/ette weekends,
welcome parties, rehearsal dinners, brunches. At creation, ask: *"Is this
part of a larger celebration?"* — letting the organizer invite the couple to
claim the master celebration. **This reverses the acquisition direction:**
Pearloom doesn't have to find the engaged couple first.

**3. Partner with photographers.** They own the content that makes the
after-event product valuable: guest-upload QR, automatic photo collection,
client gallery handoff, memory-book draft, recap page, referral commission,
portfolio exposure. A photographer introducing Pearloom after the wedding is
too late for planning revenue but creates the Keepsake sale and exposes every
guest.

**4. Make transformations the content strategy.** Don't post generic
planning articles against The Knot's content machine. Create visual proof:
"We redesigned a real wedding site in 45 seconds." "Three versions of the
same black-tie wedding." "What your guests see versus what you see." "Your
Zola website, reimagined." The product itself should manufacture the content.

**5. Launch through a concentrated ecosystem.** Pick one geographic or
cultural cluster (e.g. South Florida weddings, NY/CT weddings, destination
weddings, design-forward nontraditional weddings). Recruit planners,
photographers, venues, and 50–100 real couples in the same ecosystem —
concentration makes referrals and examples compound.

## Design is an advantage, not yet a moat

The taste thesis is strong, but design alone will not be defensible — Minted,
Joy, and Zola all market large design libraries. Pearloom's defensibility
should become the combination of: **taste** (looks better) + **celebration
structure** (related events function as one) + **guest personalization**
(every guest gets a different experience) + **distribution** (guests,
planners, and bridal-party members create the next celebrations) + **memory
continuity** (event information becomes a lasting artifact) + **operational
intelligence** (Pearloom knows who needs what, when) + a **proprietary event
graph** built through consent and repeated real-world relationships.

Taste gets someone to try it. The personalized guest experience gets them to
talk about it. The celebration graph makes it increasingly difficult to
replace.

## What must be fixed before pushing growth

Do not send large numbers of real invitations until these are done:

1. **Email deliverability** — SPF, DKIM, DMARC, dedicated sending subdomain,
   bounce handling, and the actual CAN-SPAM mailing address. A gorgeous
   invitation in spam is a broken product.
2. **Entitlements and honest pricing** — one centralized entitlement system
   before selling anything; do not scatter plan checks through 238 routes.
   The pricing page and product must agree exactly.
3. **Ownership security harness** — a parameterized test attempting
   unauthenticated mutation, wrong-user mutation, wrong-site mutation,
   expired guest-token access, and cross-event guest access, run across every
   mutating route.
4. **Production-auth-bypass test** — prove the E2E provider cannot activate
   under production build conditions, as a CI invariant.
5. **Route exposure and rate-limit audit** — classify every route (public /
   guest-token / session / webhook / cron / admin) and test the
   classification.
6. **Manifest schema validation and versioning** — runtime validation on
   writes and explicit manifest versions with migrations. The manifest is too
   central to remain weakly typed at the boundary.
7. **Staging and critical-path e2e** — not hundreds of tests, but ruthless
   coverage of: account creation, celebration creation, save/reload, guest
   import, invitation send, guest RSVP, publish and privacy, payment and
   entitlement, post-event transition, account deletion. And fix the
   `faq`/`faqs` localization bug immediately.

## A 90-day attack plan

**Days 1–20 — make the foundation launchable:** deliverability + footer
compliance; the FAQ translation bug; entitlement enforcement; manifest
validation; route auth/rate-limit audit; staging; critical-path e2e; full
activation-funnel instrumentation; collapse the visible navigation. No
additional dashboard destinations.

**Days 21–50 — build the growth-shaped product:** make Celebration the
customer-facing unit; linked events + shared people; co-host invitation in
onboarding; the paste/upload instant-creation route; preview before signup;
launch the free Pearloom Page; upgrade the passport presentation; add
host-controlled guest-to-host referrals; start the makeover tool; first
version of Pearloom Pass (wallet).

**Days 51–75 — create distribution:** onboard 20 planners and 10
photographers; recruit 50 real wedding celebrations; concierge onboarding;
transformation content from consenting users; bridal shower and bachelor/ette
entry pages; trackable referral links for every professional; measure where
guests become future hosts.

**Days 76–90 — launch the monetization test:** two simple packages — free
Pearloom Page and a $79 or $99 Celebration Pass. Do not test three
complicated tiers, 75 à-la-carte packs, and multiple site allowances
simultaneously. Keep the Keepsake offer post-event, where its emotional value
is highest.

## The metrics that matter

North star: **activated celebrations with real guest participation** — a
celebration that is published, has 10–20+ guests, at least one invitation
sent, and at least one guest response. Then watch: time to first published
preview; creation completion rate; % importing 10+ guests; % inviting a
co-host; % sending invitations within 24 hours; invite open rate; RSVP
completion rate; passport usage; guest contribution rates; guest→host
conversion; activated free→paid conversion; planner-created celebrations per
month; support requests per activated celebration; cost per active
celebration (email, storage, AI).

Reasonable internal launch goals: first attractive preview in under 60
seconds; publish possible in under five minutes; more than half of published
hosts add real guests; at least 40% send an invitation within 24 hours;
several percent of participating guests eventually start a celebration. The
exact numbers matter less than making the funnel visible.

## The strongest recommendation

Build Pearloom around this sentence: **Create one beautiful celebration.
Pearloom gives every guest exactly what they need, carries everyone through
the day, and keeps what happened afterward.**

The initial product should feel like four things: (1) give Pearloom whatever
information you already have; (2) receive an incredible celebration
instantly; (3) invite people without making them download anything; (4)
watch each guest receive a personal experience.

The massive opportunity is not becoming The Knot with prettier CSS and more
AI routes. It is turning the static wedding website into a living,
personalized layer around the real-world event — and ensuring every guest who
touches it becomes a possible next host.

---

# PART III — ANNOTATIONS ON REVIEW #1 (from the codebase)

Fact-checks so the next reviewer calibrates correctly — Review #1 could not
see the code, and in several places it under- or over-estimates what exists.

## Where the ground is already prepared (Review #1 underestimated)

- **The Celebration object is half-built.** A first-class `celebrations`
  table exists (backfilled, with foreign keys and sync), plus sibling-site
  linking, a "linked events" strip on published sites, a weekend-arcs model
  (anchor + satellite events), cross-event unified headcount, and a deduped
  shared guest roster (currently read-only). What's missing is exactly what
  Review #1 identifies: it is an internal linking layer, not the
  customer-facing unit, the pricing unit, or the onboarding unit. The
  shared-roster *write-back* ("add this person to the other events") is a
  named, deliberate follow-up in the internal backlog.
- **Text invitations exist** — an SMS invite route and migration are live.
- **The concierge exists in web form.** The guest AI chat already answers
  logistics questions ("where do I park?", "is the hotel pet-friendly?")
  grounded in the site's real manifest data, and is mounted on both the
  public site and the passport. The genuinely new part of the "Concierge
  Number" bet is the **SMS channel**; even there, an SMS drafting route and
  Twilio-adjacent plumbing exist as seeds.
- **The makeover/extraction machinery is partially built.** An SSRF-guarded
  URL fetcher (used for registry add-by-URL) and AI extraction routes exist.
  Pointing that machinery at an incumbent wedding-site URL to press a preview
  is a scoped project, not a moonshot.
- **The wallet pass is already a named deferral** in the internal plan —
  blocked on an Apple Pass Type ID certificate (an owner action, not code).
- **Much of the de-promotion is already done.** Cadence, director, review,
  and voice are already on a "quiet shelf" out of primary nav; the nav was
  previously cut from 22 destinations to 10; and the contextual-invocation
  pattern Review #1 describes is how the editor's AI copilot already works.
  The genuinely new de-promotions on its list are Circle/person-threads and
  the registry ledger.
- **Preview-before-signup partially exists** — the signed-out wizard flow
  presses a real preview and preserves state through signup (`?next`
  forwarding), and `/demo/{occasion}` offers walkable demo worlds. What
  doesn't exist is the "paste what you already have" alternate entrance.
- **Wizard speed is not the gap.** Site generation is already instant
  (~1 second, no AI call). The doorway problem Review #1 identifies is real,
  but it is about the *number of questions before first preview*, not
  generation time.
- **The guest→host loop has a first version** — every passport carries a
  "host your own" conversion CTA. What's missing is the post-event
  personalized recap framing and any referral reward.

## Where Review #1 conflicts with documented decisions (decide, don't drift)

- **"Don't gate attractive themes" vs. the store economics.** The internal
  monetization doc's entire model is the à-la-carte decoy: 75 packs where
  the free shelf is deliberately "good enough to publish proudly, generic
  enough to make a host browse the paid shelves." Review #1 says design must
  not be the paywall because every free site is marketing. Both cannot fully
  hold. This is the one place Review #1 requires *abandoning* a documented
  decision rather than executing an open question.
- **The $79–99 price point is asserted, not derived.** Plausible (it prices
  against stationery spend, not against free competitors), but no
  willingness-to-pay evidence exists on either side.
- **The archive plan (~$19–29/yr) brushes against the "not a subscription"
  marketing promise.** Review #1 threads the needle ("planning Pearloom is
  not a subscription"); whether that framing survives a pricing page is
  untested.

## Where Review #1 is genuinely novel (no prior art in the repo)

- **Pearloom for Planners** — the co-host system exists but has no
  professional framing, no client-draft model, no templates-across-clients,
  no referral mechanics. This is the only suggestion that changes the
  acquisition *math* (1 planner ≈ 15 celebrations/year) rather than funnel
  polish.
- **The photographer channel** and the Keepsake-after-the-fact sale.
- **The concentrated-geography launch.**
- **The reverse-acquisition flow** ("Is this part of a larger celebration?"
  → the shower organizer invites the couple to claim the master
  celebration).
- **The public Makeover tool** as a content engine.

## Consensus check

Review #1's "fix before growth" list matches the audit's §12 and the repo's
own internal backlog nearly one-for-one (deliverability, CAN-SPAM address,
entitlement enforcement, ownership harness, auth-bypass test, route
classification, manifest validation, staging, critical-path e2e, the
`faq`/`faqs` bug). Three independent sources now agree on the launch-blocker
set; treat it as settled.

---

# PART IV — QUESTIONS FOR YOU (the next reviewer)

You have the audit (Part I), one prior review (Part II), and the fact-checks
(Part III). The most valuable response engages with all three — agreement
with Review #1 is as useful as fresh ideas, **if you say why**; dissent is
more useful still.

1. **The Celebration pivot.** Review #1's central move is making
   "Celebration" the customer-facing and pricing unit. Do you agree? If yes,
   what does it break that neither document has considered (URLs, SEO,
   permissions, the memorial case — a memorial is not a "celebration" with
   satellite events)? If no, what's the better unit?
2. **Pricing.** Review #1 proposes free Page / ~$89 Celebration Pass /
   ~$149–249 Keepsake, gutting the current $19/$129 ladder and the 75-pack
   à-la-carte store. Stress-test this: is the theme store worth keeping as a
   revenue line, or is Review #1 right that design must be free because it's
   the marketing? What would you charge, on what unit, and what specifically
   would you gate?
3. **The doorway.** Rank Review #1's onboarding bets — the paste/upload
   instant-creation route, the public Makeover tool, no-signup preview — by
   expected impact per unit of effort, knowing (Part III) that extraction
   machinery partially exists. What onboarding idea did Review #1 miss?
4. **The Concierge Number.** Review #1's biggest single feature bet is an
   SMS concierge per celebration. Given that the web-chat concierge already
   exists and the new part is the channel: is this the right bet, or is
   there a higher-leverage use of the same AI capability?
5. **Distribution.** Review #1 leads with wedding planners, then
   photographers, then bridal-party reverse-acquisition, then transformation
   content, then a concentrated geographic launch. Re-rank these, kill any,
   and add what's missing.
6. **The cut list.** Review #1 would de-promote Circle, person threads, the
   cost splitter, the vendor marketplace, the registry ledger, and more.
   Anything on that list you would keep promoted — or anything it spared
   that you would cut entirely (not just hide)?
7. **The moat.** Both documents claim the durable moat is the combination of
   taste + celebration structure + guest personalization + the consent-based
   event graph. Attack this: what's the strongest version of the argument
   that Pearloom has no moat, and what would you build to answer it?
8. **What both missed.** What does a product in this category need that
   appears in neither the audit nor Review #1?

---

*Compiled 2026-08-04. Part I is measured from the source tree; Part II is an
independent external review; Part III reconciles the two against the code.*
