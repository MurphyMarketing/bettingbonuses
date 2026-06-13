CREATE TABLE "page_content" (
	"page_key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"intro_body" text,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "intro_body" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "body" text;--> statement-breakpoint
-- Seed one page_content row per hub/index page (bodies empty). Idempotent.
INSERT INTO "page_content" ("page_key", "label") VALUES
	('sportsbooks', 'Sportsbooks hub'),
	('prediction-markets', 'Prediction Markets hub'),
	('horse-racing', 'Horse Racing hub'),
	('dfs', 'DFS hub'),
	('states-index', 'States index'),
	('sports-index', 'Sports index')
ON CONFLICT ("page_key") DO NOTHING;
