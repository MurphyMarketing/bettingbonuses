import type { Metadata } from 'next';
import Link from 'next/link';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Check, X } from 'lucide-react';
import { db } from '@/db';
import { brands, companies, offers, authors } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OfferCard, type PublicOffer } from '@/components/offer-card';
import { AuthorByline, type BylineAuthor } from '@/components/author-byline';
import { BrandStateAvailability } from '@/components/brand/BrandStateAvailability';
import { categoryLabel } from '@/app/admin/brands/labels';

const SITE_URL = 'https://www.bettingbonuses.com';
type Brand = typeof brands.$inferSelect;

const MARKDOWN_CLASS =
  'max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_h2]:mt-5 [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-foreground [&_strong]:text-foreground';

/** Returns the brand if it exists and is publicly visible (active/rebranded). */
export async function getVisibleBrand(slug: string): Promise<Brand | null> {
  const [brand] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand || brand.status === 'planned' || brand.status === 'sunset') return null;
  return brand;
}

export function brandMetadata(brand: Brand): Metadata {
  const description =
    brand.shortDescription ??
    `Current ${brand.name} promo codes, sign-up bonuses, and offers — with verified, up-to-date details.`;
  return {
    title: `${brand.name} Promo Code & Bonus`,
    description,
    alternates: { canonical: `/${brand.slug}/` },
    openGraph: { title: `${brand.name} Promo Code & Bonus`, description, url: `/${brand.slug}/`, type: 'website' },
  };
}

export async function BrandView({ brand }: { brand: Brand }) {
  const authorIds = [brand.primaryAuthorId, brand.secondaryAuthorId].filter((x): x is string => Boolean(x));

  const [activeOffers, successorRows, company, related, authorRows] = await Promise.all([
    db
      .select({
        id: offers.id,
        headline: offers.headline,
        bonusKind: offers.bonusKind,
        code: offers.code,
        bonusAmountCents: offers.bonusAmountCents,
        termsSummary: offers.termsSummary,
        responsibleGamblingDisclaimer: offers.responsibleGamblingDisclaimer,
        validFrom: offers.validFrom,
        validTo: offers.validTo,
        lastVerifiedAt: offers.lastVerifiedAt,
      })
      .from(offers)
      .where(and(eq(offers.brandId, brand.id), eq(offers.status, 'active')))
      .orderBy(desc(offers.priority), desc(offers.lastVerifiedAt)),
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
    authorIds.length
      ? db
          .select({ id: authors.id, slug: authors.slug, name: authors.name, title: authors.title, avatarUrl: authors.avatarUrl, yearsExperience: authors.yearsExperience })
          .from(authors)
          .where(inArray(authors.id, authorIds))
      : Promise.resolve([] as { id: string; slug: string; name: string; title: string | null; avatarUrl: string | null; yearsExperience: number | null }[]),
  ]);

  const successor = successorRows[0];
  const companyName = company[0]?.name;
  const hero = activeOffers[0];
  const rest = activeOffers.slice(1);
  const intro = brand.introParagraph ?? brand.shortDescription;
  const depositOptions = brand.depositOptions
    ? brand.depositOptions.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  // Order authors primary-first.
  const bylineAuthors: BylineAuthor[] = [brand.primaryAuthorId, brand.secondaryAuthorId]
    .map((id) => authorRows.find((a) => a.id === id))
    .filter((a): a is (typeof authorRows)[number] => Boolean(a))
    .map((a) => ({ slug: a.slug, name: a.name, title: a.title, avatarUrl: a.avatarUrl, yearsExperience: a.yearsExperience }));

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
      ...(o.bonusAmountCents != null ? { price: (o.bonusAmountCents / 100).toFixed(2), priceCurrency: 'USD' } : {}),
      url: `${SITE_URL}/go/${brand.slug}`,
      ...(o.validFrom ? { validFrom: o.validFrom.toISOString() } : {}),
      ...(o.validTo ? { validThrough: o.validTo.toISOString() } : {}),
      availability: 'https://schema.org/InStock',
    })),
  };
  const jsonLd = JSON.stringify(productLd).replace(/</g, '\\u003c');

  const offersForCard = (o: (typeof activeOffers)[number]): PublicOffer => ({
    id: o.id,
    headline: o.headline,
    bonusKind: o.bonusKind,
    code: o.code,
    bonusAmountCents: o.bonusAmountCents,
    termsSummary: o.termsSummary,
    responsibleGamblingDisclaimer: o.responsibleGamblingDisclaimer,
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

      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- static logo asset
        <img src={brand.logoUrl} alt={`${brand.name} logo`} className="mb-4 h-12 w-auto" />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{brand.name} Promo Code &amp; Bonus</h1>
        <Badge variant="outline">{categoryLabel(brand.category)}</Badge>
      </div>

      {/* Hero — best current offer */}
      {hero ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Best current offer</h2>
          <OfferCard offer={offersForCard(hero)} brandSlug={brand.slug} featured />
        </section>
      ) : (
        <p className="mt-8 text-muted-foreground">No current offers for {brand.name}. Check back soon.</p>
      )}

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

      {/* Intro */}
      {intro ? (
        <section className="mt-10">
          <p className="max-w-3xl whitespace-pre-line leading-relaxed text-muted-foreground">{intro}</p>
        </section>
      ) : null}

      {/* How to Claim */}
      {brand.howToClaimSteps?.length ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">How to claim the {brand.name} offer</h2>
          <ol className="ml-1 flex list-inside list-decimal flex-col gap-2 text-sm">
            {brand.howToClaimSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Pros / Cons */}
      {brand.pros?.length || brand.cons?.length ? (
        <section className="mt-10 grid gap-6 sm:grid-cols-2">
          {brand.pros?.length ? (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Pros</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {brand.pros.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {brand.cons?.length ? (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Cons</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {brand.cons.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* State availability (renders nothing if the brand operates nowhere) */}
      <BrandStateAvailability
        brandId={brand.id}
        brandSlug={brand.slug}
        brandName={brand.name}
        brandHeadlineOffer={brand.introParagraph ?? brand.shortDescription}
      />

      {/* Verdict */}
      {brand.verdict ? (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Our verdict</h2>
          <p className="max-w-3xl leading-relaxed text-muted-foreground">{brand.verdict}</p>
        </section>
      ) : null}

      {/* Other promotions */}
      {brand.otherPromotions?.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Other {brand.name} promotions</h2>
          <ul className="ml-1 flex list-inside list-disc flex-col gap-1.5 text-sm">
            {brand.otherPromotions.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Deposit options */}
      {depositOptions.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Deposit options</h2>
          <ul className="flex flex-wrap gap-2">
            {depositOptions.map((d) => (
              <li key={d}>
                <span className="inline-block rounded-md border px-2.5 py-1 text-sm">{d}</span>
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
                    <Link href={`/${b.slug}/`} className="hover:underline">{b.name}</Link>
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

      <AuthorByline authors={bylineAuthors} />
    </div>
  );
}
