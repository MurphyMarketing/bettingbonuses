import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { brands, brandRegions, regions } from '@/db/schema';
import { updateBrandState } from '../actions';
import { BrandStateForm, type BrandStateValues } from '../brand-state-form';

export const metadata: Metadata = { title: 'Edit brand state', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

export default async function EditBrandStatePage({ params }: { params: Promise<{ id: string; stateSlug: string }> }) {
  const { id: idParam, stateSlug } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [brand] = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) notFound();
  const [region] = await db.select({ id: regions.id, name: regions.name, slug: regions.slug }).from(regions).where(eq(regions.slug, stateSlug)).limit(1);
  if (!region) notFound();

  const [row] = await db
    .select()
    .from(brandRegions)
    .where(and(eq(brandRegions.brandId, id), eq(brandRegions.regionId, region.id)))
    .limit(1);
  if (!row) notFound(); // brand doesn't operate in this state

  const values: BrandStateValues = {
    context: row.context ?? '',
    headlineOverride: row.headlineOverride ?? '',
    launchedAt: toDateInput(row.launchedAt),
    launchYear: row.launchYear != null ? String(row.launchYear) : '',
    isNewLaunch: row.isNewLaunch == null ? '' : row.isNewLaunch ? 'true' : 'false',
    isActive: row.isActive,
    notes: row.notes ?? '',
  };

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href={`/admin/brands/${id}/states`} className="text-sm text-muted-foreground hover:underline">← {brand.name} states</Link>
        <h1 className="mt-1 text-2xl font-semibold">{brand.name} — {region.name}</h1>
      </div>

      <BrandStateForm
        action={updateBrandState.bind(null, id, region.id)}
        values={values}
        headlinePlaceholder={`${brand.name} Promo Code in ${region.name}`}
      />
    </main>
  );
}
