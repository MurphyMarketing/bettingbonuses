import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, ne } from 'drizzle-orm';
import { db } from '@/db';
import { brands, companies, authors } from '@/db/schema';
import { createBrand } from '../actions';
import { BrandForm, type BrandFormValues } from '../brand-form';
import { CATEGORY_VALUES, STATUS_VALUES } from '../schema';

export const metadata: Metadata = { title: 'New brand', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: BrandFormValues = {
  name: '', slug: '', category: '', status: 'active', companyId: '', rebrandedFromId: '',
  countryCode: 'US', websiteUrl: '', appStoreUrl: '', playStoreUrl: '',
  affiliateProgram: '', defaultAffiliateLink: '', shortDescription: '',
  fullDescription: '', yearFounded: '', launchDate: '', sunsetDate: '', notes: '',
  introBody: '', body: '',
  metaTitle: '', metaDescription: '',
  introParagraph: '', howToClaimSteps: '', pros: '', cons: '', verdict: '',
  otherPromotions: '', depositOptions: '', primaryAuthorId: '', secondaryAuthorId: '',
};

export default async function NewBrandPage() {
  const [companyRows, candidateRows, authorRows] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(companies.name),
    // rebranded-from candidates: any non-planned brand.
    db.select({ id: brands.id, name: brands.name }).from(brands).where(ne(brands.status, 'planned')).orderBy(brands.name),
    db.select({ id: authors.id, name: authors.name }).from(authors).orderBy(asc(authors.name)),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/brands" className="text-sm text-muted-foreground hover:underline">
          ← Brands
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New brand</h1>
      </div>

      <BrandForm
        action={createBrand}
        companies={companyRows.map((c) => ({ value: String(c.id), label: c.name }))}
        rebrandCandidates={candidateRows.map((b) => ({ value: String(b.id), label: b.name }))}
        authorsOptions={authorRows.map((a) => ({ value: a.id, label: a.name }))}
        categories={CATEGORY_VALUES}
        statuses={STATUS_VALUES}
        values={EMPTY}
        submitLabel="Create brand"
      />
    </main>
  );
}
