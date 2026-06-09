ALTER TABLE "event_series" ADD COLUMN "intro" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "display_order" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "intro" text;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "events_ends_at_idx" ON "events" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "offers_sport_idx" ON "offers" USING btree ("sport_id");--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_single_target" CHECK (num_nonnulls("offers"."sport_id", "offers"."series_id", "offers"."event_id") <= 1);