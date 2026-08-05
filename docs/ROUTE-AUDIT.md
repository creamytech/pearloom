# API Route Classification Audit

> Every API route classified by its authentication/abuse posture, so
> "is this route supposed to be public?" has a written answer. First
> compiled 2026-08-04 (Phase-0 foundation work, from the three-review
> synthesis). Regenerate the appendix table with the marker script in
> the git history of this file whenever routes are added.
>
> **The standing rule for new routes:** every new route must land in
> exactly one class below, and a mutating (POST/PATCH/PUT/DELETE)
> route may only be session-authed, token-authed, webhook-verified,
> cron-gated, or admin-gated — never bare. Anonymous mutating routes
> require a written justification in this file.

## 1 · Classes

| Class | Contract |
|---|---|
| **Session** | `getServerSession` required; owner/role checked against the resource. The default for host actions. |
| **Guest-token** | Authed by an unguessable per-guest/per-resource token (`guest_token`, passport, packet, unsubscribe, split's `gateSplit`). The default for guest actions — a guest never needs an account. |
| **Webhook** | Cryptographic verification: Stripe signature, Svix (Resend), or a shared bearer secret. **Fail closed when the secret is unconfigured.** |
| **Cron** | Vercel cron header / `CRON_SECRET`. |
| **Admin** | Session + admin allowlist. |
| **Public-read** | Anonymous GET by design (OG cards, health, static proxies, directories). Rate-limited when the response is computed. |
| **Anonymous-write (justified)** | The few anonymous POSTs a guest product needs (RSVP, guestbook, waitlist, submissions). Each carries a rate limit and is listed in §3. |

## 2 · Findings from this pass (2026-08-04) — all fixed

1. **`POST /api/film/render-complete` failed OPEN.** With
   `FILM_RENDERER_WEBHOOK_SECRET` unset, any POST could mark render
   jobs complete with an attacker-supplied `outputUrl`. Now returns
   503 when the secret is unconfigured; the bearer check is mandatory.
2. **`/api/wedding-day` was an orphan anonymous upload.** Anonymous
   photo POST to a bucket/table that no migration creates and no
   component calls — zero references repo-wide. Deleted (see the
   deleted-architecture ledger discipline, CLAUDE-DESIGN §15).
3. **`POST /api/auto-draft` had no rate limit.** Compute-only (local
   template drafters — no DB, no AI), but farmable. Now rate-limited
   30/min/IP; stays anonymous by design (it's pure compute over the
   caller's own manifest).
4. **The three `pear-*` editor AI routes accepted anonymous calls**
   (`pear-caption`, `pear-critique`, `pear-scene`). Exposure was
   bounded — each had an IP-keyed daily AI-dollar cap and a rate
   limit — but their only consumer is the authed editor canvas
   (`CanvasPearBlocks`), and a stale "guest-facing" comment said
   otherwise. Now session-required, with AI spend keyed to the
   account instead of the IP.
5. **`/api/guests/from-person` inserted guest rows with no plan
   gate** — fixed in the entitlement pass (see `checkGuestCapacity`
   in `plan-gate.ts`).

## 3 · Deliberately anonymous routes (the justification list)

**Anonymous writes** — every one rate-limited; a guest is never asked
to create an account to respond to an invitation:

- `POST /api/rsvp`, `POST /api/sites/rsvp`, `POST /api/rsvp/plus-one` — the RSVP itself.
- `POST /api/address-book` — a guest submitting their own address (`/a/` form).
- `POST /api/guestbook`, `GET,POST /api/sites/guestbook` — guest signatures (in-memory limiter predates the shared one — migrate opportunistically).
- `POST /api/event-os/{submissions,toasts,votes}` — advice walls, toast slots, polls (server dedupes; hosts moderate).
- `POST /api/guest-photos`, `POST /api/upload` guest paths — guest photo wall (moderated).
- `POST /api/song-requests`, `POST /api/whispers`, `POST /api/time-capsule`, `POST /api/gallery/react`, `POST /api/ask-couple` — guest contributions, all token- or site-scoped.
- `POST /api/email-capture`, `POST /api/newsletter/subscribe` — marketing capture (own limiter / shared limiter).
- `POST /api/gate` — the site password gate itself.
- `POST /api/auto-draft` — anonymous pure compute (finding 3).
- `POST /api/doorway/makeover` — the switching surface (2026-08-04).
  Same posture and the same guards as `/extract` below: anonymous by
  design, IP rate-limited (tighter — every call makes an outbound
  fetch AND builds a manifest), the fetch routed exclusively through
  `lib/safe-fetch`, and **no writes** — the manifest it returns is
  marked preview/unpublished and exists only in the response.
- `POST /api/doorway/extract` — the express door (2026-08-04). Anonymous
  BY DESIGN: a visitor must see a real preview of their own event before
  being asked to sign up. It is also the one route that fetches a
  user-supplied URL without a session, so its guards are load-bearing:
  IP rate limit, the fetch routed exclusively through `lib/safe-fetch`
  (scheme allowlist, private-host + resolved-private-IP rejection,
  re-vetted redirects, byte cap, deadline), an optional budget-capped AI
  pass skipped when the free parse already answered, and **no writes of
  any kind**. Pinned by `route.test.ts`, which asserts the route never
  calls global `fetch` itself and that a refused URL yields a reason-free
  422.
- `POST /api/auth/{register,forgot,reset}` — pre-auth by nature; rate-limited.

**Public reads** — `GET /api/og` (unfurlers can't auth; output is a
rendered card of already-public data), `health`, `hero-art`,
`img/[...slug]` + `photos/proxy` (media proxies), `qr`, `maps/static`,
`map/geometry`, `venue/{search,photo}`, `places/*`, `music/search`,
`library/iconify/*`, `weather/climate`, `vendors/directory`,
`celebrations/siblings` + `celebrations/[id]` (published-siblings
lookup — leaks nothing unpublished; bachelor/ette excluded upstream),
`rsvp/weave` (hashed seeds only), `rsvp-stats`, `rsvp/pulse`,
`site` + `invite/rsvp` + `rsvp/lookup` (token/slug-scoped reads),
`calendar/[siteId]` + `export-pdf` (shareable artifacts),
`email-prefs` (unsubscribe link — intentionally GET),
`payments/success` (redirect landing).

### Session-authed, added since the first pass

- `GET /api/day-of/briefcase` (2026-08-04) — the printable sheet for
  the guest who won't use a phone. Owner-gated because it composes a
  NAMED guest's own details (their seat, their dietary note); a guest
  cannot fetch their own, and the response is `private, no-store`.
  The composer reduces table-mates to first names so the sheet is a
  seating aid, never a roster.

### Added since this pass

- `POST /api/sms/inbound` (2026-08-04) — **Webhook** class. The
  concierge number's inbound half. Twilio signature verified against
  the configured public URL, and `verifyTwilioSignature` fails CLOSED
  including when `TWILIO_AUTH_TOKEN` is unset — the same posture the
  §2.1 finding forced on the film webhook. Additionally rate-limited
  per originating phone number (12 / 10 min) because a verified
  webhook can still be a spend vector, and the AI answer runs under
  the shared daily budget gate. What it may read is an allowlist
  (`lib/sms/site-facts`): public logistics only, never money, other
  guests, vendors or private host notes. An unrecognised number is
  told nothing about any celebration.

- `GET /api/wallet/[token]` (2026-08-05) — **Guest-token** class.
  The passport token is the whole authorization: it names one
  person on one celebration, and the route reads no further. Drafts
  404 (a pass for an unshared site would leak it) and a bad token
  gets the same response shape as a missing one. Rate-limited
  30/min/IP. Both platforms FAIL CLOSED: unconfigured returns 503,
  never an unsigned .pkpass — which iOS rejects with a meaningless
  error in front of a guest. See `docs/WALLET-PASSES.md`.

## 4 · Coverage counts (2026-08-04, post-fix)

- 237 route files (after the wedding-day deletion).
- 195 carry `getServerSession` or a token/webhook/cron/admin marker.
- The remainder are the §3 justified-anonymous set.
- Rate limiting: 131 routes use the shared `checkRateLimit`; a
  handful of older guest surfaces carry bespoke in-memory limiters
  (guestbook, email-capture) — functional, migrate opportunistically.

## 5 · Appendix — full route table

Markers: `S` session · `R` shared rate limit · `T` token-authed
(guest/passport/packet/unsub/split) · `C` cron · `W` webhook ·
`A` admin · `-` absent. A route's *class* is its strongest marker
plus the §3 list; markers are grep-derived hints, not the contract.

| Route | Methods | Markers |
|---|---|---|
| `address-book` | POST | -R---- |
| `admin/ai-usage` | GET | S----A |
| `admin/grant` | POST | S----A |
| `admin/upload-heroes` | POST | ---C-- |
| `admin/users` | GET | S----A |
| `ai-blocks` | POST | SR---- |
| `ai-chat` | POST | S----- |
| `ai-faq` | POST | SR---- |
| `ai-followup` | POST | SR---- |
| `ai-hotels` | POST | SR---- |
| `ai-meals` | POST | SR---- |
| `ai-registry-import` | POST | SR---- |
| `ai-thankyou` | POST | SR---- |
| `ai-travel-guide` | POST | SR---- |
| `ai-usage` | GET | S----- |
| `analytics/section` | POST,GET | SR---- |
| `analytics/sources` | GET | SR---- |
| `analytics/visit` | POST,GET | -R---- |
| `anniversary/nudge` | POST,GET | -R---- |
| `announcements` | GET,POST | S-T--- |
| `ask-couple` | POST | -R---- |
| `assets/upload` | POST | SR---- |
| `auth/[...nextauth]` |  | ------ |
| `auth/forgot` | POST | -R---- |
| `auth/register` | POST | -R---- |
| `auth/reset` | POST | -R---- |
| `auto-draft` | POST | -R---- |
| `billing/checkout` | POST | SR---- |
| `billing/webhook` | POST | ----W- |
| `broadcast/push` | POST | S-T--- |
| `cadence/draft` | POST | S----- |
| `cadence` | GET,POST,DELETE | S----- |
| `calendar/[siteId]` | GET | -R---- |
| `cash-gift` | POST | -R---- |
| `celebrations/[id]` | GET | ------ |
| `celebrations/roster` | GET | S----- |
| `celebrations` | PATCH | S----- |
| `celebrations/siblings` | GET | ------ |
| `celebrations/weekend` | POST | S----- |
| `circle-invites/claim` | POST | SR---- |
| `co-host/invitations` | GET | S----- |
| `co-host/invite` | POST | SR---- |
| `co-host/lookup` | GET | S----- |
| `community/marks/[id]/use` | POST | -R---- |
| `community/marks` | GET,POST | SR---- |
| `companion/[token]` | GET | --T--- |
| `cron/anniversary` | GET | --TC-- |
| `cron/communications` | GET | --TC-- |
| `cron/film` | GET | ---C-- |
| `cron/notification-digest` | GET | ---C-- |
| `cron/weekly-digest` | GET,POST | ---C-- |
| `dashboard/notifications` | GET,POST | S----- |
| `dashboard/reel` | GET | S----- |
| `dashboard/sites-stats` | GET | SR---- |
| `decor/ai-accent` | POST | SR---- |
| `decor/generate-from-text` | POST | SR---- |
| `decor/library` | POST | SR---- |
| `decor/megasheet` | POST | -R---- |
| `decor/recolor` | POST | S----- |
| `decor/sticker` | POST | SR---- |
| `decor/upload-svg` | POST | SR---- |
| `decor/venue-motifs` | POST | SR---- |
| `director` | POST,GET | S----- |
| `draft-registry` | POST | SR---- |
| `email-capture` | POST,GET | ------ |
| `email-prefs` | GET | --T--- |
| `event-os/submissions/moderation` | GET,PATCH | S----- |
| `event-os/submissions` | GET,POST | -R---- |
| `event-os/toasts/moderation` | GET,DELETE | S----- |
| `event-os/toasts` | GET,POST | -R---- |
| `event-os/votes` | GET,POST | -R---- |
| `events` | POST | SR---- |
| `export-pdf` | GET | -R---- |
| `film/render-complete` | POST | ----W- |
| `film` | GET,POST | S----- |
| `friends/person` | GET | SR---- |
| `friends` | GET,POST | SR---- |
| `gallery/react` | POST | -R---- |
| `gallery/reactions` | GET | -R---- |
| `gallery` | GET,POST | S----- |
| `gate` | POST | -R---- |
| `gift-pledges` | GET,PATCH,POST | SR---- |
| `giphy/search` | GET | -RT--- |
| `guest-passport/[token]` | GET | --T--- |
| `guest-passport/[token]/submit` | POST | -RT--- |
| `guest-passport/[token]/subscribe` | POST,DELETE | --T--- |
| `guest-photos/moderate` | GET,POST | S----- |
| `guest-photos` | GET,POST | -RT--- |
| `guest/connections` | GET,POST | -RT--- |
| `guest/friends` | GET,POST | -RT--- |
| `guestbook` | GET,POST,DELETE | SRT--- |
| `guests/copy-from` | POST | SR---- |
| `guests/draft-nudge` | POST | SR---- |
| `guests/from-person` | POST | SRT--- |
| `guests/import` | POST | S-T--- |
| `guests/intelligence` | GET,POST | S----- |
| `guests/nudge` | POST | SRT--- |
| `guests/pending-ids` | GET | S----- |
| `guests/person-history` | GET | SR---- |
| `guests/request-addresses` | POST | SR---- |
| `guests/resend-invite` | POST | S-T--- |
| `guests` | GET,POST,PATCH,DELETE | S-T--- |
| `guests/text-invite` | POST | SRT--- |
| `guests/track` | POST | -RT--- |
| `health` | GET | ------ |
| `hero-art` | GET | ------ |
| `hotels/enrich` | POST | SR---- |
| `hotels/nearby` | POST | SR---- |
| `img-brightness` | GET | -R---- |
| `img/[...slug]` | GET | -R---- |
| `inline-rewrite` | POST | SR---- |
| `invite-card` | GET | -RT--- |
| `invite/accept` | POST | -R---- |
| `invite/guest` | POST | SRT--- |
| `invite/ics` | GET | --T--- |
| `invite` | POST,GET,DELETE | SR---- |
| `invite/rsvp` | GET | ------ |
| `library/iconify/search` | GET | -R---- |
| `library/iconify/svg` | GET | -R---- |
| `look/from-story` | POST | SR---- |
| `map/geometry` | GET | -R---- |
| `maps/static` | GET | -R---- |
| `marketplace/owned` | GET | SR---- |
| `memory-book` | GET | S----- |
| `memory-weave/invite` | POST | S-T--- |
| `memory-weave` | POST,GET | SR---- |
| `messages/host` | GET,POST,DELETE | SRT--- |
| `messages` | GET,POST | -RT--- |
| `music/search` | GET | -R---- |
| `newsletter/subscribe` | POST | -R---- |
| `notifications/prefs` | GET,POST | S----- |
| `notifications/push` | GET,POST,DELETE | S----- |
| `og` | GET | ------ |
| `passport-capsule` | GET,PATCH | S----- |
| `passport-cards` | GET | S-T--- |
| `payments` | GET | S----- |
| `payments/success` | GET | ------ |
| `pear-caption` | POST | SR---- |
| `pear-chat` | POST | SR---- |
| `pear-critique` | POST | SR---- |
| `pear-scene` | POST | SR---- |
| `pear-sms` | GET,PATCH,POST | S----- |
| `pear/speech` | POST | SR---- |
| `personalize/[token]` | GET | --T--- |
| `photos/proxy` | GET | S----- |
| `photos` | GET | S----- |
| `photos/stylize/[jobId]` | GET | S----- |
| `photos/stylize` | POST | SR---- |
| `photos/upload` | POST | S----- |
| `places/details` | POST | SR---- |
| `places/search` | POST | SR---- |
| `qr/poster/[jobId]` | GET | S----- |
| `qr/poster` | POST | SR---- |
| `qr` | GET | -R---- |
| `recap/day-after` | GET,POST | ---C-- |
| `registry-items/[id]/claim` | POST | -R---- |
| `registry-items/claims` | GET,PATCH | SR---- |
| `registry-items/from-url` | POST | SR---- |
| `registry-items` | GET,POST,PATCH,DELETE | S----- |
| `registry-link-claims` | GET,POST,PATCH,DELETE | SR---- |
| `registry` | GET,POST,PATCH,DELETE | S----- |
| `rewrite-chapter` | POST | S----- |
| `rewrite-text` | POST | SR---- |
| `rsvp-email` | POST | -RT--- |
| `rsvp-reminder` | POST | SR---- |
| `rsvp-stats` | GET | -R---- |
| `rsvp/lookup` | GET | -R---- |
| `rsvp/plus-one` | POST | --T--- |
| `rsvp/pulse` | GET | -R---- |
| `rsvp` | POST,GET | SRT--- |
| `rsvp/weave` | GET | -R---- |
| `save-the-date/send` | POST | SRT--- |
| `schedule/from-notes` | POST | SR---- |
| `seating/lookup` | POST | -R---- |
| `seating` | GET,POST,PATCH,DELETE | S----- |
| `seatmate-intros` | POST,GET | SR---- |
| `site` | GET | -R---- |
| `sites/[domain]` | GET,DELETE | S----- |
| `sites/budget/lines` | GET,POST,DELETE | SR---- |
| `sites/budget` | PATCH | S----- |
| `sites/co-host/me` | GET | S----- |
| `sites/co-host` | POST,GET,DELETE | SR---- |
| `sites/collab-token` | GET | S-T--- |
| `sites/guest-passport` | GET | --T--- |
| `sites/guestbook` | GET,POST | ------ |
| `sites/live-updates` | GET,POST,DELETE | S-T--- |
| `sites/publish` | POST | S----- |
| `sites` | GET,POST | S----- |
| `sites/rsvp-access` | PATCH | S----- |
| `sites/rsvp` | POST | -R---- |
| `sites/seating` | PATCH | S----- |
| `sms/inbound` | GET,POST | -R--W- |
| `song-requests` | GET,POST,PATCH | SR---- |
| `wallet/[token]` | GET | -RT--- |
| `split/expenses` | POST,DELETE | --T--- |
| `split/participants/from-person` | POST | --T--- |
| `split/participants` | POST,DELETE | --T--- |
| `split` | GET | --T--- |
| `split/seed` | POST | --T--- |
| `store/apply-free` | POST | SR---- |
| `store/checkout` | POST | SR---- |
| `store/entitlements` | GET | S----- |
| `story-chips` | POST | SR---- |
| `story-draft` | POST | SR---- |
| `stripe/webhook` | POST | ----W- |
| `studio/asset` | POST | SR---- |
| `studio/draft` | POST | SR---- |
| `studio/rewrite` | POST | SR---- |
| `suite/proofs` | POST | SR---- |
| `tasks` | GET,POST,PATCH,DELETE | SR---- |
| `threads` | GET,POST | SR---- |
| `time-capsule` | POST,GET,DELETE | SR---- |
| `toasts` | POST,GET,PATCH | S----- |
| `translate` | POST | S----- |
| `upload` | POST | S----- |
| `user-media/backfill` | POST | S----- |
| `user-media` | GET,PATCH,DELETE | S----- |
| `user/avatar` | POST,DELETE | SR---- |
| `user/delete-account` | POST | SR---- |
| `user/export-data` | POST | SR---- |
| `user/preferences` | GET,PATCH | S----- |
| `vendor-packet/[token]` | GET | -RT--- |
| `vendors/book/packet` | POST | --T--- |
| `vendors/book` | GET,POST,PATCH,DELETE | --T--- |
| `vendors/click` | POST | SR---- |
| `vendors/directory` | GET | ------ |
| `vendors` | GET,POST,PATCH,DELETE | S----- |
| `venue/photo` | GET | ------ |
| `venue` | GET,POST,PATCH,DELETE | S----- |
| `venue/search` | GET | -R---- |
| `voice-dna/analyze` | POST,GET | S----- |
| `voice-dna/transcribe` | POST | S----- |
| `weather/climate` | GET | ------ |
| `webhooks/resend` | POST | ----W- |
| `whispers/count` | GET | S----- |
| `whispers` | GET,PATCH | S----- |
| `wizard/draft` | POST | SR---- |
| `wizard/listen` | POST | SR---- |
| `wizard/smart-palette` | POST | SR---- |

*End of audit.*
