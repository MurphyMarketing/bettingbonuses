import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, desc } from 'drizzle-orm';
import { db } from '@/db';
import { brands, offers } from '@/db/schema';
import { createAffiliateLink } from '../actions';
import { LinkForm, type LinkFormValues } from '../link-form';

export const metadata: Metadata = { title: 'New affiliate link', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: LinkFormValues = {
  slug: '', brandId: '', offerId: '', destinationUrl: '', label: '', network: '', isActive: true, validFrom: '', validTo: '',
};

export default async function NewLinkPage() {
  const [brandRows, offerRows] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: offers.id, headline: offers.headline }).from(offers).orderBy(desc(offers.updatedAt)),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/affiliate-links" className="text-sm text-muted-foreground hover:underline">← Affiliate links</Link>
        <h1 className="mt-1 text-2xl font-semibold">New affiliate link</h1>
      </div>
      <LinkForm
        action={createAffiliateLink}
        brandOptions={brandRows.map((b) => ({ value: String(b.id), label: b.name }))}
        offerOptions={offerRows.map((o) => ({ value: String(o.id), label: o.headline }))}
        values={EMPTY}
        submitLabel="Create link"
      />
    </main>
  );
}
