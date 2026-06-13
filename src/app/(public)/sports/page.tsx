import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { sports } from '@/db/schema';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RichContent } from '@/components/rich-content';
import { getPageContent, getPageMeta } from '@/lib/page-content';
import { metaOrDefault } from '@/lib/meta';
import { ds } from '@/design/tokens';
import { cn } from '@/lib/utils';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta('sports-index');
  return {
    title: metaOrDefault(meta.metaTitle, 'Sports Betting Promo Codes by Sport'),
    description: metaOrDefault(
      meta.metaDescription,
      'Find betting promo codes and sign-up bonuses by sport — football, basketball, horse racing and more, plus offers tied to upcoming events.',
    ),
    alternates: { canonical: '/sports/' },
  };
}

export default async function SportsIndexPage() {
  const rows = await db
    .select({
      name: sports.name,
      slug: sports.slug,
      category: sports.category,
      offerCount: sql<number>`(select count(*)::int from offers where offers.sport_id = ${sql.raw('"sports"."id"')} and offers.status = 'active')`,
      upcomingCount: sql<number>`(select count(*)::int from event_series where event_series.sport_id = ${sql.raw('"sports"."id"')} and event_series.ends_at >= now())`,
    })
    .from(sports)
    .orderBy(asc(sports.displayOrder), asc(sports.name));

  const pc = await getPageContent('sports-index');

  return (
    <div className="py-8">
      <h1 className={ds.pageTitle}>Sports betting promo codes by sport</h1>
      <p className={cn(ds.lead, 'mt-3')}>
        Browse current betting promos by sport and jump to offers tied to the biggest upcoming events.
      </p>

      <RichContent html={pc.introBody} className="mt-6 max-w-3xl" />

      <div className="mt-8 grid gap-card sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((s) => {
          const hasContent = s.offerCount > 0 || s.upcomingCount > 0;
          return (
            <Link key={s.slug} href={`/sports/${s.slug}/`} className="group/tile">
              <Card className={cn('flex h-full flex-col gap-2 p-4', ds.tileHover)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-semibold tracking-tight">{s.name}</span>
                  {s.category ? <Badge variant="outline">{s.category}</Badge> : null}
                </div>
                {hasContent ? (
                  <p className="text-sm text-muted-foreground">
                    {s.offerCount} active offer{s.offerCount === 1 ? '' : 's'}
                    {s.upcomingCount > 0 ? ` · ${s.upcomingCount} upcoming event${s.upcomingCount === 1 ? '' : 's'}` : ''}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground/70">Offers coming soon</p>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      <RichContent html={pc.body} className="mt-10 max-w-3xl" />
    </div>
  );
}
