import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { eventSeries, sports } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { updateSeries, deleteSeries } from '../../actions';
import { SeriesForm, type SeriesFormValues } from '../../series-form';

export const metadata: Metadata = { title: 'Edit series', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [series] = await db.select().from(eventSeries).where(eq(eventSeries.id, id)).limit(1);
  if (!series) notFound();
  const sportOptions = await db.select({ id: sports.id, name: sports.name }).from(sports).orderBy(asc(sports.displayOrder), asc(sports.name));

  const values: SeriesFormValues = {
    name: series.name,
    slug: series.slug,
    sportId: series.sportId != null ? String(series.sportId) : '',
    intro: series.intro ?? '',
    description: series.description ?? '',
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/event-series" className="text-sm text-muted-foreground hover:underline">← Event series</Link>
        <h1 className="mt-1 text-2xl font-semibold">{series.name}</h1>
        <p className="text-sm text-muted-foreground">/{series.slug}</p>
      </div>

      <SeriesForm action={updateSeries.bind(null, series.id)} values={values} sports={sportOptions} submitLabel="Save changes" />

      <div className="mt-10 border-t pt-6">
        <h2 className="text-sm font-medium">Danger zone</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">Deleting a series is permanent. Reassign its events/offers first.</p>
        <form action={deleteSeries.bind(null, series.id)}>
          <Button type="submit" variant="destructive">Delete series</Button>
        </form>
      </div>
    </main>
  );
}
