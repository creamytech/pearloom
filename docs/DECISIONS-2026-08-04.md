# Five decisions, decided

> The open decisions from `docs/OPEN-ITEMS.md` §2, made 2026-08-04 with
> reasoning shown. Two are implemented in this commit; three are
> positions to hold (or overrule) rather than code.
>
> Where I disagree with the external reviews I say so and why — in two
> cases their advice predates our own pricing restructure and no longer
> applies.

---

## 1 · What a referral earns

**Decision: the new host inherits the style; the referrer earns an
archive year, capped at three.**

### Why not what the reviews suggested

All three reviews proposed *"an Edition credit for the new host, a
Keepsake upgrade for the referrer."* That was sound advice **against
the old pricing** — when design was the paywall, an Edition credit was
worth real money.

We then made design free (`MONETIZATION.md` §3: 55 of 75 packs granted
to free accounts). **An Edition credit is now worth exactly nothing.**
Shipping it would be a reward that reveals itself as hollow the moment
the recipient notices they already had it — worse than no reward.

### What actually works, derived from our ladder

**The new host inherits the style of the event they attended.** They
arrive from a passport recap having just seen a site they liked, at
the moment of maximum blank-page uncertainty. Handing them that look
as a starting point is a genuine gift, costs us nothing, and removes
the hardest step. The referral link already carries the site slug, so
the mechanism exists.

**The referrer earns +1 year of archive, max 3.** The referrer is a
host whose event is *over* — the recap is afterglow-only. The only
thing they still want from us is that their memories stay. That is
also the only genuinely recurring cost we have (§5), which makes it
the one currency where our incentives and theirs point the same way:
they keep their photos, we get a host.

Capped at three years so it can't compound into unlimited free
hosting, and it grants archive **only** — never Pass or Keepsake
features, which would cannibalise the thing we sell.

### Status

The policy is implemented and tested (`lib/referral-reward.ts`). The
**ledger table is written but not applied** — `supabase/migrations/
20260804_referral_credits.sql` needs an MCP apply. Until then
`grantReferralCredit` degrades to a no-op and logs, so nothing breaks.

---

## 2 · Free-tier site limit

**Decision: raise free from 1 site to 2.** Implemented.

### The argument that settles it

`maxSites: 1` **directly blocks our #1 distribution channel.**

The merged synthesis ranks bridal-party reverse-acquisition first: a
maid of honour builds the shower site, then hands the couple a link.
With a one-site free tier:

- The MoH who made a shower site **cannot** make the bachelorette site.
- The couple who receive her invite link **cannot** create their
  wedding if they'd already made anything.

We would be shipping a growth loop and a gate that closes it, in the
same product. That's not a pricing decision, it's a bug in disguise.

### Why 2 and not unlimited

Two is the smallest number that lets someone **host their own thing
and join someone else's arc** — which is exactly the reverse-acquisition
motion, and nothing more. The Pass at 10 remains the honest answer to
"the whole weekend." Unlimited would make the Pass's headline benefit
meaningless.

Memorials remain exempt from the count entirely (the grief promise), so
this changes nothing for them.

---

## 3 · The customer-facing container pivot

**Decision: yes — but not next. Ship the doorway to real users first.**

I want to be clear this is a *sequencing* answer, not a hedge. The
pivot is right and all three reviews are correct that it's the highest-
leverage structural move available.

### Why it shouldn't be the next thing built

The container's **data model is already done** — table, privacy scopes,
write-back, occasion-aware naming. That work is what makes the
customer-facing pivot cheap *later*, and it was deliberately sequenced
first for exactly this reason.

What's changed since: there is now a doorway (`/start`, `/makeover`,
tolerant guest import, referral attribution) **that no human has walked
through**. The pivot reframes the wizard, the dashboard, and onboarding
around a unit whose value is still a hypothesis.

Rebuilding the dashboard around "celebration" before anyone has created
one through the new door means designing for an imagined user. The
cost of waiting is low (the model is built); the cost of guessing wrong
is a second rebuild.

### The trigger to start

When ~50 celebrations have been created and the funnel shows how many
hosts actually link a second event. If that number is high, the pivot
is obvious and evidence-backed. If it's near zero, the pivot was the
wrong bet and the data model cost us one sprint instead of a quarter.

**This is blocked on the owner actions**, not on engineering — real
users need working email.

---

## 4 · Willingness to pay ($89 / $199)

**Decision: ship the numbers as they are. Do not price-test yet.**

### The anchor is right

- Average US wedding: **~$34,000**. $89 is **0.26%** of that —
  categorically invisible.
- The competitive frame is **not** "Zola is free." Zola and Joy give
  away *websites*; Minted sells *stationery* at $300–800 for the same
  wedding. Pearloom ships the Studio (print-at-home stationery), so
  we're priced against the stationery line, where $89 is cheap
  enough to feel like a rounding error. *(Correction 2026-08-13: the
  Studio is not plan-gated — every account has it. The anchor
  argument survives — the product category is stationery-adjacent —
  but the Pass may not be SOLD on the Studio; see MONETIZATION.md §2
  and `src/lib/pricing-agreement.test.ts`.)*

### The real risk is packaging, not price

The failure mode isn't "too expensive." It's **"why pay anything when
Joy is free"** — a question about *what's gated*, which the restructure
already answered by gating coordination rather than design.

### Why testing now would be noise

A price test needs enough conversions per arm to separate signal from
variance. Below a few hundred activated celebrations, an A/B on $79 vs
$99 produces a number that looks like an answer and isn't. Worse, it
would burn the one clean shot at a first-impression price.

**Revisit at ~200 activated celebrations** (the north-star metric,
already instrumented via `product_events`). Until then, the number to
watch is free→paid conversion *at all*, not its elasticity.

---

## 5 · Unit economics

**Decision: the economics are fine. The archive fee is margin on the
custom domain, not cost recovery — and we should be honest about that
internally.**

### The model, with real numbers

I modelled this rather than leaving it open, using the code's own
constants:

| Input | Value | Source |
|---|---|---|
| Photo max edge | 2048px | `photo-resize.ts` `MAX_EDGE` |
| Typical stored photo | ~450 KB (JPEG q82 at 2048px) | resize pipeline |
| Free-tier photo cap | 50 | `PLAN_LIMITS.FREE` |
| Pass photo cap | 500 | `PLAN_LIMITS.PRO` |
| R2 storage | ~$0.015/GB/month | Cloudflare |
| **R2 egress to internet** | **$0** | Cloudflare R2's defining property |
| AI | hard-capped per account | `AI_DAILY_CAP_CENTS`, default $5/day |

**A free site's ten-year storage tail: ~22 MB → well under $1.**
**A Pass site's: ~225 MB → roughly $0.40 over ten years.**

Egress is the number that would normally kill perpetual free hosting,
and on R2 it is zero. That single architectural choice — made before
this audit — is what makes one-time pricing viable at all.

### What this means

1. **A decade-lived memorial site costs us cents.** The grief promise
   is not a subsidy we should worry about. Good.
2. **The $29/yr archive fee is not recovering storage.** It's
   recovering a **custom domain** (~$12–15/yr wholesale) plus margin.
   That's a legitimate product, but we should never tell ourselves
   it's cost recovery — that story would justify charging
   subdomain-only hosts, which would be both wrong and unnecessary.
3. **The design already reflects this**: the archive fee applies only
   to custom domain + full-resolution retention, and a published site
   stays online free on its `pearloom.com` subdomain indefinitely.
   Keep it that way.

### The cost that actually needs watching

Not storage — **AI**. It's the only input that scales with *engagement*
rather than data, and it's the only one with a per-account cap already
in place. The `ai_spend` ledger is the thing to put on a dashboard, not
the R2 bill.

---

## Summary

| # | Decision | Status |
|---|---|---|
| 1 | New host inherits the style; referrer earns +1 archive year (max 3). Reviews' Edition-credit idea is void under our own pricing. | Policy implemented; ledger migration APPLIED to prod 2026-08-04, guards verified live |
| 2 | Free tier: **1 → 2 sites**. One site closes our #1 growth loop. | Implemented |
| 3 | Container pivot: **yes, after ~50 celebrations of evidence**. Model is built; the reframe waits for real users. | Position |
| 4 | **Ship $89 / $199.** Test conversion, not elasticity, until ~200 activated celebrations. | Position |
| 5 | Economics are fine (**<$1 per site per decade**; R2 egress is free). Archive fee is domain margin, not cost recovery. | Modelled |
