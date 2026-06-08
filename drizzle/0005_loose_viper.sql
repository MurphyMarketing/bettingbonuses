CREATE TYPE "public"."article_category" AS ENUM('guide', 'news', 'comparison');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"meta_description" text,
	"excerpt" text,
	"body" text,
	"category" "article_category" DEFAULT 'guide' NOT NULL,
	"primary_author_id" text,
	"secondary_author_id" text,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"reading_time_minutes" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"bio" text,
	"avatar_url" text,
	"credentials" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "intro_paragraph" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "how_to_claim_steps" jsonb;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "pros" jsonb;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "cons" jsonb;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "verdict" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "other_promotions" jsonb;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "deposit_options" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "primary_author_id" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "secondary_author_id" text;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_primary_author_id_authors_id_fk" FOREIGN KEY ("primary_author_id") REFERENCES "public"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_secondary_author_id_authors_id_fk" FOREIGN KEY ("secondary_author_id") REFERENCES "public"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category");--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_primary_author_id_authors_id_fk" FOREIGN KEY ("primary_author_id") REFERENCES "public"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_secondary_author_id_authors_id_fk" FOREIGN KEY ("secondary_author_id") REFERENCES "public"."authors"("id") ON DELETE no action ON UPDATE no action;