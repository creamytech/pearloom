# The guests / pearloom_guests fork — consumer survey (2026-08-12)

> The execution map for **G.1b** (REVAMP-EXECUTION-PLAN §4): merging
> `pearloom_guests` into `guests` and retiring the fork. Produced by
> a full-repo sweep during Sprint G; G.1a (shipped the same day)
> already converged `pearloom_guests.site_id` on **sites.id as
> text** (migration `20260812_pearloom_guests_site_key.sql`), fixed
> the subdomain-assuming purge/export routes to sweep both keys, and
> repaired the five routes that passed a uuid into the
> subdomain-only `getSiteConfig`.

## Per-file consumer table

| File | Verb | Columns touched | Token column | Via helper? |
|---|---|---|---|---|
| `src/lib/event-os/db.ts` `getGuestByToken` | READ + INSERT (the only live writer) | R: `*`; W: `site_id, display_name, email, guest_token` | `guest_token`, bridges `guests.passport_token` | is the adapter seed |
| `src/lib/event-os/db.ts` `listGuests` | READ | `*` by site_id | — | helper |
| `src/lib/event-os/db.ts` `upsertGuest` | UPSERT | unbounded partial | — | **dead code** (no callers) |
| `src/lib/people.ts` `resolveGuestToken` | READ | `id, site_id, display_name, email, person_id` | `guest_token` after `guests.passport_token` miss | direct; bridges to `guests` by (site_id, ilike email) |
| `src/lib/event-os/film.ts` | READ | `*` by site_id (uuid) | — | direct |
| `src/app/g/[token]/page.tsx` | READ | via `getGuestByToken` (cache()-deduped) | both | yes |
| `src/app/api/guest-passport/[token]/route.ts` | READ | `*` by guest_token | `guest_token` | direct |
| `src/app/api/guest-passport/[token]/submit/route.ts` | READ | `id, site_id, display_name`; site_id passed through onto whispers/time_capsule/song_requests | `guest_token` | direct |
| `src/app/api/guest-passport/[token]/subscribe/route.ts` | READ | `id, site_id` → guest_push_subscriptions.site_id | `guest_token` | direct |
| `src/app/api/guestbook/route.ts` | READ | `id` by guest_token | `guest_token` | direct |
| `src/app/api/guest-photos/route.ts` | READ | `id` by guest_token | `guest_token` | direct |
| `src/app/api/memory-weave/route.ts` | READ | profile cols by site_id (uuid) | — | direct |
| `src/app/api/memory-weave/invite/route.ts` | READ | embedded join via memory_prompts | `guest_token` | direct |
| `src/app/api/save-the-date/send/route.ts` | READ | `email, guest_token` by site_id (uuid) | `guest_token` | direct |
| `src/app/api/pear-sms/route.ts` | READ ×2 | phone/profile cols by site_id (uuid) | — | direct |
| `src/app/api/seatmate-intros/route.ts` | READ | profile cols by site_id (uuid) | — | direct |
| `src/app/api/passport-cards/route.ts` | READ | `id, display_name, guest_token, home_city, relationship_to_host, side` by site_id | `guest_token` | direct |
| `src/app/api/sms/inbound/route.ts` | READ | `id, display_name, site_id, phone` by phone | — | direct; unions with `guests` |
| `src/app/api/messages/route.ts` | READ | via `resolveGuestToken` | both | yes |
| `src/app/api/user/export-data/route.ts` | READ | `*` (dual-key sweep since G.1a) | — | direct |
| `src/app/api/user/delete-account/route.ts` | DELETE | dual-key sweep since G.1a | — | direct |
| `src/app/sites/[domain]/upload/page.tsx` | READ | `display_name` by guest_token | `guest_token` | direct |
| `src/lib/database.types.ts` | types | **STALE** — regenerate during G.1b | — | — |

## Column surface the adapter must carry

Named in code: `id, site_id, guest_token, display_name, email, phone,
home_city, relationship_to_host, side, notes, person_id`.
Via `select('*')` / the `PearloomGuest` interface: `event_id,
pronunciation, pronouns, home_country, is_plus_one_of, language,
dietary, accessibility, metadata, created_at`.

## Column parity with `guests` (the G.1b merge work)

- Direct: `id, email, phone, notes, created_at, person_id, guest_token`
  (guest_token exists on guests but has **no unique index** — add one
  before it becomes a lookup key).
- Rename: `display_name` → `guests.name`.
- Type/semantic breaks: `site_id` (text uuid vs `uuid REFERENCES
  sites(id)`); `home_city/home_country` vs guests' mailing-address
  `city/country` (do NOT collapse silently); `dietary text[]` vs
  `dietary_restrictions text`.
- pearloom_guests-only (add to guests or a side profile table):
  `event_id, pronunciation, pronouns, relationship_to_host, side,
  is_plus_one_of, language, accessibility, metadata`.

## Everything pointing at pearloom_guests(id) — must be rekeyed in G.1b

Hard FKs (13): `pearloom_guests.is_plus_one_of` (self, SET NULL) ·
`relationship_graph.from_guest_id`/`to_guest_id` (CASCADE) ·
`guest_personalization.guest_id` (UNIQUE, CASCADE) ·
`voice_toasts.guest_id` (SET NULL) · `memory_prompts.guest_id`
(CASCADE) · `whispers.guest_id` (CASCADE) · `time_capsule.guest_id`
(CASCADE) · `song_requests.guest_id` (CASCADE) ·
`seatmate_intros.guest_id` (UNIQUE, CASCADE) ·
`pear_sms_drafts.guest_id` (UNIQUE, CASCADE) ·
`guest_photos.guest_id` (SET NULL) · `guestbook.guest_id` (SET NULL).
Soft: `guest_push_subscriptions.guest_id` (no FK).
Triggers: none. One SECURITY DEFINER function writes it:
`link_guests_to_people` (sets person_id; already casts both site_id
shapes).

## G.1b execution sketch

1. Add missing columns to `guests` (or a `guest_profiles` side
   table keyed by guests.id) + a unique index on guests.guest_token.
2. Backfill: for every pearloom_guests row, find-or-create the
   guests row by (site uuid, lower(email)) — else insert; copy the
   profile columns; record old_id → new_id.
3. Rekey the 13 FKs + guest_push_subscriptions via the mapping.
4. Swap every consumer above to `guests` through the adapter
   (extend lib/event-os/db.ts); regenerate database.types.ts.
5. Fence: grep-test — no `from('pearloom_guests')` outside the
   adapter; passport-phone + rsvp-honesty + doorway e2e green.
6. Retire: drop the table once a full release cycle is quiet.
