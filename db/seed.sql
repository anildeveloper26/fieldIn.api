-- FieldIn seed data.
-- Run after schema.sql. Safe to re-run: `npm run seed` drops and recreates the
-- public schema first, so this always produces a fresh, fully-seeded database.
--
-- Demo login for every seeded user: password "Password123!"

-- ===== Users =====
-- aditya: healthy coin balance (demos successful voucher redemption)
-- meera: low balance (demos the insufficient-coins error path)
-- rahul: mid balance, used as a squad captain in later matchmaking seed data
-- akash/priya/karan/sanjay: extra athletes so matchmaking/tournaments feel populated
INSERT INTO users (id, name, email, password_hash, coins_balance, trust_score, punctuality_rate, sport_preferences)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Aditya Rao', 'aditya@fieldin.dev', '$2b$10$DxrOMJwmbYBPvqSfrxokoee/hSUC1ZlvSirR7163MGN93rXhfKIRW', 150, 4.8, 96.00, ARRAY['Football', 'Cricket']),
  ('22222222-2222-2222-2222-222222222222', 'Meera Nair', 'meera@fieldin.dev', '$2b$10$DxrOMJwmbYBPvqSfrxokoee/hSUC1ZlvSirR7163MGN93rXhfKIRW', 10, 4.2, 88.00, ARRAY['Badminton']),
  ('33333333-3333-3333-3333-333333333333', 'Rahul Verma', 'rahul@fieldin.dev', '$2b$10$DxrOMJwmbYBPvqSfrxokoee/hSUC1ZlvSirR7163MGN93rXhfKIRW', 60, 4.5, 92.00, ARRAY['Cricket', 'Tennis']),
  ('44444444-4444-4444-4444-444444444444', 'Akash Menon', 'akash@fieldin.dev', '$2b$10$DxrOMJwmbYBPvqSfrxokoee/hSUC1ZlvSirR7163MGN93rXhfKIRW', 80, 4.3, 90.00, ARRAY['Tennis', 'Football']),
  ('55555555-5555-5555-5555-555555555555', 'Priya Sharma', 'priya@fieldin.dev', '$2b$10$DxrOMJwmbYBPvqSfrxokoee/hSUC1ZlvSirR7163MGN93rXhfKIRW', 200, 4.9, 98.00, ARRAY['Basketball', 'Tennis']),
  ('66666666-6666-6666-6666-666666666666', 'Karan Singh', 'karan@fieldin.dev', '$2b$10$DxrOMJwmbYBPvqSfrxokoee/hSUC1ZlvSirR7163MGN93rXhfKIRW', 5, 3.8, 80.00, ARRAY['Football', 'Basketball']),
  ('77777777-7777-7777-7777-777777777777', 'Sanjay Gupta', 'sanjay@fieldin.dev', '$2b$10$DxrOMJwmbYBPvqSfrxokoee/hSUC1ZlvSirR7163MGN93rXhfKIRW', 45, 4.1, 85.00, ARRAY['Cricket']);

-- ===== Venues =====
-- Reference "current location" used by the frontend's default demo location pill: (12.9352, 77.6146)
-- Venues 1-4 fall within ~5km of that point; 5-8 fall outside it, to exercise the PostGIS distance filter.
INSERT INTO venues (id, name, sport_type, address, lat, lng, geo, hourly_rate, capacity, crowd_occupancy, weather_condition, has_live_cam)
VALUES
  ('a1111111-0000-0000-0000-000000000001', 'Koramangala Football Turf', 'Football', 'Koramangala 5th Block, Bengaluru', 12.9352, 77.6146, ST_SetSRID(ST_MakePoint(77.6146, 12.9352), 4326)::geography, 800.00, 14, 45, 'Clear', true),
  ('a1111111-0000-0000-0000-000000000002', 'Jayanagar Cricket Ground', 'Cricket', 'Jayanagar 4th Block, Bengaluru', 12.9250, 77.5938, ST_SetSRID(ST_MakePoint(77.5938, 12.9250), 4326)::geography, 1200.00, 22, 70, 'Cloudy', false),
  ('a1111111-0000-0000-0000-000000000003', 'HSR Badminton Court', 'Badminton', 'HSR Layout Sector 2, Bengaluru', 12.9121, 77.6446, ST_SetSRID(ST_MakePoint(77.6446, 12.9121), 4326)::geography, 500.00, 8, 20, 'Clear', true),
  ('a1111111-0000-0000-0000-000000000004', 'BTM Basketball Arena', 'Basketball', 'BTM Layout 2nd Stage, Bengaluru', 12.9166, 77.6101, ST_SetSRID(ST_MakePoint(77.6101, 12.9166), 4326)::geography, 600.00, 10, 90, 'Rainy', false),
  ('a1111111-0000-0000-0000-000000000005', 'Indiranagar Tennis Club', 'Tennis', '100 Feet Road, Indiranagar, Bengaluru', 12.9784, 77.6408, ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326)::geography, 1500.00, 4, 55, 'Clear', true),
  ('a1111111-0000-0000-0000-000000000006', 'Whitefield Football Turf', 'Football', 'ITPL Main Road, Whitefield, Bengaluru', 12.9698, 77.7500, ST_SetSRID(ST_MakePoint(77.7500, 12.9698), 4326)::geography, 900.00, 14, 30, 'Cloudy', false),
  ('a1111111-0000-0000-0000-000000000007', 'Electronic City Tennis Arena', 'Tennis', 'Electronic City Phase 1, Bengaluru', 12.8452, 77.6602, ST_SetSRID(ST_MakePoint(77.6602, 12.8452), 4326)::geography, 1100.00, 4, 65, 'Clear', true),
  ('a1111111-0000-0000-0000-000000000008', 'Marathahalli Cricket Nets', 'Cricket', 'Outer Ring Road, Marathahalli, Bengaluru', 12.9569, 77.7011, ST_SetSRID(ST_MakePoint(77.7011, 12.9569), 4326)::geography, 700.00, 16, 15, 'Rainy', false);

-- ===== Tournaments =====
-- #3 (Badminton) is seeded at max capacity to exercise the "tournament full" UI state.
INSERT INTO tournaments (id, title, sport_type, venue_id, start_date, entry_fee, max_teams, registered_teams, prize_pool, status)
VALUES
  ('b1111111-0000-0000-0000-000000000001', 'Koramangala 5-a-side Cup', 'Football', 'a1111111-0000-0000-0000-000000000001', CURRENT_DATE + 11, 1500.00, 10, 8, 20000.00, 'open'),
  ('b1111111-0000-0000-0000-000000000002', 'Jayanagar Cricket Premier League', 'Cricket', 'a1111111-0000-0000-0000-000000000002', CURRENT_DATE + 18, 3000.00, 8, 5, 40000.00, 'open'),
  ('b1111111-0000-0000-0000-000000000003', 'HSR Badminton Doubles Open', 'Badminton', 'a1111111-0000-0000-0000-000000000003', CURRENT_DATE + 4, 800.00, 16, 16, 10000.00, 'open'),
  ('b1111111-0000-0000-0000-000000000004', 'BTM 3x3 Basketball Jam', 'Basketball', 'a1111111-0000-0000-0000-000000000004', CURRENT_DATE + 25, 1000.00, 12, 4, 15000.00, 'open'),
  ('b1111111-0000-0000-0000-000000000005', 'Indiranagar Tennis Open', 'Tennis', 'a1111111-0000-0000-0000-000000000005', CURRENT_DATE + 39, 2000.00, 6, 2, 25000.00, 'open');

-- ===== Squad Requests ("Player Needed") =====
-- #5 (Tennis) is seeded fully filled to exercise the "squad full" UI state.
INSERT INTO squad_requests (id, captain_id, venue_id, sport_type, slot_date, slot_start, total_cost, per_head_cost, slots_total, slots_filled, status)
VALUES
  ('c1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'Football', CURRENT_DATE + 1, '18:00', 800.00, 100.00, 8, 5, 'open'),
  ('c1111111-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'a1111111-0000-0000-0000-000000000002', 'Cricket', CURRENT_DATE + 2, '07:00', 1200.00, 100.00, 12, 9, 'open'),
  ('c1111111-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'a1111111-0000-0000-0000-000000000003', 'Badminton', CURRENT_DATE + 1, '19:00', 500.00, 125.00, 4, 3, 'open'),
  ('c1111111-0000-0000-0000-000000000004', '66666666-6666-6666-6666-666666666666', 'a1111111-0000-0000-0000-000000000004', 'Basketball', CURRENT_DATE + 3, '17:00', 600.00, 120.00, 5, 2, 'open'),
  ('c1111111-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444', 'a1111111-0000-0000-0000-000000000005', 'Tennis', CURRENT_DATE + 5, '08:00', 1500.00, 375.00, 4, 4, 'full'),
  ('c1111111-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000006', 'Football', CURRENT_DATE + 7, '20:00', 900.00, 90.00, 10, 6, 'open'),
  ('c1111111-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 'a1111111-0000-0000-0000-000000000007', 'Tennis', CURRENT_DATE + 9, '06:30', 1100.00, 275.00, 4, 1, 'open'),
  ('c1111111-0000-0000-0000-000000000008', '55555555-5555-5555-5555-555555555555', 'a1111111-0000-0000-0000-000000000008', 'Cricket', CURRENT_DATE + 8, '16:00', 700.00, 58.33, 12, 7, 'open'),
  ('c1111111-0000-0000-0000-000000000009', '66666666-6666-6666-6666-666666666666', 'a1111111-0000-0000-0000-000000000001', 'Football', CURRENT_DATE + 6, '19:00', 800.00, 133.33, 6, 3, 'open'),
  ('c1111111-0000-0000-0000-000000000010', '44444444-4444-4444-4444-444444444444', 'a1111111-0000-0000-0000-000000000003', 'Badminton', CURRENT_DATE + 10, '20:00', 500.00, 100.00, 5, 2, 'open'),
  ('c1111111-0000-0000-0000-000000000011', '77777777-7777-7777-7777-777777777777', 'a1111111-0000-0000-0000-000000000002', 'Cricket', CURRENT_DATE + 4, '06:00', 1200.00, 100.00, 12, 6, 'open'),
  ('c1111111-0000-0000-0000-000000000012', '22222222-2222-2222-2222-222222222222', 'a1111111-0000-0000-0000-000000000004', 'Basketball', CURRENT_DATE + 6, '18:30', 600.00, 100.00, 6, 3, 'open');

-- ===== Solo Availability ("Looking to Play") =====
INSERT INTO solo_availability (id, user_id, sport_type, available_date, available_time, max_budget, notes, is_active)
VALUES
  ('d1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Football', CURRENT_DATE + 1, '18:00', 150.00, 'Winger, available evenings', true),
  ('d1111111-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Badminton', CURRENT_DATE + 1, '19:00', 200.00, 'Intermediate level', true),
  ('d1111111-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Cricket', CURRENT_DATE + 2, '07:00', 150.00, 'All-rounder', true),
  ('d1111111-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'Tennis', CURRENT_DATE + 5, '08:00', 400.00, 'Looking for a doubles partner', true),
  ('d1111111-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'Basketball', CURRENT_DATE + 3, '17:00', 150.00, 'Point guard, 5+ years experience', true),
  ('d1111111-0000-0000-0000-000000000006', '66666666-6666-6666-6666-666666666666', 'Football', CURRENT_DATE + 7, '20:00', 120.00, 'Casual player', true),
  ('d1111111-0000-0000-0000-000000000007', '77777777-7777-7777-7777-777777777777', 'Cricket', CURRENT_DATE + 8, '16:00', 100.00, 'Bowler, medium pace', true),
  ('d1111111-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Basketball', CURRENT_DATE + 4, '18:00', 150.00, 'Weekend player', true),
  ('d1111111-0000-0000-0000-000000000009', '55555555-5555-5555-5555-555555555555', 'Tennis', CURRENT_DATE + 9, '06:30', 350.00, 'Competitive singles', true),
  ('d1111111-0000-0000-0000-000000000010', '22222222-2222-2222-2222-222222222222', 'Football', CURRENT_DATE + 6, '19:00', 130.00, 'Defender', true),
  ('d1111111-0000-0000-0000-000000000011', '77777777-7777-7777-7777-777777777777', 'Badminton', CURRENT_DATE + 3, '07:30', 180.00, 'Early-morning singles', true),
  ('d1111111-0000-0000-0000-000000000012', '44444444-4444-4444-4444-444444444444', 'Football', CURRENT_DATE + 5, '19:30', 140.00, 'Goalkeeper, can bring own gloves', true);

-- ===== Vouchers (Rewards Store) =====
INSERT INTO vouchers (id, title, description, coin_cost, discount_value, valid_until, is_active)
VALUES
  ('e1111111-0000-0000-0000-000000000001', '50% OFF Turf Booking', 'Half off your next venue booking (max Rs.500 off)', 100, '50% OFF', '2026-12-31', true),
  ('e1111111-0000-0000-0000-000000000002', 'Canteen Pass', 'One free meal at any partner venue canteen', 40, 'Free Meal', '2026-12-31', true),
  ('e1111111-0000-0000-0000-000000000003', 'Pro Gear Voucher', 'Rs.300 off sports gear at partner stores', 150, 'Rs.300 OFF', '2026-12-31', true),
  ('e1111111-0000-0000-0000-000000000004', 'RVM Water Refill Pass', 'Free bottle refill at any metro/railway RVM station', 20, 'Free Refill', '2026-12-31', true);

-- ===== Coin Transaction History =====
-- Sums per user match each user's seeded coins_balance above, so the wallet's
-- running total and its transaction log agree from a fresh seed.
INSERT INTO coin_transactions (user_id, amount, type, source, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 100, 'earned', 'bonus', now() - interval '7 days'),
  ('11111111-1111-1111-1111-111111111111', 25, 'earned', 'rvm', now() - interval '5 days'),
  ('11111111-1111-1111-1111-111111111111', 25, 'earned', 'rvm', now() - interval '3 days'),
  ('22222222-2222-2222-2222-222222222222', 10, 'earned', 'bonus', now() - interval '10 days'),
  ('33333333-3333-3333-3333-333333333333', 35, 'earned', 'bonus', now() - interval '10 days'),
  ('33333333-3333-3333-3333-333333333333', 25, 'earned', 'rvm', now() - interval '2 days'),
  ('44444444-4444-4444-4444-444444444444', 80, 'earned', 'bonus', now() - interval '9 days'),
  ('55555555-5555-5555-5555-555555555555', 200, 'earned', 'bonus', now() - interval '9 days'),
  ('66666666-6666-6666-6666-666666666666', 5, 'earned', 'bonus', now() - interval '9 days'),
  ('77777777-7777-7777-7777-777777777777', 45, 'earned', 'bonus', now() - interval '9 days');
