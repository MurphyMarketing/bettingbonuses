import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/db';
import { eventSeries, events, offers } from '@/db/schema';
import { OfferCard } from '@/components/offer-card';
import { LocalDateTime } from '@/components/local-datetime';
import { Badge } from '@/components/ui/badge';
import { sanitizeHtml } from '@/lib/sanitize';
import { activeOfferCards } from '@/lib/offer-cards';
import { eventTimeStatus, daysUntil } from '@/lib/event-time';

const SITE_URL = 'https://www.bettingbonuses.com';
type Series = typeof eventSeries.$inferSelect;

export async function getVisibleSeries(slug: string): Promise<Series | null> {
  const [s] = await db.select().from(eventSeries).where(eq(eventSeries.slug, slug)).limit(1);
  return s ?? null;
}

export function seriesMetadata(series: Series): Metadata {
  const title = `${series.name} Betting Promo Codes`;
  const description = series.description ?? `Current betting promo codes and sign-up bonuses for ${series.name}.`;
  return { title, description, alternates: { canonical: `/${series.slug}/` }, openGraph: { title, description, url: `/${series.slug}/`, type: 'website' } };
}

function shortDate(d: Date) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function SeriesView({ series }: { series: Series }) {
  const [eventRows, offerCards] = await Promise.all([
    db
      .select({ id: events.id, name: events.name, slug: events.slug, startsAt: events.startsAt, endsAt: events.endsAt, location: events.location })
      .from(events)
      .where(eq(events.seriesId, series.id))
      .orderBy(asc(events.startsAt)),
    activeOfferCards(
      or(eq(offers.seriesId, series.id), inArray(offers.eventId, db.select({ id: events.id }).from(events).where(eq(events.seriesId, series.id)))),
    ),
  ]);

  const now = new Date();
  const withStatus = eventRows.map((e) => ({ ...e, status: eventTimeStatus(e, now) }));
  const current = withStatus.find((e) => e.status === 'current');
  const upcoming = withStatus.filter((e) => e.status === 'upcoming');
  const featured = current ?? upcoming[0] ?? null;
  const others = withStatus.filter((e) => e !== featured);

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${series.name} betting offers`,
    itemListElement: offerCards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/${c.brandSlug}/`, name: c.offer.headline })),
  };
  const jsonLd = JSON.stringify(itemListLd).replace(/</g, '\\u003c');

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <h1 className="text-3xl font-bold tracking-tight">{series.name} betting promo codes</h1>

      {series.intro ? (
        <div
          className="mt-4 max-w-2xl leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:mt-3 [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(series.intro) }}
        />
      ) : series.description ? (
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{series.description}</p>
      ) : null}

      {/* Featured event */}
      {featured ? (
        <section className="mt-8">
          <div className="rounded-lg border-2 border-primary/60 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/${series.slug}/${featured.slug}/`} className="text-xl font-semibold hover:underline">{featured.name}</Link>
              {featured.status === 'current' ? (
                <Badge>Live now</Badge>
              ) : (
                <Badge variant="secondary">{(() => { const d = daysUntil(featured.startsAt, now); return d <= 0 ? 'Starting soon' : `In ${d} day${d === 1 ? '' : 's'}`; })()}</Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              <LocalDateTime iso={featured.startsAt.toISOString()} fallback={shortDate(featured.startsAt)} />
              {featured.location ? ` · ${featured.location}` : ''}
            </p>
            <Link href={`/${series.slug}/${featured.slug}/`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              View {featured.name} offers →
            </Link>
          </div>
        </section>
      ) : null}

      {/* Other instances */}
      {others.length ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">All {series.name} events</h2>
          <ul className="flex flex-col gap-1.5">
            {others.map((e) => (
              <li key={e.slug}>
                <Link href={`/${series.slug}/${e.slug}/`} className="text-sm hover:underline">
                  <span className="font-medium text-primary">{e.name}</span>
                  <span className="text-muted-foreground"> — {shortDate(e.startsAt)} ({e.status})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Offers */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">{series.name} offers</h2>
        {offerCards.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {offerCards.map((c) => <OfferCard key={c.offer.id} offer={c.offer} brandSlug={c.brandSlug} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">No current {series.name} offers. Check back as the event approaches.</p>
        )}
      </section>
    </div>
  );
}
