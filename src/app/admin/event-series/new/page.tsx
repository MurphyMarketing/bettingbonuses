import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { sports } from '@/db/schema';
import { createSeries } from '../actions';
import { SeriesForm, type SeriesFormValues } from '../series-form';

export const metadata: Metadata = { title: 'New series', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: SeriesFormValues = { name: '', slug: '', sportId: '', intro: '', description: '' };

export default async function NewSeriesPage() {
  const sportOptions = await db.select({ id: sports.id, name: sports.name }).from(sports).orderBy(asc(sports.displayOrder), asc(sports.name));
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/event-series" className="text-sm text-muted-foreground hover:underline">← Event series</Link>
        <h1 className="mt-1 text-2xl font-semibold">New series</h1>
      </div>
      <SeriesForm action={createSeries} values={EMPTY} sports={sportOptions} submitLabel="Create series" />
    </main>
  );
}
