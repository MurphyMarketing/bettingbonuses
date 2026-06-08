ALTER TABLE "articles" ADD COLUMN "draft_body" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "draft_updated_at" timestamp with time zone;