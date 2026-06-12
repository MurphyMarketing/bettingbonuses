import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq, isNotNull, sql } from 'drizzle-orm';
import { auth, signOut } from '@/auth';
import { db } from '@/db';
import { brands, offers, articles, authors, brandRegions, regions, redirects, users } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/datetime';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const NAV = [
  ['Brands', '/admin/brands'], ['Offers', '/admin/offers'], ['Articles', '/admin/articles'],
  ['Authors', '/admin/authors'], ['States', '/admin/states'],
  ['Leagues & sports', '/admin/sports'], ['Events', '/admin/events'],
  ['Affiliate links', '/admin/affiliate-links'], ['Redirects', '/admin/redirects'], ['Content status', '/admin/content-status'],
] as const;

type Activity = { key: string; verb: 'Edited' | 'Created'; what: string; href: string; at: Date };

export default async function AdminDashboard() {
  const session = await auth();

  const [
    brandAgg, offerAgg, articleAgg, stateAgg, brAgg,
    authorCount, redirectCount,
  ] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      noLogo: sql<number>`count(*) filter (where status = 'active' and logo_url is null)::int`,
      noIntro: sql<number>`count(*) filter (where status = 'active' and (intro_paragraph is null or intro_paragraph = ''))::int`,
    }).from(brands),
    db.select({
      total: sql<number>`count(*)::int`,
      fresh14: sql<number>`count(*) filter (where last_verified_at >= now() - interval '14 days')::int`,
      fresh30: sql<number>`count(*) filter (where last_verified_at >= now() - interval '30 days')::int`,
      stale: sql<number>`count(*) filter (where last_verified_at is null or last_verified_at < now() - interval '30 days')::int`,
    }).from(offers),
    db.select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where status = 'published')::int`,
      draft: sql<number>`count(*) filter (where status = 'draft')::int`,
      staleDraft: sql<number>`count(*) filter (where status = 'draft' and updated_at < now() - interval '14 days')::int`,
    }).from(articles),
    db.select({
      total: sql<number>`count(*)::int`,
      withIntro: sql<number>`count(*) filter (where intro is not null and intro <> '')::int`,
    }).from(regions),
    db.select({
      total: sql<number>`count(*)::int`,
    }).from(brandRegions),
    db.select({ c: sql<number>`count(*)::int` }).from(authors),
    db.select({ c: sql<number>`count(*)::int` }).from(redirects),
  ]);

  // Second batch (kept separate so we don't saturate the connection pool, which
  // intermittently triggered statement timeouts). Recent-activity queries degrade
  // gracefully — a slow one drops to [] rather than failing the whole dashboard.
  const [recentBrands, recentOffers, recentArticles, recentAuthors, recentBR] = await Promise.all([
    db.select({ id: brands.id, name: brands.name, updatedAt: brands.updatedAt, createdAt: brands.createdAt }).from(brands).orderBy(desc(brands.updatedAt)).limit(15).catch(() => []),
    db.select({ id: offers.id, headline: offers.headline, updatedAt: offers.updatedAt, createdAt: offers.createdAt }).from(offers).orderBy(desc(offers.updatedAt)).limit(15).catch(() => []),
    db.select({ id: articles.id, title: articles.title, updatedAt: articles.updatedAt, createdAt: articles.createdAt }).from(articles).orderBy(desc(articles.updatedAt)).limit(15).catch(() => []),
    db.select({ id: authors.id, name: authors.name, updatedAt: authors.updatedAt, createdAt: authors.createdAt }).from(authors).orderBy(desc(authors.updatedAt)).limit(15).catch(() => []),
    db.select({ brandId: brandRegions.brandId, brandName: brands.name, regionName: regions.name, regionSlug: regions.slug, updatedAt: brandRegions.updatedAt })
      .from(brandRegions).innerJoin(brands, eq(brandRegions.brandId, brands.id)).innerJoin(regions, eq(brandRegions.regionId, regions.id))
      .orderBy(desc(brandRegions.updatedAt)).limit(15).catch(() => []),
  ]);

  const [mostRecentVerify, oldestUnverified] = await Promise.all([
    db.select({ at: offers.lastVerifiedAt, headline: offers.headline, name: users.name, email: users.email })
      .from(offers).leftJoin(users, eq(offers.verifiedByUserId, users.id)).where(isNotNull(offers.lastVerifiedAt)).orderBy(desc(offers.lastVerifiedAt)).limit(1),
    db.select({ id: offers.id, headline: offers.headline, at: offers.lastVerifiedAt })
      .from(offers).where(eq(offers.status, 'active')).orderBy(sql`${offers.lastVerifiedAt} asc nulls first`).limit(1),
  ]);

  const b = brandAgg[0], o = offerAgg[0], a = articleAgg[0], st = stateAgg[0], br = brAgg[0];

  // Approximate sitemap URL count from the aggregates already fetched (cheaper than
  // re-running the full sitemap() query set on the pooler): home + states index +
  // 4 category pages, plus brands, brand×state pages, states, published articles, authors.
  const sitemapUrls = 6 + b.active + br.total + st.total + a.published + authorCount[0].c;

  // Attention queue — only items with a count > 0.
  const attention = [
    { label: 'Offers not verified in 30+ days', count: o.stale, href: '/admin/offers?filter=stale' },
    { label: 'Active brands with no logo', count: b.noLogo, href: '/admin/brands?filter=no-logo' },
    { label: 'Active brands with no intro', count: b.noIntro, href: '/admin/brands?filter=no-intro' },
    { label: 'Drafts in progress 14+ days', count: a.staleDraft, href: '/admin/articles?filter=stale-draft' },
  ].filter((x) => x.count > 0);

  // Recent activity — merge + sort.
  const isCreated = (created: Date, updated: Date) => Math.abs(updated.getTime() - created.getTime()) < 2000;
  const activity: Activity[] = [
    ...recentBrands.map((r): Activity => ({ key: `b${r.id}`, verb: isCreated(r.createdAt, r.updatedAt) ? 'Created' : 'Edited', what: `brand ${r.name}`, href: `/admin/brands/${r.id}/edit`, at: r.updatedAt })),
    ...recentOffers.map((r): Activity => ({ key: `o${r.id}`, verb: isCreated(r.createdAt, r.updatedAt) ? 'Created' : 'Edited', what: `offer “${r.headline}”`, href: `/admin/offers/${r.id}/edit`, at: r.updatedAt })),
    ...recentArticles.map((r): Activity => ({ key: `a${r.id}`, verb: isCreated(r.createdAt, r.updatedAt) ? 'Created' : 'Edited', what: `article “${r.title}”`, href: `/admin/articles/${r.id}/edit`, at: r.updatedAt })),
    ...recentAuthors.map((r): Activity => ({ key: `au${r.id}`, verb: isCreated(r.createdAt, r.updatedAt) ? 'Created' : 'Edited', what: `author ${r.name}`, href: `/admin/authors/${r.id}/edit`, at: r.updatedAt })),
    ...recentBR.map((r): Activity => ({ key: `br${r.brandId}-${r.regionSlug}`, verb: 'Edited', what: `${r.brandName} (${r.regionName})`, href: `/admin/brands/${r.brandId}/states/${r.regionSlug}`, at: r.updatedAt })),
  ].sort((x, y) => y.at.getTime() - x.at.getTime()).slice(0, 15);

  const pctVerified14 = o.total ? Math.round((o.fresh14 / o.total) * 100) : 0;
  const pctColor = pctVerified14 >= 80 ? 'text-green-600' : pctVerified14 >= 50 ? 'text-amber-600' : 'text-destructive';
  const verify = mostRecentVerify[0];
  const oldest = oldestUnverified[0];

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {session?.user?.email ?? 'unknown'}.</p>
        </div>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin/login' }); }}>
          <Button type="submit" variant="outline" size="sm">Sign out</Button>
        </form>
      </div>

      <nav className="mb-8 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {NAV.map(([label, href]) => (
          <Link key={href} href={href} className="font-medium text-primary hover:underline">{label} →</Link>
        ))}
      </nav>

      {/* 1. Attention required */}
      <Section title="Attention required">
        {attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing needs attention right now. ✓</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {attention.map((x) => (
              <li key={x.href}>
                <Link href={x.href} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50">
                  <span>{x.label}</span>
                  <Badge variant="destructive">{x.count}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 2. Recent activity */}
      <Section title="Recent activity">
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {activity.map((x) => (
              <li key={x.key}>
                <Link href={x.href} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-muted/50">
                  <span className="min-w-0 truncate"><span className="text-muted-foreground">{x.verb}</span> {x.what}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(x.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 3. Coverage */}
      <Section title="Coverage">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Brands" value={b.total} sub={`${b.active} active · ${b.total - b.active} inactive`} href="/admin/brands" />
          <Stat label="Offers" value={o.total} sub={`${o.fresh14} fresh · ${o.stale} stale`} href="/admin/offers" />
          <Stat label="Articles" value={a.total} sub={`${a.published} published · ${a.draft} draft`} href="/admin/articles" />
          <Stat label="States with intro" value={st.withIntro} sub={`of ${st.total}`} href="/admin/states" />
          <Stat label="Authors" value={authorCount[0].c} href="/admin/authors" />
          <Stat label="Brand × state pages" value={br.total} sub={`~${sitemapUrls} sitemap URLs`} href="/admin/content-status" />
        </div>
      </Section>

      {/* 4. Trust signals */}
      <Section title="Trust signals">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verified in last 14 days</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${pctColor}`}>{pctVerified14}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{o.fresh14} of {o.total} offers</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Most recent verification</p>
            {verify?.at ? (
              <>
                <p className="mt-1 text-sm font-medium">{formatRelativeTime(verify.at)}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{verify.name ?? verify.email ?? 'unknown'} · {verify.headline}</p>
              </>
            ) : <p className="mt-1 text-sm text-muted-foreground">No verifications yet.</p>}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Oldest unverified offer</p>
            {oldest ? (
              <Link href={`/admin/offers/${oldest.id}/edit`} className="group">
                <p className="mt-1 text-sm font-medium group-hover:underline">{oldest.at ? formatRelativeTime(oldest.at) : 'Never verified'}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{oldest.headline}</p>
              </Link>
            ) : <p className="mt-1 text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </Section>

      {/* 5. Site health */}
      <Section title="Site health">
        <ul className="rounded-lg border text-sm">
          <li className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-muted-foreground">Redirects</span>
            <Link href="/admin/redirects" className="font-medium tabular-nums hover:underline">{redirectCount[0].c}</Link>
          </li>
          <li className="flex items-center justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Sitemap URLs</span>
            <span className="font-medium tabular-nums">~{sitemapUrls} · regenerated hourly (ISR)</span>
          </li>
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: number; sub?: string; href: string }) {
  return (
    <Link href={href} className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </Link>
  );
}
