import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { events, eventSeries, offers } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { eventTimeStatus } from '@/lib/event-time';
import { EventsTable, type EventRow } from './events-table';

export const metadata: Metadata = { title: 'Events', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export default async function EventsListPage() {
  const raw = await db
    .select({
      id: events.id,
      name: events.name,
      slug: events.slug,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      seriesName: eventSeries.name,
      offerCount: sql<number>`(select count(*)::int from ${offers} where ${offers.eventId} = ${sql.raw('"events"."id"')})`,
    })
    .from(events)
    .leftJoin(eventSeries, eq(events.seriesId, eventSeries.id))
    .orderBy(desc(events.startsAt));

  const rows: EventRow[] = raw.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    seriesName: e.seriesName,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    startsLabel: fmt(e.startsAt),
    endsLabel: fmt(e.endsAt),
    status: eventTimeStatus({ startsAt: e.startsAt, endsAt: e.endsAt }),
    offerCount: e.offerCount,
  }));

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <Button render={<Link href="/admin/events/new">New event</Link>} />
      </div>

      <EventsTable rows={rows} />
    </main>
  );
}
