import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { brands, offers } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { isStale, formatRelativeTime } from '@/lib/datetime';
import { OffersTable, type OfferRow } from './offers-table';

export const metadata: Metadata = { title: 'Offers', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString('en-US') : '—');

export default async function OffersListPage() {
  const raw = await db
    .select({
      id: offers.id,
      headline: offers.headline,
      bonusKind: offers.bonusKind,
      status: offers.status,
      priority: offers.priority,
      validFrom: offers.validFrom,
      validTo: offers.validTo,
      lastVerifiedAt: offers.lastVerifiedAt,
      bonusAmountCents: offers.bonusAmountCents,
      brandName: brands.name,
    })
    .from(offers)
    .leftJoin(brands, eq(offers.brandId, brands.id))
    .orderBy(desc(offers.lastVerifiedAt));

  const rows: OfferRow[] = raw.map((o) => ({
    id: o.id,
    headline: o.headline,
    brandName: o.brandName,
    bonusKind: o.bonusKind,
    status: o.status,
    priority: o.priority,
    bonusAmountCents: o.bonusAmountCents,
    validTo: o.validTo,
    lastVerifiedAt: o.lastVerifiedAt,
    validLabel: `${fmtDate(o.validFrom)} → ${fmtDate(o.validTo)}`,
    verifiedRelative: o.lastVerifiedAt ? formatRelativeTime(o.lastVerifiedAt) : null,
    staleBadge: isStale(o.lastVerifiedAt),
  }));

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offers</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/offers/bulk-create" className="text-sm font-medium text-primary hover:underline">Bulk create</Link>
          <Button render={<Link href="/admin/offers/new">New offer</Link>} />
        </div>
      </div>

      <OffersTable rows={rows} />
    </main>
  );
}
