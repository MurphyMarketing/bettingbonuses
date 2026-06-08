/**
 * Reference-data seed (Phase 1, Step 5).
 *
 * Populates the slow-changing tables: regions, sports, event_series,
 * companies, brands, brand_regions. Offers are NOT seeded here — those go in
 * through the admin UI in Step 13 (that's the test that the admin UI works).
 *
 * Idempotent: every insert uses onConflictDoNothing keyed on the natural
 * unique key (slug, or the composite PK for brand_regions), so re-running is
 * safe and won't duplicate. FK wiring is done by reading slug->id maps back
 * out of the DB after each insert, so it works whether rows were just inserted
 * or already existed.
 *
 * Runs via `tsx` (npm run db:seed), NOT inside Next.js, so we load .env.local
 * ourselves with @next/env BEFORE importing the db client (src/db/index.ts
 * reads DATABASE_URL at module-load time). Hence the dynamic import below.
 */
import { loadEnvConfig } from '@next/env';
import * as schema from './schema';

/* ----------------------------------------------------------------------------
 * COMPANIES (20) — informational parents. Brands reference these by slug.
 * -------------------------------------------------------------------------- */
const COMPANIES = [
  { name: 'Flutter Entertainment', slug: 'flutter-entertainment', websiteUrl: 'https://www.flutter.com', description: 'Global sports betting and gaming group; parent of the FanDuel brands in the US.' },
  { name: 'DraftKings Inc', slug: 'draftkings-inc', websiteUrl: 'https://www.draftkings.com', description: 'US sports betting and DFS operator.' },
  { name: 'BetMGM', slug: 'betmgm', websiteUrl: 'https://www.betmgm.com', description: 'Joint venture between Entain and MGM Resorts International.' },
  { name: 'Caesars Entertainment', slug: 'caesars-entertainment', websiteUrl: 'https://www.caesars.com', description: 'Casino and entertainment company operating Caesars Sportsbook.' },
  { name: 'Fanatics Betting & Gaming', slug: 'fanatics-betting-gaming', websiteUrl: 'https://www.fanatics.com', description: 'Betting and gaming arm of the Fanatics commerce group.' },
  { name: 'Hard Rock Digital', slug: 'hard-rock-digital', websiteUrl: 'https://www.hardrock.bet', description: 'Digital betting venture of the Seminole Tribe / Hard Rock.' },
  { name: 'bet365 Group', slug: 'bet365-group', websiteUrl: 'https://www.bet365.com', description: 'Privately held UK-based global online gambling company.' },
  { name: 'Rush Street Interactive', slug: 'rush-street-interactive', websiteUrl: 'https://www.rushstreetinteractive.com', description: 'Operator of BetRivers and PlaySugarHouse.' },
  { name: 'Churchill Downs Inc', slug: 'churchill-downs-inc', websiteUrl: 'https://www.churchilldownsincorporated.com', description: 'Racing and gaming company; operates TwinSpires ADW and the Kentucky Derby.' },
  { name: 'Champion Hill', slug: 'champion-hill', description: 'Operator of the AmWager advance-deposit wagering platform.' },
  { name: '1/ST Technology', slug: '1st-technology', description: 'Stronach Group horse-racing technology arm; operates Xpressbet.' },
  { name: 'NY Racing Association', slug: 'ny-racing-association', websiteUrl: 'https://www.nyra.com', description: 'Operator of Aqueduct, Belmont Park, Saratoga and NYRA Bets.' },
  { name: 'Iron Bets', slug: 'iron-bets', description: 'Newer racing-wagering operator (US launch 2024).' },
  { name: 'Kalshi', slug: 'kalshi', websiteUrl: 'https://kalshi.com', description: 'CFTC-regulated federal event-contract exchange.' },
  { name: 'Polymarket', slug: 'polymarket', websiteUrl: 'https://polymarket.com', description: 'Prediction-market platform for event contracts.' },
  { name: 'PrizePicks', slug: 'prizepicks', websiteUrl: 'https://www.prizepicks.com', description: 'Daily fantasy pick’em operator.' },
  { name: 'Underdog Sports', slug: 'underdog-sports', websiteUrl: 'https://underdogfantasy.com', description: 'Daily fantasy and pick’em operator behind Underdog Fantasy.' },
  { name: 'Sleeper', slug: 'sleeper', websiteUrl: 'https://sleeper.com', description: 'Fantasy sports platform operating Sleeper Picks.' },
  { name: 'ParlayPlay', slug: 'parlayplay', websiteUrl: 'https://parlayplay.io', description: 'Daily fantasy pick’em operator.' },
  { name: 'Boom Sports', slug: 'boom-sports', websiteUrl: 'https://www.boomfantasy.com', description: 'Daily fantasy pick’em operator behind Boom Fantasy.' },
] as const;

/* ----------------------------------------------------------------------------
 * SPORTS (11) — controlled vocabulary, but a table (industry-editable).
 * -------------------------------------------------------------------------- */
const SPORTS = [
  { name: 'NFL', slug: 'nfl', fullName: 'National Football League', seasonStartMonth: 9, seasonEndMonth: 2 },
  { name: 'NBA', slug: 'nba', fullName: 'National Basketball Association', seasonStartMonth: 10, seasonEndMonth: 6 },
  { name: 'NHL', slug: 'nhl', fullName: 'National Hockey League', seasonStartMonth: 10, seasonEndMonth: 6 },
  { name: 'MLB', slug: 'mlb', fullName: 'Major League Baseball', seasonStartMonth: 3, seasonEndMonth: 11 },
  { name: 'NCAA Football', slug: 'ncaa-football', fullName: 'College Football (NCAA)', seasonStartMonth: 8, seasonEndMonth: 1 },
  { name: 'NCAA Basketball', slug: 'ncaa-basketball', fullName: 'College Basketball (NCAA)', seasonStartMonth: 11, seasonEndMonth: 4 },
  { name: 'Horse Racing', slug: 'horse-racing', fullName: 'Thoroughbred Horse Racing', seasonStartMonth: 1, seasonEndMonth: 12 },
  { name: 'UFC/MMA', slug: 'ufc-mma', fullName: 'Mixed Martial Arts (UFC)', seasonStartMonth: 1, seasonEndMonth: 12 },
  { name: 'Soccer', slug: 'soccer', fullName: 'Soccer (MLS, EPL, UEFA Champions League)', seasonStartMonth: null, seasonEndMonth: null },
  { name: 'Golf', slug: 'golf', fullName: 'Professional Golf (PGA Tour)', seasonStartMonth: 1, seasonEndMonth: 12 },
  { name: 'Tennis', slug: 'tennis', fullName: 'Professional Tennis (ATP / WTA)', seasonStartMonth: 1, seasonEndMonth: 12 },
] as const;

/* ----------------------------------------------------------------------------
 * EVENT_SERIES (16) — recurring event hubs. sportSlug maps to SPORTS above.
 * -------------------------------------------------------------------------- */
const EVENT_SERIES = [
  { name: 'Super Bowl', slug: 'super-bowl', sportSlug: 'nfl', typicalMonth: 2 },
  { name: 'Kentucky Derby', slug: 'kentucky-derby', sportSlug: 'horse-racing', typicalMonth: 5 },
  { name: 'Preakness Stakes', slug: 'preakness-stakes', sportSlug: 'horse-racing', typicalMonth: 5 },
  { name: 'Belmont Stakes', slug: 'belmont-stakes', sportSlug: 'horse-racing', typicalMonth: 6 },
  { name: "Breeders' Cup", slug: 'breeders-cup', sportSlug: 'horse-racing', typicalMonth: 11 },
  { name: 'March Madness', slug: 'march-madness', sportSlug: 'ncaa-basketball', typicalMonth: 3 },
  { name: 'Stanley Cup Final', slug: 'stanley-cup-final', sportSlug: 'nhl', typicalMonth: 6 },
  { name: 'NBA Finals', slug: 'nba-finals', sportSlug: 'nba', typicalMonth: 6 },
  { name: 'World Series', slug: 'world-series', sportSlug: 'mlb', typicalMonth: 10 },
  { name: 'The Masters', slug: 'the-masters', sportSlug: 'golf', typicalMonth: 4 },
  { name: 'US Open (Golf)', slug: 'us-open-golf', sportSlug: 'golf', typicalMonth: 6 },
  { name: 'PGA Championship', slug: 'pga-championship', sportSlug: 'golf', typicalMonth: 5 },
  { name: 'The Open Championship', slug: 'the-open-championship', sportSlug: 'golf', typicalMonth: 7 },
  { name: 'NFL Sunday', slug: 'nfl-sunday', sportSlug: 'nfl', typicalMonth: null },
  { name: 'Monday Night Football', slug: 'monday-night-football', sportSlug: 'nfl', typicalMonth: null },
  { name: 'Thursday Night Football', slug: 'thursday-night-football', sportSlug: 'nfl', typicalMonth: null },
] as const;

/* ----------------------------------------------------------------------------
 * REGIONS (51) — 50 states + DC. betting_legal_status is a rough first pass as
 * of 2026-06-08 (refined later via admin). Values: legal_live / legal_pending /
 * illegal / tribal_only. Online mobile sports-betting lens; horse-racing ADW
 * and DFS have wider footprints, captured per-brand in brand_regions below.
 * -------------------------------------------------------------------------- */
const HOTLINE = '1-800-GAMBLER';
type RegionSeed = { code: string; name: string; slug: string; status: string };
const REGIONS: RegionSeed[] = [
  { code: 'AL', name: 'Alabama', slug: 'alabama', status: 'illegal' },
  { code: 'AK', name: 'Alaska', slug: 'alaska', status: 'illegal' },
  { code: 'AZ', name: 'Arizona', slug: 'arizona', status: 'legal_live' },
  { code: 'AR', name: 'Arkansas', slug: 'arkansas', status: 'legal_live' },
  { code: 'CA', name: 'California', slug: 'california', status: 'illegal' },
  { code: 'CO', name: 'Colorado', slug: 'colorado', status: 'legal_live' },
  { code: 'CT', name: 'Connecticut', slug: 'connecticut', status: 'legal_live' },
  { code: 'DE', name: 'Delaware', slug: 'delaware', status: 'legal_live' },
  { code: 'DC', name: 'District of Columbia', slug: 'district-of-columbia', status: 'legal_live' },
  { code: 'FL', name: 'Florida', slug: 'florida', status: 'legal_live' },
  { code: 'GA', name: 'Georgia', slug: 'georgia', status: 'illegal' },
  { code: 'HI', name: 'Hawaii', slug: 'hawaii', status: 'illegal' },
  { code: 'ID', name: 'Idaho', slug: 'idaho', status: 'illegal' },
  { code: 'IL', name: 'Illinois', slug: 'illinois', status: 'legal_live' },
  { code: 'IN', name: 'Indiana', slug: 'indiana', status: 'legal_live' },
  { code: 'IA', name: 'Iowa', slug: 'iowa', status: 'legal_live' },
  { code: 'KS', name: 'Kansas', slug: 'kansas', status: 'legal_live' },
  { code: 'KY', name: 'Kentucky', slug: 'kentucky', status: 'legal_live' },
  { code: 'LA', name: 'Louisiana', slug: 'louisiana', status: 'legal_live' },
  { code: 'ME', name: 'Maine', slug: 'maine', status: 'legal_live' },
  { code: 'MD', name: 'Maryland', slug: 'maryland', status: 'legal_live' },
  { code: 'MA', name: 'Massachusetts', slug: 'massachusetts', status: 'legal_live' },
  { code: 'MI', name: 'Michigan', slug: 'michigan', status: 'legal_live' },
  { code: 'MN', name: 'Minnesota', slug: 'minnesota', status: 'illegal' },
  { code: 'MS', name: 'Mississippi', slug: 'mississippi', status: 'legal_live' },
  { code: 'MO', name: 'Missouri', slug: 'missouri', status: 'legal_live' },
  { code: 'MT', name: 'Montana', slug: 'montana', status: 'legal_live' },
  { code: 'NE', name: 'Nebraska', slug: 'nebraska', status: 'legal_pending' },
  { code: 'NV', name: 'Nevada', slug: 'nevada', status: 'legal_live' },
  { code: 'NH', name: 'New Hampshire', slug: 'new-hampshire', status: 'legal_live' },
  { code: 'NJ', name: 'New Jersey', slug: 'new-jersey', status: 'legal_live' },
  { code: 'NM', name: 'New Mexico', slug: 'new-mexico', status: 'tribal_only' },
  { code: 'NY', name: 'New York', slug: 'new-york', status: 'legal_live' },
  { code: 'NC', name: 'North Carolina', slug: 'north-carolina', status: 'legal_live' },
  { code: 'ND', name: 'North Dakota', slug: 'north-dakota', status: 'tribal_only' },
  { code: 'OH', name: 'Ohio', slug: 'ohio', status: 'legal_live' },
  { code: 'OK', name: 'Oklahoma', slug: 'oklahoma', status: 'illegal' },
  { code: 'OR', name: 'Oregon', slug: 'oregon', status: 'legal_live' },
  { code: 'PA', name: 'Pennsylvania', slug: 'pennsylvania', status: 'legal_live' },
  { code: 'RI', name: 'Rhode Island', slug: 'rhode-island', status: 'legal_live' },
  { code: 'SC', name: 'South Carolina', slug: 'south-carolina', status: 'illegal' },
  { code: 'SD', name: 'South Dakota', slug: 'south-dakota', status: 'tribal_only' },
  { code: 'TN', name: 'Tennessee', slug: 'tennessee', status: 'legal_live' },
  { code: 'TX', name: 'Texas', slug: 'texas', status: 'illegal' },
  { code: 'UT', name: 'Utah', slug: 'utah', status: 'illegal' },
  { code: 'VT', name: 'Vermont', slug: 'vermont', status: 'legal_live' },
  { code: 'VA', name: 'Virginia', slug: 'virginia', status: 'legal_live' },
  { code: 'WA', name: 'Washington', slug: 'washington', status: 'tribal_only' },
  { code: 'WV', name: 'West Virginia', slug: 'west-virginia', status: 'legal_live' },
  { code: 'WI', name: 'Wisconsin', slug: 'wisconsin', status: 'tribal_only' },
  { code: 'WY', name: 'Wyoming', slug: 'wyoming', status: 'legal_live' },
];

/* ----------------------------------------------------------------------------
 * BRANDS (24) — the primary entity. companySlug maps to COMPANIES above.
 * FanDuel x3 share flutter-entertainment; DraftKings x3 share draftkings-inc.
 * -------------------------------------------------------------------------- */
type BrandSeed = {
  name: string; slug: string;
  category: 'sportsbook' | 'prediction_market' | 'racing' | 'dfs';
  companySlug: string; websiteUrl?: string; yearFounded?: number;
  shortDescription?: string; notes?: string;
};
const BRANDS: BrandSeed[] = [
  // --- Sportsbooks (8) ---
  { name: 'FanDuel Sportsbook', slug: 'fanduel-sportsbook', category: 'sportsbook', companySlug: 'flutter-entertainment', websiteUrl: 'https://sportsbook.fanduel.com', yearFounded: 2018, shortDescription: 'Market-leading US online sportsbook.' },
  { name: 'DraftKings Sportsbook', slug: 'draftkings-sportsbook', category: 'sportsbook', companySlug: 'draftkings-inc', websiteUrl: 'https://sportsbook.draftkings.com', yearFounded: 2018, shortDescription: 'Major US online sportsbook from DraftKings.' },
  { name: 'BetMGM Sportsbook', slug: 'betmgm-sportsbook', category: 'sportsbook', companySlug: 'betmgm', websiteUrl: 'https://sports.betmgm.com', yearFounded: 2018, shortDescription: 'The King of Sportsbooks, MGM/Entain joint venture.' },
  { name: 'Caesars Sportsbook', slug: 'caesars-sportsbook', category: 'sportsbook', companySlug: 'caesars-entertainment', websiteUrl: 'https://www.caesars.com/sportsbook-and-casino', yearFounded: 2019, shortDescription: 'Caesars-branded sportsbook with Caesars Rewards integration.' },
  { name: 'Fanatics Sportsbook', slug: 'fanatics-sportsbook', category: 'sportsbook', companySlug: 'fanatics-betting-gaming', websiteUrl: 'https://sportsbook.fanatics.com', yearFounded: 2023, shortDescription: 'Sportsbook from the Fanatics commerce group; FanCash rewards.' },
  { name: 'bet365', slug: 'bet365', category: 'sportsbook', companySlug: 'bet365-group', websiteUrl: 'https://www.bet365.com', yearFounded: 2000, shortDescription: 'Global sportsbook known for deep markets and live betting.' },
  { name: 'BetRivers', slug: 'betrivers', category: 'sportsbook', companySlug: 'rush-street-interactive', websiteUrl: 'https://www.betrivers.com', yearFounded: 2018, shortDescription: 'Rush Street Interactive sportsbook with iRush Rewards.' },
  { name: 'Hard Rock Bet', slug: 'hard-rock-bet', category: 'sportsbook', companySlug: 'hard-rock-digital', websiteUrl: 'https://www.hardrock.bet', yearFounded: 2023, shortDescription: 'Hard Rock Digital sportsbook; dominant in Florida.' },

  // --- Prediction Markets (2) ---
  { name: 'Kalshi', slug: 'kalshi', category: 'prediction_market', companySlug: 'kalshi', websiteUrl: 'https://kalshi.com', yearFounded: 2021, shortDescription: 'CFTC-regulated event-contract exchange, available nationwide.' },
  { name: 'Polymarket', slug: 'polymarket', category: 'prediction_market', companySlug: 'polymarket', websiteUrl: 'https://polymarket.com', yearFounded: 2020, shortDescription: 'Event-contract prediction market.' },

  // --- Horse Racing / Racebooks (6) ---
  { name: 'TwinSpires', slug: 'twinspires', category: 'racing', companySlug: 'churchill-downs-inc', websiteUrl: 'https://www.twinspires.com', yearFounded: 2007, shortDescription: 'Churchill Downs advance-deposit wagering on horse racing.' },
  { name: 'FanDuel Racing', slug: 'fanduel-racing', category: 'racing', companySlug: 'flutter-entertainment', websiteUrl: 'https://racing.fanduel.com', yearFounded: 2024, shortDescription: 'FanDuel horse-racing ADW (formerly TVG).', notes: 'Rebranded from TVG in 2024. Old /racing/tvg/ URL should 301 here at cutover.' },
  { name: 'AmWager', slug: 'amwager', category: 'racing', companySlug: 'champion-hill', websiteUrl: 'https://www.amwager.com', yearFounded: 2002, shortDescription: 'Advance-deposit horse-racing wagering platform.' },
  { name: 'Xpressbet', slug: 'xpressbet', category: 'racing', companySlug: '1st-technology', websiteUrl: 'https://www.xpressbet.com', yearFounded: 2001, shortDescription: '1/ST horse-racing ADW platform.' },
  { name: 'NYRA Bets', slug: 'nyra-bets', category: 'racing', companySlug: 'ny-racing-association', websiteUrl: 'https://www.nyrabets.com', yearFounded: 2016, shortDescription: 'Official ADW of the New York Racing Association.' },
  { name: 'Iron Bets Racing', slug: 'iron-bets-racing', category: 'racing', companySlug: 'iron-bets', yearFounded: 2024, shortDescription: 'Newer racing-wagering entrant (US launch 2024).', notes: 'Placeholder brand: 2024 launch, no Ahrefs volume yet. Kept for first-mover advantage.' },

  // --- DFS pick'em (8) ---
  { name: 'PrizePicks', slug: 'prizepicks', category: 'dfs', companySlug: 'prizepicks', websiteUrl: 'https://www.prizepicks.com', yearFounded: 2018, shortDescription: 'Largest US daily-fantasy pick’em operator.' },
  { name: 'Underdog Fantasy', slug: 'underdog-fantasy', category: 'dfs', companySlug: 'underdog-sports', websiteUrl: 'https://underdogfantasy.com', yearFounded: 2020, shortDescription: 'Daily fantasy pick’em and drafts.' },
  { name: 'Sleeper Picks', slug: 'sleeper-picks', category: 'dfs', companySlug: 'sleeper', websiteUrl: 'https://sleeper.com', yearFounded: 2017, shortDescription: 'Pick’em product from the Sleeper fantasy platform.' },
  { name: 'ParlayPlay', slug: 'parlayplay', category: 'dfs', companySlug: 'parlayplay', websiteUrl: 'https://parlayplay.io', yearFounded: 2021, shortDescription: 'Daily fantasy pick’em operator.' },
  { name: 'Boom Fantasy', slug: 'boom-fantasy', category: 'dfs', companySlug: 'boom-sports', websiteUrl: 'https://www.boomfantasy.com', yearFounded: 2018, shortDescription: 'Daily fantasy pick’em operator.' },
  { name: 'FanDuel Predict', slug: 'fanduel-predict', category: 'dfs', companySlug: 'flutter-entertainment', websiteUrl: 'https://www.fanduel.com', yearFounded: 2025, shortDescription: 'FanDuel’s prediction / pick’em product.' },
  { name: 'DraftKings Predictions', slug: 'draftkings-predictions', category: 'dfs', companySlug: 'draftkings-inc', websiteUrl: 'https://www.draftkings.com', yearFounded: 2025, shortDescription: 'DraftKings prediction-market / pick’em product.' },
  { name: 'DraftKings Pick 6', slug: 'draftkings-pick-6', category: 'dfs', companySlug: 'draftkings-inc', websiteUrl: 'https://pick6.draftkings.com', yearFounded: 2024, shortDescription: 'DraftKings daily-fantasy pick’em product.' },
];

/* ----------------------------------------------------------------------------
 * BRAND_REGIONS — rough first pass on where each brand operates. Refined later
 * via the admin UI. Sports betting / ADW / DFS / federal-exchange footprints
 * differ, so these are per-brand code lists rather than derived from region
 * status. Region group constants keep the common footprints DRY.
 * -------------------------------------------------------------------------- */
const ALL_REGION_CODES = REGIONS.map((r) => r.code); // nationwide (federal exchanges)
// Horse-racing advance-deposit wagering is legal far more widely than sports betting.
const ADW = ['AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'ID', 'IL', 'IN', 'IA', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MT', 'NH', 'NJ', 'NM', 'NY', 'ND', 'OH', 'OR', 'PA', 'RI', 'SD', 'TN', 'VA', 'WA', 'WV', 'WY'];
// DFS pick'em availability (distinct from sports betting).
const DFS = ['AK', 'AZ', 'AR', 'CA', 'CO', 'DC', 'FL', 'GA', 'IL', 'KS', 'KY', 'MN', 'NE', 'NM', 'NC', 'ND', 'OK', 'OR', 'RI', 'SC', 'SD', 'TX', 'UT', 'VA', 'WI', 'WY'];

const BRAND_REGIONS: Record<string, string[]> = {
  // Sportsbooks — online mobile sports-betting states per operator (rough).
  'fanduel-sportsbook': ['AZ', 'CO', 'CT', 'DC', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MO', 'NJ', 'NY', 'NC', 'OH', 'PA', 'TN', 'VT', 'VA', 'WV', 'WY'],
  'draftkings-sportsbook': ['AZ', 'CO', 'CT', 'DC', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MO', 'NH', 'NJ', 'NY', 'NC', 'OH', 'OR', 'PA', 'TN', 'VT', 'VA', 'WV', 'WY'],
  'betmgm-sportsbook': ['AZ', 'CO', 'DC', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MD', 'MA', 'MI', 'MS', 'MO', 'NV', 'NJ', 'NY', 'NC', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
  'caesars-sportsbook': ['AZ', 'CO', 'DC', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MD', 'MA', 'MI', 'MS', 'MO', 'NV', 'NJ', 'NY', 'NC', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
  'fanatics-sportsbook': ['AZ', 'CO', 'CT', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MD', 'MA', 'MI', 'MO', 'NJ', 'NY', 'NC', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
  'bet365': ['AZ', 'CO', 'IL', 'IN', 'IA', 'KY', 'LA', 'MO', 'NJ', 'NC', 'OH', 'TN', 'VA'],
  'betrivers': ['AZ', 'CO', 'CT', 'DE', 'IL', 'IN', 'IA', 'LA', 'MD', 'MI', 'NJ', 'NY', 'OH', 'PA', 'VA', 'WV'],
  'hard-rock-bet': ['AZ', 'FL', 'IL', 'IN', 'NJ', 'OH', 'TN', 'VA'],

  // Prediction markets — CFTC-regulated, nationwide.
  kalshi: ALL_REGION_CODES,
  polymarket: ALL_REGION_CODES,

  // Racing ADW.
  twinspires: ADW,
  'fanduel-racing': ADW,
  amwager: ['AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'IL', 'IN', 'IA', 'KY', 'LA', 'MD', 'MA', 'MI', 'NH', 'NJ', 'NY', 'OH', 'OR', 'PA', 'RI', 'TN', 'VA', 'WV', 'WY'],
  xpressbet: ['AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'IL', 'IN', 'IA', 'KY', 'LA', 'MD', 'MA', 'MI', 'MT', 'NH', 'NJ', 'NM', 'NY', 'ND', 'OH', 'OR', 'PA', 'RI', 'SD', 'TN', 'VA', 'WA', 'WV', 'WY'],
  'nyra-bets': ['AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'IL', 'IN', 'IA', 'KY', 'LA', 'MD', 'MA', 'MI', 'MN', 'NH', 'NJ', 'NM', 'NY', 'OH', 'OR', 'PA', 'RI', 'TN', 'VA', 'WV', 'WY'],
  'iron-bets-racing': ['NY', 'FL', 'CA', 'KY', 'OR'], // placeholder footprint

  // DFS pick'em.
  prizepicks: DFS,
  'underdog-fantasy': DFS,
  'sleeper-picks': ['AK', 'AZ', 'AR', 'CA', 'CO', 'DC', 'FL', 'GA', 'IL', 'KS', 'KY', 'MN', 'NM', 'NC', 'ND', 'OK', 'OR', 'RI', 'SC', 'SD', 'TX', 'UT', 'WY'],
  parlayplay: ['AZ', 'AR', 'CA', 'CO', 'FL', 'GA', 'IL', 'KS', 'KY', 'MN', 'NM', 'NC', 'ND', 'OK', 'OR', 'RI', 'SC', 'TX', 'UT', 'WY'],
  'boom-fantasy': ['AZ', 'AR', 'CA', 'CO', 'DC', 'FL', 'GA', 'IL', 'KY', 'MN', 'NM', 'NC', 'ND', 'OK', 'OR', 'RI', 'SC', 'TX', 'UT', 'WY'],
  'fanduel-predict': ALL_REGION_CODES, // federal event contracts, nationwide
  'draftkings-predictions': ALL_REGION_CODES, // federal event contracts, nationwide
  'draftkings-pick-6': DFS,
};

async function main() {
  loadEnvConfig(process.cwd());
  const { db } = await import('./index');

  console.log('Seeding reference data...');

  // 1. Companies
  await db.insert(schema.companies).values(COMPANIES.map((c) => ({ ...c }))).onConflictDoNothing();
  const companyRows = await db.select({ id: schema.companies.id, slug: schema.companies.slug }).from(schema.companies);
  const companyId = new Map(companyRows.map((r) => [r.slug, r.id]));

  // 2. Sports
  await db.insert(schema.sports).values(SPORTS.map((s) => ({ ...s }))).onConflictDoNothing();
  const sportRows = await db.select({ id: schema.sports.id, slug: schema.sports.slug }).from(schema.sports);
  const sportId = new Map(sportRows.map((r) => [r.slug, r.id]));

  // 3. Regions
  await db.insert(schema.regions).values(
    REGIONS.map((r) => ({
      countryCode: 'US',
      code: r.code,
      name: r.name,
      slug: r.slug,
      bettingLegalStatus: r.status,
      problemGamblingHotline: HOTLINE,
      // The launch state we care about most: Missouri went live 2025-12-01.
      ...(r.code === 'MO'
        ? { bettingLegalDate: new Date('2025-12-01T00:00:00Z'), regulator: 'Missouri Gaming Commission' }
        : {}),
    })),
  ).onConflictDoNothing();
  const regionRows = await db.select({ id: schema.regions.id, code: schema.regions.code }).from(schema.regions);
  const regionId = new Map(regionRows.map((r) => [r.code, r.id]));

  // 4. Event series (FK -> sports)
  await db.insert(schema.eventSeries).values(
    EVENT_SERIES.map((e) => ({
      name: e.name,
      slug: e.slug,
      sportId: sportId.get(e.sportSlug) ?? null,
      typicalMonth: e.typicalMonth,
    })),
  ).onConflictDoNothing();

  // 5. Brands (FK -> companies)
  await db.insert(schema.brands).values(
    BRANDS.map((b) => ({
      name: b.name,
      slug: b.slug,
      category: b.category,
      companyId: companyId.get(b.companySlug) ?? null,
      status: 'active' as const,
      countryCode: 'US',
      websiteUrl: b.websiteUrl ?? null,
      yearFounded: b.yearFounded ?? null,
      shortDescription: b.shortDescription ?? null,
      notes: b.notes ?? null,
    })),
  ).onConflictDoNothing();
  const brandRows = await db.select({ id: schema.brands.id, slug: schema.brands.slug }).from(schema.brands);
  const brandId = new Map(brandRows.map((r) => [r.slug, r.id]));

  // 6. Brand x region (FK -> brands, regions)
  const brandRegionValues: { brandId: number; regionId: number }[] = [];
  for (const [brandSlug, codes] of Object.entries(BRAND_REGIONS)) {
    const bId = brandId.get(brandSlug);
    if (bId == null) throw new Error(`brand_regions references unknown brand slug: ${brandSlug}`);
    for (const code of codes) {
      const rId = regionId.get(code);
      if (rId == null) throw new Error(`brand_regions references unknown region code: ${code} (brand ${brandSlug})`);
      brandRegionValues.push({ brandId: bId, regionId: rId });
    }
  }
  await db.insert(schema.brandRegions).values(brandRegionValues).onConflictDoNothing();

  // Summary
  const counts = {
    companies: await db.$count(schema.companies),
    sports: await db.$count(schema.sports),
    regions: await db.$count(schema.regions),
    event_series: await db.$count(schema.eventSeries),
    brands: await db.$count(schema.brands),
    brand_regions: await db.$count(schema.brandRegions),
  };
  console.log('Seed complete. Row counts:');
  console.table(counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
