import type { Metadata } from 'next';
import Link from 'next/link';
import { and, desc, eq, ne, or } from 'drizzle-orm';
import { db } from '@/db';
import { eventSeries, events, offers } from '@/db/schema';
import { OfferCard } from '@/components/offer-card';
import { LocalDateTime } from '@/components/local-datetime';
import { Badge } from '@/components/ui/badge';
import { activeOfferCards } from '@/lib/offer-cards';
import { eventTimeStatus, daysUntil } from '@/lib/event-time';

const SITE_URL = 'https://www.bettingbonuses.com';
type EventRow = typeof events.$inferSelect;
type SeriesRow = typeof eventSeries.$inferSelect;

export async function getVisibleEvent(seriesSlug: string, eventSlug: string): Promise<{ series: SeriesRow; event: EventRow } | null> {
  const [series] = await db.select().from(eventSeries).where(eq(eventSeries.slug, seriesSlug)).limit(1);
  if (!series) return null;
  const [event] = await db.select().from(events).where(and(eq(events.slug, eventSlug), eq(events.seriesId, series.id))).limit(1);
  if (!event) return null;
  return { series, event };
}

export function eventMetadata({ event, series }: { event: EventRow; series: SeriesRow }): Metadata {
  const title = `${event.name} Promo Codes`;
  const description = event.description ?? `Betting promo codes and sign-up bonuses for ${event.name} (${series.name}).`;
  return { title, description, alternates: { canonical: `/${series.slug}/${event.slug}/` }, openGraph: { title, description, url: `/${series.slug}/${event.slug}/`, type: 'website' } };
}

function statusBadge(event: EventRow, now: Date) {
  const status = eventTimeStatus(event, now);
  if (status === 'current') return { label: 'Live now', variant: 'default' as const };
  if (status === 'upcoming') {
    const d = daysUntil(event.startsAt, now);
    return { label: d <= 0 ? 'Starting soon' : `Upcoming in ${d} day${d === 1 ? '' : 's'}`, variant: 'secondary' as const };
  }
  const ago = -daysUntil(event.endsAt, now);
  return { label: ago <= 0 ? 'Recently concluded' : `Concluded ${ago} day${ago === 1 ? '' : 's'} ago`, variant: 'outline' as const };
}

export async function EventView({ series, event }: { series: SeriesRow; event: EventRow }) {
  const sportCond = series.sportId != null ? eq(offers.sportId, series.sportId) : undefined;
  const [offerCards, related] = await Promise.all([
    activeOfferCards(or(eq(offers.eventId, event.id), eq(offers.seriesId, series.id), sportCond)),
    db
      .select({ name: events.name, slug: events.slug, startsAt: events.startsAt })
      .from(events)
      .where(and(eq(events.seriesId, series.id), ne(events.id, event.id)))
      .orderBy(desc(events.startsAt)),
  ]);

  const now = new Date();
  const badge = statusBadge(event, now);
  const [placeName, ...rest] = (event.location ?? '').split(',');
  const sportsEventLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    ...(event.location
      ? { location: { '@type': 'Place', name: placeName.trim(), ...(rest.length ? { address: rest.join(',').trim() } : {}) } }
      : {}),
  };
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${event.name} betting offers`,
    itemListElement: offerCards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/${c.brandSlug}/`, name: c.offer.headline })),
  };
  const jsonLd = JSON.stringify([sportsEventLd, itemListLd]).replace(/</g, '\\u003c');

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <p className="text-sm text-muted-foreground">
        <Link href={`/${series.slug}/`} className="hover:underline">{series.name}</Link> / {event.name}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{event.name} promo codes</h1>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <p className="mt-3 text-muted-foreground">
        <LocalDateTime iso={event.startsAt.toISOString()} fallback={event.startsAt.toLocaleDateString('en-US', { dateStyle: 'long' } as Intl.DateTimeFormatOptions)} />
        {event.location ? ` · ${event.location}` : ''}
      </p>
      {event.description ? <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{event.description}</p> : null}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">{event.name} offers</h2>
        {offerCards.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {offerCards.map((c) => <OfferCard key={c.offer.id} offer={c.offer} brandSlug={c.brandSlug} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">No current offers for {event.name} yet. Check back closer to the event.</p>
        )}
      </section>

      {related.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Other {series.name} events</h2>
          <ul className="flex flex-col gap-1.5">
            {related.map((e) => (
              <li key={e.slug}>
                <Link href={`/${series.slug}/${e.slug}/`} className="text-sm text-primary hover:underline">{e.name}</Link>
                <span className="text-xs text-muted-foreground"> — {e.startsAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
