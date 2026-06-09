import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { affiliateLinks, brands } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/datetime';
import { AffiliateLinksTable, type AffiliateLinkRow } from './affiliate-links-table';

export const metadata: Metadata = { title: 'Affiliate links', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AffiliateLinksListPage() {
  const raw = await db
    .select({
      id: affiliateLinks.id,
      slug: affiliateLinks.slug,
      destinationUrl: affiliateLinks.destinationUrl,
      isActive: affiliateLinks.isActive,
      clickCount: affiliateLinks.clickCount,
      lastClickedAt: affiliateLinks.lastClickedAt,
      brandName: brands.name,
    })
    .from(affiliateLinks)
    .leftJoin(brands, eq(affiliateLinks.brandId, brands.id))
    .orderBy(asc(affiliateLinks.slug));

  const rows: AffiliateLinkRow[] = raw.map((l) => ({
    id: l.id,
    slug: l.slug,
    destinationUrl: l.destinationUrl,
    isActive: l.isActive,
    clickCount: l.clickCount,
    brandName: l.brandName,
    lastClickedLabel: l.lastClickedAt ? formatRelativeTime(l.lastClickedAt) : '—',
  }));

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Affiliate links</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total · resolve at /go/[slug]</p>
        </div>
        <Button render={<Link href="/admin/affiliate-links/new">New link</Link>} />
      </div>

      <AffiliateLinksTable rows={rows} />
    </main>
  );
}
