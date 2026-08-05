# Pearloom — Review Synthesis & Decision Document

> **What this is.** Three independent AI reviews (ChatGPT = Review #1,
> Grok = Review #2, Gemini = Review #3) evaluated the platform audit
> (`docs/PLATFORM-REVIEW-PACKET.md`). This document reduces them to what
> matters: where all three agree (treat as settled), where they conflict
> (owner decisions, framed with a recommendation), what each reviewer
> uniquely contributed, and what everything costs against the actual
> codebase. Compiled 2026-08-04.
>
> Shorthand: **R1** = ChatGPT, **R2** = Grok, **R3** = Gemini.

---

## 1 · Unanimous consensus — treat as settled

Five independent sources now agree on most of this (three reviews, the
audit, and the repo's own backlog). Re-litigating any of it should require
new evidence, not new opinions.

### 1.1 The foundation list blocks everything (R1 + R2 + R3 + audit + backlog)

Do first, in this order, before any growth push:

1. Email deliverability — SPF/DKIM/DMARC + dedicated sending subdomain
   (owner action) + the CAN-SPAM address placeholder.
2. The `faq`/`faqs` localization bug (one line).
3. Centralized entitlement enforcement — `requirePlan` wired through one
   choke point, not scattered across 238 routes; pricing page and product
   must agree exactly.
4. Route classification audit (public / guest-token / session / webhook /
   cron / admin) + rate-limit coverage.
5. Ownership/RLS test harness — parameterized wrong-owner→403 across every
   mutating route.
6. CI proof that the E2E auth-bypass provider is inert in production.
7. Manifest schema validation on write + explicit versioning.
8. Staging environment + critical-path e2e (account → create → invite →
   RSVP → publish → pay → delete).

### 1.2 The container becomes the product (R1 + R2 + R3)

Stop selling sites. One master event + linked satellite events, with one
shared people directory, one design system, one communications layer, one
passport per guest scoped to their invitations, co-hosts as first-class.
Pricing attaches to the container. All three reviewers independently
endorsed this; R2 and R3 both confirmed it survives their stress-tests.
The codebase is half-way there (celebrations table, weekend arcs, sibling
linking, shared roster read-only) — this is a product/pricing/onboarding
reframe, not a rewrite.

### 1.3 Design must be free; the à-la-carte store dies as a strategy (R1 + R2 + R3)

All three, independently: gating themes sabotages the acquisition loop,
because every published free site is the marketing. Gate **operational
power** (multi-event linking, co-hosts, guest volume, custom domain,
concierge, media limits, preservation) — never visual quality. This
overturns `MONETIZATION.md`'s decoy-economics model. R2: kill the shelf as
a revenue line, maybe keep a small signature shelf as pure upsell. R3:
kill it entirely — 75 packs is UI complexity for marginal revenue.

### 1.4 The pricing shape (R1 + R2 + R3, converged independently)

- **Free** ("Pearloom Page"): one event, ~100 guests, genuinely beautiful
  (all or nearly all standard themes), core RSVP + passport, subdomain,
  permanent lightweight archive. Memorials free forever.
- **Paid** (~**$89 one-time** per container — R1 said $79–99, R2 agreed,
  R3 said $89): unlimited/multiple linked events, co-hosts, 500 guests,
  custom domain, full Studio, concierge, advanced passport, seating,
  broadcasts, higher limits.
- **Post-event Keepsake/archive**: one-time ($149–249) and/or a small
  annual archive fee ($19–29) after ~2 years, **only** for high-cost
  assets (full-res media, custom domain, active AI). Framed as
  "preservation, not planning" so the "not a subscription" promise
  survives — all three landed on this same framing.

### 1.5 The doorway (R1 + R2 + R3)

- Paste/upload instant creation ("give us what you already have") — ranked
  #1 or #2 by all three; extraction machinery partially exists.
- No-signup preview, auth only at save/publish — R3 ranked this #1 on
  effort grounds since generation is already ~1s; the gap is
  questions-before-value, not speed.
- The public Makeover tool ("your Zola site, reimagined") — all three keep
  it, all three rank it as content/marketing engine rather than core
  onboarding.
- The nine-step wizard survives as the guided path; it stops being the
  only door.

### 1.6 The passport is the growth engine (R1 + R2 + R3)

Elevate it from a token URL to the product's center: personalized
pre-event → live during → **personalized post-event recap** ("you
celebrated with 84 people, you appeared in 23 photos") → "host your own"
with a real referral reward (Edition/domain credit for the new host,
Keepsake upgrade for the original). All three name **guest→host
conversion** as the metric to instrument relentlessly. Wallet pass
(Apple/Google) endorsed by all three — already a named deferral blocked
on the Apple cert (owner action).

### 1.7 The text-channel concierge is the right bet (R1 + R2 + R3)

All three endorse it, all three note the web concierge already exists and
the channel is the new part. R3's amendment (see §2.5) is about *which*
channel. Meter it through the paid tier.

### 1.8 Weddings first, breadth hidden (R1 + R2 + R3)

Market weddings + attached satellite events, memorials via a separate
respectful path. Keep all 31 occasions in the registry; drop the
31-occasion grid from the hero. Concentrated geographic launch as a
forcing function (South Florida / NY tri-state named twice).

### 1.9 The de-promotion instinct is right (R1 + R2 + R3)

> **SHIPPED 2026-08-05.** The sidebar now carries Create / Guests /
> Plan & Remember (was six groups, eighteen rows). Music, Circle,
> Analytics, Passport cards and QR poster moved to the quiet shelf;
> Registry to the Guests sub-nav; The Reel and Speeches to the
> Studio sub-nav. "Hide, don't delete" is enforced by
> `nav-reachability.test.ts`, which freezes the pre-collapse
> destination list. Found while doing it: `/dashboard/tools` — the
> shelf's own grid — had no link anywhere in the product; it does
> now.

Three visible areas — **Create / Guests / Plan & Remember** — over the
phase spine; everything else contextual. Circle, person threads, cost
splitter, standalone voice-DNA/cadence/director, vendor marketplace, and
the Theme Store destination all leave primary nav and storytelling
(much of this is already on the quiet shelf). Hide, don't delete.

### 1.10 North-star metric (R1, endorsed by R2 + R3)

**Activated celebrations with real guest participation** — published +
10–20 guests + ≥1 invitation sent + ≥1 guest response. Not accounts, not
sites, not AI calls.

---

## 2 · Conflicts — decisions for the owner

Each framed with the split and my recommendation, grounded in the code.

### 2.1 What to call the container

- **Split:** R1 says "Celebration" throughout. R2 and R3 both flag that
  labeling a memorial a "Celebration" is a tone failure; R3 calls it a
  severe brand break and suggests a neutral container term.
- **Recommendation:** R2/R3 are right, and the codebase already agrees —
  the occasion registry's `voice` field and the solemn-copy machinery
  exist precisely to avoid this. Make the container's *label*
  occasion-aware (Celebration / Gathering / Remembrance) the same way the
  cockpit header already resolves "In loving memory" for solemn voices.
  Internal name: whatever's stable. Customer-facing: derived from the
  registry, never hardcoded. Cost: near zero — this is the existing
  pattern applied once more.

### 2.2 Theme store: kill or keep a signature shelf

- **Split:** R3 kills all 75 packs outright. R2 kills the à-la-carte line
  but keeps a small signature shelf as pure upsell. R1 keeps a residual
  premium/signature distinction inside tiers.
- **Recommendation:** R2's middle path. Fold everything standard into
  free/paid tiers; keep ~8–12 signature packs (the foil/dark treatments,
  exclusive kits, licensed display faces) as a small paid-tier-plus
  shelf. Rationale: the packs are built and tested; deleting 75 products
  outright forfeits optionality for zero gain, while the *decoy
  economics* — the actual thing all three object to — dies either way.
  The work is repricing and re-shelving, not deletion.

### 2.3 Photographers as a channel

- **Split:** R1 ranks photographers as channel #3. R2 demotes to #4
  ("later"). R3 kills/defers entirely ("too busy to evangelize; shift
  photo collection to the passport loop").
- **Recommendation:** Defer per R3, with one cheap exception: the
  guest-upload QR + gallery handoff pieces already exist (QR posters,
  guest photos with attribution, The Reel), so leaving a photographer
  *referral link* on those surfaces costs nothing. No dedicated
  photographer product until planners + reverse-acquisition are proven.

### 2.4 Speech composer and registry ledger: hide or keep promoted

- **Split:** R1 and R2 de-promote both. R3 dissents on both: the speech
  composer is a killer feature *for the non-host* (best man, maid of
  honor — high-anxiety task, viral entry point), and the registry summary
  must stay front-and-center for gift tracking.
- **Recommendation:** Split the difference by audience. R3 is right that
  the speech composer's natural user is the bridal party — so it belongs
  promoted on the *guest passport / satellite-event* side (where it's an
  acquisition hook), quiet on the host dashboard. The registry ledger
  stays in the Money hub (it's operational — hosts genuinely track
  gifts/thank-yous there; the thank-you loop is one of the product's
  closed loops) but doesn't need top-level nav promotion.

### 2.5 SMS vs WhatsApp for the concierge

- **Split:** R1 and R2 say SMS. R3 says WhatsApp first — international +
  culturally diverse events (quinceañera, South Asian weddings, South
  Florida generally) run on WhatsApp, and SMS has carrier fees and
  formatting limits.
- **Recommendation:** Sequence, don't choose. The Twilio integration
  exists today (`lib/sms.ts`) and Twilio *is also* a WhatsApp Business
  API provider — same vendor, second channel. Ship SMS first (US wedding
  wedge, zero new vendor), add WhatsApp templates when the concentrated
  launch market or the quinceañera/cultural campaigns demand it. R3's
  point stands as a sequencing input, not a replacement.

### 2.6 How aggressively to collapse the wizard

- **Split:** R3 wants a 2-question entry ("what are you celebrating?" +
  names/date) landing directly in the editor with local state. R1/R2 keep
  the full wizard as the guided path beside the paste route.
- **Recommendation:** Both. The paste/upload route and a 2-question
  express path can share the same finish wiring (the wizard's manifest
  assembly is already client-side and modular — `applyWizardLook`,
  `seedSectionsFromWizard`, section picks all compose). The full wizard
  stays for hosts who want guidance; the persona work showed those hosts
  exist. What must change everywhere: **auth moves to save/publish**, not
  entry — the signed-out flow already preserves state through signup, so
  this is extending an existing pattern, not new plumbing.

---

## 3 · Unique contributions worth adopting

Ideas appearing in only one review that survive contact with the code.

**From R2 (Grok):**

- **Voice-note / "text me the details" host intake** — pairs the existing
  transcription route (`voice-dna/transcribe`) with wizard extraction;
  directly serves the tested 60-year-old and quinceañera-dad personas.
- **Venue partnerships** as a distribution channel neither other review
  named — venues already push couples toward websites.
- **Instrument the wow moments** — SHIPPED 2026-08-05. `arrival_seen` /
  `arrival_opened` (with `via: tap | auto | key`, because an envelope
  that opens on its own 4.2s timer says nothing about whether the
  theatre landed), `loom_seen` (with strand count — an empty loom and a
  full one are different experiences), and `press_sheet_opened` (with
  `via: toolbar | send-flow`). Measure before building more of them.
- **A human-backed support path for memorials** — free tier + solemn
  occasion + zero tolerance for automation failures implies a visible
  human escalation route. Neither code nor docs have this today.
- **Unit-economics model** for decade-lived free/memorial sites — a
  spreadsheet, not code, but nobody has built it.

**From R3 (Gemini):**

- **The "shedding problem" — per-satellite privacy scopes.** The single
  most important technical caveat any reviewer raised about the container
  pivot: the bachelor-party guest list must never leak to the
  mother-of-the-bride via the shared directory or passport. The codebase
  has the seed (the sibling-strip privacy fix already excludes
  bachelor/ette from public advertising), but container-level shared
  rosters make this a first-class design constraint, not a patch.
  **This must be in the container design doc from day one.**
- **The guest-list importer as a doorway.** Mostly built already —
  `/api/guests/import` does CSV with header-mapping, dedupe, and warnings.
  What's missing is promotion to a first-class onboarding step ("paste
  your messy spreadsheet") immediately after first preview, plus
  paste-freeform-text parsing on top of the existing CSV parser.
- **Day-of offline resilience.** `lib/offline.ts` already implements an
  IndexedDB queue + service-worker registration for editing on bad wifi —
  extend it to *read-side caching* of the run-of-show, call sheets, and
  seating for barns and beaches. Smaller lift than R3 assumed.
- **The Printable Event Briefcase.** One-click letter/A4 PDF — schedule,
  addresses, seating, venue map — for non-digital relatives. This is an
  *assembly* of existing pieces (press-sheet engine, QR posters, passport
  cards, vendor call sheets, PDF export route) and it deepens the
  print-at-home story that replaced Pearloom Print. High fit, modest
  cost.
- **Metered concierge units** in the paid tier (e.g. 500 interactions
  included) — answers the audit's unmodeled-AI-tail concern concretely.

**From R1 (ChatGPT), still unique after two challenges:**

- The **Makeover tool** as a manufactured-content engine (both later
  reviews kept it).
- **Pearloom for Planners** as a full professional product (both later
  reviews kept it top-2).
- The **referral reward design** — reward the emotional product (Keepsake
  upgrades, Edition credits), not generic account credits.

---

## 4 · Distribution — the merged ranking

R2 and R3 both moved reverse-acquisition above R1's planners-first. Final:

1. **Bridal-party reverse-acquisition** — free, frictionless satellite
   tools + "Is this part of a larger event?" → the organizer invites the
   couple to claim the container. The party finds the couple.
2. **Pearloom for Planners** — 20–30 planners, one market, personally
   onboarded; client drafts, reusable structures, handoff, referral.
3. **Transformation/Makeover content** — cheapest once the paste tool
   exists; the product manufactures its own proof.
4. **Concentrated geographic launch** — the forcing function wrapping 1–3.
5. **Venue partnerships** (R2's addition) — explore during the
   concentrated launch since venues are in the same rooms as planners.
6. **Photographers** — deferred (§2.3).

---

## 5 · What the consensus plan costs against the real codebase

| Move | Already built | The actual work |
|---|---|---|
| Container pivot | `celebrations` table + FK/sync, weekend arcs, sibling linking, read-only shared roster, role system | Shared-roster write-back, per-satellite privacy scopes (§3/R3), container-level pricing + onboarding UX, occasion-aware container naming |
| Free-tier design quality | 10 themes + 75 packs + free shelf all shipped | Re-shelving decision (§2.2), pricing-page rewrite |
| Entitlements | `plan-gate.ts` limits, server-enforced store grants, `requirePlan` (unused) | One choke point + callers; new tier definitions |
| Paste/upload doorway | SSRF-guarded fetcher, AI extraction routes, instant local manifest assembly | The extraction-to-manifest mapping + the public entry UI |
| No-signup preview | Signed-out wizard preserves state through signup; `/demo/{occasion}` | Move auth gate to save/publish universally; 2-question express path |
| Guest-import doorway | CSV import with header-map + dedupe + warnings (`/api/guests/import`) | Freeform-paste parsing; promote into onboarding |
| SMS concierge | Web concierge grounded in manifest; Twilio SMS lib; SMS invites | The inbound-message webhook + scoping to guest identity + escalation |
| WhatsApp | Nothing | Twilio WhatsApp channel + template approval (defer per §2.5) |
| Wallet pass | Named deferral | Apple Pass Type ID cert (owner), then the pass generator |
| Post-event recap + referral | Passport, contributions feed, "host your own" CTA, afterglow phase | The recap composition + reward mechanics |
| Day-of offline | IndexedDB queue + SW registration (`lib/offline.ts`), DayOf surface | Read-side caching of run-of-show/seating/call-sheets |
| Printable Briefcase | Press-sheet engine, QR posters, passport cards, call sheets, export-pdf route | One assembly surface |
| Nav collapse to 3 areas | Quiet shelf, phase spine, prior 22→10 cut | One more information-architecture pass |
| Makeover tool | Extraction machinery (partial) | Public page + screenshot/render pipeline + consent/legal check |
| Planner product | Co-host system, vendor call sheets | Client-draft model, cross-client templates, referral tracking, planner dashboard framing |

---

## 6 · The owner decision list

Only these genuinely require the owner; everything else is executable.

1. **Adopt the container as the pricing/product unit?** (All three
   reviews say yes; §2.1 naming resolved by the registry pattern.)
2. **Accept the pricing restructure** — $0 / ~$89 / Keepsake+archive —
   which abandons the documented $19/$129 ladder and decoy-store
   economics? This is the one place the reviews overturn a written
   decision rather than resolve an open one.
3. **Theme store disposition** — R2's small-signature-shelf compromise, or
   R3's full kill?
4. **The archive fee vs the "not a subscription" promise** — approve the
   "preservation, not planning" framing before any pricing page says it.
5. **Free-tier guest cap** — 100 (R1/R3) vs 150 (R2's range); and confirm
   `maxSites: 1` enforcement behavior at launch.
6. **Owner-action unblocks** — DNS records, CAN-SPAM address, Apple Pass
   cert, prod secrets. No code path exists around these.

---

## 7 · Merged execution sequence

Reconciling the three plans (R1's 90 days, R3's 60):

**Phase 0 — Foundation (blocks everything):** the §1.1 list. Nothing else
ships first. Includes the nav collapse to three areas (cheap, and every
later screenshot benefits).

**Phase 1 — The growth-shaped product:** container pivot with privacy
scopes designed in from day one; entitlements + new pricing live;
paste/upload + 2-question express doorway; auth moved to save/publish;
guest-import promoted into onboarding; passport presentation upgrade +
post-event recap + referral.

**Phase 2 — Channels:** SMS concierge on the existing Twilio plumbing;
bridal-party satellite entry pages with the claim flow; planner product
v1; Makeover tool; begin the concentrated-market recruiting (planners,
venues, 50–100 real celebrations).

**Phase 3 — Monetization test + depth:** the two-package test ($0/$89)
in-market; Keepsake offered post-event; wallet pass (after the cert);
WhatsApp channel if the launch market demands it; day-of offline
read-caching; Printable Briefcase.

Throughout: instrument the funnel from §1.10, the wow moments (R2), and
guest→host conversion above all.

---

*End of synthesis. Three reviews, one audit, and the internal backlog now
agree on the shape of the next two quarters; §6 is what's left to decide.*
