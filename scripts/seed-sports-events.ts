/**
 * Seed the 2026-27 sports calendar. Idempotent: re-running never duplicates
 * (sports updated by slug; series/events inserted only if their slug is absent).
 * Run with `npm run seed:sports-events`. Today's reference: 2026-06-09.
 */
import { loadEnvConfig } from '@next/env';
import { eq } from 'drizzle-orm';

const d = (iso: string) => new Date(iso);

// Categories for the existing league-based sports (slugs already in the DB).
const SPORT_CATEGORY: Record<string, string> = {
  nfl: 'Team', nba: 'Team', nhl: 'Team', mlb: 'Team', 'ncaa-football': 'Team',
  'ncaa-basketball': 'Team', soccer: 'Team', 'horse-racing': 'Racing', 'ufc-mma': 'Combat',
  golf: 'Individual', tennis: 'Individual',
};

// Series the calendar needs that may not exist yet (created if absent).
const SERIES = [
  { slug: 'nfl-season', name: 'NFL Season', sport: 'nfl' },
  { slug: 'college-football-season', name: 'College Football Season', sport: 'ncaa-football' },
  { slug: 'college-football-playoff', name: 'College Football Playoff', sport: 'ncaa-football' },
  { slug: 'nba-season', name: 'NBA Season', sport: 'nba' },
  { slug: 'nhl-season', name: 'NHL Season', sport: 'nhl' },
];

// 2026-27 event instances. Locked dates as-is; "verify" ones are best estimates.
const EVENTS = [
  { slug: 'stanley-cup-finals-2026', name: '2026 Stanley Cup Finals', series: 'stanley-cup-final', startsAt: '2026-06-04T22:00:00Z', endsAt: '2026-06-26T23:59:00Z', location: null },
  { slug: 'nba-finals-2026', name: '2026 NBA Finals', series: 'nba-finals', startsAt: '2026-06-04T23:30:00Z', endsAt: '2026-06-22T23:59:00Z', location: null },
  { slug: 'the-open-championship-2026', name: 'The Open Championship 2026', series: 'the-open-championship', startsAt: '2026-07-16T07:00:00Z', endsAt: '2026-07-19T19:00:00Z', location: 'Royal Birkdale, England' },
  { slug: 'nfl-season-2026', name: '2026 NFL Season', series: 'nfl-season', startsAt: '2026-09-10T23:20:00Z', endsAt: '2027-02-07T23:59:00Z', location: null },
  { slug: 'college-football-2026', name: '2026 College Football Season', series: 'college-football-season', startsAt: '2026-08-29T16:00:00Z', endsAt: '2027-01-20T05:00:00Z', location: null },
  { slug: 'world-series-2026', name: '2026 World Series', series: 'world-series', startsAt: '2026-10-23T23:30:00Z', endsAt: '2026-11-04T23:59:00Z', location: null },
  { slug: 'nba-season-2026-27', name: '2026-27 NBA Season', series: 'nba-season', startsAt: '2026-10-21T23:00:00Z', endsAt: '2027-06-22T23:59:00Z', location: null },
  { slug: 'nhl-season-2026-27', name: '2026-27 NHL Season', series: 'nhl-season', startsAt: '2026-10-07T23:00:00Z', endsAt: '2027-06-26T23:59:00Z', location: null },
  { slug: 'breeders-cup-2026', name: "2026 Breeders' Cup", series: 'breeders-cup', startsAt: '2026-10-30T17:00:00Z', endsAt: '2026-10-31T23:59:00Z', location: 'Del Mar, CA' },
  { slug: 'cfp-national-championship-2027', name: '2027 CFP National Championship', series: 'college-football-playoff', startsAt: '2027-01-20T00:30:00Z', endsAt: '2027-01-20T04:00:00Z', location: null },
  { slug: 'super-bowl-lxi', name: 'Super Bowl LXI', series: 'super-bowl', startsAt: '2027-02-07T23:30:00Z', endsAt: '2027-02-08T04:00:00Z', location: 'Location TBD' },
  { slug: 'march-madness-2027', name: '2027 March Madness', series: 'march-madness', startsAt: '2027-03-17T16:00:00Z', endsAt: '2027-04-05T23:59:00Z', location: null },
  { slug: 'masters-2027', name: '2027 Masters Tournament', series: 'the-masters', startsAt: '2027-04-08T13:00:00Z', endsAt: '2027-04-11T23:00:00Z', location: 'Augusta National Golf Club, Augusta, GA' },
  { slug: 'kentucky-derby-2027', name: '2027 Kentucky Derby', series: 'kentucky-derby', startsAt: '2027-05-01T18:00:00Z', endsAt: '2027-05-01T23:30:00Z', location: 'Churchill Downs, Louisville, KY' },
];

(async () => {
  loadEnvConfig(process.cwd());
  const { db } = await import('@/db');
  const s = await import('@/db/schema');

  // 1. Sport categories (idempotent update by slug).
  for (const [slug, category] of Object.entries(SPORT_CATEGORY)) {
    await db.update(s.sports).set({ category }).where(eq(s.sports.slug, slug));
  }
  const sportRows = await db.select({ id: s.sports.id, slug: s.sports.slug }).from(s.sports);
  const sportId = (slug: string) => sportRows.find((r) => r.slug === slug)?.id ?? null;

  // 2. Ensure series exist (insert if slug absent).
  let seriesAdded = 0;
  for (const se of SERIES) {
    const [exist] = await db.select({ id: s.eventSeries.id }).from(s.eventSeries).where(eq(s.eventSeries.slug, se.slug)).limit(1);
    if (!exist) {
      await db.insert(s.eventSeries).values({ slug: se.slug, name: se.name, sportId: sportId(se.sport) });
      seriesAdded++;
    }
  }
  const seriesRows = await db.select({ id: s.eventSeries.id, slug: s.eventSeries.slug, sportId: s.eventSeries.sportId }).from(s.eventSeries);
  const series = (slug: string) => seriesRows.find((r) => r.slug === slug);

  // 3. Event instances (insert if slug absent).
  let inserted = 0, skipped = 0, noSeries = 0;
  for (const ev of EVENTS) {
    const se = series(ev.series);
    if (!se) { console.log('  SKIP (series missing):', ev.slug); noSeries++; continue; }
    const [exist] = await db.select({ id: s.events.id }).from(s.events).where(eq(s.events.slug, ev.slug)).limit(1);
    if (exist) { skipped++; continue; }
    await db.insert(s.events).values({
      slug: ev.slug, name: ev.name, seriesId: se.id, sportId: se.sportId,
      startsAt: d(ev.startsAt), endsAt: d(ev.endsAt), description: null, location: ev.location,
    });
    inserted++;
  }

  console.log(`series added: ${seriesAdded} · events inserted: ${inserted}, skipped(existing): ${skipped}, no-series: ${noSeries}`);
  console.log('(MLB All-Star Game omitted — no matching event series.)');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
