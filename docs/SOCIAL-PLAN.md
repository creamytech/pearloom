# SOCIAL-PLAN.md — the Pearloom social layer + Apple surfaces

> **Master plan for the "add friends, chat in-product, live on the
> phone" direction.** Written to be executed across a series of build
> sessions (the way `GRAND-PLAN.md` was), each phase ~1–2 sessions with
> its own done-criteria.
>
> Read `BRAND.md` §1–3, §7, §9 and `CLAUDE-PRODUCT.md` §1 first — the
> tension this plan resolves is a brand tension, not a technical one.
>
> Drafted 2026-07-07.

---

## 0 · The thesis (read this before anything else)

**Pearloom is not becoming a social network. It is surfacing the social
graph that celebrations already create.**

Every event already produces a real, warm, consent-worthy graph: the
people you invited, the people who invited you, the people you were
seated next to, toasted with, split a house with. Today that graph is
locked inside individual events. The whole plan is one move: **let that
graph exist between events, and make it useful before the next one.**

The one-line product promise: **"the people you've celebrated with."**
Not followers. Not a feed. Not strangers a recommender pushed at you.

Why this framing matters: it's the difference between a feature that
*deepens* Pearloom and a pivot that *breaks* it. A cold social network
would fight our brand (Hermès / Penguin / Linear, never Facebook) and
our physics (episodic users, empty graphs, no daily-active hook). The
celebration graph has neither problem — it seeds itself from real events
and it's intimate by construction. It is, if anything, *more* on-brand
than what we have: a craft house for memory should remember the people,
not just the paper.

**This reconciles the 2026-06-11 decision log** ("full social network
rejected — episodic users, cold-start, brand mismatch; the event graph
is the social layer"). We are not overturning that. We are executing the
second half of that sentence.

---

## 1 · Where we already are (the substrate — don't rebuild it)

More of this exists than it feels like. Inventory before you build:

| Concern | Lives at | State |
|---|---|---|
| Persistent identity (one human across events) | `people` table (`20260621_people.sql`), `person_id` on guests, `src/lib/people.ts` | **Solid.** Email-keyed, deny-anon RLS, backfilled, failure-tolerant. |
| Friend graph (mutual-consent) | `friendships` (`20260706_friendships.sql`), `src/lib/friends.ts` | **Solid but young.** `listFriends`, `pendingIncoming`, `friendCandidates`, `requestFriend`, `respondFriend`, `isRequestable`. |
| Host-side circle UI | `/dashboard/circle`, `src/components/marketing/design/dash/DashCircle.tsx`, `/api/friends` | **New (this week).** Opt-in, request/accept/decline, "add to an event" via `/api/split/participants/from-person`. |
| Guest-side circle | `/g/[token]` → `GuestCircleCards`, `YourCelebrationsCard`, `HostYourOwnCard`, `/api/guest/friends`, `/api/guest/connections` | **Thin.** Recognition + opt-in toggle; first-names-only `familiarFacesForPerson` (mutual opt-in enforced in-query). |
| Messaging | `site_messages` (`20260622_event_graph_phase2.sql`), `/api/messages`, `/api/messages/host`, `/dashboard/messages` | **Event-scoped only.** `thread='party'` (event-wide) + `thread='dm'` (host↔guest). Realtime = content-free pings on `pl-msg-${siteId}`. |
| Share cards | `/api/og/route.tsx` | Per-occasion OG images (28 occasions, solo-honoree layouts). |
| Installable site | `src/app/sites/[domain]/manifest.webmanifest/route.ts` | Per-**published-site** PWA manifest. No app-level manifest; no push; no Wallet; no native. |

**The gaps this plan fills:** (1) the circle is event-first, not
people-first — you can't build a circle *before* an event; (2) chat is
bolted to a single site — there's no person-to-person thread; (3) the
circle doesn't yet *pay you back* at invite time (the retention loop);
(4) nothing lives on the phone between events.

---

## 2 · The design laws (the guardrails that keep this Pearloom)

Every phase below is checked against these. If a feature needs one
broken, it doesn't ship — it gets redesigned.

1. **The graph is earned, never followed.** You connect with people
   you've actually celebrated with (or been invited by), or someone you
   invite by hand. No "people you may know," no suggested strangers, no
   discovery of accounts you have no real tie to.
2. **Consent-first, first-names-first.** Connection is mutual. Default
   visibility is a first name + a mark. Nothing about a person is
   exposed to another without both opting in. (Already the `friendships`
   contract — keep it absolute.)
3. **No feed. Ever.** The forbidden object is an infinite scroll of
   other people's activity. We ship exactly two social objects: a
   **Circle** (your people) and **Threads** (bounded conversations).
   That's the whole surface area.
4. **Every social action serves a celebration.** Add someone → so you
   can weave them into the next event in one tap. Chat → to plan a gift,
   a toast, a trip. The social layer is *in service of* Compose /
   Conduct / Remember, never a standalone time-sink.
5. **Woven vocabulary.** *Circle*, *thread*, *weave someone in*, *the
   people you've celebrated with*. Never *friends list*, *followers*,
   *feed*, *DM*, *social* (in UI copy). Internal ids can say whatever.
6. **Pear is a person in the room.** Pear lives inside threads (draft a
   toast, propose a date, suggest a gift) — the concierge, not a bot in
   a stream.
7. **Calm by default.** Read receipts, typing indicators, presence
   dots — all opt-in or absent. No engagement-bait, no red-badge
   anxiety. Notifications are gentle and batched.

---

## 3 · The build phases

Ordered by leverage. Each is scoped to ~1–2 Fable-5 sessions.

### Phase S1 — The Circle becomes people-first — **SHIPPED 2026-07-08**
*Goal: you can build a circle before, and independent of, any event.*

> **Status:** all three deliverables live. Invite-by-email needed ZERO
> new tables — the email-keyed `people` upsert IS the claim mechanism
> (`inviteToCircle` in `src/lib/friends.ts`: resolvePersonId + a normal
> pending friendship; the request greets the invitee on first sign-in).
> `/api/friends` grew `action:'invite'` (10/hr per-person cap — invite
> upserts people rows, so it must not become an enumeration vector) and
> `outgoing` in GET. The person card: `personCard()` re-verifies the
> ACCEPTED friendship server-side, then first name + shared PUBLISHED
> celebrations (drafts stay private — the passport rule) + dietary;
> served by `/api/friends/person` (404 === not-yours, deliberately
> indistinguishable). `/dashboard/circle` now holds: requests, your
> people (chips open the person card), WAITING ON (pending outgoing),
> INVITE SOMEONE NEW, and discovery. Tests pin normalizeInviteEmail +
> sharedSiteIds + the decideRequest handshake (invite reuses it, so
> consent semantics are inherited).
> **Onboarding tie-in:** `docs/ONBOARDING-PLAN.md` (drafted same day)
> — M4 renders pendingIncoming as sealed envelopes on first sign-in.

- **Add-by-invite, pre-event.** Today you can only add friends found as
  event candidates. Add: invite to your circle directly by email / phone
  / share-link. A `person` can be a circle member with **zero** shared
  events. (Extend `/api/friends` POST with an `invite` action that
  upserts a `people` row + a pending `friendship`; a claim link resolves
  on their first sign-in via the existing `resolvePersonId`.)
- **The person card.** A minimal, private profile: first name, mark,
  the celebrations you share, and known facts already captured (dietary,
  city). Visible only to mutual connections. **Not** a public,
  crawlable profile — noindex, token/session-gated.
- **Circle home refresh.** `/dashboard/circle` becomes the real hub:
  your people, pending both directions, and "invite someone new."
- **Done when:** a host with no events can invite someone, that person
  accepts on first sign-in, and both see each other in their circle
  with first-name-only visibility. Tests pin the consent gate.

### Phase S2 — Threads: conversation beyond the event
*Goal: message anyone in your circle, not just within one site.*

- **Generalize the DM.** Today `site_messages` requires a `site_id`.
  Introduce a person-pair thread (either `site_id` nullable + a
  `person_lo/person_hi` pair key, or a small `conversations` +
  `messages` pair — pick in the design step; reuse the RLS pattern and
  the Realtime ping shape verbatim).
- **1:1 threads** between mutual connections. **Crew threads** for a
  celebration's planning group (co-hosts, the wedding party) that
  persist across the sub-event arc — this hooks the existing
  `celebrations` / weekend model, so the bachelor + rehearsal + wedding
  share one crew line.
- **Pear in the thread.** @-mention Pear to draft a toast, propose a
  date poll, or suggest a gift from the registry — the concierge already
  exists (`/api/pear-chat`), just mounted in a new surface.
- **Realtime, calm.** Extend the `pl-msg-*` broadcast channel to person
  threads; keep content-free pings + token/session-authed refetch.
  Presence/receipts off by default.
- **Done when:** two mutual connections hold a 1:1 thread with live
  delivery, a crew thread spans two sibling events, and Pear can draft
  into a thread. Moderation/hide parity with the host thread.

### Phase S3 — Weave-in: the circle pays you back *(the retention loop)*
*Goal: the more you use Pearloom, the faster the next event is to fill.*

This is the single highest-leverage phase — it's the network effect
*and* it's pure convenience (on-brand).

- **"Weave in from your circle"** everywhere you currently type guest
  emails: the wizard's guest step, `/dashboard/guests` add-dialog, the
  split-participant picker, Studio send. Pick from your circle instead
  of retyping. (The `from-person` seeding primitive already exists —
  generalize it beyond split.)
- **Reciprocal recognition.** When you weave someone in, the existing
  "familiar face" chip fires; after the event, both are offered a mutual
  add-to-circle (opt-in).
- **Done when:** creating a second event lets a host populate the guest
  list from their circle without typing an address, and measured
  time-to-first-invite on event #2 drops materially vs. event #1.

### Phase S4 — The connective tissue
*Goal: it feels like one calm product, not four bolted-on surfaces.*

- **Unified circle notifications** in the existing bell: connection
  requests, new thread messages, "someone you've celebrated with is
  hosting → you may be invited" (a gentle nudge, **not** an activity
  feed). Deterministic `createdAt` so read-state sticks (the bell's
  established pattern).
- **Light presence, inside a thread only.** Optional "active now" scoped
  to an open conversation — never a global green dot.
- **Circle across celebrations.** Extend "Around your day" /
  `weekend-arcs` to "the people across your celebrations" — a deduped,
  consented roster.
- **Done when:** every social event routes through one notification
  model with sticky read-state, and there is still no global feed.

### Phase S5 — Growth loops that don't sell the brand out
*Goal: organic growth from real celebration, zero dark patterns.*

- **Post-event add-to-circle.** After a celebration, "add the people you
  just celebrated with" (opt-in, mutual, first-names). This is the
  engine — every guest is a latent circle member, seeded by a real
  shared day.
- **Optional consent-first contact import** — matched only against
  people already in the graph, never address-book spam.
- **Invite = the funnel.** A guest invited to their first event is one
  claim-link away from an account + a circle. No viral coercion, no
  "invite 10 friends to unlock." Warmth is the growth strategy.
- **Done when:** a new user's most common path in is "I was invited to a
  celebration," and the post-event add-to-circle has a real opt-in rate.

---

## 4 · Apple surfaces — the "live preview" track

Short version of the landscape, because "Apple live preview" spans five
different things with very different cost. Split into **web-achievable
now** vs. **needs a native companion app**.

### Web-achievable now (no native app, real wins)

- **① Apple Wallet event passes — the sleeper hit.** A guest taps "Add
  to Apple Wallet" and the celebration becomes a pass: date, venue, their
  table, a scannable check-in code. It sits on the Lock Screen near the
  event time/location, and — critically — it **updates live**: change the
  start time or the gate and every guest's pass silently refreshes.
  Generated server-side as a signed `.pkpass`, updated via a small web
  service + APNs push. **No native app required.** This is the closest
  thing to a "Live Activity" a web product can ship, and it's a genuine
  day-of upgrade. *(Needs one Apple Pass Type ID cert.)*
- **② Richer link previews.** We already emit per-occasion OG cards
  (`/api/og`). Make them dynamic — live RSVP count, days-to-go — so a
  link dropped in Messages/iMessage previews the *current* state of the
  celebration, not a static poster.
- **③ iOS Web Push via installed PWA.** iOS 16.4+ supports Web Push for
  home-screen-installed web apps. We already ship a per-site
  `manifest.webmanifest`. An app-level manifest + push subscription gives
  day-of alerts and new-message pings on iPhone with no App Store at all.

### Needs a native companion app (a real, separate investment)

- **④ Live Activities + Dynamic Island.** The live day-of countdown /
  "next up: toasts" / live RSVP tally on the Lock Screen and Dynamic
  Island. Genuinely magical for the Conduct pillar — but ActivityKit is
  **native-only**, pushed via APNs. Requires a thin native app (or at
  least a widget extension). Flag as a native track, not a web sprint.
- **⑤ App Clips.** Tap an App Clip Code / NFC / QR at the venue → a
  lightweight native RSVP / seating / toast-queue experience with no full
  install. Also native-only (App Clip target + associated domains).

**Recommendation:** ship ①②③ on the web track (Wallet passes first —
best effort-to-magic ratio, and it makes the day-of *live* on the phone
without an app). Treat ④⑤ as a deliberate "Pearloom native companion"
decision, scoped on its own, once the web social layer has pull.

*(If by "live preview" you meant specifically the Dynamic-Island
countdown — that's ④, and it needs the native app. If you meant the
iMessage rich card — that's ②, and we're 80% there already.)*

---

## 5 · Two forks — DECIDED (2026-07-07)

> **Locked:** Fork A → **Circle-on-celebrations**. Fork B →
> **Web-first**. Build to the recommended path below; do not re-open
> without a new owner decision.

Everything above assumes these answers; both change sequencing.

**Fork A — the ambition dial.**
- *Recommended:* **Circle-on-celebrations** — the graph is earned from
  real events, private by default, no public profiles, no discovery. On
  brand, self-seeding, defensible.
- *Alternative:* a **fuller social product** — public profiles, people
  discovery, richer presence. Bigger TAM story, but fights the brand and
  re-opens the cold-start problem the 2026-06-11 decision closed.

**Fork B — native appetite.**
- *Recommended:* **Web-first** — Wallet passes + dynamic OG + iOS Web
  Push now; native (Live Activities / App Clips) later, as its own track.
- *Alternative:* **commit to a native companion now** — unlocks Dynamic
  Island + App Clips sooner, but it's a separate codebase, cert/App-Store
  overhead, and pulls sessions away from the social layer.

---

## 6 · Recommended sequencing for the build sessions

1. **S1 — Circle people-first** (the foundation; unblocks everything).
2. **S3 — Weave-in loop** (do the retention loop *early* — it's the
   payoff that makes S1 worth having, and it's low-risk convenience).
3. **S2 — Threads** (chat beyond the event; the second big ask).
4. **Apple ① Wallet passes** (parallelizable; one cert + a signing route
   — makes the product live on the phone with no native app).
5. **S4 — connective tissue**, then **S5 — growth loops**.
6. **Apple ②③** fold in alongside S2/S4.
7. **Native ④⑤** only after Fork B is decided yes.

Each session: read `BRAND.md` §7 + these design laws, migrate + apply to
prod + `get_advisors`, `tsc`/`eslint`/`vitest`/`build` clean, update
`CLAUDE-PRODUCT.md` §2/§10 and this file's phase status.

---

*End of SOCIAL-PLAN.md. Living doc — update phase status as each ships.*
