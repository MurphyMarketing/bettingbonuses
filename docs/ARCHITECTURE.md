# ARCHITECTURE

Ground-truth technical map of BettingBonuses.com, authored from the actual repo
(`src/db/schema.ts`, `drizzle/`, `src/app/`, `package.json`, config). When this
doc and the code disagree, **the code wins** — fix this doc. Last verified at
commit `84dd0c4`.

> Anything marked **⚠︎ FLAG** is a place the code contradicts a doc/narrative —
> see the "Discrepancies to reconcile" section at the bottom.

---

## 1. Stack & locked decisions

| Layer | Choice | Verified in |
|---|---|---|
| Framework | **Next.js 16.2.7**, App Router, React 19.2.4 | `package.json` |
| Bundler | Turbopack (Next 16 default, dev + build) | — |
| ORM | **Drizzle 0.45.2** over **postgres-js 3.4** (raw connection) | `package.json`, `src/db/index.ts` |
| DB | **Supabase Postgres**. Runtime = transaction pooler (`DATABASE_URL`, :6543, `prepare:false`, `max:10`). Migrations = session pooler (`DIRECT_URL`, :5432) | `src/db/index.ts`, `drizzle.config.ts` |
| Auth | **Auth.js v5** (`next-auth 5.0.0-beta.31`), credentials provider + **JWT** sessions, slim `users` table, **no DrizzleAdapter** | `src/auth.ts`, schema |
| Styling | **Tailwind v4** (CSS-based config via `@theme` in `globals.css`; no `tailwind.config.ts`) | `globals.css` |
| UI primitives | shadcn on **Base UI** (`@base-ui/react`), NOT Radix | `package.json` |
| Editor | **Tiptap v3** (`@tiptap/*`) + `@dnd-kit/*` (sortable arrays) + `isomorphic-dompurify` | `package.json` |
| Storage | **Supabase Storage** via `@supabase/storage-js` only (NOT `@supabase/supabase-js`) | `src/lib/storage.ts` |
| Hosting | Vercel (deploy on push to `main`); future Sevalla/Kinsta migration designed-for | — |

**Hard constraints (do not violate):**
- **No edge runtime, no edge middleware, no Vercel KV / Postgres / Cron.** Everything is the standard Node runtime. The middleware (`src/proxy.ts`) runs on Node via the `auth()` wrapper. Scheduled work, if ever needed → GitHub Actions.
- **No `@supabase/supabase-js`** and **no Supabase Auth / RLS.** DB access is Drizzle-over-raw-Postgres; auth is app-layer (Auth.js + proxy). Storage is the `storage-js` package only.
- **Money is integer cents** (`bonusAmountCents` etc.). **Timestamps are UTC** (`withTimezone: true`), rendered local at the client (`LocalDateTime`).
- **Slugs are unique within their table**; root-level slugs are additionally unique *across* brands + articles + event_series, enforced at write time.
- Brands/regions/sports/events/promo-type-hubs are **data**, not enums (added via admin, no deploy). `status`/`category`/`bonus_kind` ARE enums (stable vocabularies).

---

## 2. Data model

14 tables. Source of truth: `src/db/schema.ts`. Migrations `0000`–`0018` in `drizzle/`.

### Enums (current values)
- `brand_category`: `sportsbook`, `prediction_market`, `racing`, `dfs`
- `brand_status`: `planned`, `active`, `rebranded`, `sunset`
- `offer_status`: `draft`, `active`, `paused`, `expired`, `archived`
- **`bonus_kind` (10)**: `bonus_bets`, `deposit_match`, `bet_insurance`, `no_deposit_bonus`, `odds_boost`, `parlay_boost`, `cashback`, `reload_bonus`, `profit_boost`, `other`
  - `free_bet` and `free_play` were **removed** (legally prohibited) in migration `0018_remove_free_bet_free_play.sql` — enum recreated 12→10 values, 3 offers hard-deleted.
- `user_segment`: `new`, `existing`, `all`
- `article_category`: `guide`, `news`, `comparison`
- `article_status`: `draft`, `published`, `archived`

### Tables & purpose

| Table | Purpose / key columns |
|---|---|
| **companies** | Informational parent for cross-brand "related brands". `name`, `slug`, `country_code` (default US). |
| **brands** | **Primary entity.** FanDuel Sportsbook / Racing / Predict are 3 separate rows sharing one company. Key: `category`, `status`, `companyId`, `rebrandedFromId` (self-FK). Editorial: `introParagraph`, `fullDescription`, `introBody`+`body` (Tiptap HTML rich slots), `metaTitle`/`metaDescription` (SEO overrides), `howToClaimSteps`/`pros`/`cons`/`otherPromotions` (jsonb string arrays), `verdict`, `depositOptions`. Logos: `logoUrl` (2:1 horizontal), `logoSquareUrl`. Authors: `primaryAuthorId`/`secondaryAuthorId`. `searchVector` (generated tsvector, GIN). **No `rating` column yet** (reserved slot in card UI — see gotchas). |
| **regions** | US states + DC. `code`, `slug`, `regulator`/`regulatorUrl`, `bettingLegalStatus`, `intro` (HTML), `problemGamblingHotline`. Country-aware (`countryCode`). |
| **brand_regions** | M:N brand↔region (composite PK). Where a brand operates. `isActive`, `launchedAt`, `context` (per brand×state HTML copy), `headlineOverride`, `launchYear`, `isNewLaunch` (the new-launch fields are **dormant** — the UI treatment was removed in `d11a1b7`). |
| **sports** | Leagues + sports mixed (NFL, NBA… + Golf, Tennis, Horse Racing). `slug`, `fullName`, `category`, `displayOrder`, `intro` (HTML). UI labels it "Leagues & sports". |
| **event_series** | **The single recurring-events table** (post-Sprint-L; the per-instance `events` table was dropped). One row per recurring event (`kentucky-derby`), stable across years, carrying the current/next occurrence: `startsAt`/`endsAt`/`location`. Keeps the name `event_series` so `offers.series_id` FKs didn't churn. `sportId`, `intro`. |
| **offers** | **The fact table.** `brandId` (required), `bonusKind`, `userSegment`. Target tie: at most one of `seriesId` / `sportId` (null = brand-wide) — enforced by CHECK `offers_single_target` (`num_nonnulls(sport_id, series_id) <= 1`). `code` (promo code), `headline`, amounts in cents, `termsUrl`, `responsibleGamblingDisclaimer` (per-offer RG copy), `affiliateUrl`, `validFrom`/`validTo`, `lastVerifiedAt`/`verifiedByUserId` (trust signal), `priority`, `isFeatured` (one national featured per brand), `status`, `attributes` (jsonb outliers). |
| **offer_regions** | Opt-in restriction (composite PK). No rows = offer applies wherever the brand operates; rows = restricted to those regions. |
| **affiliate_links** | `/go/[slug]` endpoints. `slug` (unique, need not match brand slug), `brandId`, optional `offerId`, `destinationUrl`, `clickCount`/`lastClickedAt`, `isActive`, validity window. |
| **users** | Admin auth only. `id` (text UUID), `email`, `passwordHash` (bcrypt), `name`. No accounts/sessions tables (JWT strategy). |
| **authors** | E-E-A-T bylines. `slug`, `name`, `title`, `bio`/`fullBio` (HTML), `avatarUrl`, `credentials`, social URLs, `expertiseAreas` (jsonb), `yearsExperience` (start year), `displayOrder`. `searchVector` (GIN). |
| **articles** | Editorial content. Root-level slug (globally unique vs brands/series). `body` (markdown→HTML via Tiptap), `metaDescription`, `excerpt`, `category`, `status`, author FKs, `readingTimeMinutes`, `draftBody`/`draftUpdatedAt` (autosave), `publishedAt`. `searchVector` strips HTML tags before indexing. |
| **redirects** | WordPress→Next cutover map. `fromPath` (unique, stored slash-less — see gotchas), `toPath`, `statusCode` (301/302 default 301), `isActive`. Read by the proxy. |
| **page_content** | Admin-editable rich content for the non-entity hub/index pages (4 category hubs, 2 nav indexes, 6 bonus-type hubs, legal pages). PK `pageKey`. Two HTML slots `introBody`/`body` + `metaTitle`/`metaDescription` overrides. |

### Relationships (Drizzle `relations`)
companies 1:N brands · brands self-ref (rebrand) · brands 1:N brand_regions / offers / affiliate_links · regions 1:N brand_regions / offer_regions · event_series N:1 sports, 1:N offers · offers N:1 brand/series/sport, 1:N offer_regions/affiliate_links · authors → brands & articles (primary/secondary).

---

## 3. Public page-type inventory

All public pages live in `src/app/(public)/`. Brand pages, articles, event hubs,
category hubs, bonus-type hubs, and legal pages **all share one root dynamic
segment** `[brand-slug]` (Next forbids sibling differently-named dynamic segments
at one position).

**Slug fallback chain** (`src/app/(public)/[brand-slug]/page.tsx`), in order:

```
brand → article → event series → category hub → bonus hub → static/legal page → 404
```

Brands keep absolute priority; the fixed-slug matchers (category / bonus / static) come last so they can't shadow a brand/article/series. The same order is mirrored in `generateMetadata`.

| Route | Renderer | Notes |
|---|---|---|
| `/` | `(public)/page.tsx` | Homepage: trust strip, national featured offer, live/upcoming events rail, category tiles, state chips. |
| `/[slug]` | brand-view / article-view / series-view / CategoryHub / BonusHub / StaticContentPage | The dispatch above. |
| `/[brand-slug]/[region-slug]` | `[brand-slug]/[region-slug]/page.tsx` | Brand×region; SSG over real brand_regions combos only (~664), invalid combo → 404. |
| `/sports` | `sports/page.tsx` | All 12 sports (eventless ones show "Offers coming soon"). |
| `/sports/[sport-slug]` | `sports/[sport-slug]/page.tsx` | Per-league hub. **⚠︎ FLAG: `generateStaticParams` still filters to sports with offers/events** (the eventless 4 are SSR-on-demand, not prerendered) — this is the "Option A" change that was queued but **not yet applied**. Thin sports get per-page `noindex`. |
| `/states` | `states/page.tsx` | State index. |
| `/states/[region-slug]` | `states/[region-slug]/page.tsx` | Per-state: brands by category + region-filtered offers. |
| `/authors`, `/authors/[slug]` | `authors/*` | Author index + bio pages. |
| `/about`, `/privacy`, `/terms` | static `page.tsx` files | Hardcoded legal stubs (separate from the page_content-backed legal pages). **⚠︎ FLAG: `/privacy` (static file) duplicates `/privacy-policy` (page_content STATIC_PAGES).** |
| `/go/[slug]` | `app/go/[slug]/route.ts` | Affiliate redirect: 302 + `X-Robots-Tag: noindex`, fire-and-forget click increment. |

**Fixed-slug config maps** (root-resolved, not entity-backed):
- **Category hubs** (`CATEGORIES`, `category-hub.tsx`): `sportsbooks`, `prediction-markets`, `horse-racing`, `dfs`.
- **Bonus-type hubs** (`BONUS_HUBS`, `bonus-hub.tsx`): `bonus-bets`→`bonus_bets`, `no-deposit-bonuses`→`no_deposit_bonus`, `odds-boosts`→`odds_boost`+`profit_boost`, `cashback`→`cashback`, `deposit-bonus`→`deposit_match`, `bet-insurance`→`bet_insurance`.
- **Legal/static** (`STATIC_PAGES`, `static-content-page.tsx`): `affiliate-disclosure`, `privacy-policy`, `responsible-gambling`, `contact`.

ISR: most public pages `export const revalidate = 3600` (1h) with `dynamicParams = true`.

Admin: `src/app/admin/*` — brands, offers (+ bulk-create), articles, authors, sports, events, states, brands/[id]/states, affiliate-links, redirects, page-content, content-status, dashboard. Persistent left sidebar via `app/admin/layout.tsx`. Gated by the proxy (`/admin/*` except `/admin/login`).

---

## 4. Known gotchas (with the real mechanism)

1. **Drizzle correlated-subquery column binding** — inside a `sql` correlated subquery, an unqualified outer column reference binds to the *inner* table. Always write `sql.raw('"offers"."id"')` (table-qualified) for the outer reference. Caused a 500 on the authors list + silently wrong counts (fixed in `a690cde`). Grep shows this pattern is used in `sports/[sport-slug]`, sitemap-adjacent counts, offer-card queries.

2. **`trailingSlash: false` + canonical cache keys** — `next.config.ts` sets nothing, so Next defaults to `trailingSlash:false`: pages are served/cached at `/foo` and `/foo/` 308-redirects to it.
   - **Redirects:** stored `from_path` must be slash-less or it never matches (the request is already normalized before the proxy looks it up). Enforced by `normalizeRedirectFromPath()` (`src/lib/redirect-path.ts`) at every write path (admin form, bulk import, seed).
   - **Revalidation:** `revalidatePath('/foo/')` targets a key that doesn't exist and silently no-ops, leaving stale HTML. **All** admin public-route revalidations go through `revalidatePublic()` (`src/lib/revalidate-path.ts`), which strips the trailing slash. This was the "logo not showing" bug (`884d344`) + systemic sweep (`1b5124c`).

3. **Supabase pooler fragility (`ENOTFOUND`)** — the transaction pooler host (`aws-1-us-east-2.pooler.supabase.com`) intermittently fails DNS resolution. Any page that runs a **live DB query at request time** (SSR-on-demand routes, and the proxy via `getActiveRedirects()`) can 500 during a blip; **prerendered/ISR-cached pages serve static HTML and survive.** Implication: thin/eventless pages that are SSR-on-demand are the *most* fragile. The mitigation pattern is to prerender them (the queued "Option A" for `/sports/[sport-slug]`).

4. **Proxy request-time DB dependency** — `src/proxy.ts` calls `getActiveRedirects()` on every non-static request (cached 60s TTL via `src/lib/redirects-cache.ts`, with in-flight coalescing). A cold cache during a DB blip can affect routing. The TTL bounds DB hits and staleness; invalidated on admin redirect save.

5. **Prerender vs SSR for thin pages** — `generateStaticParams` decides what's static at build (immune to runtime blips) vs SSR-on-demand (`dynamicParams=true`, live query each request). Pages excluded from `generateStaticParams` trade build cost for runtime fragility. The `/states/[region-slug]` prerender has historically strained the build (51 pages × pooler latency) — "known-fragile," held green so far.

---

## 5. Design-token system — "The Betting Slip"

Three coordinated locations (keep in sync):
- **`src/app/globals.css`** (search `DESIGN-SYSTEM SEED`) — source of truth. Theme-aware colors as `--*` vars in `:root`/`.dark`, aliased into the Tailwind v4 `@theme` block; static scale tokens declared directly in `@theme`.
- **`src/design/tokens.ts`** — exports `ds`, composed className recipes.
- **`DESIGN_TOKENS.md`** (repo root) — prose reference.

**Tokens:**
- Accent: `--color-action` azure `oklch(0.58 0.18 256)` (light) / `oklch(0.64 0.17 256)` (dark) + `-foreground` / `-hover`. Utilities `bg-action`/`text-action`/`ring-action`. Deliberately brighter than the slate `--primary` (`oklch(0.45 0.11 257)`) so the CTA reads as THE action. No red/gold/green.
- Bonus badge tint: `--color-bonus-tint` / `-foreground` / `-border`.
- Type scale: `text-eyebrow` (11px micro-caps, .09em, 600), `text-headline` (17px/600), `text-amount` (32px/700/−.02em), `text-amount-lg` (44px/700/−.025em), `font-display` (alias → Geist sans, **ready to repoint** at a display face with zero component edits).
- Surface: `rounded-card` 16px (`--radius-card`), `p-card`/`gap-card` 20px (`--spacing-card`).

**`ds.*` recipes:** `surface` (the ticket), `topEdge` (accent hairline), `eyebrow`, `bonusBadge`, `amount`/`amountLg`, `cta`, `pageTitle`, `sectionTitle`, `lead`, `tile`, `tileHover`.

**Consumers:** `OfferCard` (anchor). Propagation pass (`84dd0c4`) adopted the vocabulary on brand pages (`brand-view`, `BrandStateAvailability`), hubs (`category-hub`, `bonus-hub`, `/sports`, `/states` indexes, per-sport + event hubs), state pages, homepage (`FeaturedOfferCard`, `CategoryTile`, `EventCard`), and chrome (`site-header`, `site-footer`).

**Flagged token gaps (deliberately not invented):** no tokenized secondary/outline button; the shared `Button` `default` is still `bg-primary` slate (only `ds.cta` is azure); no shared alert/callout surface; no table style.

---

## 6. Storage, revalidation, structured data

**Storage** — three public Supabase buckets (`src/lib/storage.ts`, `scripts/create-buckets.ts`): `brand-logos`, `article-images`, `author-avatars`. URLs stored in the DB as absolute `https://…supabase.co/storage/v1/object/public/<bucket>/…` (a Supabase coupling flagged for the eventual Sevalla migration). `/public/logos` was removed (`3f901e6`) — Vercel's FS is ephemeral.

**Revalidation model** — ISR `revalidate = 3600` site-wide; admin writes call `revalidatePublic()` for immediate propagation across every surface a record appears on (e.g. `revalidateBrandSurfaces` fans out to `/`, brand page, category hub, per-region pages). No tag-based revalidation yet (a noted future sprint).

**`robots.ts`** — preview/localhost (`NEXTAUTH_URL` contains `vercel.app`/`localhost`) → `Disallow: /`. Production → allow public, disallow `/admin/`, `/api/`, `/go/`. (Site is still site-wide noindex pre-cutover.)

**`sitemap.ts`** — homepage, `/states/`, 4 category hubs, active+rebranded brands, brand×region combos, per-state pages, published articles, author pages. (Bonus-type hubs and per-sport/event pages are **not** in the sitemap yet.)

**JSON-LD coverage by page type** (`'@type'` emitted):
- Brand page → `Product` + `Offer`; `BrandStateAvailability` → `Service` + `State`.
- Brand×region → `Product` + `Place` + `PostalAddress`.
- Event series hub → `SportsEvent` + `ItemList`.
- Sport hub → `ItemList`.
- State page → `ItemList` + `Place`.
- Author page → `Person` + `Organization`.
- **Gap:** articles, category hubs, bonus-type hubs, and the homepage emit **no** JSON-LD yet.

---

## 7. Discrepancies to reconcile (code vs docs/narrative)

- **`output: 'standalone'`** — `CLAUDE.md` says the app uses "standalone output mode" for Node-host portability, but `next.config.ts` does **not** set `output: 'standalone'`. Currently moot on Vercel; needs adding before a Sevalla/Kinsta move.
- **`/sports/[sport-slug]` prerender** — narrative said "show all 12 sports" shipped, but the *hub index* (`/sports`) shows all 12 while the *per-sport page* `generateStaticParams` still excludes eventless sports (they're SSR-on-demand). The "Option A" prerender-all-12 change is **queued, not applied** as of `84dd0c4`.
- **`/privacy` vs `/privacy-policy`** — two privacy routes exist: a static `(public)/privacy/page.tsx` and the page_content-backed `privacy-policy` in `STATIC_PAGES`. Consolidation (301 one → the other) is an open cutover follow-up.
- **Category-hub card click target** — only the "View offers" button links; the card/logo aren't clickable. The stretched-link fix is **queued, not applied**.
