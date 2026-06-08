import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { db } from '@/db';
import { brands, brandRegions, companies, offers, regions } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OfferCard, type PublicOffer } from '@/components/offer-card';
import { categoryLabel } from '@/app/admin/brands/labels';

export const revalidate = 3600; // ISR: 1 hour (on-demand revalidation comes later)
export const dynamicParams = true;

const SITE_URL = 'https://www.bettingbonuses.com';

type Params = Promise<{ 'brand-slug': string }>;

export async function generateStaticParams() {
  // Pre-render active + rebranded brands. planned/sunset 404 (handled in page).
  const rows = await db
    .select({ slug: brands.slug })
    .from(brands)
    .where(inArray(brands.status, ['active', 'rebranded']));
  return rows.map((r) => ({ 'brand-slug': r.slug }));
}

async function getBrand(slug: string) {
  const [brand] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  return brand;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { 'brand-slug': slug } = await params;
  const brand = await getBrand(slug);
  if (!brand || brand.status === 'planned' || brand.status === 'sunset') {
    return { title: 'Not found' };
  }
  const description =
    brand.shortDescription ??
    `Current ${brand.name} promo codes, sign-up bonuses, and offers — with verified, up-to-date details.`;
  return {
    // Root template appends " | BettingBonuses.com".
    title: `${brand.name} Promo Code & Bonus`,
    description,
    alternates: { canonical: `/${brand.slug}/` },
    openGraph: { title: `${brand.name} Promo Code & Bonus`, description, url: `/${brand.slug}/`, type: 'website' },
  };
}

const MARKDOWN_CLASS =
  'max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_h2]:mt-5 [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-foreground [&_strong]:text-foreground';

export default async function BrandPage({ params }: { params: Params }) {
  const { 'brand-slug': slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();
  if (brand.status === 'planned' || brand.status === 'sunset') notFound();

  const [activeOffers, regionRows, successorRows, company, related] = await Promise.all([
    db
      .select({
        id: offers.id,
        headline: offers.headline,
        bonusKind: offers.bonusKind,
        code: offers.code,
        bonusAmountCents: offers.bonusAmountCents,
        termsSummary: offers.termsSummary,
        validFrom: offers.validFrom,
        validTo: offers.validTo,
        lastVerifiedAt: offers.lastVerifiedAt,
      })
      .from(offers)
      .where(and(eq(offers.brandId, brand.id), eq(offers.status, 'active')))
      .orderBy(desc(offers.priority), desc(offers.lastVerifiedAt)),
    db
      .select({ slug: regions.slug, name: regions.name, code: regions.code })
      .from(brandRegions)
      .innerJoin(regions, eq(brandRegions.regionId, regions.id))
      .where(and(eq(brandRegions.brandId, brand.id), eq(brandRegions.isActive, true)))
      .orderBy(regions.name),
    // What this brand became (schema stores rebranded_from, so query in reverse).
    brand.status === 'rebranded'
      ? db.select({ slug: brands.slug, name: brands.name }).from(brands).where(eq(brands.rebrandedFromId, brand.id)).limit(1)
      : Promise.resolve([] as { slug: string; name: string }[]),
    brand.companyId
      ? db.select({ name: companies.name }).from(companies).where(eq(companies.id, brand.companyId)).limit(1)
      : Promise.resolve([] as { name: string }[]),
    brand.companyId
      ? db
          .select({ slug: brands.slug, name: brands.name, category: brands.category })
          .from(brands)
          .where(and(eq(brands.companyId, brand.companyId), eq(brands.status, 'active'), ne(brands.id, brand.id)))
          .orderBy(brands.name)
      : Promise.resolve([] as { slug: string; name: string; category: string }[]),
  ]);

  const successor = successorRows[0];
  const companyName = company[0]?.name;
  const hero = activeOffers[0];
  const rest = activeOffers.slice(1);

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: brand.name,
    category: categoryLabel(brand.category),
    ...(brand.shortDescription ? { description: brand.shortDescription } : {}),
    ...(brand.logoUrl ? { image: brand.logoUrl } : {}),
    url: `${SITE_URL}/${brand.slug}/`,
    offers: activeOffers.map((o) => ({
      '@type': 'Offer',
      name: o.headline,
      ...(o.bonusAmountCents != null
        ? { price: (o.bonusAmountCents / 100).toFixed(2), priceCurrency: 'USD' }
        : {}),
      url: `${SITE_URL}/go/${brand.slug}`,
      ...(o.validFrom ? { validFrom: o.validFrom.toISOString() } : {}),
      ...(o.validTo ? { validThrough: o.validTo.toISOString() } : {}),
      availability: 'https://schema.org/InStock',
    })),
  };
  // Escape "<" so a stray "</script>" in any string can't break out of the tag.
  const jsonLd = JSON.stringify(productLd).replace(/</g, '\\u003c');

  const offersForCard = (o: (typeof activeOffers)[number]): PublicOffer => ({
    id: o.id,
    headline: o.headline,
    bonusKind: o.bonusKind,
    code: o.code,
    bonusAmountCents: o.bonusAmountCents,
    termsSummary: o.termsSummary,
    validTo: o.validTo,
    lastVerifiedAt: o.lastVerifiedAt,
  });

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {brand.status === 'rebranded' && successor ? (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <strong>{brand.name}</strong> is now <strong>{successor.name}</strong>.{' '}
          <Link href={`/${successor.slug}/`} className="font-medium text-primary underline">
            View the current {successor.name} page →
          </Link>
        </div>
      ) : null}

      {/* H1 + category tag */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{brand.name} Promo Code &amp; Bonus</h1>
        <Badge variant="outline">{categoryLabel(brand.category)}</Badge>
      </div>
      {brand.shortDescription ? (
        <p className="mt-3 max-w-2xl text-muted-foreground">{brand.shortDescription}</p>
      ) : null}

      {/* Hero — best current offer */}
      {hero ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Best current offer</h2>
          <OfferCard offer={offersForCard(hero)} brandSlug={brand.slug} featured />
        </section>
      ) : (
        <p className="mt-8 text-muted-foreground">No current offers for {brand.name}. Check back soon.</p>
      )}

      {/* Offer grid — remaining active offers */}
      {rest.length ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">More {brand.name} offers</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((o) => (
              <OfferCard key={o.id} offer={offersForCard(o)} brandSlug={brand.slug} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Where [Brand] operates */}
      {regionRows.length ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Where {brand.name} operates</h2>
          <ul className="flex flex-wrap gap-2">
            {regionRows.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${brand.slug}/${r.slug}/`}
                  className="inline-block rounded-md border px-2.5 py-1 text-sm hover:bg-muted"
                >
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* About [Brand] */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">About {brand.name}</h2>
        {brand.fullDescription ? (
          <div className={MARKDOWN_CLASS}>
            <Markdown rehypePlugins={[rehypeSanitize]}>{brand.fullDescription}</Markdown>
          </div>
        ) : (
          <p className="text-muted-foreground">More information about {brand.name} is coming soon.</p>
        )}
      </section>

      {/* Related brands from [Company] */}
      {related.length && companyName ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Related brands from {companyName}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((b) => (
              <Card key={b.slug}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link href={`/${b.slug}/`} className="hover:underline">
                      {b.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{categoryLabel(b.category)}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
