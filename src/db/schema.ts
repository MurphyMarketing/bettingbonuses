/**
 * BettingBonuses.com — initial Drizzle schema (Phase 1)
 *
 * Scope: Sportsbooks, Prediction Markets, Racing, DFS. US-only at launch,
 * country-aware so we're not locked in.
 *
 * Conventions:
 *  - All monetary amounts in USD cents (integer). $50.00 = 5000.
 *  - All timestamps in UTC.
 *  - Slugs are URL-safe lowercase-with-hyphens; no two rows share a slug within a table.
 *  - `status` enums govern what's indexable/displayable, not whether rows exist.
 */
import {
  pgTable, pgEnum, serial, text, varchar, timestamp, boolean,
  integer, jsonb, uniqueIndex, index, primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ============================================================
 * ENUMS — controlled vocabularies
 * ========================================================== */
export const brandCategoryEnum = pgEnum('brand_category', [
  'sportsbook',
  'prediction_market',
  'racing',
  'dfs',
]);

export const brandStatusEnum = pgEnum('brand_status', [
  'planned',   // pre-launch — write evergreen content, noindex
  'active',    // live — default
  'rebranded', // 301 → rebranded_to brand; preserve historical context
  'sunset',    // brand closed — page rendered with alternatives
]);

export const offerStatusEnum = pgEnum('offer_status', [
  'draft',     // in admin, not yet published
  'active',    // live and within validity window
  'paused',    // temporarily hidden but not expired
  'expired',   // past valid_to; historical
  'archived',  // hidden from listings but URL still resolves
]);

export const bonusKindEnum = pgEnum('bonus_kind', [
  'bonus_bets',           // "Bet $5, Get $200 in bonus bets"
  'deposit_match',        // "100% match up to $1,000"
  'bet_insurance',        // "First bet loses? Get up to $X back as bonus bets"
  'no_deposit_bonus',     // "$25 free on signup, no deposit required"
  'odds_boost',           // boosted price on specific markets
  'parlay_boost',         // % bump on multi-leg parlay payouts
  'cashback',             // % of net losses returned
  'reload_bonus',         // existing-user reload match
  'free_bet',             // fixed-stake free bet token
  'free_play',            // DFS-specific free entry
  'profit_boost',         // percentage profit increase on winning bets
  'other',                // catch-all; details in description
]);

export const userSegmentEnum = pgEnum('user_segment', [
  'new',       // signup/first-deposit offers
  'existing',  // reload/retention offers
  'all',       // applies to both
]);

export const articleCategoryEnum = pgEnum('article_category', ['guide', 'news', 'comparison']);
export const articleStatusEnum = pgEnum('article_status', ['draft', 'published', 'archived']);

/* ============================================================
 * COMPANIES — informational entity for cross-brand relatedness
 * ========================================================== */
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),                                // "Flutter Entertainment"
  slug: varchar('slug', { length: 100 }).unique().notNull(),   // "flutter-entertainment"
  description: text('description'),
  websiteUrl: text('website_url'),
  countryCode: varchar('country_code', { length: 2 }).notNull().default('US'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ============================================================
 * BRANDS — the primary entity. FanDuel Sportsbook, FanDuel Racing,
 * and FanDuel Predict are all separate brands sharing one company.
 * ========================================================== */
export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),                                // "FanDuel Sportsbook"
  slug: varchar('slug', { length: 100 }).unique().notNull(),   // "fanduel-sportsbook"
  category: brandCategoryEnum('category').notNull(),
  companyId: integer('company_id').references(() => companies.id),

  status: brandStatusEnum('status').notNull().default('active'),
  rebrandedFromId: integer('rebranded_from_id'),               // self-ref via FK constraint below

  // Country-aware from day one; default US for Phase 1
  countryCode: varchar('country_code', { length: 2 }).notNull().default('US'),

  // Brand-level marketing/links
  websiteUrl: text('website_url'),
  appStoreUrl: text('app_store_url'),
  playStoreUrl: text('play_store_url'),
  logoUrl: text('logo_url'),                                  // horizontal logo, e.g. /logos/fanduel-sportsbook.svg
  logoSquareUrl: text('logo_square_url'),                      // square/icon variant for grid layouts

  // Affiliate plumbing
  affiliateProgram: text('affiliate_program'),                 // e.g. "Income Access", "Everflow"
  defaultAffiliateLink: text('default_affiliate_link'),        // fallback deeplink

  // Editorial
  shortDescription: text('short_description'),
  introParagraph: text('intro_paragraph'),                     // 200-300 word brand intro
  fullDescription: text('full_description'),                   // long-form for brand page
  yearFounded: integer('year_founded'),

  // Structured review content (all nullable; admin-edited)
  howToClaimSteps: jsonb('how_to_claim_steps').$type<string[]>(),
  pros: jsonb('pros').$type<string[]>(),
  cons: jsonb('cons').$type<string[]>(),
  verdict: text('verdict'),                                    // short ranking/verdict paragraph
  otherPromotions: jsonb('other_promotions').$type<string[]>(),
  depositOptions: text('deposit_options'),                     // comma-separated list

  // Authors (E-E-A-T): FK to authors
  primaryAuthorId: text('primary_author_id').references(() => authors.id),
  secondaryAuthorId: text('secondary_author_id').references(() => authors.id),

  // Lifecycle
  launchDate: timestamp('launch_date', { withTimezone: true }),
  sunsetDate: timestamp('sunset_date', { withTimezone: true }),

  notes: text('notes'),                                        // internal-only

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('brands_category_idx').on(table.category),
  statusIdx: index('brands_status_idx').on(table.status),
}));

/* ============================================================
 * REGIONS — US states for Phase 1; structure allows non-US later.
 * "Region" instead of "State" so we're not painted into a corner.
 * ========================================================== */
export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  countryCode: varchar('country_code', { length: 2 }).notNull().default('US'),
  code: varchar('code', { length: 10 }).notNull(),             // "MO", "ON", etc.
  name: text('name').notNull(),                                // "Missouri"
  slug: varchar('slug', { length: 100 }).notNull(),            // "missouri"

  // Legality context for content rendering
  bettingLegalDate: timestamp('betting_legal_date', { withTimezone: true }),
  bettingLegalStatus: text('betting_legal_status'),            // 'legal_live', 'legal_pending', 'illegal', 'tribal_only'
  regulator: text('regulator'),                                // regulator name, e.g. "Missouri Gaming Commission"
  regulatorUrl: text('regulator_url'),                         // link to the state regulator
  intro: text('intro'),                                        // state-level intro (HTML, sanitized on render)
  problemGamblingHotline: text('problem_gambling_hotline'),    // for footer/disclosure

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  countryCodeIdx: uniqueIndex('regions_country_code_idx').on(table.countryCode, table.code),
  slugIdx: uniqueIndex('regions_slug_idx').on(table.countryCode, table.slug),
}));

/* ============================================================
 * BRAND_REGIONS — where each brand operates
 * ========================================================== */
export const brandRegions = pgTable('brand_regions', {
  brandId: integer('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  regionId: integer('region_id').notNull().references(() => regions.id, { onDelete: 'cascade' }),
  launchedAt: timestamp('launched_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  context: text('context'),                                    // per brand × state copy (HTML, sanitized on render)
  headlineOverride: text('headline_override'),                 // optional H1 override on the brand × state page
}, (table) => ({
  pk: primaryKey({ columns: [table.brandId, table.regionId] }),
}));

/* ============================================================
 * SPORTS — controlled list (NFL, NBA, NHL, MLB, NCAA, UFC, horse racing, etc.)
 * ========================================================== */
export const sports = pgTable('sports', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),                                // "NHL"
  slug: varchar('slug', { length: 50 }).unique().notNull(),    // "nhl"
  fullName: text('full_name'),                                 // "National Hockey League"
  seasonStartMonth: integer('season_start_month'),             // 10 for NHL
  seasonEndMonth: integer('season_end_month'),                 // 6 for NHL
});

/* ============================================================
 * EVENT_SERIES — recurring event templates (the parent / hub)
 * One row per recurring event. The /kentucky-derby/ URL maps here.
 * ========================================================== */
export const eventSeries = pgTable('event_series', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),                                // "Kentucky Derby"
  slug: varchar('slug', { length: 100 }).unique().notNull(),   // "kentucky-derby"
  sportId: integer('sport_id').references(() => sports.id),
  description: text('description'),                            // for the evergreen hub page
  typicalMonth: integer('typical_month'),                      // 5 for Derby (May)
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ============================================================
 * EVENTS — specific instances. "151st Kentucky Derby (2025)" → eventSeries=Derby.
 * Offers can attach to specific events (the Stanley Cup case) OR to series
 * (evergreen "Stanley Cup promo content" page).
 * ========================================================== */
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  seriesId: integer('series_id').references(() => eventSeries.id),
  name: text('name').notNull(),                                // "2026 Stanley Cup Final"
  slug: varchar('slug', { length: 150 }).unique().notNull(),   // "stanley-cup-final-2026"
  sportId: integer('sport_id').references(() => sports.id),

  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

  description: text('description'),
  isFeatured: boolean('is_featured').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  seriesIdx: index('events_series_idx').on(table.seriesId),
  startsAtIdx: index('events_starts_at_idx').on(table.startsAt),
}));

/* ============================================================
 * OFFERS — the fact table. The whole project lives or dies on this.
 * ========================================================== */
export const offers = pgTable('offers', {
  id: serial('id').primaryKey(),

  // The brand offering this — required
  brandId: integer('brand_id').notNull().references(() => brands.id, { onDelete: 'restrict' }),

  // What kind of offer it is — required for filtering/sorting/templating
  bonusKind: bonusKindEnum('bonus_kind').notNull(),
  userSegment: userSegmentEnum('user_segment').notNull().default('new'),

  // Event tie — null = evergreen
  // Either eventId (specific instance) OR seriesId (any instance of a series) OR neither (evergreen).
  // Sport-themed offers (e.g. "NFL Sunday boost") set sportId only.
  eventId: integer('event_id').references(() => events.id),
  seriesId: integer('series_id').references(() => eventSeries.id),
  sportId: integer('sport_id').references(() => sports.id),

  // The offer itself
  code: varchar('code', { length: 50 }),                       // promo code if any; "BUSABONUS" or null
  headline: text('headline').notNull(),                        // "Bet $5, Get $200 in Bonus Bets"
  description: text('description'),                            // longer marketing copy
  bonusAmountCents: integer('bonus_amount_cents'),             // e.g. 20000 for $200
  bonusMaxCents: integer('bonus_max_cents'),                   // for percentage/deposit-match offers
  qualifyingDepositCents: integer('qualifying_deposit_cents'),
  qualifyingBetCents: integer('qualifying_bet_cents'),
  wageringRequirementMultiplier: integer('wagering_requirement_multiplier'), // 1x, 5x, 10x — store as integer

  // Terms & affiliate plumbing
  termsUrl: text('terms_url'),                                 // link to operator's T&Cs
  termsSummary: text('terms_summary'),                         // our editorial summary
  responsibleGamblingDisclaimer: text('responsible_gambling_disclaimer'), // operator's exact RG copy, per offer
  affiliateUrl: text('affiliate_url'),                         // deeplink (overrides brand default)
  isExclusive: boolean('is_exclusive').notNull().default(false),

  // Validity window
  validFrom: timestamp('valid_from', { withTimezone: true }),
  validTo: timestamp('valid_to', { withTimezone: true }),

  // Verification — the trust signal
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  verifiedByUserId: text('verified_by_user_id'),               // users.id (Auth.js text UUID)
  verificationNotes: text('verification_notes'),

  // Display
  priority: integer('priority').notNull().default(0),          // higher = higher in lists
  isFeatured: boolean('is_featured').notNull().default(false),
  status: offerStatusEnum('status').notNull().default('draft'),

  // Free-form fields for outliers without schema churn
  attributes: jsonb('attributes'),                             // e.g. { 'min_odds': '-200', 'max_parlay_legs': 5 }

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  brandIdx: index('offers_brand_idx').on(table.brandId),
  statusIdx: index('offers_status_idx').on(table.status),
  validToIdx: index('offers_valid_to_idx').on(table.validTo),
  eventIdx: index('offers_event_idx').on(table.eventId),
  seriesIdx: index('offers_series_idx').on(table.seriesId),
}));

/* ============================================================
 * OFFER_REGIONS — which jurisdictions an offer applies in.
 * If no rows for an offer → applies everywhere the brand operates.
 * If rows exist → restricted to listed regions.
 * ========================================================== */
export const offerRegions = pgTable('offer_regions', {
  offerId: integer('offer_id').notNull().references(() => offers.id, { onDelete: 'cascade' }),
  regionId: integer('region_id').notNull().references(() => regions.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.offerId, table.regionId] }),
}));

/* ============================================================
 * AFFILIATE_LINKS — the /go/[slug]/ redirect endpoints.
 *
 * Why a separate table instead of just linking offer.affiliateUrl directly:
 *  - Centralized destination management (swap a URL without editing pages)
 *  - Click counting on the redirect, separate from page analytics
 *  - One canonical place to apply rel="nofollow sponsored" + noindex
 *  - Slug doesn't have to match brand slug — supports event/state-specific links
 *    like /go/fanduel-derby/ or /go/fanduel-mo/
 *
 * Route handler at app/go/[slug]/route.ts looks up by slug, increments
 * clickCount, returns 302 to destinationUrl with noindex header.
 * ========================================================== */
export const affiliateLinks = pgTable('affiliate_links', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),   // 'fanduel', 'fanduel-mo', 'fanduel-derby'

  // What this link is for (brand required; offer optional)
  brandId: integer('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  offerId: integer('offer_id').references(() => offers.id, { onDelete: 'set null' }),

  // Where it goes
  destinationUrl: text('destination_url').notNull(),           // the raw operator/affiliate URL

  // Operational
  label: text('label'),                                        // internal: "FanDuel default", "FanDuel Derby Promo"
  network: text('network'),                                    // 'Income Access', 'Everflow', 'direct', etc.
  isActive: boolean('is_active').notNull().default(true),
  validFrom: timestamp('valid_from', { withTimezone: true }),
  validTo: timestamp('valid_to', { withTimezone: true }),

  // Aggregate click tracking — keep simple for Phase 1
  clickCount: integer('click_count').notNull().default(0),
  lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  brandIdx: index('affiliate_links_brand_idx').on(table.brandId),
  offerIdx: index('affiliate_links_offer_idx').on(table.offerId),
  activeIdx: index('affiliate_links_active_idx').on(table.isActive),
}));

/* ============================================================
 * USERS — admin auth only (Auth.js v5 credentials provider, JWT sessions).
 *
 * Phase 1 is credentials-only with a JWT session strategy, so no adapter and no
 * accounts/sessions/verification_tokens tables — just this slim users table.
 * id is a text UUID; passwordHash is bcrypt. If OAuth is ever added, restore the
 * full Auth.js adapter table set then.
 * ========================================================== */
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),               // bcrypt
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ============================================================
 * AUTHORS — E-E-A-T editorial bylines.
 * ========================================================== */
export const authors = pgTable('authors', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  name: text('name').notNull(),
  title: text('title'),                                        // "Co-founder, BettingBonuses.com"
  bio: text('bio'),                                            // markdown
  avatarUrl: text('avatar_url'),
  credentials: text('credentials'),                            // "Regulated online betting since 2008"
  isActive: boolean('is_active').notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ============================================================
 * ARTICLES — editorial content (guides, news, comparisons).
 * Root-level slugs (e.g. /wagering-requirements/); slug must be globally
 * unique across articles AND brands (enforced in the create/update flows).
 * ========================================================== */
export const articles = pgTable('articles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  title: text('title').notNull(),
  metaDescription: text('meta_description'),
  excerpt: text('excerpt'),
  body: text('body'),                                          // markdown
  category: articleCategoryEnum('category').notNull().default('guide'),
  primaryAuthorId: text('primary_author_id').references(() => authors.id),
  secondaryAuthorId: text('secondary_author_id').references(() => authors.id),
  status: articleStatusEnum('status').notNull().default('draft'),
  readingTimeMinutes: integer('reading_time_minutes'),         // auto-calculated from body
  // Autosave: unsaved editor HTML; restored if newer than updatedAt.
  draftBody: text('draft_body'),
  draftUpdatedAt: timestamp('draft_updated_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('articles_status_idx').on(table.status),
  categoryIdx: index('articles_category_idx').on(table.category),
}));

/* ============================================================
 * REDIRECTS — 301/302 map for the WordPress -> Next cutover. Checked in the
 * proxy on every request (cached in-memory with a short TTL).
 * ========================================================== */
export const redirects = pgTable('redirects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromPath: text('from_path').unique().notNull(),              // e.g. "/racing/tvg/"
  toPath: text('to_path').notNull(),                           // path "/fanduel-racing/" or full URL
  statusCode: integer('status_code').notNull().default(301),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ============================================================
 * RELATIONS — Drizzle's relation helpers for type-safe joins
 * ========================================================== */
export const companiesRelations = relations(companies, ({ many }) => ({
  brands: many(brands),
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  company: one(companies, { fields: [brands.companyId], references: [companies.id] }),
  rebrandedFrom: one(brands, { fields: [brands.rebrandedFromId], references: [brands.id], relationName: 'rebrand' }),
  regions: many(brandRegions),
  offers: many(offers),
  affiliateLinks: many(affiliateLinks),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  brands: many(brandRegions),
  offers: many(offerRegions),
}));

export const brandRegionsRelations = relations(brandRegions, ({ one }) => ({
  brand: one(brands, { fields: [brandRegions.brandId], references: [brands.id] }),
  region: one(regions, { fields: [brandRegions.regionId], references: [regions.id] }),
}));

export const eventSeriesRelations = relations(eventSeries, ({ one, many }) => ({
  sport: one(sports, { fields: [eventSeries.sportId], references: [sports.id] }),
  events: many(events),
  offers: many(offers),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  series: one(eventSeries, { fields: [events.seriesId], references: [eventSeries.id] }),
  sport: one(sports, { fields: [events.sportId], references: [sports.id] }),
  offers: many(offers),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
  brand: one(brands, { fields: [offers.brandId], references: [brands.id] }),
  event: one(events, { fields: [offers.eventId], references: [events.id] }),
  series: one(eventSeries, { fields: [offers.seriesId], references: [eventSeries.id] }),
  sport: one(sports, { fields: [offers.sportId], references: [sports.id] }),
  regions: many(offerRegions),
  affiliateLinks: many(affiliateLinks),
}));

export const offerRegionsRelations = relations(offerRegions, ({ one }) => ({
  offer: one(offers, { fields: [offerRegions.offerId], references: [offers.id] }),
  region: one(regions, { fields: [offerRegions.regionId], references: [regions.id] }),
}));

export const affiliateLinksRelations = relations(affiliateLinks, ({ one }) => ({
  brand: one(brands, { fields: [affiliateLinks.brandId], references: [brands.id] }),
  offer: one(offers, { fields: [affiliateLinks.offerId], references: [offers.id] }),
}));
