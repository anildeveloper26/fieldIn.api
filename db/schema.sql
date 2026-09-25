-- FieldIn database schema
-- Run against a Postgres instance with PostGIS available (e.g. a hosted Postgres such as Aiven).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE txn_type AS ENUM ('earned', 'spent');
CREATE TYPE txn_source AS ENUM ('rvm', 'booking', 'voucher', 'bonus');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  coins_balance INT NOT NULL DEFAULT 0,
  trust_score NUMERIC(3, 1) NOT NULL DEFAULT 5.0,
  punctuality_rate NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  sport_preferences TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users (email);

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  sport_type VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(9, 6) NOT NULL,
  lng DECIMAL(9, 6) NOT NULL,
  geo GEOGRAPHY(Point, 4326) NOT NULL,
  hourly_rate NUMERIC(8, 2) NOT NULL,
  capacity INT NOT NULL,
  crowd_occupancy INT NOT NULL DEFAULT 0,
  weather_condition VARCHAR(30) NOT NULL DEFAULT 'Clear',
  has_live_cam BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_venues_geo ON venues USING GIST (geo);
CREATE INDEX idx_venues_sport ON venues (sport_type);
CREATE INDEX idx_venues_price ON venues (hourly_rate);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  total_amount NUMERIC(9, 2) NOT NULL,
  per_head_amount NUMERIC(9, 2) NOT NULL,
  player_count INT NOT NULL DEFAULT 1,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_venue_slot ON bookings (venue_id, slot_date, slot_start);
CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE UNIQUE INDEX uniq_confirmed_slot ON bookings (venue_id, slot_date, slot_start)
  WHERE status = 'confirmed';

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(150) NOT NULL,
  sport_type VARCHAR(30) NOT NULL,
  venue_id UUID REFERENCES venues (id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  entry_fee NUMERIC(8, 2) NOT NULL,
  max_teams INT NOT NULL,
  registered_teams INT NOT NULL DEFAULT 0,
  prize_pool NUMERIC(9, 2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tournaments_sport ON tournaments (sport_type);
CREATE INDEX idx_tournaments_date ON tournaments (start_date);

CREATE TABLE squad_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues (id) ON DELETE SET NULL,
  sport_type VARCHAR(30) NOT NULL,
  slot_date DATE NOT NULL,
  slot_start TIME NOT NULL,
  total_cost NUMERIC(9, 2) NOT NULL,
  per_head_cost NUMERIC(9, 2) NOT NULL,
  slots_total INT NOT NULL,
  slots_filled INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_squad_sport_date ON squad_requests (sport_type, slot_date);
CREATE INDEX idx_squad_status ON squad_requests (status);

CREATE TABLE solo_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  sport_type VARCHAR(30) NOT NULL,
  available_date DATE NOT NULL,
  available_time TIME NOT NULL,
  max_budget NUMERIC(8, 2),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_solo_sport_active ON solo_availability (sport_type) WHERE is_active;

CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type txn_type NOT NULL,
  source txn_source NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coin_txn_user ON coin_transactions (user_id, created_at DESC);

CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(120) NOT NULL,
  description TEXT,
  coin_cost INT NOT NULL,
  discount_value VARCHAR(50),
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Tracks which captain/user registered a team for a tournament. Not in the brief's
-- minimum schema list, but required to make "Register Full Team" a real, idempotent
-- action instead of an unguarded counter increment.
CREATE TABLE tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  team_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);
CREATE INDEX idx_tournament_reg_tournament ON tournament_registrations (tournament_id);

-- Tracks a player's "Request to Join" against a squad. Auto-accepted for the demo
-- (fills a slot immediately) so the end-to-end flow is real rather than a toast-only stub.
CREATE TABLE squad_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squad_requests (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (squad_id, user_id)
);
CREATE INDEX idx_squad_join_squad ON squad_join_requests (squad_id);

-- Community-uploaded venue gallery photos. Stores the R2/S3 object key rather
-- than a URL so the bucket can switch between private (presigned) and public.
CREATE TABLE venue_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues (id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users (id) ON DELETE SET NULL,
  object_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_venue_images_venue ON venue_images (venue_id, created_at DESC);
