import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { brands, brandRegions, regions } from '@/db/schema';
import { deriveNewLaunch } from '@/lib/launch';
import { BrandStatesTable, type BrandStateRow } from './brand-states-table';

export const metadata: Metadata = { title: 'Brand states', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function BrandStatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [brand] = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) notFound();

  const raw = await db
    .select({
      stateName: regions.name,
      stateSlug: regions.slug,
      isActive: brandRegions.isActive,
      context: brandRegions.context,
      headlineOverride: brandRegions.headlineOverride,
      launchYear: brandRegions.launchYear,
      isNewLaunch: brandRegions.isNewLaunch,
    })
    .from(brandRegions)
    .innerJoin(regions, eq(brandRegions.regionId, regions.id))
    .where(eq(brandRegions.brandId, id))
    .orderBy(regions.name);

  const rows: BrandStateRow[] = raw.map((r) => ({
    stateName: r.stateName,
    stateSlug: r.stateSlug,
    isActive: r.isActive,
    context: r.context,
    headlineOverride: r.headlineOverride,
    launchYear: r.launchYear,
    isNew: deriveNewLaunch(r.launchYear, r.isNewLaunch),
  }));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href={`/admin/brands/${id}/edit`} className="text-sm text-muted-foreground hover:underline">← {brand.name}</Link>
        <h1 className="mt-1 text-2xl font-semibold">{brand.name} — States</h1>
        <p className="text-sm text-muted-foreground">{rows.length} states · per-state copy and headline overrides</p>
      </div>

      <BrandStatesTable rows={rows} brandId={id} />
    </main>
  );
}
