# Phase 1 Build Plan

Execute steps in order. **Pause after each step for review** before continuing.
Each step ends with a self-check: don't move to the next step until the check
passes.

Steps 1–8 are foundation work (one shot, no content). Steps 9–13 build the
public-facing pages. Step 14 is the production cutover.

---

## Step 1 — Project scaffold

Initialize the Next.js project in the current directory.

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint \
  --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

When prompted about overwriting `CLAUDE.md`, `PHASE1_PLAN.md`, or `db/schema.ts`,
**say no** — those files are project context and must be preserved.

After scaffold:
- Confirm `src/app/`, `src/`, `tsconfig.json` exist. (Note: with `--src-dir` the app router lives at `src/app/`. Tailwind v4 — installed by `create-next-app@latest` — uses CSS-based config in `src/app/globals.css` and a PostCSS plugin, so there is no `tailwind.config.ts`. This is expected.)
- Run `npm run dev` and confirm the Next.js placeholder loads at
  `http://localhost:3000`
- Stop the dev server, commit: `git add -A && git commit -m "Initial Next.js scaffold"`

**Self-check:** dev server runs, browser shows Next.js welcome.

---

## Step 2 — Install core dependencies

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit @types/node tsx
npm install next-auth@beta @auth/drizzle-adapter
npm install bcryptjs && npm install -D @types/bcryptjs
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install zod
```

Then initialize shadcn/ui:

```bash
npx shadcn@latest init -d   # accepts defaults
npx shadcn@latest add button input label card table dialog form select textarea badge
```

Commit: `Add core dependencies (Drizzle, Auth.js, shadcn/ui, Zod)`.

**Self-check:** `node_modules` populated, no install errors.

---

## Step 3 — Environment configuration

Create `.env.local` (gitignored) with the Kinsta DB connection. Template:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

Also create `.env.example` (committed, no real values) documenting required vars.

Make sure `.env.local` is in `.gitignore` (Next.js scaffold should have done this;
verify).

**Self-check:** `cat .gitignore | grep .env.local` returns a match.

---

## Step 4 — Wire up Drizzle and the schema

- Move the existing `schema.ts` to `src/db/schema.ts` if it isn't already there
- Create `src/db/index.ts` that exports a configured Drizzle client using
  `postgres` driver:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, { max: 10 });
export const db = drizzle(client, { schema });
```

- Create `drizzle.config.ts` at the project root pointing at
  `src/db/schema.ts` with `out: './drizzle'` and the dialect set to postgresql.
- Add npm scripts to `package.json`:
  ```
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
  ```

Run `npm run db:generate` to produce the initial SQL migration. Review the
generated SQL in `drizzle/`. Then `npm run db:migrate` to apply it to Kinsta.

Commit: `Drizzle setup with initial schema migration`.

**Self-check:** Open Drizzle Studio (`npm run db:studio`); confirm all tables
(`companies`, `brands`, `regions`, `brand_regions`, `sports`, `event_series`,
`events`, `offers`, `offer_regions`) exist in the database.

---

## Step 5 — Seed reference data

Create `src/db/seed.ts` and a `db:seed` npm script. The seed populates the
data that doesn't change frequently:

- **regions**: all 50 US states + DC, each with `country_code='US'`, slug,
  betting legal status as of the current date (do a quick check on
  Wikipedia "United States sports betting" for the current state list)
- **sports**: NFL, NBA, NHL, MLB, NCAA Football, NCAA Basketball,
  Horse Racing, UFC/MMA, Soccer (MLS + UCL + EPL combined), PGA Tour, Tennis
- **event_series**: Super Bowl, Kentucky Derby, Preakness Stakes,
  Belmont Stakes, Breeders' Cup, March Madness (NCAA tournament),
  Stanley Cup Final, NBA Finals, World Series, The Masters,
  US Open (golf), PGA Championship, The Open Championship,
  NFL Sunday (recurring weekly), MNF, TNF
- **companies**: Flutter Entertainment, DraftKings Inc, BetMGM (Entain/MGM JV),
  Caesars Entertainment, Fanatics Betting & Gaming, Hard Rock Digital,
  bet365 Group, Rush Street Interactive, Churchill Downs Inc,
  Champion Hill, 1/ST Technology, NY Racing Association, Iron Bets,
  Kalshi, Polymarket, PrizePicks, Underdog Sports, Sleeper,
  ParlayPlay, Boom Sports
- **brands**: the 24 brands from CLAUDE.md, each with proper `company_id`,
  `category`, `slug`, `status='active'`, `country_code='US'`
- **brand_regions**: rough first pass on where each sportsbook is legal
  (use the keyword_map state breakdown as a starting hint; can be refined
  later via admin UI)

Run `npm run db:seed`. Verify in Drizzle Studio that all reference data
populated.

Commit: `Seed regions, sports, event series, companies, brands`.

**Self-check:** `brands` table has 24 rows; `regions` has 51; `event_series`
has at least 15 rows.

---

## Step 6 — Admin auth

Configure Auth.js v5 with credentials provider and the Drizzle adapter.

- Create `src/auth.ts` with the NextAuth config (credentials provider that
  checks `users` table — you'll add a `users` table to the schema for this;
  add `users`, `sessions`, `accounts`, `verification_tokens` from Auth.js
  Drizzle adapter docs)
- Generate the migration for the new auth tables: `npm run db:generate && npm run db:migrate`
- Create `src/app/admin/login/page.tsx` with a login form
- Create middleware that protects `/admin/*` routes
- Add a script `npm run create-admin -- --email=... --password=...` for
  bootstrapping the first user

Commit: `Auth.js setup with admin login and route protection`.

**Self-check:** Visiting `/admin/anything` without auth redirects to
`/admin/login`. Logging in with a created user lets you access admin routes.

---

## Step 7 — Admin UI: Brands CRUD

Build `/admin/brands/`:
- List page: table of all brands with name, category, company, status,
  region count, offer count
- New/edit form: all brand fields, with FK pickers for company and
  rebranded_from
- Form validation with Zod
- Server Actions for create/update/delete (soft delete by setting status,
  not hard delete)

Commit: `Admin: Brands CRUD`.

**Self-check:** Create a test brand, edit it, see it in the list.

---

## Step 8 — Admin UI: Offers CRUD

Build `/admin/offers/`:
- List page: filterable by brand, status, valid window. Show
  `last_verified_at` prominently with "Stale" badge if > 14 days ago.
- New/edit form: all offer fields, with FK pickers for brand, event, series,
  sport, plus a region multi-select
- **The single most important UX detail:** "Verify Now" button at the top
  of the edit form. One click sets `last_verified_at = now()` and stamps
  the current user. This is the action staff will perform constantly;
  it must be one click, no confirmation modal, no extra fields.
- Server Actions for create/update
- Validation: if `valid_to` is set, must be after `valid_from`. If `eventId`
  is set, `valid_to` should default to the event's `endsAt` if blank.

Commit: `Admin: Offers CRUD with one-click verify`.

**Self-check:** Create a test offer tied to a real brand. Click "Verify Now"
and see the timestamp update. List page shows the verified-at relative time.

---

## Step 9 — Public layout & navigation

Build the shared public layout:
- Header: logo, primary nav (Sportsbooks / Prediction Markets / Racing / DFS / States), search placeholder
- Footer: responsible gambling disclosure (1-800-GAMBLER), affiliate
  disclosure, links to Privacy / Terms / About / Authors
- Global metadata defaults (title template, OG image fallback)
- Tailwind theme — pick a primary color that isn't gambling-industry-cliché
  (so not red, gold, or green). Suggested: a confident blue or slate.

Commit: `Public layout and global navigation`.

**Self-check:** All future public pages will use this layout; verify it renders
without content.

---

## Step 10 — Public template: Brand page

Build `app/[brand-slug]/page.tsx`:
- Static generation with `generateStaticParams` enumerating all
  `status='active'` brands from the DB
- ISR with `revalidate = 3600` (1 hour) and on-demand revalidation when
  admin saves a brand or offer
- Page sections:
  - H1 with brand name + category tag
  - Hero "best current offer" card (highest priority active offer for that brand)
  - Offer grid (all active offers, sorted by priority desc)
  - "Where [Brand] operates" — list of regions with links to brand-state pages
  - "About [Brand]" — `fullDescription` field rendered as Markdown
  - "Related brands from [Company]" — if other brands exist under same company
- Schema.org Product/Offer JSON-LD markup
- Canonical URL, OG tags, robots meta

Use this as the template for all 14 brand pages we're launching with.

Commit: `Public: Brand page template with ISR and schema.org markup`.

**Self-check:** Visit `/fanduel-sportsbook/` — page renders with seeded data
even without real offers populated yet.

---

## Step 11 — Public template: Brand × Region page

Build `app/[brand-slug]/[region-slug]/page.tsx`:
- Static generation only for brand × region combinations where the brand is
  legal (via `brand_regions`). Don't generate pages for combos that don't exist.
- Filter offers by region: show offers where `offer_regions` includes the
  region OR where `offer_regions` is empty (offer applies brand-wide)
- Page sections:
  - H1: "[Brand] Promo Code in [Region]"
  - Region-legal-since context ("[Brand] launched in [Region] on [date]")
  - Filtered offer grid
  - Regulator and problem gambling resources for the region

Commit: `Public: Brand × Region page template`.

**Self-check:** `/fanduel-sportsbook/missouri/` renders. `/fanduel-sportsbook/utah/`
returns 404 (FanDuel isn't legal in Utah).

---

## Step 12 — Public template: Homepage and category hubs

- `app/page.tsx`: homepage with featured offers across categories, links into
  each category, social proof / E-E-A-T signals (last verified offer count,
  author credentials, "as seen on" if any)
- `app/[category-slug]/promo-codes/page.tsx`: aggregation pages for each
  category (sportsbooks, prediction-markets, horse-racing, dfs)

Commit: `Public: Homepage and category hub pages`.

**Self-check:** All four category pages render with their brands listed.

---

## Step 13 — Seed Phase 1 launch offers

Use the admin UI (not seed scripts — this is the test that the admin UI
actually works) to populate offers for the Phase 1 launch set:

Priority order (the lowest-difficulty cells of the keyword matrix):
1. **6 Tier 1 sportsbooks in Missouri** — Fanatics, FanDuel, DraftKings,
   BetMGM, Caesars, bet365. One sign-up offer per brand, with `offer_regions`
   restricted to MO.
2. **Same 6 sportsbooks, evergreen national offers** — one default sign-up
   offer per brand with no region restriction.
3. **2 prediction markets** — Kalshi, Polymarket. Evergreen sign-up offers.
4. **3 DFS pure-plays** — PrizePicks, Underdog Fantasy, Sleeper Picks. Evergreen.
5. **Parlay pick'em sub-brands** — FanDuel Predict, DraftKings Predictions,
   DraftKings Pick 6. Evergreen.
6. **FanDuel Racing** — evergreen, with note about TVG rebrand.

Each offer must have: brand, bonus_kind, headline, valid_from, terms_url,
affiliate_url, last_verified_at = now(). Set realistic values; pull current
offer details from each operator's site.

**Self-check:** Visit `/fanduel-sportsbook/missouri/` and see the Missouri-specific
FanDuel offer; visit `/fanduel-sportsbook/` and see the national offer.

---

## Step 14 — Deploy to Kinsta and migrate

- In MyKinsta, create the Application Hosting app, connect to GitHub repo
- Set environment variables (DATABASE_URL pointing to Kinsta DB, NEXTAUTH_URL
  to the production hostname, NEXTAUTH_SECRET)
- Build command: `npm run build`; start command: `npm start`; Node version 20
- Deploy and confirm the production site builds successfully
- **Build the redirect map:** create `src/db/redirects.ts` seed listing every
  known WordPress URL from the old site mapped to its new equivalent.
  Apply via `redirects` table (add to schema if not already there) read by
  Next.js middleware to issue 301s.
- Specifically map:
  - `/racing/tvg/` → `/fanduel-racing/`
  - `/sports/` → `/sportsbooks/promo-codes/`
  - `/racing/twinspires/` → `/twinspires/`
  - `/fanduel/` → `/fanduel-sportsbook/`
  - `/caesars/` → `/caesars-sportsbook/`
  - `/betmgm/` → `/betmgm-sportsbook/`
  - `/bonus-bets/`, `/deposit-bonus/`, `/odds-boosts/`, `/cashback/`,
    `/no-deposit-bonuses/`, `/wagering-requirements/` → keep as
    educational landing pages OR redirect to relevant brand pages,
    depending on which has stronger backlinks (check Ahrefs)
- DNS cutover: point the bettingbonuses.com A record at Kinsta. Keep TTL low
  (300s) for 48 hours pre-cutover so we can roll back fast if needed.

**Self-check:** Production site loads at bettingbonuses.com; old URLs from
the WordPress site redirect 301 to new equivalents; Ahrefs site audit
shows zero 404s on indexed pages.

---

## After Phase 1

Phase 1.5 candidates (in rough order):
1. Event hub pages (`/kentucky-derby/`, `/super-bowl/`, etc.)
2. State landing pages (`/states/missouri/` — which brands are legal here)
3. Editorial content layer (Articles, Authors) for guides and E-E-A-T
4. Verification audit log (immutable record of who verified what when)
5. Comparison tools (compare two brands side by side)
6. More state rollouts (Ohio, North Carolina, Kentucky next based on
   keyword volume)
7. Add the remaining brands not in Phase 1 launch (Hard Rock Bet,
   BetRivers, TwinSpires, AmWager, Xpressbet, NYRA Bets, Iron Bets Racing,
   Boom Fantasy, ParlayPlay)
