import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { brands, offers, articles, authors } from '@/db/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { articleStatusLabel } from '../articles/labels';

export const metadata: Metadata = { title: 'Content status', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="font-medium text-primary">Yes</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

function Count({ n }: { n: number }) {
  return n > 0 ? <span className="font-medium tabular-nums">{n}</span> : <span className="text-muted-foreground">—</span>;
}

export default async function ContentStatusPage() {
  const [brandRows, articleRows] = await Promise.all([
    db
      .select({
        id: brands.id,
        name: brands.name,
        slug: brands.slug,
        logoUrl: brands.logoUrl,
        introParagraph: brands.introParagraph,
        howToClaimSteps: brands.howToClaimSteps,
        pros: brands.pros,
        cons: brands.cons,
        verdict: brands.verdict,
        otherPromotions: brands.otherPromotions,
        depositOptions: brands.depositOptions,
        primaryAuthorId: brands.primaryAuthorId,
        offerCount: sql<number>`(select count(*)::int from ${offers} where ${offers.brandId} = ${brands.id} and ${offers.status} = 'active')`,
      })
      .from(brands)
      .orderBy(asc(brands.name)),
    db
      .select({
        slug: articles.slug,
        title: articles.title,
        status: articles.status,
        publishedAt: articles.publishedAt,
        authorName: authors.name,
      })
      .from(articles)
      .leftJoin(authors, eq(articles.primaryAuthorId, authors.id))
      .orderBy(asc(articles.title)),
  ]);

  const len = (a: string[] | null) => (a ? a.length : 0);

  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-semibold">Content status</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        At-a-glance review completeness per brand. {brandRows.length} brands · {articleRows.length} articles.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Logo</TableHead>
              <TableHead>Intro</TableHead>
              <TableHead>How to claim</TableHead>
              <TableHead className="text-right">Pros</TableHead>
              <TableHead className="text-right">Cons</TableHead>
              <TableHead>Verdict</TableHead>
              <TableHead className="text-right">Other promos</TableHead>
              <TableHead>Deposits</TableHead>
              <TableHead className="text-right">Offers</TableHead>
              <TableHead>Author</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brandRows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <Link href={`/admin/brands/${b.id}/edit`} className="font-medium hover:underline">{b.name}</Link>
                </TableCell>
                <TableCell><YesNo value={Boolean(b.logoUrl)} /></TableCell>
                <TableCell><YesNo value={Boolean(b.introParagraph)} /></TableCell>
                <TableCell><YesNo value={len(b.howToClaimSteps) > 0} /></TableCell>
                <TableCell className="text-right"><Count n={len(b.pros)} /></TableCell>
                <TableCell className="text-right"><Count n={len(b.cons)} /></TableCell>
                <TableCell><YesNo value={Boolean(b.verdict)} /></TableCell>
                <TableCell className="text-right"><Count n={len(b.otherPromotions)} /></TableCell>
                <TableCell><YesNo value={Boolean(b.depositOptions)} /></TableCell>
                <TableCell className="text-right"><Count n={b.offerCount} /></TableCell>
                <TableCell><YesNo value={Boolean(b.primaryAuthorId)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Articles</h2>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articleRows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No articles yet.</TableCell></TableRow>
            ) : (
              articleRows.map((a) => (
                <TableRow key={a.slug}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell className="text-muted-foreground">/{a.slug}</TableCell>
                  <TableCell>{articleStatusLabel(a.status)}</TableCell>
                  <TableCell>{a.authorName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.publishedAt ? a.publishedAt.toLocaleDateString('en-US') : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
