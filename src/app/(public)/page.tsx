import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { brands, offers, events, eventSeries } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OfferCard, type PublicOffer } from '@/components/offer-card';
import { LocalDateTime } from '@/components/local-datetime';
import { formatRelativeTime } from '@/lib/datetime';
import { eventTimeStatus } from '@/lib/event-time';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Best Betting Promo Codes & Bonuses',
  description:
    'Compare today’s best sign-up offers and promo codes from legal US sportsbooks, prediction markets, racebooks, and DFS pick’em apps — every offer carries a last-verified date.',
};

const CATEGORIES = [
  { slug: 'sportsbooks', label: 'Sportsbooks', blurb: 'FanDuel, DraftKings, BetMGM, Caesars & more' },
  { slug: 'prediction-markets', label: 'Prediction Markets', blurb: 'Kalshi, Polymarket' },
  { slug: 'horse-racing', label: 'Horse Racing', blurb: 'TwinSpires, FanDuel Racing & more' },
  { slug: 'dfs', label: 'DFS Pick’em', blurb: 'PrizePicks, Underdog, Sleeper & more' },
];

const STATES = [
  { slug: 'missouri', label: 'Missouri' },
  { slug: 'ohio', label: 'Ohio' },
  { slug: 'north-carolina', label: 'North Carolina' },
  { slug: 'kentucky', label: 'Kentucky' },
  { slug: 'pennsylvania', label: 'Pennsylvania' },
  { slug: 'new-jersey', label: 'New Jersey' },
];

export default async function HomePage() {
  const [featuredRows, statsRows, eventRows] = await Promise.all([
    db
      .select({
        id: offers.id,
        headline: offers.headline,
        bonusKind: offers.bonusKind,
        code: offers.code,
        bonusAmountCents: offers.bonusAmountCents,
        termsSummary: offers.termsSummary,
        responsibleGamblingDisclaimer: offers.responsibleGamblingDisclaimer,
        validTo: offers.validTo,
        lastVerifiedAt: offers.lastVerifiedAt,
        brandSlug: brands.slug,
      })
      .from(offers)
      .innerJoin(brands, eq(offers.brandId, brands.id))
      .where(eq(offers.status, 'active'))
      .orderBy(desc(offers.priority), desc(offers.lastVerifiedAt))
      .limit(1),
    db
      .select({
        recent: sql<number>`count(*) filter (where ${offers.lastVerifiedAt} >= now() - interval '14 days')::int`,
        lastAt: sql<Date | null>`max(${offers.lastVerifiedAt})`,
      })
      .from(offers)
      .where(eq(offers.status, 'active')),
    // Live + upcoming events (starting within 14 days, not ended > 1 day ago).
    db
      .select({ name: events.name, slug: events.slug, startsAt: events.startsAt, endsAt: events.endsAt, seriesSlug: eventSeries.slug })
      .from(events)
      .innerJoin(eventSeries, eq(events.seriesId, eventSeries.id))
      .where(sql`${events.startsAt} <= now() + interval '14 days' and (${events.endsAt} is null or ${events.endsAt} >= now() - interval '1 day')`)
      .orderBy(asc(events.startsAt))
      .limit(3),
  ]);

  const liveUpcoming = eventRows.map((e) => ({ ...e, status: eventTimeStatus(e) }));
  const featured = featuredRows[0];
  const recent = statsRows[0]?.recent ?? 0;
  const lastAt = statsRows[0]?.lastAt ? new Date(statsRows[0].lastAt) : null;

  const featuredOffer: PublicOffer | null = featured
    ? {
        id: featured.id,
        headline: featured.headline,
        bonusKind: featured.bonusKind,
        code: featured.code,
        bonusAmountCents: featured.bonusAmountCents,
        termsSummary: featured.termsSummary,
        responsibleGamblingDisclaimer: featured.responsibleGamblingDisclaimer,
        validTo: featured.validTo,
        lastVerifiedAt: featured.lastVerifiedAt,
      }
    : null;

  return (
    <div className="py-10">
      {/* Hero */}
      <section>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Find today’s best US betting offers
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Verified sign-up promotions and promo codes from legal US sportsbooks, prediction markets,
          racebooks, and DFS pick’em apps.
        </p>

        <div className="mt-8 max-w-xl">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Featured offer of the week</h2>
          {featuredOffer && featured ? (
            <OfferCard offer={featuredOffer} brandSlug={featured.brandSlug} featured />
          ) : (
            <p className="text-muted-foreground">Featured offers are on the way — check back soon.</p>
          )}
        </div>
      </section>

      {/* E-E-A-T trust block */}
      <section className="mt-10 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        {recent > 0 ? (
          <p>
            <span className="font-semibold text-foreground">{recent}</span> offer{recent === 1 ? '' : 's'}{' '}
            verified in the last 14 days
            {lastAt ? <> · last checked {formatRelativeTime(lastAt)}</> : null} · reviewed by our
            editorial team.
          </p>
        ) : (
          <p>Every offer on BettingBonuses.com is checked by our editorial team and stamped with a verification date.</p>
        )}
      </section>

      {/* Live and upcoming events — renders nothing when there are none */}
      {liveUpcoming.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Live and upcoming events</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveUpcoming.map((e) => (
              <Link key={e.slug} href={`/${e.seriesSlug}/${e.slug}/`}>
                <Card className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{e.name}</span>
                    {e.status === 'current' ? <Badge>Live now</Badge> : <Badge variant="secondary">Upcoming</Badge>}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    <LocalDateTime
                      iso={e.startsAt.toISOString()}
                      fallback={e.startsAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Browse by category */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">Browse by category</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Card key={c.slug}>
              <CardHeader>
                <CardTitle className="text-base">
                  <Link href={`/${c.slug}/promo-codes`} className="hover:underline">
                    {c.label}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{c.blurb}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Browse by state */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">Browse by state</h2>
        <ul className="flex flex-wrap gap-2">
          {STATES.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/states/${s.slug}`}
                className="inline-block rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
