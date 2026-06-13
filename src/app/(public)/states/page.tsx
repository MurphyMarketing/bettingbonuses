import type { Metadata } from 'next';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { regions, brandRegions, brands } from '@/db/schema';
import { StateAvailabilityGrid } from '@/components/state-availability-grid';
import { RichContent } from '@/components/rich-content';
import { getPageContent } from '@/lib/page-content';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Sports Betting by State',
  description:
    'Find the best legal sports betting promo codes and bonuses in your state. Browse every US state and DC where the operators we track are live.',
  alternates: { canonical: '/states/' },
};

export default async function StatesIndexPage() {
  const rows = await db
    .selectDistinct({ slug: regions.slug, name: regions.name, code: regions.code })
    .from(regions)
    .innerJoin(brandRegions, eq(brandRegions.regionId, regions.id))
    .innerJoin(brands, eq(brandRegions.brandId, brands.id))
    .where(and(eq(brands.status, 'active'), eq(brandRegions.isActive, true)))
    .orderBy(regions.name);

  const slugByCode = new Map(rows.map((r) => [r.code, r.slug]));
  const pc = await getPageContent('states-index');

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold tracking-tight">Sports Betting by State</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Legal sports betting offers vary by state. Pick your state to see which sportsbooks,
        prediction markets, racebooks, and DFS apps are live there — and their current promos.
      </p>

      <RichContent html={pc.introBody} className="mt-6 max-w-3xl" />

      <div className="mt-8">
        <StateAvailabilityGrid
          codes={rows.map((r) => r.code)}
          hrefFor={(code) => {
            const slug = slugByCode.get(code);
            return slug ? `/states/${slug}/` : undefined;
          }}
        />
      </div>

      <RichContent html={pc.body} className="mt-10 max-w-3xl" />
    </div>
  );
}
