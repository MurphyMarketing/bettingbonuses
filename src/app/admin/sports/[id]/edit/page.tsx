import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { sports } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { updateSport, deleteSport } from '../../actions';
import { SportForm, type SportFormValues } from '../../sport-form';

export const metadata: Metadata = { title: 'Edit sport', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditSportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [sport] = await db.select().from(sports).where(eq(sports.id, id)).limit(1);
  if (!sport) notFound();

  const values: SportFormValues = {
    name: sport.name,
    slug: sport.slug,
    category: sport.category ?? '',
    displayOrder: String(sport.displayOrder),
    intro: sport.intro ?? '',
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/sports" className="text-sm text-muted-foreground hover:underline">← Sports</Link>
        <h1 className="mt-1 text-2xl font-semibold">{sport.name}</h1>
        <p className="text-sm text-muted-foreground">/sports/{sport.slug}</p>
      </div>

      <SportForm action={updateSport.bind(null, sport.id)} values={values} submitLabel="Save changes" />

      <div className="mt-10 border-t pt-6">
        <h2 className="text-sm font-medium">Danger zone</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">Deleting a sport is permanent. Offers/series referencing it keep their FK (set null on delete is not configured) — reassign first.</p>
        <form action={deleteSport.bind(null, sport.id)}>
          <Button type="submit" variant="destructive">Delete sport</Button>
        </form>
      </div>
    </main>
  );
}
