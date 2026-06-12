import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { sports } from '@/db/schema';
import { createEvent } from '../actions';
import { EventForm, type EventFormValues } from '../event-form';

export const metadata: Metadata = { title: 'New event', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: EventFormValues = { name: '', slug: '', sportId: '', startsAt: '', endsAt: '', location: '', intro: '', description: '' };

export default async function NewEventPage() {
  const sportOptions = await db.select({ id: sports.id, name: sports.name }).from(sports).orderBy(asc(sports.displayOrder), asc(sports.name));
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/events" className="text-sm text-muted-foreground hover:underline">← Events</Link>
        <h1 className="mt-1 text-2xl font-semibold">New event</h1>
      </div>
      <EventForm action={createEvent} values={EMPTY} sports={sportOptions} submitLabel="Create event" />
    </main>
  );
}
