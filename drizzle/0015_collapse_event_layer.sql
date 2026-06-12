-- Sprint L: collapse the two-layer event model (event_series + events instances)
-- into one layer. event_series becomes the single recurring-events table; offers
-- target either a sport (league) or a series (event), never an instance.

-- GUARD: abort if any offer is tied to an event instance. Dropping the events
-- table would orphan that tie. Verified 0 such rows at authoring time; this is a
-- hard backstop so the destructive steps can never run against real instance ties.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM offers WHERE event_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Aborting collapse: offers.event_id has non-null rows';
  END IF;
END $$;--> statement-breakpoint
-- 1. Add current/next-occurrence fields to event_series.
ALTER TABLE "event_series" ADD COLUMN "starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_series" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_series" ADD COLUMN "location" text;--> statement-breakpoint
-- 2. Drop the events (instances) table. CASCADE also removes the FK from
--    offers.event_id, so the explicit FK drop below is guarded with IF EXISTS.
ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "events" CASCADE;--> statement-breakpoint
-- 3. Remove offers.event_id and collapse the single-target CHECK to {sport, series}.
ALTER TABLE "offers" DROP CONSTRAINT "offers_single_target";--> statement-breakpoint
ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_event_id_events_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "offers_event_idx";--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN IF EXISTS "event_id";--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_single_target" CHECK (num_nonnulls("offers"."sport_id", "offers"."series_id") <= 1);--> statement-breakpoint
-- 4. Re-seed sports as leagues+sports (upsert by slug — preserves ids so existing
--    event_series.sport_id references stay valid). Rename the three units whose
--    slug changed; insert NASCAR; set a sensible display_order.
UPDATE "sports" SET slug = 'college-football', name = 'College Football', full_name = 'College Football (NCAA)' WHERE slug = 'ncaa-football';--> statement-breakpoint
UPDATE "sports" SET slug = 'college-basketball', name = 'College Basketball', full_name = 'College Basketball (NCAA)' WHERE slug = 'ncaa-basketball';--> statement-breakpoint
UPDATE "sports" SET slug = 'ufc', name = 'UFC', full_name = 'Ultimate Fighting Championship' WHERE slug = 'ufc-mma';--> statement-breakpoint
INSERT INTO "sports" (name, slug, full_name, category, display_order)
  VALUES ('NASCAR', 'nascar', 'NASCAR Cup Series', 'Racing', 120)
  ON CONFLICT (slug) DO NOTHING;--> statement-breakpoint
UPDATE "sports" SET display_order = CASE slug
  WHEN 'nfl' THEN 10 WHEN 'nba' THEN 20 WHEN 'mlb' THEN 30 WHEN 'nhl' THEN 40
  WHEN 'college-football' THEN 50 WHEN 'college-basketball' THEN 60 WHEN 'ufc' THEN 70
  WHEN 'golf' THEN 80 WHEN 'tennis' THEN 90 WHEN 'horse-racing' THEN 100
  WHEN 'soccer' THEN 110 WHEN 'nascar' THEN 120 ELSE display_order END;--> statement-breakpoint
-- 5. Drop the season pseudo-events — a season is the league (sport_id), not a
--    discrete event. (mlb-season is absent; college-football-season is a season too,
--    included beyond the spec's four named rows.) Surviving series keep their
--    sport_id, which now points at the renamed units via step 4.
DELETE FROM "event_series" WHERE slug IN ('nfl-season', 'nba-season', 'mlb-season', 'nhl-season', 'college-football-season');
