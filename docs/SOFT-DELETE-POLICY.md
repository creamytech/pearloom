# Pearloom — Soft-delete & deletion policy

**Status:** authoritative as of **2026-05-29** (Phase 1.6 of [AUDIT-2026-05-29.md](AUDIT-2026-05-29.md)).
**Audience:** anyone adding a Supabase migration or writing a `delete` query in this codebase.

---

## The principle

> A row can disappear from a user's view for three different reasons. Each reason has a different storage shape. Don't mix them up.

| Reason | Mechanism | Recoverable? |
|---|---|---|
| **User chose to delete their account** | Hard `DELETE` cascade (`/api/user/delete-account`) | No — GDPR right-to-be-forgotten |
| **User chose to retract one contribution** (mark, claim, opt-out) | Per-feature timestamp column (`withdrawn_at`, `revoked_at`, `opted_out_at`) | Yes — the user can re-engage |
| **Host moderated content out of view** | Per-feature state column (`state`, `moderation_status`) | Yes — host can re-approve |

These three mechanisms are **independent**. Account-delete fires the cascade; it does not care whether a row was previously retracted or moderated. Retract + moderate keep the data; only account-delete makes it irretrievable.

---

## What lives in the schema today

Catalogued by sweeping `supabase/migrations/` on 2026-05-29.

### A) Retraction columns — user-initiated "I withdraw this"

These are nullable timestamps. The presence of a value means the user-author retracted; the row stays in place so other features still resolve foreign keys, but read queries filter by `WHERE column IS NULL`.

| Table | Column | Semantic |
|---|---|---|
| `community_marks` | `withdrawn_at timestamptz` | Guest's kudos — withdrawn means the kudos no longer counts toward couple's totals, but the record persists for audit |
| `registry_link_claims` | `revoked_at timestamptz` | A guest's intent-to-buy claim — revoked means the item reopens for someone else to claim; row stays for receipt/refund history |
| `anniversary_email_log` | `opted_out_at timestamptz` (via site_email_prefs) | User opted out of anniversary emails — log entries remain so we don't accidentally re-send |

**Don't hard-delete these on retract.** Other foreign keys (`community_mark_hearts`, refund flows, anniversary cadence) need the row to exist.

### B) Visibility-state columns — host moderation

These are `text` columns with a CHECK constraint. They model multi-state moderation (approved / hidden / flagged / queued / accepted) and are flipped by host-only UI.

| Table | Column | States |
|---|---|---|
| `tribute_submissions` | `state` | `approved` / `hidden` / `flagged` |
| `guest_photos` | `moderation_status` | `pending` / `approved` / `rejected` |
| `seatmate_intros` | `state` | `queued` / `accepted` / `hidden` |
| `community_marks` | `state` | `pending` / `approved` / etc. |
| `pear_sms_drafts` | `state` | (per-draft lifecycle) |
| `payments` | `state` | `pending` / `succeeded` / `failed` / `refunded` |

**Don't hard-delete on moderation.** The host wants the ability to re-approve, and the audit trail matters.

### C) Reveal/archive boolean columns — feature-specific lifecycle

Booleans that change a row's category without removing it.

| Table | Column | Meaning |
|---|---|---|
| `pear_memories`, `pear_voice_samples` | `archived boolean` | User archived this note/sample from active rotation — Pear's voice trainer ignores `archived=true` |
| `time_capsule` | `revealed boolean` | A sealed capsule has been opened (anniversary year reached) — moves from "sealed" to "visible" |

**Don't conflate `archived = true` with deletion.** The user can un-archive. Pear's voice training filters these out; nothing else does.

### D) Things that look like soft-delete but aren't

| Column | What it actually is |
|---|---|
| `site_invites.accepted_at` | Marks an invite redeemed (not soft-deleted) |
| `live_updates.email_broadcast_at` | Marks "email already sent" for daily-cap counting (not soft-deleted) |
| `pearloom_guests.guest_token` (rotation) | Token rotation; old token becomes invalid (the row stays) |

---

## How account-delete interacts with all of this

`/api/user/delete-account` (Phase 1.5, [route](../src/app/api/user/delete-account/route.ts)) is the **only** path that physically removes rows from B and C tables. It hard-deletes per the catalog below.

**Account-delete cascade order — deliberate:**

1. **Per-site children (subdomain keyed):** `memory_prompts`, `whispers`, `time_capsule`, `song_requests`, `guest_photos`, `guestbook`, `rsvps`, `pearloom_guests`, `registry_item_claims`, `registry_items`, `payments`, `live_updates`, `anniversary_log`, `scheduled_communications`.
2. **Per-site children (uuid keyed):** `guests`, `cohosts`, `cohost_invites`, `site_invites`, `seating_constraints`, `seating_tables`, `venue_spaces`, `venues`.
3. **The sites themselves.**
4. **User-keyed rows:** `user_preferences`, `user_media`, `pear_voice_samples`, `pear_memories`, `events`, `print_jobs`, `scheduled_communications`, `site_email_prefs`, `anniversary_email_log`.
5. **Final sweep:** `community_marks` (rows the user authored), `newsletter_subscribers`.

**What survives anonymized, not deleted:** `guestbook`, `guest_photos`, `time_capsule`, `whispers`, `memory_prompts`, `song_requests` rows where `guest_id` was previously set will have that FK set to `NULL` via existing `ON DELETE SET NULL` constraints. That preserves other co-hosts' visibility into the wedding without exposing the deleted user's identity. **This is intentional.**

---

## When you add a new table

Decide which category your table's "remove" semantics belong in:

| You want… | Column to add | Default | Read pattern |
|---|---|---|---|
| **Author can retract one row** (kudos, claims, opt-outs) | `withdrawn_at timestamptz` (or `revoked_at` if "I changed my mind on a thing I bought") | `NULL` | `WHERE column IS NULL` |
| **Host can moderate visibility** (anything guests can post) | `state text` with CHECK + reasonable enum | `'pending'` or `'approved'` per UX | `WHERE state = 'approved'` |
| **Feature-specific archive** (Pear voice training, etc.) | `archived boolean NOT NULL DEFAULT false` | `false` | `WHERE archived = false` |
| **Account-delete must hard-purge this** (PII, money, photos) | _no column needed_ — add to `SITE_KEYED_DELETES_*` or `USER_KEYED_DELETES` in [`/api/user/delete-account/route.ts`](../src/app/api/user/delete-account/route.ts) | — | — |

**Anti-patterns we've banned:**
- **`is_deleted boolean`** — ambiguous (who deleted? when? recoverable?). Use a named timestamp.
- **`status text` enum with `'deleted'` in it** — same ambiguity; use a separate retraction column so moderation state can be retained.
- **Soft-deleting on account-close instead of cascading** — leaves PII at rest and breaks the GDPR promise.
- **Forgetting to add the table to `SITE_KEYED_DELETES_*`** — if a new table is keyed on `site_id` and stores PII (names, emails, photos, message bodies), it MUST be in the cascade list. The export route ([`/api/user/export-data`](../src/app/api/user/export-data/route.ts)) also needs the table added so users can export what they're about to delete.

---

## Audit checklist when changing this surface

If you add or rename a table:

1. **Cascade list updated?** Open [`/api/user/delete-account/route.ts`](../src/app/api/user/delete-account/route.ts) and add the table to `SITE_KEYED_DELETES_BY_SUBDOMAIN`, `SITE_KEYED_DELETES_BY_UUID`, or `USER_KEYED_DELETES` depending on its ownership column.
2. **Export list updated?** Open [`/api/user/export-data/route.ts`](../src/app/api/user/export-data/route.ts) and add the table to `USER_OWNED_TABLES` or `SITE_OWNED_TABLES` so the user can see what they're about to lose.
3. **Soft-delete classification added here?** Append to the appropriate section above (A/B/C). Don't invent a fourth category — if your new mechanism doesn't fit, push back on the design instead.
4. **RLS deny-anon policy in place?** Required by [CLAUDE-DESIGN.md §14](../CLAUDE-DESIGN.md) for every public-write table.

---

*Last updated: 2026-05-29. Owner: see CLAUDE-DESIGN.md §1 for the data-layer source-of-truth map.*
