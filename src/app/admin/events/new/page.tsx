import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { eventSeries } from '@/db/schema';
import { createEvent } from '../actions';
import { EventForm, type EventFormValues } from '../event-form';

export const metadata: Metadata = { title: 'New event', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: EventFormValues = { name: '', slug: '', seriesId: '', startsAt: '', endsAt: '', description: '', location: '' };

export default async function NewEventPage() {
  const series = await db.select({ id: eventSeries.id, name: eventSeries.name }).from(eventSeries).orderBy(asc(eventSeries.name));
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/events" className="text-sm text-muted-foreground hover:underline">← Events</Link>
        <h1 className="mt-1 text-2xl font-semibold">New event</h1>
      </div>
      <EventForm action={createEvent} values={EMPTY} series={series} submitLabel="Create event" />
    </main>
  );
}
