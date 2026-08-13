-- ─────────────────────────────────────────────────────────────
-- Pearloom / 20260812_guest_spine_merge.sql — Sprint G.1b
--
-- THE FORK COLLAPSE. pearloom_guests (the identity/profile half of
-- the guest world) merges into guests (the roster/RSVP half), which
-- becomes the ONE canonical guest row. docs/FORK-SURVEY.md is the
-- consumer map this executes.
--
--   1. guests gains the nine profile columns only pearloom_guests
--      had (+ dietary/accessibility arrays + metadata).
--   2. Every pearloom_guests row lands in guests: matched by
--      (site uuid, lower(email)) → profile columns fill the gaps;
--      unmatched → a fresh guests row. _pearloom_guest_merge_map
--      records old→new ids (permanent, for audit + idempotency).
--   3. The 12 child tables that FK'd pearloom_guests(id) are
--      rekeyed to the new guests ids and their FKs now reference
--      guests(id) with the original delete semantics.
--   4. guests.guest_token gets the unique index token lookups
--      always assumed.
--
-- pearloom_guests itself is NOT dropped — it stays as the frozen
-- safety net for one release cycle (commented DEPRECATED). Code
-- stops reading it (the grep fence enforces that).
-- Idempotent: re-running is a no-op at every phase.
-- ─────────────────────────────────────────────────────────────

-- ── 1 · The profile columns ──────────────────────────────────
ALTER TABLE guests ADD COLUMN IF NOT EXISTS event_id uuid;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS pronunciation text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS pronouns text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS home_city text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS home_country text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS relationship_to_host text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS side text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS is_plus_one_of uuid;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS dietary text[];
ALTER TABLE guests ADD COLUMN IF NOT EXISTS accessibility text[];
ALTER TABLE guests ADD COLUMN IF NOT EXISTS metadata jsonb;

-- ── 2 · The merge ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS _pearloom_guest_merge_map (
  old_id uuid PRIMARY KEY,
  new_id uuid NOT NULL,
  merged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE _pearloom_guest_merge_map ENABLE ROW LEVEL SECURITY;

-- 2a · Matched: same site (uuid-as-text since G.1a), same email.
INSERT INTO _pearloom_guest_merge_map (old_id, new_id)
SELECT DISTINCT ON (pg.id) pg.id, g.id
FROM pearloom_guests pg
JOIN sites s ON s.id::text = pg.site_id
JOIN guests g ON g.site_id = s.id
  AND pg.email IS NOT NULL AND g.email IS NOT NULL
  AND lower(g.email) = lower(pg.email)
ORDER BY pg.id, g.created_at ASC NULLS LAST, g.id
ON CONFLICT (old_id) DO NOTHING;

-- Profile columns fill the matched rows' gaps (never clobber).
UPDATE guests g SET
  event_id             = COALESCE(g.event_id, pg.event_id),
  pronunciation        = COALESCE(g.pronunciation, pg.pronunciation),
  pronouns             = COALESCE(g.pronouns, pg.pronouns),
  home_city            = COALESCE(g.home_city, pg.home_city),
  home_country         = COALESCE(g.home_country, pg.home_country),
  relationship_to_host = COALESCE(g.relationship_to_host, pg.relationship_to_host),
  side                 = COALESCE(g.side, pg.side),
  language             = COALESCE(g.language, pg.language),
  dietary              = COALESCE(g.dietary, pg.dietary),
  accessibility        = COALESCE(g.accessibility, pg.accessibility),
  metadata             = COALESCE(g.metadata, pg.metadata),
  phone                = COALESCE(g.phone, pg.phone),
  notes                = COALESCE(g.notes, pg.notes),
  person_id            = COALESCE(g.person_id, pg.person_id),
  guest_token          = COALESCE(g.guest_token, pg.guest_token)
FROM _pearloom_guest_merge_map m
JOIN pearloom_guests pg ON pg.id = m.old_id
WHERE g.id = m.new_id;

-- 2b · Unmatched: fresh guests rows (site must resolve).
WITH unmatched AS (
  SELECT pg.*, s.id AS site_uuid
  FROM pearloom_guests pg
  JOIN sites s ON s.id::text = pg.site_id
  WHERE NOT EXISTS (SELECT 1 FROM _pearloom_guest_merge_map m WHERE m.old_id = pg.id)
), ins AS (
  INSERT INTO guests (
    site_id, name, email, status, guest_token, created_at,
    event_id, pronunciation, pronouns, home_city, home_country,
    relationship_to_host, side, language, dietary, accessibility,
    metadata, phone, notes, person_id
  )
  SELECT
    site_uuid, COALESCE(NULLIF(display_name, ''), email, 'Guest'), email, 'pending',
    guest_token, COALESCE(created_at, now()),
    event_id, pronunciation, pronouns, home_city, home_country,
    relationship_to_host, side, language, dietary, accessibility,
    metadata, phone, notes, person_id
  FROM unmatched
  RETURNING id, guest_token
)
INSERT INTO _pearloom_guest_merge_map (old_id, new_id)
SELECT u.id, i.id
FROM unmatched u
JOIN ins i ON i.guest_token = u.guest_token
ON CONFLICT (old_id) DO NOTHING;

-- 2c · is_plus_one_of pointed at pearloom_guests ids — remap.
UPDATE guests g SET is_plus_one_of = m2.new_id
FROM _pearloom_guest_merge_map m1
JOIN pearloom_guests pg ON pg.id = m1.old_id
JOIN _pearloom_guest_merge_map m2 ON m2.old_id = pg.is_plus_one_of
WHERE g.id = m1.new_id AND pg.is_plus_one_of IS NOT NULL
  AND g.is_plus_one_of IS DISTINCT FROM m2.new_id;

-- ── 3 · Rekey the children ───────────────────────────────────
-- UNIQUE(guest_id) tables first: when two old rows merged into one
-- guests row, keep one child row (ctid-ordered) so the remap can't
-- collide.
DELETE FROM guest_personalization t
USING _pearloom_guest_merge_map m
WHERE t.guest_id = m.old_id
  AND EXISTS (
    SELECT 1 FROM guest_personalization t2
    JOIN _pearloom_guest_merge_map m2 ON t2.guest_id = m2.old_id
    WHERE m2.new_id = m.new_id AND t2.ctid < t.ctid
  );
DELETE FROM seatmate_intros t
USING _pearloom_guest_merge_map m
WHERE t.guest_id = m.old_id
  AND EXISTS (
    SELECT 1 FROM seatmate_intros t2
    JOIN _pearloom_guest_merge_map m2 ON t2.guest_id = m2.old_id
    WHERE m2.new_id = m.new_id AND t2.ctid < t.ctid
  );
DELETE FROM pear_sms_drafts t
USING _pearloom_guest_merge_map m
WHERE t.guest_id = m.old_id
  AND EXISTS (
    SELECT 1 FROM pear_sms_drafts t2
    JOIN _pearloom_guest_merge_map m2 ON t2.guest_id = m2.old_id
    WHERE m2.new_id = m.new_id AND t2.ctid < t.ctid
  );

-- CASCADE children.
ALTER TABLE guest_personalization DROP CONSTRAINT IF EXISTS guest_personalization_guest_id_fkey;
UPDATE guest_personalization t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE guest_personalization ADD CONSTRAINT guest_personalization_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

ALTER TABLE memory_prompts DROP CONSTRAINT IF EXISTS memory_prompts_guest_id_fkey;
UPDATE memory_prompts t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE memory_prompts ADD CONSTRAINT memory_prompts_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

ALTER TABLE whispers DROP CONSTRAINT IF EXISTS whispers_guest_id_fkey;
UPDATE whispers t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE whispers ADD CONSTRAINT whispers_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

ALTER TABLE time_capsule DROP CONSTRAINT IF EXISTS time_capsule_guest_id_fkey;
UPDATE time_capsule t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE time_capsule ADD CONSTRAINT time_capsule_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

ALTER TABLE song_requests DROP CONSTRAINT IF EXISTS song_requests_guest_id_fkey;
UPDATE song_requests t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE song_requests ADD CONSTRAINT song_requests_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

ALTER TABLE seatmate_intros DROP CONSTRAINT IF EXISTS seatmate_intros_guest_id_fkey;
UPDATE seatmate_intros t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE seatmate_intros ADD CONSTRAINT seatmate_intros_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

ALTER TABLE pear_sms_drafts DROP CONSTRAINT IF EXISTS pear_sms_drafts_guest_id_fkey;
UPDATE pear_sms_drafts t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE pear_sms_drafts ADD CONSTRAINT pear_sms_drafts_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

-- relationship_graph carries two guest FKs.
ALTER TABLE relationship_graph DROP CONSTRAINT IF EXISTS relationship_graph_from_guest_id_fkey;
ALTER TABLE relationship_graph DROP CONSTRAINT IF EXISTS relationship_graph_to_guest_id_fkey;
UPDATE relationship_graph t SET from_guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.from_guest_id = m.old_id;
UPDATE relationship_graph t SET to_guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.to_guest_id = m.old_id;
ALTER TABLE relationship_graph ADD CONSTRAINT relationship_graph_from_guest_id_fkey
  FOREIGN KEY (from_guest_id) REFERENCES guests(id) ON DELETE CASCADE;
ALTER TABLE relationship_graph ADD CONSTRAINT relationship_graph_to_guest_id_fkey
  FOREIGN KEY (to_guest_id) REFERENCES guests(id) ON DELETE CASCADE;

-- SET NULL children.
ALTER TABLE voice_toasts DROP CONSTRAINT IF EXISTS voice_toasts_guest_id_fkey;
UPDATE voice_toasts t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE voice_toasts ADD CONSTRAINT voice_toasts_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL;

ALTER TABLE guest_photos DROP CONSTRAINT IF EXISTS guest_photos_guest_id_fkey;
UPDATE guest_photos t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE guest_photos ADD CONSTRAINT guest_photos_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL;

ALTER TABLE guestbook DROP CONSTRAINT IF EXISTS guestbook_guest_id_fkey;
UPDATE guestbook t SET guest_id = m.new_id FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;
ALTER TABLE guestbook ADD CONSTRAINT guestbook_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL;

-- No-FK holder of the id.
UPDATE guest_push_subscriptions t SET guest_id = m.new_id
FROM _pearloom_guest_merge_map m WHERE t.guest_id = m.old_id;

-- pearloom_guests' self-FK would block child deletes of merged
-- rows later; it references its own table and stays untouched.

-- ── 4 · The token index lookups always assumed ───────────────
UPDATE guests g SET guest_token = NULL
WHERE guest_token IS NOT NULL AND EXISTS (
  SELECT 1 FROM guests g2
  WHERE g2.guest_token = g.guest_token
    AND (g2.created_at < g.created_at
         OR (g2.created_at = g.created_at AND g2.id < g.id))
);
CREATE UNIQUE INDEX IF NOT EXISTS guests_guest_token_unique
  ON guests(guest_token) WHERE guest_token IS NOT NULL;

COMMENT ON TABLE pearloom_guests IS
  'DEPRECATED (G.1b, 2026-08-12): merged into guests via 20260812_guest_spine_merge.sql; _pearloom_guest_merge_map records old→new ids. Frozen as a safety net — no code reads or writes this table. Drop after a quiet release cycle.';
