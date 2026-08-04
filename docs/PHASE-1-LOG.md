# Phase 1 — Growth-shaped product: work log

> The pricing restructure and the container's data model + privacy
> scopes, per `docs/REVIEW-SYNTHESIS.md` §7 and the owner's two calls
> (implement pricing at the recommended numbers; container as
> data-model-plus-privacy first). Compiled 2026-08-04.
>
> Validation gate: `tsc` clean · **1404 vitest tests pass** (121 files)
> · `eslint src` clean repo-wide (0/0) · `npm run build` succeeds.

## What shipped

### 1 · Pricing restructured — Page $0 / Pass $89 / Keepsake $199

The packaging all three reviews converged on. The ladder now gates
**operational power** (linked events, co-hosts, guest scale,
communication, custom domain, preservation) and never visual quality.

- **Design is no longer the paywall.** 55 of 75 theme packs (the free
  + premium tiers) are granted to *free* accounts; the 20 signature
  packs ride with the Pass and stay individually purchasable. The
  decoy economics — two premium packs costing more than the plan —
  are retired.
- **Limits:** free 100 guests / 50 photos / 10 AI; Pass 10 sites /
  500 guests / 500 photos / 100 AI / custom domain; Keepsake
  unlimited.
- **Prices live in one place** (`PLAN_PRICE_CENTS`,
  `ARCHIVE_RENEWAL_CENTS` in plan-gate) and the checkout route imports
  them, so the till and the gate cannot drift.

**No migration, and no customer loses anything.** The canonical ids
stay `free` / `pro` / `premium` — exactly what `user_plans` already
stores. Every grant and gate resolves by *rank*, so an account that
bought "Atelier" at $19 automatically holds today's richer Pass
entitlements. Two files that hardcoded alias lists (`marketplace.ts`,
`/api/ai-usage`) were converted to rank checks; they'd have silently
missed the new names. `entitlements-grants.test.ts` pins the
compatibility seam in both directions.

### 2 · The shedding problem — per-satellite privacy scopes

The container's highest-stakes constraint, named by review #3 and the
reason the data model came before the UX.

**The failure:** link a bachelorette to the wedding celebration and its
guests joined the cross-event union the mother-of-the-bride can see.
Blanket container-wide visibility is the bug.

`lib/celebration-privacy.ts` is now the single rule every reader
shares. Each event resolves to a **roster scope**:

- `shared` — feeds the union, can receive write-back.
- `private` — its guest list never leaves it.

Two properties make it safe:

1. **Safe by default.** Sensitive occasions (bachelor/ette,
   CLAUDE-PRODUCT §8 Q2) are private *without the host knowing the
   setting exists*; the legacy `linkVisible: false` opt-out implies
   private too.
2. **Unrecognized input never opens.** A typo or stray value falls
   back to the default — it can never silently mark a private event
   shared.

The roster route resolves scope per event and **skips the guest fetch
entirely** for private ones (never fetched, not merely filtered), while
still reporting their own headcount — the owner's data on the owner's
dashboard — plus a plain-language reason. The public siblings strip and
the connections chrome now import the same rule instead of each
redeclaring the sensitive-occasion list.

### 3 · Shared-roster write-back

`POST /api/celebrations/roster` — the other half of the union, and the
deliberate heavy follow-up named in `FOLLOW-UPS.md`. Puts one person
onto the sibling events they're missing from, killing the
enter-once-then-copy-and-drift pain.

Every guard the single-add path has, per target: ownership (a subdomain
outside the caller's celebration **403s the whole request** rather than
partially writing), the shedding guard's **write half** (a private
event is never a write-back target), the shared guest-capacity gate
(write-back can't route around the plan cap), importer-matching dedupe,
and the fire-and-forget person link. Partial success is reported per
target — one event may be full while another accepts.

### 4 · Occasion-aware container naming

The internal id stays `celebration`; the *label* is derived.
`lib/celebration-naming.ts` reads the same EVENT_TYPES registry that
routes tone elsewhere: solemn → **remembrance**, reunion →
**gathering**, else **celebration**. A mixed arc takes the gentlest
register. Adding a solemn occasion needs no change here — a test walks
every solemn registry entry to prove it.

## Tests added this phase

| Suite | Count | Defends |
|---|---|---|
| `celebration-privacy.test.ts` | 14 | Safe defaults, explicit override, the never-opens property, the partition |
| `roster/route.test.ts` | 10 | Both halves of the shedding guard, all-or-nothing ownership, dedupe, capacity |
| `celebration-naming.test.ts` | 10 | Registry-derived register, mixed-arc gentleness, fallbacks |
| `entitlements-grants.test.ts` | 7 | Design-is-free, signature shelf, retired-name compatibility |

## Not done this phase (deliberately)

Per the owner's "data model + privacy scopes first" call, the
**customer-facing container pivot** — reframing the wizard, dashboard,
and onboarding around one container as the unit a host creates — is
still ahead. The data model, the privacy constraint, the write-back,
and the naming now exist to build it on.

Also still ahead from `REVIEW-SYNTHESIS.md` §7 Phase 1: the
paste/upload express doorway, moving auth to save/publish universally,
guest-import promoted into onboarding, and the passport recap +
referral loop.

## Owner actions still outstanding

Unchanged from `PHASE-0-LOG.md`: email DNS (SPF/DKIM/DMARC), the
CAN-SPAM postal address, prod secrets (`FILM_RENDERER_WEBHOOK_SECRET`
is load-bearing — the route fails closed without it), and a staging
environment. New: **the Stripe products for the $89 / $199 price points
need creating** before the till can take real money at the new numbers.
