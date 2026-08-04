# Open items — what's left, and who owns it

> Compiled 2026-08-04 after Phase 0 + Phase 1. Everything the code
> could close is closed; this is the honest remainder. Each item says
> **who** can do it, because most of what's left is not code.
>
> Logs: `docs/PHASE-0-LOG.md`, `docs/PHASE-1-LOG.md`.
> Plan of record: `docs/REVIEW-SYNTHESIS.md`.

---

## 1 · Owner actions — code cannot close these

These are the real launch gates. None is blocked on engineering.

| Item | Why it matters | What to do |
|---|---|---|
| **Email DNS** | Without SPF/DKIM/DMARC + a dedicated bulk subdomain, invitations land in spam. This breaks the product's core loop — the site is fine and nobody sees it. | Publish the records in Resend + DNS (e.g. `mail.pearloom.com`). |
| **`EMAIL_POSTAL_ADDRESS`** | CAN-SPAM §5(a)(5) requires a physical address on bulk mail. The code is done — the footer renders the line only when this is set, so today's mail simply omits it (fine for transactional, not for bulk marketing). | Set the env var to the real registered address. |
| **Stripe products at $89 / $199** | The checkout route reads `PLAN_PRICE_CENTS`, so no code changes — but the till can't take money at the new numbers until the products exist. | Create them in Stripe. |
| **`FILM_RENDERER_WEBHOOK_SECRET`** | Became load-bearing in Phase 0: `/api/film/render-complete` used to fail OPEN (any POST could mark a render job complete with an attacker-supplied URL) and now returns 503 until the secret is set. | Set it in prod, or accept film rendering being disabled. |
| **`RESEND_WEBHOOK_SECRET`, `EMAIL_UNSUB_SECRET`** | Bounce tracking rejects everything without the first; unsub tokens silently fall back to `NEXTAUTH_SECRET` without the second. | Set both deliberately. |
| **Staging environment** | The critical-path e2e specs are written and green, but hermetic (every API mocked) because this container has no backend. Staging is where they run against a real one. | Stand one up. |

## 2 · Decisions — DECIDED 2026-08-04

All five are now made, with reasoning, in
**`docs/DECISIONS-2026-08-04.md`**. Summary:

| Decision | Made | Status |
|---|---|---|
| **What a referral earns** | New host inherits the LOOK of the site they came from; referrer earns +1 archive year, capped at 3. The reviews' "Edition credit" is void under our own pricing — design is free now, so it would be worth nothing. | **Shipped end to end.** Policy + tests, and the ledger migration applied to prod 2026-08-04 (guards verified live: duplicate grant, self-referral and >3 years all refused). |
| **Free-tier site limit** | **1 → 2.** One site closes our #1 growth loop: a maid of honour can't add the bachelorette, and a referred couple can't create their wedding. | Shipped |
| **Container pivot** | **Yes — after ~50 celebrations of evidence.** The model is built (that was the point of sequencing it first); the reframe waits for real users so we're not designing for an imagined one. | Position — blocked on the §1 owner actions |
| **Willingness to pay** | **Ship $89 / $199.** We're priced against stationery ($300–800), not free websites; $89 is 0.26% of an average wedding. Test conversion, not elasticity, until ~200 activated celebrations. | Position |
| **Unit economics** | **Modelled: under $1 per site per decade.** R2 egress is free, photos cap at 2048px/~450KB. The archive fee is margin on the custom domain, NOT cost recovery — and the cost worth watching is AI, not storage. | Modelled |

Overrule any of these and the doc explains what the reasoning depended
on, so it's clear what changes.

## 3 · Code still open (ranked)

Real work, none of it blocking, in the order I'd take it.

1. **Wallet pass (Apple/Google)** — blocked on the Apple Pass Type ID
   certificate, which is an owner action; the generator is a session
   once that exists.
2. **WhatsApp channel for the concierge.** SMS shipped (see below);
   per synthesis §2.5 the second channel is WhatsApp via the same
   Twilio account, for international and culturally diverse events.
   Needs WhatsApp Business templates and an owner-side sender
   approval — the decision layer (`lib/sms/concierge`) is
   channel-agnostic and already carries the rules.
3. **Buy and wire the concierge numbers.** The inbound webhook is
   live and verified; what remains is provisioning numbers per
   celebration (or a shared number with the disambiguation reply
   already implemented), pointing them at
   `POST /api/sms/inbound`, and telling guests the number exists —
   an owner/ops action, not code.

### Closed since this list was written (2026-08-04)

- **Guest import into onboarding** — the tolerant paste is now the
  guests empty state (`GuestListDoor`), with an honest pre-commit
  count. Fixed a 404 found while wiring it: the publish moment's
  "Invite your guests →" pointed at `/dashboard/guests`, which did
  not exist.
- **SMS concierge, inbound half** — `POST /api/sms/inbound` with a
  fail-closed Twilio signature check, phone→guest→celebration
  resolution, an allowlisted fact sheet, and escalation to the host
  rather than a guessed answer. See ROUTE-AUDIT §3.
- **CSS dead-selector deletion** — executed via
  `scripts/css-dead-audit.mjs`; 70 consumer-less classes removed and
  verified against the built tree. It came to 172 lines, not the
  ~1,200 the audit estimated: the estimate assumed standalone blocks
  where most dead selectors are single entries in shared lists.
  `pearloom.css` is now clean rather than small.
- **Planner v1** — `/dashboard/planner`: a client book keyed off the
  existing co-host role (no new table), plus reusable shapes that
  carry structure and look but never a previous client's content.

## 4 · What is NOT open (so nobody re-litigates it)

- The launch-blocker list from `REVIEW-SYNTHESIS.md` §1.1 — all seven
  code items shipped in Phase 0, including the two authorization bugs
  the work surfaced (`POST /api/guests` accepting an ungated `siteId`;
  `/api/film/render-complete` failing open).
- Pricing packaging — restructured to Page/Pass/Keepsake, with no
  migration and rank-based compatibility so no existing customer
  loses entitlements.
- The shedding problem — per-satellite privacy scopes, enforced on
  both the read (roster union) and write (write-back) halves.
- The doorway contract — creation and guest surfaces stay open;
  `proxy.test.ts` fails CI if that regresses.
- Doc drift — occasion/theme/variant counts corrected; `FOLLOW-UPS.md`
  no longer lists shipped work as pending.
- **The doorway story, end to end** — `/start` (express entry),
  `/makeover` (the switching surface, rendering a real manifest
  through the real pipeline), tolerant guest-list parsing, and
  referral attribution.
- **Reverse acquisition** — the satellite→couple invite link, table
  free, ranked #1 distribution by the merged synthesis.
- **The barn problem** — day-of cache warming plus the day-of,
  seating and vendor shells precached, so a coordinator with no
  signal still has the run of show and the vendor numbers.
- **The printable briefcase** — the sheet for the guest who won't use
  a phone, with table-mates reduced to first names.
