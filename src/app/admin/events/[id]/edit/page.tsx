import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { events, eventSeries } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { toDatetimeLocalInput } from '@/lib/datetime';
import { updateEvent, deleteEvent } from '../../actions';
import { EventForm, type EventFormValues } from '../../event-form';

export const metadata: Metadata = { title: 'Edit event', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) notFound();
  const series = await db.select({ id: eventSeries.id, name: eventSeries.name }).from(eventSeries).orderBy(asc(eventSeries.name));

  const values: EventFormValues = {
    name: event.name,
    slug: event.slug,
    seriesId: event.seriesId != null ? String(event.seriesId) : '',
    startsAt: toDatetimeLocalInput(event.startsAt),
    endsAt: toDatetimeLocalInput(event.endsAt),
    description: event.description ?? '',
    location: event.location ?? '',
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/events" className="text-sm text-muted-foreground hover:underline">← Events</Link>
        <h1 className="mt-1 text-2xl font-semibold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">/{event.slug}</p>
      </div>

      <EventForm action={updateEvent.bind(null, event.id)} values={values} series={series} submitLabel="Save changes" />

      <div className="mt-10 border-t pt-6">
        <h2 className="text-sm font-medium">Danger zone</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">Deleting an event is permanent. Reassign its offers first.</p>
        <form action={deleteEvent.bind(null, event.id)}>
          <Button type="submit" variant="destructive">Delete event</Button>
        </form>
      </div>
    </main>
  );
}
