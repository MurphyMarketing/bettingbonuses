CREATE TYPE "public"."bonus_kind" AS ENUM('bonus_bets', 'deposit_match', 'bet_insurance', 'no_deposit_bonus', 'odds_boost', 'parlay_boost', 'cashback', 'reload_bonus', 'free_bet', 'free_play', 'profit_boost', 'other');--> statement-breakpoint
CREATE TYPE "public"."brand_category" AS ENUM('sportsbook', 'prediction_market', 'racing', 'dfs');--> statement-breakpoint
CREATE TYPE "public"."brand_status" AS ENUM('planned', 'active', 'rebranded', 'sunset');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('draft', 'active', 'paused', 'expired', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_segment" AS ENUM('new', 'existing', 'all');--> statement-breakpoint
CREATE TABLE "affiliate_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"brand_id" integer NOT NULL,
	"offer_id" integer,
	"destination_url" text NOT NULL,
	"label" text,
	"network" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"click_count" integer DEFAULT 0 NOT NULL,
	"last_clicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "brand_regions" (
	"brand_id" integer NOT NULL,
	"region_id" integer NOT NULL,
	"launched_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	CONSTRAINT "brand_regions_brand_id_region_id_pk" PRIMARY KEY("brand_id","region_id")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"category" "brand_category" NOT NULL,
	"company_id" integer,
	"status" "brand_status" DEFAULT 'active' NOT NULL,
	"rebranded_from_id" integer,
	"country_code" varchar(2) DEFAULT 'US' NOT NULL,
	"website_url" text,
	"app_store_url" text,
	"play_store_url" text,
	"logo_url" text,
	"logo_square_url" text,
	"affiliate_program" text,
	"default_affiliate_link" text,
	"short_description" text,
	"full_description" text,
	"year_founded" integer,
	"launch_date" timestamp with time zone,
	"sunset_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"website_url" text,
	"country_code" varchar(2) DEFAULT 'US' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"sport_id" integer,
	"description" text,
	"typical_month" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_id" integer,
	"name" text NOT NULL,
	"slug" varchar(150) NOT NULL,
	"sport_id" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"description" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "offer_regions" (
	"offer_id" integer NOT NULL,
	"region_id" integer NOT NULL,
	CONSTRAINT "offer_regions_offer_id_region_id_pk" PRIMARY KEY("offer_id","region_id")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"bonus_kind" "bonus_kind" NOT NULL,
	"user_segment" "user_segment" DEFAULT 'new' NOT NULL,
	"event_id" integer,
	"series_id" integer,
	"sport_id" integer,
	"code" varchar(50),
	"headline" text NOT NULL,
	"description" text,
	"bonus_amount_cents" integer,
	"bonus_max_cents" integer,
	"qualifying_deposit_cents" integer,
	"qualifying_bet_cents" integer,
	"wagering_requirement_multiplier" integer,
	"terms_url" text,
	"terms_summary" text,
	"affiliate_url" text,
	"is_exclusive" boolean DEFAULT false NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"verified_by_user_id" integer,
	"verification_notes" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" "offer_status" DEFAULT 'draft' NOT NULL,
	"attributes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" varchar(2) DEFAULT 'US' NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"betting_legal_date" timestamp with time zone,
	"betting_legal_status" text,
	"regulator" text,
	"problem_gambling_hotline" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(50) NOT NULL,
	"full_name" text,
	"season_start_month" integer,
	"season_end_month" integer,
	CONSTRAINT "sports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_regions" ADD CONSTRAINT "brand_regions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_regions" ADD CONSTRAINT "brand_regions_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_series" ADD CONSTRAINT "event_series_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_series_id_event_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."event_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_regions" ADD CONSTRAINT "offer_regions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_regions" ADD CONSTRAINT "offer_regions_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_series_id_event_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."event_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliate_links_brand_idx" ON "affiliate_links" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "affiliate_links_offer_idx" ON "affiliate_links" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "affiliate_links_active_idx" ON "affiliate_links" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "brands_category_idx" ON "brands" USING btree ("category");--> statement-breakpoint
CREATE INDEX "brands_status_idx" ON "brands" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_series_idx" ON "events" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "offers_brand_idx" ON "offers" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offers_valid_to_idx" ON "offers" USING btree ("valid_to");--> statement-breakpoint
CREATE INDEX "offers_event_idx" ON "offers" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "offers_series_idx" ON "offers" USING btree ("series_id");--> statement-breakpoint
CREATE UNIQUE INDEX "regions_country_code_idx" ON "regions" USING btree ("country_code","code");--> statement-breakpoint
CREATE UNIQUE INDEX "regions_slug_idx" ON "regions" USING btree ("country_code","slug");