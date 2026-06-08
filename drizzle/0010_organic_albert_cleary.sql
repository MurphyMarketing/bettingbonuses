ALTER TABLE "authors" ADD COLUMN "full_bio" text;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "twitter_url" text;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "expertise_areas" jsonb;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "years_experience" integer;