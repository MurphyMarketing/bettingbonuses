ALTER TABLE "brand_regions" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "brand_regions" ADD COLUMN "headline_override" text;--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "regulator_url" text;--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "intro" text;