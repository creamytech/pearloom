-- ─────────────────────────────────────────────────────────────
-- Pearloom / supabase/migrations/20260328_wedding_os.sql
-- Wedding OS — venues, seating, registry, AI proposals
-- ─────────────────────────────────────────────────────────────

-- ── Venues ────────────────────────────────────────────────────

CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  site_id text,
  name text NOT NULL,
  formatted_address text,
  place_id text,
  lat numeric,
  lng numeric,
  website text,
  phone text,
  capacity_ceremony int,
  capacity_reception int,
  indoor_outdoor text CHECK (indoor_outdoor IN ('indoor', 'outdoor', 'both')),
  notes text,
  floorplan_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues: user access only"
  ON venues
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE INDEX idx_venues_user_id ON venues(user_id);
CREATE INDEX idx_venues_site_id ON venues(site_id);

-- ── Venue Spaces ──────────────────────────────────────────────

CREATE TABLE venue_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity int,
  width_ft numeric,
  length_ft numeric,
  shape text DEFAULT 'rectangle',
  notes text
);

ALTER TABLE venue_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_spaces: user access via venue"
  ON venue_spaces
  USING (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = venue_spaces.venue_id
        AND v.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = venue_spaces.venue_id
        AND v.user_id = auth.uid()::text
    )
  );

CREATE INDEX idx_venue_spaces_venue_id ON venue_spaces(venue_id);

-- ── Seating Tables ────────────────────────────────────────────

CREATE TABLE seating_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES venue_spaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  label text NOT NULL,
  shape text CHECK (shape IN ('round', 'rectangular', 'banquet', 'square')) DEFAULT 'round',
  capacity int NOT NULL DEFAULT 8,
  x numeric DEFAULT 0,
  y numeric DEFAULT 0,
  rotation numeric DEFAULT 0,
  is_reserved boolean DEFAULT false,
  notes text
);

ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seating_tables: user access only"
  ON seating_tables
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE INDEX idx_seating_tables_user_id ON seating_tables(user_id);
CREATE INDEX idx_seating_tables_space_id ON seating_tables(space_id);

-- ── Seats ─────────────────────────────────────────────────────

CREATE TABLE seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES seating_tables(id) ON DELETE CASCADE,
  seat_number int NOT NULL,
  guest_id uuid,
  meal_preference text
);

ALTER TABLE seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seats: user access via table"
  ON seats
  USING (
    EXISTS (
      SELECT 1 FROM seating_tables t
      WHERE t.id = seats.table_id
        AND t.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seating_tables t
      WHERE t.id = seats.table_id
        AND t.user_id = auth.uid()::text
    )
  );

CREATE INDEX idx_seats_table_id ON seats(table_id);
CREATE INDEX idx_seats_guest_id ON seats(guest_id);

-- ── Seating Constraints ───────────────────────────────────────

CREATE TABLE seating_constraints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  site_id text,
  type text NOT NULL CHECK (type IN ('must_sit_together', 'must_not_sit_together', 'near_exit', 'near_dance_floor', 'avoid_table', 'prefer_table', 'custom')),
  guest_ids uuid[],
  table_id uuid,
  priority int DEFAULT 1,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seating_constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seating_constraints: user access only"
  ON seating_constraints
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE INDEX idx_seating_constraints_user_id ON seating_constraints(user_id);
CREATE INDEX idx_seating_constraints_site_id ON seating_constraints(site_id);

-- ── Registry Sources ──────────────────────────────────────────

CREATE TABLE registry_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  site_id text,
  store_name text NOT NULL,
  registry_url text NOT NULL,
  category text,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE registry_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registry_sources: user access only"
  ON registry_sources
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE INDEX idx_registry_sources_user_id ON registry_sources(user_id);
CREATE INDEX idx_registry_sources_site_id ON registry_sources(site_id);

-- ── Registry Items ────────────────────────────────────────────

CREATE TABLE registry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES registry_sources(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric,
  image_url text,
  item_url text,
  category text,
  priority text CHECK (priority IN ('need', 'want', 'dream')) DEFAULT 'want',
  purchased boolean DEFAULT false,
  notes text
);

ALTER TABLE registry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registry_items: user access via source"
  ON registry_items
  USING (
    EXISTS (
      SELECT 1 FROM registry_sources s
      WHERE s.id = registry_items.source_id
        AND s.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registry_sources s
      WHERE s.id = registry_items.source_id
        AND s.user_id = auth.uid()::text
    )
  );

CREATE INDEX idx_registry_items_source_id ON registry_items(source_id);

-- ── AI Proposals ──────────────────────────────────────────────

CREATE TABLE ai_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  site_id text,
  type text CHECK (type IN ('seating', 'registry', 'vendor', 'timeline')),
  proposal jsonb NOT NULL,
  explanation text,
  applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_proposals: user access only"
  ON ai_proposals
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE INDEX idx_ai_proposals_user_id ON ai_proposals(user_id);
CREATE INDEX idx_ai_proposals_site_id ON ai_proposals(site_id);
