import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { brands, sports, eventSeries } from '@/db/schema';
import { categoryLabel } from '@/app/admin/brands/labels';
import { BONUS_KIND_VALUES } from '../schema';
import { bulkCreateOffers } from './actions';
import { BulkCreateForm } from './bulk-create-form';

export const metadata: Metadata = { title: 'Bulk create offers', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function BulkCreatePage() {
  const [brandRows, sportRows, seriesRows] = await Promise.all([
    db.select({ id: brands.id, name: brands.name, category: brands.category }).from(brands).where(eq(brands.status, 'active')).orderBy(asc(brands.name)),
    db.select({ id: sports.id, name: sports.name }).from(sports).orderBy(asc(sports.displayOrder), asc(sports.name)),
    db.select({ id: eventSeries.id, name: eventSeries.name, sportName: sports.name }).from(eventSeries).leftJoin(sports, eq(eventSeries.sportId, sports.id)).orderBy(asc(eventSeries.name)),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/offers" className="text-sm text-muted-foreground hover:underline">← Offers</Link>
        <h1 className="mt-1 text-2xl font-semibold">Bulk create offers</h1>
        <p className="text-sm text-muted-foreground">Scaffold one draft offer per selected brand, tied to a league/sport or an event.</p>
      </div>

      <BulkCreateForm
        sports={sportRows.map((s) => ({ value: String(s.id), label: s.name }))}
        series={seriesRows.map((s) => ({ value: String(s.id), label: s.name, group: s.sportName ?? 'Other' }))}
        brands={brandRows.map((b) => ({ id: b.id, name: b.name, category: b.category ? categoryLabel(b.category) : '—' }))}
        bonusKinds={BONUS_KIND_VALUES}
        action={bulkCreateOffers}
      />
    </main>
  );
}
