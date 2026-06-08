ALTER TABLE "offers" ALTER COLUMN "verified_by_user_id" SET DATA TYPE text USING "verified_by_user_id"::text;
