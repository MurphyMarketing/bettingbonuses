-- Remove the legally-prohibited "free_bet" / "free_play" bonus kinds.
-- Hand-written (NOT drizzle-kit autogen): Postgres has no ALTER TYPE ... DROP VALUE,
-- so the enum is rename-recreate-swapped, and the offers using those kinds are
-- hard-deleted first (owner decision: delete, do not retag).

-- Step 3a: hard-delete the offers that use a prohibited kind, FK-safe order.
-- (No child rows reference them at migration time, but order is safe regardless.)
DELETE FROM "offer_regions" WHERE "offer_id" IN (
  SELECT "id" FROM "offers" WHERE "bonus_kind" IN ('free_bet', 'free_play')
);--> statement-breakpoint
DELETE FROM "affiliate_links" WHERE "offer_id" IN (
  SELECT "id" FROM "offers" WHERE "bonus_kind" IN ('free_bet', 'free_play')
);--> statement-breakpoint
DELETE FROM "offers" WHERE "bonus_kind" IN ('free_bet', 'free_play');--> statement-breakpoint

-- Step 3b guard: abort if any row still uses a prohibited kind — the cast below
-- would otherwise fail, and we never want a partial enum migration.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "offers" WHERE "bonus_kind" IN ('free_bet', 'free_play')) THEN
    RAISE EXCEPTION 'prohibited bonus_kind rows still present; aborting enum migration';
  END IF;
END $$;--> statement-breakpoint

-- Step 3b: rename-recreate-swap bonus_kind without the prohibited values.
-- Only offers.bonus_kind uses this type and it has no column default, so the
-- swap is just rename old -> create new -> retype column -> drop old.
ALTER TYPE "public"."bonus_kind" RENAME TO "bonus_kind_old";--> statement-breakpoint
CREATE TYPE "public"."bonus_kind" AS ENUM('bonus_bets', 'deposit_match', 'bet_insurance', 'no_deposit_bonus', 'odds_boost', 'parlay_boost', 'cashback', 'reload_bonus', 'profit_boost', 'other');--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "bonus_kind" TYPE "public"."bonus_kind" USING "bonus_kind"::text::"public"."bonus_kind";--> statement-breakpoint
DROP TYPE "public"."bonus_kind_old";
