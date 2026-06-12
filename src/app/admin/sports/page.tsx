import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { sports, eventSeries, offers } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { SportsTable } from './sports-table';

export const metadata: Metadata = { title: 'Leagues & sports', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SportsListPage() {
  const rows = await db
    .select({
      id: sports.id,
      name: sports.name,
      slug: sports.slug,
      category: sports.category,
      displayOrder: sports.displayOrder,
      seriesCount: sql<number>`(select count(*)::int from ${eventSeries} where ${eventSeries.sportId} = ${sql.raw('"sports"."id"')})`,
      offerCount: sql<number>`(select count(*)::int from ${offers} where ${offers.sportId} = ${sql.raw('"sports"."id"')} and ${offers.status} = 'active')`,
    })
    .from(sports)
    .orderBy(asc(sports.displayOrder), asc(sports.name));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leagues &amp; sports</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total · the units people search and bet</p>
        </div>
        <Button render={<Link href="/admin/sports/new">New league / sport</Link>} />
      </div>

      <SportsTable rows={rows} />
    </main>
  );
}
