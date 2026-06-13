import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, or } from 'drizzle-orm';
import { db } from '@/db';
import { eventSeries, offers, sports } from '@/db/schema';
import { OfferCard } from '@/components/offer-card';
import { LocalDateTime } from '@/components/local-datetime';
import { Badge } from '@/components/ui/badge';
import { sanitizeHtml } from '@/lib/sanitize';
import { activeOfferCards } from '@/lib/offer-cards';
import { eventTimeStatus, daysUntil } from '@/lib/event-time';
import { ds } from '@/design/tokens';
import { cn } from '@/lib/utils';

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

/** Status badge for the current occurrence. Null when the event has no dates. */
function statusBadge(series: Series, now: Date): { label: string; variant: 'default' | 'secondary' | 'outline' } | null {
  const status = eventTimeStatus({ startsAt: series.startsAt, endsAt: series.endsAt }, now);
  if (status === 'evergreen') return null;
  if (status === 'current') return { label: 'Live now', variant: 'default' };
  if (status === 'upcoming') {
    const d = daysUntil(series.startsAt!, now);
    return { label: d <= 0 ? 'Starting soon' : `Upcoming in ${d} day${d === 1 ? '' : 's'}`, variant: 'secondary' };
  }
  const ago = -daysUntil(series.endsAt ?? series.startsAt!, now);
  return { label: ago <= 0 ? 'Recently concluded' : `Concluded ${ago} day${ago === 1 ? '' : 's'} ago`, variant: 'outline' };
}

/**
 * The single evergreen event page at /[series-slug]/ (e.g. /super-bowl/). Reads
 * the event's own current-occurrence date/location from event_series, shows the
 * countdown/live/concluded status, surfaces offers tied to the event OR its
 * league/sport, and links back to the league hub. Carries the SportsEvent JSON-LD.
 */
export async function SeriesView({ series }: { series: Series }) {
  const offerWhere =
    series.sportId != null
      ? or(eq(offers.seriesId, series.id), eq(offers.sportId, series.sportId))
      : eq(offers.seriesId, series.id);

  const [offerCards, sportRows] = await Promise.all([
    activeOfferCards(offerWhere),
    series.sportId != null
      ? db.select({ name: sports.name, slug: sports.slug, fullName: sports.fullName }).from(sports).where(eq(sports.id, series.sportId)).limit(1)
      : Promise.resolve([] as { name: string; slug: string; fullName: string | null }[]),
  ]);
  const sport = sportRows[0] ?? null;

  const now = new Date();
  const badge = statusBadge(series, now);

  const [placeName, ...rest] = (series.location ?? '').split(',');
  const sportsEventLd = series.startsAt
    ? {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: series.name,
        startDate: series.startsAt.toISOString(),
        ...(series.endsAt ? { endDate: series.endsAt.toISOString() } : {}),
        ...(series.location
          ? { location: { '@type': 'Place', name: placeName.trim(), ...(rest.length ? { address: rest.join(',').trim() } : {}) } }
          : {}),
        ...(sport ? { organizer: { '@type': 'Organization', name: sport.fullName ?? sport.name } } : {}),
      }
    : null;
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${series.name} betting offers`,
    itemListElement: offerCards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/${c.brand.slug}/`, name: c.offer.headline })),
  };
  const jsonLd = JSON.stringify([sportsEventLd, itemListLd].filter(Boolean)).replace(/</g, '\\u003c');

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {sport ? (
        <p className="text-sm text-muted-foreground">
          <Link href={`/sports/${sport.slug}/`} className="hover:underline">{sport.name}</Link> / {series.name}
        </p>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className={ds.pageTitle}>{series.name} betting promo codes</h1>
        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
      </div>

      {/* Current occurrence date + location */}
      {series.startsAt ? (
        <p className="mt-3 text-muted-foreground">
          <LocalDateTime
            iso={series.startsAt.toISOString()}
            fallback={series.startsAt.toLocaleDateString('en-US', { dateStyle: 'long' } as Intl.DateTimeFormatOptions)}
          />
          {series.location ? ` · ${series.location}` : ''}
        </p>
      ) : null}

      {series.intro ? (
        <div
          className="mt-4 max-w-2xl leading-relaxed text-muted-foreground [&_a]:text-action [&_a]:underline [&_p]:mt-3 [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(series.intro) }}
        />
      ) : series.description ? (
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{series.description}</p>
      ) : null}

      {sport ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Part of{' '}
          <Link href={`/sports/${sport.slug}/`} className="font-medium text-action hover:underline">{sport.name}</Link>
          {' '}— see all {sport.name} promos.
        </p>
      ) : null}

      {/* Offers */}
      <section className="mt-10">
        <h2 className={cn(ds.sectionTitle, 'mb-4')}>{series.name} offers</h2>
        {offerCards.length ? (
          <div className="grid gap-card sm:grid-cols-2">
            {offerCards.map((c) => <OfferCard key={c.offer.id} offer={c.offer} brand={c.brand} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">No current {series.name} offers. Check back as the event approaches.</p>
        )}
      </section>
    </div>
  );
}
