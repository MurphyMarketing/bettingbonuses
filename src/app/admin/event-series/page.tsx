import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { eventSeries, sports, events, offers } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { SeriesTable } from './series-table';

export const metadata: Metadata = { title: 'Event series', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SeriesListPage() {
  const rows = await db
    .select({
      id: eventSeries.id,
      name: eventSeries.name,
      slug: eventSeries.slug,
      sportName: sports.name,
      upcomingEventName: sql<string | null>`(select ${events.name} from ${events} where ${events.seriesId} = ${sql.raw('"event_series"."id"')} and ${events.endsAt} >= now() order by ${events.startsAt} asc limit 1)`,
      hasUpcoming: sql<boolean>`exists (select 1 from ${events} where ${events.seriesId} = ${sql.raw('"event_series"."id"')} and ${events.endsAt} >= now())`,
      offerCount: sql<number>`(select count(*)::int from ${offers} where ${offers.seriesId} = ${sql.raw('"event_series"."id"')} and ${offers.status} = 'active')`,
    })
    .from(eventSeries)
    .leftJoin(sports, eq(eventSeries.sportId, sports.id))
    .orderBy(asc(eventSeries.name));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Event series</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <Button render={<Link href="/admin/event-series/new">New series</Link>} />
      </div>

      <SeriesTable rows={rows} />
    </main>
  );
}
