import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { eventSeries, sports, offers } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { eventTimeStatus } from '@/lib/event-time';
import { EventsTable } from './events-table';

export const metadata: Metadata = { title: 'Events', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EventsListPage() {
  const rows = await db
    .select({
      id: eventSeries.id,
      name: eventSeries.name,
      slug: eventSeries.slug,
      sportName: sports.name,
      startsAt: eventSeries.startsAt,
      endsAt: eventSeries.endsAt,
      offerCount: sql<number>`(select count(*)::int from ${offers} where ${offers.seriesId} = ${sql.raw('"event_series"."id"')} and ${offers.status} = 'active')`,
    })
    .from(eventSeries)
    .leftJoin(sports, eq(eventSeries.sportId, sports.id))
    .orderBy(asc(eventSeries.name));

  const tableRows = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sportName: r.sportName,
    status: eventTimeStatus({ startsAt: r.startsAt, endsAt: r.endsAt }),
    whenLabel: r.startsAt
      ? r.startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Undated',
    offerCount: r.offerCount,
  }));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">{rows.length} recurring events · one evergreen page each</p>
        </div>
        <Button render={<Link href="/admin/events/new">New event</Link>} />
      </div>

      <EventsTable rows={tableRows} />
    </main>
  );
}
