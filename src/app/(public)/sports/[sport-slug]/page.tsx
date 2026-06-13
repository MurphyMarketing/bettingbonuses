import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { sports, eventSeries, offers } from '@/db/schema';
import { Card } from '@/components/ui/card';
import { OfferCard } from '@/components/offer-card';
import { sanitizeHtml } from '@/lib/sanitize';
import { activeOfferCards } from '@/lib/offer-cards';
import { ds } from '@/design/tokens';
import { cn } from '@/lib/utils';

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = 'https://www.bettingbonuses.com';
type Params = Promise<{ 'sport-slug': string }>;

export async function generateStaticParams() {
  // Sports with at least one active offer OR an upcoming event.
  const rows = await db
    .select({
      slug: sports.slug,
      offerCount: sql<number>`(select count(*)::int from offers where offers.sport_id = ${sql.raw('"sports"."id"')} and offers.status = 'active')`,
      upcomingCount: sql<number>`(select count(*)::int from event_series where event_series.sport_id = ${sql.raw('"sports"."id"')} and event_series.ends_at >= now())`,
    })
    .from(sports);
  return rows.filter((r) => r.offerCount > 0 || r.upcomingCount > 0).map((r) => ({ 'sport-slug': r.slug }));
}

async function getSport(slug: string) {
  const [s] = await db.select().from(sports).where(eq(sports.slug, slug)).limit(1);
  return s ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { 'sport-slug': slug } = await params;
  const sport = await getSport(slug);
  if (!sport) return { title: 'Not found' };
  const title = `${sport.name} Betting Promo Codes`;
  const description = `Current ${sport.name} betting promo codes, sign-up bonuses, and offers for upcoming ${sport.name} events.`;

  // Thin-page guard: a sport with no events AND no offers has nothing to index.
  // noindex it per-page so it stays out of the index once the sitewide noindex
  // lifts post-cutover (dormant under the current sitewide noindex until then).
  const sportSeriesIds = db.select({ id: eventSeries.id }).from(eventSeries).where(eq(eventSeries.sportId, sport.id));
  const [[ev], [off]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(eventSeries).where(eq(eventSeries.sportId, sport.id)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(offers)
      .where(and(eq(offers.status, 'active'), or(eq(offers.sportId, sport.id), inArray(offers.seriesId, sportSeriesIds)))),
  ]);
  const isThin = (ev?.c ?? 0) === 0 && (off?.c ?? 0) === 0;

  return {
    title,
    description,
    alternates: { canonical: `/sports/${sport.slug}/` },
    openGraph: { title, description, url: `/sports/${sport.slug}/`, type: 'website' },
    ...(isThin ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function SportHubPage({ params }: { params: Params }) {
  const { 'sport-slug': slug } = await params;
  const sport = await getSport(slug);
  if (!sport) notFound();

  const seriesIdSubq = db.select({ id: eventSeries.id }).from(eventSeries).where(eq(eventSeries.sportId, sport.id));

  const [upcomingEvents, seriesRows, offerCards] = await Promise.all([
    // Events (event_series) in this league with a current/upcoming occurrence.
    db
      .select({ name: eventSeries.name, slug: eventSeries.slug, startsAt: eventSeries.startsAt })
      .from(eventSeries)
      .where(and(eq(eventSeries.sportId, sport.id), gte(eventSeries.endsAt, sql`now()`)))
      .orderBy(asc(eventSeries.startsAt))
      .limit(5),
    db.select({ name: eventSeries.name, slug: eventSeries.slug }).from(eventSeries).where(eq(eventSeries.sportId, sport.id)).orderBy(asc(eventSeries.name)),
    // Offers tied to this league/sport or an event in it. (Brand-wide offers are
    // intentionally excluded — see design note in the report.)
    activeOfferCards(or(eq(offers.sportId, sport.id), inArray(offers.seriesId, seriesIdSubq))),
  ]);

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${sport.name} betting offers`,
    itemListElement: offerCards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/${c.brand.slug}/`, name: c.offer.headline })),
  };
  const jsonLd = JSON.stringify(itemListLd).replace(/</g, '\\u003c');
  const shortDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <p className="text-sm text-muted-foreground"><Link href="/sports/" className="hover:underline">Sports</Link> / {sport.name}</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">{sport.name} betting promo codes</h1>

      {sport.intro ? (
        <div
          className="mt-4 max-w-2xl leading-relaxed text-muted-foreground [&_a]:text-action [&_a]:underline [&_p]:mt-3 [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(sport.intro) }}
        />
      ) : null}

      {upcomingEvents.length ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Upcoming {sport.name} events</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((e) => (
              <Link key={e.slug} href={`/${e.slug}/`}>
                <Card className={cn('p-3', ds.tileHover)}>
                  <span className="block font-medium">{e.name}</span>
                  {e.startsAt ? <span className="block text-xs text-muted-foreground">{shortDate(e.startsAt)}</span> : null}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {seriesRows.length ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">All {sport.name} events</h2>
          <ul className="flex flex-wrap gap-2">
            {seriesRows.map((s) => (
              <li key={s.slug}>
                <Link href={`/${s.slug}/`} className="inline-block rounded-md border px-2.5 py-1 text-sm hover:bg-muted">{s.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight">{sport.name} offers</h2>
        {offerCards.length ? (
          <div className="grid gap-card sm:grid-cols-2">
            {offerCards.map((c) => <OfferCard key={c.offer.id} offer={c.offer} brand={c.brand} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">No current {sport.name} offers. Check back soon.</p>
        )}
      </section>
    </div>
  );
}
