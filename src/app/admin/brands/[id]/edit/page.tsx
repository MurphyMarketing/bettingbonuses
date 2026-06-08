import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { brands, companies } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { updateBrand, softDeleteBrand } from '../../actions';
import { BrandForm, type BrandFormValues } from '../../brand-form';
import { CATEGORY_VALUES, STATUS_VALUES } from '../../schema';

export const metadata: Metadata = { title: 'Edit brand', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) notFound();

  const [companyRows, candidateRows] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(companies.name),
    // Candidates exclude planned brands AND this brand itself.
    db
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .where(and(ne(brands.status, 'planned'), ne(brands.id, id)))
      .orderBy(brands.name),
  ]);

  const values: BrandFormValues = {
    name: brand.name,
    slug: brand.slug,
    category: brand.category,
    status: brand.status,
    companyId: brand.companyId != null ? String(brand.companyId) : '',
    rebrandedFromId: brand.rebrandedFromId != null ? String(brand.rebrandedFromId) : '',
    countryCode: brand.countryCode,
    websiteUrl: brand.websiteUrl ?? '',
    appStoreUrl: brand.appStoreUrl ?? '',
    playStoreUrl: brand.playStoreUrl ?? '',
    logoUrl: brand.logoUrl ?? '',
    logoSquareUrl: brand.logoSquareUrl ?? '',
    affiliateProgram: brand.affiliateProgram ?? '',
    defaultAffiliateLink: brand.defaultAffiliateLink ?? '',
    shortDescription: brand.shortDescription ?? '',
    fullDescription: brand.fullDescription ?? '',
    yearFounded: brand.yearFounded != null ? String(brand.yearFounded) : '',
    launchDate: toDateInput(brand.launchDate),
    sunsetDate: toDateInput(brand.sunsetDate),
    notes: brand.notes ?? '',
  };

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/brands" className="text-sm text-muted-foreground hover:underline">
          ← Brands
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{brand.name}</h1>
        <p className="text-sm text-muted-foreground">/{brand.slug}</p>
      </div>

      <BrandForm
        action={updateBrand.bind(null, id)}
        companies={companyRows.map((c) => ({ value: String(c.id), label: c.name }))}
        rebrandCandidates={candidateRows.map((b) => ({ value: String(b.id), label: b.name }))}
        categories={CATEGORY_VALUES}
        statuses={STATUS_VALUES}
        values={values}
        submitLabel="Save changes"
      />

      {brand.status !== 'sunset' ? (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-sm font-medium">Danger zone</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Soft delete sets the status to “Sunset”. The brand and its history are kept.
          </p>
          <form action={softDeleteBrand.bind(null, id)}>
            <Button type="submit" variant="destructive">
              Sunset this brand
            </Button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
