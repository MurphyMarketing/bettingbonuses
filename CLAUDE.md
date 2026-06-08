# BettingBonuses.com — Claude Code Project Context

## What this project is

A rebuild of BettingBonuses.com, an existing US gambling-affiliate site that lost
nearly all its organic search traffic over 2025. The original site (~15 pages on
WordPress) couldn't compete in a niche where the winners run database-driven
offers systems with constant updates, structured data, and programmatic page
generation. We're replacing it with a custom Next.js + Postgres application.

**Initial hosting:** Vercel (app) + Supabase (Postgres database). Chosen because
the team has existing workflow muscle memory with this stack from another project.

**Planned future migration:** Sevalla (Kinsta's PaaS) for both app and database,
to consolidate with the team's other WordPress properties on Kinsta. The schema,
codebase, and architecture are designed to be portable so this migration is
mechanical (pg_dump → restore, swap deploy target, change env vars) rather
than a rewrite.

The site's job: help US bettors find, compare, and claim current promotional
offers from legal US sportsbooks, prediction markets, racebooks, and DFS
pick'em operators. Affiliate revenue is the model; offer accuracy and freshness
are the product.

## Scope

**In scope (four categories):**
- Sportsbooks: FanDuel Sportsbook, DraftKings Sportsbook, BetMGM Sportsbook,
  Caesars Sportsbook, Fanatics Sportsbook, bet365, BetRivers, Hard Rock Bet
- Prediction Markets: Kalshi, Polymarket
- Horse Racing / Racebooks: TwinSpires, FanDuel Racing, AmWager, Xpressbet,
  NYRA Bets, Iron Bets Racing
- DFS pick'em: PrizePicks, Underdog Fantasy, Sleeper Picks, ParlayPlay,
  Boom Fantasy, FanDuel Predict, DraftKings Predictions, DraftKings Pick 6

**Out of scope (do not build pages or schemas for):**
- Casino bonuses
- Poker bonuses
- Streaming products (FanDuel Sports Network etc.)
- Non-US markets (US-only, but schema is country-aware so we're not locked in)

## Tech stack — DO NOT deviate without discussion

- **Next.js 15 (App Router) + TypeScript** — standalone output mode (portable to any Node host)
- **PostgreSQL via Supabase** — standard Postgres, accessed via Drizzle ORM with the raw connection string. **Do NOT use `@supabase/supabase-js`**; that ties us to PostgREST conventions and blocks future migration.
- **Drizzle ORM + drizzle-kit** — schema in TypeScript, reviewable SQL migrations
- **Auth.js (NextAuth) v5** with Drizzle adapter — admin auth only, credentials provider. **Do NOT use Supabase Auth.** Standard `users` table in the public schema; Phase 1 has 1–3 admin users, no need for Supabase's auth features, and we avoid an auth-migration headache later.
- **Tailwind CSS + shadcn/ui** — UI primitives for admin and public
- **Vercel** for application hosting initially (deploy on push to `main`); future migration to Sevalla planned
- **No edge runtime** — stay on Next.js standard Node runtime so the codebase runs on any Node host. No Vercel edge runtime, no edge middleware, no Vercel KV, no Vercel Postgres, no Vercel Cron. If we need scheduled jobs, GitHub Actions.
- **No Supabase Storage** — static files (logos, etc.) live in `/public/` in the repo.
- **No Supabase Row-Level Security policies** — auth at the app layer via Auth.js + Next.js middleware.

## Critical conventions

- **Money is integer cents.** $200.00 = `20000`. Never floats. Display formatting
  happens at the render layer.
- **Timestamps are UTC.** Display in user's local time at render time.
- **Slugs are lowercase-with-hyphens**, URL-safe, unique within their table.
- **Brand is the primary entity**, not "operator." FanDuel Sportsbook,
  FanDuel Racing, and FanDuel Predict are three separate Brand rows sharing
  one Company. Same for DraftKings Sportsbook / DraftKings Predictions / Pick 6.
- **Brands, regions, sports, events, promo types are all DATABASE TABLES, not
  enums.** The industry changes constantly; we need to add/remove them via the
  admin UI without code deploys.
- **Status fields are enums.** brand status, offer status etc. are stable
  vocabularies and enums are fine.
- **`last_verified_at` is the trust signal.** Every offer card surfaces it.
  Every admin offer-edit form has a one-click "Verify now" button that stamps
  the field with `now()` and the current user.

## Schema

See `db/schema.ts` (already in place — do not redesign without explicit
go-ahead). Highlights:

- `companies` → informational parent of brands
- `brands` → primary entity, has lifecycle: planned / active / rebranded / sunset
- `regions` → US states for now, but `country_code` defaults to 'US' so
  non-US expansion later doesn't require migration
- `brand_regions` → many-to-many: where each brand operates
- `sports`, `event_series`, `events` → events have two-layer modeling so
  `/kentucky-derby/` is a stable URL across years
- `offers` → the fact table; can attach to a specific `event`, a `series`,
  a `sport`, or be evergreen
- `offer_regions` → opt-in restriction; if empty for an offer, offer applies
  wherever the brand operates

## URL structure

- `/` → homepage with featured offers
- `/[brand-slug]/` → brand page (e.g. `/fanduel-sportsbook/`)
- `/[brand-slug]/[region-slug]/` → brand × state (e.g. `/fanduel-sportsbook/missouri/`)
- `/[category]/promo-codes/` → category aggregation (e.g. `/sportsbooks/promo-codes/`)
- `/[event-series-slug]/` → event hub (e.g. `/kentucky-derby/`)
- `/[event-series-slug]/[event-slug]/` → specific event instance
- `/states/[region-slug]/` → state landing page (which brands are legal here)
- `/admin/*` → admin UI, auth-gated, noindex

## Migration concern

The current WordPress site has 359 referring domains pointed at specific URLs
(homepage, `/racing/tvg/`, `/sports/`, the topical pages). The cutover must
preserve link equity:

- All old URLs need 301 redirects to their new equivalents
- `/racing/tvg/` → `/fanduel-racing/` (TVG was rebranded to FanDuel Racing in 2024)
- `/sports/` → `/sportsbooks/promo-codes/`
- Per-operator topical pages → corresponding brand pages
- Redirects stored as DB rows, not in `next.config.js`, so they survive deploys
  and are editable

## E-E-A-T requirements

This is a YMYL-adjacent niche post-Helpful Content Update. Things to build in
from day one:

- Author pages with credentials (`/authors/[slug]/`)
- Last-updated timestamps on every content page
- Responsible gambling disclosure in footer (1-800-GAMBLER) and state-specific
  problem-gambling hotlines on state pages
- T&C summary on every offer card; link to operator's official T&Cs
- Editorial vs. affiliate-relationship disclosure on every page

## What NOT to do

- Don't bring in WordPress as a dependency, plugin, or import target. Editorial
  content lives in the same Postgres DB as offers (or as MDX in-repo, TBD).
- Don't hardcode the brand list. It's a DB table.
- Don't use edge runtime or edge middleware (Kinsta doesn't support it).
- Don't add a JS framework on top of Next.js (no separate React Router,
  no Redux, etc.). React Server Components + Server Actions cover what we need.
- Don't use enums for brand/region/event types — those are tables.
- Don't add tracking pixels, ads, or third-party JS without explicit go-ahead.
  This is an affiliate site; the only third-party links should be deeplinks
  to operators.

## Reference materials in this repo

- `db/schema.ts` — Drizzle schema (do not redesign without go-ahead)
- `PHASE1_PLAN.md` — sequenced build plan; work through it step by step
- `docs/keyword_map.xlsx` — the keyword opportunity analysis informing
  page prioritization (Missouri × top sportsbooks is the highest-leverage
  cell of the matrix)
