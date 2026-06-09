import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { sports } from '@/db/schema';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Sports Betting Promo Codes by Sport',
  description: 'Find betting promo codes and sign-up bonuses by sport — football, basketball, horse racing and more, plus offers tied to upcoming events.',
  alternates: { canonical: '/sports/' },
};

export default async function SportsIndexPage() {
  const rows = await db
    .select({
      name: sports.name,
      slug: sports.slug,
      category: sports.category,
      offerCount: sql<number>`(select count(*)::int from offers where offers.sport_id = ${sql.raw('"sports"."id"')} and offers.status = 'active')`,
      upcomingCount: sql<number>`(select count(*)::int from events where events.sport_id = ${sql.raw('"sports"."id"')} and events.ends_at >= now())`,
    })
    .from(sports)
    .orderBy(asc(sports.displayOrder), asc(sports.name));

  const visible = rows.filter((r) => r.offerCount > 0 || r.upcomingCount > 0);

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold tracking-tight">Sports betting promo codes by sport</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Browse current betting promos by sport and jump to offers tied to the biggest upcoming events.
      </p>

      {visible.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No sport-specific offers or upcoming events right now — check back soon.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <Link key={s.slug} href={`/sports/${s.slug}/`}>
              <Card className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold">{s.name}</span>
                  {s.category ? <Badge variant="outline">{s.category}</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {s.offerCount} active offer{s.offerCount === 1 ? '' : 's'}
                  {s.upcomingCount > 0 ? ` · ${s.upcomingCount} upcoming event${s.upcomingCount === 1 ? '' : 's'}` : ''}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
