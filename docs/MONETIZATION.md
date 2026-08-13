# Pearloom monetization — restructured 2026-08-04

> The single source of truth for how Pearloom makes money. If a
> surface (pricing page, store, upgrade gate) contradicts this doc,
> one of them is wrong — fix it or amend this.
>
> **Supersedes the 2026-06-09 model** (Journal $0 / Atelier $19 /
> Legacy $129 with a 75-pack à-la-carte decoy store). That model was
> retired after three independent external reviews converged on the
> same finding — see `docs/REVIEW-SYNTHESIS.md` §1.3–§1.4.

---

## 1 · The model in one paragraph

Pearloom sells **one-time passes per celebration** — never a
subscription; that promise is load-bearing on the landing page. The
free tier is deliberately generous and **carries the whole standard
theme catalog**, because every published free site is the marketing.
What the ladder gates is **operational power**: coordination across
linked events, collaboration with co-hosts, communication volume,
guest scale, and long-term preservation. It never gates how good a
site looks.

## 2 · The ladder

| | **Page** | **Pass** | **Keepsake** |
|---|---|---|---|
| Price | $0 | **$89** one-time | **$199** one-time |
| Canonical plan id (`user_plans.plan`) | `free` | `pro` | `premium` |
| Marketing aliases accepted | `page`, `journal`¹ | `pass`, `atelier`¹ | `keepsake`, `legacy`¹ |
| Celebrations / sites | 2 | 10 | Unlimited |
| Guests | 100 | 500 | Unlimited |
| Photos | 50 | 500 | Unlimited |
| Drafts by Pear | 15 a month | Unlimited | Unlimited |
| Co-hosts | 1 | Unlimited | Unlimited |
| Theme catalog | **All standard packs** | + the signature shelf | + the signature shelf |
| Memorials | Always free on every tier (Pear's promise) | | |

¹ **Retired names, still honored.** `user_plans` was NOT migrated —
existing rows store `pro` / `premium` (and older aliases). Every
lookup is rank-based through `plan-gate.ts`, so an account that
bought "Atelier" at $19 automatically holds today's Pass
entitlements. Pinned by `entitlements-grants.test.ts`.

**What the ladder deliberately does NOT list** (corrected 2026-08-13,
M.7 — this table previously sold all of these):

- **The Studio, the Director, seating, budget, the vendor book, the
  memory book, archive export** — none of these has a plan gate;
  every account, free included, has all of them. A row here or a
  pricing-card line selling them is a fabrication until a gate
  exists. (Earlier revisions of this table sold "full Studio" and
  "memory book" as paid rows — a doc drift the 2026-08-13 audit
  pass caught, L36/L87.)
- **Custom domain** — RESERVED, not built, not sold on any tier
  (see the Enforcement table below).
- **Sites at 2, not 1, on Page** is deliberate
  (docs/DECISIONS-2026-08-04 §2 — the bridal-party reverse-
  acquisition loop needs a free host to add a second site).
- **Drafts by Pear** is the enforced monthly gate in
  `checkPearGate` (`src/lib/rate-limit.ts`, `PEAR_MONTHLY_LIMIT`),
  unlimited from Pass up. The old "AI generations 10 / 100 /
  Unlimited" row described numbers nothing enforced.

Source of truth for limits: `src/lib/plan-gate.ts` (`PLAN_LIMITS`).
Source of truth for prices: `src/lib/plan-gate.ts`
(`PLAN_PRICE_CENTS`, `ARCHIVE_RENEWAL_CENTS`) — the checkout route
imports them so the till and the gate cannot drift.
Source of truth for pack grants:
`src/lib/theme-store/entitlements.ts` → `planGrantedPackIds()`.
The agreement fence: `src/lib/pricing-agreement.test.ts` asserts
PLAN_LIMITS ⇄ the pricing page ⇄ this doc all carry the same
numbers — if you change one, the suite makes you change the others.

## 3 · Why design is free now

The old model made the theme shelf the paywall and used à-la-carte
pack prices as a decoy (two premium packs cost more than the plan).
All three external reviewers independently rejected it:

> *"A mediocre free Pearloom site actively hurts you."*

In a product whose growth loop runs through guests seeing a host's
site, a crippled free tier costs more in word-of-mouth than the
shelf ever earned. So:

- **55 of 75 packs are free to everyone** (the free + premium tiers).
- **20 signature packs** (foil/dark treatments, exclusive kits,
  licensed display faces) ride with the Pass — a small paid shelf
  that keeps the Pass feeling rich without making Page look poor.
  They remain individually purchasable for a Page host who wants one.

## 4 · The archive fee, and the "not a subscription" promise

One-time pricing against perpetual hosting costs is the model's real
tension (a memorial site may stay up for a decade). The answer:

- A published site **stays online free on its `pearloom.com`
  subdomain, indefinitely.** That is never withdrawn.
- After the keep window, an optional **archive renewal
  (`ARCHIVE_RENEWAL_CENTS`, $29/yr)** covers only the genuinely
  ongoing costs: custom-domain renewal and full-resolution media
  retention.
- Framing is **"preservation, not planning."** Planning Pearloom is
  one-time; keeping a full-resolution archive and a custom domain
  alive is the only recurring thing, and it's opt-in.

Memorials are exempt from every tier limit and from the archive fee.

## 5 · Where the money surfaces live

| Surface | File |
|---|---|
| Marketing pricing tiers | `src/components/marketing/design/DesignPricing.tsx` |
| Plan limits, ranks, prices, aliases | `src/lib/plan-gate.ts` |
| Guest-capacity enforcement (the choke point) | `src/lib/plan-gate.ts` → `checkGuestCapacity` |
| Site-count + pack-publish gates | `src/app/api/sites/route.ts` |
| Pack catalog + tier derivation | `src/lib/theme-store/packs.ts` |
| Plan → pack grants | `src/lib/theme-store/entitlements.ts` |
| Entitlements API | `src/app/api/store/entitlements/route.ts` |
| Plan checkout (the till) | `src/app/api/billing/checkout/route.ts` |
| Plan grant on payment | `src/app/api/stripe/webhook/route.ts` |
| Dashboard plan cards | `src/components/pearloom/dash/UserSettingsModal.tsx`, `src/components/marketing/design/dash/DashSettings.tsx` |
| Catalog webfonts | `src/lib/theme-store/fonts.tsx` |

## 6 · Other revenue

- **Vendor marketplace** — an 8% platform fee on bookings
  (`src/lib/event-os/pricing.ts`), with the application fee capped
  below the deposit so Stripe never rejects the vendor transfer.
  Supply acquisition is not built; this is a primitive, not a
  business line yet.
- **Registry** — Pearloom deliberately **never touches gift money**.
  Guests reserve items and buy at the merchant's own link; cash gifts
  are P2P deep-links to the host's own handles. This avoids
  money-transmitter licensing entirely and is not a revenue line.

## 7 · Retired

- **Pearloom Print** (physical print-and-mail via Lob, 2026-06-09 →
  2026-07-08). Deleted end-to-end as a product decision; print-at-home
  / press-ready PDF is the only print story, and
  `src/lib/no-physical-promises.test.ts` is the fence that keeps the
  copy from coming back. *(This section previously documented Print's
  retail prices and margins as live — a doc drift caught in the
  2026-08-04 platform audit.)*
- **The à-la-carte decoy store** (§3).

## 8 · Open

*(Reconciled 2026-08-13 with `docs/DECISIONS-2026-08-04.md` — this
section previously contradicted that same-day doc on two counts, a
drift the platform audit caught as L88. The DECISIONS doc is the
later, evidence-based word; this section now defers to it.)*

- **Willingness-to-pay: ship $89 / $199, do not price-test yet**
  (DECISIONS §4). Below a few hundred activated celebrations an A/B
  produces noise and burns the first-impression price. Revisit at
  ~200 activated celebrations; until then watch free→paid conversion
  at all, not its elasticity.
- **Unit economics: modelled and fine** (DECISIONS §5 — under $1 per
  site per decade on the code's own constants; R2 egress is free).
  The archive fee is margin on the custom domain, not cost recovery
  — and internally we say so.
- **The keep window** (currently 45 days, a constant in
  `cockpit-phase.ts`) has no relationship to the archive fee yet.
- **Per-celebration vs per-site.** CLAUDE-PRODUCT §8 Q3 is now
  answered *per celebration* — the Pass covers a whole linked arc.
  The container work that makes that literal (shared roster,
  per-satellite privacy) is Phase 1; until it lands, `maxSites: 10`
  is the practical expression of "the whole weekend."

## Enforcement status (2026-08-05, owner sign-off)

What is actually gated in code, and what is only priced:

| Sold capability | Status |
|---|---|
| Guest count (100 / 500 / ∞) | **Enforced** — `checkGuestCapacity`, the one choke point every host-initiated guest writer calls. |
| Sites (2 / 10 / ∞) | **Enforced** — inline in `POST /api/sites` at creation (no shared helper; the count and the 402 live in the route). |
| Co-hosts (1 / ∞ / ∞) | **Enforced 2026-08-05** — `checkCoHostCapacity` in `/api/co-host/invite`. |
| Linked celebrations | **Bounded already** by the site limit; a separate gate would be redundant, so there isn't one. |
| Custom domain | **NO LONGER SOLD (2026-08-05).** It was never built — no DNS provisioning, no TLS issuance, no verification screen — yet the Stripe description, the settings copy, and a help answer all promised it; the help answer sent hosts to "Dashboard → Profile → Domains", a screen that does not exist. Every claim removed. The `PLAN_LIMITS.customDomain` flag stays, marked RESERVED, so the ladder keeps its shape for whoever builds it. **Build it, then sell it.** |

### The rules these gates follow

1. **Turning on a gate never evicts anyone.** Every capacity check
   is consulted on ADD only. A celebration already run by three
   people keeps all three; the next invitation is what's refused.
2. **Fail open on a counting error.** If we can't tell how many
   exist, the host proceeds. A billing gate must never be the
   reason someone can't invite their partner.
3. **A plan-lookup outage degrades to FREE limits**, not to
   unlimited — an inconvenience for a paid host, not a giveaway.
   Deliberate, shared with the guest gate, and pinned by tests.
4. **Grief outranks the ladder.** Memorials and funerals are exempt
   from every limit, always.

### Why free includes one co-host

For most celebrations the second person is the other half of the
couple. Gating them out would be hostile rather than commercial.
The Pass is for the rest of the people who help run it — the MOH,
the best man, both sets of parents, the planner.
