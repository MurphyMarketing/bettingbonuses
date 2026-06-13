import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { brands, companies, authors } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { updateBrand, softDeleteBrand, uploadBrandLogo } from '../../actions';
import { BrandForm, type BrandFormValues } from '../../brand-form';
import { LogoUpload } from '../../logo-upload';
import { BrandOffersSection } from './brand-offers-section';
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

  const [companyRows, candidateRows, authorRows] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(companies.name),
    // Candidates exclude planned brands AND this brand itself.
    db
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .where(and(ne(brands.status, 'planned'), ne(brands.id, id)))
      .orderBy(brands.name),
    db.select({ id: authors.id, name: authors.name }).from(authors).orderBy(asc(authors.name)),
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
    affiliateProgram: brand.affiliateProgram ?? '',
    defaultAffiliateLink: brand.defaultAffiliateLink ?? '',
    shortDescription: brand.shortDescription ?? '',
    fullDescription: brand.fullDescription ?? '',
    yearFounded: brand.yearFounded != null ? String(brand.yearFounded) : '',
    launchDate: toDateInput(brand.launchDate),
    sunsetDate: toDateInput(brand.sunsetDate),
    notes: brand.notes ?? '',
    introBody: brand.introBody ?? '',
    body: brand.body ?? '',
    introParagraph: brand.introParagraph ?? '',
    howToClaimSteps: (brand.howToClaimSteps ?? []).join('\n'),
    pros: (brand.pros ?? []).join('\n'),
    cons: (brand.cons ?? []).join('\n'),
    verdict: brand.verdict ?? '',
    otherPromotions: (brand.otherPromotions ?? []).join('\n'),
    depositOptions: brand.depositOptions ?? '',
    primaryAuthorId: brand.primaryAuthorId ?? '',
    secondaryAuthorId: brand.secondaryAuthorId ?? '',
  };

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/brands" className="text-sm text-muted-foreground hover:underline">
          ← Brands
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{brand.name}</h1>
        <p className="text-sm text-muted-foreground">/{brand.slug}</p>
        <Link href={`/admin/brands/${id}/states`} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Manage states →
        </Link>
      </div>

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-1 text-sm font-medium">Logo</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Saved to /public/logos/{brand.slug}. Used on the public brand page and category cards.
        </p>
        <LogoUpload
          action={uploadBrandLogo.bind(null, id)}
          logoUrl={brand.logoUrl}
          logoSquareUrl={brand.logoSquareUrl}
        />
      </section>

      <BrandOffersSection brandId={id} />

      <BrandForm
        action={updateBrand.bind(null, id)}
        companies={companyRows.map((c) => ({ value: String(c.id), label: c.name }))}
        rebrandCandidates={candidateRows.map((b) => ({ value: String(b.id), label: b.name }))}
        authorsOptions={authorRows.map((a) => ({ value: a.id, label: a.name }))}
        categories={CATEGORY_VALUES}
        statuses={STATUS_VALUES}
        values={values}
        brandId={id}
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
