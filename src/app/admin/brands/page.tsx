import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { brands, brandRegions, companies, offers } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { BrandsTable } from './brands-table';

export const metadata: Metadata = { title: 'Brands', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function BrandsListPage() {
  const rows = await db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      category: brands.category,
      status: brands.status,
      companyName: companies.name,
      logoUrl: brands.logoUrl,
      introParagraph: brands.introParagraph,
      regionCount: sql<number>`(select count(*)::int from ${brandRegions} where ${brandRegions.brandId} = ${sql.raw('"brands"."id"')})`,
      offerCount: sql<number>`(select count(*)::int from ${offers} where ${offers.brandId} = ${sql.raw('"brands"."id"')})`,
    })
    .from(brands)
    .leftJoin(companies, eq(brands.companyId, companies.id))
    .orderBy(brands.name);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Brands</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <Button render={<Link href="/admin/brands/new">New brand</Link>} />
      </div>

      <BrandsTable rows={rows} />
    </main>
  );
}
