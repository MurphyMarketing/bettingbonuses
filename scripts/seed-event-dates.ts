/**
 * Seed the current/next occurrence (starts_at / ends_at / location) onto the
 * recurring events in event_series, using real 2026–27 dates. Forward-looking,
 * same logic as Sprint K CP6: only seed an occurrence whose start is genuinely in
 * the future (so a season that has already run is skipped, not back-dated).
 * Idempotent — UPDATE by slug; re-running is a no-op for unchanged rows.
 *
 * Run: npx tsx scripts/seed-event-dates.ts
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

type Occurrence = { startsAt: string; endsAt: string; location: string | null };

// Next occurrence after ~2026-06-12. Times are UTC.
const EVENT_DATES: Record<string, Occurrence> = {
  // NFL (2026 season)
  'thursday-night-football': { startsAt: '2026-09-11T00:20:00Z', endsAt: '2026-09-11T03:30:00Z', location: null }, // 2026 NFL Kickoff (Sep 10, 8:20pm ET)
  'nfl-sunday': { startsAt: '2026-09-13T17:00:00Z', endsAt: '2026-09-14T04:00:00Z', location: null }, // Week 1 Sunday
  'monday-night-football': { startsAt: '2026-09-15T00:15:00Z', endsAt: '2026-09-15T03:30:00Z', location: null }, // Week 1 MNF (Sep 14, 8:15pm ET)
  'super-bowl': { startsAt: '2027-02-07T23:30:00Z', endsAt: '2027-02-08T03:30:00Z', location: null }, // Super Bowl LXI
  // NBA
  'nba-finals': { startsAt: '2027-06-03T23:30:00Z', endsAt: '2027-06-21T03:30:00Z', location: null },
  // MLB
  'world-series': { startsAt: '2026-10-23T23:00:00Z', endsAt: '2026-11-01T04:00:00Z', location: null },
  // NHL
  'stanley-cup-final': { startsAt: '2027-06-02T23:00:00Z', endsAt: '2027-06-20T03:30:00Z', location: null },
  // College Football (CFP runs Dec 2026 -> championship Jan 2027)
  'college-football-playoff': { startsAt: '2026-12-19T17:00:00Z', endsAt: '2027-01-20T04:00:00Z', location: null },
  // College Basketball (March Madness 2027)
  'march-madness': { startsAt: '2027-03-17T16:00:00Z', endsAt: '2027-04-06T04:00:00Z', location: null },
  // Golf
  'the-masters': { startsAt: '2027-04-08T12:00:00Z', endsAt: '2027-04-11T23:00:00Z', location: 'Augusta National Golf Club, Augusta, GA' },
  'us-open-golf': { startsAt: '2026-06-18T12:00:00Z', endsAt: '2026-06-21T23:00:00Z', location: null },
  'pga-championship': { startsAt: '2027-05-20T12:00:00Z', endsAt: '2027-05-23T23:00:00Z', location: null },
  'the-open-championship': { startsAt: '2026-07-16T06:00:00Z', endsAt: '2026-07-19T19:00:00Z', location: null },
  // Horse Racing (Breeders' Cup 2026, Triple Crown 2027)
  'breeders-cup': { startsAt: '2026-11-06T18:00:00Z', endsAt: '2026-11-07T23:30:00Z', location: null },
  'kentucky-derby': { startsAt: '2027-05-01T18:00:00Z', endsAt: '2027-05-01T23:30:00Z', location: 'Churchill Downs, Louisville, KY' },
  'preakness-stakes': { startsAt: '2027-05-15T18:00:00Z', endsAt: '2027-05-15T23:30:00Z', location: 'Pimlico Race Course, Baltimore, MD' },
  'belmont-stakes': { startsAt: '2027-06-05T18:00:00Z', endsAt: '2027-06-05T23:30:00Z', location: 'Belmont Park, Elmont, NY' },
};

async function main() {
  const { db } = await import('../src/db');
  const { eventSeries } = await import('../src/db/schema');
  const { eq } = await import('drizzle-orm');

  const now = new Date();
  let seeded = 0;
  const skippedPast: string[] = [];
  const missing: string[] = [];

  for (const [slug, occ] of Object.entries(EVENT_DATES)) {
    const startsAt = new Date(occ.startsAt);
    const endsAt = new Date(occ.endsAt);
    // Verify genuinely upcoming before seeding — never back-date a past occurrence.
    if (startsAt.getTime() <= now.getTime()) {
      skippedPast.push(`${slug} (${occ.startsAt} not in the future)`);
      continue;
    }
    const res = await db
      .update(eventSeries)
      .set({ startsAt, endsAt, location: occ.location, updatedAt: new Date() })
      .where(eq(eventSeries.slug, slug))
      .returning({ id: eventSeries.id });
    if (res.length) seeded++;
    else missing.push(slug);
  }

  console.log(`Seeded ${seeded}/${Object.keys(EVENT_DATES).length} event occurrences (now=${now.toISOString()}).`);
  if (skippedPast.length) console.log('Skipped (not upcoming):', skippedPast.join(', '));
  if (missing.length) console.log('No matching event_series row for:', missing.join(', '));
  process.exit(0);
}

main();
