import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { affiliateLinks, brands, offers } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { updateAffiliateLink, deactivateAffiliateLink } from '../../actions';
import { LinkForm, type LinkFormValues } from '../../link-form';
import { toDatetimeLocalInput } from '@/lib/datetime';

export const metadata: Metadata = { title: 'Edit affiliate link', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [link] = await db.select().from(affiliateLinks).where(eq(affiliateLinks.id, id)).limit(1);
  if (!link) notFound();

  const [brandRows, offerRows] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: offers.id, headline: offers.headline }).from(offers).orderBy(desc(offers.updatedAt)),
  ]);

  const values: LinkFormValues = {
    slug: link.slug,
    brandId: String(link.brandId),
    offerId: link.offerId != null ? String(link.offerId) : '',
    destinationUrl: link.destinationUrl,
    label: link.label ?? '',
    network: link.network ?? '',
    isActive: link.isActive,
    validFrom: toDatetimeLocalInput(link.validFrom),
    validTo: toDatetimeLocalInput(link.validTo),
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/affiliate-links" className="text-sm text-muted-foreground hover:underline">← Affiliate links</Link>
        <h1 className="mt-1 text-2xl font-semibold">/go/{link.slug}</h1>
        <p className="text-sm text-muted-foreground">{link.clickCount} clicks{link.lastClickedAt ? ` · last ${link.lastClickedAt.toLocaleString('en-US')}` : ''}</p>
      </div>

      <LinkForm
        action={updateAffiliateLink.bind(null, link.id)}
        brandOptions={brandRows.map((b) => ({ value: String(b.id), label: b.name }))}
        offerOptions={offerRows.map((o) => ({ value: String(o.id), label: o.headline }))}
        values={values}
        submitLabel="Save changes"
      />

      {link.isActive ? (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-sm font-medium">Danger zone</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">Deactivating makes /go/{link.slug} return 404. The record is kept.</p>
          <form action={deactivateAffiliateLink.bind(null, link.id)}>
            <Button type="submit" variant="destructive">Deactivate link</Button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
