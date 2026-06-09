# Pearloom monetization — finalized 2026-06-09

> The single source of truth for how Pearloom makes money. If a
> surface (pricing page, store, upgrade gate) contradicts this doc,
> one of them is wrong — fix it or amend this.

---

## 1 · The model in one paragraph

Pearloom sells **per-site plans, one-time** ("one-time, not a
subscription" is a load-bearing marketing promise on the landing
page) plus an **à-la-carte Theme Store**. The store and the plans
are deliberately entangled: the Atelier plan includes the entire
premium pack shelf, so a host who falls in love with two $14 packs
is always one small step from "just take Atelier — it's everything,
plus the custom domain." Signature packs stay out of Atelier to
preserve a high-end shelf and a reason for Legacy.

## 2 · The plan ladder

| | **Journal** | **Atelier** | **Legacy** |
|---|---|---|---|
| Price | $0 | **$19** one-time | **$129** one-time |
| Canonical plan id (`user_plans.plan`) | `free` / `journal` | `pro` / `atelier` | `premium` / `legacy` |
| Sites | 1 | 3 | 10 |
| Guests | 50 | 500 | Unlimited |
| Photos | 20 | 200 | Unlimited |
| AI generations | 3 | 50 | Unlimited |
| Custom domain | — | ✓ | ✓ |
| Theme Store | Free shelf | **+ every premium pack** | **+ the signature shelf (full catalog)** |
| Memorials | Always free on every tier (Pear's promise) | | |

Source of truth for limits: `src/lib/plan-gate.ts` (`PLAN_LIMITS`).
Source of truth for the store grants:
`src/lib/theme-store/entitlements.ts` → `planGrantedPackIds()`.

## 3 · Theme Store tiers

Pack tier is derived from price in `packs.ts` `mk()`:

| Tier | Price band | Role |
|---|---|---|
| `free` | $0 | The funnel. Good enough to publish proudly, generic enough to make a host browse the paid shelves. **First Thread** (the house cream/olive pack) anchors this shelf. |
| `premium` | $10–$18 | The volume shelf. Distinct palettes + motifs + kits. Individually cheap, collectively the Atelier pitch ("all of these, $19"). |
| `signature` | $20–$28 | The flagship shelf. Dark/foil treatments, exclusive kits (Gallery, Menu), the new display faces (Bodoni Moda, Prata, Gilda). Included only with Legacy — or bought one at a time. |

Pricing bands within shelves: premium at $12 / $14 / $16 / $18;
signature at $20 / $22 / $24 / $28. Don't price between bands —
the shelf should read as deliberate, not haggled.

## 4 · Why this converts

1. **The à-la-carte anchor.** A host eyeing two premium packs
   ($14 + $16 = $30) sees Atelier at $19 with the whole shelf and
   a custom domain. The packs are real products AND a decoy for
   the plan.
2. **Typography is now actually delivered.** Until 2026-06-09 the
   catalog's display faces never loaded (only Fraunces/Caveat/Inter
   were imported — every other pack font fell back to Georgia).
   `<StoreFonts />` (`src/lib/theme-store/fonts.tsx`) fixes this on
   the store, published sites, and the in-editor shop. People pay
   for type they can now see.
3. **Plan grants are server-enforced.** `getUserEntitlements` +
   `userOwnsPack` fold in plan grants (fail-closed on DB errors),
   so the editor, store, and apply route all agree about ownership
   without client-side trust.
4. **The signature shelf protects the top.** Legacy at $129 needs
   a visible answer to "what do I get beyond limits?" — the answer
   is the shelf Atelier can't touch, plus foil + exclusive kits.

## 5 · Where the money surfaces live

| Surface | File |
|---|---|
| Marketing pricing tiers | `src/components/marketing/design/DesignPricing.tsx` (Journal $0 / Atelier $19 / Legacy $129) |
| Plan limits + gating | `src/lib/plan-gate.ts` |
| Pack catalog + tier derivation | `src/lib/theme-store/packs.ts` |
| Plan → pack grants | `src/lib/theme-store/entitlements.ts` (`planGrantedPackIds`) |
| Entitlements API | `src/app/api/store/entitlements/route.ts` |
| Store UI | `src/components/pearloom/store/` |
| In-editor shop | `src/components/pearloom/editor/EditorThemeShop.tsx` |
| Catalog webfonts | `src/lib/theme-store/fonts.tsx` (`<StoreFonts />`) |

## 6 · Open follow-ups

- Stripe products for Atelier/Legacy exist (`STRIPE_PRO_PRICE_ID`);
  signature-pack à-la-carte checkout reuses the pack purchase flow.
- The pricing page should eventually name the store benefit
  explicitly ("Every premium theme pack included").
- CLAUDE-PRODUCT.md §8 Q3 ("per-site vs per-event-group pricing")
  is resolved by this doc: **per-site, one-time**, bundling deferred
  until multi-site celebrations are a measured behavior.
