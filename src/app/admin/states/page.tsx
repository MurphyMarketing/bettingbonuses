import type { Metadata } from 'next';
import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { regions, brandRegions, brands } from '@/db/schema';
import { StatesTable } from './states-table';

export const metadata: Metadata = { title: 'States', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function StatesAdminListPage() {
  const rows = await db
    .select({
      name: regions.name,
      slug: regions.slug,
      code: regions.code,
      intro: regions.intro,
      regulatorUrl: regions.regulatorUrl,
      hotline: regions.problemGamblingHotline,
      legalStatus: regions.bettingLegalStatus,
      brandCount: sql<number>`(select count(distinct ${brandRegions.brandId})::int from ${brandRegions} inner join ${brands} on ${brands.id} = ${brandRegions.brandId} where ${brandRegions.regionId} = ${sql.raw('"regions"."id"')} and ${brandRegions.isActive} = true and ${brands.status} = 'active')`,
    })
    .from(regions)
    .orderBy(asc(regions.name));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">States</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{rows.length} states · per-state content completeness</p>

      <StatesTable rows={rows} />
    </main>
  );
}
