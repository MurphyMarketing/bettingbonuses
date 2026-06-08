import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { regions } from '@/db/schema';
import { updateState } from '../actions';
import { StateForm, type StateValues } from '../state-form';

export const metadata: Metadata = { title: 'Edit state', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

export default async function EditStatePage({ params }: { params: Promise<{ stateSlug: string }> }) {
  const { stateSlug } = await params;
  const [region] = await db.select().from(regions).where(eq(regions.slug, stateSlug)).limit(1);
  if (!region) notFound();

  const values: StateValues = {
    intro: region.intro ?? '',
    regulator: region.regulator ?? '',
    regulatorUrl: region.regulatorUrl ?? '',
    problemGamblingHotline: region.problemGamblingHotline ?? '',
    bettingLegalStatus: region.bettingLegalStatus ?? '',
    legalSince: toDateInput(region.bettingLegalDate),
  };

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/states" className="text-sm text-muted-foreground hover:underline">← States</Link>
        <h1 className="mt-1 text-2xl font-semibold">{region.name}</h1>
        <p className="text-sm text-muted-foreground">/states/{region.slug}</p>
      </div>
      <StateForm action={updateState.bind(null, region.id)} values={values} />
    </main>
  );
}
