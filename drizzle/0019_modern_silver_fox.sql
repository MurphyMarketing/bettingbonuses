CREATE TYPE "public"."market_legal_status" AS ENUM('legal', 'not_yet_live', 'illegal', 'unregulated', 'contested');--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "sportsbook_status" "market_legal_status";--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "prediction_status" "market_legal_status";--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "dfs_status" "market_legal_status";--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "racing_status" "market_legal_status";--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "sportsbook_min_age" smallint;--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "prediction_min_age" smallint;--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "dfs_min_age" smallint;--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "racing_min_age" smallint;--> statement-breakpoint
-- Backfill: seed sportsbook_status from the deprecated single legal-status column.
-- Clean mappings only; tribal_only (no clean target in the new enum) and any
-- other/NULL value are left NULL for the owner's authoritative per-market import.
UPDATE "regions" SET "sportsbook_status" = CASE "betting_legal_status"
  WHEN 'legal_live'    THEN 'legal'::"public"."market_legal_status"
  WHEN 'legal_pending' THEN 'not_yet_live'::"public"."market_legal_status"
  WHEN 'illegal'       THEN 'illegal'::"public"."market_legal_status"
  ELSE NULL
END
WHERE "betting_legal_status" IN ('legal_live', 'legal_pending', 'illegal');
